/** Fragmentos de JSON Schema compartidos por los agentes. */

export const DISCIPLINAS_JSON = {
  type: "string",
  enum: [
    "arquitectura",
    "estructural",
    "electrica",
    "hidrosanitaria",
    "hvac",
    "proteccion-incendio",
    "obra-civil",
    "general",
  ],
  description: "Disciplina de ingeniería a la que pertenece.",
} as const;

export const RIESGO_JSON = {
  type: "string",
  enum: ["critico", "alto", "medio", "bajo"],
  description: "Nivel de riesgo.",
} as const;

/**
 * Recorta el documento para que quepa holgadamente en la ventana de contexto
 * conservando principio y final, que es donde suelen estar alcance y anexos.
 */
export function recortarDocumento(texto: string, limite = 120_000): string {
  if (texto.length <= limite) return texto;
  const mitad = Math.floor(limite / 2);
  return `${texto.slice(0, mitad)}

[... ${texto.length - limite} caracteres omitidos por longitud ...]

${texto.slice(-mitad)}`;
}
