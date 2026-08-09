/**
 * Catálogo de los agentes del sistema, para la portada.
 *
 * Es la única fuente de la que sale la sección «Diez agentes» y sus fichas
 * desplegables. Vive en `lib` y no dentro del componente para que el número y
 * los nombres no se puedan desincronizar del pipeline: cuando se añade un
 * agente, se añade aquí y la portada lo refleja sola.
 *
 * Cada agente declara dos escenas —lo que recibe y lo que devuelve— que el
 * ilustrador dibuja en SVG. Se eligió vector y no fotografía porque estas
 * ilustraciones muestran estructuras de datos, no objetos: una tabla de precios
 * o una matriz de riesgo se leen nítidas a cualquier tamaño y pesan nada.
 */
import type { AgenteProyecto } from "./tipos-proyecto.ts";

/** Escenas que el ilustrador sabe dibujar. */
export type Escena =
  | "brief"
  | "alcance"
  | "documento"
  | "requisitos"
  | "tabla"
  | "norma"
  | "hallazgos"
  | "plano"
  | "calculo"
  | "resumen"
  | "gantt"
  | "matriz"
  | "checklist";

export interface FichaAgente {
  id: AgenteProyecto;
  nombre: string;
  /** Una línea: qué hace, para la tarjeta cerrada. */
  rol: string;
  etapa: string;
  /** Párrafo de la ficha abierta: cómo lo hace y por qué así. */
  detalle: string;
  /** Qué recibe y qué devuelve, en una línea cada uno. */
  entrada: { escena: Escena; pie: string };
  salida: { escena: Escena; pie: string };
  /** Garantía técnica que distingue a este agente. */
  garantia: string;
}

