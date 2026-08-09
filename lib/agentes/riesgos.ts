/**
 * Agente de riesgos y viabilidad.
 *
 * Aporta el juicio —qué puede salir mal, con qué probabilidad y qué variables
 * mueven el costo— y deja la aritmética fuera: la severidad de cada riesgo y
 * los escenarios económicos se calculan aquí, sobre el presupuesto que ya
 * emitió el agente de costos. Así la sensibilidad no es una cifra inventada
 * sino el mismo total del proyecto movido por causas declaradas.
 */
import { ejecutarAgente } from "../modelo/index.ts";
import { salidaRiesgosSchema } from "../schemas.ts";
import type {
  RiesgoEvaluado,
  RiesgoProyecto,
  Sensibilidad,
  VariableSensibilidad,
  Viabilidad,
} from "../tipos-proyecto.ts";
import type { Hallazgo, Partida } from "../types.ts";
import type { DisciplinaProyecto, Envergadura } from "../disciplinas.ts";
import { ENVERGADURAS, fichaDisciplina } from "../disciplinas.ts";

/**
 * Cuánto de la exposición al alza se recupera si todo sale bien.
 *
 * No es simétrico a propósito: en obra los sobrecostos se materializan con más
 * frecuencia y más magnitud que los ahorros, así que el escenario optimista
 * recupera solo una fracción de lo que el pesimista añade.
 */
const RECUPERACION_OPTIMISTA = 0.4;

const CONTINGENCIA_MINIMA = 5;
const CONTINGENCIA_MAXIMA = 30;

const ESQUEMA = {
  type: "object",
  properties: {
    riesgos: {
      type: "array",
      description:
        "Riesgos del proyecto, entre 6 y 14. Cubre lo técnico, lo normativo, lo económico, el plazo y el contexto del sitio.",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "Identificador corto, ej. 'R01'." },
          titulo: { type: "string", description: "El riesgo en una frase concreta." },
          categoria: {
            type: "string",
            description:
              "Familia: 'Técnico', 'Normativo', 'Económico', 'Plazo', 'Suministro', 'Contexto' o 'Seguridad'.",
          },
          probabilidad: {
            type: "number",
            description: "Probabilidad de ocurrencia, entero de 1 (rara) a 5 (casi segura).",
          },
          impacto: {
            type: "number",
            description: "Impacto si ocurre, entero de 1 (menor) a 5 (severo).",
          },
          descripcion: {
            type: "string",
            description: "Por qué existe el riesgo en ESTE proyecto, con el dato que lo sostiene.",
          },
          mitigacion: {
            type: "string",
            description: "Acción concreta y ejecutable para reducirlo, no una intención genérica.",
          },
          responsable: {
            type: "string",
            description: "Figura del proyecto que debe ejecutar la mitigación, ej. 'Residente de obra'.",
          },
        },
        required: [
          "id",
          "titulo",
          "categoria",
          "probabilidad",
          "impacto",
          "descripcion",
          "mitigacion",
          "responsable",
        ],
      },
    },
    variables: {
      type: "array",
      description:
        "Variables económicas que mueven el presupuesto, entre 3 y 6. Son la base del análisis de sensibilidad.",
      items: {
        type: "object",
        properties: {
          concepto: {
            type: "string",
            description: "Qué varía, ej. 'Precio del acero de refuerzo' o 'Tipo de cambio'.",
          },
          variacionPct: {
            type: "number",
            description:
              "Variación al alza plausible en 12 meses, en porcentaje sobre la parte afectada. Entre 3 y 40.",
          },
          pesoPct: {
            type: "number",
            description:
              "Qué porcentaje del presupuesto total afecta esa variable. La suma de los pesos no debe pasar de 100.",
          },
          justificacion: {
            type: "string",
            description: "Por qué esa magnitud, con referencia al mercado o al alcance.",
          },
        },
        required: ["concepto", "variacionPct", "pesoPct", "justificacion"],
      },
    },
    veredicto: {
      type: "string",
      description:
        "Lectura de conjunto en un párrafo: si el proyecto es viable, qué lo condiciona y qué decide un promotor con esto delante.",
    },
    condiciones: {
      type: "array",
      items: { type: "string" },
      description: "Condiciones que deben cumplirse para sostener la viabilidad declarada.",
    },
  },
  required: ["riesgos", "variables", "veredicto", "condiciones"],
};

