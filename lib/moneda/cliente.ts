/**
 * Acceso al tipo de cambio desde el navegador.
 *
 * Pasa por la ruta del servidor en vez de llamar a la fuente directamente: así
 * la caché se comparte entre sesiones y no dependemos de que la fuente publique
 * cabeceras CORS.
 */
"use client";

import type { Moneda, TipoCambio } from "./tipos.ts";

export async function obtenerTipoCambioCliente(
  origen: Moneda,
  destino: Moneda,
  forzar = false,
): Promise<TipoCambio> {
  const respuesta = await fetch("/api/tipo-cambio", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ origen, destino, forzar }),
  });

  const datos = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(datos?.error ?? "No se pudo consultar el tipo de cambio.");
  }
  return datos.tipoCambio as TipoCambio;
}
