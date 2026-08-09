"use client";

import { useEffect, useMemo, useState } from "react";
import type { Economia, Moneda } from "@/lib/moneda/tipos";
import { MONEDA_POR_DEFECTO } from "@/lib/moneda/tipos";
import { PAISES } from "@/lib/moneda/paises";
import {
  compararProveedores,
  type BaseNormalizacion,
} from "@/lib/moneda/comparacion";
import {
  borrarCotizacion,
  guardarCotizacion,
  leerCotizaciones,
  type CotizacionGuardada,
} from "@/lib/cotizaciones";
import { obtenerTipoCambioCliente } from "@/lib/moneda/cliente";
import { dineroExacto, fechaCorta, porcentajeConSigno, tasa } from "@/lib/formato";

/**
 * Cotizaciones reales de proveedor y su comparación normalizada.
 *
 * Separa deliberadamente dos cosas que la aplicación no debe confundir: las
 * ESTIMACIONES del agente de costos, que van en el presupuesto, y las
 * COTIZACIONES de proveedor, que son ofertas reales con fecha, vigencia y tipo
 * de cambio propios.
 */
// Misma entrada visual que el resto de formularios de la aplicación.
const CLASE_ENTRADA =
  "mt-1 w-full rounded-md border border-borde bg-superficie px-3 py-2 text-sm shadow-[var(--shadow-sutil)] placeholder:text-tinta-debil focus:border-acento focus:outline-none";

