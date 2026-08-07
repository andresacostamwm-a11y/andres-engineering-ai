/**
 * Diagrama del pipeline en SVG.
 *
 * Se dibuja a mano en lugar de usar arte ASCII porque los glifos de recuadro no
 * mantienen el ancho en todas las fuentes monoespaciadas y el diagrama acababa
 * descuadrado. El SVG hereda `currentColor`, así que sigue el tema de la página.
 */

const ANCHO_CAJA = 176;
const ALTO_CAJA = 44;

export function DiagramaPipeline({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 680 262"
      className={className}
      role="img"
      aria-label="Diagrama del pipeline: el PDF entra al agente extractor; su salida alimenta en paralelo a los agentes de costos y normativo; ambos convergen en el agente de síntesis, que produce el dictamen en PDF."
    >
      <defs>
        <marker
          id="punta-pipeline"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M0 0 10 5 0 10z" fill="currentColor" />
        </marker>
      </defs>

      <g stroke="currentColor" strokeWidth="1.3" fill="none" opacity="0.5">
        {/* PDF → Extractor */}
        <path d="M74 40h64" markerEnd="url(#punta-pipeline)" />
        {/* Extractor → bifurcación */}
        <path d="M226 62v20" />
        <path d="M118 82h216" />
        <path d="M118 82v22" markerEnd="url(#punta-pipeline)" />
        <path d="M334 82v22" markerEnd="url(#punta-pipeline)" />
        {/* Costos y Normativo → convergencia */}
        <path d="M118 148v22" />
        <path d="M334 148v22" />
        <path d="M118 170h216" />
        <path d="M226 170v20" markerEnd="url(#punta-pipeline)" />
        {/* Síntesis → salida */}
        <path d="M314 212h56" markerEnd="url(#punta-pipeline)" />
      </g>

      <Texto x={20} y={45} tamano={13}>
        PDF
      </Texto>

      <Caja x={138} y={18} titulo="Extractor" />
      <Etapa x={330} y={45}>
        Etapa 1 · secuencial
      </Etapa>

      <Etapa x={252} y={78} anclaje="middle">
        requerimientos + evidencia
      </Etapa>

      <Caja x={30} y={104} titulo="Costos" />
      <Caja x={246} y={104} titulo="Normativo" />
      <Etapa x={438} y={131}>
        Etapa 2 · paralelo
      </Etapa>

      <Etapa x={126} y={166}>
        partidas
      </Etapa>
      <Etapa x={276} y={166}>
        hallazgos
      </Etapa>

      <Caja x={138} y={190} titulo="Síntesis" />
      <Texto x={380} y={217} tamano={13}>
        Dictamen PDF
      </Texto>
      <Etapa x={380} y={233}>
        Etapa 3
      </Etapa>
    </svg>
  );
}

function Caja({ x, y, titulo }: { x: number; y: number; titulo: string }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={ANCHO_CAJA}
        height={ALTO_CAJA}
        rx={6}
        className="fill-superficie stroke-current"
        strokeWidth="1.3"
        strokeOpacity="0.45"
      />
      <text
        x={x + ANCHO_CAJA / 2}
        y={y + 28}
        textAnchor="middle"
        fontSize="15"
        fontWeight="600"
        className="fill-current"
      >
        {titulo}
      </text>
    </g>
  );
}

function Etapa({
  x,
  y,
  anclaje = "start",
  children,
}: {
  x: number;
  y: number;
  anclaje?: "start" | "middle";
  children: React.ReactNode;
}) {
  return (
    // `paintOrder: stroke` dibuja un halo del color del fondo por detrás del
    // texto, para que las líneas del diagrama no lo atraviesen.
    <text
      x={x}
      y={y}
      textAnchor={anclaje}
      fontSize="11"
      fontFamily="var(--font-mono)"
      className="fill-current stroke-fondo"
      strokeWidth="4"
      paintOrder="stroke"
      opacity="0.62"
    >
      {children}
    </text>
  );
}

function Texto({
  x,
  y,
  tamano,
  children,
}: {
  x: number;
  y: number;
  tamano: number;
  children: React.ReactNode;
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={tamano}
      fontFamily="var(--font-mono)"
      className="fill-current"
    >
      {children}
    </text>
  );
}
