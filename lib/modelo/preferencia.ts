/**
 * Preferencia de motor elegida por el usuario.
 *
 * Cambiar de motor cuesta dinero, así que la elección está protegida: el
 * selector pide una contraseña, el servidor la verifica y emite una cookie
 * httpOnly FIRMADA (JWT). Las rutas solo aceptan preferencias con firma
 * válida — una cookie fabricada a mano se ignora y la aplicación sigue en el
 * motor por defecto (Gemini 2.5 Flash). La propagación por petición se hace
 * con AsyncLocalStorage para no enhebrar un parámetro más por cada agente.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { SignJWT, jwtVerify } from "jose";
import type { Proveedor } from "./tipos.ts";
import { esCombinacionValida, type Esfuerzo } from "./catalogo.ts";

export const COOKIE_MOTOR = "motor-ia";

export interface PreferenciaMotor {
  proveedor: Proveedor;
  /** Identificador exacto del modelo dentro del proveedor, si se eligió uno. */
  modelo?: string;
  /** Nivel de razonamiento, para los modelos que lo aceptan. */
  esfuerzo?: Esfuerzo;
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

function claveSecreta(): Uint8Array {
  const secreto =
    process.env.AUTH_SECRET ??
    "aec-copilot-secreto-de-desarrollo-cambiar-en-produccion";
  return new TextEncoder().encode(secreto);
}

/** La contraseña que autoriza cambiar de motor coincide con CLAVE_MOTOR. */
export function claveMotorValida(clave: string): boolean {
  const esperada = process.env.CLAVE_MOTOR;
  return Boolean(esperada) && clave === esperada;
}

/** Firma la preferencia como JWT para guardarla en la cookie httpOnly. */
export async function firmarPreferencia(
  preferencia: PreferenciaMotor,
): Promise<string> {
  return new SignJWT({
    proveedor: preferencia.proveedor,
    modelo: preferencia.modelo,
    esfuerzo: preferencia.esfuerzo,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("180d")
    .sign(claveSecreta());
}

/** Lee y VERIFICA la cookie `motor-ia`; sin firma válida no hay preferencia. */
export async function preferenciaDeCookie(
  request: Request,
): Promise<PreferenciaMotor | null> {
  const galletas = request.headers.get("cookie") ?? "";
  const token = galletas
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_MOTOR}=`))
    ?.slice(COOKIE_MOTOR.length + 1);
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(decodeURIComponent(token), claveSecreta());
    const proveedor = payload.proveedor as Proveedor;
    if (!PROVEEDORES.includes(proveedor)) return null;

    const modelo = typeof payload.modelo === "string" ? payload.modelo.trim() : "";
    // El identificador viene de fuera: se acota a caracteres de nombre de
    // modelo antes de usarlo en una llamada a la API.
    if (modelo && !/^[a-zA-Z0-9._:/-]{1,80}$/.test(modelo)) return null;

    const esfuerzo = typeof payload.esfuerzo === "string" ? payload.esfuerzo : undefined;

    // La firma podía emitirse cuando el catálogo era otro: una preferencia que
    // ya no está en la lista se descarta en lugar de invocarse a ciegas.
    if (modelo && !esCombinacionValida(proveedor, modelo, esfuerzo)) return null;

    return {
      proveedor,
      modelo: modelo || undefined,
      esfuerzo: esfuerzo as Esfuerzo | undefined,
    };
  } catch {
    return null;
  }
}
