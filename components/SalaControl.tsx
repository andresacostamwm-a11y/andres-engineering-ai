"use client";

import { useState } from "react";

/**
 * Sala de control: divide la pantalla en hasta 4 paneles —chat, información
 * del proyecto, acceso a internet y planos— en cuadrícula 2×2. El usuario
 * elige qué paneles ver y puede desplegar cualquiera a todo lo ancho; cada
 * panel tiene su propio scroll.
 */

export interface PanelSala {
  id: string;
  etiqueta: string;
  contenido: React.ReactNode;
}

export function SalaControl({ paneles }: { paneles: PanelSala[] }) {
  const [visibles, setVisibles] = useState<Set<string>>(
    new Set(paneles.map((p) => p.id)),
  );
  const [ampliado, setAmpliado] = useState<string | null>(null);

  function alternar(id: string) {
    setVisibles((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) {
        if (siguiente.size === 1) return siguiente; // siempre queda un panel
        siguiente.delete(id);
        if (ampliado === id) setAmpliado(null);
      } else {
        siguiente.add(id);
      }
      return siguiente;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Paneles visibles">
        {paneles.map((p) => {
          const activo = visibles.has(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => alternar(p.id)}
              aria-pressed={activo}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                activo
                  ? "border-acento/40 bg-acento-tenue text-acento"
                  : "border-borde text-tinta-debil hover:text-tinta"
              }`}
            >
              {activo && (
                <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3.5 8.5l3 3 6-7" />
                </svg>
              )}
              {p.etiqueta}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {paneles
          .filter((p) => visibles.has(p.id))
          .map((p) => {
            const esAmpliado = ampliado === p.id;
            return (
              <div key={p.id} className={`relative ${esAmpliado ? "lg:col-span-2" : ""}`}>
                <button
                  type="button"
                  onClick={() => setAmpliado(esAmpliado ? null : p.id)}
                  title={esAmpliado ? "Restaurar panel" : "Desplegar a todo lo ancho"}
                  aria-label={`${esAmpliado ? "Restaurar" : "Desplegar"} panel de ${p.etiqueta.toLowerCase()}`}
                  className="absolute right-3 top-3 z-10 rounded-md border border-borde bg-superficie/90 p-1.5 text-tinta-debil backdrop-blur transition-colors hover:border-acento/60 hover:text-acento"
                >
                  {esAmpliado ? (
                    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />
                    </svg>
                  )}
                </button>
                <div
                  className={`overflow-y-auto ${esAmpliado ? "max-h-[82dvh]" : "max-h-[30rem]"}`}
                >
                  {p.contenido}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
