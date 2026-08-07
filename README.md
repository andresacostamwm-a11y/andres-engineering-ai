# ANDRES Engineering AI

**Sistema multiagente que convierte un pliego de obra en un dictamen técnico: requerimientos con evidencia, presupuesto con precios unitarios y hallazgos normativos.**

Trabajo de Fin de Máster · Máster en Desarrollo con IA · BIG School
Autor: **Heber Andres Acosta Jimenez** — andresacosta.mwm@gmail.com

---

## Enlaces del proyecto

| Recurso | Enlace |
| --- | --- |
| Aplicación desplegada | **https://diem-copilot.vercel.app** |
| Repositorio | https://github.com/andresacostamwm-a11y/diem-copilot |
| Presentación (slides) | https://diem-copilot.vercel.app/slides |
| Vídeo de presentación | _(pendiente de publicar — ver `docs/guion-video.md`)_ |

**Credenciales de prueba** (aparecen también en la propia pantalla de acceso):

```
Usuario:    demo@diem.mx
Contraseña: TFMdemo2026
```

---

## 1. Descripción general

Antes de decidir si compite por una obra, un equipo de ingeniería dedica entre tres y cinco días a la misma tarea: leer el pliego, extraer qué se exige, cuantificar, presupuestar y comprobar qué normativa aplica. Es un trabajo caro, repetitivo y —lo peor— propenso a que se escape justo lo que no está escrito: la partida que la ley obliga pero el documento no menciona.

**ANDRES Engineering AI** automatiza ese primer barrido. Se le entrega un PDF (pliego, alcance de obra o memoria descriptiva) y devuelve, en unos dos minutos:

1. **Los requerimientos técnicos**, cada uno con la cita textual del documento que lo respalda y la página donde aparece.
2. **Un catálogo de conceptos** con matriz de precio unitario desglosada en materiales, mano de obra, equipo e indirectos, y los supuestos declarados cuando el documento no da una cantidad.
3. **Los hallazgos de cumplimiento normativo** contra el marco mexicano (NOM-001-SEDE, NOM-STPS, reglamentos de construcción), incluidos los hallazgos *por ausencia*: lo que debería estar especificado y no lo está.
4. **Un resumen ejecutivo** con el riesgo global consolidado y las acciones recomendadas, exportable a **PDF**.

Además incorpora un **chat sobre el documento** con recuperación de fragmentos, que responde únicamente con lo que el texto dice y muestra en qué fragmentos se apoyó.

El resultado no sustituye a un responsable técnico: le ahorra el primer barrido y le señala dónde mirar. Toda la interfaz y el PDF generado lo advierten explícitamente.

### Por qué este proyecto

El máster es agnóstico en cuanto a qué construir, así que elegí un problema que conozco de primera mano por mi actividad profesional en ingeniería y dirección de proyectos. Eso permitió dos cosas que un proyecto genérico no habría permitido: escribir prompts con criterio de dominio real (un ingeniero de costos sabe que los indirectos rondan el 15-25%) y **evaluar la calidad de la salida**, que en un sistema con LLM es la parte difícil.

---

## 2. Stack tecnológico

| Capa | Tecnología | Por qué |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router) + React 19 | Server Components para no enviar al cliente lo que no hace falta, y Route Handlers para el streaming |
| Lenguaje | **TypeScript 5** en modo estricto | Los contratos entre agentes están tipados de extremo a extremo |
| Estilos | **Tailwind CSS 4** con `@theme` | Sistema de diseño en tokens CSS, sin archivo de configuración JS |
| IA | **Anthropic SDK** · `claude-sonnet-5` | Tool use forzado para salida estructurada; streaming para el chat |
| Validación | **Zod 4** | Valida en la frontera todo lo que devuelve el modelo |
| Autenticación | **jose** (JWT HS256) + cookie httpOnly | Sin proveedor externo: la app es *stateless* por diseño |
| PDF entrada | **unpdf** | PDF.js compilado sin dependencias nativas, funciona en serverless |
| PDF salida | **jsPDF** + **jspdf-autotable** | El dictamen se genera en el cliente: el documento nunca vuelve al servidor |
| Tipografía | IBM Plex Sans / Mono | Diseñada para documentación técnica; cifras tabulares en las tablas |
| Pruebas | **node:test** nativo | 31 pruebas sin añadir una sola dependencia de desarrollo |
| Despliegue | **Vercel** | Runtime Node.js para el pipeline, Edge para la protección de rutas |

