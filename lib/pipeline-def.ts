/**
 * Descripción del pipeline, compartida por la portada (servidor) y el panel de
 * progreso (cliente). Vive aparte para que la portada no arrastre un módulo
 * marcado con "use client".
 */
import type { AgenteId } from "./types.ts";

export interface DefinicionAgente {
  id: AgenteId;
  nombre: string;
  rol: string;
  etapa: string;
}

export const AGENTES: DefinicionAgente[] = [
  {
    id: "extractor",
    nombre: "Extractor",
    rol: "Lee el documento y aísla los requerimientos con su cita textual",
    etapa: "Etapa 1",
  },
  {
    id: "costos",
    nombre: "Costos",
    rol: "Convierte requerimientos en catálogo de conceptos y precios unitarios",
    etapa: "Etapa 2 · paralelo",
  },
  {
    id: "normativo",
    nombre: "Normativo",
    rol: "Contrasta contra NOM, STPS y reglamentos aplicables",
    etapa: "Etapa 2 · paralelo",
  },
  {
    id: "sintesis",
    nombre: "Síntesis",
    rol: "Redacta el resumen ejecutivo y consolida el riesgo global",
    etapa: "Etapa 3",
  },
];
