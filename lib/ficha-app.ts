/**
 * Ficha de la propia aplicación, para el asistente de la portada.
 *
 * Un visitante que aún no ha entrado no tiene proyecto que consultar, así que el
 * asistente necesita algo sobre lo que responder. Este texto es ese documento:
 * qué hace la herramienta, cómo lo hace y con qué límites. Se escribe aquí, y no
 * en el prompt del modelo, para que la recuperación pueda citar de dónde sale
 * cada respuesta igual que hace con un pliego.
 */
export const FICHA_APP = `
ANDRES Engineering AI — Engineering Document Analysis & Project Intelligence.
Trabajo de Fin de Máster del Máster en Desarrollo con IA de BIG School, de Heber
Andres Acosta Jimenez.

QUÉ RESUELVE
Antes de decidir si compite por una obra, un equipo de ingeniería dedica de tres
a cinco días a leer el pliego, extraer qué se exige, cuantificar, presupuestar y
comprobar qué normativa aplica. El 70 % de los hallazgos se repite de una
licitación a otra. Y lo caro no suele ser lo que el pliego dice, sino lo que
calla: la partida que la ley obliga y nadie presupuestó.

LOS DOS MODOS DE TRABAJO
1. Analizar documentación existente. Se suben hasta diez archivos en PDF, Word,
   Excel, CSV, HTML, DXF, IFC, JSON o texto, con un máximo de 15 MB por archivo.
   Devuelve los requerimientos técnicos con la cita textual y la página que los
   respalda, un catálogo de conceptos con matriz de precio unitario desglosada y
   los supuestos declarados, los hallazgos de cumplimiento normativo —incluidos
   los que lo son por ausencia— y un resumen ejecutivo con riesgo global.
2. Proyectar desde cero. Se describe qué se quiere construir, se eligen las
   disciplinas y la envergadura, y el sistema redacta el alcance de obra, lo
   cuantifica, revisa la normativa, redacta la memoria técnica y dibuja el
   paquete completo de planos, cada uno con maqueta tridimensional navegable.

LOS DIEZ AGENTES
Programa redacta el alcance de obra a partir de la descripción. Extractor aísla
los requerimientos con su evidencia. Costos elabora el catálogo de conceptos y
los precios unitarios. Normativo contrasta contra NOM, STPS y reglamentos
aplicables. Memoria redacta la memoria descriptiva y de cálculo por instalación.
Proyectista devuelve la topología de las láminas. Síntesis redacta el resumen
ejecutivo y consolida el riesgo. Programación propone las actividades de obra y
su encadenado, y el sistema calcula con ellas las fechas, las holguras y la ruta
crítica. Riesgos levanta la matriz probabilidad por impacto y mueve el
presupuesto real en escenario base, optimista y pesimista. Verificador llega con
contexto fresco al paquete terminado, cruza aritmética, cobertura y coherencia
entre piezas, y emite un veredicto con una confianza de cero a cien.
Costos, normativo, memoria y proyectista corren en paralelo; después lo hacen
síntesis, programación y riesgos. El verificador va último y solo. El progreso
llega por Server Sent Events, así que cada etapa se completa en vivo con su
recuento real.

CÓMO SE ORGANIZA POR DENTRO
Ningún agente devuelve texto libre: se le obliga a invocar una herramienta con
esquema y su respuesta se valida con Zod; si no encaja, se reintenta pasándole el
error concreto. La aritmética no la hace el modelo —estima precios bien y
multiplica mal—, así que el importe, el total y el riesgo global se calculan en
código y están cubiertos por pruebas. El proyectista tampoco dibuja: devuelve qué
elementos hay, dónde van y cómo se conectan, y el código traza el plano con 63
símbolos normalizados, ruteo ortogonal y cajetín. Por eso sale un plano y no un
boceto.

DISCIPLINAS Y LÁMINAS
Trece disciplinas: arquitectura, civil y estructural, mecánica, mecatrónica,
eléctrica, electrónica, hidráulica y sanitaria, neumática, HVAC, aeronáutica,
naval, ferroviaria e ingeniería de fluidos. Se pueden elegir varias a la vez.
Diez tipos de lámina: unifilar eléctrico, isométrico hidráulico, esquema
neumático, diagrama mecánico, esquemático electrónico, P&ID, climatización,
bloques, planta esquemática y esquema estructural. Cada disciplina declara su
normativa de referencia y qué láminas le son propias, y el usuario puede pedir
cualquiera del catálogo o quitar la que no quiera.

MONEDA Y TRAZABILIDAD ECONÓMICA
El presupuesto se emite en la moneda del país donde se construye, deducido de la
ubicación. Junto a la moneda local se muestra siempre el equivalente en dólares,
con el tipo de cambio, su fecha y su fuente. Cada presupuesto congela su ficha
económica y las cotizaciones de proveedor conservan el tipo de cambio del día en
que se emitieron. Antes de comparar proveedores, todas las propuestas se
normalizan a una misma moneda.

QUÉ SE PUEDE DESCARGAR
PDF con el dictamen completo, incluidas las láminas, la memoria técnica, el
cronograma con su ruta crítica, la matriz de riesgos y el informe de
verificación; Word,
CSV, HTML con los planos incrustados, DXF que AutoCAD abre, IFC que Revit lee y
SVG. Cada lámina se puede bajar además suelta en SVG, DXF o PNG. El formato .rvt
no se genera: es propietario y solo Revit puede escribirlo, así que se entrega
DXF e IFC, que es la vía habitual en la industria.

PRIVACIDAD Y LÍMITES
El servidor no almacena nada: el documento se procesa en memoria y el historial
vive en el navegador del usuario. Se requiere PDF con texto seleccionable; un
plano escaneado sin OCR se rechaza con un mensaje explícito. Los diagramas son
esquemas de anteproyecto, no planos de ejecución: no llevan escala real ni
geometría acotada. Los precios son estimaciones de mercado del modelo, no
cotizaciones firmes. Todo el resultado es un análisis asistido por IA y no
sustituye el criterio ni la firma de un responsable técnico.

TECNOLOGÍA Y ACCESO
Next.js 16 con React 19 y TypeScript estricto, desplegada en Vercel. Habla con
tres proveedores de IA —OpenAI, Gemini y Claude— con un catálogo cerrado de 21
motores: GPT-5.6 Sol, Luna y Terra con cuatro niveles de razonamiento cada uno,
GPT-5.5, cuatro Gemini y cuatro Claude. El motor por defecto es GPT-5.6 Luna con
razonamiento medio, y cambiarlo exige contraseña. Si uno agota su cuota pasa al
siguiente solo; si ninguno responde, continúa en modo demostración en lugar de
romperse. Recuperación léxica BM25 implementada desde cero, sin base vectorial.
104 pruebas unitarias en verde. Acceso de prueba: demo@diem.mx con contraseña
TFMdemo2026.
`.trim();
