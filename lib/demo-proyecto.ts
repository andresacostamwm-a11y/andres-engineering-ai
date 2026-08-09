/**
 * Datos de demostración del flujo de proyecto nuevo.
 *
 * Igual que en el análisis de documentos, el modo demostración recorre las
 * mismas etapas con contenido fijo cuando no hay API key configurada, de modo
 * que la aplicación desplegada siempre se puede evaluar de principio a fin.
 */
import type { Diagrama } from "./diagramas/tipos.ts";
import type { MemoriaProyecto, ProgramaObra, Viabilidad } from "./tipos-proyecto.ts";
import type { DisciplinaProyecto } from "./disciplinas.ts";
import { programar } from "./programacion/cpm.ts";
import { calcularSensibilidad, evaluarRiesgo } from "./agentes/riesgos.ts";
import {
  DOCUMENTO_DEMO,
  HALLAZGOS_DEMO,
  PARTIDAS_DEMO,
  REQUERIMIENTOS_DEMO,
  RESUMEN_DEMO,
} from "./demo.ts";

export const PROYECTO_DEMO = {
  alcance: DOCUMENTO_DEMO,
  premisas: [
    "Se asume clima cálido húmedo y zona de riesgo ciclónico (Quintana Roo).",
    "Se asume suministro eléctrico existente en media tensión con capacidad por verificar.",
    "Se asume terreno con estudio de mecánica de suelos disponible.",
  ],
  requerimientos: REQUERIMIENTOS_DEMO,
  partidas: PARTIDAS_DEMO,
  hallazgos: HALLAZGOS_DEMO,
  resumen: RESUMEN_DEMO,
};

const UNIFILAR: Diagrama = {
  tipo: "unifilar",
  titulo: "Diagrama unifilar — ampliación de nave industrial",
  descripcion:
    "Distribución desde acometida en media tensión hasta tableros derivados, con respaldo de emergencia.",
  escala: null,
  notas: [
    "Sistema de tierra física conforme a NOM-001-SEDE-2012 artículo 250, resistencia máxima 10 ohm.",
    "Verificar capacidad disponible de la subestación existente antes de conectar la ampliación.",
    "Protecciones coordinadas selectivamente entre interruptor general y derivados.",
  ],
  nodos: [
    { id: "ACO", etiqueta: "Acometida CFE", simbolo: "acometida", x: 50, y: 8, datos: ["13.2 kV", "3F 3H"] },
    { id: "MED", etiqueta: "Medición", simbolo: "medidor", x: 50, y: 22, datos: ["3F 4H"] },
    { id: "TR", etiqueta: "Transformador", simbolo: "transformador", x: 50, y: 36, datos: ["300 kVA", "13.2 kV / 220-127 V"] },
    { id: "IG", etiqueta: "Interruptor general", simbolo: "interruptor", x: 50, y: 50, datos: ["250 A"] },
    { id: "GE", etiqueta: "Planta de emergencia", simbolo: "generador", x: 82, y: 50, datos: ["150 kW"] },
    { id: "TG", etiqueta: "Tablero general", simbolo: "tablero", x: 50, y: 64, datos: ["250 A", "220/127 V"] },
    { id: "TD1", etiqueta: "Tablero producción", simbolo: "tablero", x: 22, y: 82, datos: ["150 A"] },
    { id: "TD2", etiqueta: "Tablero servicios", simbolo: "tablero", x: 50, y: 82, datos: ["60 A"] },
    { id: "TD3", etiqueta: "Tablero HVAC", simbolo: "tablero", x: 78, y: 82, datos: ["100 A"] },
    { id: "TIE", etiqueta: "Tierra física", simbolo: "tierra", x: 14, y: 64, datos: ["Rg < 10 Ω"] },
  ],
  conexiones: [
    { desde: "ACO", hasta: "MED", etiqueta: "13.2 kV", tipo: "electrica" },
    { desde: "MED", hasta: "TR", etiqueta: null, tipo: "electrica" },
    { desde: "TR", hasta: "IG", etiqueta: "4/0 AWG", tipo: "electrica" },
    { desde: "GE", hasta: "IG", etiqueta: "respaldo", tipo: "electrica" },
    { desde: "IG", hasta: "TG", etiqueta: "250 A", tipo: "electrica" },
    { desde: "TG", hasta: "TD1", etiqueta: "1/0 AWG", tipo: "electrica" },
    { desde: "TG", hasta: "TD2", etiqueta: "6 AWG", tipo: "electrica" },
    { desde: "TG", hasta: "TD3", etiqueta: "2 AWG", tipo: "electrica" },
    { desde: "TG", hasta: "TIE", etiqueta: "2/0 AWG", tipo: "electrica" },
  ],
};

