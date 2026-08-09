"use client";

import { useMemo } from "react";
import type { Partida } from "@/lib/types";
import { ETIQUETA_DISCIPLINA } from "@/lib/types";
import type { ProgramaObra, Viabilidad } from "@/lib/tipos-proyecto";
import type { Moneda } from "@/lib/moneda/tipos";
import { dinero, numero } from "@/lib/formato";
import {
  curvaDeAvance,
  dispersionDePartidas,
  histograma,
  posicionLogaritmica,
  proyectarIsometrico,
  superficieDeSeveridad,
  treemap,
} from "@/lib/graficos/analitica";

/**
 * Análisis gráfico del proyecto.
 *
 * Cinco figuras, y cada una existe porque contesta algo que las tablas no
 * contestan de un vistazo: dónde está el dinero, cómo se reparte, de qué está
 * hecho el coste, cómo avanza la obra y hacia dónde se dispara el riesgo.
 *
 * Todo es SVG con las variables del tema: se ve igual en claro y en oscuro,
 * escala sin perder nitidez y se puede llevar al PDF sin pasar por una imagen.
 */

const PALETA = [
  "var(--color-acento)",
  "var(--color-acento-claro)",
  "var(--color-laton)",
  "var(--color-bajo)",
  "var(--color-medio)",
  "var(--color-alto)",
  "var(--color-critico)",
];

function etiqueta(disciplina: string): string {
  return ETIQUETA_DISCIPLINA[disciplina as keyof typeof ETIQUETA_DISCIPLINA] ?? disciplina;
}

export function PanelAnalitica({
  partidas,
  programa,
  viabilidad,
  moneda,
}: {
  partidas: Partida[];
  programa: ProgramaObra | null;
  viabilidad: Viabilidad | null;
  moneda: Moneda;
}) {
  const hayPresupuesto = partidas.length > 0;
  if (!hayPresupuesto && !programa && !viabilidad) return null;

  return (
    <section className="aparecer overflow-hidden rounded-xl border border-borde bg-superficie shadow-[var(--shadow-tarjeta)]">
      <header className="border-b border-borde-suave px-5 py-4 sm:px-7">
        <h2 className="text-base font-semibold tracking-tight">Análisis gráfico</h2>
        <p className="mt-0.5 text-xs text-tinta-debil">
          Cada figura responde una pregunta del proyecto. Los datos son los mismos del
          catálogo, del cronograma y de la matriz de riesgo.
        </p>
      </header>

      <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-2">
        {hayPresupuesto && <Treemap partidas={partidas} moneda={moneda} />}
        {hayPresupuesto && <Histograma partidas={partidas} moneda={moneda} />}
        {hayPresupuesto && <Dispersion partidas={partidas} moneda={moneda} />}
        {programa && <CurvaAvance programa={programa} />}
        {viabilidad && viabilidad.riesgos.length > 0 && (
          <Superficie viabilidad={viabilidad} />
        )}
      </div>
    </section>
  );
}

