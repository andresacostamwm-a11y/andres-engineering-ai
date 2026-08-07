/**
 * Conversión de JSON Schema al dialecto que acepta Gemini.
 *
 * Gemini valida los parámetros de función contra un subconjunto de OpenAPI 3.0,
 * no contra JSON Schema. Las diferencias que importan en esta aplicación:
 *
 *  - `type` no admite arrays: `["string", "null"]` se expresa como
 *    `{ type: "string", nullable: true }`.
 *  - No reconoce `additionalProperties`, `$schema`, `const` ni `oneOf`.
 *  - Los enteros se declaran como `integer`, no como `number` con formato.
 *
 * Mantener los esquemas escritos una sola vez, en JSON Schema, y traducirlos
 * aquí evita duplicar la definición de cada agente por proveedor.
 */

type Nodo = Record<string, unknown>;

const CLAVES_IGNORADAS = new Set([
  "$schema",
  "additionalProperties",
  "const",
  "examples",
  "default",
  "oneOf",
  "anyOf",
  "allOf",
  "not",
  "patternProperties",
]);

export function aEsquemaGemini(esquema: Record<string, unknown>): Nodo {
  return convertir(esquema) as Nodo;
}

function convertir(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(convertir);
  if (valor === null || typeof valor !== "object") return valor;

  const entrada = valor as Nodo;
  const salida: Nodo = {};

  for (const [clave, contenido] of Object.entries(entrada)) {
    if (CLAVES_IGNORADAS.has(clave)) continue;

    if (clave === "type") {
      // `["string", "null"]` → type: "string" + nullable: true
      if (Array.isArray(contenido)) {
        const tipos = contenido.filter((t) => t !== "null");
        salida.type = normalizarTipo(String(tipos[0] ?? "string"));
        if (contenido.length !== tipos.length) salida.nullable = true;
      } else {
        salida.type = normalizarTipo(String(contenido));
      }
      continue;
    }

    salida[clave] = convertir(contenido);
  }

  return salida;
}

/** Gemini distingue `integer` de `number`; el resto de tipos coincide. */
function normalizarTipo(tipo: string): string {
  return tipo === "int" ? "integer" : tipo;
}