const HIDRAULICO: Diagrama = {
  tipo: "hidraulico",
  titulo: "Isométrico hidráulico — red de agua potable",
  descripcion:
    "Alimentación desde cisterna existente con equipo hidroneumático hacia los puntos de consumo.",
  escala: "S/E",
  notas: [
    "Tubería en PPR con uniones termofusionadas, presión de trabajo 10 bar.",
    "Prueba hidrostática a 1.5 veces la presión de trabajo durante 2 horas.",
    "Válvulas de seccionamiento en cada derivación para mantenimiento sin paro total.",
  ],
  nodos: [
    { id: "CIS", etiqueta: "Cisterna existente", simbolo: "cisterna", x: 10, y: 50, datos: ["30 m³"] },
    { id: "BOM", etiqueta: "Equipo hidroneumático", simbolo: "bomba", x: 30, y: 50, datos: ["3 L/s", "35 m.c.a."] },
    { id: "VCH", etiqueta: "Válvula check", simbolo: "valvula-check", x: 45, y: 50, datos: ["Ø 50 mm"] },
    { id: "MED", etiqueta: "Medidor", simbolo: "medidor-flujo", x: 58, y: 50, datos: ["Ø 50 mm"] },
    { id: "V1", etiqueta: "Válvula servicios", simbolo: "valvula", x: 76, y: 26, datos: ["Ø 32 mm"] },
    { id: "V2", etiqueta: "Válvula producción", simbolo: "valvula", x: 76, y: 50, datos: ["Ø 40 mm"] },
    { id: "V3", etiqueta: "Válvula HVAC", simbolo: "valvula", x: 76, y: 74, datos: ["Ø 25 mm"] },
    { id: "S1", etiqueta: "Servicios sanitarios", simbolo: "instrumento", x: 92, y: 26, datos: ["0.8 L/s"] },
    { id: "S2", etiqueta: "Área de producción", simbolo: "instrumento", x: 92, y: 50, datos: ["1.5 L/s"] },
    { id: "S3", etiqueta: "Reposición HVAC", simbolo: "instrumento", x: 92, y: 74, datos: ["0.4 L/s"] },
  ],
  conexiones: [
    { desde: "CIS", hasta: "BOM", etiqueta: "Ø 63 mm", tipo: "tuberia" },
    { desde: "BOM", hasta: "VCH", etiqueta: null, tipo: "tuberia" },
    { desde: "VCH", hasta: "MED", etiqueta: null, tipo: "tuberia" },
    { desde: "MED", hasta: "V1", etiqueta: "Ø 32", tipo: "tuberia" },
    { desde: "MED", hasta: "V2", etiqueta: "Ø 40", tipo: "tuberia" },
    { desde: "MED", hasta: "V3", etiqueta: "Ø 25", tipo: "tuberia" },
    { desde: "V1", hasta: "S1", etiqueta: null, tipo: "tuberia" },
    { desde: "V2", hasta: "S2", etiqueta: null, tipo: "tuberia" },
    { desde: "V3", hasta: "S3", etiqueta: null, tipo: "tuberia" },
  ],
};

