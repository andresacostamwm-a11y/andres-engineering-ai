/**
 * Aritmética de moneda. Determinista y sin red: todo lo que se convierte aquí
 * se puede probar y auditar.
 *
 * Regla que gobierna el módulo: **una cifra nunca se convierte dos veces**. Los
 * importes viven en la moneda del proyecto y la conversión a USD se calcula al
 * mostrarla, a partir del original. Nunca se convierte un valor ya convertido.
 */
import type { Importe, ImporteConvertido, Moneda, TipoCambio } from "./tipos.ts";

/** Redondeo a dos decimales sin el ruido del punto flotante. */
export function redondear(n: number, decimales = 2): number {
  const f = 10 ** decimales;
  return Math.round((n + Number.EPSILON) * f) / f;
}

/** Tipo de cambio identidad: convertir una moneda a sí misma no la altera. */
export function tipoCambioIdentidad(moneda: Moneda, fecha: string): TipoCambio {
  return {
    origen: moneda,
    destino: moneda,
    tasa: 1,
    fecha,
    consultado: fecha,
    fuente: "Identidad (misma moneda)",
    url: null,
  };
}

/** Invierte un tipo de cambio conservando su procedencia. */
export function invertir(tc: TipoCambio): TipoCambio {
  if (tc.tasa === 0) {
    throw new Error("No se puede invertir un tipo de cambio de tasa cero.");
  }
  return {
    ...tc,
    origen: tc.destino,
    destino: tc.origen,
    tasa: 1 / tc.tasa,
  };
}

/**
 * Convierte un importe aplicando un tipo de cambio.
 *
 * Exige que el tipo de cambio corresponda al par que se está convirtiendo: si no
 * cuadra, falla en vez de devolver una cifra plausible pero equivocada. Acepta el
 * tipo de cambio invertido y lo invierte él mismo, que es el error más fácil de
 * cometer al llamar.
 */
export function convertir(importe: Importe, tc: TipoCambio): ImporteConvertido {
  if (importe.moneda === tc.origen) {
    return {
      valor: redondear(importe.valor * tc.tasa),
      moneda: tc.destino,
      original: importe,
      tipoCambio: tc,
    };
  }

  if (importe.moneda === tc.destino) {
    const inverso = invertir(tc);
    return {
      valor: redondear(importe.valor * inverso.tasa),
      moneda: inverso.destino,
      original: importe,
      tipoCambio: inverso,
    };
  }

  throw new Error(
    `El tipo de cambio ${tc.origen}/${tc.destino} no sirve para convertir ${importe.moneda}.`,
  );
}

/** Convierte solo si hace falta: mismo par de monedas, mismo importe. */
export function aMoneda(
  importe: Importe,
  destino: Moneda,
  tc: TipoCambio,
): ImporteConvertido {
  if (importe.moneda === destino) {
    return {
      ...importe,
      original: importe,
      tipoCambio: tipoCambioIdentidad(destino, tc.fecha),
    };
  }
  return convertir(importe, tc);
}

/**
 * Variación porcentual entre el tipo de cambio de una cotización y el vigente.
 *
 * Positiva significa que la moneda origen se encareció frente a la destino desde
 * que se emitió la cotización.
 */
export function variacion(historico: TipoCambio, actual: TipoCambio): number {
  const mismoPar =
    historico.origen === actual.origen && historico.destino === actual.destino;
  const par = mismoPar ? actual : invertir(actual);

  if (historico.origen !== par.origen || historico.destino !== par.destino) {
    throw new Error("No se pueden comparar tipos de cambio de pares distintos.");
  }
  if (historico.tasa === 0) return 0;

  return redondear(((par.tasa - historico.tasa) / historico.tasa) * 100, 2);
}

/**
 * Suma importes exigiendo que compartan moneda.
 *
 * Sumar monedas distintas es el error que este módulo existe para impedir, así
 * que aquí es un fallo declarado y no una suma silenciosa.
 */
export function sumar(importes: Importe[], moneda: Moneda): Importe {
  let total = 0;
  for (const i of importes) {
    if (i.moneda !== moneda) {
      throw new Error(
        `No se puede sumar ${i.moneda} dentro de un total en ${moneda}. Normaliza antes de sumar.`,
      );
    }
    total += i.valor;
  }
  return { valor: redondear(total), moneda };
}
