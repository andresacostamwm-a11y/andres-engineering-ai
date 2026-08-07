"use client";

import { useState } from "react";
import type { Diagrama } from "@/lib/diagramas/tipos";
import type { DisciplinaProyecto, Envergadura, TipoDiagrama } from "@/lib/disciplinas";

/**
 * Botonera de acceso a los planos del proyecto por especialidad.
 *
 * Si la lámina de esa especialidad ya existe, desplaza hasta ella; si no, la
 * genera en el momento con el proyectista y luego navega. "Sanitarios" reutiliza
 * el tipo hidráulico con el enfoque puesto en drenaje y ventilación.
 */

interface Especialidad {
  id: string;
  etiqueta: string;
  tipo: TipoDiagrama;
  /** Instrucción de enfoque cuando el tipo se comparte entre especialidades. */
  enfoque?: string;
  /** Palabra que identifica una lámina ya generada de esta especialidad. */
  huella?: RegExp;
}

const ESPECIALIDADES: Especialidad[] = [
  { id: "civil", etiqueta: "Civiles", tipo: "estructural" },
  { id: "electrico", etiqueta: "Eléctricos", tipo: "unifilar" },
  { id: "electronico", etiqueta: "Electrónicos", tipo: "electronico" },
  { id: "mecanico", etiqueta: "Mecánicos", tipo: "mecanico" },
  {
    id: "hidraulico",
    etiqueta: "Hidráulicos",
    tipo: "hidraulico",
    huella: /agua|potable|hidr[aá]ulic|bombeo|incendio/i,
  },
  { id: "hvac", etiqueta: "HVAC", tipo: "hvac" },
  {
    id: "sanitario",
    etiqueta: "Sanitarios",
    tipo: "hidraulico",
    enfoque:
      "Enfoca la lámina EXCLUSIVAMENTE en la red sanitaria y pluvial: bajantes, ramales, pendientes, registros, ventilaciones y descarga al colector. No dibujes la red de agua potable.",
    huella: /sanitari|drenaje|pluvial|bajante|alcantarill/i,
  },
];

export function AccesoPlanos({
  encargo,
  diagramas,
  onDiagrama,
}: {
  encargo: {
    nombre: string;
    descripcion: string;
    disciplina: DisciplinaProyecto;
    envergadura: Envergadura;
    contexto: string;
  };
  diagramas: Diagrama[];
  onDiagrama: (diagrama: Diagrama) => void;
}) {
  const [generando, setGenerando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function indiceDe(esp: Especialidad): number {
    const candidatos = diagramas
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => d.tipo === esp.tipo);
    if (candidatos.length === 0) return -1;
    if (!esp.huella) return candidatos[0].i;
    const conHuella = candidatos.find(({ d }) =>
      esp.huella!.test(`${d.titulo} ${d.descripcion}`),
    );
    // Sin huella clara, solo el primer candidato reclama el tipo compartido.
    return conHuella?.i ?? (esp.id === "hidraulico" ? candidatos[0].i : -1);
  }

  function irALamina(indice: number) {
    document
      .getElementById(`lamina-${indice}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function acceder(esp: Especialidad) {
    setError(null);
    const existente = indiceDe(esp);
    if (existente >= 0) return irALamina(existente);

    if (generando) return;
    setGenerando(esp.id);
    try {
      const respuesta = await fetch("/api/proyecto/diagrama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: esp.tipo,
          disciplina: encargo.disciplina,
          envergadura: encargo.envergadura,
          nombre: encargo.nombre,
          descripcion: esp.enfoque
            ? `${encargo.descripcion}\n\n${esp.enfoque}`
            : encargo.descripcion,
          contexto: encargo.contexto.slice(0, 20_000),
        }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        setError(datos.error ?? `No se pudo generar el plano ${esp.etiqueta.toLowerCase()}.`);
      } else {
        onDiagrama(datos.diagrama as Diagrama);
        // La lámina nueva queda al final; se navega tras el re-render.
        const destino = diagramas.length;
        setTimeout(() => irALamina(destino), 350);
      }
    } catch {
      setError("Se interrumpió la conexión al generar el plano.");
    } finally {
      setGenerando(null);
    }
  }

  return (
    <div>
      <p className="etiqueta-seccion mb-2">Planos del proyecto</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Acceso a planos por especialidad">
        {ESPECIALIDADES.map((esp) => {
          const existe = indiceDe(esp) >= 0;
          const ocupado = generando === esp.id;
          return (
            <button
              key={esp.id}
              type="button"
              onClick={() => acceder(esp)}
              disabled={Boolean(generando) && !ocupado}
              title={
                existe
                  ? `Ir al plano de ${esp.etiqueta.toLowerCase()}`
                  : `Generar el plano de ${esp.etiqueta.toLowerCase()}`
              }
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                existe
                  ? "border-acento/40 bg-acento-tenue text-acento hover:bg-acento-tenue/70"
                  : "border-borde text-tinta-media hover:border-acento/50 hover:text-tinta"
              } ${ocupado ? "pulso-agente" : ""}`}
            >
              {existe && !ocupado && (
                <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3.5 8.5l3 3 6-7" />
                </svg>
              )}
              {ocupado ? "Dibujando…" : esp.etiqueta}
              {!existe && !ocupado && (
                <span aria-hidden="true" className="text-tinta-debil">+</span>
              )}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-critico">
          {error}
        </p>
      )}
    </div>
  );
}
