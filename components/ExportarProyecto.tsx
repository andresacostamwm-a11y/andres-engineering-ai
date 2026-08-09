"use client";

import { useState } from "react";
import type { Proyecto } from "@/lib/tipos-proyecto";
import { exportarDictamen } from "@/lib/exportar-pdf";
import { exportarMemoriaPdf } from "@/lib/exportar-memoria-pdf";
import { exportarCsv, exportarDxf, exportarHtml, exportarIfc, exportarSvg } from "@/lib/exportadores";
import { leerCotizaciones } from "@/lib/cotizaciones";
import { exportarWord } from "@/lib/exportadores/word";

/**
 * Menú de exportación.
 *
 * Los SVG de los planos se leen del DOM ya renderizado en lugar de volver a
 * generarlos: lo que se exporta es exactamente lo que el usuario está viendo.
 */
export function ExportarProyecto({ proyecto }: { proyecto: Proyecto }) {
  const [abierto, setAbierto] = useState(false);

  function svgsDelDocumento(): string[] {
    if (typeof document === "undefined") return [];
    return Array.from(document.querySelectorAll<SVGSVGElement>("svg[data-plano]")).map(
      (svg) => {
        const copia = svg.cloneNode(true) as SVGSVGElement;
        copia.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        // Los planos usan variables CSS del tema; se fijan para que el archivo
        // exportado se vea igual fuera de la aplicación.
        copia.setAttribute(
          "style",
          "--color-superficie:#ffffff;--color-superficie-alta:#f6f8fa;--color-borde:#e2e8f0;--color-tinta:#1f2937;--color-tinta-media:#5b6b7d;--color-tinta-debil:#8794a3;--color-acento:#155e85;--color-acento-fuerte:#0f4a6b;--color-acento-tenue:#eaf2f7;--font-mono:ui-monospace,monospace",
        );
        return new XMLSerializer().serializeToString(copia);
      },
    );
  }

  const opciones: { etiqueta: string; detalle: string; accion: () => void }[] = [
    {
      etiqueta: "PDF",
      detalle: "Dictamen completo",
      accion: () =>
        exportarDictamen({
          id: proyecto.id,
          nombreArchivo: proyecto.nombre,
          creadoEn: proyecto.creadoEn,
          paginas: 0,
          caracteres: proyecto.alcance.length,
          texto: proyecto.alcance,
          resumen: proyecto.resumen,
          requerimientos: proyecto.requerimientos,
          partidas: proyecto.partidas,
          hallazgos: proyecto.hallazgos,
          economia: proyecto.economia,
          modoDemo: proyecto.modoDemo,
        },
        {
          // El dictamen se ilustra con las láminas del proyecto y se completa
          // con la memoria y las cotizaciones registradas.
          svgs: svgsDelDocumento(),
          titulos: proyecto.diagramas.map((d) => d.titulo),
          memoria: proyecto.memoria,
          cotizaciones: leerCotizaciones(proyecto.id),
        }),
    },
    {
      etiqueta: "Word",
      detalle: "Memoria editable (.docx)",
      accion: () => exportarWord(proyecto),
    },
    ...(proyecto.memoria
      ? [
          {
            etiqueta: "PDF · Memoria técnica",
            detalle: "Descriptiva y de cálculo",
            accion: () => exportarMemoriaPdf(proyecto),
          },
        ]
      : []),
    {
      etiqueta: "Excel / CSV",
      detalle: "Catálogo de conceptos",
      accion: () => exportarCsv(proyecto, leerCotizaciones(proyecto.id)),
    },
    {
      etiqueta: "HTML",
      detalle: "Informe con planos",
      accion: () =>
        exportarHtml(proyecto, svgsDelDocumento(), leerCotizaciones(proyecto.id)),
    },
  ];

  if (proyecto.diagramas.length > 0) {
    opciones.push(
      {
        etiqueta: "CAD (DXF)",
        detalle: "Abre en AutoCAD · importa en Revit",
        accion: () => proyecto.diagramas.forEach((d) => exportarDxf(proyecto, d)),
      },
      {
        etiqueta: "BIM (IFC)",
        detalle: "Estándar abierto que Revit lee",
        accion: () => proyecto.diagramas.forEach((d) => exportarIfc(proyecto, d)),
      },
      {
        etiqueta: "SVG",
        detalle: "Planos vectoriales",
        accion: () => {
          const svgs = svgsDelDocumento();
          proyecto.diagramas.forEach((d, i) => {
            if (svgs[i]) exportarSvg(proyecto, d, svgs[i]);
          });
        },
      },
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex items-center gap-2 rounded-md bg-acento px-3.5 py-2 text-sm font-medium text-sobre-acento shadow-[var(--shadow-acento)] transition-opacity hover:opacity-90"
      >
        Exportar
        <svg
          viewBox="0 0 16 16"
          className={`size-3.5 transition-transform ${abierto ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {abierto && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setAbierto(false)}
            aria-hidden="true"
          />
          <ul className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-lg border border-borde bg-superficie py-1 shadow-[var(--shadow-elevada)]">
            {opciones.map((o) => (
              <li key={o.etiqueta}>
                <button
                  type="button"
                  onClick={() => {
                    o.accion();
                    setAbierto(false);
                  }}
                  className="flex w-full flex-col items-start px-4 py-2.5 text-left transition-colors hover:bg-acento-tenue"
                >
                  <span className="text-sm font-medium">{o.etiqueta}</span>
                  <span className="text-xs text-tinta-debil">{o.detalle}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