const HVAC_DEMO: Diagrama = {
  tipo: "hvac",
  titulo: "Diagrama de climatización — cuarto de máquinas",
  descripcion:
    "Dos unidades condensadoras enfriando el área de producción mediante evaporadoras y distribución por ductos.",
  escala: null,
  notas: [
    "Refrigerante por definir; especificar antes de la orden de compra.",
    "Tubería de cobre tipo L aislada con elastómero de 19 mm.",
    "Ventilación conforme a ASHRAE 62.1 para el cuarto de máquinas.",
  ],
  nodos: [
    { id: "CD1", etiqueta: "Condensadora 1", simbolo: "condensadora", x: 14, y: 30, datos: ["15 TR"] },
    { id: "CD2", etiqueta: "Condensadora 2", simbolo: "condensadora", x: 14, y: 70, datos: ["15 TR"] },
    { id: "EV1", etiqueta: "Evaporadora 1", simbolo: "evaporadora", x: 42, y: 30, datos: ["15 TR"] },
    { id: "EV2", etiqueta: "Evaporadora 2", simbolo: "evaporadora", x: 42, y: 70, datos: ["15 TR"] },
    { id: "UMA", etiqueta: "Manejadora", simbolo: "uma", x: 66, y: 50, datos: ["12 000 CFM"] },
    { id: "DM", etiqueta: "Damper regulación", simbolo: "damper", x: 84, y: 30, datos: ["Motorizado"] },
    { id: "DIF", etiqueta: "Difusores producción", simbolo: "difusor", x: 84, y: 70, datos: ["8 unidades"] },
  ],
  conexiones: [
    { desde: "CD1", hasta: "EV1", etiqueta: "Cu tipo L", tipo: "tuberia" },
    { desde: "CD2", hasta: "EV2", etiqueta: "Cu tipo L", tipo: "tuberia" },
    { desde: "EV1", hasta: "UMA", etiqueta: null, tipo: "ducto" },
    { desde: "EV2", hasta: "UMA", etiqueta: null, tipo: "ducto" },
    { desde: "UMA", hasta: "DM", etiqueta: "Ø 600 mm", tipo: "ducto" },
    { desde: "UMA", hasta: "DIF", etiqueta: "Ø 500 mm", tipo: "ducto" },
  ],
};

/**
 * Diagramas de demostración por disciplina. En demostración también se entrega
 * el paquete completo de instalaciones, combinando las tres láminas de muestra.
 */
export const DIAGRAMAS_DEMO: Partial<Record<DisciplinaProyecto, Diagrama[]>> = {
  electrica: [UNIFILAR, HIDRAULICO, HVAC_DEMO],
  hidraulica: [HIDRAULICO, UNIFILAR, HVAC_DEMO],
  hvac: [HVAC_DEMO, HIDRAULICO, UNIFILAR],
  fluidos: [HIDRAULICO, HVAC_DEMO, UNIFILAR],
  mecanica: [HVAC_DEMO, UNIFILAR, HIDRAULICO],
  arquitectura: [UNIFILAR, HIDRAULICO, HVAC_DEMO],
  "civil-estructural": [UNIFILAR, HIDRAULICO],
  mecatronica: [UNIFILAR, HVAC_DEMO],
  electronica: [UNIFILAR, HVAC_DEMO],
  neumatica: [HIDRAULICO, UNIFILAR],
  aeronautica: [HIDRAULICO, UNIFILAR],
  naval: [HIDRAULICO, UNIFILAR, HVAC_DEMO],
  ferroviaria: [UNIFILAR, HIDRAULICO],
};

