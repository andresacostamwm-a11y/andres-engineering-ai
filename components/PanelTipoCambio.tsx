"use client";

import { useState } from "react";
import type { Economia, TipoCambio } from "@/lib/moneda/tipos";
import { variacion } from "@/lib/moneda/conversion";
import { fechaCorta, fechaLarga, porcentajeConSigno, tasa } from "@/lib/formato";

/**
 * Ficha económica del presupuesto: con qué país, moneda, tipo de cambio y fecha
 * de precios se emitió, y a cuánto equivaldría hoy.
 *
 * El tipo de cambio de emisión no se toca nunca. «Actualizar» trae el vigente y
 * lo muestra al lado con su variación, de modo que se pueda leer a la vez lo que
 * costaba y lo que costaría, sin perder ninguno de los dos.
 */
export function PanelTipoCambio({ economia }: { economia: Economia }) {
  const [actual, setActual] = useState<TipoCambio | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tc = economia.tipoCambio;
  const hayConversion = tc.origen !== tc.destino;
  const disponible = hayConversion && !tc.fuente.startsWith("No disponible");

  async function actualizar() {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await fetch("/api/tipo-cambio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          origen: tc.origen,
          destino: tc.destino === tc.origen ? "USD" : tc.destino,
          forzar: true,
        }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error ?? "No se pudo actualizar.");
      setActual(datos.tipoCambio as TipoCambio);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar.");
    } finally {
      setCargando(false);
    }
  }

  const delta = actual && disponible ? variacion(tc, actual) : null;

  return (
    <section className="tarjeta p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-tinta">Condiciones económicas</h3>
          <p className="mt-1 text-xs text-tinta-media">
            {economia.nombrePais} · moneda del proyecto{" "}
            <strong className="font-semibold text-tinta">{economia.moneda}</strong>
            {!economia.paisDeducido && (
              <span className="text-tinta-debil">
                {" "}
                · país asumido por defecto, no declarado en la ubicación
              </span>
            )}
            {economia.paisDeducido && economia.pistaPais && (
              <span className="text-tinta-debil"> · deducido de «{economia.pistaPais}»</span>
            )}
          </p>
        </div>

        {disponible && (
          <button
            type="button"
            onClick={actualizar}
            disabled={cargando}
            className="rounded-md border border-borde px-3 py-1.5 text-xs font-medium text-tinta-media transition-colors hover:border-acento/60 hover:text-tinta disabled:opacity-50"
          >
            {cargando ? "Consultando…" : "Actualizar tipo de cambio"}
          </button>
        )}
      </div>

      <dl className="mt-4 grid gap-px overflow-hidden rounded-lg border border-borde bg-borde-suave sm:grid-cols-2 lg:grid-cols-4">
        <Dato etiqueta="Fecha base de precios" valor={fechaLarga(economia.fechaPrecios)} />
        <Dato etiqueta="Mercado de referencia" valor={economia.mercado} />

        {disponible ? (
          <>
            <Dato
              etiqueta="TC de emisión"
              valor={`1 ${tc.origen} = ${tasa(tc.tasa)} ${tc.destino}`}
              apunte={`${fechaCorta(tc.fecha)} · ${tc.fuente}`}
            />
            {actual ? (
              <Dato
                etiqueta="TC actual"
                valor={`1 ${actual.origen} = ${tasa(actual.tasa)} ${actual.destino}`}
                apunte={
                  delta === null
                    ? fechaCorta(actual.fecha)
                    : `${fechaCorta(actual.fecha)} · variación ${porcentajeConSigno(delta)}`
                }
                destacado={delta !== null && Math.abs(delta) >= 2}
              />
            ) : (
              <Dato
                etiqueta="TC actual"
                valor="Sin consultar"
                apunte="Pulsa «Actualizar tipo de cambio» para traer el vigente"
              />
            )}
          </>
        ) : (
          <Dato
            etiqueta="Tipo de cambio"
            valor={
              tc.origen === tc.destino
                ? "No aplica: el proyecto ya se cotiza en dólares"
                : "No disponible al emitir"
            }
            apunte={tc.origen === tc.destino ? undefined : tc.fuente}
          />
        )}
      </dl>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-md border border-critico/25 bg-critico-tenue px-3 py-2 text-xs"
        >
          {error}
        </p>
      )}

      <p className="mt-3 text-xs text-tinta-debil">
        El tipo de cambio de emisión queda congelado con el presupuesto: actualizar
        solo añade el equivalente de hoy, nunca reescribe las cifras con las que se
        cotizó.
      </p>
    </section>
  );
}

function Dato({
  etiqueta,
  valor,
  apunte,
  destacado = false,
}: {
  etiqueta: string;
  valor: string;
  apunte?: string;
  destacado?: boolean;
}) {
  return (
    <div className="bg-superficie px-4 py-3">
      <dt className="etiqueta-seccion">{etiqueta}</dt>
      <dd
        className={`mt-1 text-sm font-medium ${destacado ? "text-acento" : "text-tinta"}`}
      >
        {valor}
      </dd>
      {apunte && <p className="mt-0.5 text-xs text-tinta-debil">{apunte}</p>}
    </div>
  );
}
