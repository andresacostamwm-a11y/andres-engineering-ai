/**
 * Datos de demostración.
 *
 * Si el despliegue no tiene ANTHROPIC_API_KEY configurada, la aplicación sigue
 * siendo íntegramente navegable con este caso real anonimizado. Así el evaluador
 * puede recorrer el flujo completo aunque no haya presupuesto de API disponible.
 * Cada respuesta queda marcada con `modoDemo: true` en la interfaz.
 */
import type { Hallazgo, Partida, Requerimiento, ResumenEjecutivo } from "./types.ts";

export const DOCUMENTO_DEMO = `ALCANCE DE OBRA — AMPLIACIÓN DE NAVE INDUSTRIAL Y CUARTO DE MÁQUINAS
Parque Industrial, Cancún, Quintana Roo.

1. GENERALIDADES
El presente alcance describe los trabajos de ampliación de 480 m2 de nave industrial
existente, incluyendo la construcción de un cuarto de máquinas anexo de 45 m2 para
alojar el equipo de refrigeración y el tablero general de la ampliación.

2. OBRA CIVIL
2.1 Cimentación a base de zapatas aisladas de concreto f'c=250 kg/cm2, desplante a
    -1.50 m respecto a nivel de banqueta. Se anexa estudio de mecánica de suelos.
2.2 Firme de concreto armado de 15 cm de espesor, acabado pulido, con malla
    electrosoldada 6x6-10/10.
2.3 Estructura metálica a base de marcos rígidos de acero A-36, claro libre 20 m.
2.4 Cubierta de lámina pintro calibre 26 con aislamiento térmico.

3. INSTALACIÓN ELÉCTRICA
3.1 Alimentación desde subestación existente de 300 kVA. El contratista deberá
    verificar la capacidad disponible antes de iniciar.
3.2 Tablero general de la ampliación con interruptor principal de 250 A.
3.3 Iluminación tipo LED industrial, nivel mínimo 300 luxes en área de trabajo.
3.4 Contactos de fuerza trifásicos 220 V para maquinaria.

4. INSTALACIÓN HIDROSANITARIA
4.1 Red de agua potable en PPR con alimentación desde cisterna existente.
4.2 Drenaje sanitario en PVC sanitario de 4" con descarga a registro existente.
4.3 Captación pluvial de cubierta con bajadas de 4" a red municipal.

5. REFRIGERACIÓN
5.1 Suministro e instalación de dos unidades condensadoras de 15 TR cada una.
5.2 Tubería de cobre tipo L aislada con elastómero de 19 mm.

6. ENTREGABLES
Planos as-built, memorias de cálculo, protocolos de prueba y garantías por escrito.
Plazo de ejecución: 120 días naturales.`;

