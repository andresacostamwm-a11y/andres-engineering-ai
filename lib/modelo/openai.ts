/**
 * Proveedor OpenAI (GPT).
 *
 * Igual que con Gemini, se habla con la API REST directamente: la superficie
 * necesaria —function calling forzado y texto en streaming— no justifica el SDK.
 * Requiere OPENAI_API_KEY (API de plataforma, no la suscripción de ChatGPT:
 * las cuentas de suscripción no exponen API oficial).
 */
import {
  ErrorDeCuota,
  esErrorDeCuota,
  type ClienteModelo,
  type PeticionAgente,
  type RespuestaHerramienta,
} from "./tipos.ts";

const BASE = "https://api.openai.com/v1";

export const MODELO_OPENAI = process.env.MODELO_OPENAI ?? "gpt-5.6-luna";

/**
 * Razonamiento por defecto de la familia 5.6.
 *
 * `medium` es el punto en que el modelo piensa antes de responder sin disparar
 * la latencia; los demás niveles se eligen desde el selector.
 */
const ESFUERZO_POR_DEFECTO = "medium";

/** La familia 5.6 acepta `reasoning_effort`; los modelos anteriores no. */
function admiteEsfuerzo(modelo: string): boolean {
  return /^gpt-5\.[56]/.test(modelo);
}

/**
 * ¿Hay que llamar por la API de respuestas en vez de por chat/completions?
 *
 * OpenAI no admite herramientas junto con razonamiento en `chat/completions`
 * para la familia 5.6: devuelve «Function tools with reasoning_effort are not
 * supported… use /v1/responses». Como los diez agentes de la aplicación se
 * apoyan en invocación forzada de herramienta, esos modelos solo funcionan por
 * la otra vía. El texto libre en streaming sí funciona en chat/completions, así
 * que solo se desvía la llamada con herramienta.
 */
function usaRespuestas(modelo: string, esfuerzo: string): boolean {
  return admiteEsfuerzo(modelo) && esfuerzo !== "none";
}

/** El identificador pertenece a la familia de modelos de chat de OpenAI. */
export function esModeloOpenai(id: string): boolean {
  return /^(gpt|o\d|chatgpt)/.test(id);
}

function clave(): string {
  return process.env.OPENAI_API_KEY ?? "";
}

interface MensajeOpenai {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
}

export const clienteOpenai: ClienteModelo = {
  proveedor: "openai",
  get disponible() {
    return Boolean(clave());
  },
  modeloPorDefecto: MODELO_OPENAI,

  async invocarHerramienta(peticion: PeticionAgente): Promise<RespuestaHerramienta> {
    const mensajes: MensajeOpenai[] = [
      { role: "system", content: peticion.sistema },
      { role: "user", content: peticion.prompt },
    ];
    return llamar(peticion, mensajes);
  },

  // OpenAI chat completions no ofrece búsqueda web; el parámetro se ignora.
  async *transmitirTexto({ sistema, prompt, maxTokens = 2000, modelo, esfuerzo }) {
    const elegido = modelo ?? MODELO_OPENAI;
    const respuesta = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clave()}`,
      },
      body: JSON.stringify({
        model: elegido,
        max_completion_tokens: maxTokens,
        ...(admiteEsfuerzo(elegido)
          ? { reasoning_effort: esfuerzo ?? ESFUERZO_POR_DEFECTO }
          : {}),
        stream: true,
        messages: [
          { role: "system", content: sistema },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!respuesta.ok || !respuesta.body) throw await comoError(respuesta);

    const lector = respuesta.body.getReader();
    const decodificador = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await lector.read();
      if (done) break;
      buffer += decodificador.decode(value, { stream: true });

      const lineas = buffer.split("\n");
      buffer = lineas.pop() ?? "";

      for (const linea of lineas) {
        if (!linea.startsWith("data: ") || linea.includes("[DONE]")) continue;
        try {
          const dato = JSON.parse(linea.slice(6));
          const trozo = dato?.choices?.[0]?.delta?.content;
          if (trozo) yield trozo;
        } catch {
          // Fragmento incompleto: se recompone en la siguiente vuelta.
        }
      }
    }
  },
};

async function llamar(
  peticion: PeticionAgente,
  mensajes: MensajeOpenai[],
): Promise<RespuestaHerramienta> {
  const modelo =
    peticion.modelo && esModeloOpenai(peticion.modelo) ? peticion.modelo : MODELO_OPENAI;
  const esfuerzo = peticion.esfuerzo ?? ESFUERZO_POR_DEFECTO;

  if (usaRespuestas(modelo, esfuerzo)) {
    const entrada: EntradaRespuestas[] = mensajes
      .filter((m) => m.role !== "system" && typeof m.content === "string")
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content! }));
    return llamarRespuestas(peticion, modelo, esfuerzo, entrada);
  }

  const respuesta = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${clave()}`,
    },
    body: JSON.stringify({
      model: modelo,
      max_completion_tokens: peticion.maxTokens ?? 8000,
      ...(admiteEsfuerzo(modelo) ? { reasoning_effort: esfuerzo } : {}),
      messages: mensajes,
      tools: [
        {
          type: "function",
          function: {
            name: peticion.herramienta,
            description: peticion.descripcionHerramienta,
            parameters: peticion.esquemaEntrada,
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: { name: peticion.herramienta },
      },
    }),
  });

  if (!respuesta.ok) throw await comoError(respuesta);

  const datos = await respuesta.json();
  const mensaje = datos?.choices?.[0]?.message;
  const llamada = mensaje?.tool_calls?.[0];

  if (!llamada?.function?.arguments) {
    throw new Error(`GPT no invocó la herramienta ${peticion.herramienta}.`);
  }

  let argumentos: unknown;
  try {
    argumentos = JSON.parse(llamada.function.arguments);
  } catch {
    throw new Error(
      `GPT devolvió argumentos que no son JSON válido en ${peticion.herramienta}.`,
    );
  }

  return {
    argumentos,
    reintentar: (errorDeValidacion: string) =>
      llamar(peticion, [
        ...mensajes,
        {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: llamada.id,
              type: "function",
              function: llamada.function,
            },
          ],
        },
        {
          role: "tool",
          tool_call_id: llamada.id,
          content: `La estructura no es válida: ${errorDeValidacion}. Vuelve a llamar a la herramienta corrigiendo esos campos.`,
        },
      ]),
  };
}

