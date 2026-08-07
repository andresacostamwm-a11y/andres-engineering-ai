# ANDRES Engineering AI

**Engineering Document Analysis & Project Intelligence** — sistema multiagente que audita documentación de obra y proyecta desde cero en trece disciplinas de ingeniería: extrae requerimientos con su evidencia, presupuesta con matrices de precio unitario, revisa el cumplimiento normativo y **dibuja los planos y diagramas del sistema**.

Trabajo de Fin de Máster · Máster en Desarrollo con IA · BIG School
Autor: **Heber Andres Acosta Jimenez** — andresacosta.mwm@gmail.com

---

## Enlaces del proyecto

| Recurso | Enlace |
| --- | --- |
| Aplicación desplegada | **https://andres-engineering-ai.vercel.app** |
| Repositorio | https://github.com/andresacostamwm-a11y/andres-engineering-ai |
| Presentación (slides) | https://andres-engineering-ai.vercel.app/slides |
| Vídeo de presentación | _(pendiente de publicar — ver `docs/guion-video.md`)_ |

**Credenciales de prueba** (aparecen también en la pantalla de acceso):

```
Usuario:    demo@diem.mx
Contraseña: TFMdemo2026
```

---

## 1. Descripción general

Antes de decidir si compite por una obra, un equipo de ingeniería dedica entre tres y cinco días a la misma tarea: leer el pliego, extraer qué se exige, cuantificar, presupuestar y comprobar qué normativa aplica. Es un trabajo caro, repetitivo y propenso a que se escape justo lo que no está escrito: la partida que la ley obliga pero el documento no menciona.

**ANDRES Engineering AI** hace ese trabajo en dos direcciones.

### Analizar documentación existente

Se le entregan uno o varios documentos —PDF, Word, Excel, CSV, HTML, DXF, IFC, JSON o texto— y devuelve:

1. **Los requerimientos técnicos**, cada uno con la cita textual que lo respalda y su página.
2. **Un catálogo de conceptos** con matriz de precio unitario desglosada y los supuestos declarados cuando el documento no da una cantidad.
3. **Los hallazgos de cumplimiento normativo**, incluidos los *por ausencia*: lo que debería estar especificado y no lo está.
4. **Un resumen ejecutivo** con riesgo global y acciones recomendadas.

Incorpora además un **chat sobre el documento** que responde solo con lo que el texto dice y muestra los fragmentos en los que se apoyó.

### Proyectar desde cero

Se describe qué se quiere construir, se elige **disciplina** (13) y **envergadura** (pequeña, mediana o gran envergadura), y el sistema:

1. **Redacta el alcance de obra** numerable a partir de la descripción.
2. Ejecuta sobre él el mismo pipeline de análisis.
3. **Dibuja los planos y diagramas** propios de la disciplina, con simbología normalizada, cajetín y ruteo ortogonal.
4. Exporta todo a **PDF, Word, CSV, HTML, DXF, IFC y SVG**.

### Por qué este proyecto

Elegí un problema que conozco de primera mano por mi actividad profesional en ingeniería y dirección de proyectos. Eso permitió dos cosas que un proyecto genérico no habría permitido: escribir prompts con criterio de dominio real y, sobre todo, **evaluar la calidad de la salida**, que en un sistema con LLM es la parte difícil.

---

## 2. Stack tecnológico

| Capa | Tecnología | Por qué |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router) + React 19 | Server Components, Route Handlers para streaming y Edge para proteger rutas |
| Lenguaje | **TypeScript 5** estricto | Contratos tipados de extremo a extremo entre agentes |
| Estilos | **Tailwind CSS 4** con `@theme` | Sistema de diseño en tokens, sin archivo de configuración JS |
| IA | **Anthropic SDK** · `claude-sonnet-5` | Tool use forzado para salida estructurada; streaming para el chat |
| Validación | **Zod 4** | Valida en la frontera todo lo que devuelve el modelo |
| Autenticación | **jose** (JWT HS256) + cookie httpOnly | Sin proveedor externo: la app es *stateless* por diseño |
| Ingesta | **unpdf**, **mammoth**, **exceljs** + parsers propios | PDF, Word, Excel; DXF, IFC, CSV y HTML con extractores escritos para el caso |
| Salida | **jsPDF**, OOXML y generadores propios | PDF, Word, CSV, HTML, DXF, IFC y SVG, todo en el cliente |
| Diagramas | SVG generado por la aplicación | El modelo aporta la topología; el trazo lo pone el código |
| Tipografía | IBM Plex Sans / Mono | Diseñada para documentación técnica; cifras tabulares |
| Pruebas | **node:test** nativo | 36 pruebas sin una sola dependencia de desarrollo |
| Despliegue | **Vercel** | Runtime Node.js para el pipeline, Edge para la protección de rutas |

