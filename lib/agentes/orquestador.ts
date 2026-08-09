/**
 * Orquestador del pipeline.
 *
 * Topología:
 *
 *   extractor ──┬── costos ────┐
 *               └── normativo ─┴── síntesis
 *
 * El extractor es la única etapa estrictamente secuencial: los otros dos agentes
 * dependen de su salida pero no entre sí, así que corren en paralelo y el tiempo
 * total es el del más lento, no la suma de ambos.
 *
 * El generador emite eventos conforme avanza para que la interfaz muestre el
 * progreso real en lugar de un spinner opaco.
 */
import type { EventoAgente, Hallazgo, Partida } from "../types.ts";
import { esErrorDeCuota, hayApiKey } from "../modelo/index.ts";
import { recortarDocumento } from "./comun.ts";
import { extraerRequerimientos } from "./extractor.ts";
import { generarPresupuesto } from "./costos.ts";
import { revisarNormativa } from "./normativo.ts";
import { sintetizar } from "./sintesis.ts";
import { construirEconomia, paisDelProyecto } from "../moneda/economia.ts";
import type { Economia } from "../moneda/tipos.ts";
import {
  HALLAZGOS_DEMO,
  PARTIDAS_DEMO,
  REQUERIMIENTOS_DEMO,
  RESUMEN_DEMO,
} from "../demo.ts";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function* analizar(
  documentoCrudo: string,
): AsyncGenerator<EventoAgente> {
  if (!hayApiKey()) {
    yield* analizarEnModoDemo();
    return;
  }

  const documento = recortarDocumento(documentoCrudo);
  const contexto = recortarDocumento(documentoCrudo, 12_000);
  // El país sale del propio documento: un pliego casi siempre nombra su plaza.
  const { pais, pista, deducido } = paisDelProyecto("", documentoCrudo);

  // Etapa 1 — extracción.
  yield {
    tipo: "inicio",
    agente: "extractor",
    mensaje: "Leyendo el documento y extrayendo requerimientos técnicos",
  };
  let requerimientos;
  try {
    requerimientos = await extraerRequerimientos(documento);
  } catch (error) {
    if (esErrorDeCuota(error)) {
      yield {
        tipo: "error",
        agente: "extractor",
        mensaje:
          "La cuota de la API está agotada; el análisis continúa en modo demostración.",
      };
      yield* analizarEnModoDemo();
      return;
    }
    throw error;
  }
  yield { tipo: "resultado", agente: "extractor", datos: requerimientos };

  // Etapa 2 — costos y normativa en paralelo.
  yield {
    tipo: "inicio",
    agente: "costos",
    mensaje: "Elaborando catálogo de conceptos y precios unitarios",
  };
  yield {
    tipo: "inicio",
    agente: "normativo",
    mensaje: "Contrastando contra el marco normativo aplicable",
  };

  const [resCostos, resNormativo] = await Promise.allSettled([
    generarPresupuesto(requerimientos, contexto, pais),
    revisarNormativa(requerimientos, contexto),
  ]);

  let partidas: Partida[] = [];
  let mercado = `Mercado de la construcción de ${pais.nombre}`;
  if (resCostos.status === "fulfilled") {
    partidas = resCostos.value.partidas;
    mercado = resCostos.value.mercado;
    yield { tipo: "resultado", agente: "costos", datos: partidas };
  } else {
    yield {
      tipo: "error",
      agente: "costos",
      mensaje: mensajeDeError(resCostos.reason),
    };
  }

  let hallazgos: Hallazgo[] = [];
  if (resNormativo.status === "fulfilled") {
    hallazgos = resNormativo.value;
    yield { tipo: "resultado", agente: "normativo", datos: hallazgos };
  } else {
    yield {
      tipo: "error",
      agente: "normativo",
      mensaje: mensajeDeError(resNormativo.reason),
    };
  }

  // Etapa 3 — síntesis sobre lo que sí se produjo.
  yield {
    tipo: "inicio",
    agente: "sintesis",
    mensaje: "Redactando el resumen ejecutivo del dictamen",
  };
  try {
    const resumen = await sintetizar({
      contexto,
      requerimientos,
      partidas,
      hallazgos,
    });
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

/** Recorre el mismo pipeline con datos fijos cuando no hay API key. */
async function* analizarEnModoDemo(): AsyncGenerator<EventoAgente> {
  yield {
    tipo: "inicio",
    agente: "extractor",
    mensaje: "Modo demostración: extrayendo requerimientos técnicos",
  };
  await espera(1400);
  yield { tipo: "resultado", agente: "extractor", datos: REQUERIMIENTOS_DEMO };

  yield {
    tipo: "inicio",
    agente: "costos",
    mensaje: "Modo demostración: elaborando precios unitarios",
  };
  yield {
    tipo: "inicio",
    agente: "normativo",
    mensaje: "Modo demostración: revisando cumplimiento normativo",
  };
  await espera(1800);
  yield { tipo: "resultado", agente: "costos", datos: PARTIDAS_DEMO };
  await espera(500);
  yield { tipo: "resultado", agente: "normativo", datos: HALLAZGOS_DEMO };

  yield {
    tipo: "inicio",
    agente: "sintesis",
    mensaje: "Modo demostración: redactando resumen ejecutivo",
  };
  await espera(1200);
  yield { tipo: "resultado", agente: "sintesis", datos: RESUMEN_DEMO };

  const { pais, pista, deducido } = paisDelProyecto("");
  const economia = await construirEconomia({
    pais,
    pistaPais: pista,
    paisDeducido: deducido,
    mercado: `Mercado de la construcción de ${pais.nombre} (caso de demostración)`,
  });
  yield { tipo: "fin", modoDemo: true, economia };
}

function mensajeDeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Error desconocido en el agente.";
}
