/** Tipos del flujo de proyecto nuevo. */
import type { Diagrama } from "./diagramas/tipos";
import type { DisciplinaProyecto, Envergadura } from "./disciplinas";
import type { Hallazgo, Partida, Requerimiento, ResumenEjecutivo } from "./types";

export type AgenteProyecto =
  | "programa"
  | "extractor"
  | "costos"
  | "normativo"
  | "proyectista"
  | "sintesis";

export type EventoProyecto =
  | { tipo: "inicio"; agente: AgenteProyecto; mensaje: string }
  | { tipo: "alcance"; alcance: string; premisas: string[] }
  | { tipo: "resultado"; agente: "extractor"; datos: Requerimiento[] }
  | { tipo: "resultado"; agente: "costos"; datos: Partida[] }
  | { tipo: "resultado"; agente: "normativo"; datos: Hallazgo[] }
  | { tipo: "resultado"; agente: "proyectista"; datos: number }
  | { tipo: "resultado"; agente: "sintesis"; datos: ResumenEjecutivo }
  | { tipo: "diagrama"; diagrama: Diagrama }
  | { tipo: "error"; agente: AgenteProyecto; mensaje: string }
  | { tipo: "fin"; modoDemo: boolean };

/** Proyecto completo, tal como se guarda en el historial del navegador. */
export interface Proyecto {
  id: string;
  nombre: string;
  descripcion: string;
  disciplina: DisciplinaProyecto;
  envergadura: Envergadura;
  ubicacion: string;
  creadoEn: string;
  alcance: string;
  premisas: string[];
  requerimientos: Requerimiento[];
  partidas: Partida[];
  hallazgos: Hallazgo[];
  diagramas: Diagrama[];
  resumen: ResumenEjecutivo | null;
  modoDemo: boolean;
}
