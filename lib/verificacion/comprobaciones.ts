/**
 * Comprobaciones deterministas del paquete antes de entregarlo.
 *
 * Son las que no necesitan modelo: aritmética que tiene que cuadrar y cobertura
 * que tiene que estar completa. Corren siempre —también sin cuota de API— y son
 * las únicas del verificador que nunca se equivocan, porque no opinan: comparan.
 *
 * Todo lo que sale de aquí lleva `automatico: true`, para que en el informe se
 * distinga lo que el sistema midió de lo que un modelo juzgó.
 */
import type {
  HallazgoVerificacion,
  MemoriaProyecto,
  ProgramaObra,
  Viabilidad,
} from "../tipos-proyecto.ts";
import type { Diagrama } from "../diagramas/tipos.ts";
import type { Hallazgo, Partida, Requerimiento, ResumenEjecutivo } from "../types.ts";
import type { DisciplinaProyecto, TipoDiagrama } from "../disciplinas.ts";
import { ETIQUETA_DISCIPLINA } from "../types.ts";

/** Tolerancia relativa al comparar importes. Absorbe el redondeo a centavos. */
const TOLERANCIA = 0.01;

export interface PaqueteVerificable {
  requerimientos: Requerimiento[];
  partidas: Partida[];
  hallazgos: Hallazgo[];
  diagramas: Diagrama[];
  memoria: MemoriaProyecto | null;
  resumen: ResumenEjecutivo | null;
  programa: ProgramaObra | null;
  viabilidad: Viabilidad | null;
  /** Láminas que el usuario pidió, para detectar las que faltan. */
  diagramasPedidos: TipoDiagrama[];
  /** Disciplinas elegidas, para detectar las que quedaron sin cubrir. */
  disciplinas: DisciplinaProyecto[];
}

export function comprobar(paquete: PaqueteVerificable): HallazgoVerificacion[] {
  return [
    ...comprobarAritmetica(paquete.partidas),
    ...comprobarCobertura(paquete),
    ...comprobarCoherencia(paquete),
  ];
}

/** El importe de cada partida y el desglose de su matriz tienen que cuadrar. */
function comprobarAritmetica(partidas: Partida[]): HallazgoVerificacion[] {
  const hallazgos: HallazgoVerificacion[] = [];

  for (const partida of partidas) {
    const esperado = partida.cantidad * partida.precioUnitario;
    if (desviado(partida.importe, esperado)) {
      hallazgos.push({
        id: `AUT-IMP-${partida.clave}`,
        ambito: "costos",
        gravedad: "critico",
        titulo: `El importe de «${partida.concepto}» no es cantidad × precio unitario`,
        evidencia: `${partida.cantidad} × ${partida.precioUnitario} = ${redondear(esperado)}, pero la partida declara ${partida.importe}.`,
        correccion: "Recalcular el importe o corregir la cantidad o el precio unitario.",
        automatico: true,
      });
    }

    const { materiales, manoObra, equipo, indirectos } = partida.matriz;
    const suma = materiales + manoObra + equipo + indirectos;
    if (desviado(suma, partida.precioUnitario)) {
      hallazgos.push({
        id: `AUT-MAT-${partida.clave}`,
        ambito: "costos",
        gravedad: "alto",
        titulo: `La matriz de «${partida.concepto}» no suma su precio unitario`,
        evidencia: `Materiales ${materiales} + mano de obra ${manoObra} + equipo ${equipo} + indirectos ${indirectos} = ${redondear(suma)}, frente a un precio unitario de ${partida.precioUnitario}.`,
        correccion: "Ajustar el desglose para que sume el precio unitario declarado.",
        automatico: true,
      });
    }

    if (partida.cantidad <= 0 || partida.precioUnitario <= 0) {
      hallazgos.push({
        id: `AUT-CER-${partida.clave}`,
        ambito: "costos",
        gravedad: "alto",
        titulo: `«${partida.concepto}» tiene cantidad o precio en cero`,
        evidencia: `Cantidad ${partida.cantidad} ${partida.unidad}, precio unitario ${partida.precioUnitario}.`,
        correccion: "Cuantificar la partida o retirarla del catálogo.",
        automatico: true,
      });
    }
  }

  return hallazgos;
}

