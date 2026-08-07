/**
 * Capa de acceso al modelo.
 *
 * Toda salida estructurada se obtiene con *tool use forzado*: se declara una
 * herramienta cuyo `input_schema` describe exactamente la forma esperada y se
 * fija `tool_choice`, de modo que el modelo no puede responder texto libre.
 * Después se valida con Zod, porque un esquema declarado no garantiza que la
 * respuesta sea válida — solo la hace mucho más probable.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

/** Modelo por defecto para los agentes de trabajo. */
export const MODELO_TRABAJO =
  process.env.MODELO_TRABAJO ?? "claude-sonnet-5";
/** Modelo para la síntesis final, donde el razonamiento pesa más. */
export const MODELO_SINTESIS =
  process.env.MODELO_SINTESIS ?? "claude-sonnet-5";

/** Hay API key configurada, es decir, la aplicación puede llamar al modelo. */
export function hayApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let clienteCache: Anthropic | null = null;

function cliente(): Anthropic {
  if (!clienteCache) {
    clienteCache = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return clienteCache;
}

export interface OpcionesAgente<T> {
  modelo?: string;
  sistema: string;
  prompt: string;
  /** Nombre de la herramienta que el modelo está obligado a invocar. */
  herramienta: string;
  descripcionHerramienta: string;
  /** JSON Schema del argumento de la herramienta. */
  esquemaEntrada: Record<string, unknown>;
  /** Validador Zod aplicado al argumento devuelto. */
  validador: z.ZodType<T>;
  maxTokens?: number;
}

/**
 * Ejecuta un agente y devuelve su salida ya validada.
 * Reintenta una vez si el modelo devuelve una estructura inválida, pasándole
 * el error de validación para que se corrija a sí mismo.
 */
export async function ejecutarAgente<T>(opciones: OpcionesAgente<T>): Promise<T> {
  const {
    modelo = MODELO_TRABAJO,
    sistema,
    prompt,
    herramienta,
    descripcionHerramienta,
    esquemaEntrada,
    validador,
    maxTokens = 8000,
  } = opciones;

  const mensajes: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];

  for (let intento = 0; intento < 2; intento++) {
    const respuesta = await cliente().messages.create({
      model: modelo,
      max_tokens: maxTokens,
      system: sistema,
      tools: [
        {
          name: herramienta,
          description: descripcionHerramienta,
          input_schema: esquemaEntrada as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: herramienta },
      messages: mensajes,
    });

    const bloque = respuesta.content.find((c) => c.type === "tool_use");
    if (!bloque || bloque.type !== "tool_use") {
      throw new Error(
        `El agente ${herramienta} no invocó la herramienta esperada.`,
      );
    }

    const resultado = validador.safeParse(bloque.input);
    if (resultado.success) return resultado.data;

    // Reintento con retroalimentación explícita del error de validación.
    mensajes.push(
      { role: "assistant", content: respuesta.content },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: bloque.id,
            is_error: true,
            content: `La estructura no es válida: ${resultado.error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("; ")}. Vuelve a llamar a la herramienta corrigiendo esos campos.`,
          },
        ],
      },
    );
  }

  throw new Error(
    `El agente ${herramienta} devolvió una estructura inválida en dos intentos.`,
  );
}

/** Llamada de texto libre en streaming, usada por el chat sobre el documento. */
export async function* transmitirTexto(params: {
  sistema: string;
  prompt: string;
  maxTokens?: number;
}): AsyncGenerator<string> {
  const stream = await cliente().messages.create({
    model: MODELO_TRABAJO,
    max_tokens: params.maxTokens ?? 2000,
    system: params.sistema,
    messages: [{ role: "user", content: params.prompt }],
    stream: true,
  });

  for await (const evento of stream) {
    if (
      evento.type === "content_block_delta" &&
      evento.delta.type === "text_delta"
    ) {
      yield evento.delta.text;
    }
  }
}
