# ANDRES Engineering AI

**Engineering Document Analysis & Project Intelligence** — sistema multiagente que audita documentación de obra y proyecta desde cero en trece disciplinas de ingeniería: extrae requerimientos con su evidencia, presupuesta con matrices de precio unitario, revisa el cumplimiento normativo, **redacta la memoria técnica** y **dibuja el paquete completo de planos** del proyecto, con maqueta 3D navegable.

Trabajo de Fin de Máster · Máster en Desarrollo con IA · BIG School
Autor: **Heber Andres Acosta Jimenez** — andresacosta.mwm@gmail.com

---

## Enlaces del proyecto

| Recurso | Enlace |
| --- | --- |
| Aplicación desplegada | **https://andres-engineering-ai.vercel.app** |
| Repositorio | https://github.com/andresacostamwm-a11y/andres-engineering-ai |
| Presentación (slides, 17 diapositivas) | https://andres-engineering-ai.vercel.app/slides |
| Presentación en PDF | `slides/ANDRES-Engineering-AI-presentacion.pdf` |
| Vídeo de presentación | _(pendiente de publicar — ver `guion-video.md`)_ |

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

Incorpora además un **chat sobre el documento** que responde con lo que el texto dice y muestra los fragmentos en los que se apoyó, y un **modo de consulta a internet** para lo que el documento no cubre.

### Proyectar desde cero

Se describe qué se quiere construir, se elige **disciplina** (13) y **envergadura** (pequeña, mediana o gran envergadura), y el sistema:

1. **Redacta el alcance de obra** numerable a partir de la descripción.
2. Ejecuta sobre él el mismo pipeline de análisis.
3. **Redacta la memoria técnica**: descriptiva y de cálculo, por instalación, con criterios de diseño y cálculos justificativos.
4. **Dibuja el paquete completo de láminas** de la disciplina, con simbología normalizada, cajetín y ruteo ortogonal, cada una con su **maqueta 3D navegable**.
5. Exporta todo a **PDF, Word, CSV, HTML, DXF, IFC y SVG**, y cada lámina además a SVG, DXF o PNG por separado.

### Por qué este proyecto

Elegí un problema que conozco de primera mano por mi actividad profesional en ingeniería y dirección de proyectos. Eso permitió dos cosas que un proyecto genérico no habría permitido: escribir prompts con criterio de dominio real y, sobre todo, **evaluar la calidad de la salida**, que en un sistema con LLM es la parte difícil.

---

## 2. Stack tecnológico

| Capa | Tecnología | Por qué |
| --- | --- | --- |
| Framework | **Next.js 16.3** (App Router) + React 19.2 | Server Components, Route Handlers para streaming y Edge para proteger rutas |
| Lenguaje | **TypeScript 5** estricto | Contratos tipados de extremo a extremo entre agentes |
| Estilos | **Tailwind CSS 4** con `@theme` | Sistema de diseño en tokens, sin archivo de configuración JS |
| IA | **Tres proveedores intercambiables**: Anthropic SDK 0.115 (`claude-sonnet-5`), Gemini vía REST (`gemini-2.5-flash`) y OpenAI vía REST (`gpt-5.1`) | Salida estructurada forzada en los tres; si uno agota su cuota, se pasa al siguiente sin intervención |
| Validación | **Zod 4** | Valida en la frontera todo lo que devuelve el modelo, sea cual sea el proveedor |
| Autenticación | **jose 6** (JWT HS256) + cookie httpOnly | Sin proveedor externo: la app es *stateless* por diseño |
| 3D | **three.js 0.185** con import dinámico | Maqueta navegable por lámina; se carga solo al abrirla |
| Ingesta | **unpdf**, **mammoth**, **exceljs** + parsers propios | PDF, Word, Excel; DXF, IFC, CSV y HTML con extractores escritos para el caso |
| Salida | **jsPDF** + `jspdf-autotable`, OOXML y generadores propios | PDF, Word, CSV, HTML, DXF, IFC y SVG, todo en el cliente |
| Diagramas | SVG generado por la aplicación | El modelo aporta la topología; el trazo lo pone el código |
| Iconografía | **lucide-react**, `clsx` | Interfaz consistente sin librería de componentes |
| Tipografía | IBM Plex Sans / Mono | Diseñada para documentación técnica; cifras tabulares |
| Pruebas | **node:test** nativo con `--experimental-strip-types` | 41 pruebas sin una sola dependencia de desarrollo |
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
npm run dev
```

La aplicación queda en `http://localhost:3000`. Entra con las credenciales de prueba.

