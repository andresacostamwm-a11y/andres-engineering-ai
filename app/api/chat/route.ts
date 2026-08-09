import { NextResponse } from "next/server";
import {
  conMotor,
  esErrorDeCuota,
  hayApiKey,
  preferenciaDeCookie,
  transmitirTexto,
} from "@/lib/modelo";
import { depuradorDeAndamiaje } from "@/lib/modelo/depurar";
import { fragmentar, recuperar } from "@/lib/rag";
import { FICHA_APP } from "@/lib/ficha-app";
import { ipDe, verificarLimite } from "@/lib/limite";

export const runtime = "nodejs";
export const maxDuration = 60;

const SISTEMA = `Eres el asistente de ANDRES Engineering AI. Respondes dos cosas, y solo dos:
la herramienta en sí, y el proyecto que se está revisando en ella.

Tienes dos fuentes y no se mezclan:
- La FICHA DE LA APLICACIÓN describe qué hace la herramienta, cómo se organiza y qué
  entrega. Es tu fuente para cualquier pregunta sobre la aplicación.
- El PROYECTO EN REVISIÓN es el documento del usuario. Es tu fuente para cualquier
  pregunta sobre ese proyecto concreto: partidas, supuestos, hallazgos, plazos, planos.

Reglas:
- Si la pregunta es sobre el proyecto y su estado es «sin_cargar», dilo con amabilidad
  y en una o dos frases: todavía no hay proyecto que consultar, y se carga subiendo
  documentos o generándolo desde cero en «Crear proyecto». No respondas con la ficha
  de la aplicación como si fuera el proyecto, y no inventes cifras.
- Si la pregunta es sobre el proyecto y sí hay fragmentos, respóndela con ellos y cita
  entre comillas la parte en la que te apoyas.
- Si la pregunta necesita información externa —normas vigentes, precios de mercado,
  proveedores, clima del sitio, criterios técnicos que ninguna de tus dos fuentes
  trae—, búscala en internet y di de dónde salió el dato.
- Distingue siempre qué viene del proyecto, qué de la ficha y qué de internet.
- No inventes números, normas ni cantidades: o están en una de tus fuentes, o están en
  una fuente que nombras, o declaras que no lo sabes.
- Si te preguntan algo sin relación con esta herramienta ni con este proyecto, redirige
  con amabilidad en una línea.
- Si te saludan o escriben algo suelto o mal tecleado, saluda de vuelta en una línea y
  ofrece en qué puedes ayudar. Nunca expliques la etimología de la palabra ni corrijas
  cómo se escribe: eso no es lo que te están pidiendo.
- Trato cordial y profesional, de ingeniero a ingeniero. Ni seco ni efusivo.
- Responde SIEMPRE en español, aunque la pregunta llegue en otro idioma.
- Escribe en texto plano. No uses Markdown (nada de **negritas**, listas con guiones
  ni encabezados): la interfaz muestra el texto tal cual.
- Entrega la respuesta directamente. No narres tu proceso, no anuncies búsquedas ni
  escribas rótulos como «thought» o «tool_code», y no digas «el fragmento 1 menciona»:
  cita el contenido entre comillas y sigue.
- Sé BREVE. Tres o cuatro frases como máximo, y una sola si la pregunta se
  contesta con una. Nada de enumerar los diez agentes uno por uno si preguntan
  cómo se organizan: se responde la estructura en dos frases y se ofrece
  detallar el que interese.
- No cierres con ofertas de ayuda ni con «si deseas ver…»: termina cuando
  termina la respuesta.`;

export async function POST(request: Request) {
  if (!hayApiKey()) {
    return NextResponse.json(
      {
        error:
          "El chat requiere al menos un proveedor de IA configurado (Claude, Gemini o GPT). En modo demostración solo está disponible el análisis con datos de ejemplo.",
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
  let modoWeb: boolean;
  try {
    const cuerpo = (await request.json()) as {
      pregunta?: unknown;
      documento?: unknown;
      modo?: unknown;
    };
    if (typeof cuerpo.pregunta !== "string" || !cuerpo.pregunta.trim()) {
      return NextResponse.json({ error: "Falta la pregunta." }, { status: 400 });
    }
    modoWeb = cuerpo.modo === "web";
    pregunta = cuerpo.pregunta.slice(0, 1000);
    documento = typeof cuerpo.documento === "string" ? cuerpo.documento : "";
  } catch {
    return NextResponse.json({ error: "Petición malformada." }, { status: 400 });
  }

  const hayProyecto = documento.trim().length > 0;

  // Si el documento no tiene fragmentos relevantes —o la consulta es en modo
  // web puro—, la pregunta se responde con la ficha o con la búsqueda web.
  const fragmentos = modoWeb || !hayProyecto
    ? []
    : recuperar(fragmentar(documento), pregunta, 5);

  const contexto = fragmentos
    .map(
      (f, i) =>
        `<fragmento numero="${i + 1}"${f.pagina ? ` pagina="${f.pagina}"` : ""}>\n${f.texto}\n</fragmento>`,
    )
    .join("\n\n");

  // La ficha de la aplicación viaja siempre: el asistente responde de la
  // herramienta aunque todavía no haya proyecto que revisar.
  const bloqueFicha = `<ficha_de_la_aplicacion>\n${FICHA_APP}\n</ficha_de_la_aplicacion>`;
  const bloqueProyecto = hayProyecto
    ? `<proyecto_en_revision estado="cargado">\n${
        fragmentos.length > 0
          ? contexto
          : "Hay un proyecto cargado, pero ningún fragmento suyo responde a esta pregunta."
      }\n</proyecto_en_revision>`
    : `<proyecto_en_revision estado="sin_cargar" />`;

  const codificador = new TextEncoder();
  const flujo = new ReadableStream({
    async start(controlador) {
      const enviar = (dato: unknown) =>
        controlador.enqueue(
          codificador.encode(`data: ${JSON.stringify(dato)}\n\n`),
        );

      if (fragmentos.length > 0) {
        enviar({
          tipo: "fuentes",
          fuentes: fragmentos.map((f) => ({
            fragmento: f.texto.slice(0, 240),
            pagina: f.pagina,
          })),
        });
      }

      const preferencia = await preferenciaDeCookie(request);
      // Filtra el andamiaje que algunos modelos emiten como texto plano.
      const depurador = depuradorDeAndamiaje();
      try {
        await conMotor(preferencia, async () => {
          for await (const trozo of transmitirTexto({
            sistema: SISTEMA,
            web: true,
            maxTokens: 900,
            prompt: modoWeb
              ? `Consulta directa a internet, sin documento adjunto; respóndela con la búsqueda web declarando la fuente.\n\nPregunta: ${pregunta}`
              : `${bloqueFicha}\n\n${bloqueProyecto}\n\nPregunta: ${pregunta}`,
          })) {
            const limpio = depurador.procesar(trozo);
            if (limpio) enviar({ tipo: "texto", texto: limpio });
          }
          const cola = depurador.cerrar();
          if (cola) enviar({ tipo: "texto", texto: cola });
        });
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
