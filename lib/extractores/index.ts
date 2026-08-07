/**
 * Ingesta multiformato.
 *
 * Cada formato tiene su extractor y todos devuelven texto plano con la misma
 * forma, de modo que el pipeline de agentes no sabe —ni necesita saber— de qué
 * tipo de archivo vino el contenido. Los formatos técnicos (DXF, IFC) no se
 * convierten a prosa: se resumen en su estructura, que es lo que un proyectista
 * miraría primero.
 */
import { extractText, getDocumentProxy } from "unpdf";

export const MAX_BYTES_ARCHIVO = 15 * 1024 * 1024;
export const MAX_ARCHIVOS = 10;
export const MAX_CARACTERES_TOTAL = 500_000;

export type FormatoSoportado =
  | "pdf"
  | "word"
  | "excel"
  | "csv"
  | "html"
  | "texto"
  | "dxf"
  | "ifc"
  | "json";

export interface ArchivoExtraido {
  nombre: string;
  formato: FormatoSoportado;
  texto: string;
  caracteres: number;
  paginas: number | null;
  aviso: string | null;
}

const EXTENSIONES: Record<string, FormatoSoportado> = {
  pdf: "pdf",
  docx: "word",
  doc: "word",
  xlsx: "excel",
  xlsm: "excel",
  xls: "excel",
  csv: "csv",
  tsv: "csv",
  html: "html",
  htm: "html",
  txt: "texto",
  md: "texto",
  dxf: "dxf",
  ifc: "ifc",
  json: "json",
};

export const EXTENSIONES_ACEPTADAS = Object.keys(EXTENSIONES)
  .map((e) => `.${e}`)
  .join(",");

export function formatoDe(nombre: string): FormatoSoportado | null {
  const extension = nombre.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSIONES[extension] ?? null;
}

export async function extraerArchivo(archivo: File): Promise<ArchivoExtraido> {
  const formato = formatoDe(archivo.name);
  if (!formato) {
    throw new Error(
      `Formato no soportado: ${archivo.name}. Admite PDF, Word, Excel, CSV, HTML, texto, DXF, IFC y JSON.`,
    );
  }
  if (archivo.size > MAX_BYTES_ARCHIVO) {
    throw new Error(
      `${archivo.name} supera el límite de ${MAX_BYTES_ARCHIVO / 1024 / 1024} MB.`,
    );
  }

  const buffer = await archivo.arrayBuffer();

  switch (formato) {
    case "pdf":
      return desdePdf(archivo.name, buffer);
    case "word":
      return desdeWord(archivo.name, buffer);
    case "excel":
      return desdeExcel(archivo.name, buffer);
    case "csv":
      return desdeCsv(archivo.name, buffer);
    case "html":
      return desdeHtml(archivo.name, buffer);
    case "dxf":
      return desdeDxf(archivo.name, buffer);
    case "ifc":
      return desdeIfc(archivo.name, buffer);
    case "json":
      return desdeJson(archivo.name, buffer);
    default:
      return desdeTexto(archivo.name, buffer);
  }
}

/* ------------------------------------------------------------------ PDF -- */

async function desdePdf(nombre: string, buffer: ArrayBuffer): Promise<ArchivoExtraido> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const paginas = Array.isArray(text) ? text : [text];
  const completo = paginas.join("\f").replace(/[ \t]+/g, " ").trim();

  if (!completo || completo.length < 40) {
    throw new Error(
      `${nombre} no contiene texto seleccionable. Si es un plano escaneado, necesita pasar antes por OCR.`,
    );
  }
  return ficha(nombre, "pdf", completo, totalPages, null);
}

/* ----------------------------------------------------------------- Word -- */

async function desdeWord(nombre: string, buffer: ArrayBuffer): Promise<ArchivoExtraido> {
  if (nombre.toLowerCase().endsWith(".doc")) {
    throw new Error(
      `${nombre} está en formato .doc antiguo. Guárdalo como .docx y vuelve a subirlo.`,
    );
  }
  const mammoth = await import("mammoth");
  const { value, messages } = await mammoth.extractRawText({
    buffer: Buffer.from(buffer),
  });
  const texto = value.replace(/\n{3,}/g, "\n\n").trim();
  if (!texto) throw new Error(`${nombre} no contiene texto legible.`);

  const aviso = messages.length > 0 ? `${messages.length} elementos no convertibles (imágenes o campos).` : null;
  return ficha(nombre, "word", texto, null, aviso);
}

/* ---------------------------------------------------------------- Excel -- */

