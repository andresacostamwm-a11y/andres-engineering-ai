/**
 * Exportación de la memoria técnica completa a PDF.
 *
 * Documento independiente del dictamen: portada sobria, secciones numeradas y
 * una tabla de cálculo por sistema, como una memoria real de despacho.
 */
"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Proyecto } from "./tipos-proyecto.ts";
import { fichaDisciplina } from "./disciplinas.ts";
import { fechaLarga } from "./formato.ts";

const TINTA: [number, number, number] = [31, 41, 55];
const ACENTO: [number, number, number] = [21, 94, 133];
const GRIS: [number, number, number] = [113, 126, 143];

export function exportarMemoriaPdf(proyecto: Proyecto): void {
  const memoria = proyecto.memoria;
  if (!memoria) return;

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const margen = 52;
  const anchoUtil = anchoPagina - margen * 2;
  const ficha = fichaDisciplina(proyecto.disciplina);

  // --- Portada ---
  doc.setFillColor(...ACENTO);
  doc.rect(0, 0, anchoPagina, 6, "F");

  let y = 150;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...GRIS);
  doc.text("ANDRES Engineering AI", margen, y);
  y += 34;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...TINTA);
  doc.text("MEMORIA TÉCNICA", margen, y);
  y += 26;
  doc.setFontSize(15);
  doc.setTextColor(...ACENTO);
  doc.text("Descriptiva y de cálculo", margen, y);
  y += 46;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...TINTA);
  const lineasNombre = doc.splitTextToSize(proyecto.nombre, anchoUtil);
  doc.text(lineasNombre, margen, y);
  y += lineasNombre.length * 18 + 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...GRIS);
  doc.text(
    [
      `Disciplina: ${ficha.nombre}`,
      `Ubicación: ${proyecto.ubicacion || "No especificada"}`,
      `Fecha: ${fechaLarga(proyecto.creadoEn)}`,
      proyecto.modoDemo
        ? "Documento de DEMOSTRACIÓN, sin validez contractual."
        : "Anteproyecto asistido por IA. Requiere validación y firma de un responsable técnico.",
    ],
    margen,
    y,
    { lineHeightFactor: 1.7 },
  );

  doc.addPage();
  y = margen;

  // --- Cuerpo ---
  y = seccion(doc, "1. Objeto", margen, y);
  y = parrafo(doc, memoria.objeto, margen, y, anchoUtil);

  y = seccion(doc, "2. Antecedentes", margen, y);
  y = parrafo(doc, memoria.antecedentes, margen, y, anchoUtil);

  y = seccion(doc, "3. Normativa aplicable", margen, y);
  for (const norma of memoria.normativa) {
    const lineas = doc.splitTextToSize(`— ${norma}`, anchoUtil - 8);
    y = saltar(doc, y, lineas.length * 13 + 4, margen);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TINTA);
    doc.text(lineas, margen + 6, y);
    y += lineas.length * 13 + 4;
  }
  y += 10;

  memoria.sistemas.forEach((sistema, i) => {
    y = seccion(doc, `4.${i + 1} ${sistema.nombre}`, margen, y);
    y = parrafo(doc, sistema.descripcion, margen, y, anchoUtil);

    if (sistema.criterios.length > 0) {
      y = subtitulo(doc, "Criterios de diseño", margen, y);
      for (const criterio of sistema.criterios) {
        const lineas = doc.splitTextToSize(`— ${criterio}`, anchoUtil - 8);
        y = saltar(doc, y, lineas.length * 12.5 + 4, margen);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...TINTA);
        doc.text(lineas, margen + 6, y);
        y += lineas.length * 12.5 + 4;
      }
      y += 6;
    }

    if (sistema.calculos.length > 0) {
      y = subtitulo(doc, "Memoria de cálculo", margen, y);
      autoTable(doc, {
        startY: y,
        theme: "grid",
        margin: { left: margen, right: margen },
        styles: { fontSize: 8.5, cellPadding: 5, overflow: "linebreak", textColor: TINTA },
        headStyles: { fillColor: ACENTO, textColor: 255, fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 118 },
          1: { cellWidth: 128 },
          2: { cellWidth: 128 },
          3: { cellWidth: 134 },
        },
        head: [["Concepto", "Método / fórmula", "Datos", "Resultado"]],
        body: sistema.calculos.map((c) => [c.concepto, c.metodo, c.datos, c.resultado]),
      });
      y = finalTabla(doc) + 14;
    }

    if (sistema.especificaciones.length > 0) {
      y = subtitulo(doc, "Especificaciones", margen, y);
      for (const espec of sistema.especificaciones) {
        const lineas = doc.splitTextToSize(`— ${espec}`, anchoUtil - 8);
        y = saltar(doc, y, lineas.length * 12.5 + 4, margen);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...TINTA);
        doc.text(lineas, margen + 6, y);
        y += lineas.length * 12.5 + 4;
      }
      y += 10;
    }
  });

  y = seccion(doc, "5. Conclusiones", margen, y);
  parrafo(doc, memoria.conclusiones, margen, y, anchoUtil);

  numerar(doc, margen);
  doc.save(`memoria-${normalizar(proyecto.nombre)}.pdf`);
}

function seccion(doc: jsPDF, titulo: string, margen: number, y: number): number {
  const nuevaY = saltar(doc, y, 48, margen);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(...ACENTO);
  doc.text(titulo.toUpperCase(), margen, nuevaY);
  doc.setDrawColor(...ACENTO);
  doc.setLineWidth(0.8);
  doc.line(margen, nuevaY + 5, doc.internal.pageSize.getWidth() - margen, nuevaY + 5);
  return nuevaY + 24;
}

function subtitulo(doc: jsPDF, texto: string, margen: number, y: number): number {
  const nuevaY = saltar(doc, y, 30, margen);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...TINTA);
  doc.text(texto, margen, nuevaY);
  return nuevaY + 16;
}

function parrafo(
  doc: jsPDF,
  texto: string,
  margen: number,
  y: number,
  anchoUtil: number,
): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TINTA);
  const lineas = doc.splitTextToSize(texto, anchoUtil);
  let actual = y;
  for (const linea of lineas) {
    actual = saltar(doc, actual, 14, margen);
    doc.text(linea, margen, actual);
    actual += 14;
  }
  return actual + 8;
}

function saltar(doc: jsPDF, y: number, altura: number, margen: number): number {
  if (y + altura > doc.internal.pageSize.getHeight() - margen) {
    doc.addPage();
    return margen;
  }
  return y;
}

function finalTabla(doc: jsPDF): number {
  const conTabla = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  return conTabla.lastAutoTable?.finalY ?? 100;
}

function numerar(doc: jsPDF, margen: number): void {
  const total = doc.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text(
      `Página ${i - 1} de ${total - 1}`,
      doc.internal.pageSize.getWidth() - margen,
      doc.internal.pageSize.getHeight() - 24,
      { align: "right" },
    );
    doc.text(
      "Memoria técnica · ANDRES Engineering AI",
      margen,
      doc.internal.pageSize.getHeight() - 24,
    );
  }
}

function normalizar(nombre: string): string {
  return (
    nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50)
      .toLowerCase() || "proyecto"
  );
}
