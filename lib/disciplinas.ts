/**
 * Catálogo de disciplinas de ingeniería que el sistema puede proyectar.
 *
 * Cada disciplina declara qué tipos de diagrama le son propios, para que el
 * agente no proponga un unifilar eléctrico en un proyecto de estructuras ni un
 * isométrico de tuberías en uno de electrónica.
 */

export type DisciplinaProyecto =
  | "arquitectura"
  | "civil-estructural"
  | "mecanica"
  | "mecatronica"
  | "electrica"
  | "electronica"
  | "hidraulica"
  | "neumatica"
  | "hvac"
  | "aeronautica"
  | "naval"
  | "ferroviaria"
  | "fluidos";

export type Envergadura = "pequena" | "mediana" | "grande";

export type TipoDiagrama =
  | "unifilar"
  | "hidraulico"
  | "neumatico"
  | "mecanico"
  | "electronico"
  | "pid"
  | "hvac"
  | "bloques"
  | "planta"
  | "estructural";

export interface FichaDisciplina {
  id: DisciplinaProyecto;
  nombre: string;
  descripcion: string;
  /**
   * Paquete completo de instalaciones de la disciplina: todos los planos que
   * un proyecto real de este tipo entrega, el primero es el principal.
   */
  diagramas: TipoDiagrama[];
  /** Normativa de referencia que el agente debe considerar. */
  normativa: string[];
  /** Entregables característicos de la disciplina. */
  entregables: string[];
}

export const DISCIPLINAS: FichaDisciplina[] = [
  {
    id: "arquitectura",
    nombre: "Arquitectura",
    descripcion: "Edificación, distribución de espacios y envolvente.",
    diagramas: ["planta", "unifilar", "hidraulico", "hvac", "bloques"],
    normativa: [
      "Reglamento de construcción local",
      "NMX-R-050-SCFI (accesibilidad)",
      "NOM-020-ENER (envolvente)",
    ],
    entregables: [
      "Planta arquitectónica",
      "Programa de necesidades",
      "Cuadro de áreas",
      "Memoria descriptiva",
    ],
  },
  {
    id: "civil-estructural",
    nombre: "Civil y estructural",
    descripcion: "Cimentaciones, estructura de concreto y acero, obra civil.",
    diagramas: ["estructural", "planta", "unifilar", "hidraulico"],
    normativa: [
      "NTC-Estructuras del reglamento local",
      "ACI 318",
      "AISC 360",
      "Manual de Obras Civiles CFE (viento y sismo)",
    ],
    entregables: [
      "Planta de cimentación",
      "Memoria de cálculo estructural",
      "Cuantificación de acero y concreto",
    ],
  },
  {
    id: "mecanica",
    nombre: "Mecánica",
    descripcion: "Máquinas, transmisiones, equipos y montajes mecánicos.",
    diagramas: ["mecanico", "pid", "unifilar", "neumatico"],
    normativa: ["ASME B31.3", "ISO 2768", "NOM-004-STPS (maquinaria)"],
    entregables: [
      "Diagrama de conjunto",
      "Lista de equipos",
      "Especificación técnica",
      "Plan de mantenimiento",
    ],
  },
  {
    id: "mecatronica",
    nombre: "Mecatrónica",
    descripcion: "Automatización, control, sensores y actuadores.",
    diagramas: ["bloques", "electronico", "neumatico", "unifilar"],
    normativa: ["IEC 61131-3 (PLC)", "ISO 13849 (seguridad de mando)", "NOM-004-STPS"],
    entregables: [
      "Arquitectura de control",
      "Lista de E/S",
      "Diagrama de bloques",
      "Matriz causa-efecto",
    ],
  },
  {
    id: "electrica",
    nombre: "Eléctrica",
    descripcion: "Distribución, tableros, alumbrado y fuerza.",
    diagramas: ["unifilar", "planta", "bloques"],
    normativa: [
      "NOM-001-SEDE-2012",
      "NOM-025-STPS (iluminación)",
      "IEEE 141 / IEEE 142",
    ],
    entregables: [
      "Diagrama unifilar",
      "Cuadro de cargas",
      "Memoria de cálculo eléctrico",
      "Cuantificación de conductores",
    ],
  },
  {
    id: "electronica",
    nombre: "Electrónica",
    descripcion: "Circuitos, instrumentación y electrónica de potencia.",
    diagramas: ["electronico", "bloques", "unifilar"],
    normativa: ["IPC-2221 (diseño PCB)", "IEC 61010", "FCC parte 15"],
    entregables: [
      "Esquemático",
      "Lista de materiales",
      "Diagrama de bloques",
      "Presupuesto de energía",
    ],
  },
  {
    id: "hidraulica",
    nombre: "Hidráulica y sanitaria",
    descripcion: "Redes de agua, drenaje, bombeo y contra incendio.",
    diagramas: ["hidraulico", "pid", "planta", "unifilar"],
    normativa: [
      "NOM-001-CONAGUA",
      "NOM-127-SSA1 (agua potable)",
      "NFPA 13 / NFPA 20 (contra incendio)",
    ],
    entregables: [
      "Isométrico hidráulico",
      "Memoria de cálculo de gasto y pérdidas",
      "Selección de equipo de bombeo",
    ],
  },
  {
    id: "neumatica",
    nombre: "Neumática",
    descripcion: "Aire comprimido, actuadores y mando neumático.",
    diagramas: ["neumatico", "bloques", "unifilar"],
    normativa: ["ISO 1219-1 (simbología)", "ISO 8573 (calidad del aire)"],
    entregables: [
      "Esquema neumático",
      "Cálculo de consumo de aire",
      "Selección de compresor y secador",
    ],
  },
  {
    id: "hvac",
    nombre: "HVAC",
    descripcion: "Climatización, ventilación y refrigeración.",
    diagramas: ["hvac", "pid", "planta", "unifilar"],
    normativa: [
      "ASHRAE 62.1 (ventilación)",
      "ASHRAE 90.1 (eficiencia)",
      "NOM-011-STPS (condiciones térmicas)",
    ],
    entregables: [
      "Diagrama de flujo de aire",
      "Cálculo de carga térmica",
      "Selección de equipos",
      "Cuantificación de ductos",
    ],
  },
  {
    id: "aeronautica",
    nombre: "Aeronáutica",
    descripcion: "Sistemas de aeronave, estructuras y propulsión.",
    diagramas: ["bloques", "mecanico", "hidraulico", "electronico"],
    normativa: ["FAR/CS-25", "SAE ARP4754A", "DO-178C (software)"],
    entregables: [
      "Diagrama de sistema",
      "Balance de masas",
      "Análisis de modos de fallo",
    ],
  },
  {
    id: "naval",
    nombre: "Naval",
    descripcion: "Buques, sistemas de a bordo y propulsión marina.",
    diagramas: ["bloques", "hidraulico", "mecanico", "unifilar"],
    normativa: [
      "SOLAS",
      "MARPOL",
      "Reglas de sociedad de clasificación (ABS / DNV / LR)",
    ],
    entregables: [
      "Diagrama de sistema de a bordo",
      "Cálculo de estabilidad preliminar",
      "Lista de equipos de máquinas",
    ],
  },
  {
    id: "ferroviaria",
    nombre: "Ferroviaria",
    descripcion: "Vía, material rodante, electrificación y señalización.",
    diagramas: ["bloques", "unifilar", "planta"],
    normativa: ["EN 50126 (RAMS)", "EN 50128", "IEEE 1474 (CBTC)"],
    entregables: [
      "Esquema de vía y señalización",
      "Diagrama de electrificación",
      "Análisis RAMS preliminar",
    ],
  },
  {
    id: "fluidos",
    nombre: "Ingeniería de fluidos",
    descripcion: "Proceso, bombeo, tuberías e instrumentación.",
    diagramas: ["pid", "hidraulico", "bloques", "unifilar"],
    normativa: ["ASME B31.3", "API 610 (bombas)", "ISA 5.1 (simbología)"],
    entregables: [
      "P&ID",
      "Balance de materia y energía",
      "Lista de líneas e instrumentos",
      "Hoja de datos de equipos",
    ],
  },
];

