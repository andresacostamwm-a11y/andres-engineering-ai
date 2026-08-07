"use client";

import { useId, useMemo } from "react";
import type { Diagrama, NodoDiagrama, TipoConexion } from "@/lib/diagramas/tipos";
import { SimboloTecnico, radioSimbolo } from "./Simbolos";

/**
 * Renderiza un diagrama técnico como plano: marco, cajetín, rejilla de
 * referencia, simbología y ruteo ortogonal de las conexiones.
 *
 * El ruteo es en L (horizontal-vertical) porque es como se dibuja realmente un
 * unifilar o un P&ID; las diagonales solo aparecen en diagramas de bloques,
 * donde sí son convención.
 */

const ANCHO = 1200;
const ALTO = 900;
const MARGEN = 56;
const ALTO_CAJETIN = 96;

const AREA = {
  x0: MARGEN,
  y0: MARGEN,
  x1: ANCHO - MARGEN,
  y1: ALTO - MARGEN - ALTO_CAJETIN,
};

const ESTILO_CONEXION: Record<TipoConexion, { trazo: string; ancho: number }> = {
  electrica: { trazo: "", ancho: 1.9 },
  tuberia: { trazo: "", ancho: 2.6 },
  aire: { trazo: "7 4", ancho: 1.9 },
  ducto: { trazo: "", ancho: 3.4 },
  senal: { trazo: "3 4", ancho: 1.4 },
  mecanica: { trazo: "10 3 2 3", ancho: 2.1 },
};