---

## 3. Instalación y ejecución

### Requisitos

- Node.js 20 o superior (probado en 25)
- npm

### Puesta en marcha

```bash
git clone https://github.com/andresacostamwm-a11y/andres-engineering-ai.git
cd andres-engineering-ai
npm install
cp .env.example .env.local
npm run dev
```

La aplicación queda en `http://localhost:3000`. Entra con las credenciales de prueba.

> **Sin API key también funciona.** Si `ANTHROPIC_API_KEY` está vacía —o si la cuenta ha agotado su cuota— la aplicación recorre las mismas etapas con un caso real precargado y lo indica en la interfaz. Nunca se queda inservible.

### Comandos disponibles

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm start` | Sirve la compilación de producción |
| `npm test` | 36 pruebas unitarias (node:test) |
| `npm run typecheck` | Comprobación de tipos sin emitir |
| `npm run lint` | ESLint |

---

## 4. Estructura del proyecto

```
andres-engineering-ai/
├── app/
│   ├── page.tsx                       Portada pública
│   ├── login/page.tsx                 Acceso
│   ├── app/page.tsx                   Analizar documentos (protegida)
│   ├── app/proyecto/page.tsx          Crear proyecto (protegida)
│   ├── slides/page.tsx                Presentación del TFM
│   ├── icon.png · opengraph-image.png Identidad e imagen al compartir
│   └── api/
│       ├── auth/…                     Sesión
│       ├── extraer/route.ts           Ingesta multiformato y múltiple
│       ├── agentes/analizar/route.ts  Pipeline de análisis (SSE)
│       ├── proyecto/generar/route.ts  Pipeline de proyecto (SSE)
│       └── chat/route.ts              Chat con recuperación (streaming)
│
├── lib/
│   ├── agentes/
│   │   ├── orquestador.ts             Pipeline de análisis
│   │   ├── orquestador-proyecto.ts    Pipeline de proyecto
│   │   ├── programa.ts                Agente 1 — alcance de obra
│   │   ├── extractor.ts               Agente 2 — requerimientos con evidencia
│   │   ├── costos.ts                  Agente 3 — presupuesto + normalización
│   │   ├── normativo.ts               Agente 4 — hallazgos + riesgo
│   │   ├── proyectista.ts             Agente 5 — topología de los diagramas
│   │   └── sintesis.ts                Agente 6 — resumen ejecutivo
│   ├── diagramas/tipos.ts             Modelo de datos de un plano
│   ├── extractores/index.ts           PDF, Word, Excel, CSV, HTML, DXF, IFC, JSON
│   ├── exportadores/                  CSV, HTML, DXF, IFC, SVG y Word (OOXML)
│   ├── disciplinas.ts                 13 disciplinas con normativa y diagramas
│   ├── anthropic.ts                   Tool use forzado, validación y cuota
│   ├── rag.ts                         Fragmentación y recuperación BM25
│   └── …                              auth, límite, formato, almacén, demo
│
├── components/
│   ├── diagramas/Plano.tsx            Renderizador de planos
│   ├── diagramas/Simbolos.tsx         Biblioteca de simbología normalizada
│   ├── CrearProyecto.tsx              Formulario y resultados de proyecto
│   ├── Taller.tsx                     Área de análisis de documentos
│   └── …                              paneles, tablas, chat, exportación
│
└── tests/logica.test.ts               36 pruebas de la lógica determinista
```

---

## 5. Funcionalidades principales

### 5.1 Pipeline de agentes

```
Analizar documentos          Crear proyecto
─────────────────────        ────────────────────────────────
                             programa (alcance de obra)
                                   │
extractor  ←── documentos    extractor
     │                             │
 ┌───┴────┐                 ┌──────┼──────────┐
 ▼        ▼                 ▼      ▼          ▼
costos  normativo         costos normativo proyectista
 └───┬────┘                 └──────┼──────────┘
     ▼                             ▼
  síntesis                      síntesis
     ▼                             ▼
 Dictamen PDF          Dictamen + planos + 7 formatos
