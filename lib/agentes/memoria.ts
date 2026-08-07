/**
 * Agente de memoria — redacta la memoria técnica completa del proyecto.
 *
 * Produce el documento que un despacho entrega junto con los planos: memoria
 * descriptiva y de cálculo por instalación, con criterios de diseño, cálculos
 * justificativos y especificaciones. Es la pieza que convierte un anteproyecto
 * dibujado en un anteproyecto defendible.
 */
import { ejecutarAgente } from "../modelo/index.ts";
import { salidaMemoriaSchema } from "../schemas.ts";
import type { MemoriaProyecto } from "../tipos-proyecto.ts";
import type { Requerimiento } from "../types.ts";
import type { DisciplinaProyecto, Envergadura } from "../disciplinas.ts";
import { ENVERGADURAS, fichaDisciplina } from "../disciplinas.ts";

const ESQUEMA = {
  type: "object",
  properties: {
    objeto: {
      type: "string",
      description:
        "Objeto de la memoria: qué proyecto documenta, para quién y con qué fin. Un párrafo.",
    },
    antecedentes: {
      type: "string",
      description:
        "Antecedentes y condiciones de partida: sitio, clima, servicios existentes, restricciones. Uno o dos párrafos.",
    },
    normativa: {
      type: "array",
      items: { type: "string" },
      description:
        "Normas aplicadas, con nombre completo y el aspecto que regulan (ej. 'NOM-001-SEDE-2012 — instalaciones eléctricas').",
    },
    sistemas: {
      type: "array",
      description:
        "Un bloque por instalación o sistema del proyecto (eléctrica, hidráulica, HVAC, control…). Cubre TODAS las instalaciones del alcance.",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string", description: "Nombre de la instalación, ej. 'Instalación eléctrica'." },
          descripcion: {
            type: "string",
            description:
              "Memoria descriptiva del sistema: configuración, componentes principales y funcionamiento. 120 a 250 palabras.",
          },
          criterios: {
            type: "array",
            items: { type: "string" },
            description: "Criterios de diseño adoptados, cada uno con su base normativa o física.",
          },
          calculos: {
            type: "array",
            description:
              "Cálculos justificativos del dimensionamiento, de 2 a 5 por sistema.",
            items: {
              type: "object",
              properties: {
                concepto: { type: "string", description: "Qué se calcula, ej. 'Corriente del alimentador general'." },
                metodo: { type: "string", description: "Fórmula o método en notación legible, ej. 'I = P / (√3 · V · fp)'." },
                datos: { type: "string", description: "Datos de entrada con unidades, ej. 'P = 180 kW, V = 220 V, fp = 0.9'." },
                resultado: { type: "string", description: "Resultado con unidad y selección comercial, ej. 'I = 524 A → interruptor de 600 A'." },
              },
              required: ["concepto", "metodo", "datos", "resultado"],
            },
          },
          especificaciones: {
            type: "array",
            items: { type: "string" },
            description: "Especificaciones de materiales y equipos que se derivan del cálculo.",
          },
        },
        required: ["nombre", "descripcion", "criterios", "calculos", "especificaciones"],
      },
    },
    conclusiones: {
      type: "string",
      description:
        "Conclusiones: viabilidad, puntos críticos a verificar en la ingeniería de detalle y siguientes pasos. Un párrafo.",
    },
  },
  required: ["objeto", "antecedentes", "normativa", "sistemas", "conclusiones"],
};

export async function redactarMemoria(params: {
  nombre: string;
  disciplina: DisciplinaProyecto;
  envergadura: Envergadura;
  ubicacion?: string;
  alcance: string;
  requerimientos: Requerimiento[];
}): Promise<MemoriaProyecto> {
  const { nombre, disciplina, envergadura, ubicacion, alcance, requerimientos } = params;
  const ficha = fichaDisciplina(disciplina);
  const escala = ENVERGADURAS.find((e) => e.id === envergadura)!;

  const sistema = `Eres un ingeniero con doctorado y ejercicio profesional de primer nivel: formación de
posgrado en tu especialidad, dominio transversal de las demás ingenierías (civil, estructural,
mecánica, eléctrica, electrónica, mecatrónica, hidráulica, neumática, HVAC, industrial,
aeronáutica, naval, ferroviaria y de fluidos) y de las disciplinas afines —arquitectura,
administración de proyectos, costos y derecho de la construcción—. Trabajas con el rigor de
quien firma: cada afirmación se sostiene en un principio físico, una norma vigente o un dato
del documento, y lo que no se sostiene se declara como supuesto.

Redactas la MEMORIA TÉCNICA COMPLETA de un proyecto de ${ficha.nombre.toLowerCase()}:
memoria descriptiva y memoria de cálculo, como la que un despacho entrega junto con los
planos del anteproyecto.

Reglas de contenido:
- Cubre TODAS las instalaciones y sistemas que aparecen en el alcance, cada una como un
  bloque propio en "sistemas". Un proyecto de edificación lleva al menos la instalación
  eléctrica, la hidrosanitaria y la de climatización si el alcance las menciona.
- Los cálculos son de anteproyecto pero reales: fórmula reconocible, datos con unidades y
  resultado con selección comercial. Nada de "se calculará más adelante".
- Los números deben ser coherentes con el alcance y entre sí: si el alcance dice 500 kVA,
  la memoria no puede dimensionar para 200 kVA.
- Normativa de referencia de la disciplina: ${ficha.normativa.join(", ")}. Añade la que
  aplique a cada sistema adicional.
- Envergadura: ${escala.nombre} (${escala.referencia}).
- Redacción técnica sobria en español, sin Markdown, sin listas dentro de los párrafos.`;

  return ejecutarAgente({
    sistema,
    prompt: `Redacta la memoria técnica completa del siguiente proyecto.

<proyecto nombre="${nombre}" ubicacion="${ubicacion || "México (asumir)"}">
${alcance}
</proyecto>

<requerimientos_extraidos>
${requerimientos
  .map((r) => `- [${r.id}] ${r.descripcion}${r.critico ? " (crítico)" : ""}`)
  .join("\n")}
</requerimientos_extraidos>`,
    herramienta: "registrar_memoria",
    descripcionHerramienta:
      "Registra la memoria técnica completa del proyecto: descriptiva y de cálculo por sistema.",
    esquemaEntrada: ESQUEMA,
    validador: salidaMemoriaSchema,
    maxTokens: 16_000,
  });
}