export const REQUERIMIENTOS_DEMO: Requerimiento[] = [
  {
    id: "REQ-01",
    descripcion:
      "Construir 480 m2 de ampliación de nave industrial más 45 m2 de cuarto de máquinas anexo.",
    disciplina: "arquitectura",
    evidencia:
      "trabajos de ampliación de 480 m2 de nave industrial existente, incluyendo la construcción de un cuarto de máquinas anexo de 45 m2",
    pagina: 1,
    critico: true,
  },
  {
    id: "REQ-02",
    descripcion:
      "Ejecutar cimentación con zapatas aisladas de concreto f'c=250 kg/cm2 desplantadas a -1.50 m.",
    disciplina: "estructural",
    evidencia:
      "Cimentación a base de zapatas aisladas de concreto f'c=250 kg/cm2, desplante a -1.50 m respecto a nivel de banqueta",
    pagina: 1,
    critico: true,
  },
  {
    id: "REQ-03",
    descripcion:
      "Montar estructura metálica de marcos rígidos A-36 con claro libre de 20 m.",
    disciplina: "estructural",
    evidencia: "Estructura metálica a base de marcos rígidos de acero A-36, claro libre 20 m",
    pagina: 1,
    critico: true,
  },
  {
    id: "REQ-04",
    descripcion:
      "Colocar firme de concreto armado de 15 cm con malla electrosoldada 6x6-10/10 y acabado pulido.",
    disciplina: "obra-civil",
    evidencia:
      "Firme de concreto armado de 15 cm de espesor, acabado pulido, con malla electrosoldada 6x6-10/10",
    pagina: 1,
    critico: false,
  },
  {
    id: "REQ-05",
    descripcion:
      "Verificar la capacidad disponible de la subestación existente de 300 kVA antes de iniciar.",
    disciplina: "electrica",
    evidencia:
      "El contratista deberá verificar la capacidad disponible antes de iniciar",
    pagina: 1,
    critico: true,
  },
  {
    id: "REQ-06",
    descripcion:
      "Instalar tablero general de la ampliación con interruptor principal de 250 A.",
    disciplina: "electrica",
    evidencia: "Tablero general de la ampliación con interruptor principal de 250 A",
    pagina: 1,
    critico: true,
  },
  {
    id: "REQ-07",
    descripcion:
      "Garantizar iluminación LED industrial con nivel mínimo de 300 luxes en área de trabajo.",
    disciplina: "electrica",
    evidencia: "Iluminación tipo LED industrial, nivel mínimo 300 luxes en área de trabajo",
    pagina: 1,
    critico: false,
  },
  {
    id: "REQ-08",
    descripcion:
      "Tender red de agua potable en PPR alimentada desde la cisterna existente.",
    disciplina: "hidrosanitaria",
    evidencia: "Red de agua potable en PPR con alimentación desde cisterna existente",
    pagina: 1,
    critico: false,
  },
  {
    id: "REQ-09",
    descripcion:
      "Ejecutar drenaje sanitario en PVC de 4\" con descarga a registro existente.",
    disciplina: "hidrosanitaria",
    evidencia:
      "Drenaje sanitario en PVC sanitario de 4\" con descarga a registro existente",
    pagina: 1,
    critico: false,
  },
  {
    id: "REQ-10",
    descripcion:
      "Suministrar e instalar dos unidades condensadoras de 15 TR con tubería de cobre tipo L aislada.",
    disciplina: "hvac",
    evidencia:
      "Suministro e instalación de dos unidades condensadoras de 15 TR cada una",
    pagina: 1,
    critico: true,
  },
  {
    id: "REQ-11",
    descripcion:
      "Entregar planos as-built, memorias de cálculo, protocolos de prueba y garantías por escrito.",
    disciplina: "general",
    evidencia:
      "Planos as-built, memorias de cálculo, protocolos de prueba y garantías por escrito",
    pagina: 1,
    critico: true,
  },
  {
    id: "REQ-12",
    descripcion: "Concluir la totalidad de los trabajos en 120 días naturales.",
    disciplina: "general",
    evidencia: "Plazo de ejecución: 120 días naturales",
    pagina: 1,
    critico: true,
  },
];

