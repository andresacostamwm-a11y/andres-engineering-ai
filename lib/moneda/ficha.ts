/**
 * Ficha económica en texto plano, compartida por todos los formatos de salida.
 *
 * Existe para que el PDF, el Word, el CSV y el HTML digan exactamente lo mismo:
 * un presupuesto exportado tiene que poder auditarse sin abrir la aplicación.
 */
import type { Economia, Importe } from "./tipos.ts";
import { convertir } from "./conversion.ts";

/** Filas etiqueta/valor de la ficha, en el orden en que deben leerse. */
export function filasFichaEconomica(economia: Economia | null): [string, string][] {
  if (!economia) {
    return [["Condiciones económicas", "No registradas (presupuesto anterior a esta versión)"]];
  }

  const tc = economia.tipoCambio;
  const hayCambio = tc.origen !== tc.destino && !tc.fuente.startsWith("No disponible");

  const filas: [string, string][] = [
    ["País del proyecto", `${economia.nombrePais} (${economia.pais})`],
    ["Moneda del proyecto", economia.moneda],
    ["Fecha base de precios", new Date(economia.fechaPrecios).toLocaleDateString("es-MX", {
      day: "2-digit", month: "long", year: "numeric",
    })],
    ["Mercado de referencia", economia.mercado],
    ["Origen de las cifras", "Estimación de mercado (no son cotizaciones de proveedor)"],
  ];

  if (hayCambio) {
    filas.push(
      ["Tipo de cambio de emisión", `1 ${tc.origen} = ${tc.tasa} ${tc.destino}`],
      ["Fecha del tipo de cambio", new Date(tc.fecha).toLocaleString("es-MX")],
      ["Fuente del tipo de cambio", tc.url ? `${tc.fuente} (${tc.url})` : tc.fuente],
    );
  } else if (tc.origen === tc.destino) {
    filas.push(["Tipo de cambio", "No aplica: el proyecto se cotiza en dólares"]);
  } else {
    filas.push(["Tipo de cambio", "No disponible en el momento de emitir"]);
  }

  return filas;
}

/** Equivalente en USD de un importe, o null si el proyecto ya está en dólares. */
export function equivalenteUsd(
  importe: Importe,
  economia: Economia | null,
): Importe | null {
  if (!economia) return null;
  const tc = economia.tipoCambio;
  if (tc.origen === tc.destino || tc.fuente.startsWith("No disponible")) return null;
  if (importe.moneda !== tc.origen) return null;
  return convertir(importe, tc);
}
