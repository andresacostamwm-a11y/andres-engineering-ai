/**
 * Extracción de texto de PDF.
 *
 * Se usa `unpdf`, una compilación de PDF.js sin dependencias de Node nativas,
 * porque el runtime serverless de Vercel no tiene sistema de archivos ni binarios
 * externos disponibles.
 */
import { extractText, getDocumentProxy } from "unpdf";

export const MAX_BYTES = 12 * 1024 * 1024; // 12 MB
export const MAX_CARACTERES = 400_000;

export interface DocumentoExtraido {
  texto: string;
  paginas: number;
  caracteres: number;
}

export async function extraerTextoDePdf(
  buffer: ArrayBuffer,
): Promise<DocumentoExtraido> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });

  // Se unen las páginas con salto de página (\f) para conservar la referencia
  // de página que después usa el recuperador de fragmentos.
  const paginas = Array.isArray(text) ? text : [text];
  const completo = paginas.join("\f").replace(/[ \t]+/g, " ").trim();

  if (!completo || completo.length < 40) {
    throw new Error(
      "El PDF no contiene texto seleccionable. Si es un plano escaneado, necesita pasar antes por OCR.",
    );
  }

  const texto =
    completo.length > MAX_CARACTERES ? completo.slice(0, MAX_CARACTERES) : completo;

  return { texto, paginas: totalPages, caracteres: completo.length };
}