### Variables de entorno

Todas son opcionales: sin ninguna, la aplicación arranca y funciona en modo demostración. Se declaran en `.env.local` para desarrollo y en el panel de Vercel para producción.

| Variable | Para qué | Predeterminado |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Habilita el proveedor Claude | — (sin ella, Claude se marca no disponible) |
| `GEMINI_API_KEY` | Habilita el proveedor Gemini | — |
| `OPENAI_API_KEY` | Habilita el proveedor OpenAI | — |
| `PROVEEDOR_IA` | Cuál se intenta primero: `claude`, `gemini` u `openai` | orden `claude → gemini → openai` |
| `MODELO_TRABAJO` | Modelo de Claude | `claude-sonnet-5` |
| `MODELO_GEMINI` | Modelo de Gemini | `gemini-2.5-flash` |
| `MODELO_OPENAI` | Modelo de OpenAI | `gpt-5.1` |
| `AUTH_SECRET` | Clave de firma del JWT de sesión y de la cookie de motor | valor de desarrollo |
| `DEMO_USER` · `DEMO_PASSWORD` | Credenciales de la cuenta de evaluación | `demo@diem.mx` / `TFMdemo2026` |
| `CLAVE_MOTOR` | Contraseña para cambiar el motor de IA desde la interfaz | — (sin ella el selector queda bloqueado) |
| `CLAVE_HISTORIAL` | Contraseña para abrir el historial de proyectos | — |

> **Sin ninguna API key también funciona.** Si no hay proveedor configurado —o si todos han agotado su cuota— la aplicación recorre las mismas etapas con un caso real precargado y lo indica en la interfaz. Nunca se queda inservible.

