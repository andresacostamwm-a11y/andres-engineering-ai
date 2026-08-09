/**
 * Colocación de rótulos en un plano sin que se monten unos sobre otros.
 *
 * Hasta ahora cada texto se dibujaba en su sitio nominal —la etiqueta debajo de
 * su símbolo, la etiqueta de conexión en el punto medio del trazo— sin mirar
 * qué había ya ahí. En un unifilar con veinte elementos eso produce palabras
 * encima de palabras, que en un plano no es un defecto estético: es un plano
 * que no se puede leer y por tanto no se puede entregar.
 *
 * Aquí se resuelve con un colocador voraz: cada rótulo propone varias
 * posiciones candidatas en orden de preferencia y se queda con la primera que
 * no pisa nada. Si ninguna está libre —un plano puede estar genuinamente
 * saturado—, se queda con la que menos superficie solapa, que sigue siendo
 * mejor que la primera a ciegas.
 *
 * El módulo es geometría pura y no sabe nada de SVG: por eso se puede probar.
 */

export interface Caja {
  /** Centro del bloque. */
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export interface BloqueColocable {
  id: string;
  ancho: number;
  alto: number;
  /** Centros posibles, del más deseable al menos. Nunca vacío. */
  candidatos: { x: number; y: number }[];
}

/** Límites dentro de los que debe quedar todo rótulo. */
export interface Limites {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Anchura aproximada de un texto.
 *
 * No hay acceso a las métricas reales de la fuente al generar el SVG, así que
 * se estima por el número de caracteres. La constante se eligió alta a
 * propósito: sobrestimar separa de más, y subestimar vuelve a montar los textos,
 * que es justo lo que se quiere evitar.
 */
export function anchoTexto(texto: string, tamano: number, mono = false): number {
  return texto.length * tamano * (mono ? 0.62 : 0.58);
}

/** Superficie en la que dos cajas se pisan. Cero si no se tocan. */
export function solape(a: Caja, b: Caja): number {
  const dx = Math.min(a.x + a.ancho / 2, b.x + b.ancho / 2) - Math.max(a.x - a.ancho / 2, b.x - b.ancho / 2);
  const dy = Math.min(a.y + a.alto / 2, b.y + b.alto / 2) - Math.max(a.y - a.alto / 2, b.y - b.alto / 2);
  return dx > 0 && dy > 0 ? dx * dy : 0;
}

/** Cuánto se sale una caja de los límites. Cero si cabe entera. */
function desborde(caja: Caja, limites: Limites): number {
  const izquierda = Math.max(0, limites.x0 - (caja.x - caja.ancho / 2));
  const derecha = Math.max(0, caja.x + caja.ancho / 2 - limites.x1);
  const arriba = Math.max(0, limites.y0 - (caja.y - caja.alto / 2));
  const abajo = Math.max(0, caja.y + caja.alto / 2 - limites.y1);
  return izquierda + derecha + arriba + abajo;
}

/**
 * Coloca los bloques evitando los obstáculos y los ya colocados.
 *
 * El orden de entrada es el orden de prioridad: lo que se coloca primero manda,
 * así que conviene pasar antes las etiquetas de los elementos —que anclan a un
 * símbolo y casi no pueden moverse— y después las de las conexiones, que
 * pueden deslizarse a lo largo de su trazo.
 */
export function colocar(
  bloques: BloqueColocable[],
  obstaculos: Caja[],
  limites: Limites,
): Map<string, { x: number; y: number }> {
  const ocupadas: Caja[] = [...obstaculos];
  const resultado = new Map<string, { x: number; y: number }>();

  for (const bloque of bloques) {
    let mejor = bloque.candidatos[0];
    let mejorCoste = Infinity;

    for (const candidato of bloque.candidatos) {
      const caja: Caja = {
        x: candidato.x,
        y: candidato.y,
        ancho: bloque.ancho,
        alto: bloque.alto,
      };

      // Salirse del área útil se penaliza fuerte: un rótulo bajo el cajetín o
      // fuera del marco no es una colocación aceptable ni aunque no pise nada.
      let coste = desborde(caja, limites) * 240;
      for (const ocupada of ocupadas) coste += solape(caja, ocupada);

      if (coste === 0) {
        mejor = candidato;
        mejorCoste = 0;
        break;
      }
      if (coste < mejorCoste) {
        mejorCoste = coste;
        mejor = candidato;
      }
    }

    resultado.set(bloque.id, mejor);
    ocupadas.push({ x: mejor.x, y: mejor.y, ancho: bloque.ancho, alto: bloque.alto });
  }

  return resultado;
}

/**
 * Punto a la fracción `t` de una polilínea, medido sobre su longitud real.
 *
 * Se usa para deslizar la etiqueta de una conexión a lo largo de su trazo en
 * lugar de dejarla clavada en el punto medio.
 */
export function puntoEn(puntos: { x: number; y: number }[], t: number): { x: number; y: number } {
  if (puntos.length === 0) return { x: 0, y: 0 };
  if (puntos.length === 1) return puntos[0];

  const tramos: number[] = [];
  let total = 0;
  for (let i = 1; i < puntos.length; i++) {
    const largo = Math.hypot(puntos[i].x - puntos[i - 1].x, puntos[i].y - puntos[i - 1].y);
    tramos.push(largo);
    total += largo;
  }
  if (total === 0) return puntos[0];

  let restante = Math.min(Math.max(t, 0), 1) * total;
  for (let i = 0; i < tramos.length; i++) {
    if (restante <= tramos[i] || i === tramos.length - 1) {
      const fraccion = tramos[i] === 0 ? 0 : restante / tramos[i];
      return {
        x: puntos[i].x + (puntos[i + 1].x - puntos[i].x) * fraccion,
        y: puntos[i].y + (puntos[i + 1].y - puntos[i].y) * fraccion,
      };
    }
    restante -= tramos[i];
  }
  return puntos[puntos.length - 1];
}
