# Guion del vídeo de presentación

**Duración: 3 min 32 s** — coincide exactamente con `video/demo-editado.mp4`.
Reproduce el vídeo y narra encima siguiendo las marcas de tiempo.

**Autor:** Heber Andres Acosta Jimenez
**Proyecto:** ANDRES Engineering AI — TFM Máster en Desarrollo con IA, BIG School

---

## Cómo grabar

1. Abre `video/demo-editado.mp4` a pantalla completa.
2. Graba pantalla con micrófono (QuickTime → *Nueva grabación de pantalla*, eligiendo el micrófono; o Loom, OBS, ScreenStudio).
3. Narra siguiendo las marcas. Los tiempos ya están ajustados: no hay que pausar.
4. Salir en cámara es opcional según las bases.

> Lee el guion una vez en voz alta antes de grabar. Está escrito para decirse, no para leerse.

---

## Guion


### 0:00 — 0:18 · Portada

> Hola, soy Heber Andrés Acosta. Este es ANDRES Engineering AI, mi trabajo de fin de máster: un sistema de seis agentes que audita documentación de obra y proyecta desde cero en trece disciplinas de ingeniería.

*(En pantalla: portada holográfica con la marca y el titular.)*

---

### 0:18 — 0:38 · El problema

> El problema viene de mi trabajo en ingeniería. Antes de competir por una obra hay que leerse el pliego, cuantificar, presupuestar y revisar normativa: entre tres y cinco días. Y lo caro no es lo que el pliego dice, es lo que calla.

*(En pantalla: sección del problema, las tres cifras.)*

---

### 0:39 — 1:04 · Proyectar desde cero

> Aquí no subo un documento: proyecto desde cero. Describo una red hidrosanitaria y contra incendio para un hotel de ciento veinte habitaciones, y elijo disciplina y envergadura. Cada disciplina trae su normativa y sus propios planos.

*(En pantalla: formulario: nombre, ubicación, descripción, las 13 disciplinas y la envergadura.)*

---

### 1:05 — 1:27 · Los seis agentes

> Al generar arrancan seis agentes con perfil doctoral. El primero redacta el alcance de obra. Después se extraen los requerimientos, y en paralelo corren costos, normativa y el proyectista que dibuja los planos.

*(En pantalla: las seis tarjetas de agentes arrancando.)*

---

### 1:28 — 1:50 · Generación (tramo acelerado ×6)

> Este tramo va acelerado seis veces. El progreso llega por Server Sent Events, así que cada tarjeta se completa en vivo con su recuento real en lugar de mostrar un spinner opaco.

*(En pantalla: pipeline completándose, con el rótulo ×6.)*

---

### 1:51 — 2:19 · Los planos — lo diferencial

> Y este es el resultado que más me importa: un plano de la red con simbología normalizada, cajetín y notas citando normativa. La clave está en que el modelo no dibuja: devuelve la topología, y el trazo lo pone el código. Por eso sale un plano y no un boceto.

*(En pantalla: el plano de la red con cajetín y notas.)*

---

### 2:20 — 2:44 · Presupuesto y supuestos

> El presupuesto abre la matriz de precio unitario de cada partida, y cuando el agente supone una cantidad lo escribe. La aritmética no la hace el modelo: el importe, el total y el riesgo global se calculan en código.

*(En pantalla: catálogo de conceptos, matriz de precio unitario y filtro por disciplina.)*

---

### 2:45 — 3:07 · Exportación

> Todo se exporta a siete formatos: PDF, Word, CSV, HTML, SVG, y para CAD y BIM, DXF e IFC. El punto ere ve te no se puede generar sin Revit, así que se entrega el estándar abierto que Revit sí lee.

*(En pantalla: menú Exportar con los siete formatos.)*

---

### 3:08 — 3:31 · Temas y cierre

> La interfaz tiene dos temas, holográfico y ejecutivo. El código está en GitHub y la aplicación desplegada en Vercel: Next punto jota ese dieciséis, TypeScript, y cuarenta y una pruebas unitarias. Gracias por verlo.

*(En pantalla: cambio de tema y diapositivas del proyecto.)*

---

## Datos por si te preguntan

| Dato | Valor |
| --- | --- |
| Agentes | 6, con perfil doctoral y dominio transversal |
| Disciplinas | 13 · Tipos de diagrama | 10, con más de 50 símbolos normalizados |
| Formatos de entrada | PDF, Word, Excel, CSV, HTML, DXF, IFC, JSON, texto |
| Formatos de salida | PDF, Word, CSV, HTML, DXF, IFC, SVG |
| Proveedores de IA | Claude y Gemini, con cambio automático si uno agota su cuota |
| Pruebas | 41, todas en verde |
| Incoherencias aritméticas | 0 en las ejecuciones verificadas |

> El vídeo muestra una ejecución real contra el despliegue de producción. El único
> retoque es que el tramo de espera va acelerado ×6, y el propio vídeo lo rotula.

> **Si te preguntan por `.rvt`**: no es generable sin Revit —ningún sistema lo
> escribe por API—. Se entrega DXF, que AutoCAD abre y Revit importa, e IFC, el
> estándar abierto que Revit lee sin conversión.

---

## Dónde subirlo

YouTube **como «no listado»**: no aparece en búsquedas pero cualquiera con el enlace lo ve, que es lo que pide el formulario. Google Drive con enlace público también sirve.

Después pega la URL en:
1. El formulario de entrega del máster.
2. La tabla de enlaces del `README.md`.