### Comandos disponibles

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm start` | Sirve la compilación de producción |
| `npm test` | 41 pruebas unitarias en 10 suites (node:test) |
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
│   ├── slides/page.tsx                Presentación del TFM (17 diapositivas)
│   ├── layout.tsx                     Tema, tipografía y restauración sin parpadeo
│   ├── icon.png · opengraph-image.png Identidad e imagen al compartir
│   └── api/
│       ├── auth/login · auth/logout   Sesión
│       ├── extraer/route.ts           Ingesta multiformato y múltiple
│       ├── agentes/analizar/route.ts  Pipeline de análisis (SSE)
│       ├── proyecto/generar/route.ts  Pipeline de proyecto (SSE)
│       ├── proyecto/diagrama/route.ts Lámina bajo demanda
│       ├── modelos/route.ts           Catálogo en vivo de motores disponibles
│       ├── modelos/elegir/route.ts    Cambio de motor con contraseña
│       ├── historial/clave/route.ts   Apertura del historial con contraseña
│       └── chat/route.ts              Chat con recuperación y modo internet
│
├── lib/
│   ├── agentes/
│   │   ├── orquestador.ts             Pipeline de análisis
│   │   ├── orquestador-proyecto.ts    Pipeline de proyecto
│   │   ├── comun.ts                   Perfil compartido de los agentes
│   │   ├── programa.ts                Agente 1 — alcance de obra
│   │   ├── extractor.ts               Agente 2 — requerimientos con evidencia
│   │   ├── costos.ts                  Agente 3 — presupuesto + normalización
│   │   ├── normativo.ts               Agente 4 — hallazgos + riesgo
│   │   ├── memoria.ts                 Agente 5 — memoria descriptiva y de cálculo
│   │   ├── proyectista.ts             Agente 6 — topología de las láminas
│   │   └── sintesis.ts                Agente 7 — resumen ejecutivo
│   ├── modelo/
│   │   ├── index.ts                   Selección de proveedor, validación y relevo por cuota
│   │   ├── claude.ts                  Cliente Anthropic (tool use forzado + búsqueda web)
│   │   ├── gemini.ts                  Cliente Gemini (function calling + grounding)
│   │   ├── openai.ts                  Cliente OpenAI
│   │   ├── esquema.ts                 Traducción de JSON Schema al dialecto de Gemini
│   │   ├── preferencia.ts             Motor elegido por cookie firmada (AsyncLocalStorage)
│   │   └── tipos.ts                   Contrato común a todo proveedor
│   ├── diagramas/tipos.ts             Modelo de datos de un plano (63 símbolos)
│   ├── extractores/index.ts           PDF, Word, Excel, CSV, HTML, DXF, IFC, JSON, texto
│   ├── exportadores/                  CSV, HTML, DXF, IFC, SVG y Word (OOXML)
│   ├── exportar-pdf.ts                Dictamen en PDF
│   ├── exportar-memoria-pdf.ts        Memoria técnica en PDF
│   ├── disciplinas.ts                 13 disciplinas con normativa y diagramas
│   ├── pipeline-def.ts                Definición del pipeline, compartida servidor/cliente
│   ├── rag.ts                         Fragmentación y recuperación BM25
│   └── …                              auth, límite, formato, almacén, demo, pdf, schemas
│
├── components/
│   ├── diagramas/Plano.tsx            Renderizador de planos
│   ├── diagramas/Simbolos.tsx         Biblioteca de simbología normalizada
│   ├── diagramas/Lamina.tsx           Lámina con descargas propias (SVG/DXF/PNG)
│   ├── diagramas/Vista3D.tsx          Maqueta 3D navegable (three.js dinámico)
│   ├── diagramas/AccesoPlanos.tsx     Botonera de planos por especialidad
│   ├── diagramas/GenerarPlano.tsx     Generación de una lámina bajo demanda
│   ├── CrearProyecto.tsx              Formulario y resultados de proyecto
│   ├── MemoriaPanel.tsx               Memoria técnica y sus exportaciones
│   ├── SalaControl.tsx                Pantalla dividida de cuatro paneles
│   ├── ConsultaWeb.tsx                Consulta directa a internet con fuente
│   ├── BotonHistorial.tsx             Historial de proyectos y análisis
│   ├── SelectorMotor.tsx              Elección de motor IA con contraseña
│   ├── SelectorTema.tsx               Conmutador holográfico / ejecutivo claro
│   ├── Taller.tsx                     Área de análisis de documentos
│   ├── Diapositivas.tsx               Navegación de la presentación
│   └── …                              paneles de agentes, tablas, chat, marca, carga
│
└── tests/
    ├── logica.test.ts                 41 pruebas de la lógica determinista
    └── manual/                        Guiones de comprobación manual (costos, diagrama,
                                       exportadores, pdf, programa)
```

---

## 5. Funcionalidades principales

### 5.1 Pipeline de agentes

```
Analizar documentos          Crear proyecto
─────────────────────        ──────────────────────────────────────────
                             programa (alcance de obra)
                                   │
extractor  ←── documentos    extractor
     │                             │
 ┌───┴────┐             ┌──────┬───┴────┬───────────┐
 ▼        ▼             ▼      ▼        ▼           ▼
costos  normativo    costos normativo memoria  proyectista
 └───┬────┘             └──────┴───┬────┴───────────┘
     ▼                             ▼
  síntesis                      síntesis
     ▼                             ▼
 Dictamen PDF     Dictamen + memoria + paquete de láminas + 7 formatos
```

Cada agente tiene un rol acotado, un esquema de salida obligatorio y solo el contexto que necesita. Las etapas independientes corren con `Promise.allSettled`: si una falla, las demás siguen y el pipeline llega igualmente a la síntesis.

El progreso viaja por **Server-Sent Events**, de modo que las tarjetas se completan en vivo en lugar de mostrar un spinner durante minutos.

### 5.2 Agentes con perfil doctoral

Los siete agentes comparten un perfil de ingeniero con formación de posgrado y dominio transversal de las ingenierías (civil, estructural, mecánica, eléctrica, electrónica, mecatrónica, hidráulica, neumática, HVAC, industrial, aeronáutica, naval, ferroviaria y de fluidos) y de las disciplinas afines. Cada afirmación debe sostenerse en un principio físico, una norma vigente o un dato del documento; lo que no se sostiene se declara como supuesto.

