/**
 * Proveedor Google Gemini.
 *
 * Se habla con la API REST directamente en lugar de añadir el SDK: la superficie
 * que la aplicación necesita —una llamada con function calling forzado y otra de
 * texto en streaming— cabe en este archivo, y evita 300 kB de dependencia para
 * dos endpoints.
 */
import { aEsquemaGemini } from "./esquema.ts";
import {
  ErrorDeCuota,
  esErrorDeCuota,
  type ClienteModelo,
  type PeticionAgente,
  type RespuestaHerramienta,
} from "./tipos.ts";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export const MODELO_GEMINI = process.env.MODELO_GEMINI ?? "gemini-2.5-flash";

interface ParteGemini {
  text?: string;
  functionCall?: { name: string; args: unknown };
  functionResponse?: { name: string; response: unknown };
}

interface ContenidoGemini {
  role: "user" | "model";
  parts: ParteGemini[];
}

function clave(): string {
  return process.env.GEMINI_API_KEY ?? "";
}

export const clienteGemini: ClienteModelo = {
  proveedor: "gemini",
  get disponible() {
    return Boolean(clave());
  },
  modeloPorDefecto: MODELO_GEMINI,

  async invocarHerramienta(peticion: PeticionAgente): Promise<RespuestaHerramienta> {
    const historial: ContenidoGemini[] = [
      { role: "user", parts: [{ text: peticion.prompt }] },
    ];
    return llamar(peticion, historial);
  },

  async *transmitirTexto({ sistema, prompt, maxTokens = 2000, web = false }) {
    const respuesta = await fetch(
      `${BASE}/${MODELO_GEMINI}:streamGenerateContent?alt=sse&key=${clave()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sistema }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          // Grounding con Google Search: el modelo decide cuándo buscar.
          ...(web ? { tools: [{ google_search: {} }] } : {}),
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
        }),
      },
    );

    if (!respuesta.ok || !respuesta.body) {
      throw await comoError(respuesta);
    }

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
        if (!linea.startsWith("data: ")) continue;
        try {
          const dato = JSON.parse(linea.slice(6));
          const partes: ParteGemini[] =
            dato?.candidates?.[0]?.content?.parts ?? [];
          for (const parte of partes) {
            if (parte.text) yield parte.text;
          }
        } catch {
          // Fragmento incompleto: se recompone en la siguiente vuelta.
        }
      }
    }
  },
};

async function llamar(
  peticion: PeticionAgente,
  historial: ContenidoGemini[],
  reintento = false,
): Promise<RespuestaHerramienta> {
  const cuerpo = {
    systemInstruction: { parts: [{ text: peticion.sistema }] },
    contents: historial,
    tools: [
      {
        functionDeclarations: [
          {
            name: peticion.herramienta,
            description: peticion.descripcionHerramienta,
            parameters: aEsquemaGemini(peticion.esquemaEntrada),
          },
        ],
      },
    ],
    // `ANY` obliga al modelo a invocar la herramienta: es el equivalente al
    // tool_choice forzado de Anthropic.
    toolConfig: {
      functionCallingConfig: {
        mode: "ANY",
        allowedFunctionNames: [peticion.herramienta],
      },
    },
    generationConfig: {
      temperature: 0.3,
      // Gemini 2.5 descuenta su razonamiento interno del presupuesto de salida:
      // si se queda corto trunca la llamada a función y devuelve
      // MALFORMED_FUNCTION_CALL. Se acota el razonamiento y se da holgura
      // suficiente para que la estructura quepa entera.
      maxOutputTokens: Math.min(Math.max((peticion.maxTokens ?? 8000) * 2, 16000), 65_000),
      thinkingConfig: { thinkingBudget: 2048 },
    },
  };

  const modelo = peticion.modelo?.startsWith("gemini")
    ? peticion.modelo
    : MODELO_GEMINI;

  const respuesta = await fetch(
    `${BASE}/${modelo}:generateContent?key=${clave()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    },
  );

  if (!respuesta.ok) throw await comoError(respuesta);

  const datos = await respuesta.json();
  const partes: ParteGemini[] = datos?.candidates?.[0]?.content?.parts ?? [];
  const llamada = partes.find((p) => p.functionCall)?.functionCall;

  if (!llamada) {
    const motivo = datos?.candidates?.[0]?.finishReason ?? "desconocido";

    // Una llamada truncada es un fallo transitorio de generación, no del
    // esquema: se reintenta una vez antes de darla por perdida.
    if (motivo === "MALFORMED_FUNCTION_CALL" && !reintento) {
      return llamar(peticion, historial, true);
    }

    throw new Error(
      `Gemini no invocó la herramienta ${peticion.herramienta} (motivo: ${motivo}).`,
    );
  }

  return {
    argumentos: llamada.args,
    reintentar: (errorDeValidacion: string) =>
      llamar(peticion, [
        ...historial,
        { role: "model", parts: [{ functionCall: llamada }] },
        {
          role: "user",
          parts: [
            {
              functionResponse: {
                name: peticion.herramienta,
                response: {
                  error: `La estructura no es válida: ${errorDeValidacion}. Vuelve a llamar a la herramienta corrigiendo esos campos.`,
                },
              },
            },
          ],
        },
      ]),
  };
}

async function comoError(respuesta: Response): Promise<Error> {
  const texto = await respuesta.text();
  const mensaje = `Gemini ${respuesta.status}: ${texto.slice(0, 400)}`;
  const error = Object.assign(new Error(mensaje), { status: respuesta.status });
  return esErrorDeCuota(error) ? new ErrorDeCuota(mensaje, "gemini") : error;
}
