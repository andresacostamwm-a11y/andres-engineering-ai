"use client";

import type { ProgramaObra } from "@/lib/tipos-proyecto";

/**
 * Cronograma de obra con diagrama de Gantt.
 *
 * El Gantt se dibuja en SVG con las mismas variables de tema que el resto de la
 * aplicación: se ve igual en claro y en oscuro, escala a cualquier ancho y se
 * puede exportar como imagen sin depender de una librería de gráficos.
 *
 * La ruta crítica va destacada porque es la única lectura que cambia decisiones:
 * retrasar una actividad crítica retrasa la entrega, y retrasar cualquier otra
 * no.
 */

/** Alto de cada carril del Gantt, en unidades del viewBox. */
const CARRIL = 26;
/** Ancho reservado a las etiquetas de actividad. */
const ETIQUETAS = 250;
/** Ancho del área de barras. */
const PISTA = 700;
const MARGEN_SUPERIOR = 34;

export function CronogramaPanel({ programa }: { programa: ProgramaObra }) {
  const { actividades, duracionDias, rutaCritica, supuestos, avisos } = programa;
  if (actividades.length === 0) return null;

  const alto = MARGEN_SUPERIOR + actividades.length * CARRIL + 16;
  const ancho = ETIQUETAS + PISTA + 60;
  const escala = duracionDias > 0 ? PISTA / duracionDias : 0;

  // Una marca por mes de 30 días: es la unidad con la que se habla de una obra.
  const meses = Math.max(1, Math.ceil(duracionDias / 30));
  const marcas = Array.from({ length: meses + 1 }, (_, i) => i * 30).filter(
    (d) => d <= duracionDias || d === 0,
  );

  const criticas = new Set(rutaCritica);

  return (
    <section className="aparecer overflow-hidden rounded-xl border border-borde bg-superficie shadow-[var(--shadow-tarjeta)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-borde-suave px-5 py-4 sm:px-7">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Programa de obra</h2>
          <p className="mt-0.5 text-xs text-tinta-debil">
            {actividades.length} actividades · {duracionDias} días naturales ·{" "}
            {rutaCritica.length} en ruta crítica
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-tinta-media">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-critico" aria-hidden />
            Ruta crítica
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-acento" aria-hidden />
            Con holgura
          </span>
        </div>
      </header>

      <div className="overflow-x-auto px-2 py-4 sm:px-4">
        <svg
          viewBox={`0 0 ${ancho} ${alto}`}
          className="h-auto w-full min-w-[46rem]"
          role="img"
          aria-label={`Diagrama de Gantt de ${actividades.length} actividades con una duración total de ${duracionDias} días`}
        >
          {/* Rejilla mensual y encabezado. */}
          {marcas.map((dia) => (
            <g key={dia}>
              <line
                x1={ETIQUETAS + dia * escala}
                y1={MARGEN_SUPERIOR - 12}
                x2={ETIQUETAS + dia * escala}
                y2={alto - 8}
                stroke="var(--color-borde-suave)"
                strokeWidth="1"
              />
              <text
                x={ETIQUETAS + dia * escala}
                y={MARGEN_SUPERIOR - 18}
                textAnchor="middle"
                fontSize="10"
                fill="var(--color-tinta-debil)"
              >
                {dia === 0 ? "Inicio" : `Mes ${dia / 30}`}
              </text>
            </g>
          ))}

          {actividades.map((actividad, i) => {
            const y = MARGEN_SUPERIOR + i * CARRIL;
            const x = ETIQUETAS + actividad.inicio * escala;
            const largo = Math.max(3, actividad.duracionDias * escala);
            const critica = criticas.has(actividad.id);

            return (
              <g key={actividad.id}>
                {i % 2 === 1 && (
                  <rect
                    x={0}
                    y={y - 4}
                    width={ancho}
                    height={CARRIL}
                    fill="var(--color-superficie-alta)"
                    opacity="0.5"
                  />
                )}

                <text
                  x={8}
                  y={y + 13}
                  fontSize="11"
                  fill="var(--color-tinta)"
                  className="tabular-nums"
                >
                  {recortar(`${actividad.id} · ${actividad.nombre}`, 40)}
                </text>

                {actividad.hito ? (
                  // Un hito no dura: se dibuja como rombo en su fecha.
                  <polygon
                    points={`${x},${y + 3} ${x + 8},${y + 11} ${x},${y + 19} ${x - 8},${y + 11}`}
                    fill="var(--color-acento)"
                  />
                ) : (
                  <rect
                    x={x}
                    y={y + 4}
                    width={largo}
                    height={14}
                    rx="3"
                    fill={critica ? "var(--color-critico)" : "var(--color-acento)"}
                    opacity={critica ? "0.9" : "0.75"}
                  />
                )}

                <text
                  x={x + largo + 8}
                  y={y + 15}
                  fontSize="9.5"
                  fill="var(--color-tinta-debil)"
                  className="tabular-nums"
                >
                  {actividad.hito
                    ? "hito"
                    : `${actividad.duracionDias} d${actividad.holgura > 0 ? ` · h ${actividad.holgura}` : ""}`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="grid gap-5 border-t border-borde-suave px-5 py-5 sm:grid-cols-2 sm:px-7">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-tinta-media">
            Supuestos del programa
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-tinta-media">
            {supuestos.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-acento" aria-hidden />
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-tinta-media">
            Ruta crítica
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-tinta-media">
            {rutaCritica.length === 0
              ? "Ninguna actividad quedó sin holgura."
              : `Las actividades ${rutaCritica.join(", ")} no admiten retraso: cualquier día perdido en ellas se traslada íntegro a la fecha de entrega.`}
          </p>
          {avisos.length > 0 && (
            <>
              <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-tinta-media">
                Correcciones al encadenado
              </h3>
              <ul className="mt-2 space-y-1 text-xs leading-relaxed text-tinta-debil">
                {avisos.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function recortar(texto: string, maximo: number): string {
  return texto.length <= maximo ? texto : `${texto.slice(0, maximo - 1)}…`;
}
