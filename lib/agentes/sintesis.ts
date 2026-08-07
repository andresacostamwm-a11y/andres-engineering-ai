/**
 * Agente 4 — Síntesis ejecutiva.
 *
 * Última etapa del pipeline. Recibe lo producido por los tres agentes previos y
 * redacta el resumen que encabeza el dictamen: qué es el proyecto, cuánto cuesta,
 * qué riesgo tiene y qué hacer a continuación.
 */
import { ejecutarAgente, MODELO_SINTESIS } from "../anthropic.ts";
import { salidaSintesisSchema } from "../schemas.ts";
import type { Hallazgo, Partida, Requerimiento, ResumenEjecutivo } from "../types.ts";
import { RIESGO_JSON } from "./comun.ts";
import { totalPresupuesto } from "./costos.ts";
import { riesgoGlobal } from "./normativo.ts";

const SISTEMA = `Eres un ingeniero con doctorado y ejercicio profesional de primer nivel: formación de
posgrado en tu especialidad, dominio transversal de las demás ingenierías (civil, estructural,
mecánica, eléctrica, electrónica, mecatrónica, hidráulica, neumática, HVAC, industrial,
aeronáutica, naval, ferroviaria y de fluidos) y de las disciplinas afines —arquitectura,
administración de proyectos, costos y derecho de la construcción—. Trabajas con el rigor de
quien firma: cada afirmación se sostiene en un principio físico, una norma vigente o un dato
del documento, y lo que no se sostiene se declara como supuesto.

Aquí actúas como el director de proyectos que firma el dictamen. Escribes para un tomador
de decisiones que dedica dos minutos a leerlo.

Reglas estrictas:
- La síntesis va al grano: qué es el proyecto, qué se encontró, qué implica.
  Entre 120 y 200 palabras, sin relleno ni frases de cortesía.
- Las recomendaciones son acciones concretas y ordenadas por impacto (3 a 6).
- Los supuestos son las decisiones que se tomaron por falta de información en el
  documento. Si el análisis descansa sobre supuestos, decláralos aquí sin adornos.
- No repitas cifras que ya están en las tablas; interpreta lo que significan.`;

const ESQUEMA = {
  type: "object",
  properties: {
    titulo: { type: "string", description: "Título del proyecto analizado." },
    tipoProyecto: {
      type: "string",
      description: "Ej. edificio de oficinas, nave industrial, hotel, remodelación.",
    },
    ubicacion: { type: ["string", "null"] },
    sintesis: { type: "string", description: "120-200 palabras." },
    totalEstimado: { type: "number" },
    moneda: { type: "string", enum: ["MXN"] },
    riesgoGlobal: RIESGO_JSON,
    recomendaciones: { type: "array", items: { type: "string" } },
    supuestos: { type: "array", items: { type: "string" } },
  },
  required: [
    "titulo",
    "tipoProyecto",
    "ubicacion",
    "sintesis",
    "totalEstimado",
    "moneda",
    "riesgoGlobal",
    "recomendaciones",
    "supuestos",
  ],
};

export async function sintetizar(params: {
  contexto: string;
  requerimientos: Requerimiento[];
  partidas: Partida[];
  hallazgos: Hallazgo[];
}): Promise<ResumenEjecutivo> {
  const { contexto, requerimientos, partidas, hallazgos } = params;
  const total = totalPresupuesto(partidas);

  const resumen = await ejecutarAgente({
    modelo: MODELO_SINTESIS,
    sistema: SISTEMA,
    prompt: `Redacta el resumen ejecutivo del dictamen.

<contexto_del_proyecto>
${contexto}
</contexto_del_proyecto>

<requerimientos criticos="${requerimientos.filter((r) => r.critico).length}" total="${requerimientos.length}">
${requerimientos.map((r) => `- ${r.descripcion}`).join("\n")}
</requerimientos>

<presupuesto total_mxn="${total}" partidas="${partidas.length}">
${partidas.map((p) => `- ${p.concepto}: ${p.cantidad} ${p.unidad} = $${p.importe}`).join("\n")}
</presupuesto>

<hallazgos_normativos>
${hallazgos.map((h) => `- [${h.riesgo}] ${h.titulo} (${h.norma}): ${h.descripcion}`).join("\n")}
</hallazgos_normativos>

El total estimado es ${total} MXN. Úsalo tal cual en totalEstimado.`,
    herramienta: "registrar_resumen",
    descripcionHerramienta: "Registra el resumen ejecutivo del dictamen.",
    esquemaEntrada: ESQUEMA,
    validador: salidaSintesisSchema,
    maxTokens: 4000,
  });

  // El total y el riesgo se calculan en código: son hechos, no opiniones del modelo.
  return { ...resumen, totalEstimado: total, riesgoGlobal: riesgoGlobal(hallazgos) };
}
