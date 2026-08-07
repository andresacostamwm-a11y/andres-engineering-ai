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

export const MODELO_OPENAI = process.env.MODELO_OPENAI ?? "gpt-5.1";

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
  async *transmitirTexto({ sistema, prompt, maxTokens = 2000 }) {
    const respuesta = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clave()}`,
      },
      body: JSON.stringify({
        model: MODELO_OPENAI,
        max_completion_tokens: maxTokens,
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

  const respuesta = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${clave()}`,
    },
    body: JSON.stringify({
      model: modelo,
      max_completion_tokens: peticion.maxTokens ?? 8000,
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
