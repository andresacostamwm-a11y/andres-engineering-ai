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
import { fechaLarga, numero, dineroExacto } from "./formato.ts";
import { MONEDA_POR_DEFECTO } from "./moneda/tipos.ts";
import { filasFichaEconomica } from "./moneda/ficha.ts";
import type { Cotizacion } from "./moneda/tipos.ts";
import type { MemoriaProyecto, ProgramaObra, Verificacion, Viabilidad } from "./tipos-proyecto.ts";
import { dibujarDesglose, laminaAPng } from "./pdf-graficos.ts";
import { dibujarAnalitica, hayAnalitica } from "./pdf-analitica.ts";

/** Material del proyecto que el dictamen ilustra, cuando existe. */
export interface ExtrasDictamen {
  /** Láminas ya serializadas a SVG independiente. */
  svgs?: string[];
  /** Título de cada lámina, en el mismo orden que `svgs`. */
  titulos?: string[];
  memoria?: MemoriaProyecto | null;
  cotizaciones?: Cotizacion[];
  /** Cronograma con ruta crítica, si el proyecto lo tiene. */
  programa?: ProgramaObra | null;
  /** Matriz de riesgos y sensibilidad económica. */
  viabilidad?: Viabilidad | null;
  /** Informe del verificador independiente. */
  verificacion?: Verificacion | null;
}

const TINTA: [number, number, number] = [31, 41, 55];
const ACENTO: [number, number, number] = [21, 94, 133];
const GRIS: [number, number, number] = [113, 126, 143];

const COLOR_RIESGO: Record<string, [number, number, number]> = {
  critico: [168, 40, 38],
  alto: [166, 96, 22],
  medio: [140, 118, 18],
  bajo: [30, 110, 76],
};

export async function exportarDictamen(
  analisis: Analisis,
  extras: ExtrasDictamen = {},
): Promise<void> {
  const doc = await construirDictamen(analisis, extras);
  doc.save(`dictamen-${normalizar(analisis.nombreArchivo)}.pdf`);
}

/**
 * Construye el documento y lo devuelve sin guardarlo. Separarlo del guardado
 * permite generarlo también fuera del navegador —en una prueba o en un script—
 * sin depender del DOM.
 */
