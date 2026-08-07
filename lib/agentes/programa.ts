/**
 * Agente de programa — redacta el alcance de obra de un proyecto nuevo.
 *
 * Cuando el usuario no sube un documento sino que describe lo que quiere
 * construir, este agente produce el alcance técnico que el resto del pipeline
 * necesita como entrada. Es el paso que convierte «quiero una nave con oficinas»
 * en un documento sobre el que se puede extraer, costear y revisar normativa.
 */
import { ejecutarAgente } from "../anthropic.ts";
import { z } from "zod";
import type { DisciplinaProyecto, Envergadura } from "../disciplinas.ts";
import { ENVERGADURAS, fichaDisciplina } from "../disciplinas.ts";

const salidaSchema = z.object({
  alcance: z.string().min(200),
  premisas: z.array(z.string()),
});

const ESQUEMA = {
  type: "object",
  properties: {
    alcance: {
      type: "string",
      description:
        "Alcance de obra completo en texto plano, con numeración por apartados como un documento real de proyecto.",
    },
    premisas: {
      type: "array",
      items: { type: "string" },
      description: "Premisas de diseño asumidas por falta de dato del cliente.",
    },
  },
  required: ["alcance", "premisas"],
};

export async function redactarAlcance(params: {
  nombre: string;
  descripcion: string;
  disciplina: DisciplinaProyecto;
  envergadura: Envergadura;
  ubicacion?: string;
  documentosAdjuntos?: string;
}): Promise<{ alcance: string; premisas: string[] }> {
  const { nombre, descripcion, disciplina, envergadura, ubicacion, documentosAdjuntos } =
    params;
  const ficha = fichaDisciplina(disciplina);
  const escala = ENVERGADURAS.find((e) => e.id === envergadura)!;

  const sistema = `Eres un ingeniero con doctorado y ejercicio profesional de primer nivel: formación de
posgrado en tu especialidad, dominio transversal de las demás ingenierías (civil, estructural,
mecánica, eléctrica, electrónica, mecatrónica, hidráulica, neumática, HVAC, industrial,
aeronáutica, naval, ferroviaria y de fluidos) y de las disciplinas afines —arquitectura,
administración de proyectos, costos y derecho de la construcción—. Trabajas con el rigor de
quien firma: cada afirmación se sostiene en un principio físico, una norma vigente o un dato
del documento, y lo que no se sostiene se declara como supuesto.

Aquí proyectas en ${ficha.nombre.toLowerCase()} y redactas el alcance de obra a partir de
lo que el cliente describe.

El alcance que produces es el documento sobre el que después se cuantifica y se
presupuesta, así que tiene que ser específico y numerable.

Reglas:
- Estructura por apartados numerados (1. GENERALIDADES, 2. …), como un alcance real.
- Cada apartado da cantidades, materiales y especificaciones concretas: superficies,
  capacidades, calibres, diámetros, potencias. Un alcance sin números no sirve.
- Cuando el cliente no da un dato, asúmelo con criterio profesional y anótalo en
  "premisas". Nunca dejes un hueco sin decidir.
- Incluye un apartado de entregables y otro de plazo.
- Envergadura del proyecto: ${escala.nombre} (${escala.referencia}). Ajusta el alcance a
  esa escala: ni un alcance de nave industrial para una caseta, ni al revés.
- Considera la normativa aplicable: ${ficha.normativa.join(", ")}.
- Entregables característicos de la disciplina: ${ficha.entregables.join(", ")}.
- Entre 500 y 1200 palabras. Texto plano, sin Markdown.`;

  return ejecutarAgente({
    sistema,
    prompt: `Redacta el alcance de obra del siguiente proyecto.

<proyecto>
Nombre: ${nombre}
Disciplina principal: ${ficha.nombre}
Envergadura: ${escala.nombre}
Ubicación: ${ubicacion || "No especificada, asume clima y normativa de México"}

Descripción del cliente:
${descripcion}
</proyecto>
${
  documentosAdjuntos
    ? `\n<documentacion_aportada>\n${documentosAdjuntos.slice(0, 60_000)}\n</documentacion_aportada>`
    : ""
}`,
    herramienta: "registrar_alcance",
    descripcionHerramienta: "Registra el alcance de obra redactado y sus premisas.",
    esquemaEntrada: ESQUEMA,
    validador: salidaSchema,
    maxTokens: 8000,
  });
}
