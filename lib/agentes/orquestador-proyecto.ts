/**
 * Orquestador de proyecto nuevo.
 *
 * Extiende el pipeline de análisis con dos etapas propias:
 *
 *   programa → extractor ─┬─ costos ────┐
 *                         └─ normativo ─┴─ síntesis ─→ diagramas (paralelo)
 *
 * El agente de programa convierte la descripción del cliente en un alcance de
 * obra; a partir de ahí el pipeline es el mismo que el de un documento subido.
 * Los diagramas se generan en paralelo entre sí una vez que existe el alcance,
 * porque ninguno depende de otro.
 */
import type { EventoProyecto } from "../tipos-proyecto.ts";
import type { Hallazgo, Partida } from "../types.ts";
import type { Diagrama } from "../diagramas/tipos.ts";
import type { DisciplinaProyecto, Envergadura, TipoDiagrama } from "../disciplinas.ts";
import { fichaDisciplina } from "../disciplinas.ts";
import { hayApiKey } from "../anthropic.ts";
import { recortarDocumento } from "./comun.ts";
import { redactarAlcance } from "./programa.ts";
import { extraerRequerimientos } from "./extractor.ts";
import { generarPresupuesto } from "./costos.ts";
import { revisarNormativa } from "./normativo.ts";
import { sintetizar } from "./sintesis.ts";
import { generarDiagrama } from "./proyectista.ts";
import { DIAGRAMAS_DEMO, PROYECTO_DEMO } from "../demo-proyecto.ts";