---

## 3. Instalación y ejecución

### Requisitos

- Node.js 20 o superior (probado en 25)
- npm

### Puesta en marcha

```bash
git clone https://github.com/andresacostamwm-a11y/diem-copilot.git
cd diem-copilot
npm install
cp .env.example .env.local
npm run dev
```

La aplicación queda en `http://localhost:3000`. Entra con las credenciales de prueba.

> **Sin API key también funciona.** Si `ANTHROPIC_API_KEY` está vacía, la aplicación arranca en **modo demostración**: el pipeline recorre exactamente las mismas cuatro etapas con un caso real precargado, y la interfaz lo indica. Así se puede evaluar el flujo completo sin consumir cuota.

### Para analizar documentos propios

Añade tu clave a `.env.local`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
AUTH_SECRET=$(openssl rand -hex 32)
```

### Comandos disponibles

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm start` | Sirve la compilación de producción |
| `npm test` | 31 pruebas unitarias (node:test) |
| `npm run typecheck` | Comprobación de tipos sin emitir |
| `npm run lint` | ESLint |

---

## 4. Estructura del proyecto

```
diem-copilot/
├── app/
│   ├── page.tsx                     Portada pública: problema, arquitectura, decisiones
│   ├── login/page.tsx               Acceso con credenciales de demostración
│   ├── app/page.tsx                 Área de trabajo (protegida)
│   ├── layout.tsx                   Tipografía y metadatos
│   ├── globals.css                  Sistema de diseño en tokens
│   └── api/
│       ├── auth/login/route.ts      Firma la cookie de sesión
│       ├── auth/logout/route.ts     La invalida
│       ├── extraer/route.ts         PDF → texto (multipart, no persiste nada)
│       ├── agentes/analizar/route.ts  Pipeline completo por Server-Sent Events
│       └── chat/route.ts            Chat con recuperación de fragmentos (streaming)
│
├── lib/
│   ├── agentes/
│   │   ├── orquestador.ts           Coordina las tres etapas y emite eventos
│   │   ├── extractor.ts             Agente 1 — requerimientos con evidencia
│   │   ├── costos.ts                Agente 2 — presupuesto + normalización aritmética
│   │   ├── normativo.ts             Agente 3 — hallazgos + consolidación de riesgo
│   │   ├── sintesis.ts              Agente 4 — resumen ejecutivo
│   │   └── comun.ts                 Fragmentos de JSON Schema compartidos
│   ├── anthropic.ts                 Tool use forzado, validación y reintento
│   ├── schemas.ts                   Esquemas Zod de toda salida del modelo
│   ├── types.ts                     Contratos compartidos servidor ↔ cliente
│   ├── rag.ts                       Fragmentación y recuperación BM25
│   ├── auth.ts                      JWT HS256
│   ├── limite.ts                    Limitador de peticiones por IP
│   ├── pdf.ts                       Extracción de texto de PDF
│   ├── exportar-pdf.ts              Generación del dictamen
│   ├── almacen.ts                   Historial en localStorage
│   ├── demo.ts                      Caso de demostración
│   └── formato.ts                   Formato de moneda y fechas
│
├── components/
│   ├── Taller.tsx                   Estado del área de trabajo, consumo del SSE
│   ├── PanelAgentes.tsx             Progreso del pipeline en tiempo real
│   ├── Resultados.tsx               Resumen, presupuesto, hallazgos, requerimientos
│   ├── ChatDocumento.tsx            Chat con fuentes desplegables
│   ├── ZonaCarga.tsx                Carga por arrastre o selección
│   ├── FormularioAcceso.tsx         Acceso
│   ├── Insignias.tsx                Semáforo de riesgo y disciplinas
│   └── Marca.tsx                    Isotipo y logotipo
│
├── app/slides/page.tsx              Presentación del TFM (14 diapositivas)
├── tests/logica.test.ts             31 pruebas de la lógica determinista
├── proxy.ts                         Protección de rutas en el Edge
└── docs/guion-video.md              Guion cronometrado del vídeo
```

---

## 5. Funcionalidades principales

### 5.1 Pipeline de cuatro agentes