export const PARTIDAS_DEMO: Partida[] = [
  {
    clave: "01.01",
    concepto: "Excavación y relleno compactado para zapatas aisladas",
    unidad: "m3",
    cantidad: 96,
    precioUnitario: 685,
    importe: 65760,
    disciplina: "obra-civil",
    matriz: { materiales: 45, manoObra: 310, equipo: 210, indirectos: 120 },
    supuesto: "Volumen estimado a partir de 24 zapatas de 2.0 x 2.0 x 1.0 m.",
  },
  {
    clave: "01.02",
    concepto: "Zapatas aisladas de concreto f'c=250 kg/cm2, armado incluido",
    unidad: "m3",
    cantidad: 78,
    precioUnitario: 4850,
    importe: 378300,
    disciplina: "estructural",
    matriz: { materiales: 3100, manoObra: 780, equipo: 190, indirectos: 780 },
    supuesto: "Cuantía de acero considerada de 85 kg/m3.",
  },
  {
    clave: "01.03",
    concepto: "Firme de concreto armado de 15 cm con malla 6x6-10/10, acabado pulido",
    unidad: "m2",
    cantidad: 525,
    precioUnitario: 690,
    importe: 362250,
    disciplina: "obra-civil",
    matriz: { materiales: 415, manoObra: 145, equipo: 30, indirectos: 100 },
    supuesto: null,
  },
  {
    clave: "02.01",
    concepto: "Estructura metálica de marcos rígidos A-36, claro libre 20 m",
    unidad: "kg",
    cantidad: 38500,
    precioUnitario: 68,
    importe: 2618000,
    disciplina: "estructural",
    matriz: { materiales: 38, manoObra: 12, equipo: 8, indirectos: 10 },
    supuesto: "Peso estimado de 73 kg/m2 de área cubierta.",
  },
  {
    clave: "02.02",
    concepto: "Cubierta de lámina pintro cal. 26 con aislamiento térmico",
    unidad: "m2",
    cantidad: 560,
    precioUnitario: 745,
    importe: 417200,
    disciplina: "arquitectura",
    matriz: { materiales: 490, manoObra: 135, equipo: 25, indirectos: 95 },
    supuesto: null,
  },
  {
    clave: "03.01",
    concepto: "Tablero general 250 A con interruptor principal y protecciones derivadas",
    unidad: "pza",
    cantidad: 1,
    precioUnitario: 148000,
    importe: 148000,
    disciplina: "electrica",
    matriz: { materiales: 108000, manoObra: 12000, equipo: 4000, indirectos: 24000 },
    supuesto: null,
  },
  {
    clave: "03.02",
    concepto: "Alimentador principal en cable THHN cal. 4/0 en tubería conduit",
    unidad: "ml",
    cantidad: 85,
    precioUnitario: 2340,
    importe: 198900,
    disciplina: "electrica",
    matriz: { materiales: 1720, manoObra: 320, equipo: 65, indirectos: 235 },
    supuesto: "Distancia estimada de subestación a tablero de 85 m.",
  },
  {
    clave: "03.03",
    concepto: "Luminario LED industrial 150 W, montaje suspendido, incluye cableado",
    unidad: "pza",
    cantidad: 42,
    precioUnitario: 3850,
    importe: 161700,
    disciplina: "electrica",
    matriz: { materiales: 2680, manoObra: 620, equipo: 90, indirectos: 460 },
    supuesto: "Cantidad calculada para alcanzar 300 luxes en 525 m2.",
  },
  {
    clave: "03.04",
    concepto: "Salida para contacto trifásico 220 V con protección dedicada",
    unidad: "salida",
    cantidad: 12,
    precioUnitario: 4200,
    importe: 50400,
    disciplina: "electrica",
    matriz: { materiales: 2750, manoObra: 810, equipo: 120, indirectos: 520 },
    supuesto: "Cantidad no especificada en el alcance; se asumen 12 salidas.",
  },
  {
    clave: "03.05",
    concepto: "Sistema de tierra física con electrodos y anillo perimetral",
    unidad: "lote",
    cantidad: 1,
    precioUnitario: 96000,
    importe: 96000,
    disciplina: "electrica",
    matriz: { materiales: 62000, manoObra: 15000, equipo: 4000, indirectos: 15000 },
    supuesto:
      "No aparece en el alcance pero es obligatorio conforme a NOM-001-SEDE; se incluye.",
  },
  {
    clave: "04.01",
    concepto: "Red de agua potable en PPR de 32 mm, incluye conexiones y pruebas",
    unidad: "ml",
    cantidad: 120,
    precioUnitario: 585,
    importe: 70200,
    disciplina: "hidrosanitaria",
    matriz: { materiales: 340, manoObra: 145, equipo: 25, indirectos: 75 },
    supuesto: "Longitud estimada desde cisterna existente.",
  },
  {
    clave: "04.02",
    concepto: "Drenaje sanitario en PVC de 4\" con registros y pendiente 2%",
    unidad: "ml",
    cantidad: 95,
    precioUnitario: 780,
    importe: 74100,
    disciplina: "hidrosanitaria",
    matriz: { materiales: 425, manoObra: 215, equipo: 45, indirectos: 95 },
    supuesto: null,
  },
  {
    clave: "04.03",
    concepto: "Bajadas pluviales de 4\" con conexión a red municipal",
    unidad: "ml",
    cantidad: 68,
    precioUnitario: 640,
    importe: 43520,
    disciplina: "hidrosanitaria",
    matriz: { materiales: 380, manoObra: 155, equipo: 25, indirectos: 80 },
    supuesto: null,
  },
  {
    clave: "05.01",
    concepto: "Unidad condensadora de 15 TR, suministro, montaje y arranque",
    unidad: "pza",
    cantidad: 2,
    precioUnitario: 425000,
    importe: 850000,
    disciplina: "hvac",
    matriz: { materiales: 335000, manoObra: 28000, equipo: 12000, indirectos: 50000 },
    supuesto: null,
  },
  {
    clave: "05.02",
    concepto: "Tubería de cobre tipo L aislada con elastómero de 19 mm",
    unidad: "ml",
    cantidad: 110,
    precioUnitario: 1480,
    importe: 162800,
    disciplina: "hvac",
    matriz: { materiales: 1010, manoObra: 265, equipo: 45, indirectos: 160 },
    supuesto: "Longitud estimada entre cuarto de máquinas y evaporadores.",
  },
  {
    clave: "06.01",
    concepto: "Sistema de detección y alarma contra incendio para nave industrial",
    unidad: "lote",
    cantidad: 1,
    precioUnitario: 185000,
    importe: 185000,
    disciplina: "proteccion-incendio",
    matriz: { materiales: 128000, manoObra: 24000, equipo: 5000, indirectos: 28000 },
    supuesto:
      "No incluido en el alcance; requerido por NOM-002-STPS para el uso previsto.",
  },
  {
    clave: "07.01",
    concepto: "Planos as-built, memorias de cálculo y protocolos de prueba",
    unidad: "lote",
    cantidad: 1,
    precioUnitario: 145000,
    importe: 145000,
    disciplina: "general",
    matriz: { materiales: 8000, manoObra: 105000, equipo: 6000, indirectos: 26000 },
    supuesto: null,
  },
];