/** Memoria técnica de demostración: descriptiva y de cálculo por instalación. */
export const MEMORIA_DEMO: MemoriaProyecto = {
  objeto:
    "La presente memoria documenta el anteproyecto de la ampliación de una nave industrial de 1,200 m² en el Parque Industrial de Cancún, Quintana Roo, y justifica el dimensionamiento preliminar de sus instalaciones eléctrica, hidrosanitaria y de climatización para su revisión por el responsable técnico del proyecto.",
  antecedentes:
    "El predio cuenta con una nave existente en operación, suministro eléctrico en media tensión de 13.2 kV, cisterna de 30 m³ y descarga sanitaria al colector municipal. La zona es de clima cálido húmedo, con riesgo ciclónico y temperatura de diseño exterior de 35 °C bulbo seco. La ampliación destina el 70 % de la superficie a producción y el resto a oficinas y servicios.",
  normativa: [
    "NOM-001-SEDE-2012 — instalaciones eléctricas (utilización)",
    "NOM-025-STPS-2008 — niveles de iluminación en centros de trabajo",
    "NOM-001-CONAGUA-2011 — sistemas de agua potable y alcantarillado",
    "NFPA 13 / NFPA 20 — protección contra incendio y equipos de bombeo",
    "ASHRAE 62.1 y 90.1 — ventilación y eficiencia energética",
  ],
  sistemas: [
    {
      nombre: "Instalación eléctrica",
      descripcion:
        "La ampliación se alimenta desde una subestación compacta propia de 300 kVA, 13.2 kV/220-127 V, derivada de la acometida existente previa verificación de capacidad con la suministradora. Del tablero general parten tres circuitos derivados: producción, servicios y climatización, con planta de emergencia de 150 kW para cargas críticas y sistema de tierra física con resistencia máxima de 10 ohm.",
      criterios: [
        "Densidad de carga de 120 VA/m² en producción y 50 VA/m² en oficinas, conforme a la práctica de diseño industrial y NOM-001-SEDE-2012.",
        "Caída de tensión máxima de 3 % en alimentadores y 5 % total, artículo 215-2 de la NOM-001-SEDE-2012.",
        "Iluminación de 300 lx en área de trabajo por NOM-025-STPS-2008.",
      ],
      calculos: [
        {
          concepto: "Carga total instalada",
          metodo: "P = Σ (área · densidad de carga) · factor de demanda",
          datos: "840 m² · 120 VA/m² + 360 m² · 50 VA/m², FD = 0.8",
          resultado: "P ≈ 95 kVA de demanda; con reserva del 25 % → transformador de 300 kVA seleccionado por crecimiento futuro",
        },
        {
          concepto: "Corriente del alimentador general",
          metodo: "I = S / (√3 · V)",
          datos: "S = 300 kVA, V = 220 V",
          resultado: "I = 787 A → interruptor general de 800 A y barras de 1000 A",
        },
        {
          concepto: "Conductor del alimentador a tablero de producción",
          metodo: "Selección por ampacidad (tabla 310-15) y verificación de caída de tensión",
          datos: "I = 150 A, longitud 45 m, THW-LS 75 °C en tubería",
          resultado: "Conductor 1/0 AWG por fase, caída de tensión 1.9 % < 3 %",
        },
      ],
      especificaciones: [
        "Subestación compacta tipo pedestal de 300 kVA, 13.2 kV/220-127 V, con seccionador de operación en grupo.",
        "Tableros de distribución autosoportados con interruptores termomagnéticos coordinados selectivamente.",
        "Red de tierras con delta de varillas de 3 m y conductor desnudo 2/0 AWG, Rg ≤ 10 Ω.",
      ],
    },
    {
      nombre: "Instalación hidrosanitaria",
      descripcion:
        "El abastecimiento parte de la cisterna existente de 30 m³ mediante equipo hidroneumático dúplex de 3 L/s a 35 m.c.a., con red de distribución en PPR termofusionado y válvulas de seccionamiento por zona. El drenaje sanitario se conduce por gravedad al registro municipal con pendiente mínima del 2 %; el pluvial se capta en azotea y descarga a pozo de absorción.",
      criterios: [
        "Dotación de 100 L/trabajador/día conforme a criterio CONAGUA para naves industriales.",
        "Velocidad de diseño en tuberías entre 0.6 y 2.5 m/s para evitar sedimentación y golpe de ariete.",
        "Presión mínima de 10 m.c.a. en el mueble más desfavorable.",
      ],
      calculos: [
        {
          concepto: "Gasto máximo instantáneo",
          metodo: "Método de Hunter: Q = f(Σ unidades mueble)",
          datos: "48 UM entre sanitarios, regaderas y tarjas de producción",
          resultado: "Q = 2.6 L/s → equipo hidroneumático de 3 L/s seleccionado",
        },
        {
          concepto: "Carga dinámica total del equipo",
          metodo: "CDT = h estática + h fricción + presión residual",
          datos: "h est = 8 m, h fricción = 6.5 m (Hazen-Williams, C=140), P res = 10 m.c.a.",
          resultado: "CDT = 24.5 m.c.a. → se especifica 35 m.c.a. con margen del 40 %",
        },
      ],
      especificaciones: [
        "Tubería PPR PN-10 termofusionada en distribución, cobre tipo M en retornos de agua caliente.",
        "Equipo hidroneumático dúplex con alternancia automática y tanque precargado de 450 L.",
        "Válvulas de compuerta en cada derivación y de retención en la descarga de bombas.",
      ],
    },
    {
      nombre: "Climatización y ventilación",
      descripcion:
        "El área de producción se acondiciona con dos sistemas dividido-comercial de 15 TR con manejadora central de 12,000 CFM y distribución por ductos de lámina galvanizada aislada; las oficinas usan minisplits inverter. La ventilación cumple ASHRAE 62.1 con inyección de aire exterior filtrado y extracción mecánica en servicios.",
      criterios: [
        "Condición interior de diseño: 24 °C ± 1 °C y 50 % HR en producción.",
        "Carga térmica calculada por el método CLTD de ASHRAE con orientación real de la nave.",
        "Renovación mínima de aire exterior: 0.06 CFM/ft² más 5 CFM/persona (ASHRAE 62.1).",
      ],
      calculos: [
        {
          concepto: "Carga térmica del área de producción",
          metodo: "Método CLTD: Q = Q envolvente + Q internas + Q aire exterior",
          datos: "840 m², 35 °C exterior, 18 kW de cargas internas de proceso, 40 personas",
          resultado: "Q ≈ 28.4 TR → dos unidades de 15 TR con respaldo parcial",
        },
        {
          concepto: "Caudal de aire de diseño",
          metodo: "CFM = Q sensible / (1.08 · ΔT)",
          datos: "Q sen = 258,000 BTU/h, ΔT = 20 °F",
          resultado: "CFM ≈ 11,950 → manejadora de 12,000 CFM",
        },
      ],
      especificaciones: [
        "Unidades condensadoras de 15 TR con refrigerante R-454B y SEER mínimo 15.",
        "Ductos de lámina galvanizada calibre 24 con aislamiento de fibra de vidrio de 25 mm.",
        "Difusores de 4 vías con damper de regulación y filtros MERV 8 en retorno.",
      ],
    },
  ],
  conclusiones:
    "El anteproyecto es técnicamente viable con la infraestructura existente del parque industrial. Los puntos críticos a verificar en la ingeniería de detalle son la capacidad disponible real de la acometida en media tensión, el estudio de calidad de agua de la cisterna y la coordinación de la estructura de soporte de equipos de climatización con el proyecto estructural. Las cifras de esta memoria son de anteproyecto y requieren validación y firma de un responsable técnico antes de su uso constructivo o contractual.",
};

