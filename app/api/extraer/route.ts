import { NextResponse } from "next/server";
import { MAX_BYTES, extraerTextoDePdf } from "@/lib/pdf";
import { ipDe, verificarLimite } from "@/lib/limite";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Extrae el texto de un PDF subido. No se almacena nada en servidor. */
export async function POST(request: Request) {
  const limite = verificarLimite(`extraer:${ipDe(request)}`, 20, 10 * 60 * 1000);
  if (!limite.permitido) {
    return NextResponse.json(
      { error: `Límite alcanzado. Reintenta en ${limite.reintentarEn} s.` },
      { status: 429 },
    );
  }

  let formulario: FormData;
  try {
    formulario = await request.formData();
  } catch {
    return NextResponse.json({ error: "Petición malformada." }, { status: 400 });
  }

  const archivo = formulario.get("archivo");
  if (!(archivo instanceof File)) {
    return NextResponse.json(
      { error: "No se recibió ningún archivo." },
      { status: 400 },
    );
  }

  if (archivo.type !== "application/pdf" && !archivo.name.endsWith(".pdf")) {
    return NextResponse.json(
      { error: "El archivo debe ser un PDF." },
      { status: 415 },
    );
  }

  if (archivo.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `El PDF supera el límite de ${MAX_BYTES / 1024 / 1024} MB.` },
      { status: 413 },
    );
  }

  try {
    const extraido = await extraerTextoDePdf(await archivo.arrayBuffer());
    return NextResponse.json({ ...extraido, nombreArchivo: archivo.name });
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "No se pudo leer el PDF.";
    return NextResponse.json({ error: mensaje }, { status: 422 });
  }
}
