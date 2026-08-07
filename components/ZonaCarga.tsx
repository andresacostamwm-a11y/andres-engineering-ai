"use client";

import { useRef, useState } from "react";
import { EXTENSIONES_ACEPTADAS } from "@/lib/extractores";

export function ZonaCarga({
  onArchivos,
  onEjemplo,
  ocupado,
}: {
  onArchivos: (archivos: File[]) => void;
  onEjemplo: () => void;
  ocupado: boolean;
}) {
  const [encima, setEncima] = useState(false);
  const entradaRef = useRef<HTMLInputElement>(null);

  function manejar(lista: FileList | null) {
    const archivos = Array.from(lista ?? []);
    if (archivos.length > 0) onArchivos(archivos);
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setEncima(true);
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => {
          e.preventDefault();
          setEncima(false);
          if (!ocupado) manejar(e.dataTransfer.files);
        }}
        className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-colors sm:p-12 ${
          encima
            ? "border-acento bg-acento-tenue/70"
            : "border-borde bg-superficie hover:border-acento/50"
        } ${ocupado ? "pointer-events-none opacity-50" : ""}`}
      >
        <input
          ref={entradaRef}
          type="file"
          accept={EXTENSIONES_ACEPTADAS}
          multiple
          className="sr-only"
          onChange={(e) => manejar(e.target.files)}
          disabled={ocupado}
        />

        <svg
          viewBox="0 0 48 48"
          className="mx-auto size-11 text-acento/70"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M14 6h14l8 8v28a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d="M28 6v8h8" stroke="currentColor" strokeWidth="2" />
          <path
            d="M24 34V22m0 0-4.5 4.5M24 22l4.5 4.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <p className="mt-4 text-base font-medium">
          Arrastra aquí tus documentos
        </p>
        <p className="mt-1 text-sm text-tinta-debil">
          Hasta 10 archivos a la vez. Se procesan en memoria y no se almacenan
          en el servidor.
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          <button
            type="button"
            onClick={() => entradaRef.current?.click()}
            disabled={ocupado}
            className="rounded-md bg-acento px-4 py-2 text-sm font-medium text-sobre-acento shadow-[var(--shadow-acento)] transition-opacity hover:opacity-90"
          >
            Seleccionar archivos
          </button>
          <button
            type="button"
            onClick={onEjemplo}
            disabled={ocupado}
            className="rounded-md border border-borde px-4 py-2 text-sm text-tinta-media transition-colors hover:border-acento/60 hover:text-tinta"
          >
            Usar documento de ejemplo
          </button>
        </div>
      </div>
    </div>
  );
}
