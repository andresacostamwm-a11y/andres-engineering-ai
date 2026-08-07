# Guion del vídeo de presentación

**Duración objetivo: 3 min 22 s** — coincide exactamente con `demo-editado.mp4`.
Basta con reproducir el vídeo y narrar encima siguiendo las marcas de tiempo.

**Autor:** Heber Andres Acosta Jimenez
**Proyecto:** DIEM Copilot — TFM Máster en Desarrollo con IA, BIG School

---

## Cómo grabar

1. Abre `video/demo-editado.mp4` a pantalla completa.
2. Graba la pantalla con audio de micrófono (QuickTime: *Archivo → Nueva grabación de pantalla*, elegir micrófono en el menú de opciones; o Loom, OBS, ScreenStudio).
3. Narra siguiendo las marcas. Los tiempos ya están ajustados al vídeo: no hay que pausar.
4. Si quieres salir en cámara, activa la webcam en esquina (opcional según las bases).

> Consejo: lee el guion una vez en voz alta antes de grabar y marca dónde respiras. El texto está escrito para decirse, no para leerse.

---

## Guion

### 0:00 — 0:12 · Portada

> Hola, soy Heber Andrés Acosta. Este es DIEM Copilot, mi trabajo de fin de máster.
>
> Es un sistema de cuatro agentes de inteligencia artificial que lee un pliego de obra y devuelve un dictamen técnico completo.

*(En pantalla: portada, el titular «El pliego dice una cosa. Lo que cuesta es otra».)*

---

### 0:12 — 0:30 · El problema

> El problema que resuelve viene de mi trabajo diario en ingeniería. Antes de decidir si competimos por una obra, alguien tiene que leerse el pliego completo, extraer qué se exige, cuantificar, presupuestar y revisar qué normativa aplica. Son entre tres y cinco días.
>
> Y lo caro no es lo que el pliego dice: es lo que calla. La partida que la ley obliga y el documento no menciona.

*(En pantalla: sección del problema, las tres cifras.)*

---

### 0:30 — 0:45 · Acceso y arranque

> La aplicación tiene acceso con una cuenta de demostración pública, que dejo indicada en la documentación y en la propia pantalla.
>
> Aquí uso el documento de ejemplo: el alcance de obra de la ampliación de una nave industrial en Cancún.

*(En pantalla: login, entrada al área de trabajo, clic en «Usar documento de ejemplo».)*

---

### 0:45 — 1:05 · El pipeline (tramo acelerado ×6)

> Y aquí está la parte interesante. No es una llamada a un chat: son cuatro agentes especializados.
>
> El primero extrae los requerimientos. Su salida alimenta en paralelo a dos agentes que no dependen entre sí: uno presupuesta y otro revisa normativa. Y un cuarto agente sintetiza el dictamen final.
>
> El progreso que ves llega por Server-Sent Events, así que las tarjetas se completan en vivo en lugar de mostrar un spinner. Este tramo va acelerado seis veces: en real, el pipeline tarda unos dos minutos.

*(En pantalla: las cuatro tarjetas de agentes completándose, con el rótulo «×6».)*

---

### 1:05 — 1:35 · Qué produjo

> Con este documento extrajo dieciséis requerimientos, generó veintisiete partidas de presupuesto y encontró catorce hallazgos normativos.
>
> El resumen ejecutivo lo encabeza todo: cinco millones trescientos mil pesos estimados, y riesgo global crítico.

*(En pantalla: pipeline completo y resumen ejecutivo.)*

---

### 1:35 — 2:05 · El presupuesto y sus supuestos

> El presupuesto no es una lista de precios. Cada partida abre su matriz de precio unitario: materiales, mano de obra, equipo e indirectos.
>
> Y algo que me importaba mucho: cuando el agente tiene que suponer una cantidad porque el documento no la da, lo escribe en la partida. Un presupuesto con supuestos declarados es útil; uno con cifras inventadas y silenciadas es peligroso.
>
> La aritmética, además, no la hace el modelo. Los modelos de lenguaje estiman precios bien y multiplican mal, así que el importe, el total y el riesgo global se calculan en código.

*(En pantalla: catálogo de conceptos, matriz de precio unitario desplegada, supuestos en ámbar.)*

---

### 2:05 — 2:35 · Hallazgos y evidencia

> Los hallazgos normativos van ordenados por riesgo, con la norma y una acción concreta.
>
> Lo que más me interesa de este bloque es que el sistema detecta también lo que el documento **omite**. En esta ejecución señaló que falta el sistema de tierra física y pararrayos, que no hay diseño estructural ante viento huracanado —y estamos en zona ciclónica— y que no se contempla protección contra incendio en el cuarto de máquinas.
>
> Y cada requerimiento guarda la cita textual del documento que lo respalda. Sin cita no hay requerimiento. Eso convierte la herramienta en algo auditable en lugar de algo que hay que creer.

*(En pantalla: lista de hallazgos y despliegue de una evidencia.)*

---

### 2:35 — 2:55 · Chat sobre el documento

> También se puede preguntar directamente al documento. La recuperación es BM25 implementado desde cero, sin base vectorial ni servicios externos: para un solo documento por sesión, el emparejamiento léxico rinde mejor y además es explicable — se ve exactamente qué fragmentos se usaron.
>
> El prompt lo obliga a responder solo con lo que el documento dice. Si no está, contesta que no está.

*(En pantalla: pregunta sobre la subestación y respuesta con cita y fragmentos.)*

---

### 2:55 — 3:10 · El dictamen en PDF

> Todo se exporta a un dictamen en PDF de cinco páginas, con resumen, presupuesto, hallazgos y supuestos. Se genera en el navegador, porque el documento nunca llega a almacenarse en el servidor: un pliego contiene información comercial sensible y esa fue una decisión de arquitectura consciente.

*(En pantalla: descarga y vista del PDF.)*

---

### 3:10 — 3:22 · Cierre

> El código está en GitHub, la aplicación desplegada en Vercel y la presentación completa en la ruta barra slides.
>
> Está construido con Next.js dieciséis, TypeScript, Claude Sonnet y treinta y una pruebas unitarias. Gracias por verlo.

*(En pantalla: slides del proyecto.)*

---

## Datos por si te preguntan

| Dato | Valor |
| --- | --- |
| Tiempo real del pipeline | 1 min 58 s |
| Requerimientos / partidas / hallazgos | 16 / 27 / 14 |
| Incoherencias aritméticas | 0 |
| Pruebas | 31, todas en verde |
| Modelo | claude-sonnet-5 |
| Coste aproximado por análisis | unos 0.15 USD |

> Nota: los recuentos varían ligeramente entre ejecuciones porque el modelo no es determinista. El vídeo muestra una ejecución real contra el despliegue de producción, no una simulación.

---

## Dónde subirlo

YouTube **como «no listado»** es la opción más cómoda: no aparece en búsquedas pero cualquiera con el enlace puede verlo, que es justo lo que pide el formulario de entrega. Google Drive con enlace público también sirve.

Después, pega la URL en:
1. El formulario de entrega del máster.
2. La tabla de enlaces del `README.md` (marcador `<!--VIDEO-->`).
