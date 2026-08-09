/** Tipos del flujo de proyecto nuevo. */
import type { Diagrama } from "./diagramas/tipos.ts";
import type { Economia } from "./moneda/tipos.ts";
import type { DisciplinaProyecto, Envergadura } from "./disciplinas.ts";
import type { Hallazgo, Partida, Requerimiento, ResumenEjecutivo } from "./types.ts";

export type AgenteProyecto =
  | "programa"
  | "extractor"
  | "costos"
  | "normativo"
  | "proyectista"
  | "memoria"
  | "sintesis"
  | "programacion"
  | "riesgos"
  | "verificador";

/** Un renglón de cálculo dentro de la memoria: concepto, método y resultado. */
export interface CalculoMemoria {
  concepto: string;
  /** Fórmula o método aplicado, en notación legible (ej. "I = P / (√3·V·fp)"). */
  metodo: string;
  /** Datos de entrada con unidades. */
  datos: string;
  /** Resultado con unidad y, si aplica, la selección comercial derivada. */
  resultado: string;
}

/** Memoria de un sistema o instalación del proyecto. */
export interface SistemaMemoria {
  nombre: string;
  /** Memoria descriptiva del sistema: qué es, cómo funciona, de qué se compone. */
  descripcion: string;
  /** Criterios de diseño adoptados, con su base normativa o física. */
  criterios: string[];
  /** Cálculos justificativos del dimensionamiento. */
  calculos: CalculoMemoria[];
  /** Especificaciones de materiales y equipos resultantes. */
  especificaciones: string[];
}

/** Memoria técnica completa del proyecto: descriptiva y de cálculo. */
export interface MemoriaProyecto {
  /** Objeto de la memoria: qué proyecto documenta y con qué fin. */
  objeto: string;
  /** Antecedentes y condiciones de partida. */
  antecedentes: string;
  /** Normativa aplicable citada. */
  normativa: string[];
  /** Un bloque por instalación o sistema del proyecto. */
  sistemas: SistemaMemoria[];
  conclusiones: string;
}

/* ------------------------------------------------- Programación de obra -- */

/** Actividad tal como la propone el agente, antes de calcular fechas. */
export interface ActividadObra {
  id: string;
  nombre: string;
  /** Frente de trabajo o disciplina responsable. */
  frente: string;
  /** Duración en días naturales. */
  duracionDias: number;
  /** Ids de las actividades que deben terminar antes de que esta empiece. */
  predecesoras: string[];
  /** Un hito no consume tiempo: marca un evento verificable del proyecto. */
  hito: boolean;
}

/** Actividad ya situada en el tiempo por el motor CPM. */
export interface ActividadProgramada extends ActividadObra {
  /** Día de inicio contado desde el arranque de obra (0 = primer día). */
  inicio: number;
  /** Día de terminación contado desde el arranque. */
  fin: number;
  /** Días que puede retrasarse sin mover la fecha de entrega. */
  holgura: number;
  critica: boolean;
}

/** Cronograma completo del proyecto. */
export interface ProgramaObra {
  actividades: ActividadProgramada[];
  duracionDias: number;
  /** Ids de las actividades sin holgura. */
  rutaCritica: string[];
  /** Supuestos de rendimiento y calendario que sostienen las duraciones. */
  supuestos: string[];
  /** Correcciones que el motor tuvo que aplicar al encadenado propuesto. */
  avisos: string[];
}

/* ------------------------------------------------- Riesgos y viabilidad -- */

export interface RiesgoProyecto {
  id: string;
  titulo: string;
  /** Familia del riesgo: técnico, normativo, económico, de plazo, de contexto. */
  categoria: string;
  /** Probabilidad de ocurrencia, de 1 (rara) a 5 (casi segura). */
  probabilidad: number;
  /** Impacto si ocurre, de 1 (menor) a 5 (severo). */
  impacto: number;
  descripcion: string;
  mitigacion: string;
  /** Quién debe ejecutar la mitigación. */
  responsable: string;
}

/** Riesgo con su severidad ya calculada en código. */
export interface RiesgoEvaluado extends RiesgoProyecto {
  /** probabilidad × impacto, de 1 a 25. */
  severidad: number;
  nivel: "critico" | "alto" | "medio" | "bajo";
}

