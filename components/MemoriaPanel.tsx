"use client";

import { useState } from "react";
import type { Proyecto } from "@/lib/tipos-proyecto";
import { exportarMemoriaPdf } from "@/lib/exportar-memoria-pdf";

/**
 * Memoria técnica del proyecto: descriptiva y de cálculo por instalación.
 * Cada sistema se pliega de forma independiente; el primero llega abierto para
 * que la memoria se vea, no que haya que descubrirla.
 */
export function MemoriaPanel({ proyecto }: { proyecto: Proyecto }) {
  const memoria = proyecto.memoria;
  const [abiertos, setAbiertos] = useState<Set<number>>(new Set([0]));

  if (!memoria) return null;

  function alternar(i: number) {
    setAbiertos((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(i)) siguiente.delete(i);
      else siguiente.add(i);
      return siguiente;
    });
  }

  return (
    <section className="aparecer overflow-hidden rounded-xl border border-borde bg-superficie shadow-[var(--shadow-tarjeta)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-borde-suave px-5 py-4 sm:px-7">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Memoria técnica del proyecto
          </h2>
          <p className="mt-0.5 text-xs text-tinta-debil">
            Descriptiva y de cálculo · {memoria.sistemas.length} instalación
            {memoria.sistemas.length === 1 ? "" : "es"} ·{" "}
            {memoria.sistemas.reduce((s, x) => s + x.calculos.length, 0)} cálculos
            justificativos
          </p>
        </div>
        <button
          type="button"
          onClick={() => exportarMemoriaPdf(proyecto)}
          className="rounded-md bg-acento px-3.5 py-2 text-sm font-medium text-sobre-acento shadow-[var(--shadow-acento)] transition-opacity hover:opacity-90"
        >
          Descargar memoria PDF
        </button>
      </header>

      <div className="space-y-5 px-5 py-5 sm:px-7">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="etiqueta-seccion">Objeto</p>
            <p className="mt-1.5 text-sm leading-relaxed text-tinta-media">
              {memoria.objeto}
            </p>
          </div>
          <div>
            <p className="etiqueta-seccion">Antecedentes</p>
            <p className="mt-1.5 text-sm leading-relaxed text-tinta-media">
              {memoria.antecedentes}
            </p>
          </div>
        </div>

        <div>
          <p className="etiqueta-seccion">Normativa aplicable</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {memoria.normativa.map((n, i) => (
              <li
                key={i}
                className="rounded-full border border-acento/25 bg-acento-tenue/60 px-3 py-1 text-xs text-tinta-media"
              >
                {n}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          {memoria.sistemas.map((sistema, i) => {
            const abierto = abiertos.has(i);
            return (
              <article
                key={i}
                className="overflow-hidden rounded-lg border border-borde-suave bg-superficie-alta/50"
              >
                <button
                  type="button"
                  onClick={() => alternar(i)}
                  aria-expanded={abierto}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-acento-tenue/40 sm:px-5"
                >
                  <span className="flex items-baseline gap-2.5">
                    <span className="cifra text-xs text-acento">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-semibold tracking-tight">
                      {sistema.nombre}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="cifra hidden text-[0.6875rem] text-tinta-debil sm:inline">
                      {sistema.calculos.length} cálculos
                    </span>
                    <svg
                      viewBox="0 0 16 16"
                      className={`size-4 shrink-0 text-tinta-debil transition-transform ${abierto ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M4 6l4 4 4-4" />
                    </svg>
                  </span>
                </button>

                {abierto && (
                  <div className="space-y-4 border-t border-borde-suave px-4 py-4 sm:px-5">
                    <p className="text-sm leading-relaxed text-tinta-media">
                      {sistema.descripcion}
                    </p>

                    {sistema.criterios.length > 0 && (
                      <div>
                        <p className="etiqueta-seccion">Criterios de diseño</p>
                        <ul className="mt-1.5 space-y-1 text-sm text-tinta-media">
                          {sistema.criterios.map((c, j) => (
                            <li key={j} className="flex gap-2">
                              <span className="shrink-0 text-acento">—</span>
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {sistema.calculos.length > 0 && (
                      <div>
                        <p className="etiqueta-seccion">Memoria de cálculo</p>
                        <div className="mt-2 overflow-x-auto rounded-lg border border-borde-suave">
                          <table className="w-full min-w-[40rem] text-left text-sm">
                            <thead>
                              <tr className="border-b border-borde-suave bg-superficie-alta text-[0.6875rem] uppercase tracking-wider text-tinta-debil">
                                <th className="px-3.5 py-2.5 font-medium">Concepto</th>
                                <th className="px-3.5 py-2.5 font-medium">Método</th>
                                <th className="px-3.5 py-2.5 font-medium">Datos</th>
                                <th className="px-3.5 py-2.5 font-medium">Resultado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-borde-suave">
                              {sistema.calculos.map((calc, j) => (
                                <tr key={j} className="align-top">
                                  <td className="px-3.5 py-2.5 font-medium">{calc.concepto}</td>
                                  <td className="cifra px-3.5 py-2.5 text-xs text-tinta-media">
                                    {calc.metodo}
                                  </td>
                                  <td className="cifra px-3.5 py-2.5 text-xs text-tinta-media">
                                    {calc.datos}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-sm font-medium text-acento">
                                    {calc.resultado}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {sistema.especificaciones.length > 0 && (
                      <div>
                        <p className="etiqueta-seccion">Especificaciones</p>
                        <ul className="mt-1.5 space-y-1 text-sm text-tinta-media">
                          {sistema.especificaciones.map((e, j) => (
                            <li key={j} className="flex gap-2">
                              <span className="shrink-0 text-laton">—</span>
                              {e}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <div className="rounded-lg border border-laton/25 bg-laton-tenue/50 px-4 py-3">
          <p className="etiqueta-seccion text-laton">Conclusiones</p>
          <p className="mt-1.5 text-sm leading-relaxed text-tinta-media">
            {memoria.conclusiones}
          </p>
        </div>
      </div>
    </section>
  );
}
