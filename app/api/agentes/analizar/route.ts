import { NextResponse } from "next/server";
import { analizar } from "@/lib/agentes/orquestador";
import { conMotor, hayApiKey, preferenciaDeCookie } from "@/lib/modelo";
import { ipDe, verificarLimite } from "@/lib/limite";
import { MAX_CARACTERES } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Ejecuta el pipeline de agentes y transmite el progreso por Server-Sent Events.
 * Se eligió SSE sobre WebSocket porque el flujo es unidireccional servidor→cliente
 * y funciona sin infraestructura adicional en el runtime de Vercel.
 */
export async function POST(request: Request) {
  // El límite solo aplica cuando hay API key: el modo demo no consume cuota.
  if (hayApiKey()) {
    const limite = verificarLimite(
      `analizar:${ipDe(request)}`,
      8,
      30 * 60 * 1000,
    );
    if (!limite.permitido) {
      return NextResponse.json(
        {
          error: `Has alcanzado el límite de análisis. Reintenta en ${Math.ceil(
            limite.reintentarEn / 60,
          )} minutos.`,
        },
        { status: 429 },
      );
    }
  }

  let texto: string;
  try {
    const cuerpo = (await request.json()) as { texto?: unknown };
    if (typeof cuerpo.texto !== "string" || cuerpo.texto.trim().length < 100) {
      return NextResponse.json(
        { error: "El documento es demasiado corto para analizarse." },
        { status: 400 },
      );
    }
    texto = cuerpo.texto.slice(0, MAX_CARACTERES);
  } catch {
    return NextResponse.json({ error: "Petición malformada." }, { status: 400 });
  }

  const codificador = new TextEncoder();
  const flujo = new ReadableStream({
    async start(controlador) {
      const enviar = (dato: unknown) =>
        controlador.enqueue(
          codificador.encode(`data: ${JSON.stringify(dato)}\n\n`),
        );

      const preferencia = await preferenciaDeCookie(request);
      try {
        await conMotor(preferencia, async () => {
          for await (const evento of analizar(texto)) enviar(evento);
        });
      } catch (error) {
        enviar({
          tipo: "error",
          agente: "extractor",
          mensaje:
            error instanceof Error
              ? error.message
              : "El análisis falló de forma inesperada.",
        });
        enviar({ tipo: "fin", modoDemo: false });
      } finally {
        controlador.close();
      }
    },
  });

  return new Response(flujo, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