export const HALLAZGOS_DEMO: Hallazgo[] = [
  {
    id: "HAL-01",
    titulo: "El alcance no incluye sistema de tierra física",
    norma: "NOM-001-SEDE-2012",
    articulo: "Artículo 250",
    riesgo: "critico",
    descripcion:
      "El apartado eléctrico especifica tablero, alimentador, iluminación y contactos, pero no menciona el sistema de puesta a tierra. Sin él, la instalación no es certificable ante la unidad de verificación y no puede energizarse legalmente.",
    recomendacion:
      "Incorporar al catálogo la partida de tierra física con anillo perimetral y electrodos, y exigir medición de resistencia menor a 25 ohms como condición de aceptación.",
    disciplina: "electrica",
  },
  {
    id: "HAL-02",
    titulo: "Falta sistema de detección y alarma contra incendio",
    norma: "NOM-002-STPS-2010",
    articulo: "Numeral 7",
    riesgo: "critico",
    descripcion:
      "Una nave industrial de 525 m2 con cuarto de máquinas requiere medios de detección y alarma acordes al riesgo de incendio. El alcance no los contempla en ninguna partida.",
    recomendacion:
      "Elaborar el estudio de determinación del grado de riesgo de incendio y presupuestar el sistema resultante antes de firmar el contrato.",
    disciplina: "proteccion-incendio",
  },
  {
    id: "HAL-03",
    titulo: "La verificación de capacidad de la subestación se traslada al contratista",
    norma: "NOM-001-SEDE-2012",
    articulo: "Artículo 220",
    riesgo: "alto",
    descripcion:
      "El alcance obliga al contratista a verificar la capacidad disponible de la subestación de 300 kVA sin proporcionar el cuadro de cargas existente. Si la capacidad resulta insuficiente, el costo de ampliación no está previsto en ninguna partida.",
    recomendacion:
      "Solicitar el cuadro de cargas actual y el histórico de demanda antes de cotizar, y dejar por escrito que la ampliación de subestación queda fuera del precio ofertado.",
    disciplina: "electrica",
  },
  {
    id: "HAL-04",
    titulo: "No se especifica protocolo de pruebas para la instalación eléctrica",
    norma: "NOM-001-SEDE-2012",
    articulo: null,
    riesgo: "alto",
    descripcion:
      "Los entregables mencionan protocolos de prueba de forma genérica, sin definir qué pruebas ni con qué criterios de aceptación. Esto abre disputas en la recepción de la obra.",
    recomendacion:
      "Definir en el contrato las pruebas exigibles: resistencia de aislamiento, continuidad, resistencia de tierra y verificación de niveles de iluminación con luxómetro calibrado.",
    disciplina: "electrica",
  },
  {
    id: "HAL-05",
    titulo: "Captación pluvial descargada directamente a red municipal",
    norma: "Reglamento de Construcción del Municipio de Benito Juárez",
    articulo: null,
    riesgo: "alto",
    descripcion:
      "En Quintana Roo la descarga pluvial a red municipal suele requerir autorización y, en varios casos, obliga a infiltración en sitio mediante pozos de absorción. El alcance asume la descarga sin acreditar la factibilidad.",
    recomendacion:
      "Tramitar la factibilidad de descarga pluvial ante el organismo operador y prever pozos de absorción como alternativa antes de cerrar el precio.",
    disciplina: "hidrosanitaria",
  },
  {
    id: "HAL-06",
    titulo: "Sin trabajos en altura definidos pese a cubierta a 20 m de claro",
    norma: "NOM-009-STPS-2011",
    articulo: "Numeral 5",
    riesgo: "alto",
    descripcion:
      "El montaje de estructura metálica y cubierta implica trabajos en altura, pero el alcance no exige procedimientos, líneas de vida ni personal autorizado.",
    recomendacion:
      "Exigir procedimiento de trabajo en altura, DC-3 del personal y sistemas de protección contra caídas como requisito de arranque de obra.",
    disciplina: "estructural",
  },
  {
    id: "HAL-07",
    titulo: "Nivel de iluminación exigido sin definir el plano de trabajo",
    norma: "NOM-025-STPS-2008",
    articulo: "Numeral 7",
    riesgo: "medio",
    descripcion:
      "Se pide un mínimo de 300 luxes sin indicar altura del plano de medición ni uniformidad, lo que hace la exigencia no verificable de forma objetiva.",
    recomendacion:
      "Especificar medición a 0.75 m sobre nivel de piso terminado, con factor de uniformidad mínimo de 0.5 y reporte por luxómetro calibrado.",
    disciplina: "electrica",
  },
  {
    id: "HAL-08",
    titulo: "Estudio de mecánica de suelos anexo pero no vinculado al diseño",
    norma: "Reglamento de Construcción aplicable",
    articulo: null,
    riesgo: "medio",
    descripcion:
      "Se anexa el estudio de mecánica de suelos, pero el alcance fija el desplante a -1.50 m sin señalar que esa profundidad provenga de la recomendación del estudio.",
    recomendacion:
      "Confirmar que la capacidad de carga admisible y la profundidad de desplante del proyecto coinciden con el estudio, y dejar constancia firmada por el responsable estructural.",
    disciplina: "estructural",
  },
  {
    id: "HAL-09",
    titulo: "Plazo de 120 días sin ruta crítica ni penalizaciones definidas",
    norma: "Buenas prácticas contractuales",
    articulo: null,
    riesgo: "medio",
    descripcion:
      "El plazo es agresivo para 525 m2 con estructura metálica y equipo de refrigeración de importación, y no viene acompañado de programa de obra ni de penas convencionales acordadas.",
    recomendacion:
      "Elaborar programa con ruta crítica antes de firmar, identificando el tiempo de entrega de las condensadoras como hito de riesgo.",
    disciplina: "general",
  },
  {
    id: "HAL-10",
    titulo: "Refrigerante de las unidades condensadoras sin especificar",
    norma: "NOM-020-SCFI / protocolo de Kigali",
    articulo: null,
    riesgo: "bajo",
    descripcion:
      "No se indica el tipo de refrigerante de las unidades de 15 TR. La transición hacia refrigerantes de bajo potencial de calentamiento afecta la disponibilidad y el costo a largo plazo.",
    recomendacion:
      "Especificar refrigerante y exigir ficha técnica del equipo antes de la orden de compra.",
    disciplina: "hvac",
  },
];

