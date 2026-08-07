"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Selector de motor IA.
 *
 * Muestra los modelos que las API keys del despliegue pueden invocar de verdad
 * (los sirve /api/modelos consultando a cada proveedor) y guarda la elección en
 * la cookie `motor-ia`, que las rutas leen en cada petición. Si el elegido se
 * queda sin cuota, el servidor cae automáticamente al siguiente proveedor.
 */

interface Catalogo {
  proveedor: string;
  nombre: string;
  modelos: string[];
}

const COOKIE = "motor-ia";

function leerCookie(): { proveedor: string; modelo: string } | null {
  if (typeof document === "undefined") return null;
  const cruda = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  if (!cruda) return null;
  const [proveedor, ...resto] = decodeURIComponent(cruda).split(":");
  return proveedor ? { proveedor, modelo: resto.join(":") } : null;
}

export function SelectorMotor() {
  const [abierto, setAbierto] = useState(false);
  const [catalogos, setCatalogos] = useState<Catalogo[] | null>(null);
  const [eleccion, setEleccion] = useState<{ proveedor: string; modelo: string } | null>(null);
  const [error, setError] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => setEleccion(leerCookie()), []);

  useEffect(() => {
    if (!abierto || catalogos) return;
    fetch("/api/modelos")
      .then((r) => r.json())
      .then((d) => setCatalogos(d.catalogos ?? []))
      .catch(() => setError(true));
  }, [abierto, catalogos]);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [abierto]);

  function elegir(proveedor: string, modelo: string) {
    const valor = encodeURIComponent(`${proveedor}:${modelo}`);
    document.cookie = `${COOKIE}=${valor}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
    setEleccion({ proveedor, modelo });
    setAbierto(false);
  }

  const etiqueta = eleccion
    ? abreviar(eleccion.modelo)
    : "Motor IA";

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="listbox"
        title="Elegir el modelo de IA con el que se proyecta"
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
        <div className="absolute right-0 z-40 mt-2 max-h-96 w-72 overflow-y-auto rounded-lg border border-borde bg-superficie py-1 shadow-[var(--shadow-elevada)]">
          {!catalogos && !error && (
            <p className="px-4 py-3 text-xs text-tinta-debil">Consultando los modelos disponibles…</p>
          )}
          {error && (
            <p className="px-4 py-3 text-xs text-critico">No se pudo consultar el catálogo.</p>
          )}
          {catalogos?.length === 0 && (
            <p className="px-4 py-3 text-xs leading-relaxed text-tinta-debil">
              Este despliegue no tiene API keys configuradas: la aplicación corre
              en modo demostración. Configura ANTHROPIC_API_KEY, GEMINI_API_KEY u
              OPENAI_API_KEY para elegir motor.
            </p>
          )}
          {catalogos?.map((c) => (
            <div key={c.proveedor} role="listbox" aria-label={`Modelos de ${c.nombre}`}>
              <p className="etiqueta-seccion px-4 pb-1 pt-2.5">{c.nombre}</p>
              {c.modelos.map((m) => {
                const activo =
                  eleccion?.proveedor === c.proveedor && eleccion?.modelo === m;
                return (
                  <button
                    key={m}
                    type="button"
                    role="option"
                    aria-selected={activo}
                    onClick={() => elegir(c.proveedor, m)}
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
