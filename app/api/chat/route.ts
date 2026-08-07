import { NextResponse } from "next/server";
import { esErrorDeCuota, hayApiKey, transmitirTexto } from "@/lib/modelo";
import { fragmentar, recuperar } from "@/lib/rag";
import { ipDe, verificarLimite } from "@/lib/limite";

export const runtime = "nodejs";
export const maxDuration = 60;

const SISTEMA = `Eres un ingeniero de proyectos que responde preguntas sobre un documento
técnico concreto. Respondes en español, de forma directa y breve.

Reglas:
- Responde ÚNICAMENTE con lo que aparece en los fragmentos proporcionados.
- Si los fragmentos no contienen la respuesta, dilo con claridad: "El documento no
  especifica esto". No completes con conocimiento general ni con suposiciones.
- Cita entre comillas la parte del fragmento en la que te apoyas.
- No inventes números, normas ni cantidades.
- Escribe en texto plano. No uses Markdown (nada de **negritas**, listas con guiones
  ni encabezados): la interfaz muestra el texto tal cual.`;

export async function POST(request: Request) {
  if (!hayApiKey()) {
    return NextResponse.json(
      {
        error:
          "El chat sobre el documento requiere una API key de Anthropic configurada. En modo demostración solo está disponible el análisis con datos de ejemplo.",
      },
      { status: 503 },
    );
  }

  const limite = verificarLimite(`chat:${ipDe(request)}`, 30, 15 * 60 * 1000);
  if (!limite.permitido) {
    return NextResponse.json(
      { error: `Límite de preguntas alcanzado. Reintenta en ${limite.reintentarEn} s.` },
      { status: 429 },
    );
  }

  let pregunta: string;
  let documento: string;
  try {
    const cuerpo = (await request.json()) as {
      pregunta?: unknown;
      documento?: unknown;
    };
    if (typeof cuerpo.pregunta !== "string" || !cuerpo.pregunta.trim()) {
      return NextResponse.json({ error: "Falta la pregunta." }, { status: 400 });
    }
    if (typeof cuerpo.documento !== "string" || !cuerpo.documento.trim()) {
      return NextResponse.json({ error: "Falta el documento." }, { status: 400 });
    }
    pregunta = cuerpo.pregunta.slice(0, 1000);
    documento = cuerpo.documento;
  } catch {
    return NextResponse.json({ error: "Petición malformada." }, { status: 400 });
  }

  const fragmentos = recuperar(fragmentar(documento), pregunta, 5);
  if (fragmentos.length === 0) {
    return NextResponse.json({
      respuesta:
        "No encontré ninguna parte del documento relacionada con esa pregunta.",
      fuentes: [],
    });
  }

  const contexto = fragmentos
    .map(
      (f, i) =>
        `<fragmento numero="${i + 1}"${f.pagina ? ` pagina="${f.pagina}"` : ""}>\n${f.texto}\n</fragmento>`,
    )
    .join("\n\n");

  const codificador = new TextEncoder();
  const flujo = new ReadableStream({
    async start(controlador) {
      const enviar = (dato: unknown) =>
        controlador.enqueue(
          codificador.encode(`data: ${JSON.stringify(dato)}\n\n`),
        );

      enviar({
        tipo: "fuentes",
        fuentes: fragmentos.map((f) => ({
          fragmento: f.texto.slice(0, 240),
          pagina: f.pagina,
        })),
      });

      try {
        for await (const trozo of transmitirTexto({
          sistema: SISTEMA,
          prompt: `<fragmentos_del_documento>\n${contexto}\n</fragmentos_del_documento>\n\nPregunta: ${pregunta}`,
        })) {
          enviar({ tipo: "texto", texto: trozo });
        }
      } catch (error) {
        enviar({
          tipo: "error",
          mensaje: esErrorDeCuota(error)
            ? "La cuota de la API de Anthropic está agotada, así que el chat no está disponible. El análisis y los proyectos siguen funcionando en modo demostración."
            : error instanceof Error
              ? error.message
              : "Error al consultar el modelo.",
        });
      } finally {
        enviar({ tipo: "fin" });
        controlador.close();
      }
    },
  });

  return new Response(flujo, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
