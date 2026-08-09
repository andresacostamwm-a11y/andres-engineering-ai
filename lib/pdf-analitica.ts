/**
 * Los gráficos analíticos dentro del dictamen en PDF.
 *
 * Se dibujan con las primitivas de jsPDF y no como imagen rasterizada: salen
 * vectoriales, se pueden ampliar sin pixelar al revisar el documento y pesan
 * unos pocos kilobytes. Consumen exactamente las mismas funciones de
 * `lib/graficos/analitica` que la vista de pantalla, así que el informe y la
 * aplicación no pueden contar cosas distintas.
 */
"use client";

import type { jsPDF } from "jspdf";
import type { Partida } from "./types.ts";
import { ETIQUETA_DISCIPLINA } from "./types.ts";
import type { ProgramaObra, Viabilidad } from "./tipos-proyecto.ts";
import type { Moneda } from "./moneda/tipos.ts";
import { dinero, numero } from "./formato.ts";
import {
  curvaDeAvance,
  dispersionDePartidas,
  histograma,
  posicionLogaritmica,
  proyectarIsometrico,
  superficieDeSeveridad,
  treemap,
} from "./graficos/analitica.ts";

type Color = [number, number, number];

/** Paleta impresa: la del tema no sirve porque el PDF no tiene variables CSS. */
const PALETA: Color[] = [
  [21, 94, 133],
  [64, 140, 190],
  [176, 140, 68],
  [40, 130, 100],
  [150, 120, 30],
  [176, 106, 34],
  [168, 40, 38],
];

const TINTA: Color = [31, 41, 55];
const GRIS: Color = [113, 126, 143];
const BORDE: Color = [206, 216, 226];

export interface DatosAnalitica {
  partidas: Partida[];
  programa: ProgramaObra | null;
  viabilidad: Viabilidad | null;
  moneda: Moneda;
}

/** ¿Hay material para dibujar algo? */
export function hayAnalitica(datos: DatosAnalitica): boolean {
  return datos.partidas.length > 0 || Boolean(datos.programa) || Boolean(datos.viabilidad);
}

/**
 * Dibuja la sección completa de análisis gráfico.
 *
 * Cada figura ocupa su bloque con título y con la pregunta que responde: un
 * gráfico sin pregunta es decoración, y en un dictamen la decoración estorba.
 */
