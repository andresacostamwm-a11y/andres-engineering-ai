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
 *  · Con salida a internet, pero con la ficha como fuente primaria: si la
 *    pregunta es sobre la herramienta manda la ficha, y solo se sale a buscar
 *    cuando hace falta contexto externo, declarando siempre la fuente.
 */
import { NextResponse } from "next/server";
import { transmitirTexto, esErrorDeCuota, hayApiKey } from "@/lib/modelo";
import { depuradorDeAndamiaje } from "@/lib/modelo/depurar";
import { fragmentar, recuperar } from "@/lib/rag";
import { FICHA_APP } from "@/lib/ficha-app";
import { ipDe, verificarLimite } from "@/lib/limite";

export const runtime = "nodejs";

const SISTEMA = `Eres el asistente de ANDRES Engineering AI y respondes a quien
todavía no ha entrado en la aplicación: explicas qué hace la herramienta, cómo
funciona por dentro, cómo se organiza y qué se puede descargar.

Reglas:
- La ficha es tu fuente PRIMARIA. Si contiene la respuesta, respondes con ella.
- No inventas cifras, plazos, precios ni funciones que la ficha no mencione. Si
  algo de la aplicación no está en la ficha, lo dices y sugieres entrar con el
  acceso de prueba para verlo.
- Si la pregunta necesita contexto externo —una norma, una tecnología, un término
  del sector—, puedes buscarlo en internet y declaras de dónde salió el dato.
  Distingue siempre qué viene de la ficha y qué viene de internet.
- Tono profesional y directo, en español, sin marketing hueco. Frases cortas.
- Escribe en texto plano, sin Markdown.
- Entrega la respuesta directamente. No narres tu proceso, no anuncies búsquedas
  ni escribas rótulos como «thought» o «tool_code».
- Si preguntan algo sin relación alguna con esta herramienta ni con la ingeniería,
  redirige con amabilidad.
- Si te saludan o escriben algo suelto o mal tecleado, saluda de vuelta en una
  línea y ofrece en qué puedes ayudar. Nunca expliques la etimología de la
  palabra ni corrijas cómo se escribe: eso no es lo que te están pidiendo.
- Trato cordial y profesional, de ingeniero a ingeniero. Ni seco ni efusivo.
- Sé BREVE. Tres o cuatro frases como máximo, y una sola si la pregunta se
  contesta con una. Nada de enumerar los diez agentes uno por uno si preguntan
  cómo se organizan: se responde la estructura en dos frases y se ofrece
  detallar el que interese.
- No cierres con ofertas de ayuda ni con «si deseas ver…»: termina cuando
  termina la respuesta.`;

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
      const depurador = depuradorDeAndamiaje();
      try {
        for await (const trozo of transmitirTexto({
          sistema: SISTEMA,
          web: true,
          prompt: `<ficha_de_la_aplicacion>\n${contexto}\n</ficha_de_la_aplicacion>\n\nPregunta del visitante: ${pregunta}`,
          maxTokens: 600,
        })) {
          const limpio = depurador.procesar(trozo);
          if (limpio) controlador.enqueue(codificador.encode(limpio));
        }
        const cola = depurador.cerrar();
        if (cola) controlador.enqueue(codificador.encode(cola));
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
