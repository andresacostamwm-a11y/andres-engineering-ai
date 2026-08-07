/**
 * Autenticación propia basada en JWT firmado (HS256) y cookie httpOnly.
 *
 * No se usa un proveedor externo a propósito: el proyecto es *stateless* y no
 * almacena documentos ni usuarios en servidor. El único usuario es la cuenta de
 * demostración definida por variables de entorno, lo que permite evaluar la
 * aplicación desplegada sin registrar datos personales.
 */
import { SignJWT, jwtVerify } from "jose";

export const NOMBRE_COOKIE = "diem_sesion";
const DURACION_SESION = "8h";

/** Credenciales de la cuenta de demostración (sobreescribibles por entorno). */
export const USUARIO_DEMO = process.env.DEMO_USER ?? "demo@diem.mx";
export const PASSWORD_DEMO = process.env.DEMO_PASSWORD ?? "TFMdemo2026";

export interface Sesion {
  usuario: string;
  nombre: string;
}

function claveSecreta(): Uint8Array {
  const secreto =
    process.env.AUTH_SECRET ??
    "diem-copilot-secreto-de-desarrollo-cambiar-en-produccion";
  return new TextEncoder().encode(secreto);
}

/** Verifica un par usuario/contraseña contra la cuenta de demostración. */
export function credencialesValidas(usuario: string, password: string): boolean {
  return (
    usuario.trim().toLowerCase() === USUARIO_DEMO.toLowerCase() &&
    password === PASSWORD_DEMO
  );
}

/** Firma un token de sesión de 8 horas. */
export async function crearToken(sesion: Sesion): Promise<string> {
  return new SignJWT({ nombre: sesion.nombre })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sesion.usuario)
    .setIssuedAt()
    .setExpirationTime(DURACION_SESION)
    .sign(claveSecreta());
}

/** Devuelve la sesión si el token es válido, o null si no lo es. */
export async function leerToken(token: string | undefined): Promise<Sesion | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, claveSecreta());
    if (!payload.sub) return null;
    return {
      usuario: payload.sub,
      nombre: typeof payload.nombre === "string" ? payload.nombre : payload.sub,
    };
  } catch {
    return null;
  }
}
