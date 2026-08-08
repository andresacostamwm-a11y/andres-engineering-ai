"use client";

import { useState } from "react";

/**
 * Sala de control: pantalla dividida con los paneles del proyecto —chat,
 * información, acceso a internet y planos—.
 *
 * El usuario elige la DISTRIBUCIÓN con los botones de la barra (cuadrícula
 * 2×2, tres columnas, panel principal con fila inferior, o lista a lo ancho),
 * qué paneles ver con los chips, y puede desplegar cualquier panel a todo lo
 * ancho. Cada panel tiene su propio scroll.
 */

export interface PanelSala {
  id: string;
  etiqueta: string;
  contenido: React.ReactNode;
}

type Distribucion = "cuadricula" | "columnas" | "principal" | "lista";

const DISTRIBUCIONES: {
  id: Distribucion;
  etiqueta: string;
  icono: React.ReactNode;
}[] = [
  {
    id: "cuadricula",
    etiqueta: "Cuadrícula 2×2",
    icono: (
      <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="2" y="2" width="5" height="5" rx="1" />
        <rect x="9" y="2" width="5" height="5" rx="1" />
        <rect x="2" y="9" width="5" height="5" rx="1" />
        <rect x="9" y="9" width="5" height="5" rx="1" />
      </svg>
    ),
  },
  {
    id: "columnas",
    etiqueta: "Tres columnas",
    icono: (
      <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="2" y="2.5" width="12" height="11" rx="2" />
        <path d="M6.3 2.5v11M9.7 2.5v11" />
      </svg>
    ),
  },
  {
    id: "principal",
    etiqueta: "Panel principal con fila inferior",
    icono: (
      <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="2" y="2" width="12" height="7" rx="1.5" />
        <rect x="2" y="11" width="3.2" height="3" rx="0.8" />
        <rect x="6.4" y="11" width="3.2" height="3" rx="0.8" />
        <rect x="10.8" y="11" width="3.2" height="3" rx="0.8" />
      </svg>
    ),
  },
  {
    id: "lista",
    etiqueta: "Lista a lo ancho",
    icono: (
      <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
        <path d="M2.5 4h11M2.5 8h11M2.5 12h11" />
      </svg>
    ),
  },
];

export function SalaControl({ paneles }: { paneles: PanelSala[] }) {
  const [distribucion, setDistribucion] = useState<Distribucion>("cuadricula");
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

  const mostrados = paneles.filter((p) => visibles.has(p.id));

  // Tailwind no genera clases dinámicas: el número de columnas se resuelve
  // con clases completas escritas de forma estática.
  const columnas =
    mostrados.length >= 3
      ? "lg:grid-cols-3"
      : mostrados.length === 2
        ? "lg:grid-cols-2"
        : "grid-cols-1";
  const clasesCuadricula: Record<Distribucion, string> = {
    cuadricula: "grid gap-4 lg:grid-cols-2",
    columnas: `grid gap-4 ${columnas}`,
    principal: "grid gap-4 lg:grid-cols-3",
    lista: "grid gap-4 grid-cols-1",
  };

  const alturaPanel: Record<Distribucion, string> = {
    cuadricula: "max-h-[30rem]",
    columnas: "max-h-[38rem]",
    principal: "max-h-[24rem]",
    lista: "max-h-[36rem]",
  };

  function clasesDe(indice: number, id: string): { celda: string; altura: string } {
    if (ampliado === id) {
      return { celda: "lg:col-span-full", altura: "max-h-[82dvh]" };
    }
    if (distribucion === "principal") {
      if (indice === 0) {
        return { celda: "lg:col-span-3", altura: "max-h-[34rem]" };
      }
      return { celda: "", altura: alturaPanel.principal };
    }
    return { celda: "", altura: alturaPanel[distribucion] };
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Distribución de la pantalla */}
        <div
          className="flex gap-1 rounded-lg border border-borde bg-superficie-alta p-0.5"
          role="group"
          aria-label="Distribución de la pantalla"
        >
          {DISTRIBUCIONES.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDistribucion(d.id)}
              aria-pressed={distribucion === d.id}
              title={d.etiqueta}
              aria-label={d.etiqueta}
              className={`rounded-md p-2 transition-colors ${
                distribucion === d.id
                  ? "bg-superficie text-acento shadow-[var(--shadow-sutil)]"
                  : "text-tinta-debil hover:text-tinta"
              }`}
            >
              {d.icono}
            </button>
          ))}
        </div>

        {/* Paneles visibles */}
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
      </div>

      <div className={clasesCuadricula[distribucion]}>
        {mostrados.map((p, i) => {
          const { celda, altura } = clasesDe(i, p.id);
          const esAmpliado = ampliado === p.id;
          return (
            <div key={p.id} className={`relative ${celda}`}>
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
              <div className={`overflow-y-auto ${altura}`}>{p.contenido}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