/** Lo que se pidió tiene que estar: láminas, disciplinas y piezas del paquete. */
function comprobarCobertura(paquete: PaqueteVerificable): HallazgoVerificacion[] {
  const hallazgos: HallazgoVerificacion[] = [];

  const dibujados = new Set(paquete.diagramas.map((d) => d.tipo));
  const faltantes = paquete.diagramasPedidos.filter((t) => !dibujados.has(t));
  if (faltantes.length > 0) {
    hallazgos.push({
      id: "AUT-LAM",
      ambito: "proyectista",
      gravedad: "alto",
      titulo: `Faltan ${faltantes.length} de las láminas pedidas`,
      evidencia: `No se dibujaron: ${faltantes.join(", ")}.`,
      correccion: "Regenerar el proyecto o dibujar las láminas faltantes por separado.",
      automatico: true,
    });
  }

  if (paquete.partidas.length === 0) {
    hallazgos.push({
      id: "AUT-PRE",
      ambito: "costos",
      gravedad: "critico",
      titulo: "El proyecto no tiene presupuesto",
      evidencia: "El catálogo de conceptos quedó vacío.",
      correccion: "Volver a lanzar el agente de costos antes de entregar.",
      automatico: true,
    });
  }

  if (!paquete.memoria) {
    hallazgos.push({
      id: "AUT-MEM",
      ambito: "memoria",
      gravedad: "alto",
      titulo: "El proyecto no tiene memoria técnica",
      evidencia: "El agente de memoria no devolvió resultado.",
      correccion: "Regenerar la memoria antes de entregar el dictamen.",
      automatico: true,
    });
  }

  // Una disciplina elegida que no aparece en ninguna partida quedó sin costear.
  // Se comparan como cadenas: las disciplinas del proyecto son un catálogo más
  // amplio que las del presupuesto, y aquí solo interesa la coincidencia.
  const conPartida = new Set<string>(paquete.partidas.map((p) => p.disciplina));
  const sinCostear = paquete.disciplinas.filter(
    (d) => !conPartida.has(d) && conPartida.size > 0,
  );
  if (sinCostear.length > 0 && paquete.disciplinas.length > 1) {
    hallazgos.push({
      id: "AUT-DIS",
      ambito: "costos",
      gravedad: "medio",
      titulo: `${sinCostear.length} disciplina(s) elegida(s) sin ninguna partida`,
      evidencia: `Sin costear: ${sinCostear.map(etiqueta).join(", ")}.`,
      correccion:
        "Comprobar si la disciplina está fuera del alcance real; si no lo está, completar su catálogo.",
      automatico: true,
    });
  }

  return hallazgos;
}