export async function construirDictamen(
  analisis: Analisis,
  extras: ExtrasDictamen = {},
): Promise<jsPDF> {
  const moneda = analisis.economia?.moneda ?? MONEDA_POR_DEFECTO;
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
          dineroExacto({ valor: resumen.totalEstimado, moneda }),
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

    // Condiciones económicas: sin ellas el dictamen no se puede auditar.
    y = seccion(doc, "Condiciones económicas", margen, y);
    autoTable(doc, {
      startY: y,
      theme: "grid",
      margin: { left: margen, right: margen },
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: ACENTO, textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 150, fontStyle: "bold" } },
      head: [["Concepto", "Valor"]],
      body: filasFichaEconomica(analisis.economia),
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
        dineroExacto({ valor: p.precioUnitario, moneda }),
        dineroExacto({ valor: p.importe, moneda }),
      ]),
      foot: [["", "TOTAL", "", "", "", dineroExacto({ valor: total, moneda })]],
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
    // Desglose visual: qué disciplina se lleva el presupuesto.
    y = saltarSiHaceFalta(doc, y, 40 + analisis.partidas.length * 4, margen);
    y = seccion(doc, "Distribución del presupuesto por disciplina", margen, y);
    y = dibujarDesglose(doc, analisis.partidas, moneda, margen, y, ACENTO, TINTA, GRIS);
    y += 14;

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

  // --- Cotizaciones de proveedor ---
  const cotizaciones = extras.cotizaciones ?? [];
  if (cotizaciones.length > 0) {
    y = seccion(doc, "Cotizaciones de proveedor", margen, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRIS);
    doc.text(
      "Ofertas reales con su tipo de cambio de emisión. No son las estimaciones del presupuesto.",
      margen,
      y,
    );
    y += 14;
    autoTable(doc, {
      startY: y,
      theme: "grid",
      margin: { left: margen, right: margen },
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: ACENTO, textColor: 255, fontStyle: "bold" },
      head: [["Proveedor", "Concepto", "Original", "Convertido", "TC aplicado", "Fecha · vigencia"]],
      body: cotizaciones.map((c) => [
        c.proveedor,
        c.concepto,
        dineroExacto(c.importeOriginal),
        dineroExacto(c.importeConvertido),
        c.tipoCambio.origen === c.tipoCambio.destino
          ? "misma moneda"
          : `${c.tipoCambio.tasa} · ${c.tipoCambio.fuente}`,
        `${fechaLarga(c.fecha)}${c.vigencia ? ` · vence ${fechaLarga(c.vigencia)}` : ""}`,
      ]),
    });
    y = posicionFinal(doc) + 20;
  }

  // --- Memoria técnica ---
  const memoria = extras.memoria;
  if (memoria) {
    doc.addPage();
    y = margen;
    y = seccion(doc, "Memoria técnica del proyecto", margen, y);

    for (const [titulo, texto] of [
      ["Objeto", memoria.objeto],
      ["Antecedentes", memoria.antecedentes],
    ] as const) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...TINTA);
      y = saltarSiHaceFalta(doc, y, 30, margen);
      doc.text(titulo, margen, y);
      y += 13;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const lineas = doc.splitTextToSize(texto, anchoUtil);
      y = saltarSiHaceFalta(doc, y, lineas.length * 12 + 8, margen);
      doc.text(lineas, margen, y);
      y += lineas.length * 12 + 12;
    }

    if (memoria.normativa.length > 0) {
      autoTable(doc, {
        startY: y,
        theme: "plain",
        margin: { left: margen, right: margen },
        styles: { fontSize: 8.5, cellPadding: 3, textColor: TINTA },
        head: [["Normativa aplicable"]],
        headStyles: { fontStyle: "bold", textColor: ACENTO },
        body: memoria.normativa.map((n) => [n]),
      });
      y = posicionFinal(doc) + 16;
    }

    for (const sistema of memoria.sistemas) {
      y = saltarSiHaceFalta(doc, y, 60, margen);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...ACENTO);
      doc.text(sistema.nombre, margen, y);
      y += 14;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...TINTA);
      const desc = doc.splitTextToSize(sistema.descripcion, anchoUtil);
      y = saltarSiHaceFalta(doc, y, desc.length * 12 + 8, margen);
      doc.text(desc, margen, y);
      y += desc.length * 12 + 10;

      if (sistema.criterios.length > 0) {
        for (const criterio of sistema.criterios) {
          const l = doc.splitTextToSize(`— ${criterio}`, anchoUtil - 10);
          y = saltarSiHaceFalta(doc, y, l.length * 11 + 4, margen);
          doc.text(l, margen + 8, y);
          y += l.length * 11 + 3;
        }
        y += 6;
      }

      if (sistema.calculos.length > 0) {
        autoTable(doc, {
          startY: y,
          theme: "grid",
          margin: { left: margen, right: margen },
          styles: { fontSize: 7.5, cellPadding: 3.5, valign: "top" },
          headStyles: { fillColor: ACENTO, textColor: 255, fontStyle: "bold" },
          columnStyles: {
            0: { cellWidth: 105 },
            1: { cellWidth: 120 },
            2: { cellWidth: 140 },
            3: { cellWidth: 134 },
          },
          head: [["Concepto", "Método", "Datos", "Resultado"]],
          body: sistema.calculos.map((c) => [c.concepto, c.metodo, c.datos, c.resultado]),
        });
        y = posicionFinal(doc) + 16;
      }
    }
  }

  // --- Programa de obra ---
  const programa = extras.programa;
  if (programa && programa.actividades.length > 0) {
    doc.addPage();
    y = margen;
    y = seccion(doc, "Programa de obra", margen, y);

    y = parrafo(
      doc,
      `Duración total de ${programa.duracionDias} días naturales sobre ${programa.actividades.length} actividades. ${programa.rutaCritica.length} de ellas no admiten holgura: cualquier retraso en la ruta crítica se traslada íntegro a la fecha de entrega.`,
      margen,
      y,
      anchoPagina - margen * 2,
    );

    y = dibujarGantt(doc, programa, margen, y + 6, ACENTO, TINTA, GRIS);

    autoTable(doc, {
      startY: y,
      margin: { left: margen, right: margen },
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: ACENTO, textColor: 255, fontStyle: "bold" },
      head: [["Id", "Actividad", "Frente", "Inicio", "Duración", "Holgura", "Ruta"]],
      body: programa.actividades.map((a) => [
        a.id,
        a.nombre,
        a.frente,
        `día ${a.inicio}`,
        a.hito ? "hito" : `${a.duracionDias} d`,
        `${a.holgura} d`,
        a.critica ? "Crítica" : "",
      ]),
    });
    y = posicionFinal(doc) + 16;

    if (programa.supuestos.length > 0) {
      y = subseccion(doc, "Supuestos del programa", margen, y);
      for (const supuesto of programa.supuestos) {
        y = vineta(doc, supuesto, margen, y, anchoPagina - margen * 2);
      }
    }
  }

  // --- Riesgos y viabilidad ---
  const viabilidad = extras.viabilidad;
  if (viabilidad) {
    doc.addPage();
    y = margen;
    y = seccion(doc, "Riesgos y viabilidad", margen, y);

    const { sensibilidad } = viabilidad;
    autoTable(doc, {
      startY: y,
      margin: { left: margen, right: margen },
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: ACENTO, textColor: 255, fontStyle: "bold" },
      head: [["Escenario", "Importe", "Variación sobre la base"]],
      body: [
        ["Optimista", dineroExacto({ valor: sensibilidad.optimista, moneda }), variacion(sensibilidad.optimista, sensibilidad.base)],
        ["Base", dineroExacto({ valor: sensibilidad.base, moneda }), "referencia"],
        ["Pesimista", dineroExacto({ valor: sensibilidad.pesimista, moneda }), variacion(sensibilidad.pesimista, sensibilidad.base)],
        ["Contingencia sugerida", `${sensibilidad.contingenciaPct} %`, "sobre el presupuesto base"],
      ],
    });
    y = posicionFinal(doc) + 16;

    if (sensibilidad.variables.length > 0) {
      autoTable(doc, {
        startY: y,
        margin: { left: margen, right: margen },
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: GRIS, textColor: 255, fontStyle: "bold" },
        head: [["Variable", "Variación", "Peso", "Justificación"]],
        body: sensibilidad.variables.map((v) => [
          v.concepto,
          `${v.variacionPct} %`,
          `${v.pesoPct} %`,
          v.justificacion,
        ]),
      });
      y = posicionFinal(doc) + 16;
    }

    autoTable(doc, {
      startY: y,
      margin: { left: margen, right: margen },
      styles: { fontSize: 8, cellPadding: 4, valign: "top" },
      headStyles: { fillColor: ACENTO, textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 34 }, 2: { cellWidth: 40 } },
      head: [["Id", "Riesgo", "P × I", "Descripción y mitigación"]],
      body: [...viabilidad.riesgos]
        .sort((a, b) => b.severidad - a.severidad)
        .map((r) => [
          r.id,
          r.titulo,
          `${r.probabilidad} × ${r.impacto} = ${r.severidad}`,
          `${r.descripcion}\n\nMitigación: ${r.mitigacion} (${r.responsable})`,
        ]),
      didParseCell: (datos) => {
        if (datos.section !== "body" || datos.column.index !== 2) return;
        const riesgo = [...viabilidad.riesgos].sort((a, b) => b.severidad - a.severidad)[
          datos.row.index
        ];
        if (riesgo) datos.cell.styles.textColor = COLOR_RIESGO[riesgo.nivel] ?? TINTA;
      },
    });
    y = posicionFinal(doc) + 16;

    y = subseccion(doc, "Veredicto de viabilidad", margen, y);
    y = parrafo(doc, viabilidad.veredicto, margen, y, anchoPagina - margen * 2);
    for (const condicion of viabilidad.condiciones) {
      y = vineta(doc, condicion, margen, y, anchoPagina - margen * 2);
    }
  }

  // --- Verificación independiente ---
  const verificacion = extras.verificacion;
  if (verificacion) {
    doc.addPage();
    y = margen;
    y = seccion(doc, "Verificación independiente", margen, y);

    const etiquetaVeredicto = {
      entregable: "Entregable",
      "entregable-con-reservas": "Entregable con reservas",
      "requiere-correccion": "Requiere corrección",
    }[verificacion.veredicto];

    y = parrafo(
      doc,
      `Veredicto: ${etiquetaVeredicto}. Confianza ${verificacion.confianza} de 100, sobre ${verificacion.hallazgos.length} hallazgo(s). Las comprobaciones marcadas como medidas son aritméticas o de cobertura, ejecutadas en código; las marcadas como revisión son juicio técnico del revisor.`,
      margen,
      y,
      anchoPagina - margen * 2,
    );

    if (verificacion.hallazgos.length > 0) {
      autoTable(doc, {
        startY: y + 4,
        margin: { left: margen, right: margen },
        styles: { fontSize: 8, cellPadding: 4, valign: "top" },
        headStyles: { fillColor: ACENTO, textColor: 255, fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 48 }, 1: { cellWidth: 56 } },
        head: [["Gravedad", "Ámbito", "Hallazgo, evidencia y corrección"]],
        body: verificacion.hallazgos.map((h) => [
          `${ETIQUETA_RIESGO[h.gravedad] ?? h.gravedad}\n(${h.automatico ? "medido" : "revisión"})`,
          h.ambito,
          `${h.titulo}\n\n${h.evidencia}\n\nCorrección: ${h.correccion}`,
        ]),
        didParseCell: (datos) => {
          if (datos.section !== "body" || datos.column.index !== 0) return;
          const hallazgo = verificacion.hallazgos[datos.row.index];
          if (hallazgo) datos.cell.styles.textColor = COLOR_RIESGO[hallazgo.gravedad] ?? TINTA;
        },
      });
      y = posicionFinal(doc) + 16;
    }

    if (verificacion.comprobado.length > 0) {
      y = subseccion(doc, "Qué se comprobó", margen, y);
      for (const punto of verificacion.comprobado) {
        y = vineta(doc, punto, margen, y, anchoPagina - margen * 2);
      }
    }
  }

  // --- Análisis gráfico ---
  const analitica = {
    partidas: analisis.partidas,
    programa: extras.programa ?? null,
    viabilidad: extras.viabilidad ?? null,
    moneda,
  };
  if (hayAnalitica(analitica)) {
    doc.addPage();
    y = margen;
    y = seccion(doc, "Análisis gráfico", margen, y);
    y = dibujarAnalitica(doc, analitica, margen, y);
  }

  // --- Láminas ---
  // Cada plano ocupa su página en horizontal: en vertical el cajetín queda
  // ilegible al reducirlo al ancho útil.
  const svgs = extras.svgs ?? [];
  for (const [indice, svg] of svgs.entries()) {
    const lamina = await laminaAPng(svg);
    if (!lamina) continue;

    doc.addPage("a4", "landscape");
    const anchoPagina = doc.internal.pageSize.getWidth();
    const altoPagina = doc.internal.pageSize.getHeight();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...ACENTO);
    const titulo = extras.titulos?.[indice] ?? `Lámina ${indice + 1}`;
    doc.text(titulo.toUpperCase(), margen, margen + 6);

    const disponibleAncho = anchoPagina - margen * 2;
    const disponibleAlto = altoPagina - margen * 2 - 22;
    const escala = Math.min(disponibleAncho / lamina.ancho, disponibleAlto / lamina.alto);
    const ancho = lamina.ancho * escala;
    const alto = lamina.alto * escala;

    doc.addImage(
      lamina.dataUrl,
      "PNG",
      margen + (disponibleAncho - ancho) / 2,
      margen + 18,
      ancho,
      alto,
      undefined,
      "FAST",
    );
  }

  numerarPaginas(doc, margen);
  return doc;
}

