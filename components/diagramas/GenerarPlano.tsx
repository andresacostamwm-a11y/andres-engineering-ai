"use client";

import { useState } from "react";
import type { Diagrama } from "@/lib/diagramas/tipos";
import type { DisciplinaProyecto, Envergadura, TipoDiagrama } from "@/lib/disciplinas";
import { ETIQUETA_DIAGRAMA } from "@/lib/disciplinas";

/**
 * Genera láminas adicionales bajo demanda: cualquier tipo del catálogo, aunque
 * no forme parte del paquete estándar de la disciplina.
 */
export function GenerarPlano({
  encargo,
  yaGenerados,
  onDiagrama,
}: {
  encargo: {
    nombre: string;
    descripcion: string;
    disciplina: DisciplinaProyecto;
    envergadura: Envergadura;
    contexto: string;
  };
  yaGenerados: TipoDiagrama[];
  onDiagrama: (diagrama: Diagrama) => void;
}) {
  const [tipo, setTipo] = useState<TipoDiagrama | "">("");
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendientes = (
    Object.keys(ETIQUETA_DIAGRAMA) as TipoDiagrama[]
  ).filter((t) => !yaGenerados.includes(t));

  if (pendientes.length === 0) return null;

  async function generar() {
    if (!tipo || generando) return;
    setGenerando(true);
    setError(null);
    try {
      const respuesta = await fetch("/api/proyecto/diagrama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          disciplina: encargo.disciplina,
          envergadura: encargo.envergadura,
          nombre: encargo.nombre,
          descripcion: encargo.descripcion,
          contexto: encargo.contexto.slice(0, 20_000),
        }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        setError(datos.error ?? "No se pudo generar el plano.");
      } else {
        onDiagrama(datos.diagrama as Diagrama);
        setTipo("");
      }
    } catch {
      setError("Se interrumpió la conexión al generar el plano.");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-borde bg-superficie-alta/40 px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium">¿Falta una lámina?</p>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoDiagrama | "")}
          disabled={generando}
          aria-label="Tipo de plano a generar"
          className="min-w-56 flex-1 rounded-md border border-borde bg-superficie px-3 py-2 text-sm focus:border-acento focus:outline-none sm:flex-none"
        >
          <option value="">Elige el tipo de plano…</option>
          {pendientes.map((t) => (
            <option key={t} value={t}>
              {ETIQUETA_DIAGRAMA[t]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={generar}
          disabled={!tipo || generando}
          className="rounded-md bg-acento px-4 py-2 text-sm font-medium text-sobre-acento shadow-[var(--shadow-acento)] transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {generando ? "Dibujando…" : "Generar plano"}
        </button>
      </div>
      {generando && (
        <p className="pulso-agente mt-2 text-xs text-tinta-debil">
          El proyectista está dibujando la lámina; tarda menos de un minuto.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-critico">
          {error}
        </p>
      )}
    </div>
  );
}
