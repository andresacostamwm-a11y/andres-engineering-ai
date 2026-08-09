/**
 * Método de la ruta crítica (CPM) sobre las actividades de obra.
 *
 * El modelo aporta el juicio de ingeniería —qué actividades hay, cuánto duran y
 * qué depende de qué— y aquí se hace la aritmética. Es la misma frontera que en
 * el presupuesto: un modelo estima bien una duración y encadena mal cincuenta
 * dependencias, así que el paso adelante, el paso atrás, las holguras y la ruta
 * crítica salen de código cubierto por pruebas.
 *
 * Se usa el modelo de precedencia fin-inicio sin desfases, que es el que
 * corresponde a un cronograma de anteproyecto.
 */
import type { ActividadObra, ActividadProgramada } from "../tipos-proyecto.ts";

export interface ProgramaCalculado {
  actividades: ActividadProgramada[];
  /** Duración total en días desde el arranque. */
  duracionDias: number;
  /** Ids de las actividades sin holgura, en orden de inicio. */
  rutaCritica: string[];
  /** Dependencias que se ignoraron y por qué: nada se descarta en silencio. */
  avisos: string[];
}

/**
 * Programa las actividades y devuelve fechas relativas, holguras y ruta crítica.
 *
 * Tolera lo que un modelo equivoca de verdad: ids repetidos, predecesoras que no
 * existen, duraciones negativas y ciclos. Cada corrección se anota en `avisos`
 * en lugar de romper el cronograma completo, porque un programa con una
 * dependencia menos sigue siendo útil y uno que no se calcula no sirve de nada.
 */
export function programar(actividades: ActividadObra[]): ProgramaCalculado {
  const avisos: string[] = [];

  // 1. Normalización: ids únicos y duraciones sanas.
  const vistas = new Set<string>();
  const limpias: ActividadObra[] = [];
  for (const actividad of actividades) {
    if (vistas.has(actividad.id)) {
      avisos.push(`Se descartó una actividad con el id repetido «${actividad.id}».`);
      continue;
    }
    vistas.add(actividad.id);
    const duracion = Number.isFinite(actividad.duracionDias)
      ? Math.max(0, Math.round(actividad.duracionDias))
      : 0;
    if (duracion !== actividad.duracionDias) {
      avisos.push(
        `«${actividad.nombre}» traía una duración inválida (${actividad.duracionDias}); se ajustó a ${duracion} d.`,
      );
    }
    limpias.push({ ...actividad, duracionDias: duracion });
  }

  // 2. Depuración de precedencias: solo sobreviven las que apuntan a algo real
  //    y no se apuntan a sí mismas.
  const predecesoras = new Map<string, string[]>();
  for (const actividad of limpias) {
    const validas: string[] = [];
    for (const id of actividad.predecesoras) {
      if (id === actividad.id) {
        avisos.push(`«${actividad.nombre}» dependía de sí misma; se ignoró.`);
        continue;
      }
      if (!vistas.has(id)) {
        avisos.push(`«${actividad.nombre}» dependía de «${id}», que no existe; se ignoró.`);
        continue;
      }
      if (!validas.includes(id)) validas.push(id);
    }
    predecesoras.set(actividad.id, validas);
  }

  // 3. Orden topológico (Kahn). Lo que quede sin ordenar está en un ciclo:
  //    se libera cortando sus precedencias para que el cronograma exista igual.
  const orden = ordenTopologico(limpias, predecesoras);
  if (orden.length < limpias.length) {
    const enCiclo = limpias.filter((a) => !orden.includes(a.id));
    for (const actividad of enCiclo) {
      avisos.push(
        `«${actividad.nombre}» formaba un ciclo de dependencias; se programó sin predecesoras.`,
      );
      predecesoras.set(actividad.id, []);
      orden.push(actividad.id);
    }
  }

  const porId = new Map(limpias.map((a) => [a.id, a]));

  // 4. Paso adelante: inicio y fin más tempranos.
  const inicioTemprano = new Map<string, number>();
  const finTemprano = new Map<string, number>();
  for (const id of orden) {
    const actividad = porId.get(id)!;
    const inicio = (predecesoras.get(id) ?? []).reduce(
      (max, previa) => Math.max(max, finTemprano.get(previa) ?? 0),
      0,
    );
    inicioTemprano.set(id, inicio);
    finTemprano.set(id, inicio + actividad.duracionDias);
  }

  const duracionDias = limpias.length
    ? Math.max(...limpias.map((a) => finTemprano.get(a.id) ?? 0))
    : 0;

  // 5. Paso atrás: inicio y fin más tardíos sin retrasar el proyecto.
  const sucesoras = new Map<string, string[]>();
  for (const id of vistas) sucesoras.set(id, []);
  for (const [id, previas] of predecesoras) {
    for (const previa of previas) sucesoras.get(previa)!.push(id);
  }

  const finTardio = new Map<string, number>();
  const inicioTardio = new Map<string, number>();
  for (const id of [...orden].reverse()) {
    const actividad = porId.get(id)!;
    const siguientes = sucesoras.get(id) ?? [];
    const fin = siguientes.length
      ? Math.min(...siguientes.map((s) => inicioTardio.get(s) ?? duracionDias))
      : duracionDias;
    finTardio.set(id, fin);
    inicioTardio.set(id, fin - actividad.duracionDias);
  }

  // 6. Holgura total. Cero (o menos, por redondeo) marca la ruta crítica.
  const programadas: ActividadProgramada[] = limpias.map((actividad) => {
    const inicio = inicioTemprano.get(actividad.id) ?? 0;
    const fin = finTemprano.get(actividad.id) ?? 0;
    const holgura = (inicioTardio.get(actividad.id) ?? inicio) - inicio;
    return {
      ...actividad,
      predecesoras: predecesoras.get(actividad.id) ?? [],
      inicio,
      fin,
      holgura,
      critica: holgura <= 0,
    };
  });

  programadas.sort((a, b) => a.inicio - b.inicio || a.fin - b.fin);

  return {
    actividades: programadas,
    duracionDias,
    rutaCritica: programadas.filter((a) => a.critica).map((a) => a.id),
    avisos,
  };
}

/** Orden topológico por el algoritmo de Kahn. Devuelve solo lo alcanzable. */
function ordenTopologico(
  actividades: ActividadObra[],
  predecesoras: Map<string, string[]>,
): string[] {
  const pendientes = new Map<string, number>();
  const sucesoras = new Map<string, string[]>();
  for (const actividad of actividades) {
    pendientes.set(actividad.id, (predecesoras.get(actividad.id) ?? []).length);
    sucesoras.set(actividad.id, []);
  }
  for (const [id, previas] of predecesoras) {
    for (const previa of previas) sucesoras.get(previa)?.push(id);
  }

  const cola = actividades.filter((a) => pendientes.get(a.id) === 0).map((a) => a.id);
  const orden: string[] = [];
  while (cola.length) {
    const id = cola.shift()!;
    orden.push(id);
    for (const siguiente of sucesoras.get(id) ?? []) {
      const restantes = (pendientes.get(siguiente) ?? 0) - 1;
      pendientes.set(siguiente, restantes);
      if (restantes === 0) cola.push(siguiente);
    }
  }
  return orden;
}

/**
 * Reparte la duración en fases legibles para el encabezado del Gantt.
 *
 * Un cronograma de 240 días no se lee bien en días sueltos; se agrupa en meses
 * de 30 días naturales, que es la unidad con la que se habla de una obra.
 */
export function mesesDelPrograma(duracionDias: number): number {
  return Math.max(1, Math.ceil(duracionDias / 30));
}