async function comoError(respuesta: Response): Promise<Error> {
  const texto = await respuesta.text();
  const mensaje = `OpenAI ${respuesta.status}: ${texto.slice(0, 400)}`;
  const error = Object.assign(new Error(mensaje), { status: respuesta.status });
  return esErrorDeCuota(error) ? new ErrorDeCuota(mensaje, "openai") : error;
}

/* ------------------------------------------------- API de respuestas -- */

interface EntradaRespuestas {
  role: "user" | "assistant";
  content: string;
}

/**
 * Invocación forzada de herramienta por `/v1/responses`.
 *
 * Mantiene el mismo contrato que la vía de chat: devuelve los argumentos y un
 * `reintentar` que vuelve a pedir la herramienta explicando qué falló, para que
 * el modelo se corrija sin perder el contexto de lo que ya escribió.
 */
async function llamarRespuestas(
  peticion: PeticionAgente,
  modelo: string,
  esfuerzo: string,
  entrada: EntradaRespuestas[],
): Promise<RespuestaHerramienta> {
  const respuesta = await fetch(`${BASE}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${clave()}`,
    },
    body: JSON.stringify({
      model: modelo,
      max_output_tokens: peticion.maxTokens ?? 8000,
      reasoning: { effort: esfuerzo },
      instructions: peticion.sistema,
      input: entrada,
      tools: [
        {
          type: "function",
          name: peticion.herramienta,
          description: peticion.descripcionHerramienta,
          parameters: peticion.esquemaEntrada,
        },
      ],
      tool_choice: { type: "function", name: peticion.herramienta },
    }),
  });

  if (!respuesta.ok) throw await comoError(respuesta);

  const datos = await respuesta.json();
  const salida = (datos?.output ?? []) as {
    type?: string;
    name?: string;
    arguments?: string;
  }[];
  const llamada = salida.find((o) => o.type === "function_call");

  if (!llamada?.arguments) {
    // Sin llamada a herramienta no hay nada que validar. Si el modelo se quedó
    // sin presupuesto de salida, se dice: es un límite, no un fallo de formato.
    const motivo = datos?.incomplete_details?.reason;
    throw new Error(
      motivo === "max_output_tokens"
        ? "El modelo agotó su presupuesto de salida antes de completar la herramienta."
        : "El modelo no invocó la herramienta.",
    );
  }

  const argumentos = JSON.parse(llamada.arguments);

  return {
    argumentos,
    reintentar: (errorDeValidacion: string) =>
      llamarRespuestas(peticion, modelo, esfuerzo, [
        ...entrada,
        { role: "assistant", content: llamada.arguments! },
        {
          role: "user",
          content: `La salida anterior no cumple el esquema: ${errorDeValidacion}\n\nVuelve a invocar «${peticion.herramienta}» corrigiendo exactamente eso.`,
        },
      ]),
  };
}
