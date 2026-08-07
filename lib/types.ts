/**
 * Tipos compartidos entre servidor y cliente.
 * Toda la salida de los agentes está tipada y validada con Zod (ver lib/schemas.ts).
 */

/** Disciplinas de ingeniería que el sistema reconoce. */
export type Disciplina =
  | "arquitectura"
  | "estructural"
  | "electrica"
  | "hidrosanitaria"
  | "hvac"
  | "proteccion-incendio"
  | "obra-civil"
  | "general";

/** Nivel de riesgo usado por el agente normativo y la matriz de hallazgos. */
export type NivelRiesgo = "critico" | "alto" | "medio" | "bajo";

/** Un requerimiento extraído del documento fuente. */
export interface Requerimiento {
  id: string;
  descripcion: string;
  disciplina: Disciplina;
  /** Cita textual del documento que respalda el requerimiento. */
  evidencia: string;
  /** Página aproximada donde aparece la evidencia. */
  pagina: number | null;
  critico: boolean;
}

/** Una partida del presupuesto con su matriz de precio unitario. */
export interface Partida {
  clave: string;
  concepto: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  importe: number;
  disciplina: Disciplina;
  /** Desglose del precio unitario: materiales, mano de obra, equipo, indirectos. */
  matriz: {
    materiales: number;
    manoObra: number;
    equipo: number;
    indirectos: number;
  };
  /** Supuesto explícito que el agente asumió para poder costear. */
  supuesto: string | null;
}

/** Un hallazgo del agente normativo. */
export interface Hallazgo {
  id: string;
  titulo: string;
  norma: string;
  articulo: string | null;
  riesgo: NivelRiesgo;
  descripcion: string;
  recomendacion: string;
  disciplina: Disciplina;
}

/** Resultado completo de un análisis, tal como se guarda en el historial local. */
export interface Analisis {
  id: string;
  nombreArchivo: string;
  creadoEn: string;
  paginas: number;
  caracteres: number;
  /** Texto plano extraído del PDF; se conserva solo en el navegador. */
  texto: string;
  resumen: ResumenEjecutivo | null;
  requerimientos: Requerimiento[];
  partidas: Partida[];
  hallazgos: Hallazgo[];
  /** true cuando el análisis se generó sin API key (datos de demostración). */
  modoDemo: boolean;
}

/** Síntesis final producida por el orquestador. */
export interface ResumenEjecutivo {
  titulo: string;
  tipoProyecto: string;
  ubicacion: string | null;
  sintesis: string;
  totalEstimado: number;
  moneda: "MXN";
  riesgoGlobal: NivelRiesgo;
  recomendaciones: string[];
  supuestos: string[];
}

/** Identificador de cada agente del pipeline. */
export type AgenteId = "extractor" | "costos" | "normativo" | "sintesis";

/** Evento emitido por el pipeline vía Server-Sent Events. */
export type EventoAgente =
  | { tipo: "inicio"; agente: AgenteId; mensaje: string }
  | { tipo: "progreso"; agente: AgenteId; mensaje: string }
  | { tipo: "resultado"; agente: "extractor"; datos: Requerimiento[] }
  | { tipo: "resultado"; agente: "costos"; datos: Partida[] }
  | { tipo: "resultado"; agente: "normativo"; datos: Hallazgo[] }
  | { tipo: "resultado"; agente: "sintesis"; datos: ResumenEjecutivo }
  | { tipo: "error"; agente: AgenteId; mensaje: string }
  | { tipo: "fin"; modoDemo: boolean };

/** Mensaje del chat RAG sobre el documento. */
export interface MensajeChat {
  rol: "usuario" | "asistente";
  contenido: string;
  /** Fragmentos del documento que se usaron para responder. */
  fuentes?: { fragmento: string; pagina: number | null }[];
}

export const ETIQUETA_DISCIPLINA: Record<Disciplina, string> = {
  arquitectura: "Arquitectura",
  estructural: "Estructural",
  electrica: "Eléctrica",
  hidrosanitaria: "Hidrosanitaria",
  hvac: "HVAC",
  "proteccion-incendio": "Protección contra incendio",
  "obra-civil": "Obra civil",
  general: "General",
};

export const ETIQUETA_RIESGO: Record<NivelRiesgo, string> = {
  critico: "Crítico",
  alto: "Alto",
  medio: "Medio",
  bajo: "Bajo",
};
