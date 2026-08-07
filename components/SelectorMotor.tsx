"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Selector de motor IA con candado.
 *
 * Muestra los modelos que las API keys del despliegue pueden invocar de verdad
 * (los sirve /api/modelos consultando a cada proveedor). Cambiar de motor
 * cuesta dinero, así que exige la contraseña de motor: el servidor la valida y
 * emite una cookie httpOnly firmada; sin ella la aplicación permanece en el
 * motor por defecto (Gemini 2.5 Flash).
 */

interface Catalogo {
  proveedor: string;
  nombre: string;
  modelos: string[];
}

interface Eleccion {
  proveedor: string;
  modelo?: string;
}

export function SelectorMotor() {
  const [abierto, setAbierto] = useState(false);
  const [catalogos, setCatalogos] = useState<Catalogo[] | null>(null);
  const [eleccion, setEleccion] = useState<Eleccion | null>(null);
  const [errorCatalogo, setErrorCatalogo] = useState(false);

  const [pendiente, setPendiente] = useState<Eleccion | null>(null);
  const [clave, setClave] = useState("");
  const [errorClave, setErrorClave] = useState<string | null>(null);
  const [autorizando, setAutorizando] = useState(false);

  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto || catalogos) return;
    fetch("/api/modelos")
      .then((r) => r.json())
      .then((d) => {
        setCatalogos(d.catalogos ?? []);
        if (d.eleccion) setEleccion(d.eleccion);
      })
      .catch(() => setErrorCatalogo(true));
  }, [abierto, catalogos]);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => {
      if (!contenedorRef.current?.contains(e.target as Node)) {
        setAbierto(false);
        setPendiente(null);
        setClave("");
        setErrorClave(null);
      }
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [abierto]);

  async function autorizar() {
    if (!pendiente || autorizando) return;
    setAutorizando(true);
    setErrorClave(null);
    try {
      const respuesta = await fetch("/api/modelos/elegir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clave,
          proveedor: pendiente.proveedor,
          modelo: pendiente.modelo,
        }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        setErrorClave(datos.error ?? "No se pudo cambiar el motor.");
      } else {
        setEleccion(pendiente);
        setPendiente(null);
        setClave("");
        setAbierto(false);
      }
    } catch {
      setErrorClave("No se pudo contactar al servidor.");
    } finally {
      setAutorizando(false);
    }
  }

  const etiqueta = eleccion?.modelo ? abreviar(eleccion.modelo) : "Motor IA";

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="listbox"
        title="Elegir el modelo de IA con el que se proyecta (requiere contraseña)"
        className="flex items-center gap-1.5 rounded-md border border-borde px-2.5 py-1.5 text-xs font-medium text-tinta-media transition-colors hover:border-acento/60 hover:text-tinta"
      >
        <svg viewBox="0 0 16 16" className="size-3.5 text-acento" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <rect x="3" y="3" width="10" height="10" rx="2" />
          <path d="M6 1.5v2M10 1.5v2M6 12.5v2M10 12.5v2M1.5 6h2M1.5 10h2M12.5 6h2M12.5 10h2" strokeLinecap="round" />
        </svg>
        <span className="max-w-36 truncate">{etiqueta}</span>
        <svg viewBox="0 0 16 16" className={`size-3 transition-transform ${abierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {abierto && (
        <div className="absolute right-0 z-40 mt-2 max-h-[28rem] w-80 overflow-y-auto rounded-lg border border-borde bg-superficie py-1 shadow-[var(--shadow-elevada)]">
          <p className="flex items-center gap-1.5 px-4 pb-1.5 pt-2.5 text-[0.6875rem] text-tinta-debil">
            <svg viewBox="0 0 16 16" className="size-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
              <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
            </svg>
            Cambiar de motor requiere contraseña. Por defecto: Gemini 2.5 Flash.
          </p>

          {!catalogos && !errorCatalogo && (
            <p className="px-4 py-3 text-xs text-tinta-debil">Consultando los modelos disponibles…</p>
          )}
          {errorCatalogo && (
            <p className="px-4 py-3 text-xs text-critico">No se pudo consultar el catálogo.</p>
          )}
          {catalogos?.length === 0 && (
            <p className="px-4 py-3 text-xs leading-relaxed text-tinta-debil">
              Este despliegue no tiene API keys configuradas: la aplicación corre
              en modo demostración.
            </p>
          )}

          {catalogos?.map((c) => (
            <div key={c.proveedor} role="listbox" aria-label={`Modelos de ${c.nombre}`}>
              <p className="etiqueta-seccion px-4 pb-1 pt-2.5">{c.nombre}</p>
              {c.modelos.map((m) => {
                const activo =
                  eleccion?.proveedor === c.proveedor && eleccion?.modelo === m;
                const seleccionado =
                  pendiente?.proveedor === c.proveedor && pendiente?.modelo === m;
                return (
                  <div key={m}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={activo}
                      onClick={() => {
                        setPendiente(activo ? null : { proveedor: c.proveedor, modelo: m });
                        setErrorClave(null);
                      }}
                      className={`flex w-full items-center justify-between gap-2 px-4 py-1.5 text-left text-xs transition-colors hover:bg-acento-tenue ${
                        activo ? "font-semibold text-acento" : "text-tinta-media"
                      }`}
                    >
                      <span className="cifra truncate">{m}</span>
                      {activo && (
                        <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M3.5 8.5l3 3 6-7" />
                        </svg>
                      )}
                    </button>

                    {seleccionado && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          autorizar();
                        }}
                        className="mx-3 mb-2 mt-1 rounded-md border border-acento/30 bg-acento-tenue/50 p-2.5"
                      >
                        <label htmlFor="clave-motor" className="etiqueta-seccion">
                          Contraseña de motor
                        </label>
                        <div className="mt-1.5 flex gap-1.5">
                          <input
                            id="clave-motor"
                            type="password"
                            value={clave}
                            onChange={(e) => setClave(e.target.value)}
                            autoFocus
                            autoComplete="off"
                            className="min-w-0 flex-1 rounded-md border border-borde bg-superficie px-2.5 py-1.5 text-xs focus:border-acento focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={!clave || autorizando}
                            className="rounded-md bg-acento px-3 py-1.5 text-xs font-medium text-sobre-acento transition-opacity hover:opacity-90 disabled:opacity-40"
                          >
                            {autorizando ? "…" : "Cambiar"}
                          </button>
                        </div>
                        {errorClave && (
                          <p role="alert" className="mt-1.5 text-[0.6875rem] text-critico">
                            {errorClave}
                          </p>
                        )}
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function abreviar(modelo: string): string {
  return modelo.replace(/-\d{8}$/, "").replace(/-latest$/, "");
}
