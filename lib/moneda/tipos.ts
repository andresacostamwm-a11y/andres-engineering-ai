/** Contratos del módulo de moneda. Todo importe del sistema pasa por aquí. */
import type { Moneda } from "./paises.ts";

export type { Moneda };

/**
 * Moneda de reserva cuando aún no se conoce la del proyecto (historial antiguo,
 * render antes de que llegue el evento de cierre). Nunca sustituye a la moneda
 * real: solo evita que la interfaz se quede sin nada que escribir.
 */
export const MONEDA_POR_DEFECTO: Moneda = "MXN";

/**
 * Un tipo de cambio con su procedencia.
 *
 * Nunca se guarda una tasa suelta: sin saber de cuándo es y de dónde salió, un
 * importe convertido no se puede auditar, que es justo lo que este módulo evita.
 */
export interface TipoCambio {
  origen: Moneda;
  destino: Moneda;
  /** Unidades de `destino` que compra una unidad de `origen`. */
  tasa: number;
  /** Fecha a la que corresponde la cotización, en ISO. */
  fecha: string;
  /** Momento en que se consultó, en ISO. */
  consultado: string;
  /** Quién publica la tasa. */
  fuente: string;
  /** Dirección de la fuente, para poder ir a comprobarla. */
  url: string | null;
}

/**
 * Un importe que sabe en qué moneda está.
 *
 * Existe para que no se pueda sumar ni comparar dinero de monedas distintas por
 * accidente: el tipo obliga a mirar la moneda antes de operar.
 */
export interface Importe {
  valor: number;
  moneda: Moneda;
}

/** Un importe convertido, con el rastro completo de cómo se obtuvo. */
export interface ImporteConvertido extends Importe {
  original: Importe;
  tipoCambio: TipoCambio;
}

/** Con qué condiciones económicas se hizo un presupuesto. */
export interface Economia {
  /** ISO 3166-1 alfa-2 del país donde se ejecuta la obra. */
  pais: string;
  nombrePais: string;
  /** Moneda oficial de ese país: la principal de todo el presupuesto. */
  moneda: Moneda;
  locale: string;
  /** Si el país se dedujo de la ubicación o se asumió por defecto. */
  paisDeducido: boolean;
  /** Término de la ubicación que permitió deducirlo. */
  pistaPais: string | null;
  /**
   * Fecha base de precios: a qué condiciones de mercado corresponden las cifras.
   * ISO. Se congela al generar y no se toca al refrescar el tipo de cambio.
   */
  fechaPrecios: string;
  /** Mercado de referencia declarado por el agente de costos. */
  mercado: string;
  /** Tipo de cambio con el que se emitió el presupuesto. Se conserva siempre. */
  tipoCambio: TipoCambio;
}

/** De dónde sale una cifra. Nunca se mezclan estimaciones con cotizaciones reales. */
export type OrigenPrecio = "estimacion" | "cotizacion";

/** Cotización real de un proveedor, con todo lo necesario para auditarla. */
export interface Cotizacion {
  id: string;
  /** Partida del presupuesto a la que responde, si aplica. */
  clavePartida: string | null;
  concepto: string;
  proveedor: string;
  /** ISO 3166-1 alfa-2 del país del proveedor. */
  pais: string;
  /** Importe tal y como lo entregó el proveedor, en su moneda. */
  importeOriginal: Importe;
  /** Fecha de emisión de la cotización, ISO. */
  fecha: string;
  /** Hasta cuándo es válida, ISO. Null si el proveedor no la declaró. */
  vigencia: string | null;
  /**
   * Tipo de cambio del día de emisión. Es histórico: no se actualiza nunca,
   * aunque después cambie el mercado.
   */
  tipoCambio: TipoCambio;
  /** Importe llevado a la moneda del proyecto con el tipo de cambio de emisión. */
  importeConvertido: Importe;
  notas: string | null;
}
