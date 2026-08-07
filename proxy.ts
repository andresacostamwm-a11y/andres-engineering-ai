/**
 * Protege el área privada. Corre en el Edge Runtime antes de servir cualquier
 * ruta de /app o de las API de negocio: sin cookie de sesión válida no hay acceso.
 *
 * En Next.js 16 el antiguo `middleware.ts` se renombró a `proxy.ts`; la
 * funcionalidad es la misma.
 */
import { NextResponse, type NextRequest } from "next/server";
import { NOMBRE_COOKIE, leerToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sesion = await leerToken(request.cookies.get(NOMBRE_COOKIE)?.value);
  if (sesion) return NextResponse.next();

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const destino = new URL("/login", request.url);
  destino.searchParams.set("siguiente", pathname);
  return NextResponse.redirect(destino);
}

export const config = {
  matcher: [
    "/app/:path*",
    "/api/extraer",
    "/api/agentes/:path*",
    "/api/proyecto/:path*",
    "/api/chat",
  ],
};
