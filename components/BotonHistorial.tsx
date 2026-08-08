"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Analisis } from "@/lib/types";
import type { Proyecto } from "@/lib/tipos-proyecto";
import {
  eliminarAnalisis,
  eliminarProyecto,
  leerHistorial,
  leerProyectos,
} from "@/lib/almacen";
import { fichaDisciplina } from "@/lib/disciplinas";
import { fechaCorta, pesosExactos } from "@/lib/formato";

/**
 * Historial completo de la aplicación: todos los proyectos generados y todos
 * los análisis de documentos, tras la contraseña de historial (validada en
 * servidor). Desde aquí se abre cualquiera de ellos en su página.
 */

const AUTORIZADO = "aec-copilot:historial-autorizado";

export function BotonHistorial() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [autorizado, setAutorizado] = useState(false);
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [validando, setValidando] = useState(false);

  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [analisis, setAnalisis] = useState<Analisis[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(AUTORIZADO) === "1") {
      setAutorizado(true);
    }
  }, []);

  useEffect(() => {
    if (abierto && autorizado) {
      setProyectos(leerProyectos());
      setAnalisis(leerHistorial());
    }
  }, [abierto, autorizado]);

  async function validar(e: React.FormEvent) {
    e.preventDefault();
    if (validando) return;
    setValidando(true);
    setError(null);
    try {
      const r = await fetch("/api/historial/clave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clave }),
      });
      const datos = await r.json();
      if (!r.ok) {
        setError(datos.error ?? "No se pudo validar la contraseña.");
      } else {
        sessionStorage.setItem(AUTORIZADO, "1");
        setAutorizado(true);
        setClave("");
      }
    } catch {
      setError("No se pudo contactar al servidor.");
    } finally {
      setValidando(false);
    }
  }

  function abrirProyecto(id: string) {
    sessionStorage.setItem("aec-copilot:abrir-proyecto", id);
    setAbierto(false);
    router.push("/app/proyecto");
  }

  function abrirAnalisis(id: string) {
    sessionStorage.setItem("aec-copilot:abrir-analisis", id);
    setAbierto(false);
    router.push("/app");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        title="Historial completo de proyectos y análisis (requiere contraseña)"
        className="flex items-center gap-1.5 rounded-md border border-borde px-2.5 py-1.5 text-xs font-medium text-tinta-media transition-colors hover:border-acento/60 hover:text-tinta"
      >
        <svg viewBox="0 0 16 16" className="size-3.5 text-acento" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <circle cx="8" cy="8" r="6" />
          <path d="M8 4.5V8l2.5 1.5" />
        </svg>
        Historial
      </button>

      {abierto && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[oklch(15%_0.02_244_/_0.6)] p-4 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Historial completo"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAbierto(false);
          }}
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-borde bg-superficie shadow-[var(--shadow-elevada)]">
            <header className="flex items-center justify-between gap-3 border-b border-borde-suave px-5 py-4 sm:px-7">
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  Historial completo
                </h2>
                <p className="mt-0.5 text-xs text-tinta-debil">
                  Todos los proyectos y análisis generados en este equipo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar historial"
                className="rounded-md border border-borde p-1.5 text-tinta-debil transition-colors hover:border-acento/60 hover:text-tinta"
              >
                <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </header>

            {!autorizado ? (
              <form onSubmit={validar} className="space-y-3 px-5 py-6 sm:px-7">
                <div className="flex items-center gap-2 text-sm text-tinta-media">
                  <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-acento" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
                    <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
                  </svg>
                  El historial completo está protegido. Escribe la contraseña de
                  historial para verlo.
                </div>
                <div className="flex max-w-sm gap-2">
                  <label htmlFor="clave-historial" className="sr-only">
                    Contraseña del historial
                  </label>
                  <input
                    id="clave-historial"
                    type="password"
                    value={clave}
                    onChange={(e) => setClave(e.target.value)}
                    autoFocus
                    autoComplete="off"
                    placeholder="Contraseña"
                    className="min-w-0 flex-1 rounded-md border border-borde bg-superficie px-3.5 py-2 text-sm focus:border-acento focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!clave || validando}
                    className="rounded-md bg-acento px-4 py-2 text-sm font-medium text-sobre-acento shadow-[var(--shadow-acento)] transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {validando ? "…" : "Entrar"}
                  </button>
                </div>
                {error && (
                  <p role="alert" className="text-xs text-critico">
                    {error}
                  </p>
                )}
              </form>
            ) : (
              <div className="max-h-[70dvh] space-y-6 overflow-y-auto px-5 py-5 sm:px-7">
                <section>
                  <h3 className="etiqueta-seccion">
                    Proyectos generados · {proyectos.length}
                  </h3>
                  {proyectos.length === 0 ? (
                    <p className="mt-2 text-sm text-tinta-debil">
                      Aún no hay proyectos guardados. Se guardan solos al
                      terminar de generarse.
                    </p>
                  ) : (
                    <ul className="mt-2 divide-y divide-borde-suave rounded-lg border border-borde-suave">
                      {proyectos.map((p) => (
                        <li key={p.id} className="flex items-center gap-2 px-4 py-3">
                          <button
                            type="button"
                            onClick={() => abrirProyecto(p.id)}
                            className="min-w-0 flex-1 text-left transition-colors hover:text-acento"
                          >
                            <span className="block truncate text-sm font-medium">
                              {p.nombre}
                            </span>
                            <span className="cifra mt-0.5 block text-[0.6875rem] text-tinta-debil">
                              {fichaDisciplina(p.disciplina).nombre} ·{" "}
                              {fechaCorta(p.creadoEn)} · {p.diagramas.length} láminas
                              {p.resumen ? ` · ${pesosExactos(p.resumen.totalEstimado)}` : ""}
                              {p.modoDemo ? " · demo" : ""}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setProyectos(eliminarProyecto(p.id))}
                            aria-label={`Eliminar proyecto ${p.nombre}`}
                            className="shrink-0 rounded p-1.5 text-tinta-debil transition-colors hover:bg-critico-tenue hover:text-critico"
                          >
                            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
                              <path d="M3 4.5h10M6.5 7v4M9.5 7v4M4.5 4.5 5 13h6l.5-8.5M6 4.5V3h4v1.5" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <h3 className="etiqueta-seccion">
                    Análisis de documentos · {analisis.length}
                  </h3>
                  {analisis.length === 0 ? (
                    <p className="mt-2 text-sm text-tinta-debil">
                      Aún no hay análisis guardados.
                    </p>
                  ) : (
                    <ul className="mt-2 divide-y divide-borde-suave rounded-lg border border-borde-suave">
                      {analisis.map((a) => (
                        <li key={a.id} className="flex items-center gap-2 px-4 py-3">
                          <button
                            type="button"
                            onClick={() => abrirAnalisis(a.id)}
                            className="min-w-0 flex-1 text-left transition-colors hover:text-acento"
                          >
                            <span className="block truncate text-sm font-medium">
                              {a.nombreArchivo}
                            </span>
                            <span className="cifra mt-0.5 block text-[0.6875rem] text-tinta-debil">
                              {fechaCorta(a.creadoEn)} · {a.partidas.length} partidas
                              {a.resumen ? ` · ${pesosExactos(a.resumen.totalEstimado)}` : ""}
                              {a.modoDemo ? " · demo" : ""}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setAnalisis(eliminarAnalisis(a.id))}
                            aria-label={`Eliminar análisis ${a.nombreArchivo}`}
                            className="shrink-0 rounded p-1.5 text-tinta-debil transition-colors hover:bg-critico-tenue hover:text-critico"
                          >
                            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
                              <path d="M3 4.5h10M6.5 7v4M9.5 7v4M4.5 4.5 5 13h6l.5-8.5M6 4.5V3h4v1.5" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