```

Cada agente tiene un rol acotado, un esquema de salida obligatorio y solo el contexto que necesita. Las etapas independientes corren con `Promise.allSettled`: si una falla, las demás siguen y el pipeline llega igualmente a la síntesis.

El progreso viaja por **Server-Sent Events**, de modo que las tarjetas se completan en vivo en lugar de mostrar un spinner durante minutos.

### 5.2 Agentes con perfil doctoral

Los seis agentes comparten un perfil de ingeniero con formación de posgrado y dominio transversal de las ingenierías (civil, estructural, mecánica, eléctrica, electrónica, mecatrónica, hidráulica, neumática, HVAC, industrial, aeronáutica, naval, ferroviaria y de fluidos) y de las disciplinas afines. Cada afirmación debe sostenerse en un principio físico, una norma vigente o un dato del documento; lo que no se sostiene se declara como supuesto.

### 5.3 Salida estructurada obligatoria

Ningún agente devuelve texto libre: se declara una herramienta con su `input_schema`, se fija `tool_choice` y el argumento se valida con Zod. Si falla, se reintenta **una vez pasándole el error concreto**:

```ts
tool_choice: { type: "tool", name: herramienta },   // el modelo no puede evadirlo
…
const resultado = validador.safeParse(bloque.input);
if (resultado.success) return resultado.data;
// si no, se reinyecta el error de validación como tool_result y se reintenta
```

### 5.4 La aritmética no la hace el modelo

Los LLM estiman precios bien y multiplican mal. El precio unitario lo propone el modelo; el importe, el total y el riesgo global se calculan en código, y si la matriz de precio unitario no cuadra se ajustan los indirectos.

### 5.5 Diagramas técnicos reales

El agente proyectista **no dibuja**: devuelve la topología del diagrama —qué elementos hay, dónde van sobre una rejilla lógica y cómo se conectan—. El renderizador de la aplicación la convierte en un plano con:

- **Simbología normalizada** (IEC/NEMA en eléctrico, ISO 1219 en neumático, ISA 5.1 en instrumentación): más de 50 símbolos dibujados en SVG.
- **Ruteo ortogonal** en L, como se traza un unifilar o un P&ID de verdad.
- **Cajetín** con título, proyecto, escala y fecha, y marco de plano.
- **Anticolisión**: separación elíptica entre elementos, con más holgura vertical porque bajo cada símbolo van su etiqueta y sus datos.

Esa separación entre *qué hay* (modelo) y *cómo se dibuja* (código) es lo que hace que la salida se parezca a un plano y no a un boceto.

Tipos disponibles: unifilar eléctrico, isométrico hidráulico, esquema neumático, diagrama mecánico, esquemático electrónico, P&ID, climatización, bloques, planta esquemática y esquema estructural.

### 5.6 Trece disciplinas, tres envergaduras

Arquitectura · Civil y estructural · Mecánica · Mecatrónica · Eléctrica · Electrónica · Hidráulica y sanitaria · Neumática · HVAC · Aeronáutica · Naval · Ferroviaria · Ingeniería de fluidos.

Cada disciplina declara su normativa de referencia, sus entregables característicos y qué diagramas le son propios, de modo que el sistema no propone un unifilar en un proyecto de estructuras. La envergadura calibra el alcance, el número de partidas y cuántos planos se dibujan.

### 5.7 Ingesta múltiple y multiformato

Hasta 10 archivos por análisis, en PDF, Word, Excel, CSV, HTML, DXF, IFC, JSON y texto. Los formatos técnicos no se convierten a prosa: de un **DXF** se extraen capas, bloques y anotaciones; de un **IFC**, la jerarquía espacial y los elementos por tipo. Es lo que miraría primero un proyectista.

### 5.8 Exportación a siete formatos

PDF (dictamen completo), Word (.docx generado con OOXML propio, sin librería), CSV, HTML (informe autocontenido con los planos incrustados), **DXF**, **IFC** y SVG.

> **Sobre `.rvt`**: es un formato binario propietario que solo Revit puede escribir; ningún sistema lo genera por API. Se produce **DXF** —que AutoCAD abre y Revit importa— e **IFC**, el estándar abierto de intercambio BIM que Revit lee sin conversión. Es la vía habitual en la industria.

### 5.9 Chat sobre el documento (RAG léxico)

Recuperación **BM25** implementada desde cero, sin base vectorial ni servicios externos. Para un solo documento por sesión el emparejamiento léxico rinde mejor —consulta y texto comparten vocabulario literal: `NOM-001-SEDE`, `f'c=250`, `tablero`— y es auditable: la interfaz muestra qué fragmentos se usaron.

### 5.10 Degradación elegante

Si la cuenta agota su cuota de API, el sistema lo detecta (por mensaje, 429, 529 o 402), lo dice en la interfaz y **continúa con el caso de demostración** en lugar de romperse. Un límite de facturación no es un fallo del código y no debería dejar la herramienta inservible.

### 5.11 Seguridad

- JWT HS256 en cookie `httpOnly`, `sameSite=lax`, `secure` en producción, 8 horas.
- `proxy.ts` protege el área privada y las API de negocio en el Edge.
- Limitador por IP en ventana deslizante: 10 accesos/5 min, 8 análisis/30 min, 5 proyectos/30 min, 30 preguntas/15 min.
- Validación en toda frontera: tipo, tamaño (15 MB por archivo), número de archivos y longitud de texto.
- Mensaje de error de acceso genérico: no revela si el usuario existe.

