/**
 * Historial de análisis en el navegador.
 *
 * Decisión de arquitectura: el servidor es *stateless* y no guarda ni el
 * documento ni sus resultados. Un pliego de obra suele contener información
 * comercialmente sensible, así que permanece en el equipo de quien lo sube.
 * El precio de esta decisión es que el historial no se sincroniza entre
 * dispositivos, y está asumido a propósito.
 */
"use client";

import type { Analisis } from "./types.ts";
import type { Proyecto } from "./tipos-proyecto.ts";

const CLAVE = "aec-copilot:historial";
const MAXIMO = 20;

function disponible(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function leerHistorial(): Analisis[] {
  if (!disponible()) return [];
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return [];
    const datos = JSON.parse(crudo) as unknown;
    return Array.isArray(datos) ? (datos as Analisis[]) : [];
  } catch {
    return [];
  }
}

export function guardarAnalisis(analisis: Analisis): Analisis[] {
  if (!disponible()) return [];
  const historial = [
    analisis,
    ...leerHistorial().filter((a) => a.id !== analisis.id),
  ].slice(0, MAXIMO);

  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(historial));
  } catch {
    // Cuota agotada: se conserva solo el análisis más reciente.
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify([analisis]));
      return [analisis];
    } catch {
      return historial;
    }
  }
  return historial;
}

export function eliminarAnalisis(id: string): Analisis[] {
  if (!disponible()) return [];
  const historial = leerHistorial().filter((a) => a.id !== id);
  window.localStorage.setItem(CLAVE, JSON.stringify(historial));
  return historial;
}

export function limpiarHistorial(): void {
  if (!disponible()) return;
  window.localStorage.removeItem(CLAVE);
}

/* --------------------------------------------- Historial de proyectos -- */

const CLAVE_PROYECTOS = "aec-copilot:proyectos";
const MAXIMO_PROYECTOS = 20;

export function leerProyectos(): Proyecto[] {
  if (!disponible()) return [];
  try {
    const crudo = window.localStorage.getItem(CLAVE_PROYECTOS);
    if (!crudo) return [];
    const datos = JSON.parse(crudo) as unknown;
    return Array.isArray(datos) ? (datos as Proyecto[]) : [];
  } catch {
    return [];
  }
}

export function guardarProyecto(proyecto: Proyecto): Proyecto[] {
  if (!disponible()) return [];
  const historial = [
    proyecto,
    ...leerProyectos().filter((p) => p.id !== proyecto.id),
  ].slice(0, MAXIMO_PROYECTOS);

  try {
    window.localStorage.setItem(CLAVE_PROYECTOS, JSON.stringify(historial));
  } catch {
    // Cuota agotada: se conserva solo el proyecto más reciente.
    try {
      window.localStorage.setItem(CLAVE_PROYECTOS, JSON.stringify([proyecto]));
      return [proyecto];
    } catch {
      return historial;
    }
  }
  return historial;
}

export function eliminarProyecto(id: string): Proyecto[] {
  if (!disponible()) return [];
  const historial = leerProyectos().filter((p) => p.id !== id);
  window.localStorage.setItem(CLAVE_PROYECTOS, JSON.stringify(historial));
  return historial;
}
