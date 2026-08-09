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

/** Códigos ISO 4217 que el sistema sabe manejar. Debe seguir a `Moneda` en moneda/paises.ts. */
export const monedaSchema = z.enum([
  "MXN", "USD", "EUR", "COP", "CLP", "PEN", "ARS", "BRL",
  "GBP", "CAD", "DOP", "GTQ", "CRC", "PAB", "UYU", "BOB",
  "PYG", "HNL", "NIO", "CUP", "VES",
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
  moneda: monedaSchema,
  riesgoGlobal: nivelRiesgoSchema,
  recomendaciones: z.array(z.string()),
  supuestos: z.array(z.string()),
});

/** Envoltorios que el modelo debe devolver como argumento de herramienta. */
export const salidaExtractorSchema = z.object({
  requerimientos: z.array(requerimientoSchema),
});
export const salidaCostosSchema = z.object({
  partidas: z.array(partidaSchema),
  /** Plaza de referencia de los precios. Se exige para que el presupuesto sea auditable. */
  mercado: z.string(),
  /** Salvedades sobre vigencia u origen de los precios. */
  notaPrecios: z.string(),
});
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

/* ------------------------------------------------- Programación de obra -- */

export const actividadObraSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  frente: z.string().min(1),
  duracionDias: z.number(),
  predecesoras: z.array(z.string()),
  hito: z.boolean(),
});

export const salidaProgramacionSchema = z.object({
  actividades: z.array(actividadObraSchema).min(1),
  supuestos: z.array(z.string()),
});

/* ------------------------------------------------- Riesgos y viabilidad -- */

export const riesgoProyectoSchema = z.object({
  id: z.string().min(1),
  titulo: z.string().min(1),
  categoria: z.string().min(1),
  probabilidad: z.number(),
  impacto: z.number(),
  descripcion: z.string(),
  mitigacion: z.string(),
  responsable: z.string(),
});

export const variableSensibilidadSchema = z.object({
  concepto: z.string().min(1),
  variacionPct: z.number(),
  pesoPct: z.number(),
  justificacion: z.string(),
});

export const salidaRiesgosSchema = z.object({
  riesgos: z.array(riesgoProyectoSchema).min(1),
  variables: z.array(variableSensibilidadSchema),
  veredicto: z.string(),
  condiciones: z.array(z.string()),
});

/* ---------------------------------------------- Verificación adversarial -- */

export const ambitoVerificacionSchema = z.enum([
  "programa",
  "extractor",
  "costos",
  "normativo",
  "proyectista",
  "memoria",
  "sintesis",
  "programacion",
  "riesgos",
  "verificador",
]);

export const hallazgoVerificacionSchema = z.object({
  id: z.string().min(1),
  ambito: ambitoVerificacionSchema,
  gravedad: nivelRiesgoSchema,
  titulo: z.string().min(1),
  evidencia: z.string(),
  correccion: z.string(),
});

export const salidaVerificadorSchema = z.object({
  /** Puede venir vacía: no encontrar defectos es una respuesta legítima. */
  hallazgos: z.array(hallazgoVerificacionSchema),
  comprobado: z.array(z.string()),
});

/* ------------------------------------------------ Definición de proyecto -- */

export const definicionProyectoSchema = z.object({
  nombre: z.string().min(3, "Ponle un nombre al proyecto"),
  descripcion: z.string().min(20, "Describe el proyecto con al menos 20 caracteres"),
  disciplina: z.string().min(1),
  /** Todas las disciplinas elegidas. Si falta, se asume solo la principal. */
  disciplinas: z.array(z.string().min(1)).min(1).max(13).optional(),
  /** Láminas pedidas. Si falta, se dibujan las de las disciplinas elegidas. */
  diagramas: z.array(z.string().min(1)).max(10).optional(),
  envergadura: z.enum(["pequena", "mediana", "grande"]),
  ubicacion: z.string().optional(),
});
