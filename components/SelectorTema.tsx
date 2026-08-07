"use client";

import { useEffect, useState } from "react";

type Tema = "holografico" | "claro";

const CLAVE = "aei:tema";

/**
 * Conmutador entre el tema holográfico y el ejecutivo.
 *
 * La elección se aplica en `<html data-tema>` y se recuerda en el navegador.
 * El script de `layout.tsx` la restaura antes de pintar, así que no hay
 * parpadeo de tema al cargar.
 */
export function SelectorTema() {
  const [tema, setTema] = useState<Tema>("holografico");

  useEffect(() => {
    const guardado = window.localStorage.getItem(CLAVE) as Tema | null;
    if (guardado === "claro" || guardado === "holografico") setTema(guardado);
  }, []);

  function cambiar(nuevo: Tema) {
    setTema(nuevo);
    window.localStorage.setItem(CLAVE, nuevo);
    document.documentElement.dataset.tema = nuevo === "claro" ? "claro" : "";
  }

  return (
    <div
      role="group"
      aria-label="Tema visual"
      className="flex items-center gap-0.5 rounded-full border border-borde bg-superficie-alta p-0.5"
    >
      <Boton
        activo={tema === "holografico"}
        onClick={() => cambiar("holografico")}
        etiqueta="Tema holográfico"
      >
        <path d="M8 1.5v2.2M8 12.3v2.2M1.5 8h2.2M12.3 8h2.2M3.4 3.4l1.6 1.6M11 11l1.6 1.6M12.6 3.4 11 5M5 11l-1.6 1.6" />
        <circle cx="8" cy="8" r="2.6" />
      </Boton>
      <Boton
        activo={tema === "claro"}
        onClick={() => cambiar("claro")}
        etiqueta="Tema ejecutivo claro"
      >
        <path d="M3 12.5h10M3 12.5V4.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v8M5.5 6.5h5M5.5 9h3" />
      </Boton>
    </div>
  );
}

function Boton({
  activo,
  onClick,
  etiqueta,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      title={etiqueta}
      className={`rounded-full p-1.5 transition-colors ${
        activo
          ? "bg-acento/15 text-acento"
          : "text-tinta-debil hover:text-tinta"
      }`}
    >
      <svg
        viewBox="0 0 16 16"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
      <span className="sr-only">{etiqueta}</span>
    </button>
  );
}
