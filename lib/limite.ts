/**
 * Limitador de peticiones en memoria.
 *
 * Ventana deslizante por IP. Es deliberadamente simple: la aplicación tiene una
 * sola cuenta de demostración pública y el objetivo es evitar que alguien agote
 * la cuota de la API, no construir un limitador distribuido. En un despliegue
 * con varias instancias haría falta un almacén compartido (Redis, KV).
 */
const registros = new Map<string, number[]>();

export interface ResultadoLimite {
  permitido: boolean;
  restantes: number;
  reintentarEn: number;
}

export function verificarLimite(
  clave: string,
  maximo: number,
  ventanaMs: number,
): ResultadoLimite {
  const ahora = Date.now();
  const previos = registros.get(clave) ?? [];
  const vigentes = previos.filter((t) => ahora - t < ventanaMs);

  if (vigentes.length >= maximo) {
    const masAntiguo = Math.min(...vigentes);
    registros.set(clave, vigentes);
    return {
      permitido: false,
      restantes: 0,
      reintentarEn: Math.ceil((ventanaMs - (ahora - masAntiguo)) / 1000),
    };
  }

  vigentes.push(ahora);
  registros.set(clave, vigentes);

  // Poda oportunista para que el mapa no crezca sin control.
  if (registros.size > 500) {
    for (const [k, marcas] of registros) {
      if (marcas.every((t) => ahora - t >= ventanaMs)) registros.delete(k);
    }
  }

  return {
    permitido: true,
    restantes: maximo - vigentes.length,
    reintentarEn: 0,
  };
}

/** Obtiene la IP del cliente a partir de las cabeceras del proxy. */
export function ipDe(request: Request): string {
  const reenviada = request.headers.get("x-forwarded-for");
  if (reenviada) return reenviada.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "desconocida";
}
