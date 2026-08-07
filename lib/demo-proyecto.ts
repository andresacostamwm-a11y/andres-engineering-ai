/**
 * Datos de demostración del flujo de proyecto nuevo.
 *
 * Igual que en el análisis de documentos, el modo demostración recorre las
 * mismas etapas con contenido fijo cuando no hay API key configurada, de modo
 * que la aplicación desplegada siempre se puede evaluar de principio a fin.
 */
import type { Diagrama } from "./diagramas/tipos.ts";
import type { DisciplinaProyecto } from "./disciplinas.ts";
import {
  DOCUMENTO_DEMO,
  HALLAZGOS_DEMO,
  PARTIDAS_DEMO,
  REQUERIMIENTOS_DEMO,
  RESUMEN_DEMO,
} from "./demo.ts";

export const PROYECTO_DEMO = {
  alcance: DOCUMENTO_DEMO,
  premisas: [
    "Se asume clima cálido húmedo y zona de riesgo ciclónico (Quintana Roo).",
    "Se asume suministro eléctrico existente en media tensión con capacidad por verificar.",
    "Se asume terreno con estudio de mecánica de suelos disponible.",
  ],
  requerimientos: REQUERIMIENTOS_DEMO,
  partidas: PARTIDAS_DEMO,
  hallazgos: HALLAZGOS_DEMO,
  resumen: RESUMEN_DEMO,
};

const UNIFILAR: Diagrama = {
  tipo: "unifilar",
  titulo: "Diagrama unifilar — ampliación de nave industrial",
  descripcion:
    "Distribución desde acometida en media tensión hasta tableros derivados, con respaldo de emergencia.",
  escala: null,
  notas: [
    "Sistema de tierra física conforme a NOM-001-SEDE-2012 artículo 250, resistencia máxima 10 ohm.",
    "Verificar capacidad disponible de la subestación existente antes de conectar la ampliación.",
    "Protecciones coordinadas selectivamente entre interruptor general y derivados.",
  ],
  nodos: [
    { id: "ACO", etiqueta: "Acometida CFE", simbolo: "acometida", x: 50, y: 8, datos: ["13.2 kV", "3F 3H"] },
    { id: "MED", etiqueta: "Medición", simbolo: "medidor", x: 50, y: 22, datos: ["3F 4H"] },
    { id: "TR", etiqueta: "Transformador", simbolo: "transformador", x: 50, y: 36, datos: ["300 kVA", "13.2 kV / 220-127 V"] },
    { id: "IG", etiqueta: "Interruptor general", simbolo: "interruptor", x: 50, y: 50, datos: ["250 A"] },
    { id: "GE", etiqueta: "Planta de emergencia", simbolo: "generador", x: 82, y: 50, datos: ["150 kW"] },
    { id: "TG", etiqueta: "Tablero general", simbolo: "tablero", x: 50, y: 64, datos: ["250 A", "220/127 V"] },
    { id: "TD1", etiqueta: "Tablero producción", simbolo: "tablero", x: 22, y: 82, datos: ["150 A"] },
    { id: "TD2", etiqueta: "Tablero servicios", simbolo: "tablero", x: 50, y: 82, datos: ["60 A"] },
    { id: "TD3", etiqueta: "Tablero HVAC", simbolo: "tablero", x: 78, y: 82, datos: ["100 A"] },
    { id: "TIE", etiqueta: "Tierra física", simbolo: "tierra", x: 14, y: 64, datos: ["Rg < 10 Ω"] },
  ],
  conexiones: [
    { desde: "ACO", hasta: "MED", etiqueta: "13.2 kV", tipo: "electrica" },
    { desde: "MED", hasta: "TR", etiqueta: null, tipo: "electrica" },
    { desde: "TR", hasta: "IG", etiqueta: "4/0 AWG", tipo: "electrica" },
    { desde: "GE", hasta: "IG", etiqueta: "respaldo", tipo: "electrica" },
    { desde: "IG", hasta: "TG", etiqueta: "250 A", tipo: "electrica" },
    { desde: "TG", hasta: "TD1", etiqueta: "1/0 AWG", tipo: "electrica" },
    { desde: "TG", hasta: "TD2", etiqueta: "6 AWG", tipo: "electrica" },
    { desde: "TG", hasta: "TD3", etiqueta: "2 AWG", tipo: "electrica" },
    { desde: "TG", hasta: "TIE", etiqueta: "2/0 AWG", tipo: "electrica" },
  ],
};

