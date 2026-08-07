/**
 * Modelo de datos de un diagrama técnico.
 *
 * El agente no dibuja: devuelve la topología (qué elementos hay, dónde y cómo
 * se conectan) y el renderizador de la aplicación la convierte en SVG con
 * simbología normalizada. Esa separación es lo que permite que el resultado sea
 * un plano legible y no un garabato: la posición la propone el modelo sobre una
 * rejilla lógica, pero el trazo, los símbolos y las cotas los pone el código.
 */
import type { TipoDiagrama } from "../disciplinas";

/** Símbolos disponibles en la biblioteca, agrupados por familia. */
export type Simbolo =
  // Eléctricos
  | "acometida"
  | "transformador"
  | "interruptor"
  | "tablero"
  | "motor-electrico"
  | "generador"
  | "luminario"
  | "contacto"
  | "tierra"
  | "medidor"
  | "ups"
  | "banco-capacitores"
  // Hidráulicos y de fluidos
  | "bomba"
  | "valvula"
  | "valvula-check"
  | "valvula-control"
  | "tanque"
  | "cisterna"
  | "filtro"
  | "intercambiador"
  | "medidor-flujo"
  | "hidrante"
  | "rociador"
  // Neumáticos
  | "compresor"
  | "cilindro"
  | "valvula-5-2"
  | "unidad-mantenimiento"
  | "secador"
  | "acumulador"
  // Mecánicos
  | "motor"
  | "reductor"
  | "banda"
  | "acoplamiento"
  | "rodamiento"
  | "engrane"
  // Electrónicos
  | "resistencia"
  | "capacitor"
  | "inductor"
  | "diodo"
  | "transistor"
  | "circuito-integrado"
  | "microcontrolador"
  | "sensor"
  | "fuente"
  // HVAC
  | "uma"
  | "condensadora"
  | "evaporadora"
  | "ventilador"
  | "difusor"
  | "damper"
  | "serpentin"
  // Control y genéricos
  | "plc"
  | "instrumento"
  | "actuador"
  | "bloque"
  | "nodo"
  | "espacio";

/** Un elemento del diagrama. */
export interface NodoDiagrama {
  id: string;
  etiqueta: string;
  simbolo: Simbolo;
  /** Posición en rejilla lógica de 0 a 100 en ambos ejes. */
  x: number;
  y: number;
  /** Datos técnicos que se imprimen bajo el símbolo (potencia, caudal, calibre…). */
  datos: string[];
  /** Para símbolos de área (espacios arquitectónicos), dimensiones en la rejilla. */
  ancho?: number;
  alto?: number;
}

export type TipoConexion =
  | "electrica"
  | "tuberia"
  | "aire"
  | "ducto"
  | "senal"
  | "mecanica";

/** Una conexión entre dos elementos. */
export interface ConexionDiagrama {
  desde: string;
  hasta: string;
  etiqueta: string | null;
  tipo: TipoConexion;
}

/** Diagrama completo, listo para renderizar. */
export interface Diagrama {
  tipo: TipoDiagrama;
  titulo: string;
  descripcion: string;
  nodos: NodoDiagrama[];
  conexiones: ConexionDiagrama[];
  /** Notas de plano, se imprimen en el cajetín. */
  notas: string[];
  /** Escala o referencia declarada, si aplica. */
  escala: string | null;
}

export const ETIQUETA_CONEXION: Record<TipoConexion, string> = {
  electrica: "Circuito eléctrico",
  tuberia: "Tubería",
  aire: "Aire comprimido",
  ducto: "Ducto",
  senal: "Señal de control",
  mecanica: "Transmisión mecánica",
};
