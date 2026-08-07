/**
 * Esquemas Zod. Cumplen dos funciones:
 *  1. Validar en la frontera del sistema todo lo que devuelve el modelo.
 *  2. Generar el JSON Schema que se le pasa a Claude como definición de herramienta,
 *     de modo que el modelo esté obligado a responder con la forma correcta.
 */
import { z } from "zod";

export const disciplinaSchema = z.enum([
  "arquitectura",
  "estructural",
  "electrica",
  "hidrosanitaria",
  "hvac",
  "proteccion-incendio",
  "obra-civil",
  "general",
]);

export const nivelRiesgoSchema = z.enum(["critico", "alto", "medio", "bajo"]);

export const requerimientoSchema = z.object({
  id: z.string(),
  descripcion: z.string(),
  disciplina: disciplinaSchema,
  evidencia: z.string(),
  pagina: z.number().nullable(),
  critico: z.boolean(),
});

export const partidaSchema = z.object({
  clave: z.string(),
  concepto: z.string(),
  unidad: z.string(),
  cantidad: z.number(),
  precioUnitario: z.number(),
  importe: z.number(),
  disciplina: disciplinaSchema,
  matriz: z.object({
    materiales: z.number(),
    manoObra: z.number(),
    equipo: z.number(),
    indirectos: z.number(),
  }),
  supuesto: z.string().nullable(),
});

export const hallazgoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  norma: z.string(),
  articulo: z.string().nullable(),
  riesgo: nivelRiesgoSchema,
  descripcion: z.string(),
  recomendacion: z.string(),
  disciplina: disciplinaSchema,
});

export const resumenEjecutivoSchema = z.object({
  titulo: z.string(),
  tipoProyecto: z.string(),
  ubicacion: z.string().nullable(),
  sintesis: z.string(),
  totalEstimado: z.number(),
  moneda: z.literal("MXN"),
  riesgoGlobal: nivelRiesgoSchema,
  recomendaciones: z.array(z.string()),
  supuestos: z.array(z.string()),
});

/** Envoltorios que el modelo debe devolver como argumento de herramienta. */
export const salidaExtractorSchema = z.object({
  requerimientos: z.array(requerimientoSchema),
});
export const salidaCostosSchema = z.object({ partidas: z.array(partidaSchema) });
export const salidaNormativoSchema = z.object({
  hallazgos: z.array(hallazgoSchema),
});
export const salidaSintesisSchema = resumenEjecutivoSchema;

export const credencialesSchema = z.object({
  usuario: z.string().min(1, "Escribe tu usuario"),
  password: z.string().min(1, "Escribe tu contraseña"),
});