export const RESUMEN_DEMO: ResumenEjecutivo = {
  titulo: "Ampliación de nave industrial y cuarto de máquinas",
  tipoProyecto: "Nave industrial — ampliación",
  ubicacion: "Parque Industrial, Cancún, Quintana Roo",
  sintesis:
    "El alcance describe una ampliación de 525 m2 técnicamente resuelta en obra civil y estructura, pero incompleta en las instalaciones que condicionan la puesta en operación. Faltan dos partidas obligatorias que ningún contratista podría omitir sin dejar la nave sin poder energizarse ni recibirse: el sistema de tierra física y la detección contra incendio. Ambas se incorporaron al presupuesto y representan cerca del 6% del total. El segundo foco de riesgo es contractual: el alcance traslada al contratista la verificación de la capacidad de la subestación existente sin entregar el cuadro de cargas, de modo que una eventual ampliación quedaría fuera de precio. El plazo de 120 días es alcanzable solo si las unidades condensadoras se ordenan en la primera semana. El presupuesto estimado asume cantidades donde el documento no las precisa; cada supuesto está declarado en su partida.",
  totalEstimado: 6027130,
  moneda: "MXN",
  riesgoGlobal: "critico",
  recomendaciones: [
    "Solicitar el cuadro de cargas de la subestación existente antes de cotizar y excluir por escrito su ampliación del precio ofertado.",
    "Incorporar formalmente al alcance el sistema de tierra física y el sistema de detección contra incendio; sin ellos la obra no es recibible.",
    "Tramitar la factibilidad de descarga pluvial ante el organismo operador antes de cerrar el precio.",
    "Ordenar las unidades condensadoras de 15 TR en la primera semana de contrato: son el hito que define si los 120 días son viables.",
    "Definir en contrato el protocolo de pruebas con criterios de aceptación medibles para evitar disputas en la recepción.",
  ],
  supuestos: [
    "Cuantía de acero en cimentación de 85 kg/m3 y peso de estructura de 73 kg/m2.",
    "Distancia de 85 m entre subestación existente y el nuevo tablero general.",
    "12 salidas de fuerza trifásicas; el alcance no indica cantidad.",
    "42 luminarios LED de 150 W para cumplir 300 luxes en 525 m2.",
    "Precios de mercado de obra en la zona de Cancún al momento del análisis.",
  ],
};
