/**
 * Recuperación de fragmentos (RAG léxico).
 *
 * Se implementa BM25 en lugar de una base vectorial por dos razones:
 *  1. El corpus es un solo documento por sesión, no un acervo: no hay que
 *     amortizar el costo de indexar ni de mantener embeddings.
 *  2. En documentos técnicos la consulta y el texto comparten vocabulario
 *     literal ("NOM-001-SEDE", "f'c=250", "tablero"), que es justo donde el
 *     emparejamiento léxico rinde mejor y es además auditable: se puede señalar
 *     por qué se recuperó cada fragmento.
 *
 * Sin dependencias externas ni llamadas de red.
 */

export interface Fragmento {
  texto: string;
  pagina: number | null;
  indice: number;
}

const K1 = 1.5;
const B = 0.75;

/** Palabras vacías del español que solo añaden ruido al emparejamiento. */
const VACIAS = new Set([
  "el","la","los","las","un","una","unos","unas","de","del","al","a","ante","bajo",
  "con","contra","desde","en","entre","hacia","hasta","para","por","segun","sin",
  "sobre","tras","y","o","u","e","que","se","su","sus","lo","es","son","ser","como",
  "mas","pero","este","esta","estos","estas","ese","esa","cual","cuales","donde",
  "cuando","muy","ya","si","no","le","les","me","mi","te","tu","nos",
]);

export function tokenizar(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9ñ'.\-/]+/)
    .map((t) => t.replace(/^[.\-/]+|[.\-/]+$/g, ""))
    .filter((t) => t.length > 1 && !VACIAS.has(t));
}

/**
 * Parte el documento en fragmentos solapados. El solape evita que una frase
 * partida por la mitad se vuelva irrecuperable.
 */
export function fragmentar(
  texto: string,
  tamano = 1200,
  solape = 200,
): Fragmento[] {
  const fragmentos: Fragmento[] = [];
  const paginas = texto.split("\f");
  let indice = 0;

  paginas.forEach((contenido, numeroPagina) => {
    const limpio = contenido.trim();
    if (!limpio) return;
    const pagina = paginas.length > 1 ? numeroPagina + 1 : null;

    for (let inicio = 0; inicio < limpio.length; inicio += tamano - solape) {
      const trozo = limpio.slice(inicio, inicio + tamano).trim();
      if (trozo.length < 80) break;
      fragmentos.push({ texto: trozo, pagina, indice: indice++ });
      if (inicio + tamano >= limpio.length) break;
    }
  });

  return fragmentos;
}

/** Devuelve los `n` fragmentos con mayor puntaje BM25 para la consulta. */
export function recuperar(
  fragmentos: Fragmento[],
  consulta: string,
  n = 5,
): Fragmento[] {
  if (fragmentos.length === 0) return [];

  const documentos = fragmentos.map((f) => tokenizar(f.texto));
  const longitudMedia =
    documentos.reduce((s, d) => s + d.length, 0) / documentos.length;

  // Frecuencia documental de cada término.
  const frecuenciaDocumental = new Map<string, number>();
  for (const doc of documentos) {
    for (const termino of new Set(doc)) {
      frecuenciaDocumental.set(
        termino,
        (frecuenciaDocumental.get(termino) ?? 0) + 1,
      );
    }
  }

  const terminos = tokenizar(consulta);
  const N = documentos.length;

  const puntajes = documentos.map((doc, i) => {
    const conteo = new Map<string, number>();
    for (const t of doc) conteo.set(t, (conteo.get(t) ?? 0) + 1);

    let puntaje = 0;
    for (const termino of terminos) {
      const tf = conteo.get(termino);
      if (!tf) continue;
      const df = frecuenciaDocumental.get(termino) ?? 0;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      const norma = 1 - B + B * (doc.length / longitudMedia);
      puntaje += idf * ((tf * (K1 + 1)) / (tf + K1 * norma));
    }
    return { indice: i, puntaje };
  });

  return puntajes
    .filter((p) => p.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, n)
    .map((p) => fragmentos[p.indice]);
}
