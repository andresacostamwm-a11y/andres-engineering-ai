/**
 * Transformaciones de datos para los gráficos analíticos del dictamen.
 *
 * Aquí no se dibuja nada: se calcula. El reparto de un treemap, los intervalos
 * de un histograma, la curva de avance acumulado y la malla de la superficie
 * son aritmética, y la aritmética del sistema va en código con pruebas —la
 * misma frontera que rige el presupuesto—. El dibujo, en SVG para pantalla y en
 * primitivas de jsPDF para el informe, consume lo que sale de aquí.
 *
 * Cada gráfico responde a una pregunta concreta del proyecto. Un gráfico que no
 * responde nada no se genera: preferimos un informe con cuatro figuras que
 * deciden algo a uno con diez que decoran.
 */
import type { Partida } from "../types.ts";
import type { ProgramaObra, RiesgoEvaluado } from "../tipos-proyecto.ts";

/* ------------------------------------------------------------- Treemap -- */

export interface CeldaTreemap {
  etiqueta: string;
  valor: number;
  /** Fracción del total, de 0 a 1. */
  fraccion: number;
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/**
 * Treemap por el algoritmo squarify.
 *
 * Se elige squarify y no el reparto por franjas porque produce rectángulos de
 * proporción cercana al cuadrado: un rectángulo largo y estrecho no deja leer
 * su etiqueta, y entonces el gráfico deja de informar.
 */
export function treemap(
  valores: { etiqueta: string; valor: number }[],
  ancho: number,
  alto: number,
): CeldaTreemap[] {
  const positivos = valores.filter((v) => v.valor > 0).sort((a, b) => b.valor - a.valor);
  const total = positivos.reduce((s, v) => s + v.valor, 0);
  if (total <= 0 || ancho <= 0 || alto <= 0) return [];

  const celdas: CeldaTreemap[] = [];
  // Se trabaja en unidades de área del lienzo para no arrastrar escalas.
  const escalados = positivos.map((v) => ({ ...v, area: (v.valor / total) * ancho * alto }));

  let libre = { x: 0, y: 0, ancho, alto };
  let fila: typeof escalados = [];
  let indice = 0;

  /** Peor proporción de la fila si se le añade `extra`. */
  const peorProporcion = (candidata: typeof escalados, lado: number): number => {
    const suma = candidata.reduce((s, v) => s + v.area, 0);
    if (suma <= 0) return Infinity;
    const maximo = Math.max(...candidata.map((v) => v.area));
    const minimo = Math.min(...candidata.map((v) => v.area));
    return Math.max((lado * lado * maximo) / (suma * suma), (suma * suma) / (lado * lado * minimo));
  };

  const volcarFila = () => {
    const suma = fila.reduce((s, v) => s + v.area, 0);
    if (suma <= 0) return;
    const horizontal = libre.ancho >= libre.alto;
    const grosor = suma / (horizontal ? libre.alto : libre.ancho);

    let desplazamiento = 0;
    for (const elemento of fila) {
      const largo = elemento.area / grosor;
      celdas.push({
        etiqueta: elemento.etiqueta,
        valor: elemento.valor,
        fraccion: elemento.valor / total,
        x: horizontal ? libre.x : libre.x + desplazamiento,
        y: horizontal ? libre.y + desplazamiento : libre.y,
        ancho: horizontal ? grosor : largo,
        alto: horizontal ? largo : grosor,
      });
      desplazamiento += largo;
    }

    if (horizontal) {
      libre = { x: libre.x + grosor, y: libre.y, ancho: libre.ancho - grosor, alto: libre.alto };
    } else {
      libre = { x: libre.x, y: libre.y + grosor, ancho: libre.ancho, alto: libre.alto - grosor };
    }
    fila = [];
  };

  while (indice < escalados.length) {
    const lado = Math.min(libre.ancho, libre.alto);
    if (lado <= 0) break;

    const candidata = [...fila, escalados[indice]];
    if (fila.length === 0 || peorProporcion(candidata, lado) <= peorProporcion(fila, lado)) {
      fila = candidata;
      indice++;
    } else {
      volcarFila();
    }
  }
  volcarFila();

  return celdas;
}

/* ---------------------------------------------------------- Histograma -- */

export interface IntervaloHistograma {
  desde: number;
  hasta: number;
  cuenta: number;
  /** Importe acumulado de las partidas del intervalo. */
  importe: number;
}

/**
 * Distribución de los importes de partida.
 *
 * El número de intervalos sale de la raíz del tamaño de la muestra, acotado
 * entre 5 y 12: menos intervalos esconden la forma y más la convierten en
 * ruido con catálogos de treinta partidas, que es lo habitual.
 */
export function histograma(valores: number[]): IntervaloHistograma[] {
  const datos = valores.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (datos.length === 0) return [];

  const minimo = datos[0];
  const maximo = datos[datos.length - 1];
  if (maximo === minimo) {
    return [{ desde: minimo, hasta: maximo, cuenta: datos.length, importe: minimo * datos.length }];
  }

  const cuantos = Math.min(12, Math.max(5, Math.round(Math.sqrt(datos.length))));
  const paso = (maximo - minimo) / cuantos;

  const intervalos: IntervaloHistograma[] = Array.from({ length: cuantos }, (_, i) => ({
    desde: minimo + paso * i,
    hasta: minimo + paso * (i + 1),
    cuenta: 0,
    importe: 0,
  }));

  for (const valor of datos) {
    // El último intervalo es cerrado por la derecha; si no, el máximo se cae fuera.
    const i = Math.min(cuantos - 1, Math.floor((valor - minimo) / paso));
    intervalos[i].cuenta++;
    intervalos[i].importe += valor;
  }

  return intervalos;
}

/* -------------------------------------------------------- Dispersión -- */

export interface PuntoDispersion {
  etiqueta: string;
  cantidad: number;
  precioUnitario: number;
  importe: number;
  disciplina: string;
}

/**
 * Nube de cantidad contra precio unitario.
 *
 * Responde a una pregunta que la tabla no contesta de un vistazo: si el coste
 * viene de mucho barato o de poco caro. Se devuelven solo las partidas con
 * ambos valores positivos, porque la escala del gráfico es logarítmica y el
 * cero no tiene logaritmo.
 */
export function dispersionDePartidas(partidas: Partida[]): PuntoDispersion[] {
  return partidas
    .filter((p) => p.cantidad > 0 && p.precioUnitario > 0)
    .map((p) => ({
      etiqueta: p.concepto,
      cantidad: p.cantidad,
      precioUnitario: p.precioUnitario,
      importe: p.importe,
      disciplina: p.disciplina,
    }));
}

/* ------------------------------------------------------------ Curva S -- */

export interface PuntoCurva {
  dia: number;
  /** Avance acumulado, de 0 a 1. */
  avance: number;
}

/**
 * Curva de avance acumulado a partir del cronograma.
 *
 * El avance se mide en días-actividad ejecutados sobre el total, repartidos de
 * forma lineal dentro de cada actividad. Es una medida del programa, no del
 * gasto: no se convierte a dinero porque no existe una asignación partida a
 * actividad, e inventarla daría una curva de coste que parecería un dato y
 * sería una suposición.
 */
export function curvaDeAvance(programa: ProgramaObra, muestras = 40): PuntoCurva[] {
  const actividades = programa.actividades.filter((a) => a.duracionDias > 0);
  const total = actividades.reduce((s, a) => s + a.duracionDias, 0);
  if (total <= 0 || programa.duracionDias <= 0) return [];

  const puntos: PuntoCurva[] = [];
  for (let i = 0; i <= muestras; i++) {
    const dia = (programa.duracionDias * i) / muestras;
    let ejecutado = 0;
    for (const actividad of actividades) {
      if (dia <= actividad.inicio) continue;
      const transcurrido = Math.min(dia - actividad.inicio, actividad.duracionDias);
      ejecutado += transcurrido;
    }
    puntos.push({ dia, avance: ejecutado / total });
  }
  return puntos;
}

/* --------------------------------------------------- Superficie 3D -- */

export interface VerticeSuperficie {
  probabilidad: number;
  impacto: number;
  severidad: number;
}

export interface PuntoRiesgo3D extends VerticeSuperficie {
  id: string;
  titulo: string;
  /** Separación lateral cuando varios riesgos caen en la misma celda. */
  desplazamiento: number;
}

export interface Superficie {
  /** Malla de vértices, fila por probabilidad y columna por impacto. */
  malla: VerticeSuperficie[][];
  /** Riesgos reales del proyecto situados sobre la superficie. */
  riesgos: PuntoRiesgo3D[];
  severidadMaxima: number;
}

/**
 * Superficie de severidad sobre el plano probabilidad × impacto.
 *
 * La severidad es el producto de ambos ejes, así que la superficie es un
 * paraboloide hiperbólico: se curva de verdad y enseña algo que la matriz plana
 * no enseña —lo rápido que crece el riesgo al moverse hacia la esquina—. Los
 * riesgos del proyecto se sitúan encima, para que el relieve tenga a quién
 * describir.
 *
 * @param resolucion Subdivisiones por eje. Más malla no aporta información y
 *                   sí ruido visual al proyectarla en isométrico.
 */
export function superficieDeSeveridad(
  riesgos: RiesgoEvaluado[],
  resolucion = 8,
): Superficie {
  const malla: VerticeSuperficie[][] = [];
  for (let i = 0; i <= resolucion; i++) {
    const fila: VerticeSuperficie[] = [];
    const probabilidad = 1 + (4 * i) / resolucion;
    for (let j = 0; j <= resolucion; j++) {
      const impacto = 1 + (4 * j) / resolucion;
      fila.push({ probabilidad, impacto, severidad: probabilidad * impacto });
    }
    malla.push(fila);
  }

  // Dos riesgos con la misma probabilidad e impacto caerían exactamente en el
  // mismo punto y sus rótulos se montarían: se reparten en torno a su celda.
  const porCelda = new Map<string, RiesgoEvaluado[]>();
  for (const riesgo of riesgos) {
    const clave = `${riesgo.probabilidad}-${riesgo.impacto}`;
    porCelda.set(clave, [...(porCelda.get(clave) ?? []), riesgo]);
  }

  const situados: PuntoRiesgo3D[] = [];
  for (const grupo of porCelda.values()) {
    grupo.forEach((r, i) => {
      situados.push({
        id: r.id,
        titulo: r.titulo,
        probabilidad: r.probabilidad,
        impacto: r.impacto,
        severidad: r.severidad,
        desplazamiento: i - (grupo.length - 1) / 2,
      });
    });
  }

  return { malla, riesgos: situados, severidadMaxima: 25 };
}

/**
 * Proyección isométrica de un punto de la superficie a coordenadas de lienzo.
 *
 * Se usa isométrica y no perspectiva porque en una figura técnica las
 * distancias iguales deben verse iguales: con perspectiva, dos riesgos con la
 * misma severidad se dibujarían a alturas distintas según dónde caigan.
 */
export function proyectarIsometrico(
  punto: VerticeSuperficie,
  ancho: number,
  alto: number,
  severidadMaxima: number,
  /** Separación lateral para riesgos que caen en la misma celda. */
  desplazamiento = 0,
): { x: number; y: number } {
  // Ejes normalizados a [0, 1].
  const u = (punto.probabilidad - 1) / 4;
  const v = (punto.impacto - 1) / 4;
  const z = punto.severidad / severidadMaxima;

  // Tres factores independientes. Atarlos a una sola constante fue el error de
  // la primera versión: la profundidad cancelaba la altura y la superficie
  // salía como una lámina plana en vez de como un relieve.
  const anchura = ancho * 0.38;
  const profundidad = alto * 0.18;
  const alturaMaxima = alto * 0.82;

  return {
    x: ancho / 2 + (v - u) * anchura + desplazamiento * 17,
    y: alto * 0.86 + (v + u) * profundidad - z * alturaMaxima,
  };
}

/* ------------------------------------------------------------ Comunes -- */

/**
 * Posición de un valor en una escala logarítmica, de 0 a 1.
 *
 * Los catálogos mezclan partidas de cientos y de millones; en escala lineal la
 * nube se apelmaza contra un eje y no se lee nada.
 */
export function posicionLogaritmica(valor: number, minimo: number, maximo: number): number {
  if (valor <= 0 || minimo <= 0 || maximo <= minimo) return 0;
  return (Math.log10(valor) - Math.log10(minimo)) / (Math.log10(maximo) - Math.log10(minimo));
}
