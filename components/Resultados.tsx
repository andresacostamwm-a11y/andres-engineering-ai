"use client";

import { Fragment, useMemo, useState } from "react";
import type { Analisis, Hallazgo, Partida, Requerimiento } from "@/lib/types";
import { ETIQUETA_DISCIPLINA } from "@/lib/types";
import { numero, pesos, pesosExactos } from "@/lib/formato";
import {
  InsigniaCritico,
  InsigniaDisciplina,
  InsigniaRiesgo,
} from "./Insignias";

/* ---------------------------------------------------------------- Resumen -- */

export function PanelResumen({ analisis }: { analisis: Analisis }) {
  const resumen = analisis.resumen;
  if (!resumen) return null;

  return (
    <section className="aparecer overflow-hidden rounded-xl border border-borde bg-superficie">
      <div className="border-b border-borde-suave bg-superficie-alta/60 px-5 py-4 sm:px-7">
        <span className="etiqueta-seccion">Resumen ejecutivo</span>
        <h2 className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">
          {resumen.titulo}
        </h2>
        <p className="mt-1 text-sm text-tinta-media">
          {resumen.tipoProyecto}
          {resumen.ubicacion ? ` · ${resumen.ubicacion}` : ""}
        </p>
      </div>

      <dl className="grid grid-cols-2 divide-x divide-borde-suave border-b border-borde-suave lg:grid-cols-4">
        <Metrica etiqueta="Presupuesto estimado" valor={pesos(resumen.totalEstimado)} destacada />
        <Metrica etiqueta="Requerimientos" valor={String(analisis.requerimientos.length)} />
        <Metrica etiqueta="Partidas" valor={String(analisis.partidas.length)} />
        <div className="px-5 py-4 sm:px-7">
          <dt className="etiqueta-seccion">Riesgo global</dt>
          <dd className="mt-2">
            <InsigniaRiesgo riesgo={resumen.riesgoGlobal} grande />
          </dd>
        </div>
      </dl>

      <div className="grid gap-7 px-5 py-6 sm:px-7 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <h3 className="etiqueta-seccion">Síntesis</h3>
          <p className="mt-2.5 text-[0.95rem] leading-relaxed text-tinta-media">
            {resumen.sintesis}
          </p>
        </div>

        <div>
          <h3 className="etiqueta-seccion">Acciones recomendadas</h3>
          <ol className="mt-2.5 space-y-2.5">
            {resumen.recomendaciones.map((rec, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-tinta-media">
                <span className="cifra mt-0.5 shrink-0 text-xs text-acento">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {rec}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {resumen.supuestos.length > 0 && (
        <div className="border-t border-borde-suave bg-superficie-alta/40 px-5 py-5 sm:px-7">
          <h3 className="etiqueta-seccion">
            Supuestos asumidos ({resumen.supuestos.length})
          </h3>
          <ul className="mt-2.5 grid gap-1.5 text-sm text-tinta-debil sm:grid-cols-2">
            {resumen.supuestos.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden="true">—</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Metrica({
  etiqueta,
  valor,
  destacada = false,
}: {
  etiqueta: string;
  valor: string;
  destacada?: boolean;
}) {
  return (
    <div className="px-5 py-4 sm:px-7">
      <dt className="etiqueta-seccion">{etiqueta}</dt>
      <dd
        className={`cifra mt-1.5 font-semibold ${
          destacada ? "text-2xl text-acento" : "text-2xl"
        }`}
      >
        {valor}
      </dd>
    </div>
  );
}

/* -------------------------------------------------------- Requerimientos -- */

export function TablaRequerimientos({ datos }: { datos: Requerimiento[] }) {
  const [expandido, setExpandido] = useState<string | null>(null);
  if (datos.length === 0) return null;

  return (
    <Bloque
      titulo="Requerimientos detectados"
      subtitulo={`${datos.filter((r) => r.critico).length} de ${datos.length} marcados como críticos. Cada renglón conserva la cita del documento.`}
    >
      <ul className="divide-y divide-borde-suave">
        {datos.map((req) => {
          const abierto = expandido === req.id;
          return (
            <li key={req.id}>
              <button
                type="button"
                onClick={() => setExpandido(abierto ? null : req.id)}
                aria-expanded={abierto}
                className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-superficie-alta/60 sm:px-7"
              >
                <span className="cifra mt-0.5 shrink-0 text-xs text-tinta-debil">
                  {req.id}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-relaxed">
                    {req.descripcion}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-2">
                    <InsigniaDisciplina disciplina={req.disciplina} />
                    {req.critico && <InsigniaCritico />}
                    <span className="text-[0.6875rem] text-tinta-debil">
                      {abierto ? "Ocultar evidencia" : "Ver evidencia"}
                    </span>
                  </span>
                </span>
              </button>

              {abierto && (
                <blockquote className="mx-5 mb-4 border-l-2 border-acento/60 bg-superficie-alta/50 px-4 py-3 text-sm italic text-tinta-media sm:mx-7">
                  “{req.evidencia}”
                  {req.pagina !== null && (
                    <cite className="mt-1.5 block not-italic text-[0.6875rem] text-tinta-debil">
                      Documento fuente, página {req.pagina}
                    </cite>
                  )}
                </blockquote>
              )}
            </li>
          );
        })}
      </ul>
    </Bloque>
  );
}

/* ------------------------------------------------------------ Presupuesto -- */

export function TablaPresupuesto({ datos }: { datos: Partida[] }) {
  const [detalle, setDetalle] = useState<string | null>(null);

  const total = useMemo(
    () => datos.reduce((s, p) => s + p.importe, 0),
    [datos],
  );
  const porDisciplina = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const p of datos) {
      mapa.set(p.disciplina, (mapa.get(p.disciplina) ?? 0) + p.importe);
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [datos]);

  if (datos.length === 0) return null;

  return (
    <Bloque
      titulo="Catálogo de conceptos"
      subtitulo={`${datos.length} partidas. Toca una fila para ver su matriz de precio unitario.`}
    >
      {/* Distribución del importe por disciplina: una barra apilada dice más
          que un pastel de siete rebanadas. */}
      <div className="border-b border-borde-suave px-5 py-4 sm:px-7">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-superficie-alta">
          {porDisciplina.map(([disciplina, importe], i) => (
            <span
              key={disciplina}
              className="h-full"
              style={{
                width: `${(importe / total) * 100}%`,
                backgroundColor: `color-mix(in oklch, var(--color-acento) ${92 - i * 12}%, var(--color-superficie-alta))`,
              }}
              title={`${ETIQUETA_DISCIPLINA[disciplina as keyof typeof ETIQUETA_DISCIPLINA]}: ${pesos(importe)}`}
            />
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
          {porDisciplina.map(([disciplina, importe], i) => (
            <li
              key={disciplina}
              className="flex items-center gap-1.5 text-[0.6875rem] text-tinta-media"
            >
              <span
                className="size-2 rounded-sm"
                style={{
                  backgroundColor: `color-mix(in oklch, var(--color-acento) ${92 - i * 12}%, var(--color-superficie-alta))`,
                }}
                aria-hidden="true"
              />
              {ETIQUETA_DISCIPLINA[disciplina as keyof typeof ETIQUETA_DISCIPLINA]}
              <span className="cifra text-tinta-debil">
                {Math.round((importe / total) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-borde bg-superficie-alta/50 text-left">
              <Th className="w-[4.5rem]">Clave</Th>
              <Th>Concepto</Th>
              <Th className="w-20 text-center">Unidad</Th>
              <Th className="w-24 text-right">Cantidad</Th>
              <Th className="w-32 text-right">P. unitario</Th>
              <Th className="w-36 text-right">Importe</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borde-suave">
            {datos.map((p) => {
              const abierto = detalle === p.clave;
              return (
                <Fragment key={p.clave}>
                <tr
                  onClick={() => setDetalle(abierto ? null : p.clave)}
                  className={`cursor-pointer transition-colors hover:bg-superficie-alta/60 ${
                    abierto ? "bg-superficie-alta/70" : ""
                  }`}
                >
                  <td className="cifra px-5 py-2.5 text-xs text-tinta-debil sm:px-7">
                    {p.clave}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="block leading-snug">{p.concepto}</span>
                    {p.supuesto && (
                      <span className="mt-1 block text-[0.6875rem] text-alto">
                        Supuesto: {p.supuesto}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs text-tinta-media">
                    {p.unidad}
                  </td>
                  <td className="cifra px-3 py-2.5 text-right">
                    {numero(p.cantidad)}
                  </td>
                  <td className="cifra px-3 py-2.5 text-right text-tinta-media">
                    {pesosExactos(p.precioUnitario)}
                  </td>
                  <td className="cifra px-5 py-2.5 text-right font-medium sm:px-7">
                    {pesosExactos(p.importe)}
                  </td>
                </tr>
                {abierto && (
                  <tr className="bg-superficie-alta/40">
                    <td colSpan={6} className="px-5 py-4 sm:px-7">
                      <span className="etiqueta-seccion">
                        Matriz de precio unitario · {pesosExactos(p.precioUnitario)}
                      </span>
                      <div className="mt-3 grid gap-3 sm:grid-cols-4">
                        <Componente etiqueta="Materiales" valor={p.matriz.materiales} pu={p.precioUnitario} />
                        <Componente etiqueta="Mano de obra" valor={p.matriz.manoObra} pu={p.precioUnitario} />
                        <Componente etiqueta="Equipo" valor={p.matriz.equipo} pu={p.precioUnitario} />
                        <Componente etiqueta="Indirectos" valor={p.matriz.indirectos} pu={p.precioUnitario} />
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-acento/40 bg-superficie-alta/70">
              <td colSpan={5} className="px-5 py-3.5 text-right font-semibold sm:px-7">
                Total estimado
              </td>
              <td className="cifra px-5 py-3.5 text-right text-lg font-semibold text-acento sm:px-7">
                {pesosExactos(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Bloque>
  );
}

function Componente({
  etiqueta,
  valor,
  pu,
}: {
  etiqueta: string;
  valor: number;
  pu: number;
}) {
  const porcentaje = pu > 0 ? Math.round((valor / pu) * 100) : 0;
  return (
    <div className="rounded-md border border-borde-suave bg-superficie px-3 py-2.5">
      <p className="etiqueta-seccion">{etiqueta}</p>
      <p className="cifra mt-1 font-medium">{pesosExactos(valor)}</p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-superficie-alta">
        <div
          className="h-full rounded-full bg-acento/70"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      <p className="cifra mt-1 text-[0.6875rem] text-tinta-debil">{porcentaje}%</p>
    </div>
  );
}

/* --------------------------------------------------------------- Hallazgos -- */

const ORDEN_RIESGO = { critico: 0, alto: 1, medio: 2, bajo: 3 } as const;

export function ListaHallazgos({ datos }: { datos: Hallazgo[] }) {
  const ordenados = useMemo(
    () => [...datos].sort((a, b) => ORDEN_RIESGO[a.riesgo] - ORDEN_RIESGO[b.riesgo]),
    [datos],
  );
  if (datos.length === 0) return null;

  const criticos = datos.filter((h) => h.riesgo === "critico").length;

  return (
    <Bloque
      titulo="Hallazgos normativos"
      subtitulo={
        criticos > 0
          ? `${criticos} hallazgo${criticos > 1 ? "s" : ""} crítico${criticos > 1 ? "s" : ""} de ${datos.length}. Los críticos impiden recibir la obra.`
          : `${datos.length} hallazgos, ninguno crítico.`
      }
    >
      <ul className="divide-y divide-borde-suave">
        {ordenados.map((h) => (
          <li key={h.id} className="px-5 py-4 sm:px-7">
            <div className="flex flex-wrap items-center gap-2.5">
              <InsigniaRiesgo riesgo={h.riesgo} />
              <h3 className="text-sm font-medium">{h.titulo}</h3>
            </div>

            <p className="cifra mt-1.5 text-[0.6875rem] text-acento">
              {h.norma}
              {h.articulo ? ` · ${h.articulo}` : ""}
            </p>

            <p className="mt-2 text-sm leading-relaxed text-tinta-media">
              {h.descripcion}
            </p>

            <p className="mt-2.5 flex gap-2.5 rounded-md border-l-2 border-acento/50 bg-superficie-alta/50 px-3.5 py-2.5 text-sm text-tinta-media">
              <span className="etiqueta-seccion shrink-0 pt-0.5">Acción</span>
              {h.recomendacion}
            </p>
          </li>
        ))}
      </ul>
    </Bloque>
  );
}

/* ------------------------------------------------------------- Envoltorios -- */

function Bloque({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="aparecer overflow-hidden rounded-xl border border-borde bg-superficie">
      <header className="border-b border-borde-suave px-5 py-4 sm:px-7">
        <h2 className="text-base font-semibold tracking-tight">{titulo}</h2>
        <p className="mt-0.5 text-xs text-tinta-debil">{subtitulo}</p>
      </header>
      {children}
    </section>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-3 py-2.5 text-[0.6875rem] font-medium uppercase tracking-wider text-tinta-debil first:pl-5 last:pr-5 sm:first:pl-7 sm:last:pr-7 ${className}`}
    >
      {children}
    </th>
  );
}