export interface EncargoProyecto {
  nombre: string;
  descripcion: string;
  disciplina: DisciplinaProyecto;
  envergadura: Envergadura;
  ubicacion?: string;
  documentosAdjuntos?: string;
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function* proyectar(
  encargo: EncargoProyecto,
): AsyncGenerator<EventoProyecto> {
  if (!hayApiKey()) {
    yield* proyectarEnModoDemo(encargo);
    return;
  }

  const ficha = fichaDisciplina(encargo.disciplina);

  // Etapa 1 — programa: de la descripción del cliente al alcance de obra.
  yield {
    tipo: "inicio",
    agente: "programa",
    mensaje: "Redactando el alcance de obra a partir de tu descripción",
  };
  const { alcance, premisas } = await redactarAlcance(encargo);
  yield { tipo: "alcance", alcance, premisas };

  const documento = recortarDocumento(alcance);
  const contexto = recortarDocumento(alcance, 12_000);

  // Etapa 2 — extracción.
  yield {
    tipo: "inicio",
    agente: "extractor",
    mensaje: "Extrayendo los requerimientos técnicos del alcance",
  };
  const requerimientos = await extraerRequerimientos(documento);
  yield { tipo: "resultado", agente: "extractor", datos: requerimientos };

  // Etapa 3 — costos, normativa y diagramas, todos en paralelo.
  const tiposDiagrama = ficha.diagramas.slice(
    0,
    encargo.envergadura === "grande" ? 3 : encargo.envergadura === "mediana" ? 2 : 1,
  );

  yield { tipo: "inicio", agente: "costos", mensaje: "Elaborando el catálogo de conceptos" };
  yield { tipo: "inicio", agente: "normativo", mensaje: "Revisando el cumplimiento normativo" };
  yield {
    tipo: "inicio",
    agente: "proyectista",
    mensaje: `Dibujando ${tiposDiagrama.length} diagrama${tiposDiagrama.length > 1 ? "s" : ""} técnico${tiposDiagrama.length > 1 ? "s" : ""}`,
  };

  const tareas: Promise<unknown>[] = [
    generarPresupuesto(requerimientos, contexto),
    revisarNormativa(requerimientos, contexto),
    ...tiposDiagrama.map((tipo) =>
      generarDiagrama({
        tipo,
        disciplina: encargo.disciplina,
        envergadura: encargo.envergadura,
        descripcionProyecto: `${encargo.nombre}. ${encargo.descripcion}`,
        contexto,
      }),
    ),
  ];

  const resultados = await Promise.allSettled(tareas);

  let partidas: Partida[] = [];
  if (resultados[0].status === "fulfilled") {
    partidas = resultados[0].value as Partida[];
    yield { tipo: "resultado", agente: "costos", datos: partidas };
  } else {
    yield { tipo: "error", agente: "costos", mensaje: mensajeDeError(resultados[0].reason) };
  }

  let hallazgos: Hallazgo[] = [];
  if (resultados[1].status === "fulfilled") {
    hallazgos = resultados[1].value as Hallazgo[];
    yield { tipo: "resultado", agente: "normativo", datos: hallazgos };
  } else {
    yield { tipo: "error", agente: "normativo", mensaje: mensajeDeError(resultados[1].reason) };
  }

  const diagramas: Diagrama[] = [];
  for (let i = 2; i < resultados.length; i++) {
    const r = resultados[i];
    if (r.status === "fulfilled") {
      const diagrama = r.value as Diagrama;
      diagramas.push(diagrama);
      yield { tipo: "diagrama", diagrama };
    } else {
      yield {
        tipo: "error",
        agente: "proyectista",
        mensaje: `No se pudo dibujar el diagrama ${tiposDiagrama[i - 2]}: ${mensajeDeError(r.reason)}`,
      };
    }
  }
  if (diagramas.length > 0) {
    yield { tipo: "resultado", agente: "proyectista", datos: diagramas.length };
  }

  // Etapa 4 — síntesis.
  yield { tipo: "inicio", agente: "sintesis", mensaje: "Redactando el resumen ejecutivo" };
  try {
    const resumen = await sintetizar({ contexto, requerimientos, partidas, hallazgos });
    yield { tipo: "resultado", agente: "sintesis", datos: resumen };
  } catch (error) {
    yield { tipo: "error", agente: "sintesis", mensaje: mensajeDeError(error) };
  }

  yield { tipo: "fin", modoDemo: false };
}

async function* proyectarEnModoDemo(
  encargo: EncargoProyecto,
): AsyncGenerator<EventoProyecto> {
  yield {
    tipo: "inicio",
    agente: "programa",
    mensaje: "Modo demostración: redactando el alcance",
  };
  await espera(1200);
  yield {
    tipo: "alcance",
    alcance: PROYECTO_DEMO.alcance,
    premisas: PROYECTO_DEMO.premisas,
  };

  yield { tipo: "inicio", agente: "extractor", mensaje: "Modo demostración" };
  await espera(1000);
  yield { tipo: "resultado", agente: "extractor", datos: PROYECTO_DEMO.requerimientos };

  yield { tipo: "inicio", agente: "costos", mensaje: "Modo demostración" };
  yield { tipo: "inicio", agente: "normativo", mensaje: "Modo demostración" };
  yield { tipo: "inicio", agente: "proyectista", mensaje: "Modo demostración" };
  await espera(1400);
  yield { tipo: "resultado", agente: "costos", datos: PROYECTO_DEMO.partidas };
  yield { tipo: "resultado", agente: "normativo", datos: PROYECTO_DEMO.hallazgos };

  const diagramas = DIAGRAMAS_DEMO[encargo.disciplina] ?? DIAGRAMAS_DEMO.electrica ?? [];
  for (const diagrama of diagramas) {
    await espera(500);
    yield { tipo: "diagrama", diagrama };
  }
  yield { tipo: "resultado", agente: "proyectista", datos: diagramas.length };

  yield { tipo: "inicio", agente: "sintesis", mensaje: "Modo demostración" };
  await espera(900);
  yield { tipo: "resultado", agente: "sintesis", datos: PROYECTO_DEMO.resumen };

  yield { tipo: "fin", modoDemo: true };
}

function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido.";
}
