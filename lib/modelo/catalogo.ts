/**
 * Catálogo cerrado de motores que la aplicación ofrece.
 *
 * Hasta ahora el selector mostraba todo lo que cada API key servía, y eso son
 * más de ciento veinte identificadores en OpenAI: la mayoría inservibles para
 * este trabajo. Esta lista fija cuáles se ofrecen, con su nombre en claro.
 *
 * Cada entrada de aquí se comprobó invocándola de verdad contra su API antes de
 * escribirla; ninguna se dedujo de la documentación. Y `/api/modelos` la cruza
 * además con el catálogo vivo del proveedor, así que si una cuenta pierde el
 * acceso a un modelo, ese modelo desaparece del selector en lugar de fallar al
 * pulsarlo.
 *
 * El motor por defecto es GPT-5.6 Luna con razonamiento medio. Cambiarlo cuesta
 * dinero, así que el selector lo protege con contraseña.
 */
import type { Proveedor } from "./tipos.ts";

/**
 * Nivel de razonamiento de los modelos que lo aceptan.
 *
 * Son los valores que la API de OpenAI admite de verdad para la familia 5.6 en
 * `chat/completions`; `max` existe pero solo en la API de respuestas, así que
 * no se ofrece aquí para no listar una opción que fallaría al invocarse.
 */
export type Esfuerzo = "none" | "low" | "medium" | "high" | "xhigh";

export interface OpcionMotor {
  /** Clave única de la opción: proveedor, modelo y esfuerzo. */
  id: string;
  proveedor: Proveedor;
  /** Identificador exacto que espera la API del proveedor. */
  modelo: string;
  esfuerzo?: Esfuerzo;
  /** Cómo se llama en el selector. */
  nombre: string;
  /** Para qué sirve, en una línea. */
  nota: string;
}

/** Etiqueta en español de cada nivel de razonamiento. */
export const ETIQUETA_ESFUERZO: Record<Esfuerzo, string> = {
  none: "instantáneo",
  low: "bajo",
  medium: "medio",
  high: "alto",
  xhigh: "muy alto",
};

function gpt56(
  modelo: string,
  familia: string,
  esfuerzo: Esfuerzo,
  nota: string,
): OpcionMotor {
  return {
    id: `openai:${modelo}:${esfuerzo}`,
    proveedor: "openai",
    modelo,
    esfuerzo,
    nombre: `GPT-5.6 ${familia} · ${ETIQUETA_ESFUERZO[esfuerzo]}`,
    nota,
  };
}

const ESFUERZOS_OFRECIDOS: Esfuerzo[] = ["none", "medium", "high", "xhigh"];

const NOTA_ESFUERZO: Record<Esfuerzo, string> = {
  none: "Sin razonamiento previo: la respuesta más rápida y barata.",
  low: "Razonamiento breve.",
  medium: "Equilibrio entre profundidad y coste. Buen punto de partida.",
  high: "Razona antes de responder; mejor en cálculo y normativa.",
  xhigh: "Máxima deliberación disponible por esta vía. La más lenta y cara.",
};

const FAMILIAS_56: { modelo: string; familia: string }[] = [
  { modelo: "gpt-5.6-sol", familia: "Sol" },
  { modelo: "gpt-5.6-luna", familia: "Luna" },
  { modelo: "gpt-5.6-terra", familia: "Terra" },
];