### 5.3 Salida estructurada obligatoria

Ningún agente devuelve texto libre: se declara una herramienta con su esquema de entrada, se obliga al modelo a invocarla y el argumento se valida con Zod. Si falla, se reintenta **una vez pasándole el error concreto**:

```ts
tool_choice: { type: "tool", name: herramienta },   // el modelo no puede evadirlo
…
const resultado = validador.safeParse(respuesta.argumentos);
if (resultado.success) return resultado.data;
// si no, se reinyecta el error de validación y se reintenta
```

### 5.4 Tres proveedores de IA con relevo automático

La aplicación no habla con un proveedor concreto: habla con un contrato (`lib/modelo/tipos.ts`) que Claude, Gemini y OpenAI implementan por igual. La capa `lib/modelo/index.ts` decide el orden —el declarado en `PROVEEDOR_IA`, luego Claude, Gemini y OpenAI— y si un proveedor devuelve un error de cuota (429, 529, 402 o mensaje de saldo agotado) **continúa con el siguiente sin que el usuario haga nada**. Solo cuando ninguno responde se pasa a modo demostración.

El coste de esa portabilidad es una traducción: Gemini no acepta el mismo JSON Schema que Anthropic. `lib/modelo/esquema.ts` convierte los tipos `nullable`, elimina las claves que Gemini no reconoce y conserva `enum`, `required` y los arrays anidados. Esa conversión tiene su propia suite de pruebas.

### 5.5 Selector de motor con catálogo real y candado

`/api/modelos` consulta la lista de modelos **que cada API key sirve de verdad** —no una lista escrita a mano— y la cachea una hora. El selector solo ofrece motores invocables.

Cambiar de motor exige contraseña (`CLAVE_MOTOR`). El servidor la valida en `/api/modelos/elegir` y emite una **cookie httpOnly firmada** (JWT con `AUTH_SECRET`); `preferenciaDeCookie` verifica la firma, de modo que una cookie fabricada a mano se ignora. La preferencia viaja por la petición con `AsyncLocalStorage`, sin ensuciar las firmas de los agentes.

### 5.6 La aritmética no la hace el modelo

Los LLM estiman precios bien y multiplican mal. El precio unitario lo propone el modelo; el importe, el total y el riesgo global se calculan en código, y si la matriz de precio unitario no cuadra se ajustan los indirectos.

### 5.7 Memoria técnica

El agente de memoria produce el documento que un despacho entrega junto a los planos: objeto, antecedentes, normativa aplicable y, por instalación, memoria descriptiva y de cálculo en tabla concepto / método / datos / resultado. Se exporta a PDF propio, Word y HTML. Es lo que convierte un anteproyecto dibujado en un anteproyecto defendible.

### 5.8 Diagramas técnicos reales

El agente proyectista **no dibuja**: devuelve la topología del diagrama —qué elementos hay, dónde van sobre una rejilla lógica y cómo se conectan—. El renderizador de la aplicación la convierte en un plano con:

- **Simbología normalizada** (IEC/NEMA en eléctrico, ISO 1219 en neumático, ISA 5.1 en instrumentación): **63 símbolos** dibujados en SVG, agrupados en siete familias (eléctricos, hidráulicos y de fluidos, neumáticos, mecánicos, electrónicos, HVAC, control y genéricos).
- **Ruteo ortogonal** en L, como se traza un unifilar o un P&ID de verdad, con seis tipos de conexión (eléctrica, tubería, aire, ducto, señal, mecánica).
- **Cajetín** con título, proyecto, escala y fecha, y marco de plano.
- **Anticolisión**: separación elíptica entre elementos, con más holgura vertical porque bajo cada símbolo van su etiqueta y sus datos.

Esa separación entre *qué hay* (modelo) y *cómo se dibuja* (código) es lo que hace que la salida se parezca a un plano y no a un boceto.

