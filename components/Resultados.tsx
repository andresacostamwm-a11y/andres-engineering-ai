"use client";

import { Fragment, useMemo, useState } from "react";
import type { Analisis, Disciplina, Hallazgo, NivelRiesgo, Partida, Requerimiento } from "@/lib/types";
import { ETIQUETA_DISCIPLINA } from "@/lib/types";
import { numero, pesos, pesosExactos } from "@/lib/formato";
import { Contador } from "./Contador";
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
    <section className="aparecer overflow-hidden rounded-xl border border-borde bg-superficie shadow-[var(--shadow-tarjeta)]">
      <div className="border-b border-borde-suave bg-gradient-to-br from-acento-tenue/70 to-superficie px-5 py-5 sm:px-7">
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
        <Metrica
          etiqueta="Presupuesto estimado"
          valor={resumen.totalEstimado}
          formato="pesos"
          destacada
        />
        <Metrica etiqueta="Requerimientos" valor={analisis.requerimientos.length} />
        <Metrica etiqueta="Partidas" valor={analisis.partidas.length} />
        <div className="px-5 py-4 sm:px-7">
          <dt className="etiqueta-seccion">Riesgo global</dt>
          <dd className="mt-2.5">
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
          <ol className="escalonado mt-2.5 space-y-2.5">
            {resumen.recomendaciones.map((rec, i) => (
              <li
                key={i}
                className="flex gap-3 text-sm leading-relaxed text-tinta-media"
              >
                <span className="cifra mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-acento-tenue text-[0.625rem] font-semibold text-acento">
                  {i + 1}
                </span>
                {rec}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {resumen.supuestos.length > 0 && (
        <div className="border-t border-borde-suave bg-superficie-alta px-5 py-5 sm:px-7">
          <h3 className="etiqueta-seccion">
            Supuestos asumidos ({resumen.supuestos.length})
          </h3>
          <ul className="mt-2.5 grid gap-1.5 text-sm text-tinta-media sm:grid-cols-2">
            {resumen.supuestos.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-laton" aria-hidden="true">
                  —
                </span>
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
  formato = "entero",
  destacada = false,
}: {
  etiqueta: string;
  valor: number;
  formato?: "entero" | "pesos";
  destacada?: boolean;
}) {
  return (
    <div className="px-5 py-4 sm:px-7">
      <dt className="etiqueta-seccion">{etiqueta}</dt>
      <dd
        className={`cifra mt-1.5 text-2xl font-semibold ${
          destacada ? "text-acento" : "text-tinta"
        }`}
      >
        {formato === "pesos" ? (
          <Contador hasta={valor} prefijo="$" duracion={1100} />
        ) : (
          <Contador hasta={valor} />
        )}
      </dd>
    </div>
  );
}

/* -------------------------------------------------------- Requerimientos -- */

export function TablaRequerimientos({ datos }: { datos: Requerimiento[] }) {
  const [expandido, setExpandido] = useState<string | null>(null);
  const [soloCriticos, setSoloCriticos] = useState(false);

  const visibles = soloCriticos ? datos.filter((r) => r.critico) : datos;
  const criticos = datos.filter((r) => r.critico).length;
  if (datos.length === 0) return null;

  return (
    <Bloque
      titulo="Requerimientos detectados"
      subtitulo={`${criticos} de ${datos.length} marcados como críticos. Cada renglón conserva la cita del documento.`}
      accion={
        <Interruptor
          activo={soloCriticos}
          onCambio={() => setSoloCriticos((v) => !v)}
          etiqueta="Solo críticos"
        />
      }
    >
      <ul className="divide-y divide-borde-suave">
        {visibles.map((req) => {
          const abierto = expandido === req.id;
          return (
            <li key={req.id}>
              <button
                type="button"
                onClick={() => setExpandido(abierto ? null : req.id)}
                aria-expanded={abierto}
                className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-acento-tenue/40 sm:px-7"
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
                    <span className="text-[0.6875rem] font-medium text-acento">
                      {abierto ? "Ocultar evidencia" : "Ver evidencia"}
                    </span>
                  </span>
                </span>
              </button>

              {abierto && (
                <blockquote className="aparecer mx-5 mb-4 rounded-r-md border-l-[3px] border-laton bg-laton-tenue px-4 py-3 text-sm italic text-tinta-media sm:mx-7">
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

type Orden = "clave" | "importe";

export function TablaPresupuesto({ datos }: { datos: Partida[] }) {
  const [detalle, setDetalle] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Disciplina | null>(null);
  const [orden, setOrden] = useState<Orden>("clave");

  const total = useMemo(() => datos.reduce((s, p) => s + p.importe, 0), [datos]);

  const porDisciplina = useMemo(() => {
    const mapa = new Map<Disciplina, number>();
    for (const p of datos) {
      mapa.set(p.disciplina, (mapa.get(p.disciplina) ?? 0) + p.importe);
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [datos]);

  const visibles = useMemo(() => {
    const filtradas = filtro ? datos.filter((p) => p.disciplina === filtro) : datos;
    return [...filtradas].sort((a, b) =>
      orden === "importe" ? b.importe - a.importe : a.clave.localeCompare(b.clave),
    );
  }, [datos, filtro, orden]);

  const totalVisible = useMemo(
    () => visibles.reduce((s, p) => s + p.importe, 0),
    [visibles],
  );

  if (datos.length === 0) return null;

  return (
    <Bloque
      titulo="Catálogo de conceptos"
      subtitulo={`${datos.length} partidas. Toca una fila para ver su matriz de precio unitario.`}
      accion={
        <div className="flex items-center gap-1 rounded-lg border border-borde bg-superficie-alta p-0.5">
          {(["clave", "importe"] as const).map((modo) => (
            <button
              key={modo}
              type="button"
              onClick={() => setOrden(modo)}
              className={`rounded-md px-2.5 py-1 text-[0.6875rem] font-medium transition-colors ${
                orden === modo
                  ? "bg-superficie text-acento shadow-[var(--shadow-sutil)]"
                  : "text-tinta-debil hover:text-tinta"
              }`}
            >
              {modo === "clave" ? "Por clave" : "Por importe"}
            </button>
          ))}
        </div>
      }
    >
      {/* Distribución por disciplina. Cada segmento filtra la tabla al pulsarlo:
          la leyenda deja de ser decorativa y se convierte en el control. */}
      <div className="border-b border-borde-suave px-5 py-4 sm:px-7">
        <div className="flex h-3 overflow-hidden rounded-full bg-superficie-honda">
          {porDisciplina.map(([disciplina, importe], i) => {
            const activo = filtro === null || filtro === disciplina;
            return (
              <button
                key={disciplina}
                type="button"
                onClick={() => setFiltro(filtro === disciplina ? null : disciplina)}
                className="crecer-ancho h-full transition-opacity duration-300"
                style={{
                  width: `${(importe / total) * 100}%`,
                  backgroundColor: tonoDisciplina(i),
                  opacity: activo ? 1 : 0.25,
                  animationDelay: `${i * 70}ms`,
                }}
                aria-label={`Filtrar por ${ETIQUETA_DISCIPLINA[disciplina]}: ${pesos(importe)}`}
                title={`${ETIQUETA_DISCIPLINA[disciplina]} · ${pesos(importe)}`}
              />
            );
          })}
        </div>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {porDisciplina.map(([disciplina, importe], i) => {
            const activo = filtro === disciplina;
            return (
              <li key={disciplina}>
                <button
                  type="button"
                  onClick={() => setFiltro(activo ? null : disciplina)}
                  className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6875rem] transition-colors ${
                    activo
                      ? "bg-acento-tenue font-semibold text-acento"
                      : "text-tinta-media hover:bg-superficie-alta"
                  }`}
                >
                  <span
                    className="size-2 rounded-sm"
                    style={{ backgroundColor: tonoDisciplina(i) }}
                    aria-hidden="true"
                  />
                  {ETIQUETA_DISCIPLINA[disciplina]}
                  <span className="cifra text-tinta-debil">
                    {Math.round((importe / total) * 100)}%
                  </span>
                </button>
              </li>
            );
          })}
          {filtro && (
            <li>
              <button
                type="button"
                onClick={() => setFiltro(null)}
                className="rounded-full px-2 py-0.5 text-[0.6875rem] font-medium text-acento underline-offset-2 hover:underline"
              >
                Quitar filtro
              </button>
            </li>
          )}
        </ul>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-borde bg-superficie-alta text-left">
              <Th className="w-[4.5rem]">Clave</Th>
              <Th>Concepto</Th>
              <Th className="w-20 text-center">Unidad</Th>
              <Th className="w-24 text-right">Cantidad</Th>
              <Th className="w-32 text-right">P. unitario</Th>
              <Th className="w-36 text-right">Importe</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borde-suave">
            {visibles.map((p) => {
              const abierto = detalle === p.clave;
              return (
                <Fragment key={p.clave}>
                  <tr
                    onClick={() => setDetalle(abierto ? null : p.clave)}
                    className={`cursor-pointer transition-colors ${
                      abierto ? "bg-acento-tenue/60" : "hover:bg-superficie-alta"
                    }`}
                  >
                    <td className="cifra px-5 py-2.5 text-xs text-tinta-debil sm:px-7">
                      {p.clave}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="block leading-snug">{p.concepto}</span>
                      {p.supuesto && (
                        <span className="mt-1 block text-[0.6875rem] text-laton">
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
                    <td className="cifra px-5 py-2.5 text-right font-semibold sm:px-7">
                      {pesosExactos(p.importe)}
                    </td>
                  </tr>

                  {abierto && (
                    <tr className="bg-superficie-alta">
                      <td colSpan={6} className="px-5 py-4 sm:px-7">
                        <span className="etiqueta-seccion">
                          Matriz de precio unitario · {pesosExactos(p.precioUnitario)}
                        </span>
                        <div className="escalonado mt-3 grid gap-3 sm:grid-cols-4">
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
            <tr className="border-t-2 border-acento/30 bg-acento-tenue/50">
              <td colSpan={5} className="px-5 py-3.5 text-right font-semibold sm:px-7">
                {filtro
                  ? `Subtotal · ${ETIQUETA_DISCIPLINA[filtro]}`
                  : "Total estimado"}
              </td>
              <td className="cifra px-5 py-3.5 text-right text-lg font-semibold text-acento sm:px-7">
                {pesosExactos(totalVisible)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Bloque>
  );
}

/** Escala del azul institucional al latón, sin repetir tonos entre disciplinas. */
function tonoDisciplina(indice: number): string {
  const tonos = [
    "oklch(46% 0.115 232)",
    "oklch(56% 0.1 216)",
    "oklch(64% 0.085 200)",
    "oklch(70% 0.075 178)",
    "oklch(72% 0.075 140)",
    "oklch(70% 0.08 100)",
    "oklch(66% 0.09 75)",
    "oklch(74% 0.05 250)",
  ];
  return tonos[indice % tonos.length];
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
    <div className="rounded-lg border border-borde bg-superficie px-3 py-2.5 shadow-[var(--shadow-sutil)]">
      <p className="etiqueta-seccion">{etiqueta}</p>
      <p className="cifra mt-1 font-semibold">{pesosExactos(valor)}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-superficie-honda">
        <div
          className="crecer-ancho h-full rounded-full bg-acento"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      <p className="cifra mt-1 text-[0.6875rem] text-tinta-debil">{porcentaje}%</p>
    </div>
  );
}

/* --------------------------------------------------------------- Hallazgos -- */

const ORDEN_RIESGO: Record<NivelRiesgo, number> = {
  critico: 0,
  alto: 1,
  medio: 2,
  bajo: 3,
};

export function ListaHallazgos({ datos }: { datos: Hallazgo[] }) {
  const [riesgoActivo, setRiesgoActivo] = useState<NivelRiesgo | null>(null);

  const conteos = useMemo(() => {
    const mapa = new Map<NivelRiesgo, number>();
    for (const h of datos) mapa.set(h.riesgo, (mapa.get(h.riesgo) ?? 0) + 1);
    return mapa;
  }, [datos]);

  const visibles = useMemo(() => {
    const filtrados = riesgoActivo
      ? datos.filter((h) => h.riesgo === riesgoActivo)
      : datos;
    return [...filtrados].sort(
      (a, b) => ORDEN_RIESGO[a.riesgo] - ORDEN_RIESGO[b.riesgo],
    );
  }, [datos, riesgoActivo]);

  if (datos.length === 0) return null;
  const criticos = conteos.get("critico") ?? 0;

  return (
    <Bloque
      titulo="Hallazgos normativos"
      subtitulo={
        criticos > 0
          ? `${criticos} hallazgo${criticos > 1 ? "s" : ""} crítico${criticos > 1 ? "s" : ""} de ${datos.length}. Los críticos impiden recibir la obra.`
          : `${datos.length} hallazgos, ninguno crítico.`
      }
      accion={
        <div className="flex flex-wrap gap-1.5">
          {(["critico", "alto", "medio", "bajo"] as const)
            .filter((r) => conteos.has(r))
            .map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRiesgoActivo(riesgoActivo === r ? null : r)}
                className={`transition-opacity ${
                  riesgoActivo && riesgoActivo !== r ? "opacity-40" : ""
                }`}
                aria-pressed={riesgoActivo === r}
              >
                <span className="pointer-events-none flex items-center gap-1">
                  <InsigniaRiesgo riesgo={r} />
                  <span className="cifra text-[0.6875rem] text-tinta-debil">
                    {conteos.get(r)}
                  </span>
                </span>
              </button>
            ))}
        </div>
      }
    >
      <ul className="divide-y divide-borde-suave">
        {visibles.map((h) => (
          <li key={h.id} className="aparecer px-5 py-4 sm:px-7">
            <div className="flex flex-wrap items-center gap-2.5">
              <InsigniaRiesgo riesgo={h.riesgo} />
              <h3 className="text-sm font-semibold">{h.titulo}</h3>
            </div>

            <p className="cifra mt-1.5 text-[0.6875rem] font-medium text-acento">
              {h.norma}
              {h.articulo ? ` · ${h.articulo}` : ""}
            </p>

            <p className="mt-2 text-sm leading-relaxed text-tinta-media">
              {h.descripcion}
            </p>

            <p className="mt-2.5 flex gap-2.5 rounded-r-md border-l-[3px] border-acento bg-acento-tenue/60 px-3.5 py-2.5 text-sm text-tinta-media">
              <span className="etiqueta-seccion shrink-0 pt-0.5 text-acento">
                Acción
              </span>
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
  accion,
  children,
}: {
  titulo: string;
  subtitulo: string;
  accion?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="aparecer overflow-hidden rounded-xl border border-borde bg-superficie shadow-[var(--shadow-tarjeta)]">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-borde-suave px-5 py-4 sm:px-7">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{titulo}</h2>
          <p className="mt-0.5 text-xs text-tinta-debil">{subtitulo}</p>
        </div>
        {accion}
      </header>
      {children}
    </section>
  );
}

function Interruptor({
  activo,
  onCambio,
  etiqueta,
}: {
  activo: boolean;
  onCambio: () => void;
  etiqueta: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={onCambio}
      className="flex items-center gap-2 text-xs font-medium text-tinta-media transition-colors hover:text-tinta"
    >
      <span
        className={`relative h-5 w-9 rounded-full transition-colors duration-300 ${
          activo ? "bg-acento" : "bg-superficie-honda"
        }`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-superficie shadow-[var(--shadow-sutil)] transition-transform duration-300 ${
            activo ? "translate-x-4.5" : "translate-x-0.5"
          }`}
        />
      </span>
      {etiqueta}
    </button>
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
      className={`px-3 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-tinta-debil first:pl-5 last:pr-5 sm:first:pl-7 sm:last:pr-7 ${className}`}
    >
      {children}
    </th>
  );
}