async function desdeExcel(nombre: string, buffer: ArrayBuffer): Promise<ArchivoExtraido> {
  const ExcelJS = (await import("exceljs")).default;
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(buffer);

  const partes: string[] = [];
  libro.eachSheet((hoja) => {
    partes.push(`\n=== HOJA: ${hoja.name} ===`);
    hoja.eachRow({ includeEmpty: false }, (fila) => {
      const celdas: string[] = [];
      fila.eachCell({ includeEmpty: true }, (celda) => {
        celdas.push(valorCelda(celda.value));
      });
      const linea = celdas.join(" | ").trim();
      if (linea.replace(/[|\s]/g, "")) partes.push(linea);
    });
  });

  const texto = partes.join("\n").trim();
  if (!texto) throw new Error(`${nombre} no contiene datos legibles.`);
  return ficha(nombre, "excel", texto, null, null);
}

function valorCelda(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "object") {
    const objeto = valor as { result?: unknown; text?: unknown; richText?: { text: string }[] };
    if (objeto.result !== undefined) return String(objeto.result);
    if (objeto.text !== undefined) return String(objeto.text);
    if (Array.isArray(objeto.richText)) return objeto.richText.map((t) => t.text).join("");
    if (valor instanceof Date) return valor.toISOString().slice(0, 10);
    return "";
  }
  return String(valor);
}

/* ------------------------------------------------------------------ CSV -- */

async function desdeCsv(nombre: string, buffer: ArrayBuffer): Promise<ArchivoExtraido> {
  const crudo = decodificar(buffer);
  const separador = crudo.includes("\t") ? "\t" : crudo.split("\n")[0].includes(";") ? ";" : ",";
  const lineas = crudo
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => dividirCsv(l, separador).join(" | "));
  const texto = lineas.join("\n");
  if (!texto) throw new Error(`${nombre} está vacío.`);
  return ficha(nombre, "csv", texto, null, `${lineas.length} filas leídas.`);
}

/** Divide respetando comillas dobles, que es donde falla un split ingenuo. */
function dividirCsv(linea: string, separador: string): string[] {
  const campos: string[] = [];
  let actual = "";
  let entreComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      if (entreComillas && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else {
        entreComillas = !entreComillas;
      }
    } else if (c === separador && !entreComillas) {
      campos.push(actual.trim());
      actual = "";
    } else {
      actual += c;
    }
  }
  campos.push(actual.trim());
  return campos;
}

/* ----------------------------------------------------------------- HTML -- */

async function desdeHtml(nombre: string, buffer: ArrayBuffer): Promise<ArchivoExtraido> {
  const crudo = decodificar(buffer);
  const texto = crudo
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|tr|li|h[1-6]|table|section)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<td[^>]*>/gi, " | ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!texto) throw new Error(`${nombre} no contiene texto.`);
  return ficha(nombre, "html", texto, null, null);
}

/* ------------------------------------------------------------------ DXF -- */

/**
 * De un DXF interesa su estructura: qué capas hay, qué bloques se insertan y
 * qué textos y cotas contiene. Eso es lo que permite a los agentes entender de
 * qué trata el plano sin necesitar un visor CAD.
 */
async function desdeDxf(nombre: string, buffer: ArrayBuffer): Promise<ArchivoExtraido> {
  const crudo = decodificar(buffer);
  const lineas = crudo.split(/\r?\n/).map((l) => l.trim());

  const capas = new Set<string>();
  const bloques = new Map<string, number>();
  const textos: string[] = [];
  const entidades = new Map<string, number>();

  for (let i = 0; i < lineas.length - 1; i++) {
    const codigo = lineas[i];
    const valor = lineas[i + 1];

    if (codigo === "0") entidades.set(valor, (entidades.get(valor) ?? 0) + 1);
    if (codigo === "8" && valor) capas.add(valor);
    if (codigo === "2" && lineas[i - 2] === "0" && lineas[i - 1] === "INSERT") {
      bloques.set(valor, (bloques.get(valor) ?? 0) + 1);
    }
    if ((codigo === "1" || codigo === "3") && valor && valor.length > 1) {
      const limpio = valor.replace(/\\[A-Za-z][^;]*;/g, "").replace(/[{}]/g, "").trim();
      if (limpio) textos.push(limpio);
    }
  }

  const partes = [
    `ARCHIVO CAD: ${nombre}`,
    "",
    `CAPAS (${capas.size}):`,
    [...capas].sort().join(", ") || "sin capas declaradas",
    "",
    "ENTIDADES:",
    [...entidades.entries()]
      .filter(([tipo]) => !["SECTION", "ENDSEC", "TABLE", "ENDTAB", "EOF"].includes(tipo))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tipo, n]) => `  ${tipo}: ${n}`)
      .join("\n"),
  ];

  if (bloques.size > 0) {
    partes.push(
      "",
      `BLOQUES INSERTADOS (${bloques.size}):`,
      [...bloques.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 40)
        .map(([b, n]) => `  ${b} ×${n}`)
        .join("\n"),
    );
  }

  const unicos = [...new Set(textos)];
  if (unicos.length > 0) {
    partes.push("", `TEXTOS Y ANOTACIONES DEL PLANO (${unicos.length}):`, unicos.slice(0, 400).join("\n"));
  }

  return ficha(
    nombre,
    "dxf",
    partes.join("\n"),
    null,
    "Del CAD se extrae la estructura (capas, bloques y anotaciones), no la geometría.",
  );
}