---

## 6. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
| --- | --- | --- |
| El modelo da topología, el código dibuja | Pedirle SVG al modelo | Un plano necesita simbología consistente y ruteo predecible; eso es trabajo de código, no de generación |
| Servidor sin estado, historial en `localStorage` | Base de datos con los análisis | Un pliego contiene información comercial sensible. Coste asumido: no se sincroniza entre dispositivos |
| Autenticación propia con JWT | Proveedor externo de identidad | Una sola cuenta pública de evaluación; un proveedor habría añadido dependencia y superficie sin aportar nada |
| BM25 | Base vectorial con embeddings | Un documento por sesión, recuperación explicable, cero servicios externos |
| SSE | WebSocket | Flujo unidireccional servidor→cliente, sin infraestructura extra |
| DXF + IFC | Intentar `.rvt` | `.rvt` no es generable sin Revit; DXF e IFC son los formatos de intercambio reales |
| OOXML a mano para Word | Librería `docx` | Un `.docx` es un ZIP con tres XML: generarlo directo evita 200 kB de bundle |
| Degradar a demostración ante cuota agotada | Mostrar el error y parar | La herramienta debe seguir siendo evaluable aunque la cuenta se quede sin crédito |
| Tema claro corporativo | Oscuro adaptativo | Es un entregable ejecutivo: se lee, se imprime y se lleva a un comité |

---

## 7. Pruebas

```bash
npm test
```

**36 pruebas, 9 suites, todas en verde.** Cubren la lógica determinista:

- Normalización aritmética del presupuesto (importes, matrices descuadradas, redondeo de punto flotante).
- Consolidación del riesgo global, incluida la escalada por acumulación.
- Tokenización, fragmentación por páginas y recuperación BM25, con casos sin coincidencias y documento vacío.
- Firma y verificación de sesión, token manipulado y cookie ausente.
- Limitador de peticiones por clave.
- Detección de errores de cuota, distinguiéndolos de los errores de programación.
- Esquemas Zod frente a entradas inválidas y coherencia de los datos de demostración.

No se prueba la salida del modelo: no es determinista y una aserción sobre ella fallaría sin que nada estuviera roto. Lo que sí se verifica es que **cualquier cosa que el modelo devuelva quede normalizada y validada** antes de llegar a la interfaz.

---

## 8. Verificación de ejecuciones reales

Ejecutadas contra el despliegue de producción con `claude-sonnet-5`:

| Métrica | Análisis de documento | Proyecto eléctrico |
| --- | --- | --- |
| Tiempo del pipeline | 1 min 58 s | ~3 min |
| Requerimientos | 16 | 17 |
| Partidas | 27 | 28 |
| Hallazgos normativos | 14 | 14 |
| Diagramas generados | — | 2 |
| **Incoherencias aritméticas** | **0** | **0** |
| Partidas con supuesto declarado | 21 de 27 | 21 de 28 |

Entre lo que el sistema detectó por su cuenta y el documento fuente no mencionaba: ausencia de puesta a tierra y pararrayos, falta de diseño estructural ante viento huracanado —relevante por tratarse de zona ciclónica—, ausencia de protección contra incendio en el cuarto de máquinas y omisión de la memoria de cálculo que valide la subestación existente.

En el unifilar generado para una planta de tratamiento, la jerarquía resultó correcta (acometida → medición → transformador → interruptor general → tablero general → derivados) con calibres coherentes entre tramos (4/0 AWG, 350 kcmil, 250 kcmil).

---

## 9. Limitaciones conocidas

- **PDF escaneados**: se requiere texto seleccionable. Un plano escaneado sin OCR se rechaza con un mensaje explícito.
- **DXF y DWG**: se lee DXF (texto). El DWG binario no se parsea; hay que exportar a DXF desde el CAD.
- **`.rvt`**: no se genera, por lo explicado arriba. Se entrega DXF e IFC.
- **Diagramas**: son esquemas de anteproyecto, no planos de ejecución. No llevan escala real ni geometría acotada.
- **Precios**: el agente estima a valor de mercado desde el conocimiento del modelo; no consulta una base de precios viva.
- **Normativa**: el prompt obliga a poner `null` en el artículo antes que inventarlo, pero toda referencia debe verificarse.
- **Limitador en memoria**: por instancia; en un despliegue con varias haría falta un almacén compartido.

---

## 10. Aviso

ANDRES Engineering AI produce un **anteproyecto y un análisis preliminar asistidos por IA**. No sustituye el criterio ni la firma de un responsable técnico, y sus cifras y planos no tienen validez contractual ni constructiva sin validación profesional. La aplicación lo advierte en la interfaz y en cada documento que genera.

---

## Licencia

MIT — ver [LICENSE](LICENSE).