```
                 ┌──────────────┐
   PDF ────────► │  Extractor   │  Etapa 1 (secuencial)
                 └──────┬───────┘
                        │ requerimientos
              ┌─────────┴─────────┐
              ▼                   ▼
        ┌──────────┐        ┌────────────┐   Etapa 2 (paralelo)
        │  Costos  │        │ Normativo  │
        └─────┬────┘        └──────┬─────┘
              │  partidas          │ hallazgos
              └─────────┬──────────┘
                        ▼
                 ┌──────────────┐
                 │   Síntesis   │  Etapa 3
                 └──────┬───────┘
                        ▼
                    Dictamen PDF
```

Cada agente tiene un rol acotado, un esquema de salida obligatorio y solo el contexto que necesita. Costos y normativo no dependen el uno del otro, así que corren en paralelo con `Promise.allSettled`: si uno falla, el otro sigue y el pipeline llega igualmente a la síntesis con lo que sí se produjo.

El progreso viaja al navegador por **Server-Sent Events**, de modo que las tarjetas de los agentes se van completando en vivo en lugar de mostrar un spinner opaco durante dos minutos.

### 5.2 Salida estructurada obligatoria

Ningún agente devuelve texto libre. Se declara una herramienta con su `input_schema`, se fija `tool_choice` para que el modelo esté obligado a invocarla, y el argumento devuelto se valida con Zod. Si la validación falla, se reintenta **una vez pasándole al modelo el error concreto** para que se corrija:

```ts
mensajes.push(
  { role: "assistant", content: respuesta.content },
  { role: "user", content: [{
      type: "tool_result",
      tool_use_id: bloque.id,
      is_error: true,
      content: `La estructura no es válida: ${...}. Vuelve a llamar a la herramienta corrigiendo esos campos.`,
  }]},
);
```

### 5.3 La aritmética no la hace el modelo

Los LLM estiman precios bien y multiplican mal. El precio unitario lo propone el modelo; el importe, el total del presupuesto y el riesgo global se calculan en código:

```ts
// lib/agentes/costos.ts
importe: redondear(p.cantidad * p.precioUnitario)
```

Si la matriz de precio unitario no suma el precio unitario declarado, se ajustan los indirectos para que cuadre. En la ejecución real documentada más abajo, las 26 partidas generadas quedaron con aritmética exacta.

### 5.4 Evidencia obligatoria

El extractor está obligado por prompt a citar textualmente el documento en cada requerimiento. Sin cita, no hay requerimiento. En la interfaz, cada renglón despliega su cita y la página, para poder auditarlo contra el original.

### 5.5 Chat sobre el documento (RAG léxico)

El documento se fragmenta con solape y se recupera con **BM25** implementado desde cero, sin dependencias ni servicios externos.

**Por qué BM25 y no embeddings:** el corpus es un solo documento por sesión, así que no hay nada que amortizar indexando; en documentos técnicos la consulta y el texto comparten vocabulario literal (`NOM-001-SEDE`, `f'c=250`, `tablero`), que es justo donde el emparejamiento léxico rinde mejor; y es auditable — la interfaz muestra qué fragmentos se recuperaron y de qué página.

El prompt obliga a responder solo con los fragmentos entregados y a decir "el documento no especifica esto" cuando no está.

### 5.6 Exportación del dictamen a PDF

Documento de 5 páginas con encabezado, resumen ejecutivo, tabla de metadatos, recomendaciones numeradas, catálogo de conceptos con total, hallazgos con su nivel de riesgo en color y supuestos. Se genera **en el navegador**: coherente con no enviar el documento al servidor.

### 5.7 Autenticación y protección

- JWT HS256 firmado con `jose`, en cookie `httpOnly`, `sameSite=lax`, `secure` en producción, vigencia de 8 horas.
- `proxy.ts` (el antiguo `middleware.ts`, renombrado en Next.js 16) protege `/app` y las tres API de negocio en el Edge, antes de renderizar.
- Limitador de peticiones por IP en ventana deslizante: 10 accesos/5 min, 8 análisis/30 min, 30 preguntas/15 min. Evita que la cuenta de demostración pública agote la cuota de la API.
- Validación de entrada en toda frontera: tipo MIME, tamaño máximo (12 MB), longitud mínima y máxima de texto.
- El mensaje de error de acceso es genérico a propósito: no revela si el usuario existe.

### 5.8 Modo demostración

Si el despliegue no tiene `ANTHROPIC_API_KEY`, el orquestador recorre las mismas etapas con un caso real anonimizado, marcando la salida como demostración en la interfaz y en el PDF. La aplicación nunca queda inservible por falta de cuota.