/** Las piezas del paquete tienen que contarse la misma historia entre sí. */
function comprobarCoherencia(paquete: PaqueteVerificable): HallazgoVerificacion[] {
  const hallazgos: HallazgoVerificacion[] = [];
  const total = paquete.partidas.reduce((suma, p) => suma + p.importe, 0);

  if (paquete.resumen && paquete.partidas.length > 0 && desviado(paquete.resumen.totalEstimado, total)) {
    hallazgos.push({
      id: "AUT-TOT",
      ambito: "sintesis",
      gravedad: "critico",
      titulo: "El total del resumen ejecutivo no coincide con el presupuesto",
      evidencia: `El resumen declara ${paquete.resumen.totalEstimado} y las partidas suman ${redondear(total)}.`,
      correccion: "Tomar el total del catálogo de conceptos como cifra única del proyecto.",
      automatico: true,
    });
  }

  const criticosSinRecomendacion = paquete.hallazgos.filter(
    (h) => h.riesgo === "critico" && !h.recomendacion.trim(),
  );
  if (criticosSinRecomendacion.length > 0) {
    hallazgos.push({
      id: "AUT-REC",
      ambito: "normativo",
      gravedad: "alto",
      titulo: `${criticosSinRecomendacion.length} hallazgo(s) crítico(s) sin recomendación`,
      evidencia: criticosSinRecomendacion.map((h) => h.titulo).join("; "),
      correccion: "Todo hallazgo crítico debe llevar la acción que lo resuelve.",
      automatico: true,
    });
  }

  if (paquete.programa) {
    if (paquete.programa.duracionDias <= 0) {
      hallazgos.push({
        id: "AUT-PLA",
        ambito: "programacion",
        gravedad: "alto",
        titulo: "El cronograma tiene duración cero",
        evidencia: `${paquete.programa.actividades.length} actividades y una duración total de ${paquete.programa.duracionDias} días.`,
        correccion: "Revisar las duraciones: ninguna actividad de obra dura cero días.",
        automatico: true,
      });
    }
    for (const aviso of paquete.programa.avisos) {
      hallazgos.push({
        id: `AUT-CPM-${hash(aviso)}`,
        ambito: "programacion",
        gravedad: "medio",
        titulo: "El encadenado propuesto tuvo que corregirse",
        evidencia: aviso,
        correccion: "Revisar la lógica constructiva de esa actividad en el cronograma.",
        automatico: true,
      });
    }
  }

  // Un requerimiento crítico sin ninguna partida de su disciplina quedó sin
  // traducir a obra, que es exactamente la partida que nadie presupuesta.
  if (paquete.partidas.length > 0) {
    const conPartida = new Set<string>(paquete.partidas.map((p) => p.disciplina));
    const huerfanos = paquete.requerimientos.filter(
      (r) => r.critico && !conPartida.has(r.disciplina),
    );
    if (huerfanos.length > 0) {
      hallazgos.push({
        id: "AUT-HUE",
        ambito: "costos",
        gravedad: "alto",
        titulo: `${huerfanos.length} requerimiento(s) crítico(s) sin partida en su disciplina`,
        evidencia: huerfanos.map((r) => `[${r.id}] ${r.descripcion}`).join("; "),
        correccion: "Añadir las partidas que ejecutan esos requerimientos o justificar su ausencia.",
        automatico: true,
      });
    }
  }

  return hallazgos;
}

/**
 * Confianza en el paquete, de 0 a 100.
 *
 * Parte de 100 y descuenta por gravedad. No es una nota académica: es cuánto
 * margen queda antes de que el entregable deje de sostenerse solo.
 */
export function calcularConfianza(hallazgos: HallazgoVerificacion[]): number {
  const penalizacion: Record<HallazgoVerificacion["gravedad"], number> = {
    critico: 25,
    alto: 12,
    medio: 5,
    bajo: 2,
  };
  const descuento = hallazgos.reduce((suma, h) => suma + penalizacion[h.gravedad], 0);
  return Math.max(0, 100 - descuento);
}

export function veredictoDe(
  hallazgos: HallazgoVerificacion[],
): "entregable" | "entregable-con-reservas" | "requiere-correccion" {
  if (hallazgos.some((h) => h.gravedad === "critico")) return "requiere-correccion";
  if (hallazgos.some((h) => h.gravedad === "alto")) return "entregable-con-reservas";
  return "entregable";
}

function desviado(valor: number, esperado: number): boolean {
  if (!Number.isFinite(valor) || !Number.isFinite(esperado)) return true;
  const referencia = Math.max(Math.abs(esperado), 1);
  return Math.abs(valor - esperado) / referencia > TOLERANCIA;
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function etiqueta(disciplina: string): string {
  return ETIQUETA_DISCIPLINA[disciplina as keyof typeof ETIQUETA_DISCIPLINA] ?? disciplina;
}

/** Sufijo estable para que dos avisos distintos no compartan id. */
function hash(texto: string): string {
  let acumulado = 0;
  for (let i = 0; i < texto.length; i++) {
    acumulado = (acumulado * 31 + texto.charCodeAt(i)) >>> 0;
  }
  return acumulado.toString(36).slice(0, 6);
}
