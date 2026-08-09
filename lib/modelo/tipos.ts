/** Contrato común a todos los proveedores de modelo. */
import type { z } from "zod";

export type Proveedor = "claude" | "gemini" | "openai";

export interface PeticionAgente {
  /** Identificador del modelo dentro del proveedor; si falta, usa su predeterminado. */
  modelo?: string;
  /** Nivel de razonamiento, para los proveedores que lo aceptan. */
  esfuerzo?: string;
  sistema: string;
  prompt: string;
  /** Nombre de la herramienta que el modelo está obligado a invocar. */
  herramienta: string;
  descripcionHerramienta: string;
  /** JSON Schema del argumento de la herramienta. */
  esquemaEntrada: Record<string, unknown>;
  maxTokens?: number;
}

/** Lo que devuelve un proveedor antes de validar con Zod. */
export interface RespuestaHerramienta {
  argumentos: unknown;
  /** Contexto necesario para reintentar corrigiendo, propio de cada proveedor. */
  reintentar: (errorDeValidacion: string) => Promise<RespuestaHerramienta>;
}

export interface ClienteModelo {
  readonly proveedor: Proveedor;
  readonly disponible: boolean;
  /** Modelo que usará por defecto, para poder mostrarlo en la interfaz. */
  readonly modeloPorDefecto: string;
  invocarHerramienta(peticion: PeticionAgente): Promise<RespuestaHerramienta>;
  transmitirTexto(params: {
    sistema: string;
    prompt: string;
    maxTokens?: number;
    /** Modelo exacto; si falta, el proveedor usa su predeterminado. */
    modelo?: string;
    /** Nivel de razonamiento, para los proveedores que lo aceptan. */
    esfuerzo?: string;
    /** Habilita la búsqueda web del proveedor, si la ofrece. */
    web?: boolean;
  }): AsyncGenerator<string>;
}

export interface OpcionesAgente<T> extends PeticionAgente {
  /** Validador Zod aplicado al argumento devuelto por el modelo. */
  validador: z.ZodType<T>;
}

/**
 * Error que indica que la cuenta no puede llamar al modelo por cuota, límite de
 * gasto o saturación —no por un fallo del código—. Se distingue del resto para
 * que la aplicación pueda cambiar de proveedor o degradar a modo demostración
 * en lugar de romperse.
 */
export class ErrorDeCuota extends Error {
  // Se declara aparte en lugar de como parámetro del constructor: las
  // "parameter properties" de TypeScript no sobreviven al modo strip-only con
  // el que Node ejecuta las pruebas.
  readonly proveedor: Proveedor;

  constructor(mensaje: string, proveedor: Proveedor) {
    super(mensaje);
    this.name = "ErrorDeCuota";
    this.proveedor = proveedor;
  }
}

const SENALES_DE_CUOTA = [
  "usage limits",
  "credit balance",
  "quota",
  "rate_limit",
  "rate limit",
  "overloaded",
  "insufficient",
  "billing",
  "resource_exhausted",
  "resource has been exhausted",
];

export function esErrorDeCuota(error: unknown): boolean {
  if (error instanceof ErrorDeCuota) return true;
  const texto = (
    error instanceof Error ? error.message : String(error ?? "")
  ).toLowerCase();
  const codigo = (error as { status?: number })?.status;
  if (codigo === 429 || codigo === 529 || codigo === 402) return true;
  return SENALES_DE_CUOTA.some((senal) => texto.includes(senal));
}
