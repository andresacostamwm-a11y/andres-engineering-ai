/**
 * Genera UN plano bajo demanda sobre un proyecto ya creado.
 *
 * Permite pedir cualquier lámina del catálogo —aunque no forme parte del
 * paquete estándar de la disciplina— sin repetir todo el pipeline.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { generarDiagrama } from "@/lib/agentes/proyectista";
import { conMotor, hayApiKey, preferenciaDeCookie } from "@/lib/modelo";
import { DISCIPLINAS, ETIQUETA_DIAGRAMA } from "@/lib/disciplinas";
import type { DisciplinaProyecto, TipoDiagrama } from "@/lib/disciplinas";
import { DIAGRAMAS_DEMO } from "@/lib/demo-proyecto";
import { ipDe, verificarLimite } from "@/lib/limite";

export const runtime = "nodejs";
export const maxDuration = 300;

const peticionSchema = z.object({
  tipo: z.enum(Object.keys(ETIQUETA_DIAGRAMA) as [TipoDiagrama, ...TipoDiagrama[]]),
  disciplina: z.enum(DISCIPLINAS.map((d) => d.id) as [DisciplinaProyecto, ...DisciplinaProyecto[]]),
  envergadura: z.enum(["pequena", "mediana", "grande"]),
  nombre: z.string().min(3).max(160),
  descripcion: z.string().min(20).max(8000),
  contexto: z.string().max(20_000).optional(),
});

export async function POST(request: Request) {
  let peticion: z.infer<typeof peticionSchema>;
  try {
    const cuerpo = await request.json();
    const validacion = peticionSchema.safeParse(cuerpo);
    if (!validacion.success) {
      return NextResponse.json(
        { error: validacion.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 400 },
      );
    }
    peticion = validacion.data;
  } catch {
    return NextResponse.json({ error: "Petición malformada." }, { status: 400 });
  }

  if (!hayApiKey()) {
    // Sin API key se sirve la lámina de demostración más parecida al tipo pedido.
    const candidatos = DIAGRAMAS_DEMO[peticion.disciplina] ?? [];
    const diagrama =
      candidatos.find((d) => d.tipo === peticion.tipo) ?? candidatos[0] ?? null;
    if (!diagrama) {
      return NextResponse.json(
        { error: "No hay lámina de demostración para esta disciplina." },
        { status: 404 },
      );
    }
    return NextResponse.json({ diagrama, modoDemo: true });
  }

  const limite = verificarLimite(`diagrama:${ipDe(request)}`, 15, 30 * 60 * 1000);
  if (!limite.permitido) {
    return NextResponse.json(
      {
        error: `Has alcanzado el límite de planos. Reintenta en ${Math.ceil(
          limite.reintentarEn / 60,
        )} minutos.`,
      },
      { status: 429 },
    );
  }

  try {
    const preferencia = await preferenciaDeCookie(request);
    const diagrama = await conMotor(preferencia, () =>
      generarDiagrama({
        tipo: peticion.tipo,
        disciplina: peticion.disciplina,
        envergadura: peticion.envergadura,
        descripcionProyecto: `${peticion.nombre}. ${peticion.descripcion}`,
        contexto: peticion.contexto ?? "",
      }),
    );
    return NextResponse.json({ diagrama, modoDemo: false });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo generar el plano solicitado.",
      },
      { status: 502 },
    );
  }
}