/**
 * Cronograma de demostración.
 *
 * Las actividades y sus enlaces son fijos, pero las fechas y la ruta crítica se
 * calculan con el mismo motor CPM que usa el proyecto real: el modo
 * demostración enseña el sistema funcionando, no una captura de pantalla.
 */
const CALCULO_DEMO = programar([
  { id: "A01", nombre: "Trazo, nivelación e instalaciones provisionales", frente: "Obra civil", duracionDias: 10, predecesoras: [], hito: false },
  { id: "A02", nombre: "Excavación y cimentación", frente: "Obra civil", duracionDias: 25, predecesoras: ["A01"], hito: false },
  { id: "A03", nombre: "Estructura metálica y cubierta", frente: "Estructural", duracionDias: 40, predecesoras: ["A02"], hito: false },
  { id: "A04", nombre: "Firme de concreto y albañilerías", frente: "Obra civil", duracionDias: 30, predecesoras: ["A03"], hito: false },
  { id: "A05", nombre: "Acometida en media tensión y subestación", frente: "Instalación eléctrica", duracionDias: 35, predecesoras: ["A02"], hito: false },
  { id: "A06", nombre: "Canalización y alimentadores generales", frente: "Instalación eléctrica", duracionDias: 25, predecesoras: ["A03"], hito: false },
  { id: "A07", nombre: "Tableros, circuitos derivados y luminarias", frente: "Instalación eléctrica", duracionDias: 30, predecesoras: ["A06", "A04"], hito: false },
  { id: "A08", nombre: "Cisterna, equipo de bombeo y red hidráulica", frente: "Hidrosanitaria", duracionDias: 28, predecesoras: ["A04"], hito: false },
  { id: "A09", nombre: "Red sanitaria y pluvial", frente: "Hidrosanitaria", duracionDias: 20, predecesoras: ["A04"], hito: false },
  { id: "A10", nombre: "Ductería y equipos de climatización", frente: "HVAC", duracionDias: 32, predecesoras: ["A03"], hito: false },
  { id: "A11", nombre: "Red contra incendio y detección", frente: "Protección contra incendio", duracionDias: 22, predecesoras: ["A06"], hito: false },
  { id: "A12", nombre: "Acabados y señalización", frente: "Obra civil", duracionDias: 25, predecesoras: ["A07", "A08", "A10"], hito: false },
  { id: "A13", nombre: "Pruebas, balanceo y puesta en marcha", frente: "Pruebas y entrega", duracionDias: 15, predecesoras: ["A12", "A09", "A11"], hito: false },
  { id: "A14", nombre: "Liberación por la supervisión", frente: "Pruebas y entrega", duracionDias: 0, predecesoras: ["A13"], hito: true },
  { id: "A15", nombre: "Entrega-recepción y dossier de calidad", frente: "Pruebas y entrega", duracionDias: 10, predecesoras: ["A14"], hito: false },
]);