export function dibujarAnalitica(
  doc: jsPDF,
  datos: DatosAnalitica,
  margen: number,
  yInicial: number,
): number {
  const anchoUtil = doc.internal.pageSize.getWidth() - margen * 2;
  const altoPagina = doc.internal.pageSize.getHeight();
  let y = yInicial;

  const nuevaFigura = (alto: number, titulo: string, pregunta: string): number => {
    if (y + alto + 52 > altoPagina - margen) {
      doc.addPage();
      y = margen;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...TINTA);
    doc.text(titulo, margen, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    const lineas = doc.splitTextToSize(pregunta, anchoUtil) as string[];
    doc.text(lineas, margen, y + 12);
    return y + 14 + lineas.length * 10;
  };

  if (datos.partidas.length > 0) {
    let cursor = nuevaFigura(
      190,
      "Mapa de árbol del presupuesto",
      "¿Dónde está el dinero? El área de cada bloque es el peso real de esa partida sobre el total; el color indica su disciplina.",
    );
    cursor = dibujarTreemap(doc, datos, margen, cursor, anchoUtil, 190);
    y = cursor + 22;

    cursor = nuevaFigura(
      170,
      "Histograma de importes de partida",
      "¿El coste está repartido entre muchas partidas o lo cargan unas pocas grandes?",
    );
    cursor = dibujarHistograma(doc, datos, margen, cursor, anchoUtil, 170);
    y = cursor + 22;

    cursor = nuevaFigura(
      180,
      "Dispersión: cantidad contra precio unitario",
      "¿El importe viene de mucho barato o de poco caro? El diámetro del punto es su importe. Ambos ejes en escala logarítmica.",
    );
    cursor = dibujarDispersion(doc, datos, margen, cursor, anchoUtil, 180);
    y = cursor + 22;
  }

  if (datos.programa) {
    const cursor = nuevaFigura(
      165,
      "Curva de avance acumulado",
      "¿Cómo se reparte la carga de obra a lo largo del plazo? Medida en días-actividad ejecutados, no en dinero. La diagonal punteada es el reparto uniforme.",
    );
    y = dibujarCurva(doc, datos.programa, margen, cursor, anchoUtil, 165) + 22;
  }

  if (datos.viabilidad && datos.viabilidad.riesgos.length > 0) {
    const cursor = nuevaFigura(
      230,
      "Superficie 3D de severidad del riesgo",
      "¿Hacia dónde se dispara el riesgo? La altura de la superficie es probabilidad × impacto, y los puntos son los riesgos reales del proyecto situados sobre ella.",
    );
    y = dibujarSuperficie(doc, datos.viabilidad, margen, cursor, anchoUtil, 230) + 16;
  }

  return y;
}

/* ------------------------------------------------------------- Treemap -- */

function dibujarTreemap(
  doc: jsPDF,
  { partidas, moneda }: DatosAnalitica,
  x0: number,
  y0: number,
  ancho: number,
  alto: number,
): number {
  // Por partida y no por disciplina: en un proyecto de una sola especialidad el
  // treemap por disciplina es un rectángulo único que no informa de nada.
  const ordenadas = [...partidas].sort((a, b) => b.importe - a.importe);
  const disciplinas = [...new Set<string>(ordenadas.map((p) => p.disciplina))];
  const disciplinaDe = new Map<string, string>(ordenadas.map((p) => [p.concepto, p.disciplina]));

  const celdas = treemap(
    ordenadas.map((p) => ({ etiqueta: p.concepto, valor: p.importe })),
    ancho,
    alto,
  );

  for (const celda of celdas) {
    const indice = Math.max(0, disciplinas.indexOf(disciplinaDe.get(celda.etiqueta) ?? ""));
    const intensidad = 0.32 + 0.55 * Math.sqrt(celda.fraccion);
    doc.setFillColor(...mezclar(PALETA[indice % PALETA.length], intensidad));
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(1.4);
    doc.rect(x0 + celda.x, y0 + celda.y, celda.ancho, celda.alto, "FD");

    if (celda.ancho > 96 && celda.alto > 32) {
      // El relleno solo llega a ser oscuro de verdad en las celdas grandes; por
      // debajo de ese punto, la tinta contrasta mejor que el blanco.
      const claro = intensidad < 0.75;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      if (claro) doc.setTextColor(...TINTA);
      else doc.setTextColor(255, 255, 255);
      doc.text(recortar(celda.etiqueta, Math.floor((celda.ancho - 14) / 3.9)), x0 + celda.x + 6, y0 + celda.y + 13);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      if (claro) doc.setTextColor(90, 100, 112);
      else doc.setTextColor(240, 246, 251);
      doc.text(
        `${dinero({ valor: celda.valor, moneda })} · ${Math.round(celda.fraccion * 100)} %`,
        x0 + celda.x + 6,
        y0 + celda.y + 24,
      );
    }
  }

  return y0 + alto;
}

/* ---------------------------------------------------------- Histograma -- */

function dibujarHistograma(
  doc: jsPDF,
  { partidas, moneda }: DatosAnalitica,
  x0: number,
  y0: number,
  ancho: number,
  alto: number,
): number {
  const intervalos = histograma(partidas.map((p) => p.importe));
  if (intervalos.length === 0) return y0;

  const margenIzq = 34;
  const margenInf = 26;
  const util = { ancho: ancho - margenIzq, alto: alto - margenInf };
  const maximo = Math.max(...intervalos.map((i) => i.cuenta));
  const anchoBarra = util.ancho / intervalos.length;

  doc.setLineWidth(0.5);
  for (const f of [0, 0.5, 1]) {
    const y = y0 + util.alto * (1 - f);
    doc.setDrawColor(...BORDE);
    doc.line(x0 + margenIzq, y, x0 + ancho, y);
    doc.setFontSize(7);
    doc.setTextColor(...GRIS);
    doc.text(String(Math.round(maximo * f)), x0 + margenIzq - 5, y + 3, { align: "right" });
  }

  intervalos.forEach((intervalo, i) => {
    const altoBarra = maximo > 0 ? (intervalo.cuenta / maximo) * util.alto : 0;
    doc.setFillColor(...PALETA[0]);
    doc.rect(
      x0 + margenIzq + i * anchoBarra + 1.5,
      y0 + util.alto - altoBarra,
      Math.max(1, anchoBarra - 3),
      altoBarra,
      "F",
    );
    if (intervalo.cuenta > 0) {
      doc.setFontSize(6.5);
      doc.setTextColor(...GRIS);
      doc.text(
        String(intervalo.cuenta),
        x0 + margenIzq + i * anchoBarra + anchoBarra / 2,
        y0 + util.alto - altoBarra - 3,
        { align: "center" },
      );
    }
  });

  doc.setFontSize(7);
  doc.setTextColor(...GRIS);
  doc.text(dinero({ valor: intervalos[0].desde, moneda }), x0 + margenIzq, y0 + alto - 8);
  doc.text(
    dinero({ valor: intervalos[intervalos.length - 1].hasta, moneda }),
    x0 + ancho,
    y0 + alto - 8,
    { align: "right" },
  );

  return y0 + alto;
}

/* --------------------------------------------------------- Dispersión -- */

function dibujarDispersion(
  doc: jsPDF,
  { partidas, moneda }: DatosAnalitica,
  x0: number,
  y0: number,
  ancho: number,
  alto: number,
): number {
  const puntos = dispersionDePartidas(partidas);
  if (puntos.length < 2) return y0;

  const margenIzq = 40;
  const margenInf = 28;
  const util = { ancho: ancho - margenIzq, alto: alto - margenInf };

  const xMin = Math.min(...puntos.map((p) => p.cantidad));
  const xMax = Math.max(...puntos.map((p) => p.cantidad));
  const yMin = Math.min(...puntos.map((p) => p.precioUnitario));
  const yMax = Math.max(...puntos.map((p) => p.precioUnitario));
  const importeMax = Math.max(...puntos.map((p) => p.importe));

  doc.setDrawColor(...BORDE);
  doc.setLineWidth(0.6);
  doc.rect(x0 + margenIzq, y0, util.ancho, util.alto);

  const disciplinas = [...new Set(puntos.map((p) => p.disciplina))];

  for (const punto of puntos) {
    const x = x0 + margenIzq + posicionLogaritmica(punto.cantidad, xMin, xMax) * util.ancho;
    const y = y0 + (1 - posicionLogaritmica(punto.precioUnitario, yMin, yMax)) * util.alto;
    const r = 2 + 6 * Math.sqrt(punto.importe / importeMax);
    const color = PALETA[disciplinas.indexOf(punto.disciplina) % PALETA.length];
    doc.setFillColor(...mezclar(color, 0.55));
    doc.circle(x, y, r, "F");
  }

  doc.setFontSize(7);
  doc.setTextColor(...GRIS);
  doc.text(`Cantidad: ${numero(xMin)} a ${numero(xMax)}`, x0 + margenIzq, y0 + alto - 14);
  doc.text(
    `Precio unitario: ${dinero({ valor: yMin, moneda })} a ${dinero({ valor: yMax, moneda })}`,
    x0 + ancho,
    y0 + alto - 14,
    { align: "right" },
  );

  disciplinas.slice(0, 5).forEach((d, i) => {
    const x = x0 + margenIzq + i * 96;
    doc.setFillColor(...mezclar(PALETA[i % PALETA.length], 0.7));
    doc.circle(x + 3, y0 + alto - 4, 3, "F");
    doc.setFontSize(6.5);
    doc.setTextColor(...GRIS);
    doc.text(etiqueta(d).slice(0, 16), x + 9, y0 + alto - 2);
  });

  return y0 + alto;
}

/* ------------------------------------------------------------ Curva S -- */

function dibujarCurva(
  doc: jsPDF,
  programa: ProgramaObra,
  x0: number,
  y0: number,
  ancho: number,
  alto: number,
): number {
  const curva = curvaDeAvance(programa);
  if (curva.length < 2) return y0;

  const margenIzq = 34;
  const margenInf = 22;
  const util = { ancho: ancho - margenIzq, alto: alto - margenInf };

  for (const f of [0, 0.25, 0.5, 0.75, 1]) {
    const y = y0 + util.alto * (1 - f);
    doc.setDrawColor(...BORDE);
    doc.setLineWidth(0.5);
    doc.line(x0 + margenIzq, y, x0 + ancho, y);
    doc.setFontSize(7);
    doc.setTextColor(...GRIS);
    doc.text(`${Math.round(f * 100)} %`, x0 + margenIzq - 5, y + 3, { align: "right" });
  }

  // Reparto uniforme, como referencia visual.
  doc.setDrawColor(...GRIS);
  doc.setLineWidth(0.6);
  doc.setLineDashPattern([3, 3], 0);
  doc.line(x0 + margenIzq, y0 + util.alto, x0 + margenIzq + util.ancho, y0);
  doc.setLineDashPattern([], 0);

  doc.setDrawColor(...PALETA[0]);
  doc.setLineWidth(1.8);
  for (let i = 1; i < curva.length; i++) {
    const a = curva[i - 1];
    const b = curva[i];
    doc.line(
      x0 + margenIzq + (a.dia / programa.duracionDias) * util.ancho,
      y0 + (1 - a.avance) * util.alto,
      x0 + margenIzq + (b.dia / programa.duracionDias) * util.ancho,
      y0 + (1 - b.avance) * util.alto,
    );
  }

  doc.setFontSize(7);
  doc.setTextColor(...GRIS);
  doc.text("Día 0", x0 + margenIzq, y0 + alto - 6);
  doc.text(`Día ${programa.duracionDias}`, x0 + ancho, y0 + alto - 6, { align: "right" });

  return y0 + alto;
}

/* ------------------------------------------------------- Superficie 3D -- */

function dibujarSuperficie(
  doc: jsPDF,
  viabilidad: Viabilidad,
  x0: number,
  y0: number,
  ancho: number,
  alto: number,
): number {
  const superficie = superficieDeSeveridad(viabilidad.riesgos);
  const proyectar = (
    v: { probabilidad: number; impacto: number; severidad: number },
    desplazamiento = 0,
  ) => {
    const p = proyectarIsometrico(v, ancho, alto, superficie.severidadMaxima, desplazamiento);
    return { x: x0 + p.x, y: y0 + p.y };
  };

  const caras: { puntos: { x: number; y: number }[]; severidad: number; profundidad: number }[] = [];
  for (let i = 0; i < superficie.malla.length - 1; i++) {
    for (let j = 0; j < superficie.malla[i].length - 1; j++) {
      const esquinas = [
        superficie.malla[i][j],
        superficie.malla[i][j + 1],
        superficie.malla[i + 1][j + 1],
        superficie.malla[i + 1][j],
      ];
      caras.push({
        puntos: esquinas.map((e) => proyectar(e)),
        severidad: esquinas.reduce((s, e) => s + e.severidad, 0) / 4,
        profundidad: -(i + j),
      });
    }
  }
  // De atrás hacia delante: sin ordenar, una cara lejana taparía una cercana.
  caras.sort((a, b) => b.profundidad - a.profundidad);

  doc.setLineWidth(0.3);
  for (const cara of caras) {
    doc.setFillColor(...mezclar(colorSeveridad(cara.severidad), 0.25 + 0.6 * (cara.severidad / 25)));
    doc.setDrawColor(...BORDE);
    cuadrilatero(doc, cara.puntos);
  }

  for (const riesgo of superficie.riesgos) {
    const arriba = proyectar(riesgo, riesgo.desplazamiento);
    const suelo = proyectar({ ...riesgo, severidad: 0 }, riesgo.desplazamiento);

    doc.setDrawColor(...GRIS);
    doc.setLineWidth(0.5);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(suelo.x, suelo.y, arriba.x, arriba.y);
    doc.setLineDashPattern([], 0);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...colorSeveridad(riesgo.severidad));
    doc.setLineWidth(1.4);
    doc.circle(arriba.x, arriba.y, 4, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...TINTA);
    // Escalonado: dos riesgos vecinos con rótulo a la misma altura se tocan.
    const alturaRotulo = arriba.y - 7 - Math.abs(riesgo.desplazamiento) * 7;
    doc.text(riesgo.id, arriba.x, alturaRotulo, { align: "center" });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GRIS);
  const izquierda = proyectar({ probabilidad: 5, impacto: 1, severidad: 0 });
  const derecha = proyectar({ probabilidad: 1, impacto: 5, severidad: 0 });
  doc.text("Probabilidad 5", izquierda.x, izquierda.y + 12, { align: "right" });
  doc.text("Impacto 5", derecha.x, derecha.y + 12);

  return y0 + alto;
}

