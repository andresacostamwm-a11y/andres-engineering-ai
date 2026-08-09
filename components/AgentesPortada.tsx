"use client";

import { useState } from "react";
import { CATALOGO_AGENTES } from "@/lib/agentes-catalogo";
import { IlustracionAgente } from "./IlustracionAgente";

/**
 * Los diez agentes en la portada, cada uno con su ficha desplegable.
 *
 * La tarjeta cerrada da el titular; al pulsarla se abre lo que hace de verdad,
 * con las dos ilustraciones que enseñan qué recibe y qué devuelve. Se abre una
 * sola a la vez para que la comparación sea entre agentes y no entre bloques de
 * texto abiertos.
 */
export function AgentesPortada() {
  const [abierto, setAbierto] = useState<string | null>(null);

  return (
    <ol className="escalonado mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {CATALOGO_AGENTES.map((agente, i) => {
        const activo = abierto === agente.id;
        return (
          <li
            key={agente.id}
            className={`relative rounded-xl border bg-superficie shadow-[var(--shadow-tarjeta)] transition-all duration-300 ${
              activo
                ? "border-acento/45 shadow-[var(--shadow-elevada)] sm:col-span-2 lg:col-span-3 xl:col-span-5"
                : "elevable border-borde"
            }`}
          >
            <button
              type="button"
              onClick={() => setAbierto(activo ? null : agente.id)}
              aria-expanded={activo}
              className="w-full cursor-pointer p-5 text-left"
            >
              <span className="etiqueta-seccion">{agente.etapa}</span>
              <p className="mt-2.5 flex items-baseline gap-2 text-lg font-semibold">
                <span className="cifra text-sm text-acento">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {agente.nombre}
                <span
                  className={`ml-auto text-tinta-debil transition-transform duration-300 ${
                    activo ? "rotate-45" : ""
                  }`}
                  aria-hidden
                >
                  +
                </span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-tinta-media">{agente.rol}</p>
            </button>

            {/* Al abrirse se reserva la columna derecha en pantallas anchas: es
                donde vive el asistente flotante, y sin la holgura taparía la
                ilustración de salida. */}
            {activo && (
              <div className="aparecer border-t border-borde-suave px-5 pb-6 pt-5 xl:pr-[17rem]">
                <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
                  <div>
                    <p className="max-w-2xl leading-relaxed text-tinta-media">
                      {agente.detalle}
                    </p>
                    <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-acento/30 bg-acento-tenue px-3.5 py-1.5 text-xs font-medium text-tinta">
                      <span className="size-1.5 rounded-full bg-acento" aria-hidden />
                      {agente.garantia}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-start gap-4 sm:flex-nowrap">
                    <Figura
                      titulo="Recibe"
                      escena={agente.entrada.escena}
                      pie={agente.entrada.pie}
                    />
                    <span
                      className="hidden self-center text-2xl text-acento sm:block"
                      aria-hidden
                    >
                      →
                    </span>
                    <Figura
                      titulo="Devuelve"
                      escena={agente.salida.escena}
                      pie={agente.salida.pie}
                    />
                  </div>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Figura({
  titulo,
  escena,
  pie,
}: {
  titulo: string;
  escena: Parameters<typeof IlustracionAgente>[0]["escena"];
  pie: string;
}) {
  return (
    <figure className="w-full min-w-[11rem] max-w-[15rem]">
      <span className="etiqueta-seccion">{titulo}</span>
      <div className="mt-1.5 overflow-hidden rounded-lg border border-borde">
        <IlustracionAgente escena={escena} />
      </div>
      <figcaption className="mt-2 text-xs leading-relaxed text-tinta-debil">{pie}</figcaption>
    </figure>
  );
}
