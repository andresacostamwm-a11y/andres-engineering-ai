/**
 * Agente 2 — Ingeniero de costos.
 *
 * Convierte los requerimientos en un catálogo de conceptos con matriz de precio
 * unitario desglosada. Trabaja sobre la salida del extractor, no sobre el
 * documento crudo: así el presupuesto es trazable requerimiento → partida.
 */
import { ejecutarAgente } from "../anthropic.ts";
import { salidaCostosSchema } from "../schemas.ts";
import type { Partida, Requerimiento } from "../types.ts";
import { DISCIPLINAS_JSON } from "./comun.ts";

const SISTEMA = `Eres un ingeniero de costos senior en México. Elaboras catálogos de conceptos
con matrices de precio unitario para obra y para instalaciones.

Reglas estrictas:
- Precios en pesos mexicanos (MXN), a valor de mercado actual de obra en México.
- Cada partida lleva su matriz desglosada: materiales, manoObra, equipo, indirectos.
  La suma de los cuatro DEBE ser igual a precioUnitario.
- importe DEBE ser exactamente cantidad x precioUnitario.
- Los indirectos rondan el 15-25% del precio unitario según el tipo de partida.
- Cuando tengas que suponer una cantidad porque el documento no la da, escríbelo
  explícitamente en "supuesto". Un presupuesto con supuestos declarados es útil;
  uno con cifras inventadas y silenciadas es peligroso.
- Usa claves jerárquicas tipo 01.01, 01.02, 02.01 agrupando por disciplina.
- Devuelve entre 10 y 30 partidas.`;

const ESQUEMA = {
  type: "object",
  properties: {
    partidas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          clave: { type: "string", description: "Clave jerárquica, ej. 01.02" },
          concepto: { type: "string" },
          unidad: {
            type: "string",
            description: "Unidad de medida: m2, m3, pza, lote, ml, kg, salida.",
          },
          cantidad: { type: "number" },
          precioUnitario: { type: "number" },
          importe: {
            type: "number",
            description: "cantidad x precioUnitario, sin redondeos extra.",
          },
          disciplina: DISCIPLINAS_JSON,
          matriz: {
            type: "object",
            properties: {
              materiales: { type: "number" },
              manoObra: { type: "number" },
              equipo: { type: "number" },
              indirectos: { type: "number" },
            },
            required: ["materiales", "manoObra", "equipo", "indirectos"],
          },
          supuesto: {
            type: ["string", "null"],
            description:
              "Supuesto asumido para poder costear, o null si la cantidad viene del documento.",
          },
        },
        required: [
          "clave",
          "concepto",
          "unidad",
          "cantidad",
          "precioUnitario",
          "importe",
          "disciplina",
          "matriz",
          "supuesto",
        ],
      },
    },
  },
  required: ["partidas"],
};

export async function generarPresupuesto(
  requerimientos: Requerimiento[],
  contexto: string,
): Promise<Partida[]> {
  const listado = requerimientos
    .map(
      (r) =>
        `- [${r.id}] (${r.disciplina}${r.critico ? ", crítico" : ""}) ${r.descripcion}`,
    )
    .join("\n");

  const salida = await ejecutarAgente({
    sistema: SISTEMA,
    prompt: `Elabora el catálogo de conceptos y precios unitarios para el siguiente proyecto.

<contexto_del_proyecto>
${contexto}
</contexto_del_proyecto>

<requerimientos_detectados>
${listado}
</requerimientos_detectados>`,
    herramienta: "registrar_presupuesto",
    descripcionHerramienta:
      "Registra el catálogo de conceptos con matrices de precio unitario.",
    esquemaEntrada: ESQUEMA,
    validador: salidaCostosSchema,
    maxTokens: 12000,
  });

  return normalizarPartidas(salida.partidas);
}

/**
 * Corrige la aritmética del modelo. Los LLM son buenos estimando precios y malos
 * multiplicando; la coherencia numérica se impone en código, no en el prompt.
 */
export function normalizarPartidas(partidas: Partida[]): Partida[] {
  return partidas.map((p) => {
    const sumaMatriz =
      p.matriz.materiales + p.matriz.manoObra + p.matriz.equipo + p.matriz.indirectos;
    // El precio unitario manda: si la matriz no cuadra, se ajustan los indirectos.
    const desfase = redondear(p.precioUnitario - sumaMatriz);
    const matriz =
      Math.abs(desfase) > 0.01
        ? { ...p.matriz, indirectos: redondear(p.matriz.indirectos + desfase) }
        : p.matriz;

    return {
      ...p,
      matriz,
      importe: redondear(p.cantidad * p.precioUnitario),
    };
  });
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

export function totalPresupuesto(partidas: Partida[]): number {
  return redondear(partidas.reduce((suma, p) => suma + p.importe, 0));
}