---

## 6. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
| --- | --- | --- |
| Servidor sin estado, historial en `localStorage` | Base de datos con los análisis | Un pliego contiene información comercial sensible. El coste asumido: el historial no se sincroniza entre dispositivos |
| Autenticación propia con JWT | Supabase Auth / NextAuth | La app no tiene usuarios reales, solo una cuenta pública de evaluación. Un proveedor externo habría añadido dependencia y superficie sin aportar nada |
| BM25 | Base vectorial con embeddings | Un documento por sesión; recuperación explicable; cero servicios externos |
| SSE | WebSocket | El flujo es unidireccional servidor→cliente y no requiere infraestructura extra en Vercel |
| Cuatro agentes especializados | Una sola llamada larga | Roles acotados producen prompts más precisos, permiten paralelizar y aíslan los fallos: si costos falla, normativo sigue |
| Tema oscuro único | Claro/oscuro adaptativo | Es una herramienta de trabajo prolongado, no una pieza expresiva. La decisión se toma una vez y se ejecuta bien |

---

## 7. Pruebas

```bash
npm test
```

**31 pruebas, 8 suites, todas en verde.** Cubren la lógica determinista:

- Normalización aritmética del presupuesto (importes, matrices descuadradas, redondeo de punto flotante).
- Consolidación del riesgo global, incluida la escalada por acumulación de hallazgos altos.
- Tokenización, fragmentación por páginas y recuperación BM25, con casos de consulta sin coincidencias y documento vacío.
- Firma y verificación de sesión, token manipulado y cookie ausente.
- Limitador de peticiones por clave.
- Esquemas Zod frente a entradas inválidas.
- Coherencia interna de los datos de demostración.

No se prueba la salida del modelo: no es determinista y una aserción sobre ella fallaría sin que nada estuviera roto. Lo que sí se verifica es que **cualquier cosa que el modelo devuelva quede normalizada y validada** antes de llegar a la interfaz.

---

## 8. Verificación de una ejecución real

Ejecución completa sobre el alcance de obra de ejemplo (nave industrial de 525 m², Cancún), con `claude-sonnet-5`:

| Métrica | Resultado |
| --- | --- |
| Tiempo total del pipeline | 1 min 58 s |
| Requerimientos extraídos | 17 (7 críticos) |
| Partidas presupuestadas | 26 |
| Importes con aritmética incoherente | **0** |
| Matrices que no suman su precio unitario | **0** |
| Partidas con supuesto declarado | 21 de 26 |
| Hallazgos normativos | 14 (2 críticos, 5 altos, 5 medios, 2 bajos) |
| Presupuesto estimado | $4,902,090 MXN |
| PDF generado | 5 páginas |

Entre los hallazgos que el sistema detectó por su cuenta y el documento fuente no mencionaba: ausencia de sistema de puesta a tierra y pararrayos, falta de diseño estructural ante viento huracanado —relevante por tratarse de zona ciclónica—, ausencia de protección contra incendio en el cuarto de máquinas y omisión de la memoria de cálculo que valide la capacidad de la subestación existente.

---

## 9. Limitaciones conocidas

- **PDF escaneados**: se requiere texto seleccionable. Un plano escaneado sin OCR se rechaza con un mensaje explícito. Integrar OCR es la siguiente evolución natural.
- **Precios de referencia**: el agente de costos estima a valor de mercado a partir del conocimiento del modelo, no consulta una base de precios viva. Para uso contractual habría que conectarlo a un catálogo propio.
- **Normativa**: el modelo cita el marco mexicano habitual, pero el prompt le obliga a poner `null` en el artículo antes que inventarlo. Toda referencia normativa debe verificarse.
- **Limitador en memoria**: al ser por instancia, en un despliegue con varias instancias haría falta un almacén compartido.
- **Documentos muy largos**: por encima de 400.000 caracteres se recorta conservando principio y final, que es donde suelen estar alcance y anexos.

---

## 10. Aviso

ANDRES Engineering AI produce un **análisis preliminar asistido por IA**. No sustituye el criterio ni la firma de un responsable técnico, y sus cifras no tienen validez contractual sin validación profesional. La aplicación lo advierte en la interfaz y en cada PDF que genera.

---

## Licencia

MIT — ver [LICENSE](LICENSE).
