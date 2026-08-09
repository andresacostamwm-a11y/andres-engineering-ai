"use client";

import type { RiesgoEvaluado, Viabilidad } from "@/lib/tipos-proyecto";
import type { Moneda } from "@/lib/moneda/tipos";
import { dinero, porcentajeConSigno } from "@/lib/formato";

/**
 * Riesgos y viabilidad económica.
 *
 * La matriz 5×5 es la pieza central: un riesgo aislado no dice nada, la nube de
 * riesgos sobre el plano probabilidad-impacto dice de un vistazo si el proyecto
 * carga su peligro en la esquina que importa. Debajo, los escenarios se calculan
 * sobre el presupuesto real, no sobre una cifra redonda.
 */

const NIVEL_ESTILO: Record<RiesgoEvaluado["nivel"], string> = {
  critico: "bg-critico-tenue text-critico border-critico/30",
  alto: "bg-alto-tenue text-alto border-alto/30",
  medio: "bg-superficie-alta text-tinta-media border-borde",
  bajo: "bg-superficie-alta text-tinta-debil border-borde",
};

const NIVEL_ETIQUETA: Record<RiesgoEvaluado["nivel"], string> = {
  critico: "Crítico",
  alto: "Alto",
  medio: "Medio",
  bajo: "Bajo",
};

/** Color de fondo de cada celda de la matriz, según su severidad. */
function tonoCelda(severidad: number): string {
  if (severidad >= 15) return "var(--color-critico)";
  if (severidad >= 9) return "var(--color-alto)";
  if (severidad >= 4) return "var(--color-acento)";
  return "var(--color-borde)";
}

