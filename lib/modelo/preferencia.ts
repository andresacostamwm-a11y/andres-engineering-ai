/**
 * Preferencia de motor elegida por el usuario.
 *
 * El selector de la interfaz guarda la elección en una cookie y cada ruta la
 * propaga con AsyncLocalStorage, de modo que los agentes no reciben un
 * parámetro más: preguntan aquí qué motor prefiere quien pidió el trabajo.
 * Si el preferido se queda sin cuota, la capa de modelo sigue cayendo al
 * siguiente proveedor disponible como siempre.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import type { Proveedor } from "./tipos.ts";

export const COOKIE_MOTOR = "motor-ia";

export interface PreferenciaMotor {
  proveedor: Proveedor;
  /** Identificador exacto del modelo dentro del proveedor, si se eligió uno. */
  modelo?: string;
}

const almacen = new AsyncLocalStorage<PreferenciaMotor>();

export function conMotor<T>(
  preferencia: PreferenciaMotor | null,
  fn: () => T,
): T {
  return preferencia ? almacen.run(preferencia, fn) : fn();
}

export function motorPreferido(): PreferenciaMotor | null {
  return almacen.getStore() ?? null;
}

const PROVEEDORES: Proveedor[] = ["claude", "gemini", "openai"];

/** Lee la cookie `motor-ia` (formato `proveedor:modelo`) de una petición. */
export function preferenciaDeCookie(request: Request): PreferenciaMotor | null {
  const galletas = request.headers.get("cookie") ?? "";
  const cruda = galletas
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_MOTOR}=`))
    ?.slice(COOKIE_MOTOR.length + 1);
  if (!cruda) return null;

  const [proveedor, ...resto] = decodeURIComponent(cruda).split(":");
  if (!PROVEEDORES.includes(proveedor as Proveedor)) return null;

  const modelo = resto.join(":").trim();
  // El identificador viene del navegador: se acota a caracteres de nombre de
  // modelo antes de usarlo en una llamada a la API.
  if (modelo && !/^[a-zA-Z0-9._:/-]{1,80}$/.test(modelo)) return null;

  return { proveedor: proveedor as Proveedor, modelo: modelo || undefined };
}
