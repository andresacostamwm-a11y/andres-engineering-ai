/**
 * Capa de acceso al modelo, independiente del proveedor.
 *
 * La aplicación no sabe con quién habla: pide "ejecuta este agente con este
 * esquema" y aquí se elige proveedor, se valida la respuesta con Zod y, si la
 * cuenta se queda sin cuota, se cambia automáticamente al siguiente proveedor
 * disponible. Solo cuando no queda ninguno se propaga el error, y los
 * orquestadores lo convierten en modo demostración.
 *
 * Orden de preferencia: el declarado en PROVEEDOR_IA, luego Claude, luego
 * Gemini. Gemini está el último por calidad esperada, no por disponibilidad:
 * su capa gratuita lo hace el respaldo natural cuando Claude se agota.
 */
import { clienteClaude } from "./claude.ts";
import { clienteGemini } from "./gemini.ts";
import { clienteOpenai } from "./openai.ts";
import { motorPreferido } from "./preferencia.ts";
import {
  ErrorDeCuota,
  esErrorDeCuota,
  type ClienteModelo,
  type OpcionesAgente,
  type Proveedor,
} from "./tipos.ts";

export { ErrorDeCuota, esErrorDeCuota };
export type { Proveedor };
export { COOKIE_MOTOR, conMotor, preferenciaDeCookie } from "./preferencia.ts";

const CLIENTES: Record<Proveedor, ClienteModelo> = {
  claude: clienteClaude,
  gemini: clienteGemini,
  openai: clienteOpenai,
};

const NOMBRE_PROVEEDOR: Record<Proveedor, string> = {
  claude: "Claude",
  gemini: "Gemini",
  openai: "GPT",
};

/**
 * Proveedores utilizables ahora mismo, en orden de preferencia: primero lo que
 * eligió el usuario en el selector, luego PROVEEDOR_IA del despliegue, y el
 * resto como respaldo ante cuota agotada.
 */
export function proveedoresDisponibles(): ClienteModelo[] {
  const orden: Proveedor[] = ["claude", "gemini", "openai"];

  const alFrente = (p: Proveedor) => {
    const i = orden.indexOf(p);
    if (i > 0) orden.unshift(...orden.splice(i, 1));
  };

  const entorno = process.env.PROVEEDOR_IA as Proveedor | undefined;
  if (entorno && orden.includes(entorno)) alFrente(entorno);

  const elegido = motorPreferido();
  if (elegido) alFrente(elegido.proveedor);

  return orden.map((p) => CLIENTES[p]).filter((c) => c.disponible);
}

/** Hay al menos un proveedor con credenciales configuradas. */
export function hayApiKey(): boolean {
  return proveedoresDisponibles().length > 0;
}

/** Nombre legible del motor activo, para mostrarlo en la interfaz. */
export function motorActivo(): string | null {
  const [cliente] = proveedoresDisponibles();
  if (!cliente) return null;
  const elegido = motorPreferido();
  const modelo =
    elegido && elegido.proveedor === cliente.proveedor && elegido.modelo
      ? elegido.modelo
      : cliente.modeloPorDefecto;
  return `${NOMBRE_PROVEEDOR[cliente.proveedor]} (${modelo})`;
}

/**
 * Ejecuta un agente y devuelve su salida ya validada.
 *
 * Dos niveles de recuperación:
 *  1. Si la estructura no valida, se reintenta una vez con el mismo proveedor
 *     pasándole el error concreto para que se corrija.
 *  2. Si el proveedor se queda sin cuota, se pasa al siguiente disponible.
 */
export async function ejecutarAgente<T>(opciones: OpcionesAgente<T>): Promise<T> {
  const { validador, ...peticion } = opciones;
  const clientes = proveedoresDisponibles();

  if (clientes.length === 0) {
    throw new ErrorDeCuota("No hay ningún proveedor de IA configurado.", "claude");
  }

  let ultimoErrorDeCuota: unknown = null;
  const elegido = motorPreferido();

  for (const cliente of clientes) {
    try {
      // El modelo exacto elegido en el selector solo aplica a su proveedor;
      // los proveedores de respaldo usan su modelo por defecto.
      const modelo =
        peticion.modelo ??
        (elegido && elegido.proveedor === cliente.proveedor
          ? elegido.modelo
          : undefined);

      let respuesta = await cliente.invocarHerramienta({ ...peticion, modelo });

      for (let intento = 0; intento < 2; intento++) {
        const resultado = validador.safeParse(respuesta.argumentos);
        if (resultado.success) return resultado.data;

        if (intento === 1) break;
        respuesta = await respuesta.reintentar(
          resultado.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        );
      }

      throw new Error(
        `El agente ${peticion.herramienta} devolvió una estructura inválida en dos intentos con ${cliente.proveedor}.`,
      );
    } catch (error) {
      if (esErrorDeCuota(error)) {
        ultimoErrorDeCuota = error;
        continue; // se prueba con el siguiente proveedor
      }
      throw error;
    }
  }

  throw ultimoErrorDeCuota instanceof Error
    ? ultimoErrorDeCuota
    : new ErrorDeCuota("Todos los proveedores agotaron su cuota.", "claude");
}

/** Texto libre en streaming, con el mismo cambio de proveedor ante cuota. */
export async function* transmitirTexto(params: {
  sistema: string;
  prompt: string;
  maxTokens?: number;
}): AsyncGenerator<string> {
  const clientes = proveedoresDisponibles();
  let ultimoError: unknown = null;

  for (const cliente of clientes) {
    try {
      // Se consume el primer fragmento aquí para que un fallo de cuota aparezca
      // antes de haber emitido nada y se pueda cambiar de proveedor limpiamente.
      const flujo = cliente.transmitirTexto(params);
      const primero = await flujo.next();
      if (!primero.done) yield primero.value;
      for await (const trozo of flujo) yield trozo;
      return;
    } catch (error) {
      if (esErrorDeCuota(error)) {
        ultimoError = error;
        continue;
      }
      throw error;
    }
  }

  throw ultimoError instanceof Error
    ? ultimoError
    : new ErrorDeCuota("Todos los proveedores agotaron su cuota.", "claude");
}