/** Una variable que mueve el presupuesto y cuánto lo mueve. */
export interface VariableSensibilidad {
  concepto: string;
  /** Variación al alza considerada, en porcentaje sobre el importe afectado. */
  variacionPct: number;
  /** Parte del presupuesto que la variable afecta, en porcentaje del total. */
  pesoPct: number;
  justificacion: string;
}

/** Escenarios económicos calculados sobre el presupuesto real del proyecto. */
export interface Sensibilidad {
  base: number;
  optimista: number;
  pesimista: number;
  /** Contingencia sugerida sobre el presupuesto base, en porcentaje. */
  contingenciaPct: number;
  variables: VariableSensibilidad[];
}

export interface Viabilidad {
  riesgos: RiesgoEvaluado[];
  sensibilidad: Sensibilidad;
  /** Lectura de conjunto: si el proyecto es viable y bajo qué condiciones. */
  veredicto: string;
  /** Condiciones que deben cumplirse para sostener la viabilidad. */
  condiciones: string[];
}

/* ---------------------------------------------- Verificación adversarial -- */

export interface HallazgoVerificacion {
  id: string;
  /** Agente cuya salida se cuestiona. */
  ambito: AgenteProyecto;
  gravedad: "critico" | "alto" | "medio" | "bajo";
  /** Qué está mal, en una frase. */
  titulo: string;
  /** El dato concreto del entregable que lo demuestra. */
  evidencia: string;
  /** Qué habría que corregir. */
  correccion: string;
  /** Comprobación aritmética o de cobertura hecha en código, no por el modelo. */
  automatico: boolean;
}

export interface Verificacion {
  hallazgos: HallazgoVerificacion[];
  /** Confianza en el entregable, de 0 a 100. Se calcula en código. */
  confianza: number;
  /** Si el paquete puede entregarse tal cual o requiere corrección previa. */
  veredicto: "entregable" | "entregable-con-reservas" | "requiere-correccion";
  /** Lo que el verificador comprobó y encontró correcto. */
  comprobado: string[];
}

export type EventoProyecto =
  | { tipo: "inicio"; agente: AgenteProyecto; mensaje: string }
  | { tipo: "alcance"; alcance: string; premisas: string[] }
  | { tipo: "resultado"; agente: "extractor"; datos: Requerimiento[] }
  | { tipo: "resultado"; agente: "costos"; datos: Partida[] }
  | { tipo: "resultado"; agente: "normativo"; datos: Hallazgo[] }
  | { tipo: "resultado"; agente: "proyectista"; datos: number }
  | { tipo: "resultado"; agente: "memoria"; datos: MemoriaProyecto }
  | { tipo: "resultado"; agente: "sintesis"; datos: ResumenEjecutivo }
  | { tipo: "resultado"; agente: "programacion"; datos: ProgramaObra }
  | { tipo: "resultado"; agente: "riesgos"; datos: Viabilidad }
  | { tipo: "resultado"; agente: "verificador"; datos: Verificacion }
  | { tipo: "diagrama"; diagrama: Diagrama }
  | { tipo: "error"; agente: AgenteProyecto; mensaje: string }
  | { tipo: "fin"; modoDemo: boolean; economia: Economia | null };

/** Proyecto completo, tal como se guarda en el historial del navegador. */
export interface Proyecto {
  id: string;
  nombre: string;
  descripcion: string;
  /** Disciplina principal. Se conserva por compatibilidad con el historial. */
  disciplina: DisciplinaProyecto;
  /** Todas las disciplinas elegidas. La primera es la principal. */
  disciplinas?: DisciplinaProyecto[];
  envergadura: Envergadura;
  ubicacion: string;
  creadoEn: string;
  alcance: string;
  premisas: string[];
  requerimientos: Requerimiento[];
  partidas: Partida[];
  hallazgos: Hallazgo[];
  diagramas: Diagrama[];
  memoria: MemoriaProyecto | null;
  resumen: ResumenEjecutivo | null;
  /** Cronograma con ruta crítica. Nulo en proyectos guardados antes de existir. */
  programa: ProgramaObra | null;
  /** Matriz de riesgos y sensibilidad económica. */
  viabilidad: Viabilidad | null;
  /** Revisión adversarial del paquete antes de entregarlo. */
  verificacion: Verificacion | null;
  /** Condiciones económicas con las que se costeó el proyecto. */
  economia: Economia | null;
  modoDemo: boolean;
}