/** Encabezado de segundo nivel dentro de una sección. */
function subseccion(doc: jsPDF, titulo: string, margen: number, y: number): number {
  const nuevaY = saltarSiHaceFalta(doc, y, 30, margen);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...TINTA);
  doc.text(titulo, margen, nuevaY);
  return nuevaY + 14;
}

/** Párrafo justificado al ancho útil, con salto de página si no cabe. */
function parrafo(
  doc: jsPDF,
  texto: string,
  margen: number,
  y: number,
  ancho: number,
): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TINTA);
  const lineas = doc.splitTextToSize(texto, ancho) as string[];
  const nuevaY = saltarSiHaceFalta(doc, y, lineas.length * 12 + 8, margen);
  doc.text(lineas, margen, nuevaY);
  return nuevaY + lineas.length * 12 + 8;
}

/** Punto de una lista, con su viñeta y sangría. */
function vineta(
  doc: jsPDF,
  texto: string,
  margen: number,
  y: number,
  ancho: number,
): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TINTA);
  const lineas = doc.splitTextToSize(texto, ancho - 14) as string[];
  const nuevaY = saltarSiHaceFalta(doc, y, lineas.length * 12 + 4, margen);
  doc.setFillColor(...ACENTO);
  doc.circle(margen + 3, nuevaY - 3, 1.6, "F");
  doc.text(lineas, margen + 14, nuevaY);
  return nuevaY + lineas.length * 12 + 4;
}

