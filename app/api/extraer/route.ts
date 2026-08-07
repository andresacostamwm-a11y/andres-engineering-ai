import { NextResponse } from "next/server";
import {
  MAX_ARCHIVOS,
  extraerArchivo,
  unirDocumentos,
  type ArchivoExtraido,
} from "@/lib/extractores";
import { ipDe, verificarLimite } from "@/lib/limite";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Extrae el texto de uno o varios archivos de cualquier formato soportado.
 * Nada se almacena: el contenido se devuelve al navegador y el servidor lo
 * olvida en cuanto termina la petición.
 */
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

  const entradas = formulario.getAll("archivos").filter((v): v is File => v instanceof File);
  // Compatibilidad con el campo antiguo de un solo archivo.
  const unico = formulario.get("archivo");
  if (entradas.length === 0 && unico instanceof File) entradas.push(unico);

  if (entradas.length === 0) {
    return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  }
  if (entradas.length > MAX_ARCHIVOS) {
    return NextResponse.json(
      { error: `Máximo ${MAX_ARCHIVOS} archivos por análisis.` },
      { status: 413 },
    );
  }

  const extraidos: ArchivoExtraido[] = [];
  const fallidos: { nombre: string; motivo: string }[] = [];

  const resultados = await Promise.allSettled(entradas.map((a) => extraerArchivo(a)));
  resultados.forEach((resultado, i) => {
    if (resultado.status === "fulfilled") {
      extraidos.push(resultado.value);
    } else {
      fallidos.push({
        nombre: entradas[i].name,
        motivo:
          resultado.reason instanceof Error
            ? resultado.reason.message
            : "No se pudo leer el archivo.",
      });
    }
  });

  if (extraidos.length === 0) {
    return NextResponse.json(
      {
        error:
          fallidos[0]?.motivo ?? "No se pudo leer ninguno de los archivos enviados.",
        fallidos,
      },
      { status: 422 },
    );
  }

  const texto = unirDocumentos(extraidos);

  return NextResponse.json({
    texto,
    caracteres: texto.length,
    paginas: extraidos.reduce((s, a) => s + (a.paginas ?? 0), 0) || null,
    nombreArchivo:
      extraidos.length === 1
        ? extraidos[0].nombre
        : `${extraidos.length} documentos`,
    archivos: extraidos.map((a) => ({
      nombre: a.nombre,
      formato: a.formato,
      caracteres: a.caracteres,
      paginas: a.paginas,
      aviso: a.aviso,
    })),
    fallidos,
  });
}