export const PROGRAMA_DEMO: ProgramaObra = {
  actividades: CALCULO_DEMO.actividades,
  duracionDias: CALCULO_DEMO.duracionDias,
  rutaCritica: CALCULO_DEMO.rutaCritica,
  supuestos: [
    "Jornada de 8 horas, seis días por semana, con calendario de días naturales.",
    "Suministro de estructura metálica con 6 semanas de anticipo de pedido.",
    "Temporada de lluvias sin paro de obra: los trabajos exteriores se protegen.",
    "Una sola cuadrilla por frente, sin turnos dobles.",
  ],
  avisos: CALCULO_DEMO.avisos,
};

/** Matriz de riesgos de demostración, con severidad y escenarios calculados. */
export const VIABILIDAD_DEMO: Viabilidad = {
  riesgos: [
    { id: "R01", titulo: "Capacidad real de la acometida en media tensión menor a la supuesta", categoria: "Técnico", probabilidad: 3, impacto: 5, descripcion: "El alcance asume 500 kVA disponibles en la red del parque industrial sin factibilidad emitida por la compañía suministradora.", mitigacion: "Solicitar la factibilidad de suministro antes de cerrar la ingeniería eléctrica de detalle.", responsable: "Coordinador de proyecto" },
    { id: "R02", titulo: "Escalada del precio del acero estructural", categoria: "Económico", probabilidad: 4, impacto: 3, descripcion: "La estructura metálica concentra una parte significativa del presupuesto y su precio es el más volátil del catálogo.", mitigacion: "Cerrar pedido con precio firme al liberar la ingeniería de estructura.", responsable: "Gerencia de compras" },
    { id: "R03", titulo: "Retraso en la licencia de construcción", categoria: "Normativo", probabilidad: 3, impacto: 4, descripcion: "El cronograma arranca sin licencia emitida y la ruta crítica no admite espera en preliminares.", mitigacion: "Ingresar el trámite en paralelo a la ingeniería de detalle y prever un frente alterno.", responsable: "Director responsable de obra" },
    { id: "R04", titulo: "Plazo de entrega de equipos de climatización", categoria: "Suministro", probabilidad: 3, impacto: 3, descripcion: "Las unidades condensadoras de 15 TR son de pedido especial y el cronograma las coloca antes de acabados.", mitigacion: "Anticipar el pedido a la firma del contrato y confirmar fecha de embarque.", responsable: "Residente de obra" },
    { id: "R05", titulo: "Calidad de agua de la cisterna fuera de norma", categoria: "Técnico", probabilidad: 2, impacto: 3, descripcion: "El dimensionamiento hidráulico no incorpora tratamiento porque no existe análisis de agua del sitio.", mitigacion: "Ejecutar el análisis fisicoquímico antes de comprar el equipo de bombeo.", responsable: "Especialista hidrosanitario" },
    { id: "R06", titulo: "Interferencia entre ductería de clima y estructura de cubierta", categoria: "Técnico", probabilidad: 3, impacto: 2, descripcion: "Los trazos de HVAC y estructura se desarrollaron en paralelo sin modelo coordinado.", mitigacion: "Ejecutar detección de interferencias sobre modelo federado antes de fabricar ductería.", responsable: "Coordinador BIM" },
    { id: "R07", titulo: "Accidente en trabajos en altura de cubierta", categoria: "Seguridad", probabilidad: 2, impacto: 5, descripcion: "El montaje de estructura y cubierta concentra el mayor riesgo de la obra y está en ruta crítica.", mitigacion: "Plan de trabajos en altura con líneas de vida certificadas y supervisión permanente.", responsable: "Coordinador de seguridad" },
  ].map(evaluarRiesgo),
  sensibilidad: calcularSensibilidad(
    PROYECTO_DEMO.partidas.reduce((suma, p) => suma + p.importe, 0),
    [
      { concepto: "Precio del acero estructural", variacionPct: 18, pesoPct: 22, justificacion: "Volatilidad histórica del acero en el mercado mexicano en ventanas de 12 meses." },
      { concepto: "Tipo de cambio en equipos importados", variacionPct: 12, pesoPct: 18, justificacion: "Equipos de climatización y tableros con componente en dólares." },
      { concepto: "Mano de obra especializada", variacionPct: 10, pesoPct: 25, justificacion: "Presión salarial en instalaciones y montaje en la zona." },
      { concepto: "Obra adicional por condiciones del subsuelo", variacionPct: 20, pesoPct: 10, justificacion: "Cimentación proyectada sin estudio de mecánica de suelos definitivo." },
    ],
  ),
  veredicto:
    "El proyecto es viable con la infraestructura del parque industrial y un presupuesto consistente con su envergadura. Lo que decide su resultado no es la ingeniería sino tres confirmaciones externas: la factibilidad eléctrica, la licencia de construcción y el precio firme del acero. Con esas tres cerradas antes del arranque, la exposición del presupuesto se reduce a la mitad y el plazo deja de depender de terceros.",
  condiciones: [
    "Factibilidad de suministro eléctrico emitida antes de liberar la ingeniería de detalle.",
    "Licencia de construcción ingresada en paralelo a la ingeniería, no después.",
    "Pedido de estructura metálica con precio firme y fecha de embarque confirmada.",
    "Estudio de mecánica de suelos y análisis de agua ejecutados antes de cimentación.",
    "Contingencia reservada y no dispuesta para alcance adicional.",
  ],
};
