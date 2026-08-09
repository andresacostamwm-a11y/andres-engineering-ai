/** Utilidades de formato compartidas por la interfaz y los generadores de documentos. */
import type { Importe, Moneda } from "./moneda/tipos.ts";
import { paisPorMoneda } from "./moneda/paises.ts";

/**
 * Monedas sin decimales de uso corriente: escribir "$ 1,234.00 CLP" es un error
 * de forma, porque el peso chileno no se fracciona en la práctica.
 */
const SIN_DECIMALES: ReadonlySet<Moneda> = new Set<Moneda>(["CLP", "COP", "PYG"]);

const cacheFormato = new Map<string, Intl.NumberFormat>();

function formateador(
  moneda: Moneda,
  decimales: number,
): Intl.NumberFormat {
  const locale = paisPorMoneda(moneda)?.locale ?? "es-MX";
  const clave = `${locale}|${moneda}|${decimales}`;
  const guardado = cacheFormato.get(clave);
  if (guardado) return guardado;

  const nuevo = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
  cacheFormato.set(clave, nuevo);
  return nuevo;
}

/**
 * Escribe un importe con su moneda, siempre explícita.
 *
 * El código ISO va detrás a propósito: "$1,200" es ambiguo entre pesos y dólares,
 * y esa ambigüedad es justo la que produce errores financieros.
 */
export function dinero(importe: Importe, decimales?: number): string {
  const d = decimales ?? (SIN_DECIMALES.has(importe.moneda) ? 0 : 0);
  return `${formateador(importe.moneda, d).format(importe.valor)} ${importe.moneda}`;
}

/** Igual que `dinero`, con centavos. Para precios unitarios y matrices. */
export function dineroExacto(importe: Importe): string {
  const d = SIN_DECIMALES.has(importe.moneda) ? 0 : 2;
  return `${formateador(importe.moneda, d).format(importe.valor)} ${importe.moneda}`;
}

/** Par «local + USD», que es como debe leerse todo importe del sistema. */
export function dineroDoble(local: Importe, usd: Importe): string {
  if (local.moneda === "USD") return dinero(local);
  return `${dinero(local)} · ${dinero(usd)}`;
}

const FORMATO_NUMERO = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 2,
});

export const numero = (n: number): string => FORMATO_NUMERO.format(n);

/** Porcentaje con signo, para la variación entre tipos de cambio. */
export function porcentajeConSigno(n: number): string {
  const signo = n > 0 ? "+" : "";
  return `${signo}${FORMATO_NUMERO.format(n)} %`;
}

/** Tasa de cambio con la precisión que su magnitud pide. */
export function tasa(n: number): string {
  const decimales = n >= 100 ? 2 : n >= 1 ? 4 : 6;
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(n);
}

export function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
