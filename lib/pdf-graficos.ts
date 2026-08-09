/**
 * Piezas gráficas del dictamen en PDF: las láminas y el desglose del presupuesto.
 *
 * Los planos se dibujan en SVG dentro de la aplicación, y el PDF necesita mapa
 * de bits. La conversión se hace en el navegador con un canvas, sin librería ni
 * servicio externo: el documento analizado no sale del equipo, y su dictamen
 * tampoco debería salir para poder ilustrarse.
 */
"use client";

import type { jsPDF } from "jspdf";
import type { Partida } from "./types.ts";
import { ETIQUETA_DISCIPLINA } from "./types.ts";
import type { Moneda } from "./moneda/tipos.ts";
import { dineroExacto } from "./formato.ts";

/** Tamaño nominal de una lámina, el mismo que usa el renderizador de planos. */
const ANCHO_PLANO = 1200;
const ALTO_PLANO = 900;

export interface LaminaRasterizada {
  dataUrl: string;
  ancho: number;
  alto: number;
}

/**
 * Convierte una lámina SVG en PNG.
 *
 * Se fuerzan `width` y `height` en la copia porque los planos solo declaran
 * `viewBox`: sin dimensiones explícitas, el navegador carga la imagen con
 * tamaño natural cero y el canvas saldría en blanco.
 *
 * @param escala Multiplicador de resolución. 2 basta para que el texto del
 *               cajetín se lea impreso sin disparar el peso del archivo.
 */
export async function laminaAPng(
  svg: string,
  escala = 2,
): Promise<LaminaRasterizada | null> {
  if (typeof document === "undefined") return null;

  // Ojo: buscar "width=" en toda la cadena da falso positivo con `stroke-width`,
  // que llevan todas las láminas. Hay que mirar solo la etiqueta <svg> de apertura.
  const tieneMedidas = /<svg[^>]*\swidth\s*=/.test(svg);
  const conMedidas = tieneMedidas
    ? svg
    : svg.replace("<svg", `<svg width="${ANCHO_PLANO}" height="${ALTO_PLANO}"`);

  const blob = new Blob([conMedidas], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const imagen = new Image();
    imagen.decoding = "sync";
    await new Promise<void>((resolver, rechazar) => {
      imagen.onload = () => resolver();
      imagen.onerror = () => rechazar(new Error("No se pudo cargar la lámina."));
      imagen.src = url;
    });

    const ancho = imagen.naturalWidth || ANCHO_PLANO;
    const alto = imagen.naturalHeight || ALTO_PLANO;

    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(ancho * escala);
    lienzo.height = Math.round(alto * escala);

    const ctx = lienzo.getContext("2d");
    if (!ctx) return null;

    // Fondo blanco: el PNG con alfa saldría negro al incrustarse en el PDF.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, lienzo.width, lienzo.height);
    ctx.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);

    return { dataUrl: lienzo.toDataURL("image/png"), ancho, alto };
  } catch {
    // Una lámina que no se puede rasterizar no debe tumbar el dictamen entero.
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Importe acumulado por disciplina, de mayor a menor. */
export function totalesPorDisciplina(partidas: Partida[]): [string, number][] {
  const acumulado = new Map<string, number>();
  for (const p of partidas) {
    acumulado.set(p.disciplina, (acumulado.get(p.disciplina) ?? 0) + p.importe);
  }
  return [...acumulado.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * Barras horizontales del presupuesto por disciplina.
 *
 * Se dibuja con las primitivas de jsPDF en lugar de incrustar una imagen: sale
 * vectorial, pesa nada y se puede seleccionar el texto de las etiquetas.
 */
export function dibujarDesglose(
  doc: jsPDF,
  partidas: Partida[],
  moneda: Moneda,
  margen: number,
  y: number,
  acento: [number, number, number],
  tinta: [number, number, number],
  gris: [number, number, number],
): number {
  const totales = totalesPorDisciplina(partidas);
  if (totales.length === 0) return y;

  const total = totales.reduce((s, [, v]) => s + v, 0);
  const maximo = totales[0][1];
  const anchoUtil = doc.internal.pageSize.getWidth() - margen * 2;
  const anchoEtiqueta = 150;
  const anchoImporte = 120;
  const anchoBarra = anchoUtil - anchoEtiqueta - anchoImporte - 16;
  const altoFila = 20;

  let cursor = y;
  for (const [disciplina, importe] of totales) {
    const etiqueta =
      ETIQUETA_DISCIPLINA[disciplina as keyof typeof ETIQUETA_DISCIPLINA] ?? disciplina;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...tinta);
    doc.text(etiqueta, margen, cursor + 9, { maxWidth: anchoEtiqueta - 6 });

    // Carril de fondo y barra proporcional al mayor.
    const x0 = margen + anchoEtiqueta;
    doc.setFillColor(232, 238, 243);
    doc.roundedRect(x0, cursor + 1, anchoBarra, 10, 2, 2, "F");
    doc.setFillColor(...acento);
    doc.roundedRect(x0, cursor + 1, Math.max(2, (importe / maximo) * anchoBarra), 10, 2, 2, "F");

    doc.setTextColor(...tinta);
    doc.text(dineroExacto({ valor: importe, moneda }), margen + anchoUtil, cursor + 9, {
      align: "right",
    });

    doc.setFontSize(7.5);
    doc.setTextColor(...gris);
    doc.text(`${Math.round((importe / total) * 100)} %`, x0 + anchoBarra + 8, cursor + 9);

    cursor += altoFila;
  }

  return cursor + 6;
}
