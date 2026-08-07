/**
 * Proveedor Anthropic Claude.
 *
 * Toda salida estructurada se obtiene con *tool use forzado*: se declara una
 * herramienta cuyo `input_schema` describe la forma esperada y se fija
 * `tool_choice`, de modo que el modelo no puede responder texto libre.
 */
import Anthropic from "@anthropic-ai/sdk";
import {
  ErrorDeCuota,
  esErrorDeCuota,
  type ClienteModelo,
  type PeticionAgente,
  type RespuestaHerramienta,
} from "./tipos.ts";

export const MODELO_CLAUDE = process.env.MODELO_TRABAJO ?? "claude-sonnet-5";

let clienteCache: Anthropic | null = null;

function cliente(): Anthropic {
  if (!clienteCache) {
    clienteCache = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return clienteCache;
}

export const clienteClaude: ClienteModelo = {
  proveedor: "claude",
  get disponible() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  },
  modeloPorDefecto: MODELO_CLAUDE,

  async invocarHerramienta(peticion: PeticionAgente): Promise<RespuestaHerramienta> {
    return llamar(peticion, [{ role: "user", content: peticion.prompt }]);
  },

  async *transmitirTexto({ sistema, prompt, maxTokens = 2000 }) {
    let flujo;
    try {
      flujo = await cliente().messages.create({
        model: MODELO_CLAUDE,
        max_tokens: maxTokens,
        system: sistema,
        messages: [{ role: "user", content: prompt }],
        stream: true,
      });
    } catch (error) {
      throw traducir(error);
    }

    for await (const evento of flujo) {
      if (
        evento.type === "content_block_delta" &&
        evento.delta.type === "text_delta"
      ) {
        yield evento.delta.text;
      }
    }
  },
};

async function llamar(
  peticion: PeticionAgente,
  mensajes: Anthropic.MessageParam[],
): Promise<RespuestaHerramienta> {
  const modelo = peticion.modelo?.startsWith("claude")
    ? peticion.modelo
    : MODELO_CLAUDE;

  let respuesta: Anthropic.Message;
  try {
    respuesta = await cliente().messages.create({
      model: modelo,
      max_tokens: peticion.maxTokens ?? 8000,
      system: peticion.sistema,
      tools: [
        {
          name: peticion.herramienta,
          description: peticion.descripcionHerramienta,
          input_schema: peticion.esquemaEntrada as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: peticion.herramienta },
      messages: mensajes,
    });
  } catch (error) {
    throw traducir(error);
  }

  const bloque = respuesta.content.find((c) => c.type === "tool_use");
  if (!bloque || bloque.type !== "tool_use") {
    throw new Error(
      `Claude no invocó la herramienta ${peticion.herramienta}.`,
    );
  }

  return {
    argumentos: bloque.input,
    reintentar: (errorDeValidacion: string) =>
      llamar(peticion, [
        ...mensajes,
        { role: "assistant", content: respuesta.content },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: bloque.id,
              is_error: true,
              content: `La estructura no es válida: ${errorDeValidacion}. Vuelve a llamar a la herramienta corrigiendo esos campos.`,
            },
          ],
        },
      ]),
  };
}

function traducir(error: unknown): Error {
  if (esErrorDeCuota(error)) {
    return new ErrorDeCuota(
      error instanceof Error ? error.message : "Cuota de la API agotada.",
      "claude",
    );
  }
  return error instanceof Error ? error : new Error(String(error));
}
