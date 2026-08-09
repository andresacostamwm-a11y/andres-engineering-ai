/**
 * Construye la ficha económica de un presupuesto: en qué país se ejecuta, en qué
 * moneda se costea, con qué tipo de cambio y a qué fecha de precios.
 *
 * Se calcula una sola vez, al generar, y a partir de ahí queda congelada. Al
 * refrescar el tipo de cambio se obtiene uno nuevo para mostrar el equivalente
 * de hoy, pero este no se toca: es el que respalda las cifras emitidas.
 */
import type { Economia, Moneda } from "./tipos.ts";
import { deducirPais, type FichaPais } from "./paises.ts";
import { tipoCambioAUsd } from "./tipoCambio.ts";
import { tipoCambioIdentidad } from "./conversion.ts";

/**
 * Deduce el país de una ubicación explícita y, si no la hay, del propio texto
 * del documento. Un pliego casi siempre nombra la plaza en las primeras páginas.
 */
export function paisDelProyecto(
  ubicacion: string,
  textoDeRespaldo = "",
): ReturnType<typeof deducirPais> {
  const porUbicacion = deducirPais(ubicacion);
  if (porUbicacion.deducido) return porUbicacion;
  return deducirPais(textoDeRespaldo.slice(0, 6000));
}

/**
 * Arma la ficha económica. Si el tipo de cambio no se puede consultar, el
 * presupuesto no se bloquea: se emite con la identidad y se deja constancia en
 * la fuente, porque es preferible un presupuesto en moneda local sin equivalente
 * en dólares que uno con un equivalente inventado.
 */
export async function construirEconomia(opciones: {
  pais: FichaPais;
  pistaPais: string | null;
  paisDeducido: boolean;
  mercado: string;
  /** ISO. Por defecto, ahora: es la fecha base de precios del presupuesto. */
  fechaPrecios?: string;
}): Promise<Economia> {
  const fechaPrecios = opciones.fechaPrecios ?? new Date().toISOString();

  let tipoCambio;
  try {
    tipoCambio = await tipoCambioAUsd(opciones.pais.moneda);
  } catch {
    tipoCambio = {
      ...tipoCambioIdentidad(opciones.pais.moneda, fechaPrecios),
      destino: "USD" as Moneda,
      fuente: "No disponible al emitir: no se pudo consultar el tipo de cambio",
    };
  }

  return {
    pais: opciones.pais.codigo,
    nombrePais: opciones.pais.nombre,
    moneda: opciones.pais.moneda,
    locale: opciones.pais.locale,
    paisDeducido: opciones.paisDeducido,
    pistaPais: opciones.pistaPais,
    fechaPrecios,
    mercado: opciones.mercado,
    tipoCambio,
  };
}

/** ¿La ficha económica trae un tipo de cambio real o solo el marcador de fallo? */
export function tieneTipoCambioReal(economia: Economia | null): boolean {
  if (!economia) return false;
  const tc = economia.tipoCambio;
  return tc.origen !== tc.destino && tc.tasa > 0 && !tc.fuente.startsWith("No disponible");
}
