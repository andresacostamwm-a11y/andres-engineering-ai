/**
 * Cotizaciones reales de proveedor, guardadas en el navegador.
 *
 * Misma decisión que el historial: el servidor no almacena nada. Una cotización
 * lleva precios y condiciones comerciales de un tercero, así que se queda en el
 * equipo de quien la registra.
 *
 * Lo que sí se garantiza es que **nunca se pierde el tipo de cambio con el que
 * se emitió**: se guarda dentro de la cotización y no se reescribe al refrescar
 * el mercado.
 */
"use client";

import type { Cotizacion, Importe, Moneda, TipoCambio } from "./moneda/tipos.ts";
import { aMoneda } from "./moneda/conversion.ts";

const CLAVE = "aec-copilot:cotizaciones";
const MAXIMO = 200;

function disponible(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

interface Registro extends Cotizacion {
  /** Proyecto o análisis al que pertenece. */
  proyectoId: string;
}

export function leerCotizaciones(proyectoId?: string): Registro[] {
  if (!disponible()) return [];
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return [];
    const datos = JSON.parse(crudo) as unknown;
    if (!Array.isArray(datos)) return [];
    const todas = datos as Registro[];
    return proyectoId ? todas.filter((c) => c.proyectoId === proyectoId) : todas;
  } catch {
    return [];
  }
}

function escribir(registros: Registro[]): Registro[] {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(registros.slice(0, MAXIMO)));
  } catch {
    // Cuota agotada: se prefiere no perder las más recientes.
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(registros.slice(0, 20)));
    } catch {
      /* sin almacenamiento: la cotización vive solo en memoria */
    }
  }
  return registros;
}

/**
 * Registra una cotización congelando su tipo de cambio.
 *
 * El importe convertido se calcula UNA vez, aquí, con el tipo de cambio del día
 * de emisión. A partir de ese momento es un dato histórico: ninguna consulta
 * posterior lo modifica.
 */
export function guardarCotizacion(
  proyectoId: string,
  datos: {
    concepto: string;
    proveedor: string;
    pais: string;
    clavePartida: string | null;
    importeOriginal: Importe;
    fecha: string;
    vigencia: string | null;
    notas: string | null;
  },
  /** TC vigente el día de emisión, hacia la moneda del proyecto. */
  tipoCambio: TipoCambio,
  monedaProyecto: Moneda,
): Registro[] {
  const convertido = aMoneda(datos.importeOriginal, monedaProyecto, tipoCambio);

  const cotizacion: Registro = {
    id: `${Date.now()}-${Math.round(performance.now())}`,
    proyectoId,
    clavePartida: datos.clavePartida,
    concepto: datos.concepto,
    proveedor: datos.proveedor,
    pais: datos.pais,
    importeOriginal: datos.importeOriginal,
    fecha: datos.fecha,
    vigencia: datos.vigencia,
    tipoCambio: convertido.tipoCambio,
    importeConvertido: { valor: convertido.valor, moneda: monedaProyecto },
    notas: datos.notas,
  };

  if (!disponible()) return [cotizacion];
  return escribir([cotizacion, ...leerCotizaciones()]);
}

export function borrarCotizacion(id: string): Registro[] {
  if (!disponible()) return [];
  return escribir(leerCotizaciones().filter((c) => c.id !== id));
}

export type { Registro as CotizacionGuardada };