export function RiesgosPanel({
  viabilidad,
  moneda,
}: {
  viabilidad: Viabilidad;
  moneda: Moneda;
}) {
  const { riesgos, sensibilidad, veredicto, condiciones } = viabilidad;

  // Un riesgo por celda: la matriz muestra cuántos caen en cada intersección.
  const celdas = new Map<string, RiesgoEvaluado[]>();
  for (const riesgo of riesgos) {
    const clave = `${riesgo.probabilidad}-${riesgo.impacto}`;
    celdas.set(clave, [...(celdas.get(clave) ?? []), riesgo]);
  }

  const desviacionPct =
    sensibilidad.base > 0
      ? ((sensibilidad.pesimista - sensibilidad.base) / sensibilidad.base) * 100
      : 0;

  return (
    <section className="aparecer overflow-hidden rounded-xl border border-borde bg-superficie shadow-[var(--shadow-tarjeta)]">
      <header className="border-b border-borde-suave px-5 py-4 sm:px-7">
        <h2 className="text-base font-semibold tracking-tight">Riesgos y viabilidad</h2>
        <p className="mt-0.5 text-xs text-tinta-debil">
          {riesgos.length} riesgos identificados ·{" "}
          {riesgos.filter((r) => r.nivel === "critico").length} críticos · contingencia
          sugerida {sensibilidad.contingenciaPct} %
        </p>
      </header>

      <div className="grid gap-6 px-5 py-6 lg:grid-cols-[auto_1fr] sm:px-7">
        {/* Matriz probabilidad × impacto. */}
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-tinta-media">
            Matriz probabilidad × impacto
          </h3>
          <div className="flex gap-2">
            <div className="flex flex-col justify-between py-1 text-[10px] text-tinta-debil">
              <span>5</span>
              <span>4</span>
              <span>3</span>
              <span>2</span>
              <span>1</span>
            </div>
            <div>
              <div className="grid grid-cols-5 gap-1">
                {[5, 4, 3, 2, 1].map((probabilidad) =>
                  [1, 2, 3, 4, 5].map((impacto) => {
                    const dentro = celdas.get(`${probabilidad}-${impacto}`) ?? [];
                    const severidad = probabilidad * impacto;
                    return (
                      <div
                        key={`${probabilidad}-${impacto}`}
                        title={
                          dentro.length
                            ? dentro.map((r) => `${r.id} · ${r.titulo}`).join("\n")
                            : `Probabilidad ${probabilidad} × impacto ${impacto}`
                        }
                        className="flex size-11 items-center justify-center rounded-md text-xs font-semibold"
                        style={{
                          backgroundColor: tonoCelda(severidad),
                          opacity: dentro.length ? 1 : 0.16,
                          color: dentro.length ? "var(--color-sobre-acento)" : "transparent",
                        }}
                      >
                        {dentro.length || ""}
                      </div>
                    );
                  }),
                )}
              </div>
              <div className="mt-1 grid grid-cols-5 gap-1 text-center text-[10px] text-tinta-debil">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i}>{i}</span>
                ))}
              </div>
              <p className="mt-1.5 text-center text-[10px] uppercase tracking-wider text-tinta-debil">
                Impacto →
              </p>
            </div>
          </div>
        </div>

        {/* Escenarios económicos. */}
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-tinta-media">
            Sensibilidad del presupuesto
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Escenario
              titulo="Optimista"
              valor={sensibilidad.optimista}
              moneda={moneda}
              base={sensibilidad.base}
            />
            <Escenario
              titulo="Base"
              valor={sensibilidad.base}
              moneda={moneda}
              base={sensibilidad.base}
              destacado
            />
            <Escenario
              titulo="Pesimista"
              valor={sensibilidad.pesimista}
              moneda={moneda}
              base={sensibilidad.base}
            />
          </div>

          <p className="mt-3 text-xs leading-relaxed text-tinta-debil">
            El escenario pesimista suma la exposición de todas las variables a la vez
            ({porcentajeConSigno(desviacionPct)} sobre el presupuesto base). El optimista
            recupera solo una parte: en obra los sobrecostos ocurren con más frecuencia que
            los ahorros.
          </p>

          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-tinta-debil">
              <tr>
                <th className="pb-2 font-medium">Variable</th>
                <th className="pb-2 text-right font-medium">Variación</th>
                <th className="pb-2 text-right font-medium">Peso</th>
              </tr>
            </thead>
            <tbody>
              {sensibilidad.variables.map((v) => (
                <tr key={v.concepto} className="border-t border-borde-suave align-top">
                  <td className="py-2 pr-3">
                    <span className="text-tinta">{v.concepto}</span>
                    <span className="block text-xs leading-relaxed text-tinta-debil">
                      {v.justificacion}
                    </span>
                  </td>
                  <td className="py-2 text-right tabular-nums text-tinta">
                    {v.variacionPct} %
                  </td>
                  <td className="py-2 text-right tabular-nums text-tinta-media">
                    {v.pesoPct} %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registro de riesgos. */}
      <div className="border-t border-borde-suave px-5 py-5 sm:px-7">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-tinta-media">
          Registro de riesgos
        </h3>
        <ul className="space-y-2.5">
          {[...riesgos]
            .sort((a, b) => b.severidad - a.severidad)
            .map((riesgo) => (
              <li
                key={riesgo.id}
                className={`rounded-lg border px-4 py-3 ${NIVEL_ESTILO[riesgo.nivel]}`}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {NIVEL_ETIQUETA[riesgo.nivel]}
                  </span>
                  <span className="text-sm font-medium text-tinta">{riesgo.titulo}</span>
                  <span className="ml-auto text-xs tabular-nums text-tinta-debil">
                    {riesgo.categoria} · P{riesgo.probabilidad}×I{riesgo.impacto} ={" "}
                    {riesgo.severidad}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-tinta-media">
                  {riesgo.descripcion}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-tinta-media">
                  <span className="font-medium text-tinta">Mitigación:</span>{" "}
                  {riesgo.mitigacion}{" "}
                  <span className="text-tinta-debil">({riesgo.responsable})</span>
                </p>
              </li>
            ))}
        </ul>
      </div>

      <div className="border-t border-borde-suave bg-superficie-alta/50 px-5 py-5 sm:px-7">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-tinta-media">
          Veredicto de viabilidad
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-tinta">{veredicto}</p>
        {condiciones.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-tinta-media">
            {condiciones.map((c) => (
              <li key={c} className="flex gap-2">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-acento" aria-hidden />
                {c}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Escenario({
  titulo,
  valor,
  moneda,
  base,
  destacado = false,
}: {
  titulo: string;
  valor: number;
  moneda: Moneda;
  base: number;
  destacado?: boolean;
}) {
  const delta = base > 0 ? ((valor - base) / base) * 100 : 0;
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        destacado ? "border-acento/40 bg-acento-tenue" : "border-borde bg-superficie-alta"
      }`}
    >
      <p className="text-xs uppercase tracking-wider text-tinta-debil">{titulo}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-tinta">
        {dinero({ valor, moneda })}
      </p>
      <p className="text-xs tabular-nums text-tinta-debil">
        {Math.abs(delta) < 0.05 ? "referencia" : porcentajeConSigno(delta)}
      </p>
    </div>
  );
}
