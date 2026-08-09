/**
 * Comparación económica de propuestas de proveedores.
 *
 * La regla que gobierna este archivo: **nunca se decide qué proveedor es más
 * barato comparando cifras en monedas distintas**. Todas se llevan primero a una
 * moneda común, y se conserva el valor original al lado para que la decisión sea
 * auditable.
 *
 * Hay dos formas legítimas de normalizar y no son intercambiables, así que se
 * eligen explícitamente en lugar de esconder una de las dos:
 *
 *  · `emision`  — cada cotización se convierte con el tipo de cambio de su propia
 *                 fecha. Responde a «cuánto costaba cada una cuando se emitió».
 *  · `comun`    — todas se convierten con un mismo tipo de cambio de hoy.
 *                 Responde a «cuánto cuesta cada una ahora mismo», que es lo que
 *                 procede para adjudicar entre ofertas vivas.
 */
import type { Cotizacion, Importe, Moneda, TipoCambio } from "./tipos.ts";
import { aMoneda, redondear } from "./conversion.ts";

export type BaseNormalizacion = "emision" | "comun";

export interface PropuestaComparada {
  cotizacion: Cotizacion;
  /** Importe tal y como lo entregó el proveedor. */
  original: Importe;
  /** Importe llevado a la moneda de comparación. */
  normalizado: Importe;
  /** Tipo de cambio realmente aplicado para normalizar esta propuesta. */
  tipoCambioAplicado: TipoCambio;
  /** true si es la más barata de las comparables. */
  masBarata: boolean;
  /** Sobrecoste porcentual frente a la más barata. 0 en la ganadora. */
  sobrecoste: number;
  /** La cotización ya venció a la fecha de comparación. */
  vencida: boolean;
  /**
   * Motivo por el que no entra en la comparación, si aplica. Una propuesta que
   * no se puede convertir se muestra, pero no compite: descartarla en silencio
   * sería peor que decir por qué no se pudo comparar.
   */
  incomparable: string | null;
}

export interface ResultadoComparacion {
  moneda: Moneda;
  base: BaseNormalizacion;
  propuestas: PropuestaComparada[];
  /** Cotizaciones que sí pudieron compararse. */
  comparables: number;
}

/**
 * Normaliza y ordena las propuestas de menor a mayor coste.
 *
 * @param tipoCambioComun Obligatorio con base `comun`: el TC de hoy aplicado a todas.
 * @param aFecha Fecha contra la que se juzga la vigencia. Por defecto, ahora.
 */
export function compararProveedores(
  cotizaciones: Cotizacion[],
  moneda: Moneda,
  base: BaseNormalizacion,
  tipoCambioComun?: TipoCambio,
  aFecha = new Date().toISOString(),
): ResultadoComparacion {
  if (base === "comun" && !tipoCambioComun) {
    throw new Error(
      "Para comparar con base común hace falta un tipo de cambio común.",
    );
  }

  const parciales = cotizaciones.map((c) => {
    const original = c.importeOriginal;
    const vencida = Boolean(c.vigencia && c.vigencia < aFecha);

    // Misma moneda: no hay conversión que hacer ni tipo de cambio que aplicar.
    if (original.moneda === moneda) {
      const identidad = aMoneda(original, moneda, c.tipoCambio);
      return {
        cotizacion: c,
        original,
        normalizado: { valor: original.valor, moneda },
        tipoCambioAplicado: identidad.tipoCambio,
        vencida,
        incomparable: null as string | null,
      };
    }

    const tc = base === "comun" ? tipoCambioComun! : c.tipoCambio;

    try {
      const convertido = aMoneda(original, moneda, tc);
      return {
        cotizacion: c,
        original,
        normalizado: { valor: convertido.valor, moneda },
        tipoCambioAplicado: convertido.tipoCambio,
        vencida,
        incomparable: null as string | null,
      };
    } catch {
      return {
        cotizacion: c,
        original,
        normalizado: { valor: Number.NaN, moneda },
        tipoCambioAplicado: tc,
        vencida,
        incomparable: `No hay tipo de cambio ${original.moneda}/${moneda} para esta cotización.`,
      };
    }
  });

  const comparables = parciales.filter((p) => !p.incomparable);
  const minimo = comparables.length
    ? Math.min(...comparables.map((p) => p.normalizado.valor))
    : 0;

  const propuestas: PropuestaComparada[] = parciales
    .map((p) => ({
      ...p,
      masBarata: !p.incomparable && p.normalizado.valor === minimo && minimo > 0,
      sobrecoste:
        p.incomparable || minimo <= 0
          ? 0
          : redondear(((p.normalizado.valor - minimo) / minimo) * 100, 2),
    }))
    // Las incomparables van al final: no compiten, pero se ven.
    .sort((a, b) => {
      if (a.incomparable && !b.incomparable) return 1;
      if (!a.incomparable && b.incomparable) return -1;
      return a.normalizado.valor - b.normalizado.valor;
    });

  return { moneda, base, propuestas, comparables: comparables.length };
}
