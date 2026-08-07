"use client";

import type { AgenteId } from "@/lib/types";
import { AGENTES } from "@/lib/pipeline-def";

export { AGENTES };

export type EstadoAgente = "pendiente" | "corriendo" | "listo" | "error";

const ESTILO_ESTADO: Record<EstadoAgente, string> = {
  pendiente: "border-borde-suave bg-superficie text-tinta-debil",
  corriendo: "border-acento/60 bg-acento-tenue/40 text-tinta",
  listo: "border-bajo/40 bg-bajo/8 text-tinta",
  error: "border-critico/50 bg-critico/10 text-tinta",
};

export function PanelAgentes({
  estados,
  mensajes,
  conteos,
}: {
  estados: Record<AgenteId, EstadoAgente>;
  mensajes: Partial<Record<AgenteId, string>>;
  conteos: Partial<Record<AgenteId, number>>;
}) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {AGENTES.map((agente, indice) => {
        const estado = estados[agente.id];
        return (
          <li
            key={agente.id}
            className={`relative overflow-hidden rounded-lg border p-4 transition-colors duration-300 ${ESTILO_ESTADO[estado]}`}
          >
            {estado === "corriendo" && (
              <span
                className="barrido absolute inset-x-0 top-0 h-0.5 overflow-hidden"
                aria-hidden="true"
              />
            )}

            <div className="flex items-start justify-between gap-2">
              <span className="etiqueta-seccion">{agente.etapa}</span>
              <Indicador estado={estado} />
            </div>

            <p className="mt-2.5 flex items-baseline gap-2 font-semibold">
              <span className="cifra text-xs text-tinta-debil">
                {String(indice + 1).padStart(2, "0")}
              </span>
              {agente.nombre}
            </p>

            <p className="mt-1.5 text-xs leading-relaxed text-tinta-media">
              {mensajes[agente.id] ?? agente.rol}
            </p>

            {typeof conteos[agente.id] === "number" && estado === "listo" && (
              <p className="cifra mt-3 text-2xl font-semibold text-acento">
                {conteos[agente.id]}
                <span className="ml-1.5 text-xs font-normal text-tinta-debil">
                  {agente.id === "costos"
                    ? "partidas"
                    : agente.id === "normativo"
                      ? "hallazgos"
                      : agente.id === "extractor"
                        ? "requerimientos"
                        : ""}
                </span>
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Indicador({ estado }: { estado: EstadoAgente }) {
  if (estado === "corriendo") {
    return (
      <span className="pulso-agente size-2 rounded-full bg-acento" role="status">
        <span className="sr-only">En ejecución</span>
      </span>
    );
  }
  if (estado === "listo") {
    return (
      <svg viewBox="0 0 16 16" className="size-4 text-bajo" aria-label="Completado">
        <path
          d="M3.5 8.5l3 3 6-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (estado === "error") {
    return (
      <svg viewBox="0 0 16 16" className="size-4 text-critico" aria-label="Con error">
        <path
          d="M8 4v5m0 3h.01"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <span
      className="size-2 rounded-full border border-borde"
      aria-label="Pendiente"
    />
  );
}
