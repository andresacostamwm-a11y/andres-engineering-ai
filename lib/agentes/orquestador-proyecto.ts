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
import type { EventoProyecto, MemoriaProyecto } from "../tipos-proyecto.ts";
import type { Hallazgo, Partida } from "../types.ts";
import type { Diagrama } from "../diagramas/tipos.ts";
import type { DisciplinaProyecto, Envergadura, TipoDiagrama } from "../disciplinas.ts";
import { diagramasDe, fichaDisciplina, normativaDe } from "../disciplinas.ts";
import { esErrorDeCuota, hayApiKey } from "../modelo/index.ts";
import { recortarDocumento } from "./comun.ts";
import { redactarAlcance } from "./programa.ts";
import { extraerRequerimientos } from "./extractor.ts";
import { generarPresupuesto } from "./costos.ts";
import { construirEconomia, paisDelProyecto } from "../moneda/economia.ts";
import type { Economia } from "../moneda/tipos.ts";
import { revisarNormativa } from "./normativo.ts";
import { sintetizar } from "./sintesis.ts";
import { generarDiagrama } from "./proyectista.ts";
import { redactarMemoria } from "./memoria.ts";
import { DIAGRAMAS_DEMO, MEMORIA_DEMO, PROYECTO_DEMO } from "../demo-proyecto.ts";

export interface EncargoProyecto {
  nombre: string;
  descripcion: string;
  disciplina: DisciplinaProyecto;
  /** Todas las elegidas. La primera es la principal. */
  disciplinas?: DisciplinaProyecto[];
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
  // Un proyecto puede cruzar especialidades: se dibujan las láminas de todas.
  const elegidas = encargo.disciplinas?.length
    ? encargo.disciplinas
    : [encargo.disciplina];

  // Etapa 1 — programa: de la descripción del cliente al alcance de obra.
  yield {
    tipo: "inicio",
    agente: "programa",
    mensaje: "Redactando el alcance de obra a partir de tu descripción",
  };

  let alcance: string;
  let premisas: string[];
  try {
    ({ alcance, premisas } = await redactarAlcance(encargo));
  } catch (error) {
    // Si la cuenta no puede llamar al modelo, la aplicación no se rompe:
    // recorre el mismo pipeline con el caso de demostración y lo señala.
    if (esErrorDeCuota(error)) {
      yield {
        tipo: "error",
        agente: "programa",
        mensaje:
          "La cuota de la API está agotada; el proyecto continúa en modo demostración.",
      };
      yield* proyectarEnModoDemo(encargo);
      return;
    }
    throw error;
  }
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

  const { pais, pista, deducido } = paisDelProyecto(
    encargo.ubicacion ?? "",
    `${encargo.descripcion ?? ""} ${contexto}`,
  );

  // Etapa 3 — costos, normativa, memoria y el paquete COMPLETO de planos,
  // todos en paralelo: un proyecto entrega todas sus instalaciones, no una
  // muestra. La envergadura calibra la densidad de cada plano, no cuántos hay.
  const tiposDiagrama = diagramasDe(elegidas);

  yield { tipo: "inicio", agente: "costos", mensaje: "Elaborando el catálogo de conceptos" };
  yield { tipo: "inicio", agente: "normativo", mensaje: "Revisando el cumplimiento normativo" };
  yield {
    tipo: "inicio",
    agente: "memoria",
    mensaje: "Redactando la memoria descriptiva y de cálculo",
  };
  yield {
    tipo: "inicio",
    agente: "proyectista",
    mensaje: `Dibujando el paquete completo: ${tiposDiagrama.length} láminas`,
  };

  const tareas: Promise<unknown>[] = [
    generarPresupuesto(requerimientos, contexto, pais, encargo.ubicacion ?? ""),
    revisarNormativa(requerimientos, contexto),
    redactarMemoria({
      nombre: encargo.nombre,
      disciplina: encargo.disciplina,
      envergadura: encargo.envergadura,
      ubicacion: encargo.ubicacion,
      alcance: contexto,
      requerimientos,
    }),
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
  let mercado = `Mercado de la construcción de ${pais.nombre}`;
  if (resultados[0].status === "fulfilled") {
    const costos = resultados[0].value as { partidas: Partida[]; mercado: string };
    partidas = costos.partidas;
    mercado = costos.mercado;
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

  if (resultados[2].status === "fulfilled") {
    yield {
      tipo: "resultado",
      agente: "memoria",
      datos: resultados[2].value as MemoriaProyecto,
    };
  } else {
    yield { tipo: "error", agente: "memoria", mensaje: mensajeDeError(resultados[2].reason) };
  }

  const diagramas: Diagrama[] = [];
  for (let i = 3; i < resultados.length; i++) {
    const r = resultados[i];
    if (r.status === "fulfilled") {
      const diagrama = r.value as Diagrama;
      diagramas.push(diagrama);
      yield { tipo: "diagrama", diagrama };
    } else {
      yield {
        tipo: "error",
        agente: "proyectista",
        mensaje: `No se pudo dibujar el diagrama ${tiposDiagrama[i - 3]}: ${mensajeDeError(r.reason)}`,
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

  const economia: Economia = await construirEconomia({
    pais,
    pistaPais: pista,
    paisDeducido: deducido,
    mercado,
  });

  yield { tipo: "fin", modoDemo: false, economia };
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
  yield { tipo: "inicio", agente: "memoria", mensaje: "Modo demostración" };
  yield { tipo: "inicio", agente: "proyectista", mensaje: "Modo demostración" };
  await espera(1400);
  yield { tipo: "resultado", agente: "costos", datos: PROYECTO_DEMO.partidas };
  yield { tipo: "resultado", agente: "normativo", datos: PROYECTO_DEMO.hallazgos };
  await espera(600);
  yield { tipo: "resultado", agente: "memoria", datos: MEMORIA_DEMO };

  const diagramas = DIAGRAMAS_DEMO[encargo.disciplina] ?? DIAGRAMAS_DEMO.electrica ?? [];
  for (const diagrama of diagramas) {
    await espera(500);
    yield { tipo: "diagrama", diagrama };
  }
  yield { tipo: "resultado", agente: "proyectista", datos: diagramas.length };

  yield { tipo: "inicio", agente: "sintesis", mensaje: "Modo demostración" };
  await espera(900);
  yield { tipo: "resultado", agente: "sintesis", datos: PROYECTO_DEMO.resumen };

  const demo = paisDelProyecto(encargo.ubicacion ?? "");
  const economia = await construirEconomia({
    pais: demo.pais,
    pistaPais: demo.pista,
    paisDeducido: demo.deducido,
    mercado: `Mercado de la construcción de ${demo.pais.nombre} (caso de demostración)`,
  });
  yield { tipo: "fin", modoDemo: true, economia };
}

function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido.";
}
