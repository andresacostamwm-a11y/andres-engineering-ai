import type { Escena } from "@/lib/agentes-catalogo";

/**
 * Ilustraciones de las fichas de agente.
 *
 * Son SVG y no fotografías porque lo que hay que enseñar son estructuras de
 * datos: un catálogo de precios, una matriz de riesgo, un Gantt. Un vector se
 * lee nítido en cualquier pantalla y a cualquier zoom, pesa unos cientos de
 * bytes y toma los colores del tema, así que funciona igual en claro y oscuro.
 *
 * Todas las escenas comparten el mismo lienzo de 160×110 para que las parejas
 * entrada/salida queden alineadas dentro de la ficha.
 */

const A = 160;
const AL = 110;

const trazo = "var(--color-borde)";
const tinta = "var(--color-tinta-debil)";
const acento = "var(--color-acento)";

export function IlustracionAgente({
  escena,
  className = "",
}: {
  escena: Escena;
  className?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${A} ${AL}`}
      className={`h-auto w-full ${className}`}
      role="presentation"
      aria-hidden="true"
    >
      <rect
        x="0.5"
        y="0.5"
        width={A - 1}
        height={AL - 1}
        rx="7"
        fill="var(--color-superficie-alta)"
        stroke={trazo}
      />
      {ESCENAS[escena]}
    </svg>
  );
}

/** Renglón de texto simulado. */
function Linea({ x, y, w, fuerte = false }: { x: number; y: number; w: number; fuerte?: boolean }) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height="3"
      rx="1.5"
      fill={fuerte ? acento : tinta}
      opacity={fuerte ? 0.8 : 0.35}
    />
  );
}

/** Hoja de papel con su esquina doblada. */
function Hoja({ x = 26, y = 16 }: { x?: number; y?: number }) {
  return (
    <path
      d={`M${x} ${y} h44 l10 10 v62 h-54 z`}
      fill="var(--color-superficie)"
      stroke={trazo}
      strokeWidth="1.2"
    />
  );
}

const ESCENAS: Record<Escena, React.ReactNode> = {
  // Lo que escribe el cliente: una idea suelta.
  brief: (
    <>
      <rect x="20" y="26" width="120" height="46" rx="8" fill="var(--color-superficie)" stroke={trazo} />
      <path d="M36 72 l0 12 l14 -12 z" fill="var(--color-superficie)" stroke={trazo} />
      <Linea x={32} y={38} w={92} />
      <Linea x={32} y={48} w={76} />
      <Linea x={32} y={58} w={54} fuerte />
    </>
  ),

  // Alcance estructurado: apartados numerados y premisas al pie.
  alcance: (
    <>
      <Hoja />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx="34" cy={34 + i * 14} r="3" fill={acento} opacity="0.8" />
          <Linea x={42} y={33 + i * 14} w={38} />
        </g>
      ))}
      <rect x="30" y="78" width="46" height="12" rx="3" fill={acento} opacity="0.14" />
      <Linea x={34} y={83} w={30} fuerte />
    </>
  ),

  // Un documento largo, sin jerarquía todavía.
  documento: (
    <>
      <Hoja x={22} />
      <Hoja x={34} y={12} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Linea key={i} x={42} y={26 + i * 10} w={i % 3 === 2 ? 30 : 44} />
      ))}
    </>
  ),

  // Requerimientos aislados, cada uno con su cita.
  requisitos: (
    <>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect
            x="18"
            y={18 + i * 26}
            width="124"
            height="20"
            rx="4"
            fill="var(--color-superficie)"
            stroke={trazo}
          />
          <rect x="18" y={18 + i * 26} width="3" height="20" rx="1.5" fill={acento} />
          <Linea x={28} y={23 + i * 26} w={i === 0 ? 76 : 60} />
          <Linea x={28} y={30 + i * 26} w={44} />
          <text x="132" y={32 + i * 26} fontSize="7" fill={tinta} textAnchor="end">
            p.{12 + i * 7}
          </text>
        </g>
      ))}
    </>
  ),

  // Catálogo de conceptos con su columna de importe.
  tabla: (
    <>
      <rect x="16" y="18" width="128" height="74" rx="5" fill="var(--color-superficie)" stroke={trazo} />
      <rect x="16" y="18" width="128" height="14" rx="5" fill={acento} opacity="0.16" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <line x1="16" y1={32 + i * 15} x2="144" y2={32 + i * 15} stroke={trazo} strokeWidth="0.8" />
          <Linea x={22} y={38 + i * 15} w={54} />
          <Linea x={86} y={38 + i * 15} w={20} />
          <Linea x={114} y={38 + i * 15} w={24} fuerte />
        </g>
      ))}
      <line x1="80" y1="18" x2="80" y2="92" stroke={trazo} strokeWidth="0.8" />
      <line x1="108" y1="18" x2="108" y2="92" stroke={trazo} strokeWidth="0.8" />
    </>
  ),

  // El corpus normativo.
  norma: (
    <>
      <path d="M46 22 h68 v66 h-68 z" fill="var(--color-superficie)" stroke={trazo} strokeWidth="1.2" />
      <path d="M46 22 h-8 v66 h8" fill="none" stroke={trazo} strokeWidth="1.2" />
      <path
        d="M80 40 l16 6 v12 c0 9 -7 15 -16 18 c-9 -3 -16 -9 -16 -18 v-12 z"
        fill={acento}
        opacity="0.16"
        stroke={acento}
        strokeWidth="1.2"
      />
      <path d="M73 58 l5 5 l10 -11" fill="none" stroke={acento} strokeWidth="2" strokeLinecap="round" />
    </>
  ),

  // Hallazgos con su nivel de riesgo.
  hallazgos: (
    <>
      {[
        { color: "var(--color-critico)", w: 92 },
        { color: "var(--color-alto)", w: 74 },
        { color: "var(--color-medio)", w: 84 },
      ].map((f, i) => (
        <g key={i}>
          <rect
            x="18"
            y={20 + i * 24}
            width="124"
            height="18"
            rx="4"
            fill="var(--color-superficie)"
            stroke={trazo}
          />
          <path
            d={`M30 ${24 + i * 24} l6 10 h-12 z`}
            fill={f.color}
            opacity="0.85"
          />
          <Linea x={42} y={27 + i * 24} w={f.w - 30} />
        </g>
      ))}
    </>
  ),

  // Lámina técnica con nodos y ruteo ortogonal.
  plano: (
    <>
      <rect x="14" y="14" width="132" height="82" rx="3" fill="var(--color-superficie)" stroke={trazo} />
      <rect x="20" y="20" width="120" height="56" fill="none" stroke={trazo} strokeDasharray="2 3" />
      <path
        d="M40 34 h34 v20 h30 M74 54 v18 h34"
        fill="none"
        stroke={acento}
        strokeWidth="1.6"
      />
      {[
        [40, 34],
        [104, 54],
        [108, 72],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4.5" fill="var(--color-superficie)" stroke={acento} strokeWidth="1.6" />
      ))}
      <rect x="20" y="80" width="120" height="10" fill="none" stroke={trazo} />
      <line x1="96" y1="80" x2="96" y2="90" stroke={trazo} />
      <Linea x={24} y={83.5} w={40} />
    </>
  ),

  // Memoria de cálculo: fórmula y resultado.
  calculo: (
    <>
      <Hoja x={20} />
      <Linea x={28} y={26} w={40} fuerte />
      <rect x="28" y="36" width="88" height="16" rx="3" fill={acento} opacity="0.12" />
      <text x="34" y="47" fontSize="9" fill={acento} fontStyle="italic">
        I = P / (√3·V·fp)
      </text>
      {[0, 1].map((i) => (
        <Linea key={i} x={28} y={60 + i * 9} w={i === 0 ? 84 : 62} />
      ))}
      <rect x="28" y="80" width="60" height="10" rx="3" fill={acento} opacity="0.2" />
      <Linea x={32} y={83.5} w={36} fuerte />
    </>
  ),

  // Resumen ejecutivo: una cifra que manda.
  resumen: (
    <>
      <rect x="16" y="18" width="128" height="74" rx="6" fill="var(--color-superficie)" stroke={trazo} />
      <text x="28" y="46" fontSize="20" fontWeight="600" fill={acento}>
        87
      </text>
      <text x="56" y="46" fontSize="9" fill={tinta}>
        /100
      </text>
      <Linea x={28} y={56} w={100} />
      <Linea x={28} y={65} w={82} />
      <rect x="28" y="76" width="42" height="10" rx="5" fill={acento} opacity="0.18" />
      <Linea x={34} y={79.5} w={28} fuerte />
    </>
  ),

  // Gantt con la ruta crítica destacada.
  gantt: (
    <>
      <line x1="14" y1="24" x2="146" y2="24" stroke={trazo} />
      {[38, 74, 110].map((x) => (
        <line key={x} x1={x} y1="20" x2={x} y2="96" stroke={trazo} strokeDasharray="2 3" />
      ))}
      {[
        { y: 32, x: 18, w: 40, critica: true },
        { y: 44, x: 40, w: 30, critica: false },
        { y: 56, x: 58, w: 48, critica: true },
        { y: 68, x: 76, w: 26, critica: false },
        { y: 80, x: 104, w: 34, critica: true },
      ].map((b) => (
        <rect
          key={b.y}
          x={b.x}
          y={b.y}
          width={b.w}
          height="7"
          rx="3"
          fill={b.critica ? "var(--color-critico)" : acento}
          opacity={b.critica ? 0.85 : 0.6}
        />
      ))}
    </>
  ),

  // Matriz 5×5 de probabilidad e impacto.
  matriz: (
    <>
      {Array.from({ length: 25 }, (_, i) => {
        const fila = Math.floor(i / 5);
        const col = i % 5;
        const severidad = (5 - fila) * (col + 1);
        const marcada = [8, 13, 14, 19, 21].includes(i);
        return (
          <rect
            key={i}
            x={30 + col * 20}
            y={16 + fila * 16}
            width="17"
            height="13"
            rx="2.5"
            fill={
              severidad >= 15
                ? "var(--color-critico)"
                : severidad >= 9
                  ? "var(--color-alto)"
                  : acento
            }
            opacity={marcada ? 0.9 : 0.14}
          />
        );
      })}
      <line x1="24" y1="14" x2="24" y2="96" stroke={trazo} />
      <line x1="24" y1="96" x2="140" y2="96" stroke={trazo} />
    </>
  ),

  // Lista de comprobación: lo que pasa y lo que no.
  checklist: (
    <>
      {[true, true, false, true].map((ok, i) => (
        <g key={i}>
          <rect
            x="22"
            y={18 + i * 20}
            width="116"
            height="15"
            rx="4"
            fill="var(--color-superficie)"
            stroke={trazo}
          />
          <circle
            cx="32"
            cy={25.5 + i * 20}
            r="5"
            fill={ok ? acento : "var(--color-critico)"}
            opacity="0.2"
          />
          {ok ? (
            <path
              d={`M29.5 ${25.5 + i * 20} l2 2 l3.5 -4`}
              fill="none"
              stroke={acento}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          ) : (
            <path
              d={`M29.8 ${23.3 + i * 20} l4.4 4.4 m0 -4.4 l-4.4 4.4`}
              stroke="var(--color-critico)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          )}
          <Linea x={44} y={24 + i * 20} w={ok ? 60 : 78} fuerte={!ok} />
        </g>
      ))}
    </>
  ),
};