const HIDRAULICO: Diagrama = {
  tipo: "hidraulico",
  titulo: "Isométrico hidráulico — red de agua potable",
  descripcion:
    "Alimentación desde cisterna existente con equipo hidroneumático hacia los puntos de consumo.",
  escala: "S/E",
  notas: [
    "Tubería en PPR con uniones termofusionadas, presión de trabajo 10 bar.",
    "Prueba hidrostática a 1.5 veces la presión de trabajo durante 2 horas.",
    "Válvulas de seccionamiento en cada derivación para mantenimiento sin paro total.",
  ],
  nodos: [
    { id: "CIS", etiqueta: "Cisterna existente", simbolo: "cisterna", x: 10, y: 50, datos: ["30 m³"] },
    { id: "BOM", etiqueta: "Equipo hidroneumático", simbolo: "bomba", x: 30, y: 50, datos: ["3 L/s", "35 m.c.a."] },
    { id: "VCH", etiqueta: "Válvula check", simbolo: "valvula-check", x: 45, y: 50, datos: ["Ø 50 mm"] },
    { id: "MED", etiqueta: "Medidor", simbolo: "medidor-flujo", x: 58, y: 50, datos: ["Ø 50 mm"] },
    { id: "V1", etiqueta: "Válvula servicios", simbolo: "valvula", x: 76, y: 26, datos: ["Ø 32 mm"] },
    { id: "V2", etiqueta: "Válvula producción", simbolo: "valvula", x: 76, y: 50, datos: ["Ø 40 mm"] },
    { id: "V3", etiqueta: "Válvula HVAC", simbolo: "valvula", x: 76, y: 74, datos: ["Ø 25 mm"] },
    { id: "S1", etiqueta: "Servicios sanitarios", simbolo: "instrumento", x: 92, y: 26, datos: ["0.8 L/s"] },
    { id: "S2", etiqueta: "Área de producción", simbolo: "instrumento", x: 92, y: 50, datos: ["1.5 L/s"] },
    { id: "S3", etiqueta: "Reposición HVAC", simbolo: "instrumento", x: 92, y: 74, datos: ["0.4 L/s"] },
  ],
  conexiones: [
    { desde: "CIS", hasta: "BOM", etiqueta: "Ø 63 mm", tipo: "tuberia" },
    { desde: "BOM", hasta: "VCH", etiqueta: null, tipo: "tuberia" },
    { desde: "VCH", hasta: "MED", etiqueta: null, tipo: "tuberia" },
    { desde: "MED", hasta: "V1", etiqueta: "Ø 32", tipo: "tuberia" },
    { desde: "MED", hasta: "V2", etiqueta: "Ø 40", tipo: "tuberia" },
    { desde: "MED", hasta: "V3", etiqueta: "Ø 25", tipo: "tuberia" },
    { desde: "V1", hasta: "S1", etiqueta: null, tipo: "tuberia" },
    { desde: "V2", hasta: "S2", etiqueta: null, tipo: "tuberia" },
    { desde: "V3", hasta: "S3", etiqueta: null, tipo: "tuberia" },
  ],
};

const HVAC_DEMO: Diagrama = {
  tipo: "hvac",
  titulo: "Diagrama de climatización — cuarto de máquinas",
  descripcion:
    "Dos unidades condensadoras enfriando el área de producción mediante evaporadoras y distribución por ductos.",
  escala: null,
  notas: [
    "Refrigerante por definir; especificar antes de la orden de compra.",
    "Tubería de cobre tipo L aislada con elastómero de 19 mm.",
    "Ventilación conforme a ASHRAE 62.1 para el cuarto de máquinas.",
  ],
  nodos: [
    { id: "CD1", etiqueta: "Condensadora 1", simbolo: "condensadora", x: 14, y: 30, datos: ["15 TR"] },
    { id: "CD2", etiqueta: "Condensadora 2", simbolo: "condensadora", x: 14, y: 70, datos: ["15 TR"] },
    { id: "EV1", etiqueta: "Evaporadora 1", simbolo: "evaporadora", x: 42, y: 30, datos: ["15 TR"] },
    { id: "EV2", etiqueta: "Evaporadora 2", simbolo: "evaporadora", x: 42, y: 70, datos: ["15 TR"] },
    { id: "UMA", etiqueta: "Manejadora", simbolo: "uma", x: 66, y: 50, datos: ["12 000 CFM"] },
    { id: "DM", etiqueta: "Damper regulación", simbolo: "damper", x: 84, y: 30, datos: ["Motorizado"] },
    { id: "DIF", etiqueta: "Difusores producción", simbolo: "difusor", x: 84, y: 70, datos: ["8 unidades"] },
  ],
  conexiones: [
    { desde: "CD1", hasta: "EV1", etiqueta: "Cu tipo L", tipo: "tuberia" },
    { desde: "CD2", hasta: "EV2", etiqueta: "Cu tipo L", tipo: "tuberia" },
    { desde: "EV1", hasta: "UMA", etiqueta: null, tipo: "ducto" },
    { desde: "EV2", hasta: "UMA", etiqueta: null, tipo: "ducto" },
    { desde: "UMA", hasta: "DM", etiqueta: "Ø 600 mm", tipo: "ducto" },
    { desde: "UMA", hasta: "DIF", etiqueta: "Ø 500 mm", tipo: "ducto" },
  ],
};

/** Diagramas de demostración por disciplina; el resto reutiliza los eléctricos. */
export const DIAGRAMAS_DEMO: Partial<Record<DisciplinaProyecto, Diagrama[]>> = {
  electrica: [UNIFILAR],
  hidraulica: [HIDRAULICO, UNIFILAR],
  hvac: [HVAC_DEMO, HIDRAULICO],
  fluidos: [HIDRAULICO],
  mecanica: [HVAC_DEMO],
  arquitectura: [UNIFILAR],
  "civil-estructural": [UNIFILAR],
  mecatronica: [UNIFILAR],
  electronica: [UNIFILAR],
  neumatica: [HIDRAULICO],
  aeronautica: [HIDRAULICO],
  naval: [HIDRAULICO],
  ferroviaria: [UNIFILAR],
};
