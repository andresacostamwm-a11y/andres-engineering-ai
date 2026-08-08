/**
 * Autoriza el acceso al historial completo.
 *
 * El historial vive en el navegador del usuario, pero verlo exige la
 * contraseña de historial (CLAVE_HISTORIAL) validada en servidor, para que la
 * clave no viaje en el bundle del cliente.
 */
import { NextResponse } from "next/server";
import { ipDe, verificarLimite } from "@/lib/limite";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limite = verificarLimite(`historial:${ipDe(request)}`, 10, 15 * 60 * 1000);
  if (!limite.permitido) {
    return NextResponse.json(
      { error: `Demasiados intentos. Reintenta en ${limite.reintentarEn} s.` },
      { status: 429 },
    );
  }

  let clave: string;
  try {
    const cuerpo = (await request.json()) as { clave?: unknown };
    if (typeof cuerpo.clave !== "string" || !cuerpo.clave.trim()) {
      return NextResponse.json({ error: "Escribe la contraseña." }, { status: 400 });
    }
    clave = cuerpo.clave;
  } catch {
    return NextResponse.json({ error: "Petición malformada." }, { status: 400 });
  }

  const esperada = process.env.CLAVE_HISTORIAL;
  if (!esperada) {
    return NextResponse.json(
      { error: "El historial protegido no está habilitado en este despliegue." },
      { status: 503 },
    );
  }
  if (clave !== esperada) {
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