export const CATALOGO_MOTORES: OpcionMotor[] = [
  /* -------------------------------------------------------------- Gemini -- */
  {
    id: "gemini:gemini-2.5-flash",
    proveedor: "gemini",
    modelo: "gemini-2.5-flash",
    nombre: "Gemini 2.5 Flash",
    nota: "El más barato de los que sostienen el pipeline completo. Rápido y suficiente.",
  },
  {
    id: "gemini:gemini-3.5-flash",
    proveedor: "gemini",
    modelo: "gemini-3.5-flash",
    nombre: "Gemini 3.5 Flash",
    nota: "Generación nueva con razonamiento; más capaz que 2.5 a coste contenido.",
  },
  {
    id: "gemini:gemini-3.5-flash-lite",
    proveedor: "gemini",
    modelo: "gemini-3.5-flash-lite",
    nombre: "Gemini 3.5 Flash Lite",
    nota: "La variante más ligera de la 3.5, para tareas de volumen.",
  },
  {
    id: "gemini:gemini-3.1-pro-preview",
    proveedor: "gemini",
    modelo: "gemini-3.1-pro-preview",
    nombre: "Gemini 3.1 Pro",
    nota: "El de mayor capacidad de Google en esta cuenta. Más lento y más caro.",
  },

  /* --------------------------------------------------------------- OpenAI -- */
  ...FAMILIAS_56.flatMap(({ modelo, familia }) =>
    ESFUERZOS_OFRECIDOS.map((esfuerzo) =>
      gpt56(modelo, familia, esfuerzo, NOTA_ESFUERZO[esfuerzo]),
    ),
  ),
  {
    id: "openai:gpt-5.5",
    proveedor: "openai",
    modelo: "gpt-5.5",
    nombre: "GPT-5.5",
    nota: "Generación anterior de OpenAI, estable y bien conocida.",
  },

  /* --------------------------------------------------------------- Claude -- */
  {
    id: "claude:claude-fable-5",
    proveedor: "claude",
    modelo: "claude-fable-5",
    nombre: "Claude Fable 5",
    nota: "Razonamiento profundo y contexto muy amplio.",
  },
  {
    id: "claude:claude-opus-5",
    proveedor: "claude",
    modelo: "claude-opus-5",
    nombre: "Claude Opus 5",
    nota: "El más capaz de Anthropic para trabajo técnico largo.",
  },
  {
    id: "claude:claude-sonnet-5",
    proveedor: "claude",
    modelo: "claude-sonnet-5",
    nombre: "Claude Sonnet 5",
    nota: "Equilibrio entre capacidad y coste; buen motor de trabajo.",
  },
  {
    id: "claude:claude-haiku-4-5-20251001",
    proveedor: "claude",
    modelo: "claude-haiku-4-5-20251001",
    nombre: "Claude Haiku 4.5",
    nota: "El más rápido y económico de Anthropic.",
  },
];

/**
 * Opción que se usa si el usuario no ha elegido ninguna.
 *
 * GPT-5.6 Luna con razonamiento medio: piensa antes de responder sin disparar
 * la latencia, que es lo que un pipeline de diez agentes necesita. Cambiarlo
 * exige la contraseña del selector, porque cada motor cuesta distinto.
 */
export const MOTOR_POR_DEFECTO = "openai:gpt-5.6-luna:medium";

/** Identificadores de modelo que el catálogo permite, por proveedor. */
export function modelosPermitidos(proveedor: Proveedor): Set<string> {
  return new Set(
    CATALOGO_MOTORES.filter((o) => o.proveedor === proveedor).map((o) => o.modelo),
  );
}

/** Busca una opción por su clave. Devuelve null si no está en el catálogo. */
export function opcionDe(id: string): OpcionMotor | null {
  return CATALOGO_MOTORES.find((o) => o.id === id) ?? null;
}

/**
 * ¿Es válida esta combinación de modelo y esfuerzo?
 *
 * La preferencia llega firmada, pero el catálogo puede haber cambiado desde que
 * se firmó: se comprueba contra la lista actual antes de usarla.
 */
export function esCombinacionValida(
  proveedor: Proveedor,
  modelo: string,
  esfuerzo?: string,
): boolean {
  return CATALOGO_MOTORES.some(
    (o) =>
      o.proveedor === proveedor &&
      o.modelo === modelo &&
      (o.esfuerzo ?? null) === (esfuerzo ?? null),
  );
}
