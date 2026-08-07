/** Utilidades de formato compartidas por la interfaz y el generador de PDF. */

const FORMATO_MXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const FORMATO_MXN_CENTAVOS = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const FORMATO_NUMERO = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 2,
});

export const pesos = (n: number): string => FORMATO_MXN.format(n);
export const pesosExactos = (n: number): string => FORMATO_MXN_CENTAVOS.format(n);
export const numero = (n: number): string => FORMATO_NUMERO.format(n);

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
