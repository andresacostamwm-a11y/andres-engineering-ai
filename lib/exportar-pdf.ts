/**
 * Generación del dictamen en PDF.
 *
 * Se construye en el cliente con jsPDF: el documento analizado nunca sale del
 * navegador, así que el PDF tampoco debería viajar al servidor para producirse.
 */
"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Analisis } from "./types.ts";
import { ETIQUETA_DISCIPLINA, ETIQUETA_RIESGO } from "./types.ts";
import { fechaLarga, numero, pesosExactos } from "./formato.ts";

const TINTA: [number, number, number] = [31, 41, 55];
const ACENTO: [number, number, number] = [21, 94, 133];
const GRIS: [number, number, number] = [113, 126, 143];

const COLOR_RIESGO: Record<string, [number, number, number]> = {
  critico: [168, 40, 38],
  alto: [166, 96, 22],
  medio: [140, 118, 18],
  bajo: [30, 110, 76],
};

export function exportarDictamen(analisis: Analisis): void {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const margen = 48;
  const anchoUtil = anchoPagina - margen * 2;
  let y = margen;

  // --- Encabezado ---
  doc.setFillColor(...ACENTO);
  doc.rect(0, 0, anchoPagina, 6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...TINTA);
  y += 26;
  const titulo = analisis.resumen?.titulo ?? "Dictamen técnico preliminar";
  const lineasTitulo = doc.splitTextToSize(titulo, anchoUtil);
  doc.text(lineasTitulo, margen, y);
  y += lineasTitulo.length * 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text(
    `ANDRES Engineering AI · Dictamen generado el ${fechaLarga(analisis.creadoEn)} · Documento fuente: ${analisis.nombreArchivo}`,
    margen,
    y,
  );
  y += 14;
  doc.text(
    analisis.modoDemo
      ? "Documento de DEMOSTRACIÓN. Cifras de ejemplo, sin validez contractual."
      : "Análisis asistido por IA. Requiere validación de un responsable técnico antes de su uso contractual.",
    margen,
    y,
  );
  y += 22;

  // --- Resumen ejecutivo ---
  const resumen = analisis.resumen;
  if (resumen) {
    y = seccion(doc, "Resumen ejecutivo", margen, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TINTA);
    const lineas = doc.splitTextToSize(resumen.sintesis, anchoUtil);
    doc.text(lineas, margen, y);
    y += lineas.length * 13 + 12;

    autoTable(doc, {
      startY: y,
      theme: "grid",
      margin: { left: margen, right: margen },
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: ACENTO, textColor: 255, fontStyle: "bold" },
      head: [["Tipo de proyecto", "Ubicación", "Total estimado", "Riesgo global"]],
      body: [
        [
          resumen.tipoProyecto,
          resumen.ubicacion ?? "No especificada",
          pesosExactos(resumen.totalEstimado),
          ETIQUETA_RIESGO[resumen.riesgoGlobal],
        ],
      ],
      didParseCell: (datos) => {
        if (datos.section === "body" && datos.column.index === 3) {
          datos.cell.styles.textColor = COLOR_RIESGO[resumen.riesgoGlobal];
          datos.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = posicionFinal(doc) + 20;

    if (resumen.recomendaciones.length > 0) {
      y = seccion(doc, "Recomendaciones", margen, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...TINTA);
      resumen.recomendaciones.forEach((rec, i) => {
        const lineas = doc.splitTextToSize(`${i + 1}. ${rec}`, anchoUtil - 10);
        y = saltarSiHaceFalta(doc, y, lineas.length * 13 + 6, margen);
        doc.text(lineas, margen + 6, y);
        y += lineas.length * 13 + 6;
      });
      y += 12;
    }
  }

  // --- Requerimientos ---
  if (analisis.requerimientos.length > 0) {
    y = seccion(doc, "Requerimientos detectados", margen, y);
    autoTable(doc, {
      startY: y,
      theme: "striped",
      margin: { left: margen, right: margen },
      styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: ACENTO, textColor: 255 },
      columnStyles: {
        0: { cellWidth: 42 },
        1: { cellWidth: 236 },
        2: { cellWidth: 78 },
        3: { cellWidth: 44, halign: "center" },
      },
      head: [["ID", "Requerimiento", "Disciplina", "Crítico"]],
      body: analisis.requerimientos.map((r) => [
        r.id,
        r.descripcion,
        ETIQUETA_DISCIPLINA[r.disciplina],
        r.critico ? "Sí" : "No",
      ]),
    });
    y = posicionFinal(doc) + 20;
  }

  // --- Presupuesto ---
  if (analisis.partidas.length > 0) {
    const total = analisis.partidas.reduce((s, p) => s + p.importe, 0);
    y = seccion(doc, "Catálogo de conceptos y precios unitarios", margen, y);
    autoTable(doc, {
      startY: y,
      theme: "grid",
      margin: { left: margen, right: margen },
      styles: { fontSize: 7.5, cellPadding: 3.5, overflow: "linebreak" },
      headStyles: { fillColor: ACENTO, textColor: 255 },
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 186 },
        2: { cellWidth: 34, halign: "center" },
        3: { cellWidth: 46, halign: "right" },
        4: { cellWidth: 62, halign: "right" },
        5: { cellWidth: 70, halign: "right" },
      },
      head: [["Clave", "Concepto", "Unidad", "Cantidad", "P.U.", "Importe"]],
      body: analisis.partidas.map((p) => [
        p.clave,
        p.concepto,
        p.unidad,
        numero(p.cantidad),
        pesosExactos(p.precioUnitario),
        pesosExactos(p.importe),
      ]),
      foot: [["", "TOTAL", "", "", "", pesosExactos(total)]],
      footStyles: {
        fillColor: [237, 242, 247],
        textColor: TINTA,
        fontStyle: "bold",
        halign: "right",
      },
    });
    y = posicionFinal(doc) + 20;
  }

  // --- Hallazgos normativos ---
  if (analisis.hallazgos.length > 0) {
    y = seccion(doc, "Hallazgos de cumplimiento normativo", margen, y);
    autoTable(doc, {
      startY: y,
      theme: "striped",
      margin: { left: margen, right: margen },
      styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: ACENTO, textColor: 255 },
      columnStyles: {
        0: { cellWidth: 44 },
        1: { cellWidth: 120 },
        2: { cellWidth: 92 },
        3: { cellWidth: 144 },
      },
      head: [["Riesgo", "Hallazgo", "Norma", "Recomendación"]],
      body: analisis.hallazgos.map((h) => [
        ETIQUETA_RIESGO[h.riesgo],
        h.titulo,
        h.articulo ? `${h.norma} — ${h.articulo}` : h.norma,
        h.recomendacion,
      ]),
      didParseCell: (datos) => {
        if (datos.section === "body" && datos.column.index === 0) {
          const hallazgo = analisis.hallazgos[datos.row.index];
          datos.cell.styles.textColor = COLOR_RIESGO[hallazgo.riesgo];
          datos.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = posicionFinal(doc) + 20;
  }

  // --- Supuestos ---
  if (resumen && resumen.supuestos.length > 0) {
    y = seccion(doc, "Supuestos del análisis", margen, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...TINTA);
    resumen.supuestos.forEach((s) => {
      const lineas = doc.splitTextToSize(`— ${s}`, anchoUtil - 10);
      y = saltarSiHaceFalta(doc, y, lineas.length * 12 + 4, margen);
      doc.text(lineas, margen + 6, y);
      y += lineas.length * 12 + 4;
    });
  }

  numerarPaginas(doc, margen);
  doc.save(`dictamen-${normalizar(analisis.nombreArchivo)}.pdf`);
}

function seccion(doc: jsPDF, titulo: string, margen: number, y: number): number {
  const nuevaY = saltarSiHaceFalta(doc, y, 46, margen);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...ACENTO);
  doc.text(titulo.toUpperCase(), margen, nuevaY);
  doc.setDrawColor(...ACENTO);
  doc.setLineWidth(0.8);
  doc.line(margen, nuevaY + 5, doc.internal.pageSize.getWidth() - margen, nuevaY + 5);
  return nuevaY + 22;
}

function saltarSiHaceFalta(
  doc: jsPDF,
  y: number,
  alturaNecesaria: number,
  margen: number,
): number {
  if (y + alturaNecesaria > doc.internal.pageSize.getHeight() - margen) {
    doc.addPage();
    return margen;
  }
  return y;
}

/** jsPDF-AutoTable expone la posición final en `lastAutoTable`. */
function posicionFinal(doc: jsPDF): number {
  const conTabla = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  return conTabla.lastAutoTable?.finalY ?? 100;
}

function numerarPaginas(doc: jsPDF, margen: number): void {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text(
      `Página ${i} de ${total}`,
      doc.internal.pageSize.getWidth() - margen,
      doc.internal.pageSize.getHeight() - 24,
      { align: "right" },
    );
    doc.text("Generado con ANDRES Engineering AI", margen, doc.internal.pageSize.getHeight() - 24);
  }
}

function normalizar(nombre: string): string {
  return nombre
    .replace(/\.pdf$/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .slice(0, 50)
    .toLowerCase();
}