export const CATALOGO_AGENTES: FichaAgente[] = [
  {
    id: "programa",
    nombre: "Programa",
    rol: "Convierte tu descripción en un alcance de obra numerable",
    etapa: "Etapa 1",
    detalle:
      "Recibe lo que el cliente sabe decir —«una nave de 800 m² con oficinas»— y lo convierte en el alcance de obra que un despacho firmaría: qué se construye, con qué sistemas, bajo qué premisas. Todo lo que asume queda escrito como premisa, no enterrado en el texto, porque una premisa declarada se puede discutir y una implícita se paga en obra.",
    entrada: { escena: "brief", pie: "La descripción del cliente, en lenguaje corriente" },
    salida: { escena: "alcance", pie: "Alcance de obra con sus premisas declaradas" },
    garantia: "Ninguna suposición queda sin declarar.",
  },
  {
    id: "extractor",
    nombre: "Extractor",
    rol: "Aísla los requerimientos técnicos con su evidencia",
    etapa: "Etapa 2",
    detalle:
      "Lee el pliego o el alcance y separa lo que obliga de lo que describe. Cada requerimiento sale con la cita textual que lo respalda y la página donde está, para que quien revise pueda ir a comprobarlo en treinta segundos en lugar de releer doscientas páginas. Los críticos van marcados aparte.",
    entrada: { escena: "documento", pie: "El pliego o el alcance completo" },
    salida: { escena: "requisitos", pie: "Requerimientos con cita textual y página" },
    garantia: "Cada requerimiento apunta a la línea que lo obliga.",
  },
  {
    id: "costos",
    nombre: "Costos",
    rol: "Catálogo de conceptos con matrices de precio unitario",
    etapa: "Etapa 3 · paralelo",
    detalle:
      "Convierte cada requerimiento en partidas cuantificadas con su matriz de precio unitario desglosada en materiales, mano de obra, equipo e indirectos. El modelo estima los precios; el importe, el subtotal y el total los multiplica el servidor. Declara el mercado y la fecha a los que corresponden las cifras, porque un precio sin plaza ni fecha no es un precio.",
    entrada: { escena: "requisitos", pie: "Requerimientos ya extraídos" },
    salida: { escena: "tabla", pie: "Catálogo con matriz de precio unitario" },
    garantia: "El modelo estima; la aritmética la hace el código.",
  },
  {
    id: "normativo",
    nombre: "Normativo",
    rol: "Contrasta contra NOM, STPS y reglamentos aplicables",
    etapa: "Etapa 3 · paralelo",
    detalle:
      "Compara el proyecto con la normativa que le aplica y reporta lo que incumple, pero sobre todo lo que falta: la partida que la ley obliga y nadie presupuestó. Ese hallazgo por ausencia es el que suele decidir si una licitación era negocio, y es el que ningún buscador de texto encuentra.",
    entrada: { escena: "norma", pie: "Normativa aplicable a la disciplina" },
    salida: { escena: "hallazgos", pie: "Hallazgos con norma, artículo y riesgo" },
    garantia: "Detecta también lo que falta, no solo lo que está mal.",
  },
  {
    id: "memoria",
    nombre: "Memoria",
    rol: "Memoria descriptiva y de cálculo por instalación",
    etapa: "Etapa 3 · paralelo",
    detalle:
      "Redacta la memoria que se entrega junto a los planos: un bloque por instalación, con criterios de diseño, cálculos justificativos —fórmula, datos con unidades y resultado con selección comercial— y las especificaciones que se derivan. Es lo que convierte un anteproyecto dibujado en un anteproyecto defendible.",
    entrada: { escena: "alcance", pie: "Alcance y requerimientos del proyecto" },
    salida: { escena: "calculo", pie: "Memoria de cálculo por sistema" },
    garantia: "Nada de «se calculará más adelante».",
  },
  {
    id: "proyectista",
    nombre: "Proyectista",
    rol: "Dibuja el paquete completo de planos de las instalaciones",
    etapa: "Etapa 3 · paralelo",
    detalle:
      "No dibuja: devuelve qué elementos hay, dónde van y cómo se conectan. El plano lo traza el código con sesenta y tres símbolos normalizados, ruteo ortogonal y cajetín. Por eso sale una lámina y no un boceto, y por eso se puede exportar a DXF y a IFC en lugar de a una imagen.",
    entrada: { escena: "alcance", pie: "Topología de la instalación a representar" },
    salida: { escena: "plano", pie: "Lámina con simbología normalizada y cajetín" },
    garantia: "El trazo lo hace el código, no el modelo.",
  },
  {
    id: "sintesis",
    nombre: "Síntesis",
    rol: "Resumen ejecutivo y consolidación del riesgo",
    etapa: "Etapa 4 · paralelo",
    detalle:
      "Reúne lo que produjeron los demás y lo reduce a la página que lee quien decide: qué es el proyecto, cuánto cuesta, qué riesgo tiene y qué hay que hacer al respecto. El riesgo global no lo declara el modelo: se consolida en código a partir de los hallazgos, para que la misma evidencia dé siempre el mismo nivel.",
    entrada: { escena: "tabla", pie: "Presupuesto, hallazgos y requerimientos" },
    salida: { escena: "resumen", pie: "Resumen ejecutivo con riesgo consolidado" },
    garantia: "El riesgo global se calcula, no se opina.",
  },
  {
    id: "programacion",
    nombre: "Programación",
    rol: "Cronograma de obra con ruta crítica calculada",
    etapa: "Etapa 4 · paralelo",
    detalle:
      "Propone las actividades de obra, sus duraciones y su encadenado a partir del volumen del catálogo. Las fechas, las holguras y la ruta crítica las calcula el motor CPM del sistema: paso adelante, paso atrás y holgura total. Si el encadenado propuesto trae un ciclo o una precedencia inexistente, se corrige y se avisa; el cronograma no se cae por un enlace mal puesto.",
    entrada: { escena: "tabla", pie: "Volumen de obra del catálogo de conceptos" },
    salida: { escena: "gantt", pie: "Gantt con ruta crítica y holguras" },
    garantia: "La ruta crítica sale de código con pruebas, no del modelo.",
  },
  {
    id: "riesgos",
    nombre: "Riesgos",
    rol: "Matriz de riesgo y sensibilidad del presupuesto",
    etapa: "Etapa 4 · paralelo",
    detalle:
      "Identifica los riesgos propios de este proyecto —anclados a un dato del alcance, del presupuesto o de los hallazgos— y los sitúa en la matriz probabilidad × impacto. Después mueve el presupuesto real con las variables que declara: escenario base, optimista y pesimista, y la contingencia que se desprende. Los escenarios no son cifras redondas: son el total del proyecto movido por causas escritas.",
    entrada: { escena: "hallazgos", pie: "Presupuesto y hallazgos normativos" },
    salida: { escena: "matriz", pie: "Matriz 5×5 y escenarios económicos" },
    garantia: "Sin dato que lo ancle, el riesgo no se reporta.",
  },
  {
    id: "verificador",
    nombre: "Verificador",
    rol: "Revisa el paquete completo antes de entregarlo",
    etapa: "Etapa 5",
    detalle:
      "Llega con contexto fresco a un paquete terminado y su encargo es encontrar el error, no confirmar el acierto. Cruza la aritmética de cada partida, la cobertura de láminas y disciplinas, y la coherencia entre presupuesto, memoria, planos y cronograma. Distingue lo que midió de lo que juzgó, y emite un veredicto con una confianza de cero a cien. Si dice que requiere corrección, es que la requiere.",
    entrada: { escena: "checklist", pie: "El paquete completo de los nueve agentes" },
    salida: { escena: "resumen", pie: "Veredicto, confianza y hallazgos con evidencia" },
    garantia: "Lo medido y lo opinado nunca se mezclan en el informe.",
  },
];