Diez tipos disponibles: unifilar eléctrico, isométrico hidráulico, esquema neumático, diagrama mecánico, esquemático electrónico, P&ID, climatización, bloques, planta esquemática y esquema estructural.

### 5.9 Paquete completo de láminas y planos bajo demanda

Un proyecto no genera una o dos láminas de muestra: genera **todo el paquete de la disciplina, en paralelo**, porque ninguna depende de otra. La envergadura calibra la densidad de cada lámina, no cuántas hay.

Sobre eso, una **botonera por especialidad** —civiles, eléctricos, electrónicos, mecánicos, hidráulicos, HVAC y sanitarios— que desplaza hasta la lámina si ya existe y la genera al momento (`/api/proyecto/diagrama`) si no. «Sanitarios» comparte tipo con hidráulicos pero lleva instrucción de enfoque propia: bajantes, ramales, pendientes, registros y descarga al colector, sin red de agua potable.

Cada lámina trae sus propias descargas —**SVG, DXF y PNG**— sin pasar por el menú global.

### 5.10 Maqueta 3D navegable

Cada lámina se puede ver como maqueta 3D: el mismo modelo topológico que dibuja el plano, extruido en volúmenes según la familia del símbolo (torre, tanque, equipo, instrumento, área). `three.js` se carga con import dinámico solo al abrir la vista, para no imponer 150 kB a quien nunca la use. La órbita automática está siempre activa y el botón la pausa.

### 5.11 Trece disciplinas, tres envergaduras

Arquitectura · Civil y estructural · Mecánica · Mecatrónica · Eléctrica · Electrónica · Hidráulica y sanitaria · Neumática · HVAC · Aeronáutica · Naval · Ferroviaria · Ingeniería de fluidos.

Cada disciplina declara su normativa de referencia, sus entregables característicos y qué diagramas le son propios, de modo que el sistema no propone un unifilar en un proyecto de estructuras. La envergadura —pequeña, mediana o gran envergadura— calibra el alcance, el número de partidas y la densidad de cada lámina.

### 5.12 Ingesta múltiple y multiformato

Hasta 10 archivos por análisis, en PDF, Word (`.docx`), Excel (`.xlsx`, `.xls`), CSV, HTML, DXF, IFC, JSON y texto (`.txt`, `.md`). Los formatos técnicos no se convierten a prosa: de un **DXF** se extraen capas, bloques y anotaciones; de un **IFC**, la jerarquía espacial y los elementos por tipo. Es lo que miraría primero un proyectista.

### 5.13 Exportación a siete formatos

PDF (dictamen completo y memoria técnica), Word (.docx generado con OOXML propio, sin librería), CSV, HTML (informe autocontenido con los planos incrustados), **DXF**, **IFC** y SVG.

> **Sobre `.rvt`**: es un formato binario propietario que solo Revit puede escribir; ningún sistema lo genera por API. Se produce **DXF** —que AutoCAD abre y Revit importa— e **IFC**, el estándar abierto de intercambio BIM que Revit lee sin conversión. Es la vía habitual en la industria.

### 5.14 Chat sobre el documento (RAG léxico) y consulta a internet

Recuperación **BM25** implementada desde cero, sin base vectorial ni servicios externos. Para un solo documento por sesión el emparejamiento léxico rinde mejor —consulta y texto comparten vocabulario literal: `NOM-001-SEDE`, `f'c=250`, `tablero`— y es auditable: la interfaz muestra qué fragmentos se usaron.

Cuando el documento no cubre la pregunta, o en el modo de consulta directa, el chat sale a internet declarando la fuente: búsqueda web nativa en Claude (`web_search`) y *grounding* con Google Search en Gemini.

### 5.15 Sala de control de cuatro pantallas

Un botón divide la pantalla en cuatro paneles —chat, información del proyecto, acceso a internet y planos— cada uno con su propio scroll y con opción de ocultarse o ampliarse. Cuatro distribuciones: cuadrícula 2×2, tres columnas, panel principal con fila inferior y lista a lo ancho.

### 5.16 Historial de proyectos