export const ENVERGADURAS: {
  id: Envergadura;
  nombre: string;
  descripcion: string;
  /** Rango orientativo que se le pasa al agente para calibrar el alcance. */
  referencia: string;
  partidasObjetivo: string;
}[] = [
  {
    id: "pequena",
    nombre: "Pequeña",
    descripcion: "Intervención acotada, una sola disciplina dominante.",
    referencia: "hasta 500 m² o menos de 5 millones de MXN",
    partidasObjetivo: "8 a 14 partidas",
  },
  {
    id: "mediana",
    nombre: "Mediana",
    descripcion: "Proyecto con varias especialidades coordinadas.",
    referencia: "500 a 5 000 m² o de 5 a 50 millones de MXN",
    partidasObjetivo: "15 a 25 partidas",
  },
  {
    id: "grande",
    nombre: "Gran envergadura",
    descripcion: "Obra mayor, multidisciplinar y por fases.",
    referencia: "más de 5 000 m² o más de 50 millones de MXN",
    partidasObjetivo: "25 a 40 partidas",
  },
];

export function fichaDisciplina(id: DisciplinaProyecto): FichaDisciplina {
  const ficha = DISCIPLINAS.find((d) => d.id === id);
  if (!ficha) throw new Error(`Disciplina desconocida: ${id}`);
  return ficha;
}

export const ETIQUETA_DIAGRAMA: Record<TipoDiagrama, string> = {
  unifilar: "Diagrama unifilar eléctrico",
  hidraulico: "Isométrico hidráulico",
  neumatico: "Esquema neumático",
  mecanico: "Diagrama mecánico de conjunto",
  electronico: "Esquemático electrónico",
  pid: "Diagrama de tubería e instrumentación (P&ID)",
  hvac: "Diagrama de climatización",
  bloques: "Diagrama de bloques del sistema",
  planta: "Planta esquemática",
  estructural: "Esquema estructural",
};

/**
 * Une los diagramas de varias disciplinas sin repetir, respetando el orden de
 * prioridad: primero los de la disciplina principal, luego los que aporten las
 * demás. Un proyecto real cruza especialidades y necesita las láminas de todas.
 */
export function diagramasDe(ids: DisciplinaProyecto[]): TipoDiagrama[] {
  const vistos = new Set<TipoDiagrama>();
  for (const id of ids) {
    for (const tipo of fichaDisciplina(id).diagramas) vistos.add(tipo);
  }
  return [...vistos];
}

/** Une la normativa de referencia de varias disciplinas, sin repetir. */
export function normativaDe(ids: DisciplinaProyecto[]): string[] {
  const vistos = new Set<string>();
  for (const id of ids) {
    for (const norma of fichaDisciplina(id).normativa) vistos.add(norma);
  }
  return [...vistos];
}

/** Catálogo completo de láminas que el sistema sabe dibujar. */
export const TODOS_LOS_DIAGRAMAS = Object.keys(ETIQUETA_DIAGRAMA) as TipoDiagrama[];
