/**
 * Consultas del visitante que aún no ha entrado.
 *
 * `/api/chat` exige sesión a propósito: acepta el documento que le manden y
 * consume cuota de IA, así que abrirlo dejaría el crédito de la cuenta a merced
 * de cualquiera. Esta ruta es su equivalente acotado para la portada:
 *
 *  · El contexto NO viene del cliente. Se usa siempre la ficha de la aplicación
 *    del servidor, así que nadie puede colar un documento propio ni usar esto
 *    como un chat de propósito general gratuito.
 *  · Límite por IP más estrecho que el del chat autenticado.
 *  · Sin salida a internet: responde sobre la herramienta, no sobre el mundo.
 */
import { NextResponse } from "next/server";
import { transmitirTexto, esErrorDeCuota, hayApiKey } from "@/lib/modelo";
import { fragmentar, recuperar } from "@/lib/rag";
import { FICHA_APP } from "@/lib/ficha-app";
import { ipDe, verificarLimite } from "@/lib/limite";

export const runtime = "nodejs";

const SISTEMA = `Eres el asistente de ANDRES Engineering AI y respondes a quien
todavía no ha entrado en la aplicación: explicas qué hace la herramienta, cómo
funciona por dentro, cómo se organiza y qué se puede descargar.

Reglas:
- Respondes SOLO con la ficha que se te entrega. Si algo no está en ella, dilo
  con naturalidad y sugiere entrar con el acceso de prueba para verlo.
- No inventas cifras, plazos, precios ni funciones que la ficha no mencione.
- Tono profesional y directo, en español, sin marketing hueco. Frases cortas.
- Si preguntan algo ajeno a la aplicación, redirige con amabilidad: aquí solo
  hablas de esta herramienta.`;

export async function POST(request: Request) {
  // Más estrecho que el chat autenticado: esta puerta está abierta a cualquiera.
  const limite = verificarLimite(`publica:${ipDe(request)}`, 12, 15 * 60 * 1000);
  if (!limite.permitido) {
    return NextResponse.json(
      { error: `Has alcanzado el límite de consultas. Reintenta en ${limite.reintentarEn} s.` },
      { status: 429 },
    );
  }

  if (!hayApiKey()) {
    return NextResponse.json(
      { error: "El asistente no está disponible ahora mismo." },
      { status: 503 },
    );
  }

  let pregunta: string;
  try {
    const cuerpo = (await request.json()) as { pregunta?: unknown };
    if (typeof cuerpo.pregunta !== "string" || !cuerpo.pregunta.trim()) {
      return NextResponse.json({ error: "Falta la pregunta." }, { status: 400 });
    }
    pregunta = cuerpo.pregunta.slice(0, 500);
  } catch {
    return NextResponse.json({ error: "Petición malformada." }, { status: 400 });
  }

  const fragmentos = recuperar(fragmentar(FICHA_APP), pregunta, 6);
  const contexto = fragmentos.length
    ? fragmentos.map((f, i) => `<fragmento numero="${i + 1}">\n${f.texto}\n</fragmento>`).join("\n\n")
    : FICHA_APP;

  const codificador = new TextEncoder();
  const flujo = new ReadableStream({
    async start(controlador) {
      try {
        for await (const trozo of transmitirTexto({
          sistema: SISTEMA,
          prompt: `<ficha_de_la_aplicacion>\n${contexto}\n</ficha_de_la_aplicacion>\n\nPregunta del visitante: ${pregunta}`,
          maxTokens: 700,
        })) {
          controlador.enqueue(codificador.encode(trozo));
        }
      } catch (error) {
        controlador.enqueue(
          codificador.encode(
            esErrorDeCuota(error)
              ? "\n\nEl asistente se ha quedado sin cuota por ahora. Entra con el acceso de prueba para ver la aplicación en marcha."
              : "\n\nSe interrumpió la respuesta.",
          ),
        );
      } finally {
        controlador.close();
      }
    },
  });

  return new Response(flujo, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