export async function evaluarViabilidad(params: {
  nombre: string;
  disciplina: DisciplinaProyecto;
  envergadura: Envergadura;
  ubicacion?: string;
  alcance: string;
  partidas: Partida[];
  hallazgos: Hallazgo[];
}): Promise<Viabilidad> {
  const { nombre, disciplina, envergadura, ubicacion, alcance, partidas, hallazgos } = params;
  const ficha = fichaDisciplina(disciplina);
  const escala = ENVERGADURAS.find((e) => e.id === envergadura)!;
  const total = partidas.reduce((suma, p) => suma + p.importe, 0);

  const sistema = `Eres un director de proyectos con doctorado en gestión de riesgo constructivo. Has visto
suficientes obras para saber que el riesgo que hunde un proyecto rara vez es el que estaba en
la lista: es el que se dio por descontado.

Evalúas la viabilidad de un proyecto de ${ficha.nombre.toLowerCase()} de envergadura
${escala.nombre.toLowerCase()} (${escala.referencia}).

Reglas:
- Cada riesgo es de ESTE proyecto, no de la construcción en general. Si no puedes anclarlo a
  un dato del alcance, del presupuesto o de los hallazgos normativos, no lo pongas.
- Probabilidad e impacto son enteros de 1 a 5, calibrados: reservar el 5 de impacto para lo
  que detiene la obra o compromete la seguridad.
- Los hallazgos normativos críticos deben aparecer como riesgo, salvo que ya estén resueltos
  en el alcance.
- Las variables de sensibilidad se refieren a partidas reales del presupuesto y sus pesos
  suman como mucho 100.
- No calcules importes ni totales: solo declaras porcentajes y pesos. Los escenarios los
  calcula el sistema sobre el presupuesto real.
- Español profesional, sobrio, sin Markdown.`;

  const resumenPartidas = partidas
    .slice(0, 40)
    .map((p) => `- ${p.concepto}: ${p.cantidad} ${p.unidad} (${p.disciplina})`)
    .join("\n");

  const resumenHallazgos = hallazgos
    .map((h) => `- [${h.riesgo}] ${h.titulo} — ${h.norma}`)
    .join("\n");

  const salida = await ejecutarAgente({
    sistema,
    prompt: `Evalúa el riesgo y la viabilidad de este proyecto.

<proyecto nombre="${nombre}" ubicacion="${ubicacion || "México (asumir)"}">
${alcance}
</proyecto>

<presupuesto partidas="${partidas.length}">
${resumenPartidas || "Sin catálogo disponible."}
</presupuesto>

<hallazgos_normativos>
${resumenHallazgos || "Sin hallazgos registrados."}
</hallazgos_normativos>`,
    herramienta: "registrar_viabilidad",
    descripcionHerramienta:
      "Registra la matriz de riesgos y las variables del análisis de sensibilidad.",
    esquemaEntrada: ESQUEMA,
    validador: salidaRiesgosSchema,
    maxTokens: 8_000,
  });

  return {
    riesgos: salida.riesgos.map(evaluarRiesgo),
    sensibilidad: calcularSensibilidad(total, salida.variables),
    veredicto: salida.veredicto,
    condiciones: salida.condiciones,
  };
}

/** Severidad y nivel de un riesgo. Se calcula aquí, no lo declara el modelo. */
export function evaluarRiesgo(riesgo: RiesgoProyecto): RiesgoEvaluado {
  const probabilidad = acotar(riesgo.probabilidad);
  const impacto = acotar(riesgo.impacto);
  const severidad = probabilidad * impacto;
  return {
    ...riesgo,
    probabilidad,
    impacto,
    severidad,
    nivel:
      severidad >= 15 ? "critico" : severidad >= 9 ? "alto" : severidad >= 4 ? "medio" : "bajo",
  };
}

/**
 * Escenarios económicos sobre el presupuesto real.
 *
 * La exposición de cada variable es su variación al alza aplicada solo a la
 * parte del presupuesto que toca; el pesimista las suma todas, que es el
 * supuesto conservador que se usa para dimensionar contingencia.
 */
export function calcularSensibilidad(
  base: number,
  variables: VariableSensibilidad[],
): Sensibilidad {
  const exposicion = variables.reduce(
    (suma, v) => suma + (Math.max(0, v.variacionPct) / 100) * (acotarPeso(v.pesoPct) / 100),
    0,
  );

  const pesimista = base * (1 + exposicion);
  const optimista = base * (1 - exposicion * RECUPERACION_OPTIMISTA);

  const contingenciaPct = Math.min(
    CONTINGENCIA_MAXIMA,
    Math.max(CONTINGENCIA_MINIMA, Math.round(exposicion * 100)),
  );

  return {
    base,
    optimista: Math.round(optimista * 100) / 100,
    pesimista: Math.round(pesimista * 100) / 100,
    contingenciaPct,
    variables: variables.map((v) => ({ ...v, pesoPct: acotarPeso(v.pesoPct) })),
  };
}

function acotar(valor: number): number {
  if (!Number.isFinite(valor)) return 1;
  return Math.min(5, Math.max(1, Math.round(valor)));
}

function acotarPeso(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.min(100, Math.max(0, valor));
}
