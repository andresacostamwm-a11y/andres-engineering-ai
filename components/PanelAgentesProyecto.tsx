"use client";

import type { AgenteProyecto } from "@/lib/tipos-proyecto";

export type EstadoAgente = "pendiente" | "corriendo" | "listo" | "error";

const AGENTES: {
  id: AgenteProyecto;
  nombre: string;
  rol: string;
  etapa: string;
}[] = [
  {
    id: "programa",
    nombre: "Programa",
    rol: "Convierte tu descripción en un alcance de obra numerable",
    etapa: "Etapa 1",
  },
  {
    id: "extractor",
    nombre: "Extractor",
    rol: "Aísla los requerimientos técnicos con su evidencia",
    etapa: "Etapa 2",
  },
  {
    id: "costos",
    nombre: "Costos",
    rol: "Catálogo de conceptos con matrices de precio unitario",
    etapa: "Etapa 3 · paralelo",
  },
  {
    id: "normativo",
    nombre: "Normativo",
    rol: "Cumplimiento contra la normativa de la disciplina",
    etapa: "Etapa 3 · paralelo",
  },
  {
    id: "proyectista",
    nombre: "Proyectista",
    rol: "Dibuja los planos y diagramas del sistema",
    etapa: "Etapa 3 · paralelo",
  },
  {
    id: "sintesis",
    nombre: "Síntesis",
    rol: "Resumen ejecutivo y consolidación del riesgo",
    etapa: "Etapa 4",
  },
];

const ESTILO: Record<EstadoAgente, string> = {
  pendiente: "border-borde bg-superficie-alta/60",
  corriendo: "border-acento/45 bg-superficie shadow-[var(--shadow-acento)]",
  listo: "border-borde bg-superficie shadow-[var(--shadow-tarjeta)]",
  error: "border-critico/35 bg-critico-tenue",
};

export function PanelAgentesProyecto({
  estados,
  mensajes,
}: {
  estados: Record<AgenteProyecto, EstadoAgente>;
  mensajes: Partial<Record<AgenteProyecto, string>>;
}) {
  return (
    <ol className="escalonado grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {AGENTES.map((agente, i) => {
        const estado = estados[agente.id];
        return (
          <li
            key={agente.id}
            className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-500 ${ESTILO[estado]}`}
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

            <p className="mt-2.5 flex items-baseline gap-2 text-sm font-semibold">
              <span className="cifra text-xs text-tinta-debil">
                {String(i + 1).padStart(2, "0")}
              </span>
              {agente.nombre}
            </p>

            <p className="mt-1.5 text-xs leading-relaxed text-tinta-media">
              {mensajes[agente.id] ?? agente.rol}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function Indicador({ estado }: { estado: EstadoAgente }) {
  if (estado === "corriendo") {
    return (
      <span className="relative flex size-2.5" role="status">
        <span className="pulso-agente absolute inline-flex size-full rounded-full bg-acento" />
        <span className="relative inline-flex size-2.5 rounded-full bg-acento" />
        <span className="sr-only">En ejecución</span>
      </span>
    );
  }
  if (estado === "listo") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-bajo-tenue">
        <svg viewBox="0 0 16 16" className="size-3.5 text-bajo" aria-label="Completado">
          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (estado === "error") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-critico-tenue">
        <svg viewBox="0 0 16 16" className="size-3.5 text-critico" aria-label="Con error">
          <path d="M8 4v5m0 3h.01" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  return <span className="size-2.5 rounded-full border-2 border-borde" aria-label="Pendiente" />;
}