Los proyectos y análisis se guardan en el navegador (últimos 20) y se reabren desde un modal en la cabecera, protegido por contraseña (`CLAVE_HISTORIAL`). El servidor la valida en `/api/historial/clave`; la autorización vive en `sessionStorage` y caduca al cerrar la pestaña.

### 5.17 Dos temas visuales

**Holográfico** (predeterminado) y **ejecutivo claro**, conmutables desde la cabecera. La elección se guarda en el navegador y un script en `layout.tsx` la aplica antes de pintar, así que no hay parpadeo al cargar. El tema claro es el que se usa para imprimir y llevar a un comité; el holográfico es la identidad visual del proyecto.

### 5.18 Degradación elegante

Si todos los proveedores agotan su cuota, el sistema lo detecta (por mensaje, 429, 529 o 402), lo dice en la interfaz y **continúa con el caso de demostración** en lugar de romperse. Un límite de facturación no es un fallo del código y no debería dejar la herramienta inservible.

### 5.19 Seguridad

- JWT HS256 en cookie `httpOnly`, `sameSite=lax`, `secure` en producción, 8 horas.
- `proxy.ts` protege el área privada y las API de negocio en el Edge.
- La preferencia de motor viaja en cookie **firmada**: fabricarla a mano no sirve.
- Limitador por IP en ventana deslizante:

  | Endpoint | Límite |
  | --- | --- |
  | Acceso | 10 intentos / 5 min |
  | Ingesta de archivos | 20 / 10 min |
  | Análisis de documentos | 8 / 30 min |
  | Generación de proyecto | 5 / 30 min |
  | Lámina bajo demanda | 15 / 30 min |
  | Preguntas al chat | 30 / 15 min |
  | Cambio de motor | 10 / 15 min |
  | Apertura del historial | 10 / 15 min |

  El límite de análisis solo se aplica cuando hay API key: el modo demostración no consume cuota.
- Validación en toda frontera: tipo, tamaño (15 MB por archivo), número de archivos y longitud de texto.
- Mensaje de error de acceso genérico: no revela si el usuario existe.

---

## 6. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
| --- | --- | --- |
| El modelo da topología, el código dibuja | Pedirle SVG al modelo | Un plano necesita simbología consistente y ruteo predecible; eso es trabajo de código, no de generación |
| La maqueta 3D reutiliza la misma topología | Un modelo 3D generado aparte | Una sola fuente de verdad: si el plano cambia, la maqueta cambia con él |
| Capa de proveedor abstracta con relevo por cuota | Acoplarse solo a Anthropic | Un TFM debe poder evaluarse aunque una cuenta se quede sin crédito; el coste es traducir el esquema, y está cubierto por pruebas |
| Catálogo de modelos consultado en vivo | Lista escrita a mano | Una lista fija ofrece modelos que la cuenta no sirve y falla al invocarlos |
| Cookie de motor firmada con JWT | Cookie plana con el nombre del modelo | Sin firma, cualquiera cambia el motor desde el inspector y salta el candado |
| Servidor sin estado, historial en `localStorage` | Base de datos con los análisis | Un pliego contiene información comercial sensible. Coste asumido: no se sincroniza entre dispositivos |
| Autenticación propia con JWT | Proveedor externo de identidad | Una sola cuenta pública de evaluación; un proveedor habría añadido dependencia y superficie sin aportar nada |
| BM25 | Base vectorial con embeddings | Un documento por sesión, recuperación explicable, cero servicios externos |
| SSE | WebSocket | Flujo unidireccional servidor→cliente, sin infraestructura extra |
| DXF + IFC | Intentar `.rvt` | `.rvt` no es generable sin Revit; DXF e IFC son los formatos de intercambio reales |
| OOXML a mano para Word | Librería `docx` | Un `.docx` es un ZIP con tres XML: generarlo directo evita 200 kB de bundle |
| `three.js` con import dinámico | Incluirlo en el bundle principal | Quien nunca abre la maqueta no debería pagar 150 kB por ella |
| Paquete completo de láminas en paralelo | Una o dos por envergadura | Un proyecto se entrega con todos sus planos; la envergadura calibra densidad, no cantidad |
| Degradar a demostración ante cuota agotada | Mostrar el error y parar | La herramienta debe seguir siendo evaluable aunque las cuentas se queden sin crédito |
| Dos temas conmutables, holográfico por defecto | Un solo tema | El holográfico da identidad al proyecto; el claro es el que se imprime y se lleva a un comité. Se resuelve con tokens, no con dos hojas de estilo |

