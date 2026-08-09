/**
 * Tipo de cambio vigente entre dos monedas.
 *
 * La consulta se hace en el servidor y no en el navegador por dos razones: las
 * fuentes no publican cabeceras CORS fiables, y así la caché se comparte entre
 * todas las sesiones en lugar de repetir la llamada por usuario.
 *
 * Esta ruta NUNCA toca el tipo de cambio histórico de un presupuesto ya emitido:
 * solo devuelve el de hoy para poder mostrar el equivalente actualizado al lado.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { obtenerTipoCambio, ErrorTipoCambio } from "@/lib/moneda/tipoCambio";
import { monedaSchema } from "@/lib/schemas";
import { ipDe, verificarLimite } from "@/lib/limite";

export const runtime = "nodejs";

const peticionSchema = z.object({
  origen: monedaSchema,
  destino: monedaSchema,
  /** true cuando el usuario pulsa «Actualizar tipo de cambio»: salta la caché. */
  forzar: z.boolean().optional(),
});

export async function POST(request: Request) {
  // Cada consulta forzada sale a una API externa: se limita para no abusar de ella.
  const limite = verificarLimite(`tipo-cambio:${ipDe(request)}`, 30, 15 * 60 * 1000);
  if (!limite.permitido) {
    return NextResponse.json(
      { error: `Demasiadas consultas. Reintenta en ${limite.reintentarEn} s.` },
      { status: 429 },
    );
  }

  let datos: z.infer<typeof peticionSchema>;
  try {
    datos = peticionSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  try {
    const tipoCambio = await obtenerTipoCambio(
      datos.origen,
      datos.destino,
      datos.forzar ?? false,
    );
    return NextResponse.json({ tipoCambio });
  } catch (error) {
    // Se responde 503 y no 500: la aplicación está bien, la fuente externa no.
    const mensaje =
      error instanceof ErrorTipoCambio
        ? error.message
        : "No se pudo consultar el tipo de cambio.";
    return NextResponse.json({ error: mensaje }, { status: 503 });
  }
}
