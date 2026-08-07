import { NextResponse } from "next/server";
import { credencialesSchema } from "@/lib/schemas";
import { NOMBRE_COOKIE, crearToken, credencialesValidas } from "@/lib/auth";
import { ipDe, verificarLimite } from "@/lib/limite";

/** Intentos de acceso permitidos por IP en 5 minutos. */
const MAX_INTENTOS = 10;
const VENTANA_MS = 5 * 60 * 1000;

export async function POST(request: Request) {
  const limite = verificarLimite(`login:${ipDe(request)}`, MAX_INTENTOS, VENTANA_MS);
  if (!limite.permitido) {
    return NextResponse.json(
      {
        error: `Demasiados intentos. Vuelve a intentarlo en ${limite.reintentarEn} segundos.`,
      },
      { status: 429 },
    );
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición malformada." }, { status: 400 });
  }

  const validacion = credencialesSchema.safeParse(cuerpo);
  if (!validacion.success) {
    return NextResponse.json(
      { error: validacion.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  const { usuario, password } = validacion.data;
  if (!credencialesValidas(usuario, password)) {
    // Mensaje genérico a propósito: no se revela si el usuario existe.
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos." },
      { status: 401 },
    );
  }

  const token = await crearToken({ usuario, nombre: "Equipo DIEM" });
  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.set({
    name: NOMBRE_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return respuesta;
}
