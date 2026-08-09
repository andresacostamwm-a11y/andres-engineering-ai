import { NextResponse } from "next/server";
import { proyectar, type EncargoProyecto } from "@/lib/agentes/orquestador-proyecto";
import { conMotor, hayApiKey, preferenciaDeCookie } from "@/lib/modelo";
import { definicionProyectoSchema } from "@/lib/schemas";
import { DISCIPLINAS, TODOS_LOS_DIAGRAMAS } from "@/lib/disciplinas";
import type { DisciplinaProyecto, TipoDiagrama } from "@/lib/disciplinas";

const IDS_DIAGRAMA = new Set<TipoDiagrama>(TODOS_LOS_DIAGRAMAS);
import { ipDe, verificarLimite } from "@/lib/limite";

export const runtime = "nodejs";
export const maxDuration = 600;

const IDS_DISCIPLINA = new Set(DISCIPLINAS.map((d) => d.id));

export async function POST(request: Request) {
  if (hayApiKey()) {
    const limite = verificarLimite(`proyecto:${ipDe(request)}`, 5, 30 * 60 * 1000);
    if (!limite.permitido) {
      return NextResponse.json(
        {
          error: `Has alcanzado el límite de proyectos. Reintenta en ${Math.ceil(
            limite.reintentarEn / 60,
          )} minutos.`,
        },
        { status: 429 },
      );
    }
  }

  let encargo: EncargoProyecto;
  try {
    const cuerpo = await request.json();
    const validacion = definicionProyectoSchema.safeParse(cuerpo);
    if (!validacion.success) {
      return NextResponse.json(
        { error: validacion.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 400 },
      );
    }
    const idsPedidos = validacion.data.disciplinas ?? [validacion.data.disciplina];
    if (idsPedidos.some((d) => !IDS_DISCIPLINA.has(d as DisciplinaProyecto))) {
      return NextResponse.json({ error: "Disciplina desconocida." }, { status: 400 });
    }

    encargo = {
      nombre: validacion.data.nombre.slice(0, 160),
      descripcion: validacion.data.descripcion.slice(0, 8000),
      disciplina: validacion.data.disciplina as DisciplinaProyecto,
      disciplinas: idsPedidos as DisciplinaProyecto[],
      diagramas: validacion.data.diagramas?.filter((d) =>
        IDS_DIAGRAMA.has(d as TipoDiagrama),
      ) as TipoDiagrama[] | undefined,
      envergadura: validacion.data.envergadura,
      ubicacion: validacion.data.ubicacion?.slice(0, 200),
      documentosAdjuntos:
        typeof (cuerpo as { documentosAdjuntos?: unknown }).documentosAdjuntos === "string"
          ? ((cuerpo as { documentosAdjuntos: string }).documentosAdjuntos).slice(0, 200_000)
          : undefined,
    };
  } catch {
    return NextResponse.json({ error: "Petición malformada." }, { status: 400 });
  }

  const codificador = new TextEncoder();
  const flujo = new ReadableStream({
    async start(controlador) {
      const enviar = (dato: unknown) =>
        controlador.enqueue(codificador.encode(`data: ${JSON.stringify(dato)}\n\n`));

      const preferencia = await preferenciaDeCookie(request);
      try {
        await conMotor(preferencia, async () => {
          for await (const evento of proyectar(encargo)) enviar(evento);
        });
      } catch (error) {
        enviar({
          tipo: "error",
          agente: "programa",
          mensaje:
            error instanceof Error ? error.message : "El proyecto falló de forma inesperada.",
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