/* ------------------------------------------------------------ Utilería -- */

/**
 * Cara cuadrangular de la malla, dibujada como dos triángulos.
 *
 * jsPDF cierra mal un polígono de cuatro vértices con `lines`: la figura salía
 * con picos y la superficie parecía astillada. `triangle` sí rellena de forma
 * fiable, y dos triángulos cubren exactamente el mismo cuadrilátero.
 */
function cuadrilatero(doc: jsPDF, p: { x: number; y: number }[]): void {
  if (p.length < 4) return;
  doc.triangle(p[0].x, p[0].y, p[1].x, p[1].y, p[2].x, p[2].y, "F");
  doc.triangle(p[0].x, p[0].y, p[2].x, p[2].y, p[3].x, p[3].y, "F");
}

/** Aclara un color hacia blanco. `fuerza` 1 lo deja intacto, 0 lo vuelve blanco. */
function mezclar(color: Color, fuerza: number): Color {
  const f = Math.min(1, Math.max(0, fuerza));
  return [
    Math.round(255 + (color[0] - 255) * f),
    Math.round(255 + (color[1] - 255) * f),
    Math.round(255 + (color[2] - 255) * f),
  ];
}

function colorSeveridad(severidad: number): Color {
  if (severidad >= 15) return [168, 40, 38];
  if (severidad >= 9) return [176, 106, 34];
  if (severidad >= 4) return [150, 120, 30];
  return [21, 94, 133];
}

function recortar(texto: string, maximo: number): string {
  return texto.length <= maximo ? texto : `${texto.slice(0, Math.max(3, maximo - 1))}…`;
}

function etiqueta(disciplina: string): string {
  return ETIQUETA_DISCIPLINA[disciplina as keyof typeof ETIQUETA_DISCIPLINA] ?? disciplina;
}
