"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Presentación del TFM.
 *
 * Cada diapositiva es una sección a pantalla completa con `scroll-snap`, de modo
 * que funciona con rueda, teclado y gesto táctil sin librería de por medio, y se
 * puede imprimir a PDF desde el propio navegador.
 */
export function Diapositivas({ total }: { total: number }) {
  const [actual, setActual] = useState(0);
  const contenedorRef = useRef<HTMLElement | null>(null);

  const ir = useCallback((indice: number) => {
    const destino = Math.max(0, Math.min(indice, total - 1));
    document
      .getElementById(`d${destino}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [total]);

  useEffect(() => {
    contenedorRef.current = document.getElementById("mazo") as HTMLElement;

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            setActual(Number(entrada.target.id.replace("d", "")));
          }
        }
      },
      { threshold: 0.55 },
    );

    document.querySelectorAll("[data-diapositiva]").forEach((n) => observador.observe(n));
    return () => observador.disconnect();
  }, []);

  useEffect(() => {
    function alPulsar(evento: KeyboardEvent) {
      if (["ArrowRight", "ArrowDown", " ", "PageDown"].includes(evento.key)) {
        evento.preventDefault();
        ir(actual + 1);
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(evento.key)) {
        evento.preventDefault();
        ir(actual - 1);
      } else if (evento.key === "Home") {
        ir(0);
      } else if (evento.key === "End") {
        ir(total - 1);
      }
    }
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [actual, ir, total]);

  return (
    <nav
      aria-label="Navegación de la presentación"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 print:hidden"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <span className="cifra pointer-events-auto rounded-full border border-borde bg-fondo/90 px-3 py-1 text-xs text-tinta-debil backdrop-blur">
          {String(actual + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>

        <div className="pointer-events-auto flex items-center gap-1.5">
          <Boton etiqueta="Diapositiva anterior" onClick={() => ir(actual - 1)} desactivado={actual === 0}>
            <path d="M10 3 5 8l5 5" />
          </Boton>
          <Boton
            etiqueta="Diapositiva siguiente"
            onClick={() => ir(actual + 1)}
            desactivado={actual === total - 1}
          >
            <path d="m6 3 5 5-5 5" />
          </Boton>
        </div>
      </div>

      {/* Barra de avance */}
      <div className="h-0.5 w-full bg-superficie">
        <div
          className="h-full bg-acento transition-[width] duration-300"
          style={{ width: `${((actual + 1) / total) * 100}%` }}
        />
      </div>
    </nav>
  );
}

function Boton({
  etiqueta,
  onClick,
  desactivado,
  children,
}: {
  etiqueta: string;
  onClick: () => void;
  desactivado: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desactivado}
      aria-label={etiqueta}
      className="rounded-full border border-borde bg-fondo/90 p-2 text-tinta-media backdrop-blur transition-colors hover:border-acento/60 hover:text-tinta disabled:opacity-30"
    >
      <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}
