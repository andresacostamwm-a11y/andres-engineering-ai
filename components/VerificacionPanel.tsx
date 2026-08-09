"use client";

import type { HallazgoVerificacion, Verificacion } from "@/lib/tipos-proyecto";

/**
 * Informe del verificador adversarial.
 *
 * Va arriba del dictamen a propósito: lo primero que debe saber quien recibe el
 * paquete es si puede firmarlo. Cada hallazgo declara si lo midió el sistema o
 * lo juzgó el revisor, porque no valen lo mismo: una comprobación aritmética es
 * un hecho y una observación técnica es un criterio.
 */

const VEREDICTO = {
  entregable: {
    titulo: "Entregable",
    texto: "No se encontraron defectos que impidan entregar el paquete.",
    estilo: "border-bajo/35 bg-bajo-tenue",
    color: "text-bajo",
  },
  "entregable-con-reservas": {
    titulo: "Entregable con reservas",
    texto: "Hay defectos que conviene corregir antes de entregar a un tercero.",
    estilo: "border-alto/35 bg-alto-tenue",
    color: "text-alto",
  },
  "requiere-correccion": {
    titulo: "Requiere corrección",
    texto: "Hay defectos que invalidan parte del paquete. No entregar sin resolverlos.",
    estilo: "border-critico/35 bg-critico-tenue",
    color: "text-critico",
  },
} as const;

const GRAVEDAD: Record<HallazgoVerificacion["gravedad"], { etiqueta: string; estilo: string }> = {
  critico: { etiqueta: "Crítico", estilo: "text-critico" },
  alto: { etiqueta: "Alto", estilo: "text-alto" },
  medio: { etiqueta: "Medio", estilo: "text-tinta-media" },
  bajo: { etiqueta: "Bajo", estilo: "text-tinta-debil" },
};

const AMBITO: Record<string, string> = {
  programa: "Programa",
  extractor: "Extractor",
  costos: "Costos",
  normativo: "Normativo",
  proyectista: "Proyectista",
  memoria: "Memoria",
  sintesis: "Síntesis",
  programacion: "Programación",
  riesgos: "Riesgos",
  verificador: "Verificador",
};

export function VerificacionPanel({ verificacion }: { verificacion: Verificacion }) {
  const { hallazgos, confianza, veredicto, comprobado } = verificacion;
  const ficha = VEREDICTO[veredicto];
  const criticos = hallazgos.filter((h) => h.gravedad === "critico").length;

  return (
    <section
      className={`aparecer overflow-hidden rounded-xl border shadow-[var(--shadow-tarjeta)] ${ficha.estilo}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-borde-suave px-5 py-4 sm:px-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-tinta-media">
            Verificación independiente
          </p>
          <h2 className={`mt-0.5 text-base font-semibold tracking-tight ${ficha.color}`}>
            {ficha.titulo}
          </h2>
          <p className="mt-0.5 text-xs text-tinta-media">{ficha.texto}</p>
        </div>

        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-tinta">
            {confianza}
            <span className="text-sm text-tinta-debil">/100</span>
          </p>
          <p className="text-xs text-tinta-debil">
            confianza · {hallazgos.length} hallazgo{hallazgos.length === 1 ? "" : "s"}
            {criticos > 0 ? ` · ${criticos} crítico${criticos === 1 ? "" : "s"}` : ""}
          </p>
        </div>
      </header>

      {hallazgos.length > 0 && (
        <ul className="divide-y divide-borde-suave bg-superficie">
          {hallazgos.map((hallazgo) => (
            <li key={hallazgo.id} className="px-5 py-4 sm:px-7">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span
                  className={`text-xs font-semibold uppercase tracking-wider ${GRAVEDAD[hallazgo.gravedad].estilo}`}
                >
                  {GRAVEDAD[hallazgo.gravedad].etiqueta}
                </span>
                <span className="text-sm font-medium text-tinta">{hallazgo.titulo}</span>
                <span className="ml-auto flex items-center gap-2 text-xs text-tinta-debil">
                  {AMBITO[hallazgo.ambito] ?? hallazgo.ambito}
                  <span
                    className="rounded-full border border-borde px-2 py-0.5"
                    title={
                      hallazgo.automatico
                        ? "Comprobación aritmética o de cobertura hecha en código"
                        : "Observación técnica del revisor"
                    }
                  >
                    {hallazgo.automatico ? "medido" : "revisión"}
                  </span>
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-tinta-media">
                {hallazgo.evidencia}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-tinta-media">
                <span className="font-medium text-tinta">Corrección:</span>{" "}
                {hallazgo.correccion}
              </p>
            </li>
          ))}
        </ul>
      )}

      {comprobado.length > 0 && (
        <div className="border-t border-borde-suave bg-superficie px-5 py-4 sm:px-7">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-tinta-media">
            Qué se comprobó
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-tinta-media">
            {comprobado.map((c) => (
              <li key={c} className="flex gap-2">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-acento" aria-hidden />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