export function Cotizaciones({
  proyectoId,
  economia,
}: {
  proyectoId: string;
  economia: Economia | null;
}) {
  const moneda = economia?.moneda ?? MONEDA_POR_DEFECTO;
  const [lista, setLista] = useState<CotizacionGuardada[]>([]);
  const [base, setBase] = useState<BaseNormalizacion>("emision");
  const [tcComun, setTcComun] = useState(economia?.tipoCambio ?? null);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);

  // Se lee en un efecto y no en el estado inicial porque localStorage no existe
  // durante el render del servidor: inicializarlo ahí provocaría un desajuste de
  // hidratación. Mismo patrón que el historial del proyecto.
  useEffect(() => {
    setLista(leerCotizaciones(proyectoId));
  }, [proyectoId]);

  const comparacion = useMemo(() => {
    if (lista.length === 0) return null;
    try {
      return compararProveedores(
        lista,
        moneda,
        base,
        base === "comun" ? (tcComun ?? undefined) : undefined,
      );
    } catch {
      // Falta el TC común: se pide con el botón antes de comparar.
      return null;
    }
  }, [lista, moneda, base, tcComun]);

  async function registrar(datos: FormData) {
    setError(null);
    const valor = Number(datos.get("importe"));
    const monedaCot = String(datos.get("moneda")) as Moneda;
    const fecha = String(datos.get("fecha") || new Date().toISOString().slice(0, 10));

    if (!Number.isFinite(valor) || valor <= 0) {
      setError("El importe debe ser un número mayor que cero.");
      return;
    }

    try {
      // El TC se congela en el momento de registrar: es el de la cotización.
      const tc =
        monedaCot === moneda
          ? { origen: monedaCot, destino: moneda, tasa: 1, fecha: new Date(fecha).toISOString(),
              consultado: new Date().toISOString(), fuente: "Identidad (misma moneda)", url: null }
          : await obtenerTipoCambioCliente(monedaCot, moneda);

      const actualizada = guardarCotizacion(
        proyectoId,
        {
          concepto: String(datos.get("concepto") || "Sin concepto"),
          proveedor: String(datos.get("proveedor") || "Sin proveedor"),
          pais: String(datos.get("pais") || economia?.pais || "MX"),
          clavePartida: String(datos.get("clavePartida") || "") || null,
          importeOriginal: { valor, moneda: monedaCot },
          fecha: new Date(fecha).toISOString(),
          vigencia: datos.get("vigencia")
            ? new Date(String(datos.get("vigencia"))).toISOString()
            : null,
          notas: String(datos.get("notas") || "") || null,
        },
        tc,
        moneda,
      );
      setLista(actualizada.filter((c) => c.proyectoId === proyectoId));
      setAbierto(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo registrar la cotización.",
      );
    }
  }

  async function traerTcComun() {
    setError(null);
    try {
      setTcComun(await obtenerTipoCambioCliente(moneda, "USD"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo obtener el tipo de cambio.");
    }
  }

  return (
    <section className="tarjeta p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-tinta">Cotizaciones de proveedor</h3>
          <p className="mt-1 text-xs text-tinta-media">
            Ofertas reales, distintas de las estimaciones del presupuesto. Cada una
            conserva el tipo de cambio de su fecha de emisión.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="rounded-md border border-borde px-3 py-1.5 text-xs font-medium text-tinta-media transition-colors hover:border-acento/60 hover:text-tinta"
        >
          {abierto ? "Cancelar" : "Registrar cotización"}
        </button>
      </div>

      {abierto && (
        <form
          action={registrar}
          className="mt-4 grid gap-3 rounded-lg border border-borde bg-superficie-alta p-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Campo etiqueta="Proveedor" nombre="proveedor" requerido />
          <Campo etiqueta="Concepto" nombre="concepto" requerido />
          <Campo etiqueta="Clave de partida (opcional)" nombre="clavePartida" />
          <Campo etiqueta="Importe" nombre="importe" tipo="number" paso="0.01" requerido />
          <label className="text-xs">
            <span className="etiqueta-seccion">Moneda</span>
            <select name="moneda" defaultValue={moneda} className={CLASE_ENTRADA}>
              {[...new Set([moneda, "USD", ...PAISES.map((p) => p.moneda)])].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="etiqueta-seccion">País del proveedor</span>
            <select name="pais" defaultValue={economia?.pais ?? "MX"} className={CLASE_ENTRADA}>
              {PAISES.map((p) => (
                <option key={p.codigo} value={p.codigo}>{p.nombre}</option>
              ))}
            </select>
          </label>
          <Campo etiqueta="Fecha de cotización" nombre="fecha" tipo="date"
                 valorPorDefecto={new Date().toISOString().slice(0, 10)} />
          <Campo etiqueta="Vigencia (opcional)" nombre="vigencia" tipo="date" />
          <Campo etiqueta="Notas (opcional)" nombre="notas" />

          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="rounded-md bg-acento px-3.5 py-2 text-sm font-medium text-sobre-acento transition-opacity hover:opacity-90"
            >
              Guardar cotización
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-md border border-critico/25 bg-critico-tenue px-3 py-2 text-xs">
          {error}
        </p>
      )}

      {comparacion && (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="etiqueta-seccion">Normalizar a {moneda} usando</span>
            <BotonBase activo={base === "emision"} onClick={() => setBase("emision")}>
              TC de cada cotización
            </BotonBase>
            <BotonBase
              activo={base === "comun"}
              onClick={async () => {
                if (!tcComun) await traerTcComun();
                setBase("comun");
              }}
            >
              TC común de hoy
            </BotonBase>
            {base === "comun" && tcComun && (
              <span className="text-xs text-tinta-debil">
                1 {tcComun.origen} = {tasa(tcComun.tasa)} {tcComun.destino} ·{" "}
                {fechaCorta(tcComun.fecha)}
              </span>
            )}
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-borde text-left">
                  <Th>Proveedor</Th>
                  <Th>Concepto</Th>
                  <Th right>Importe original</Th>
                  <Th right>Normalizado ({moneda})</Th>
                  <Th>TC aplicado</Th>
                  <Th>Fecha · vigencia</Th>
                  <Th right>Δ</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody>
                {comparacion.propuestas.map((p) => (
                  <tr
                    key={p.cotizacion.id}
                    className={`border-b border-borde-suave ${p.masBarata ? "bg-acento-tenue/40" : ""}`}
                  >
                    <td className="px-2 py-2.5 font-medium">
                      {p.cotizacion.proveedor}
                      {p.masBarata && (
                        <span className="ml-2 rounded bg-acento/15 px-1.5 py-0.5 text-[0.625rem] text-acento">
                          más barata
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-tinta-media">{p.cotizacion.concepto}</td>
                    <td className="cifra px-2 py-2.5 text-right">{dineroExacto(p.original)}</td>
                    <td className="cifra px-2 py-2.5 text-right font-semibold">
                      {p.incomparable ? "—" : dineroExacto(p.normalizado)}
                    </td>
                    <td className="px-2 py-2.5 text-xs text-tinta-debil">
                      {p.tipoCambioAplicado.origen === p.tipoCambioAplicado.destino
                        ? "misma moneda"
                        : `${tasa(p.tipoCambioAplicado.tasa)} · ${p.tipoCambioAplicado.fuente}`}
                    </td>
                    <td className="px-2 py-2.5 text-xs text-tinta-debil">
                      {fechaCorta(p.cotizacion.fecha)}
                      {p.cotizacion.vigencia && (
                        <span className={p.vencida ? "block text-critico" : "block"}>
                          {p.vencida ? "VENCIDA" : "vigente"} · {fechaCorta(p.cotizacion.vigencia)}
                        </span>
                      )}
                    </td>
                    <td className="cifra px-2 py-2.5 text-right text-xs">
                      {p.incomparable ? "" : p.sobrecoste > 0 ? porcentajeConSigno(p.sobrecoste) : "—"}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          borrarCotizacion(p.cotizacion.id);
                          setLista(leerCotizaciones(proyectoId));
                        }}
                        className="text-xs text-tinta-debil hover:text-tinta"
                        aria-label={`Borrar cotización de ${p.cotizacion.proveedor}`}
                      >
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {comparacion.propuestas.some((p) => p.incomparable) && (
            <p className="mt-3 text-xs text-tinta-debil">
              Las filas sin importe normalizado no se pudieron convertir y quedan
              fuera de la comparación. Se muestran igualmente para que no
              desaparezcan sin explicación.
            </p>
          )}
        </>
      )}

      {lista.length === 0 && (
        <p className="mt-4 text-xs text-tinta-debil">
          Todavía no hay cotizaciones registradas. El presupuesto de arriba son
          estimaciones de mercado del agente de costos, no ofertas de proveedor.
        </p>
      )}
    </section>
  );
}

function Campo({
  etiqueta, nombre, tipo = "text", requerido = false, paso, valorPorDefecto,
}: {
  etiqueta: string; nombre: string; tipo?: string; requerido?: boolean;
  paso?: string; valorPorDefecto?: string;
}) {
  return (
    <label className="text-xs">
      <span className="etiqueta-seccion">{etiqueta}</span>
      <input
        name={nombre}
        type={tipo}
        step={paso}
        required={requerido}
        defaultValue={valorPorDefecto}
        className={CLASE_ENTRADA}
      />
    </label>
  );
}

function BotonBase({
  activo, onClick, children,
}: {
  activo: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        activo ? "bg-acento/15 text-acento" : "text-tinta-debil hover:text-tinta"
      }`}
    >
      {children}
    </button>
  );
}

function Th({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-2 py-2 etiqueta-seccion ${right ? "text-right" : ""}`}>{children}</th>
  );
}
