/**
 * Consulta del tipo de cambio vigente.
 *
 * Dos fuentes públicas y sin credenciales, en orden: si la primera no responde
 * se usa la segunda, y si ninguna responde se propaga el error para que la
 * interfaz lo diga en vez de inventarse una tasa. Una cifra convertida con una
 * tasa inventada es peor que no convertirla.
 */
import type { Moneda, TipoCambio } from "./tipos.ts";
import { tipoCambioIdentidad } from "./conversion.ts";

interface Fuente {
  nombre: string;
  url: (origen: Moneda) => string;
  /** Extrae tasa y fecha de la respuesta cruda de esa fuente. */
  leer: (
    datos: unknown,
    destino: Moneda,
  ) => { tasa: number; fecha: string } | null;
  referencia: string;
}

const FUENTES: Fuente[] = [
  {
    nombre: "ExchangeRate-API (open access)",
    referencia: "https://www.exchangerate-api.com",
    url: (origen) => `https://open.er-api.com/v6/latest/${origen}`,
    leer: (datos, destino) => {
      const d = datos as {
        result?: string;
        rates?: Record<string, number>;
        time_last_update_unix?: number;
      };
      if (d?.result !== "success") return null;
      const tasa = d.rates?.[destino];
      if (typeof tasa !== "number" || !Number.isFinite(tasa)) return null;
      const fecha = d.time_last_update_unix
        ? new Date(d.time_last_update_unix * 1000).toISOString()
        : new Date().toISOString();
      return { tasa, fecha };
    },
  },
  {
    nombre: "Frankfurter (Banco Central Europeo)",
    referencia: "https://frankfurter.dev",
    url: (origen) => `https://api.frankfurter.dev/v1/latest?base=${origen}`,
    leer: (datos, destino) => {
      const d = datos as { rates?: Record<string, number>; date?: string };
      const tasa = d?.rates?.[destino];
      if (typeof tasa !== "number" || !Number.isFinite(tasa)) return null;
      const fecha = d.date
        ? new Date(`${d.date}T00:00:00Z`).toISOString()
        : new Date().toISOString();
      return { tasa, fecha };
    },
  },
];

const VIGENCIA_CACHE_MS = 30 * 60 * 1000; // media hora
const cache = new Map<string, { tc: TipoCambio; expira: number }>();

/**
 * Devuelve el tipo de cambio vigente entre dos monedas.
 *
 * @param forzar Ignora la caché. Es lo que hace el botón «Actualizar tipo de cambio».
 */
export async function obtenerTipoCambio(
  origen: Moneda,
  destino: Moneda,
  forzar = false,
): Promise<TipoCambio> {
  if (origen === destino) {
    return tipoCambioIdentidad(origen, new Date().toISOString());
  }

  const clave = `${origen}/${destino}`;
  const guardado = cache.get(clave);
  if (!forzar && guardado && guardado.expira > Date.now()) return guardado.tc;

  const fallos: string[] = [];

  for (const fuente of FUENTES) {
    try {
      const respuesta = await fetch(fuente.url(origen), {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      if (!respuesta.ok) {
        fallos.push(`${fuente.nombre}: HTTP ${respuesta.status}`);
        continue;
      }

      const leido = fuente.leer(await respuesta.json(), destino);
      if (!leido) {
        fallos.push(`${fuente.nombre}: no publica ${destino}`);
        continue;
      }

      const tc: TipoCambio = {
        origen,
        destino,
        tasa: leido.tasa,
        fecha: leido.fecha,
        consultado: new Date().toISOString(),
        fuente: fuente.nombre,
        url: fuente.referencia,
      };
      cache.set(clave, { tc, expira: Date.now() + VIGENCIA_CACHE_MS });
      return tc;
    } catch (error) {
      fallos.push(
        `${fuente.nombre}: ${error instanceof Error ? error.message : "error de red"}`,
      );
    }
  }

  throw new ErrorTipoCambio(
    `No se pudo obtener el tipo de cambio ${clave}. ${fallos.join(" · ")}`,
  );
}

export class ErrorTipoCambio extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorTipoCambio";
  }
}

/**
 * Tipo de cambio del proyecto: de su moneda local a USD.
 *
 * Si la moneda del proyecto ya es el dólar, devuelve la identidad en lugar de
 * salir a la red por una tasa que vale 1.
 */
export function tipoCambioAUsd(moneda: Moneda, forzar = false): Promise<TipoCambio> {
  return obtenerTipoCambio(moneda, "USD", forzar);
}