/** Variación porcentual de un escenario frente a la base, con signo. */
function variacion(valor: number, base: number): string {
  if (base <= 0) return "—";
  const pct = ((valor - base) / base) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)} %`;
}

/**
 * Diagrama de Gantt vectorial dentro del PDF.
 *
 * Se dibuja con las primitivas de jsPDF y no como imagen: sale nítido a
 * cualquier zoom, no depende del canvas del navegador y pesa unos pocos kB.
 * La ruta crítica va en rojo porque es la única lectura que cambia decisiones.
 */
function dibujarGantt(
  doc: jsPDF,
  programa: ProgramaObra,
  margen: number,
  y: number,
  acento: [number, number, number],
  tinta: [number, number, number],
  gris: [number, number, number],
): number {
  const anchoUtil = doc.internal.pageSize.getWidth() - margen * 2;
  const anchoEtiqueta = 130;
  const pista = anchoUtil - anchoEtiqueta - 30;
  const altoFila = 12;
  const escala = programa.duracionDias > 0 ? pista / programa.duracionDias : 0;

  // Se limita a lo que cabe con holgura en la página; el resto va en la tabla.
  const visibles = programa.actividades.slice(0, 24);
  let cursor = saltarSiHaceFalta(doc, y, visibles.length * altoFila + 34, margen);

  // Rejilla mensual.
  const meses = Math.max(1, Math.ceil(programa.duracionDias / 30));
  doc.setFontSize(6.5);
  doc.setTextColor(...gris);
  for (let m = 0; m <= meses; m++) {
    const dia = Math.min(m * 30, programa.duracionDias);
    const x = margen + anchoEtiqueta + dia * escala;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(x, cursor, x, cursor + visibles.length * altoFila + 6);
    doc.text(m === 0 ? "Inicio" : `Mes ${m}`, x, cursor - 4, { align: "center" });
  }

  cursor += 6;
  for (const actividad of visibles) {
    const x = margen + anchoEtiqueta + actividad.inicio * escala;
    const largo = Math.max(1.5, actividad.duracionDias * escala);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...tinta);
    doc.text(`${actividad.id} ${recortarTexto(actividad.nombre, 34)}`, margen, cursor + 6);

    if (actividad.critica) doc.setFillColor(168, 40, 38);
    else doc.setFillColor(...acento);
    doc.roundedRect(x, cursor + 1.5, largo, 6, 1.5, 1.5, "F");

    cursor += altoFila;
  }

  if (programa.actividades.length > visibles.length) {
    doc.setFontSize(6.5);
    doc.setTextColor(...gris);
    doc.text(
      `Se representan las primeras ${visibles.length} actividades; el detalle completo está en la tabla siguiente.`,
      margen,
      cursor + 8,
    );
    cursor += 12;
  }

  return cursor + 14;
}

function recortarTexto(texto: string, maximo: number): string {
  return texto.length <= maximo ? texto : `${texto.slice(0, maximo - 1)}…`;
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