function Figura({
  titulo,
  pregunta,
  children,
  ancho = false,
}: {
  titulo: string;
  pregunta: string;
  children: React.ReactNode;
  ancho?: boolean;
}) {
  return (
    <figure className={ancho ? "lg:col-span-2" : ""}>
      <figcaption className="mb-2">
        <h3 className="text-sm font-semibold text-tinta">{titulo}</h3>
        <p className="text-xs leading-relaxed text-tinta-debil">{pregunta}</p>
      </figcaption>
      <div className="overflow-hidden rounded-lg border border-borde bg-superficie-alta">
        {children}
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------- Treemap -- */

function Treemap({ partidas, moneda }: { partidas: Partida[]; moneda: Moneda }) {
  const ANCHO = 520;
  const ALTO = 300;

  // Se reparte por partida y no por disciplina: en un proyecto de una sola
  // especialidad, el treemap por disciplina es un rectángulo único que no
  // informa de nada. Por partida siempre enseña dónde está el dinero.
  const { celdas, disciplinaDe } = useMemo(() => {
    const ordenadas = [...partidas].sort((a, b) => b.importe - a.importe);
    const mapa = new Map<string, string>(ordenadas.map((p) => [p.concepto, p.disciplina]));
    return {
      celdas: treemap(
        ordenadas.map((p) => ({ etiqueta: p.concepto, valor: p.importe })),
        ANCHO,
        ALTO,
      ),
      disciplinaDe: mapa,
    };
  }, [partidas]);

  const disciplinas = useMemo(
    () => [...new Set<string>(partidas.map((p) => p.disciplina))],
    [partidas],
  );

  if (celdas.length === 0) return null;

  return (
    <Figura
      titulo="Mapa de árbol del presupuesto"
      pregunta="¿Dónde está el dinero? El área de cada bloque es el peso real de esa partida; el color, su disciplina."
    >
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img" aria-label="Mapa de árbol del presupuesto por disciplina">
        {celdas.map((celda) => {
          const indice = disciplinas.indexOf(disciplinaDe.get(celda.etiqueta) ?? "");
          const cabe = celda.ancho > 96 && celda.alto > 40;
          const caracteres = Math.max(6, Math.floor((celda.ancho - 18) / 6.2));
          return (
            <g key={celda.etiqueta}>
              <rect
                x={celda.x + 1}
                y={celda.y + 1}
                width={Math.max(0, celda.ancho - 2)}
                height={Math.max(0, celda.alto - 2)}
                rx="3"
                fill={PALETA[Math.max(0, indice) % PALETA.length]}
                opacity={0.32 + 0.55 * Math.sqrt(celda.fraccion)}
                stroke="var(--color-superficie)"
                strokeWidth="1.5"
              />
              {cabe && (
                <>
                  {/* Sobre relleno saturado, el texto va en la tinta que contrasta. */}
                  <text x={celda.x + 9} y={celda.y + 19} fontSize="11" fontWeight="600" fill="var(--color-sobre-acento)">
                    {celda.etiqueta.slice(0, caracteres)}
                  </text>
                  <text x={celda.x + 9} y={celda.y + 33} fontSize="9.5" fill="var(--color-sobre-acento)" opacity="0.85">
                    {dinero({ valor: celda.valor, moneda })} · {Math.round(celda.fraccion * 100)} %
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </Figura>
  );
}

/* ---------------------------------------------------------- Histograma -- */

function Histograma({ partidas, moneda }: { partidas: Partida[]; moneda: Moneda }) {
  const ANCHO = 520;
  const ALTO = 300;
  const MARGEN = { i: 44, d: 12, s: 14, b: 42 };

  const intervalos = useMemo(() => histograma(partidas.map((p) => p.importe)), [partidas]);
  if (intervalos.length === 0) return null;

  const maximo = Math.max(...intervalos.map((i) => i.cuenta));
  const util = { ancho: ANCHO - MARGEN.i - MARGEN.d, alto: ALTO - MARGEN.s - MARGEN.b };
  const anchoBarra = util.ancho / intervalos.length;

  return (
    <Figura
      titulo="Histograma de importes de partida"
      pregunta="¿El coste está repartido o lo cargan unas pocas partidas grandes?"
    >
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img" aria-label="Histograma de importes de partida">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line
              x1={MARGEN.i}
              y1={MARGEN.s + util.alto * (1 - f)}
              x2={ANCHO - MARGEN.d}
              y2={MARGEN.s + util.alto * (1 - f)}
              stroke="var(--color-borde)"
              strokeWidth="0.8"
            />
            <text x={MARGEN.i - 8} y={MARGEN.s + util.alto * (1 - f) + 4} textAnchor="end" fontSize="10" fill="var(--color-tinta-debil)">
              {Math.round(maximo * f)}
            </text>
          </g>
        ))}

        {intervalos.map((intervalo, i) => {
          const alto = maximo > 0 ? (intervalo.cuenta / maximo) * util.alto : 0;
          return (
            <g key={i}>
              <rect
                x={MARGEN.i + i * anchoBarra + 2}
                y={MARGEN.s + util.alto - alto}
                width={Math.max(1, anchoBarra - 4)}
                height={alto}
                rx="2"
                fill="var(--color-acento)"
                opacity="0.8"
              >
                <title>
                  {`${intervalo.cuenta} partida(s) entre ${dinero({ valor: intervalo.desde, moneda })} y ${dinero({ valor: intervalo.hasta, moneda })}`}
                </title>
              </rect>
              {intervalo.cuenta > 0 && (
                <text
                  x={MARGEN.i + i * anchoBarra + anchoBarra / 2}
                  y={MARGEN.s + util.alto - alto - 5}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill="var(--color-tinta-media)"
                >
                  {intervalo.cuenta}
                </text>
              )}
            </g>
          );
        })}

        <text x={MARGEN.i} y={ALTO - 16} fontSize="10" fill="var(--color-tinta-debil)">
          {dinero({ valor: intervalos[0].desde, moneda })}
        </text>
        <text x={ANCHO - MARGEN.d} y={ALTO - 16} textAnchor="end" fontSize="10" fill="var(--color-tinta-debil)">
          {dinero({ valor: intervalos[intervalos.length - 1].hasta, moneda })}
        </text>
        <text x={ANCHO / 2} y={ALTO - 3} textAnchor="middle" fontSize="9.5" fill="var(--color-tinta-debil)">
          Importe por partida · el número sobre la barra es cuántas caen ahí
        </text>
      </svg>
    </Figura>
  );
}

/* --------------------------------------------------------- Dispersión -- */

function Dispersion({ partidas, moneda }: { partidas: Partida[]; moneda: Moneda }) {
  const ANCHO = 520;
  const ALTO = 300;
  const MARGEN = { i: 56, d: 16, s: 16, b: 46 };

  const puntos = useMemo(() => dispersionDePartidas(partidas), [partidas]);
  if (puntos.length < 2) return null;

  const cantidades = puntos.map((p) => p.cantidad);
  const precios = puntos.map((p) => p.precioUnitario);
  const importes = puntos.map((p) => p.importe);
  const util = { ancho: ANCHO - MARGEN.i - MARGEN.d, alto: ALTO - MARGEN.s - MARGEN.b };

  const xMin = Math.min(...cantidades);
  const xMax = Math.max(...cantidades);
  const yMin = Math.min(...precios);
  const yMax = Math.max(...precios);
  const importeMax = Math.max(...importes);

  const disciplinas = [...new Set(puntos.map((p) => p.disciplina))];

  return (
    <Figura
      titulo="Dispersión: cantidad contra precio unitario"
      pregunta="¿El importe viene de mucho barato o de poco caro? El tamaño del punto es su importe."
    >
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img" aria-label="Dispersión de cantidad contra precio unitario">
        <rect
          x={MARGEN.i}
          y={MARGEN.s}
          width={util.ancho}
          height={util.alto}
          fill="none"
          stroke="var(--color-borde)"
          strokeWidth="0.8"
        />

        {puntos.map((punto, i) => {
          const x = MARGEN.i + posicionLogaritmica(punto.cantidad, xMin, xMax) * util.ancho;
          const y = MARGEN.s + (1 - posicionLogaritmica(punto.precioUnitario, yMin, yMax)) * util.alto;
          const r = 3 + 9 * Math.sqrt(punto.importe / importeMax);
          const color = PALETA[disciplinas.indexOf(punto.disciplina) % PALETA.length];
          return (
            <circle key={i} cx={x} cy={y} r={r} fill={color} opacity="0.55" stroke={color} strokeWidth="1.2">
              <title>{`${punto.etiqueta}\n${numero(punto.cantidad)} × ${dinero({ valor: punto.precioUnitario, moneda })} = ${dinero({ valor: punto.importe, moneda })}`}</title>
            </circle>
          );
        })}

        <text x={MARGEN.i} y={ALTO - 26} fontSize="10" fill="var(--color-tinta-debil)">
          {numero(xMin)}
        </text>
        <text x={ANCHO - MARGEN.d} y={ALTO - 26} textAnchor="end" fontSize="10" fill="var(--color-tinta-debil)">
          {numero(xMax)}
        </text>
        <text x={ANCHO / 2} y={ALTO - 26} textAnchor="middle" fontSize="9.5" fill="var(--color-tinta-debil)">
          Cantidad (escala logarítmica)
        </text>
        <text
          x={-(MARGEN.s + util.alto / 2)}
          y={16}
          transform="rotate(-90)"
          textAnchor="middle"
          fontSize="9.5"
          fill="var(--color-tinta-debil)"
        >
          Precio unitario (log)
        </text>

        <g>
          {disciplinas.slice(0, 4).map((d, i) => (
            <g key={d} transform={`translate(${MARGEN.i + i * 118} ${ALTO - 8})`}>
              <circle cx="4" cy="-3" r="4" fill={PALETA[i % PALETA.length]} opacity="0.7" />
              <text x="13" y="0" fontSize="9.5" fill="var(--color-tinta-debil)">
                {etiqueta(d).slice(0, 14)}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </Figura>
  );
}

/* ------------------------------------------------------------ Curva S -- */

function CurvaAvance({ programa }: { programa: ProgramaObra }) {
  const ANCHO = 520;
  const ALTO = 300;
  const MARGEN = { i: 46, d: 16, s: 16, b: 42 };

  const curva = useMemo(() => curvaDeAvance(programa), [programa]);
  if (curva.length < 2) return null;

  const util = { ancho: ANCHO - MARGEN.i - MARGEN.d, alto: ALTO - MARGEN.s - MARGEN.b };
  const punto = (p: { dia: number; avance: number }) => ({
    x: MARGEN.i + (p.dia / programa.duracionDias) * util.ancho,
    y: MARGEN.s + (1 - p.avance) * util.alto,
  });

  const trazo = curva.map((p, i) => {
    const { x, y } = punto(p);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join("");

  const relleno = `${trazo}L${MARGEN.i + util.ancho} ${MARGEN.s + util.alto}L${MARGEN.i} ${MARGEN.s + util.alto}Z`;

  return (
    <Figura
      titulo="Curva de avance acumulado"
      pregunta="¿Cómo se reparte la carga de obra en el plazo? Medida en días-actividad, no en dinero."
    >
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img" aria-label="Curva de avance acumulado de la obra">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line
              x1={MARGEN.i}
              y1={MARGEN.s + util.alto * (1 - f)}
              x2={ANCHO - MARGEN.d}
              y2={MARGEN.s + util.alto * (1 - f)}
              stroke="var(--color-borde)"
              strokeWidth="0.7"
            />
            <text x={MARGEN.i - 8} y={MARGEN.s + util.alto * (1 - f) + 4} textAnchor="end" fontSize="10" fill="var(--color-tinta-debil)">
              {Math.round(f * 100)} %
            </text>
          </g>
        ))}

        {/* Referencia lineal: separarse de ella es tener la carga concentrada. */}
        <line
          x1={MARGEN.i}
          y1={MARGEN.s + util.alto}
          x2={MARGEN.i + util.ancho}
          y2={MARGEN.s}
          stroke="var(--color-tinta-debil)"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity="0.5"
        />

        <path d={relleno} fill="var(--color-acento)" opacity="0.14" />
        <path d={trazo} fill="none" stroke="var(--color-acento)" strokeWidth="2.4" strokeLinejoin="round" />

        <text x={MARGEN.i} y={ALTO - 16} fontSize="10" fill="var(--color-tinta-debil)">
          Día 0
        </text>
        <text x={ANCHO - MARGEN.d} y={ALTO - 16} textAnchor="end" fontSize="10" fill="var(--color-tinta-debil)">
          Día {programa.duracionDias}
        </text>
        <text x={ANCHO / 2} y={ALTO - 3} textAnchor="middle" fontSize="9.5" fill="var(--color-tinta-debil)">
          La diagonal punteada es el reparto uniforme, para comparar
        </text>
      </svg>
    </Figura>
  );
}

/* ------------------------------------------------------- Superficie 3D -- */

function Superficie({ viabilidad }: { viabilidad: Viabilidad }) {
  const ANCHO = 520;
  const ALTO = 340;

  const superficie = useMemo(() => superficieDeSeveridad(viabilidad.riesgos), [viabilidad.riesgos]);

  const proyectar = (
    v: { probabilidad: number; impacto: number; severidad: number },
    desplazamiento = 0,
  ) => proyectarIsometrico(v, ANCHO, ALTO, superficie.severidadMaxima, desplazamiento);

  // Las caras se pintan de fondo hacia delante para que se tapen bien: sin
  // orden, una cara lejana se dibujaría encima de una cercana.
  const caras: { d: string; severidad: number; profundidad: number }[] = [];
  for (let i = 0; i < superficie.malla.length - 1; i++) {
    for (let j = 0; j < superficie.malla[i].length - 1; j++) {
      const esquinas = [
        superficie.malla[i][j],
        superficie.malla[i][j + 1],
        superficie.malla[i + 1][j + 1],
        superficie.malla[i + 1][j],
      ];
      const puntos = esquinas.map((e) => proyectar(e));
      caras.push({
        d: `M${puntos.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("L")}Z`,
        severidad: esquinas.reduce((s, e) => s + e.severidad, 0) / 4,
        profundidad: -(i + j),
      });
    }
  }
  caras.sort((a, b) => b.profundidad - a.profundidad);

  const color = (severidad: number) =>
    severidad >= 15
      ? "var(--color-critico)"
      : severidad >= 9
        ? "var(--color-alto)"
        : severidad >= 4
          ? "var(--color-medio)"
          : "var(--color-acento)";

  return (
    <Figura
      titulo="Superficie 3D de severidad"
      pregunta="¿Hacia dónde se dispara el riesgo? La altura es probabilidad × impacto; los puntos son los riesgos reales."
      ancho
    >
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img" aria-label="Superficie tridimensional de severidad del riesgo">
        {caras.map((cara, i) => (
          <path
            key={i}
            d={cara.d}
            fill={color(cara.severidad)}
            opacity={0.18 + 0.5 * (cara.severidad / superficie.severidadMaxima)}
            stroke="var(--color-borde)"
            strokeWidth="0.5"
          />
        ))}

        {superficie.riesgos.map((riesgo) => {
          const arriba = proyectar(riesgo, riesgo.desplazamiento);
          const suelo = proyectar({ ...riesgo, severidad: 0 }, riesgo.desplazamiento);
          return (
            <g key={riesgo.id}>
              <line
                x1={suelo.x}
                y1={suelo.y}
                x2={arriba.x}
                y2={arriba.y}
                stroke="var(--color-tinta-debil)"
                strokeWidth="0.8"
                strokeDasharray="2 3"
              />
              <circle cx={arriba.x} cy={arriba.y} r="5" fill="var(--color-superficie)" stroke={color(riesgo.severidad)} strokeWidth="2.2">
                <title>{`${riesgo.id} · ${riesgo.titulo}\nP${riesgo.probabilidad} × I${riesgo.impacto} = ${riesgo.severidad}`}</title>
              </circle>
              <text x={arriba.x} y={arriba.y - 9} textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--color-tinta)">
                {riesgo.id}
              </text>
            </g>
          );
        })}

        {/* Rótulos de los ejes en las esquinas del plano base. */}
        <text {...esquina(proyectar, 5, 1)} textAnchor="end" fontSize="10" fill="var(--color-tinta-debil)">
          Probabilidad 5
        </text>
        <text {...esquina(proyectar, 1, 5)} textAnchor="start" fontSize="10" fill="var(--color-tinta-debil)">
          Impacto 5
        </text>
        <text {...esquina(proyectar, 1, 1)} textAnchor="middle" fontSize="10" fill="var(--color-tinta-debil)">
          1 · 1
        </text>
      </svg>
    </Figura>
  );
}

/** Punto del plano base (severidad cero) donde colgar un rótulo de eje. */
function esquina(
  proyectar: (v: { probabilidad: number; impacto: number; severidad: number }) => { x: number; y: number },
  probabilidad: number,
  impacto: number,
): { x: number; y: number } {
  const p = proyectar({ probabilidad, impacto, severidad: 0 });
  return { x: p.x, y: p.y + 14 };
}
