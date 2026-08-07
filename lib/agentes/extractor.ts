/**
 * Agente 1 — Extractor de requerimientos.
 *
 * Lee el documento fuente (pliego, memoria descriptiva, alcance de obra) y
 * devuelve los requerimientos técnicos con la cita textual que los respalda.
 * La evidencia es obligatoria: sin cita no hay requerimiento, para que el
 * usuario pueda auditar cada renglón contra el documento original.
 */
import { ejecutarAgente } from "../anthropic.ts";
import { salidaExtractorSchema } from "../schemas.ts";
import type { Requerimiento } from "../types.ts";
import { DISCIPLINAS_JSON } from "./comun.ts";

const SISTEMA = `Eres un ingeniero con doctorado y ejercicio profesional de primer nivel: formación de
posgrado en tu especialidad, dominio transversal de las demás ingenierías (civil, estructural,
mecánica, eléctrica, electrónica, mecatrónica, hidráulica, neumática, HVAC, industrial,
aeronáutica, naval, ferroviaria y de fluidos) y de las disciplinas afines —arquitectura,
administración de proyectos, costos y derecho de la construcción—. Trabajas con el rigor de
quien firma: cada afirmación se sostiene en un principio físico, una norma vigente o un dato
del documento, y lo que no se sostiene se declara como supuesto.

Aquí actúas como revisor de pliegos, memorias descriptivas y alcances de obra: extraes los
requerimientos técnicos verificables del documento.

Reglas estrictas:
- Cada requerimiento debe tener una cita TEXTUAL del documento en el campo "evidencia".
  Nunca inventes la cita: si no puedes citar, no incluyas el requerimiento.
- Marca "critico": true solo cuando incumplirlo detiene la obra, compromete la
  seguridad o invalida la entrega.
- Clasifica por disciplina de ingeniería. Usa "general" solo si no encaja en ninguna.
- No inventes cantidades ni normas: eso es trabajo de otros agentes.
- Devuelve entre 8 y 25 requerimientos, priorizando los de mayor impacto.`;

const ESQUEMA = {
  type: "object",
  properties: {
    requerimientos: {
      type: "array",
      description: "Requerimientos técnicos extraídos del documento.",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "Identificador corto, ej. REQ-01" },
          descripcion: {
            type: "string",
            description: "El requerimiento redactado de forma accionable.",
          },
          disciplina: DISCIPLINAS_JSON,
          evidencia: {
            type: "string",
            description: "Cita textual literal del documento que lo respalda.",
          },
          pagina: {
            type: ["number", "null"],
            description: "Página aproximada, o null si no se puede determinar.",
          },
          critico: { type: "boolean" },
        },
        required: [
          "id",
          "descripcion",
          "disciplina",
          "evidencia",
          "pagina",
          "critico",
        ],
      },
    },
  },
  required: ["requerimientos"],
};

export async function extraerRequerimientos(
  documento: string,
): Promise<Requerimiento[]> {
  const salida = await ejecutarAgente({
    sistema: SISTEMA,
    prompt: `Extrae los requerimientos técnicos del siguiente documento.

<documento>
${documento}
</documento>`,
    herramienta: "registrar_requerimientos",
    descripcionHerramienta:
      "Registra los requerimientos técnicos extraídos del documento con su evidencia textual.",
    esquemaEntrada: ESQUEMA,
    validador: salidaExtractorSchema,
  });
  return salida.requerimientos;
}