---

## 7. Pruebas

```bash
npm test
```

**41 pruebas, 10 suites, todas en verde.** Cubren la lógica determinista:

| Suite | Qué verifica |
| --- | --- |
| `normalizarPartidas` | Importes, matrices descuadradas y redondeo de punto flotante |
| `riesgoGlobal` | Consolidación del riesgo, incluida la escalada por acumulación |
| `tokenizar` | Normalización léxica de la consulta y del texto |
| `fragmentar y recuperar` | Fragmentación por páginas y BM25, con casos sin coincidencias y documento vacío |
| `autenticación` | Firma y verificación de sesión, token manipulado y cookie ausente |
| `limitador de peticiones` | Ventana deslizante por clave |
| `esquemas de validación` | Zod frente a entradas inválidas |
| `coherencia de los datos de demostración` | Cada matriz suma su precio unitario y el total cuadra con las partidas |
| `detección de errores de cuota` | Distingue el agotamiento de cuota de un error de programación |
| `conversión de esquema a Gemini` | `nullable` de JSON Schema a OpenAPI, claves no reconocidas, `enum`/`required`/arrays anidados y cuota agotada de Gemini |

En `tests/manual/` hay además guiones de comprobación manual (costos, diagrama, exportadores, PDF y programa) para inspeccionar salidas que no tiene sentido asertar automáticamente.

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

Los archivos de muestra de estas ejecuciones se entregan junto a la documentación: `ejemplo-dictamen.pdf`, `ejemplo-plano.dxf` y `ejemplo-modelo.ifc`.

> Estas cifras corresponden a la versión que generaba dos láminas por proyecto. La versión actual entrega el paquete completo de la disciplina, de modo que el número de diagramas y el tiempo de pipeline son mayores.

### Coste por proyecto completo

Estimado sobre ~30k tokens de entrada y ~30k de salida:

| Motor | Coste aproximado |
| --- | --- |
| Gemini 2.5 Flash | ~0.08 USD |
| Claude Sonnet 5 | ~0.54 USD |
| Modelos de gama alta | ~1.80 USD |

---

## 9. Limitaciones conocidas

- **PDF escaneados**: se requiere texto seleccionable. Un plano escaneado sin OCR se rechaza con un mensaje explícito.
- **DXF y DWG**: se lee DXF (texto). El DWG binario no se parsea; hay que exportar a DXF desde el CAD.
- **`.rvt`**: no se genera, por lo explicado arriba. Se entrega DXF e IFC.
- **Diagramas**: son esquemas de anteproyecto, no planos de ejecución. No llevan escala real ni geometría acotada.
- **Maqueta 3D**: es una representación esquemática de la topología, no un modelo BIM ni geometría constructiva.
- **Precios**: el agente estima a valor de mercado desde el conocimiento del modelo; no consulta una base de precios viva.
- **Normativa**: el prompt obliga a poner `null` en el artículo antes que inventarlo, pero toda referencia debe verificarse.
- **Calidad entre proveedores**: el relevo garantiza disponibilidad, no equivalencia. Gemini 2.5 Flash es el respaldo económico y su salida es más escueta que la de Claude Sonnet 5. Las cifras verificadas de la sección 8 corresponden a ejecuciones con Claude.
- **Búsqueda web**: disponible en Claude y Gemini; OpenAI ignora la petición y responde solo con su conocimiento.
- **Limitador en memoria**: por instancia; en un despliegue con varias haría falta un almacén compartido.

---

## 10. Aviso

ANDRES Engineering AI produce un **anteproyecto y un análisis preliminar asistidos por IA**. No sustituye el criterio ni la firma de un responsable técnico, y sus cifras, memorias y planos no tienen validez contractual ni constructiva sin validación profesional. La aplicación lo advierte en la interfaz y en cada documento que genera.

---

## Licencia

MIT — ver [LICENSE](LICENSE).
