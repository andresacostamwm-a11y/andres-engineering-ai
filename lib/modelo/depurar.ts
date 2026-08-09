/**
 * Depurador del andamiaje que algunos modelos emiten como texto.
 *
 * Con el grounding de búsqueda activado, Gemini a veces escupe su propia
 * mecánica dentro del flujo de texto: una línea `tool_code`, una llamada
 * `print(google_search.search(...))`, o el rótulo `thought` seguido de su
 * razonamiento. Eso no es la respuesta, es la tramoya, y llegó a verse en
 * pantalla.
 *
 * Se filtra por líneas completas y no por subcadenas, para no mutilar una
 * respuesta legítima que mencione una de esas palabras. El depurador retiene la
 * última línea parcial hasta que llegue su salto: por eso hay que llamar a
 * `cerrar()` al terminar el flujo.
 */

/** Líneas que son puro rótulo de andamiaje. */
const ROTULOS = new Set([
  "tool_code",
  "tool_outputs",
  "tool_output",
  "tool_use",
  "thought",
  "thoughts",
  "thinking",
  "<thinking>",
  "</thinking>",
  "```tool_code",
  "```thought",
  "```",
]);

/** Comienzos que delatan una llamada a herramienta impresa como texto. */
const PREFIJOS = [
  "print(google_search",
  "print(default_api",
  "google_search.search(",
  "default_api.",
];

export interface Depurador {
  /** Devuelve el trozo ya limpio; puede ser cadena vacía. */
  procesar(trozo: string): string;
  /** Vacía lo que quedara pendiente al cerrar el flujo. */
  cerrar(): string;
}

export function depuradorDeAndamiaje(): Depurador {
  let pendiente = "";
  // Un rótulo de andamiaje abre un bloque: lo que sigue tampoco es respuesta,
  // hasta que aparezca una línea en blanco que lo cierre.
  let dentroDeAndamiaje = false;
  // Nada de lo que se emite puede empezar por salto de línea suelto.
  let algoEmitido = false;

  function decidir(linea: string): string | null {
    const limpia = linea.trim();

    if (limpia === "") {
      if (dentroDeAndamiaje) {
        dentroDeAndamiaje = false;
        return null;
      }
      return algoEmitido ? "" : null;
    }

    if (ROTULOS.has(limpia.toLowerCase())) {
      dentroDeAndamiaje = true;
      return null;
    }

    if (PREFIJOS.some((p) => limpia.toLowerCase().startsWith(p))) {
      dentroDeAndamiaje = true;
      return null;
    }

    if (dentroDeAndamiaje) return null;

    algoEmitido = true;
    return linea;
  }

  function volcar(lineas: string[]): string {
    const salida: string[] = [];
    for (const linea of lineas) {
      const decidida = decidir(linea);
      if (decidida !== null) salida.push(sinMarkdown(decidida));
    }
    return salida.length ? `${salida.join("\n")}\n` : "";
  }

  return {
    procesar(trozo: string): string {
      pendiente += trozo;
      const lineas = pendiente.split("\n");
      pendiente = lineas.pop() ?? "";
      return volcar(lineas);
    },
    cerrar(): string {
      if (!pendiente) return "";
      const resto = pendiente;
      pendiente = "";
      const decidida = decidir(resto);
      return decidida === null ? "" : sinMarkdown(decidida);
    },
  };
}

/**
 * Quita el Markdown de una línea.
 *
 * A los modelos se les pide texto plano y aun así devuelven `**negritas**` y
 * viñetas con asterisco. La interfaz los pinta tal cual, así que los asteriscos
 * salían por pantalla. Se convierten a su equivalente legible en vez de
 * borrarlos: una viñeta sigue siendo una viñeta.
 */
export function sinMarkdown(linea: string): string {
  return linea
    .replace(/^(\s*)#{1,6}\s+/, "$1")
    .replace(/^(\s*)[*+-]\s+/, "$1· ")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1$2")
    .replace(/`([^`\n]+)`/g, "$1");
}
