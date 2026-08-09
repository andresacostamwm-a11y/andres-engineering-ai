/** Tipos del flujo de proyecto nuevo. */
import type { Diagrama } from "./diagramas/tipos.ts";
import type { Economia } from "./moneda/tipos.ts";
import type { DisciplinaProyecto, Envergadura } from "./disciplinas.ts";
import type { Hallazgo, Partida, Requerimiento, ResumenEjecutivo } from "./types.ts";

export type AgenteProyecto =
  | "programa"
  | "extractor"
  | "costos"
  | "normativo"
  | "proyectista"
  | "memoria"
  | "sintesis";

/** Un renglón de cálculo dentro de la memoria: concepto, método y resultado. */
export interface CalculoMemoria {
  concepto: string;
  /** Fórmula o método aplicado, en notación legible (ej. "I = P / (√3·V·fp)"). */
  metodo: string;
  /** Datos de entrada con unidades. */
  datos: string;
  /** Resultado con unidad y, si aplica, la selección comercial derivada. */
  resultado: string;
}

/** Memoria de un sistema o instalación del proyecto. */
export interface SistemaMemoria {
  nombre: string;
  /** Memoria descriptiva del sistema: qué es, cómo funciona, de qué se compone. */
  descripcion: string;
  /** Criterios de diseño adoptados, con su base normativa o física. */
  criterios: string[];
  /** Cálculos justificativos del dimensionamiento. */
  calculos: CalculoMemoria[];
  /** Especificaciones de materiales y equipos resultantes. */
  especificaciones: string[];
}

/** Memoria técnica completa del proyecto: descriptiva y de cálculo. */
export interface MemoriaProyecto {
  /** Objeto de la memoria: qué proyecto documenta y con qué fin. */
  objeto: string;
  /** Antecedentes y condiciones de partida. */
  antecedentes: string;
  /** Normativa aplicable citada. */
  normativa: string[];
  /** Un bloque por instalación o sistema del proyecto. */
  sistemas: SistemaMemoria[];
  conclusiones: string;
}

export type EventoProyecto =
  | { tipo: "inicio"; agente: AgenteProyecto; mensaje: string }
  | { tipo: "alcance"; alcance: string; premisas: string[] }
  | { tipo: "resultado"; agente: "extractor"; datos: Requerimiento[] }
  | { tipo: "resultado"; agente: "costos"; datos: Partida[] }
  | { tipo: "resultado"; agente: "normativo"; datos: Hallazgo[] }
  | { tipo: "resultado"; agente: "proyectista"; datos: number }
  | { tipo: "resultado"; agente: "memoria"; datos: MemoriaProyecto }
  | { tipo: "resultado"; agente: "sintesis"; datos: ResumenEjecutivo }
  | { tipo: "diagrama"; diagrama: Diagrama }
  | { tipo: "error"; agente: AgenteProyecto; mensaje: string }
  | { tipo: "fin"; modoDemo: boolean; economia: Economia | null };

/** Proyecto completo, tal como se guarda en el historial del navegador. */
export interface Proyecto {
  id: string;
  nombre: string;
  descripcion: string;
  /** Disciplina principal. Se conserva por compatibilidad con el historial. */
  disciplina: DisciplinaProyecto;
  /** Todas las disciplinas elegidas. La primera es la principal. */
  disciplinas?: DisciplinaProyecto[];
  envergadura: Envergadura;
  ubicacion: string;
  creadoEn: string;
  alcance: string;
  premisas: string[];
  requerimientos: Requerimiento[];
  partidas: Partida[];
  hallazgos: Hallazgo[];
  diagramas: Diagrama[];
  memoria: MemoriaProyecto | null;
  resumen: ResumenEjecutivo | null;
  /** Condiciones económicas con las que se costeó el proyecto. */
  economia: Economia | null;
  modoDemo: boolean;
}