export function Plano({
  diagrama,
  proyecto,
  className = "",
}: {
  diagrama: Diagrama;
  proyecto?: { nombre: string; disciplina: string; fecha: string };
  className?: string;
}) {
  const idBase = useId().replace(/:/g, "");

  const posiciones = useMemo(() => {
    const mapa = new Map<string, { x: number; y: number }>();
    for (const nodo of diagrama.nodos) {
      mapa.set(nodo.id, {
        x: AREA.x0 + (Math.min(Math.max(nodo.x, 0), 100) / 100) * (AREA.x1 - AREA.x0),
        y: AREA.y0 + (Math.min(Math.max(nodo.y, 0), 100) / 100) * (AREA.y1 - AREA.y0),
      });
    }
    return mapa;
  }, [diagrama.nodos]);

  const ortogonal = diagrama.tipo !== "bloques";

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      className={className}
      data-plano="true"
      role="img"
      aria-label={`${diagrama.titulo}. ${diagrama.descripcion}`}
    >
      <defs>
        <pattern
          id={`rejilla-${idBase}`}
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M24 0H0V24"
            fill="none"
            stroke="var(--color-borde)"
            strokeWidth="0.6"
            opacity="0.55"
          />
        </pattern>
        <marker
          id={`flecha-${idBase}`}
          viewBox="0 0 10 10"
          refX="8.5"
          refY="5"
          markerWidth="5.5"
          markerHeight="5.5"
          orient="auto-start-reverse"
        >
          <path d="M0 0 10 5 0 10z" fill="var(--color-tinta-media)" />
        </marker>
      </defs>

      {/* Hoja */}
      <rect width={ANCHO} height={ALTO} fill="var(--color-superficie)" />
      <rect
        x={AREA.x0}
        y={AREA.y0}
        width={AREA.x1 - AREA.x0}
        height={AREA.y1 - AREA.y0}
        fill={`url(#rejilla-${idBase})`}
      />

      {/* Marco del plano */}
      <rect
        x={18}
        y={18}
        width={ANCHO - 36}
        height={ALTO - 36}
        fill="none"
        stroke="var(--color-tinta)"
        strokeWidth="2"
      />
      <rect
        x={28}
        y={28}
        width={ANCHO - 56}
        height={ALTO - 56}
        fill="none"
        stroke="var(--color-tinta)"
        strokeWidth="0.8"
      />

      {/* Áreas (plantas arquitectónicas) por debajo de todo lo demás */}
      {diagrama.nodos
        .filter((n) => n.simbolo === "espacio")
        .map((nodo) => {
          const p = posiciones.get(nodo.id)!;
          const w = ((nodo.ancho ?? 18) / 100) * (AREA.x1 - AREA.x0);
          const h = ((nodo.alto ?? 14) / 100) * (AREA.y1 - AREA.y0);
          return (
            <g key={nodo.id}>
              <rect
                x={p.x - w / 2}
                y={p.y - h / 2}
                width={w}
                height={h}
                fill="var(--color-acento-tenue)"
                stroke="var(--color-tinta)"
                strokeWidth="1.6"
              />
              <text
                x={p.x}
                y={p.y - 2}
                textAnchor="middle"
                fontSize="13"
                fontWeight="600"
                fill="var(--color-tinta)"
              >
                {nodo.etiqueta}
              </text>
              {nodo.datos[0] && (
                <text
                  x={p.x}
                  y={p.y + 14}
                  textAnchor="middle"
                  fontSize="11"
                  fontFamily="var(--font-mono)"
                  fill="var(--color-tinta-media)"
                >
                  {nodo.datos[0]}
                </text>
              )}
            </g>
          );
        })}

      {/* Conexiones */}
      {diagrama.conexiones.map((conexion, i) => {
        const a = posiciones.get(conexion.desde);
        const b = posiciones.get(conexion.hasta);
        if (!a || !b) return null;

        const nodoA = diagrama.nodos.find((n) => n.id === conexion.desde)!;
        const nodoB = diagrama.nodos.find((n) => n.id === conexion.hasta)!;
        const estilo = ESTILO_CONEXION[conexion.tipo];

        const { d, medio } = ruta(a, b, radioSimbolo(nodoA.simbolo), radioSimbolo(nodoB.simbolo), ortogonal);

        return (
          <g key={`${conexion.desde}-${conexion.hasta}-${i}`}>
            <path
              d={d}
              fill="none"
              stroke="var(--color-tinta-media)"
              strokeWidth={estilo.ancho}
              strokeDasharray={estilo.trazo || undefined}
              strokeLinejoin="round"
              markerEnd={`url(#flecha-${idBase})`}
            />
            {conexion.etiqueta && (
              <>
                <rect
                  x={medio.x - conexion.etiqueta.length * 3.3 - 4}
                  y={medio.y - 9}
                  width={conexion.etiqueta.length * 6.6 + 8}
                  height={16}
                  rx={3}
                  fill="var(--color-superficie)"
                />
                <text
                  x={medio.x}
                  y={medio.y + 3}
                  textAnchor="middle"
                  fontSize="10.5"
                  fontFamily="var(--font-mono)"
                  fill="var(--color-tinta-media)"
                >
                  {conexion.etiqueta}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* Símbolos */}
      {diagrama.nodos
        .filter((n) => n.simbolo !== "espacio")
        .map((nodo) => (
          <Elemento key={nodo.id} nodo={nodo} p={posiciones.get(nodo.id)!} />
        ))}

      {/* Cajetín */}
      <Cajetin diagrama={diagrama} proyecto={proyecto} />
    </svg>
  );
}

function Elemento({ nodo, p }: { nodo: NodoDiagrama; p: { x: number; y: number } }) {
  return (
    <g transform={`translate(${p.x} ${p.y})`}>
      <g className="text-[var(--color-acento-fuerte)]">
        <SimboloTecnico simbolo={nodo.simbolo} />
      </g>

      <text
        x="0"
        y={radioSimbolo(nodo.simbolo) + 16}
        textAnchor="middle"
        fontSize="12"
        fontWeight="600"
        fill="var(--color-tinta)"
      >
        {nodo.etiqueta}
      </text>

      {nodo.datos.slice(0, 2).map((dato, i) => (
        <text
          key={i}
          x="0"
          y={radioSimbolo(nodo.simbolo) + 28 + i * 12}
          textAnchor="middle"
          fontSize="10"
          fontFamily="var(--font-mono)"
          fill="var(--color-tinta-media)"
        >
          {dato}
        </text>
      ))}
    </g>
  );
}

function Cajetin({
  diagrama,
  proyecto,
}: {
  diagrama: Diagrama;
  proyecto?: { nombre: string; disciplina: string; fecha: string };
}) {
  const y = ALTO - MARGEN - ALTO_CAJETIN + 12;
  const x0 = 28;
  const x1 = ANCHO - 28;

  return (
    <g>
      <rect
        x={x0}
        y={y}
        width={x1 - x0}
        height={ALTO_CAJETIN - 12 - 10}
        fill="var(--color-superficie-alta)"
        stroke="var(--color-tinta)"
        strokeWidth="1.4"
      />
      <path
        d={`M${x0 + 640} ${y}V${y + ALTO_CAJETIN - 22}M${x0 + 880} ${y}V${y + ALTO_CAJETIN - 22}`}
        stroke="var(--color-tinta)"
        strokeWidth="1"
      />

      <text x={x0 + 16} y={y + 22} fontSize="10" fontFamily="var(--font-mono)" fill="var(--color-tinta-debil)" letterSpacing="1.4">
        PLANO
      </text>
      <text x={x0 + 16} y={y + 44} fontSize="16" fontWeight="700" fill="var(--color-tinta)">
        {diagrama.titulo}
      </text>
      <text x={x0 + 16} y={y + 62} fontSize="11" fill="var(--color-tinta-media)">
        {recorta(diagrama.descripcion, 96)}
      </text>

      <text x={x0 + 656} y={y + 22} fontSize="10" fontFamily="var(--font-mono)" fill="var(--color-tinta-debil)" letterSpacing="1.4">
        PROYECTO
      </text>
      <text x={x0 + 656} y={y + 42} fontSize="12" fontWeight="600" fill="var(--color-tinta)">
        {recorta(proyecto?.nombre ?? "—", 30)}
      </text>
      <text x={x0 + 656} y={y + 60} fontSize="11" fill="var(--color-tinta-media)">
        {proyecto?.disciplina ?? ""}
      </text>

      <text x={x0 + 896} y={y + 22} fontSize="10" fontFamily="var(--font-mono)" fill="var(--color-tinta-debil)" letterSpacing="1.4">
        ESCALA
      </text>
      <text x={x0 + 896} y={y + 42} fontSize="12" fontFamily="var(--font-mono)" fill="var(--color-tinta)">
        {diagrama.escala ?? "S/E"}
      </text>
      <text x={x0 + 896} y={y + 60} fontSize="10" fontFamily="var(--font-mono)" fill="var(--color-tinta-media)">
        {proyecto?.fecha ?? ""}
      </text>
      <text x={x1 - 16} y={y + 60} textAnchor="end" fontSize="10" fill="var(--color-tinta-debil)">
        ANDRES Engineering AI · anteproyecto
      </text>
    </g>
  );
}

/** Ruteo en L con salida por el eje dominante, o recta en diagramas de bloques. */
function ruta(
  a: { x: number; y: number },
  b: { x: number; y: number },
  radioA: number,
  radioB: number,
  ortogonal: boolean,
): { d: string; medio: { x: number; y: number } } {
  if (!ortogonal) {
    const angulo = Math.atan2(b.y - a.y, b.x - a.x);
    const ini = {
      x: a.x + Math.cos(angulo) * radioA,
      y: a.y + Math.sin(angulo) * radioA,
    };
    const fin = {
      x: b.x - Math.cos(angulo) * (radioB + 6),
      y: b.y - Math.sin(angulo) * (radioB + 6),
    };
    return {
      d: `M${ini.x} ${ini.y}L${fin.x} ${fin.y}`,
      medio: { x: (ini.x + fin.x) / 2, y: (ini.y + fin.y) / 2 },
    };
  }

  const horizontalPrimero = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
  const signoX = Math.sign(b.x - a.x) || 1;
  const signoY = Math.sign(b.y - a.y) || 1;

  if (horizontalPrimero) {
    const ini = { x: a.x + signoX * radioA, y: a.y };
    const fin = { x: b.x, y: b.y - signoY * (radioB + 6) };
    const codo = { x: fin.x, y: ini.y };
    return {
      d: `M${ini.x} ${ini.y}H${codo.x}V${fin.y}`,
      medio: { x: (ini.x + codo.x) / 2, y: ini.y - 8 },
    };
  }

  const ini = { x: a.x, y: a.y + signoY * radioA };
  const fin = { x: b.x - signoX * (radioB + 6), y: b.y };
  const codo = { x: ini.x, y: fin.y };
  return {
    d: `M${ini.x} ${ini.y}V${codo.y}H${fin.x}`,
    medio: { x: ini.x + 8, y: (ini.y + codo.y) / 2 },
  };
}

function recorta(texto: string, maximo: number): string {
  return texto.length > maximo ? `${texto.slice(0, maximo - 1)}…` : texto;
}
