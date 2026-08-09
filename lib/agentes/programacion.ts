/**
 * Agente de programación de obra — convierte el alcance en un cronograma.
 *
 * Devuelve actividades, duraciones y precedencias; nada más. Las fechas, las
 * holguras y la ruta crítica las calcula el motor CPM, por la misma razón por
 * la que el presupuesto no confía en la aritmética del modelo: estimar cuánto
 * tarda colar una losa es juicio de ingeniería, encadenar cuarenta actividades
 * sin equivocarse es contabilidad.
 */
import { ejecutarAgente } from "../modelo/index.ts";
import { salidaProgramacionSchema } from "../schemas.ts";
import { programar } from "../programacion/cpm.ts";
import type { ProgramaObra } from "../tipos-proyecto.ts";
import type { Partida } from "../types.ts";
import type { DisciplinaProyecto, Envergadura } from "../disciplinas.ts";
import { ENVERGADURAS, fichaDisciplina } from "../disciplinas.ts";

const ESQUEMA = {
  type: "object",
  properties: {
    actividades: {
      type: "array",
      description:
        "Actividades de obra en orden lógico de ejecución, entre 12 y 30 según la envergadura. Incluye preliminares, cada instalación del alcance, acabados, pruebas y entrega.",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Identificador corto y único, ej. 'A01'. Se usa para encadenar precedencias.",
          },
          nombre: {
            type: "string",
            description: "Qué se ejecuta, en lenguaje de obra. Ej. 'Cimentación y contratrabes'.",
          },
          frente: {
            type: "string",
            description:
              "Frente de trabajo o especialidad responsable, ej. 'Obra civil', 'Instalación eléctrica', 'HVAC', 'Pruebas y entrega'.",
          },
          duracionDias: {
            type: "number",
            description:
              "Duración en días naturales, coherente con la envergadura y con rendimientos reales de cuadrilla. Un hito lleva 0.",
          },
          predecesoras: {
            type: "array",
            items: { type: "string" },
            description:
              "Ids de las actividades que deben terminar antes de que esta empiece. Vacío solo para las de arranque. NO crees ciclos y no cites ids inexistentes.",
          },
          hito: {
            type: "boolean",
            description:
              "true si es un evento verificable sin duración (ej. 'Liberación de instalaciones por la supervisión').",
          },
        },
        required: ["id", "nombre", "frente", "duracionDias", "predecesoras", "hito"],
      },
    },
    supuestos: {
      type: "array",
      items: { type: "string" },
      description:
        "Supuestos de calendario y rendimiento que sostienen las duraciones: jornada, días laborables, clima, disponibilidad de suministro, traslapes permitidos.",
    },
  },
  required: ["actividades", "supuestos"],
};

export async function programarObra(params: {
  nombre: string;
  disciplina: DisciplinaProyecto;
  envergadura: Envergadura;
  ubicacion?: string;
  alcance: string;
  partidas: Partida[];
}): Promise<ProgramaObra> {
  const { nombre, disciplina, envergadura, ubicacion, alcance, partidas } = params;
  const ficha = fichaDisciplina(disciplina);
  const escala = ENVERGADURAS.find((e) => e.id === envergadura)!;

  const sistema = `Eres un planificador de obra con doctorado en dirección de proyectos y veinte años
programando construcción real: sabes que el cronograma no es una lista de deseos sino el
compromiso contractual del que cuelgan las penas convencionales.

Programas la ejecución de un proyecto de ${ficha.nombre.toLowerCase()} de envergadura
${escala.nombre.toLowerCase()} (${escala.referencia}).

Reglas:
- Las duraciones salen de rendimientos reales de cuadrilla y del volumen de obra que se
  desprende del catálogo de conceptos, no de números redondos.
- El encadenado refleja la lógica constructiva: no se instala canalización antes de que
  exista el muro, no se prueba una red antes de cerrarla, no se entrega sin pruebas.
- Los traslapes entre frentes son los que la obra permite de verdad. Programar todo en
  serie infla el plazo; programar todo en paralelo es mentira.
- Cubre todas las instalaciones que aparecen en el alcance, cada una con su frente.
- Cierra siempre con pruebas, puesta en marcha y entrega-recepción.
- Los ids son cortos y únicos, y toda predecesora que cites debe existir.
- Nunca generes dependencias circulares.
- Español técnico de obra, sin Markdown.`;

  const catalogo = partidas
    .slice(0, 60)
    .map((p) => `- ${p.concepto} — ${p.cantidad} ${p.unidad} (${p.disciplina})`)
    .join("\n");

  const { actividades, supuestos } = await ejecutarAgente({
    sistema,
    prompt: `Programa la ejecución de este proyecto.

<proyecto nombre="${nombre}" ubicacion="${ubicacion || "México (asumir)"}">
${alcance}
</proyecto>

${
  catalogo
    ? `<catalogo_de_conceptos>\n${catalogo}\n</catalogo_de_conceptos>`
    : "<catalogo_de_conceptos>No disponible: estima volúmenes a partir del alcance.</catalogo_de_conceptos>"
}`,
    herramienta: "registrar_programa",
    descripcionHerramienta:
      "Registra las actividades de obra con su duración y sus precedencias.",
    esquemaEntrada: ESQUEMA,
    validador: salidaProgramacionSchema,
    maxTokens: 8_000,
  });

  const calculado = programar(actividades);

  return {
    actividades: calculado.actividades,
    duracionDias: calculado.duracionDias,
    rutaCritica: calculado.rutaCritica,
    supuestos,
    avisos: calculado.avisos,
  };
}
