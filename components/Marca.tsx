"use client";

import { useId } from "react";

/**
 * Identidad de ANDRES Engineering AI.
 *
 * El isotipo es un compás de proyectista abierto sobre una retícula: las dos
 * patas trazan una A y, al cerrarse, describen el arco que el compás dibujaría.
 * Los tres nodos marcan las tres salidas del sistema —requerimientos, costos y
 * normativa— convergiendo en la punta. El degradado va del azul institucional al
 * latón, los dos colores de la paleta.
 */
export function Isotipo({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");

  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`g-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-acento-claro)" />
          <stop offset="55%" stopColor="var(--color-acento)" />
          <stop offset="100%" stopColor="var(--color-laton)" />
        </linearGradient>
        <linearGradient id={`gs-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-acento)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--color-laton)" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* Disco de fondo con la retícula técnica */}
      <circle cx="24" cy="24" r="22" fill={`url(#gs-${id})`} />
      <circle
        cx="24"
        cy="24"
        r="22"
        fill="none"
        stroke={`url(#g-${id})`}
        strokeWidth="1.4"
        strokeOpacity="0.45"
      />
      <path
        d="M24 2v44M2 24h44"
        stroke={`url(#g-${id})`}
        strokeWidth="0.7"
        strokeOpacity="0.28"
      />

      {/* Arco que trazaría el compás */}
      <path
        d="M10.5 33.5a15 15 0 0 1 27 0"
        fill="none"
        stroke={`url(#g-${id})`}
        strokeWidth="1.6"
        strokeOpacity="0.55"
        strokeDasharray="2.6 3.2"
        strokeLinecap="round"
      />

      {/* Patas del compás, que forman la A */}
      <path
        d="M24 10 12.5 36M24 10l11.5 26"
        fill="none"
        stroke={`url(#g-${id})`}
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Travesaño de la A */}
      <path
        d="M17.4 26h13.2"
        fill="none"
        stroke={`url(#g-${id})`}
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Nodos: pivote y las dos puntas */}
      <circle cx="24" cy="10" r="3.4" fill="var(--color-superficie)" />
      <circle
        cx="24"
        cy="10"
        r="3.4"
        fill="none"
        stroke={`url(#g-${id})`}
        strokeWidth="2.2"
      />
      <circle cx="12.5" cy="36" r="2.5" fill={`url(#g-${id})`} />
      <circle cx="35.5" cy="36" r="2.5" fill={`url(#g-${id})`} />
    </svg>
  );
}

export function Marca({ compacta = false }: { compacta?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <Isotipo className="size-9 shrink-0" />
      <span className="leading-none">
        <span className="block text-[0.95rem] font-semibold tracking-tight">
          <span className="tracking-[0.06em]">ANDRES</span> Engineering
          <span className="text-acento"> AI</span>
        </span>
        {!compacta && (
          <span className="etiqueta-seccion mt-1.5 block normal-case tracking-[0.04em]">
            Engineering Document Analysis &amp; Project Intelligence
          </span>
        )}
      </span>
    </span>
  );
}
