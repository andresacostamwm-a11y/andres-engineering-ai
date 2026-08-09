/**
 * Agente 2 — Ingeniero de costos.
 *
 * Convierte los requerimientos en un catálogo de conceptos con matriz de precio
 * unitario desglosada. Trabaja sobre la salida del extractor, no sobre el
 * documento crudo: así el presupuesto es trazable requerimiento → partida.
 */
import { ejecutarAgente } from "../modelo/index.ts";
import { salidaCostosSchema } from "../schemas.ts";
import type { Partida, Requerimiento } from "../types.ts";
import { DISCIPLINAS_JSON } from "./comun.ts";
import type { FichaPais } from "../moneda/paises.ts";

const SISTEMA = `Eres un ingeniero con doctorado y ejercicio profesional de primer nivel: formación de
posgrado en tu especialidad, dominio transversal de las demás ingenierías (civil, estructural,
mecánica, eléctrica, electrónica, mecatrónica, hidráulica, neumática, HVAC, industrial,
aeronáutica, naval, ferroviaria y de fluidos) y de las disciplinas afines —arquitectura,
administración de proyectos, costos y derecho de la construcción—. Trabajas con el rigor de
quien firma: cada afirmación se sostiene en un principio físico, una norma vigente o un dato
del documento, y lo que no se sostiene se declara como supuesto.

Aquí actúas como ingeniero de costos: elaboras catálogos de conceptos con matrices de
precio unitario para obra e instalaciones, con criterio del mercado del país donde se
construye.

Reglas estrictas:
- MONEDA: todos los precios van en {{MONEDA}} ({{PAIS}}), la moneda oficial del país donde
  se ejecuta la obra. No conviertas a ninguna otra moneda ni mezcles monedas: la conversión
  la hace el sistema después, con un tipo de cambio trazable.
- MERCADO: los precios deben corresponder al mercado de la construcción de {{PAIS}} a la
  fecha del análisis, no a otro país. Si para alguna partida solo tienes referencia de un
  mercado distinto, dilo en "supuesto" indicando de qué mercado la tomaste.
- Declara en "mercado" la plaza concreta de referencia (ej. "Mercado de la construcción de
  {{PAIS}}, zona de {{ZONA}}") y en "notaPrecios" cualquier salvedad sobre la vigencia.
- Cada partida lleva su matriz desglosada: materiales, manoObra, equipo, indirectos.
  La suma de los cuatro DEBE ser igual a precioUnitario.
- importe DEBE ser exactamente cantidad x precioUnitario.
- Los indirectos rondan el 15-25% del precio unitario según el tipo de partida.
- Cuando tengas que suponer una cantidad porque el documento no la da, escríbelo
  explícitamente en "supuesto". Un presupuesto con supuestos declarados es útil;
  uno con cifras inventadas y silenciadas es peligroso.
- Usa claves jerárquicas tipo 01.01, 01.02, 02.01 agrupando por disciplina.
- Devuelve entre 10 y 30 partidas.
- Tus precios son ESTIMACIONES de mercado, no cotizaciones de proveedor. No las presentes
  como cotizaciones firmes.`;

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
    mercado: {
      type: "string",
      description:
        "Plaza y mercado de referencia de los precios, con el país explícito.",
    },
    notaPrecios: {
      type: "string",
      description:
        "Salvedades sobre la vigencia o el origen de los precios. Cadena vacía si no hay ninguna.",
    },
  },
  required: ["partidas", "mercado", "notaPrecios"],
};

export interface PresupuestoGenerado {
  partidas: Partida[];
  /** Plaza de referencia declarada por el agente. */
  mercado: string;
  /** Salvedades sobre vigencia u origen de los precios. */
  notaPrecios: string;
}

export async function generarPresupuesto(
  requerimientos: Requerimiento[],
  contexto: string,
  pais: FichaPais,
  zona = "",
): Promise<PresupuestoGenerado> {
  const listado = requerimientos
    .map(
      (r) =>
        `- [${r.id}] (${r.disciplina}${r.critico ? ", crítico" : ""}) ${r.descripcion}`,
    )
    .join("\n");

  const sistema = SISTEMA.replaceAll("{{MONEDA}}", pais.moneda)
    .replaceAll("{{PAIS}}", pais.nombre)
    .replaceAll("{{ZONA}}", zona || pais.nombre);

  const salida = await ejecutarAgente({
    sistema,
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

  return {
    partidas: normalizarPartidas(salida.partidas),
    mercado: salida.mercado?.trim() || `Mercado de la construcción de ${pais.nombre}`,
    notaPrecios: salida.notaPrecios?.trim() ?? "",
  };
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