/* ------------------------------------------------------------------ IFC -- */

/** Del IFC se extraen las entidades BIM y sus nombres, que es su valor semántico. */
async function desdeIfc(nombre: string, buffer: ArrayBuffer): Promise<ArchivoExtraido> {
  const crudo = decodificar(buffer);
  const tipos = new Map<string, number>();
  const nombres = new Set<string>();

  for (const linea of crudo.split(/\r?\n/)) {
    const coincidencia = linea.match(/=\s*(IFC[A-Z0-9]+)\s*\(/i);
    if (!coincidencia) continue;
    const tipo = coincidencia[1].toUpperCase();
    tipos.set(tipo, (tipos.get(tipo) ?? 0) + 1);

    const cadenas = linea.match(/'([^']{2,60})'/g);
    if (cadenas && /IFC(PROJECT|SITE|BUILDING|BUILDINGSTOREY|SPACE|ZONE)/.test(tipo)) {
      cadenas.slice(0, 2).forEach((c) => nombres.add(`${tipo}: ${c.replace(/'/g, "")}`));
    }
  }

  const cabecera = crudo.match(/FILE_DESCRIPTION\(([^)]*)\)/)?.[1] ?? "";
  const esquema = crudo.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/)?.[1] ?? "desconocido";

  const partes = [
    `MODELO BIM (IFC): ${nombre}`,
    `Esquema: ${esquema}`,
    cabecera ? `Descripción: ${cabecera.slice(0, 200)}` : "",
    "",
    `ELEMENTOS POR TIPO (${tipos.size} tipos):`,
    [...tipos.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([t, n]) => `  ${t}: ${n}`)
      .join("\n"),
  ];

  if (nombres.size > 0) {
    partes.push("", "ESTRUCTURA ESPACIAL:", [...nombres].slice(0, 120).join("\n"));
  }

  return ficha(nombre, "ifc", partes.filter(Boolean).join("\n"), null, "Del IFC se extrae la estructura de elementos, no la geometría.");
}

/* ----------------------------------------------------------- JSON y texto -- */

async function desdeJson(nombre: string, buffer: ArrayBuffer): Promise<ArchivoExtraido> {
  const crudo = decodificar(buffer);
  try {
    const texto = JSON.stringify(JSON.parse(crudo), null, 2);
    return ficha(nombre, "json", texto, null, null);
  } catch {
    return ficha(nombre, "json", crudo, null, "JSON malformado: se envía tal cual.");
  }
}

async function desdeTexto(nombre: string, buffer: ArrayBuffer): Promise<ArchivoExtraido> {
  const texto = decodificar(buffer).trim();
  if (!texto) throw new Error(`${nombre} está vacío.`);
  return ficha(nombre, "texto", texto, null, null);
}

/* ------------------------------------------------------------- Utilidades -- */

function decodificar(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // BOM UTF-16LE: frecuente en exportaciones de Windows.
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(buffer);
  }
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  // Si aparecen caracteres de reemplazo, probablemente venga en latin-1.
  if ((utf8.match(/�/g)?.length ?? 0) > utf8.length / 200) {
    return new TextDecoder("windows-1252").decode(buffer);
  }
  return utf8;
}

function ficha(
  nombre: string,
  formato: FormatoSoportado,
  texto: string,
  paginas: number | null,
  aviso: string | null,
): ArchivoExtraido {
  return {
    nombre,
    formato,
    texto,
    caracteres: texto.length,
    paginas,
    aviso,
  };
}

/** Une varios archivos en un solo documento, delimitando cada fuente. */
export function unirDocumentos(archivos: ArchivoExtraido[]): string {
  return archivos
    .map(
      (a) =>
        `===== DOCUMENTO: ${a.nombre} (${a.formato.toUpperCase()}) =====\n\n${a.texto}`,
    )
    .join("\n\n")
    .slice(0, MAX_CARACTERES_TOTAL);
}

export const ETIQUETA_FORMATO: Record<FormatoSoportado, string> = {
  pdf: "PDF",
  word: "Word",
  excel: "Excel",
  csv: "CSV",
  html: "HTML",
  texto: "Texto",
  dxf: "CAD (DXF)",
  ifc: "BIM (IFC)",
  json: "JSON",
};
