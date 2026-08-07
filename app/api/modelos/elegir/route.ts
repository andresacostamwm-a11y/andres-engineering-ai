/**
 * Autoriza un cambio de motor IA.
 *
 * El cambio de modelo cuesta dinero, así que exige la contraseña de motor
 * (CLAVE_MOTOR). Si es correcta, se emite la cookie httpOnly firmada que las
 * rutas de generación aceptan como preferencia; sin firma válida la aplicación
 * permanece en el motor por defecto.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  claveMotorValida,
  firmarPreferencia,
  COOKIE_MOTOR,
  type PreferenciaMotor,
} from "@/lib/modelo/preferencia";
import { ipDe, verificarLimite } from "@/lib/limite";

export const runtime = "nodejs";

const peticionSchema = z.object({
  clave: z.string().min(1, "Escribe la contraseña"),
  proveedor: z.enum(["claude", "gemini", "openai"]),
  modelo: z
    .string()
    .regex(/^[a-zA-Z0-9._:/-]{1,80}$/, "Modelo inválido")
    .optional(),
});

export async function POST(request: Request) {
  // Frena la fuerza bruta sobre la contraseña.
  const limite = verificarLimite(`motor:${ipDe(request)}`, 10, 15 * 60 * 1000);
  if (!limite.permitido) {
    return NextResponse.json(
      { error: `Demasiados intentos. Reintenta en ${limite.reintentarEn} s.` },
      { status: 429 },
    );
  }

  let datos: z.infer<typeof peticionSchema>;
  try {
    const validacion = peticionSchema.safeParse(await request.json());
    if (!validacion.success) {
      return NextResponse.json(
        { error: validacion.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 400 },
      );
    }
    datos = validacion.data;
  } catch {
    return NextResponse.json({ error: "Petición malformada." }, { status: 400 });
  }

  if (!process.env.CLAVE_MOTOR) {
    return NextResponse.json(
      { error: "El cambio de motor no está habilitado en este despliegue." },
      { status: 503 },
    );
  }

  if (!claveMotorValida(datos.clave)) {
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
  }

  const preferencia: PreferenciaMotor = {
    proveedor: datos.proveedor,
    modelo: datos.modelo,
  };
  const token = await firmarPreferencia(preferencia);

  const respuesta = NextResponse.json({ ok: true, ...preferencia });
  respuesta.cookies.set(COOKIE_MOTOR, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return respuesta;
}
