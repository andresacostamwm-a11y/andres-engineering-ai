/**
 * Agente 3 — Revisor normativo.
 *
 * Contrasta los requerimientos contra el marco normativo mexicano aplicable y
 * devuelve hallazgos con nivel de riesgo. Corre en paralelo con el agente de
 * costos porque ambos dependen solo del extractor.
 */
import { ejecutarAgente } from "../anthropic.ts";
import { salidaNormativoSchema } from "../schemas.ts";
import type { Hallazgo, Requerimiento } from "../types.ts";
import { DISCIPLINAS_JSON, RIESGO_JSON } from "./comun.ts";

const SISTEMA = `Eres un ingeniero con doctorado y ejercicio profesional de primer nivel: formación de
posgrado en tu especialidad, dominio transversal de las demás ingenierías (civil, estructural,
mecánica, eléctrica, electrónica, mecatrónica, hidráulica, neumática, HVAC, industrial,
aeronáutica, naval, ferroviaria y de fluidos) y de las disciplinas afines —arquitectura,
administración de proyectos, costos y derecho de la construcción—. Trabajas con el rigor de
quien firma: cada afirmación se sostiene en un principio físico, una norma vigente o un dato
del documento, y lo que no se sostiene se declara como supuesto.

Aquí actúas como perito en cumplimiento normativo de obra e instalaciones en México.

Marco de referencia habitual:
- Eléctrico: NOM-001-SEDE (instalaciones eléctricas), NOM-025-STPS (iluminación).
- Seguridad e higiene: NOM-002-STPS (prevención de incendios), NOM-009-STPS (trabajos
  en altura), NOM-017-STPS (EPP), NOM-030-STPS (servicios preventivos).
- Hidrosanitario: NOM-001-CONAGUA, NOM-127-SSA1 (agua para uso y consumo humano).
- Gas: NOM-004-SEDG. Accesibilidad: NMX-R-050-SCFI.
- Reglamentos de construcción municipales y estatales aplicables.

Reglas estrictas:
- Solo cita normas que existan realmente y que apliquen al caso. Si no estás seguro
  del número de artículo, pon null en "articulo" antes que inventarlo.
- "riesgo" refleja consecuencia real: critico = riesgo a la vida o paro de obra.
- Cada hallazgo lleva una recomendación accionable, no un consejo genérico.
- Incluye también hallazgos por AUSENCIA: lo que el documento debería especificar
  y no especifica es un hallazgo válido y frecuentemente el más caro.
- Devuelve entre 6 y 18 hallazgos.`;

const ESQUEMA = {
  type: "object",
  properties: {
    hallazgos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "Identificador corto, ej. HAL-01" },
          titulo: { type: "string" },
          norma: {
            type: "string",
            description: "Norma o reglamento aplicable, ej. NOM-001-SEDE-2012.",
          },
          articulo: {
            type: ["string", "null"],
            description: "Artículo o sección, o null si no se conoce con certeza.",
          },
          riesgo: RIESGO_JSON,
          descripcion: { type: "string" },
          recomendacion: { type: "string" },
          disciplina: DISCIPLINAS_JSON,
        },
        required: [
          "id",
          "titulo",
          "norma",
          "articulo",
          "riesgo",
          "descripcion",
          "recomendacion",
          "disciplina",
        ],
      },
    },
  },
  required: ["hallazgos"],
};

export async function revisarNormativa(
  requerimientos: Requerimiento[],
  contexto: string,
): Promise<Hallazgo[]> {
  const listado = requerimientos
    .map((r) => `- [${r.id}] (${r.disciplina}) ${r.descripcion}\n  Evidencia: "${r.evidencia}"`)
    .join("\n");

  const salida = await ejecutarAgente({
    sistema: SISTEMA,
    prompt: `Revisa el cumplimiento normativo del siguiente proyecto e identifica hallazgos,
incluyendo lo que falta especificar.

<contexto_del_proyecto>
${contexto}
</contexto_del_proyecto>

<requerimientos_detectados>
${listado}
</requerimientos_detectados>`,
    herramienta: "registrar_hallazgos",
    descripcionHerramienta:
      "Registra los hallazgos de cumplimiento normativo con su nivel de riesgo.",
    esquemaEntrada: ESQUEMA,
    validador: salidaNormativoSchema,
    maxTokens: 10000,
  });

  return salida.hallazgos;
}

const PESO_RIESGO = { critico: 4, alto: 3, medio: 2, bajo: 1 } as const;

/** Riesgo global = el peor hallazgo, salvo que haya varios altos acumulados. */
export function riesgoGlobal(hallazgos: Hallazgo[]) {
  if (hallazgos.length === 0) return "bajo" as const;
  const maximo = Math.max(...hallazgos.map((h) => PESO_RIESGO[h.riesgo]));
  const altos = hallazgos.filter((h) => h.riesgo === "alto").length;
  if (maximo === 4) return "critico" as const;
  if (maximo === 3) return altos >= 3 ? ("critico" as const) : ("alto" as const);
  if (maximo === 2) return "medio" as const;
  return "bajo" as const;
}
