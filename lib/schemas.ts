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

/* ------------------------------------------------- Diagramas técnicos -- */

export const simboloSchema = z.string().min(1);

export const nodoDiagramaSchema = z.object({
  id: z.string(),
  etiqueta: z.string(),
  simbolo: simboloSchema,
  x: z.number(),
  y: z.number(),
  datos: z.array(z.string()),
  ancho: z.number().nullable().optional(),
  alto: z.number().nullable().optional(),
});

export const conexionDiagramaSchema = z.object({
  desde: z.string(),
  hasta: z.string(),
  etiqueta: z.string().nullable(),
  tipo: z.enum(["electrica", "tuberia", "aire", "ducto", "senal", "mecanica"]),
});

export const salidaDiagramaSchema = z.object({
  tipo: z.string(),
  titulo: z.string(),
  descripcion: z.string(),
  escala: z.string().nullable(),
  nodos: z.array(nodoDiagramaSchema).min(2),
  conexiones: z.array(conexionDiagramaSchema),
  notas: z.array(z.string()),
});

/* ------------------------------------------------- Memoria del proyecto -- */

export const calculoMemoriaSchema = z.object({
  concepto: z.string(),
  metodo: z.string(),
  datos: z.string(),
  resultado: z.string(),
});

export const sistemaMemoriaSchema = z.object({
  nombre: z.string(),
  descripcion: z.string(),
  criterios: z.array(z.string()),
  calculos: z.array(calculoMemoriaSchema),
  especificaciones: z.array(z.string()),
});

export const salidaMemoriaSchema = z.object({
  objeto: z.string(),
  antecedentes: z.string(),
  normativa: z.array(z.string()),
  sistemas: z.array(sistemaMemoriaSchema).min(1),
  conclusiones: z.string(),
});

/* ------------------------------------------------ Definición de proyecto -- */

export const definicionProyectoSchema = z.object({
  nombre: z.string().min(3, "Ponle un nombre al proyecto"),
  descripcion: z.string().min(20, "Describe el proyecto con al menos 20 caracteres"),
  disciplina: z.string().min(1),
  envergadura: z.enum(["pequena", "mediana", "grande"]),
  ubicacion: z.string().optional(),
});
