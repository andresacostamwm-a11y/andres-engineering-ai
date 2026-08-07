"use client";

import { useRef, useState } from "react";
import type { Diagrama } from "@/lib/diagramas/tipos";
import type { Proyecto } from "@/lib/tipos-proyecto";
import { exportarDxf, exportarSvg } from "@/lib/exportadores";
import { Plano } from "./Plano";
import { Vista3D } from "./Vista3D";

/**
 * Una lámina del proyecto: el plano 2D con su conmutador a maqueta 3D y las
 * descargas de ESA lámina (SVG, DXF, PNG), sin pasar por el menú global.
 */
export function Lamina({
  diagrama,
  proyecto,
  cabecera,
}: {
  diagrama: Diagrama;
  proyecto: Proyecto | null;
  cabecera: { nombre: string; disciplina: string; fecha: string };
}) {
  const [modo, setModo] = useState<"plano" | "3d">("plano");
  const marcoRef = useRef<HTMLDivElement>(null);

  function svgActual(): string | null {
    const svg = marcoRef.current?.querySelector<SVGSVGElement>("svg[data-plano]");
    if (!svg) return null;
    const copia = svg.cloneNode(true) as SVGSVGElement;
    copia.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    copia.setAttribute(
      "style",
      "--color-superficie:#ffffff;--color-superficie-alta:#f6f8fa;--color-borde:#e2e8f0;--color-tinta:#1f2937;--color-tinta-media:#5b6b7d;--color-tinta-debil:#8794a3;--color-acento:#155e85;--color-acento-fuerte:#0f4a6b;--color-acento-tenue:#eaf2f7;--font-mono:ui-monospace,monospace",
    );
    return new XMLSerializer().serializeToString(copia);
  }

  function descargarSvg() {
    const svg = svgActual();
    if (svg && proyecto) exportarSvg(proyecto, diagrama, svg);
  }

  function descargarPng() {
    const svg = svgActual();
    if (!svg) return;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const imagen = new Image();
    imagen.onload = () => {
      const escala = 2;
      const lienzo = document.createElement("canvas");
      lienzo.width = 1200 * escala;
      lienzo.height = 900 * escala;
      const ctx = lienzo.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, lienzo.width, lienzo.height);
      ctx.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
      URL.revokeObjectURL(url);
      lienzo.toBlob((blob) => {
        if (!blob) return;
        const enlace = document.createElement("a");
        enlace.href = URL.createObjectURL(blob);
        enlace.download = `${diagrama.tipo}-${cabecera.nombre.slice(0, 40).replace(/[^a-zA-Z0-9]+/g, "-")}.png`;
        enlace.click();
        URL.revokeObjectURL(enlace.href);
      }, "image/png");
    };
    imagen.src = url;
  }

  const BOTON =
    "rounded-md border border-borde px-2.5 py-1.5 text-xs font-medium text-tinta-media transition-colors hover:border-acento/60 hover:text-tinta";

  return (
    <figure>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border border-borde bg-superficie-alta p-0.5">
          {(
            [
              ["plano", "Plano 2D"],
              ["3d", "Maqueta 3D"],
            ] as const
          ).map(([id, etiqueta]) => (
            <button
              key={id}
              type="button"
              onClick={() => setModo(id)}
              aria-pressed={modo === id}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                modo === id
                  ? "bg-superficie text-acento shadow-[var(--shadow-sutil)]"
                  : "text-tinta-debil hover:text-tinta"
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        {proyecto && (
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={descargarSvg} className={BOTON} title="Vector editable">
              SVG
            </button>
            <button
              type="button"
              onClick={() => exportarDxf(proyecto, diagrama)}
              className={BOTON}
              title="Abre en AutoCAD, importa en Revit"
            >
              DXF
            </button>
            <button type="button" onClick={descargarPng} className={BOTON} title="Imagen de alta resolución">
              PNG
            </button>
          </div>
        )}
      </div>

      {/* El plano queda montado (oculto) en modo 3D para que SVG/PNG sigan
          leyendo del DOM exactamente lo que se ve en 2D. */}
      <div
        ref={marcoRef}
        className={`overflow-x-auto rounded-lg border border-borde ${modo === "3d" ? "hidden" : ""}`}
      >
        <Plano diagrama={diagrama} proyecto={cabecera} className="min-w-[52rem] w-full" />
      </div>
      {modo === "3d" && <Vista3D diagrama={diagrama} />}

      {diagrama.notas.length > 0 && (
        <figcaption className="mt-3">
          <p className="etiqueta-seccion">Notas del plano</p>
          <ul className="mt-1.5 space-y-1 text-sm text-tinta-media">
            {diagrama.notas.map((n, j) => (
              <li key={j} className="flex gap-2">
                <span className="cifra shrink-0 text-xs text-acento">{j + 1}.</span>
                {n}
              </li>
            ))}
          </ul>
        </figcaption>
      )}
    </figure>
  );
}
