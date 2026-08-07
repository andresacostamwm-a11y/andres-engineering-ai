# Guion del vídeo de presentación

**Duración: 3 min 14 s** — coincide exactamente con `video/demo-editado.mp4`.
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


### 0:00 — 0:14 · Portada

> Hola, soy Heber Andrés Acosta. Este es ANDRES Engineering AI, mi trabajo de fin de máster: un sistema de seis agentes que audita documentación de obra y proyecta desde cero en trece disciplinas de ingeniería.

*(En pantalla: portada con la marca y el titular.)*

---

### 0:14 — 0:30 · El problema

> El problema viene de mi trabajo en ingeniería. Antes de competir por una obra hay que leerse el pliego, cuantificar, presupuestar y revisar normativa. Y lo caro no es lo que el pliego dice: es lo que calla.

*(En pantalla: sección del problema, las tres cifras.)*

---

### 0:30 — 0:55 · Proyectar desde cero

> Aquí no subo un documento: proyecto desde cero. Describo una red hidrosanitaria para un hotel de ciento veinte habitaciones, elijo la disciplina y la envergadura. Cada disciplina trae su propia normativa y sus propios planos.

*(En pantalla: formulario: nombre, ubicación, descripción, las 13 disciplinas y la envergadura.)*

---

### 0:56 — 1:20 · Los seis agentes

> Al generar arrancan seis agentes. El primero redacta el alcance de obra a partir de mi descripción. Después se extraen los requerimientos, y en paralelo corren costos, normativa y el proyectista que dibuja los planos.

*(En pantalla: las seis tarjetas de agentes arrancando.)*

---

### 1:20 — 1:45 · Generación (tramo acelerado ×7)

> Este tramo va acelerado siete veces: en real tarda unos tres minutos. El progreso llega por Server Sent Events, así que cada tarjeta se completa en vivo con su recuento en lugar de mostrar un spinner.

*(En pantalla: pipeline completándose, con el rótulo ×7.)*

---

### 1:46 — 2:14 · Los planos — lo diferencial

> Y este es el resultado que más me importa: un diagrama de tubería e instrumentación con simbología normalizada, cajetín y notas de plano. La clave está en que el modelo no dibuja: devuelve la topología, y el trazo lo pone el código. Por eso sale un plano y no un boceto.

*(En pantalla: el P&ID con cajetín y notas de plano.)*

---

### 2:15 — 2:39 · Presupuesto y supuestos

> El presupuesto abre la matriz de precio unitario de cada partida, y cuando el agente supone una cantidad lo escribe. La aritmética no la hace el modelo: el importe, el total y el riesgo global se calculan en código.

*(En pantalla: catálogo de conceptos, matriz de precio unitario y filtro por disciplina.)*

---

### 2:39 — 3:00 · Exportación

> Todo se exporta a siete formatos: PDF, Word, CSV, HTML, SVG, y para CAD y BIM, DXF e IFC. El punto ere ve te no se puede generar sin Revit, así que se entrega el estándar abierto que Revit sí lee.

*(En pantalla: menú Exportar con los siete formatos.)*

---

### 3:00 — 3:14 · Cierre

> El código está en GitHub y la aplicación desplegada en Vercel. Next punto jota ese dieciséis, TypeScript, Claude Sonnet y treinta y seis pruebas unitarias. Gracias por verlo.

*(En pantalla: diapositivas del proyecto.)*

---

## Datos por si te preguntan

| Dato | Valor |
| --- | --- |
| Agentes | 6, con perfil doctoral y dominio transversal |
| Disciplinas | 13 |
| Tipos de diagrama | 10, con más de 50 símbolos normalizados |
| Formatos de entrada | PDF, Word, Excel, CSV, HTML, DXF, IFC, JSON, texto |
| Formatos de salida | PDF, Word, CSV, HTML, DXF, IFC, SVG |
| Pruebas | 36, todas en verde |
| Incoherencias aritméticas | 0 en las ejecuciones verificadas |
| Modelo | claude-sonnet-5 |

> El vídeo muestra una ejecución real contra el despliegue de producción. El único
> retoque es que el tramo de espera va acelerado ×7, y el propio vídeo lo rotula.

> **Si te preguntan por `.rvt`**: no es generable sin Revit —ningún sistema lo
> escribe por API—. Se entrega DXF, que AutoCAD abre y Revit importa, e IFC, el
> estándar abierto que Revit lee sin conversión.

---

## Dónde subirlo

YouTube **como «no listado»**: no aparece en búsquedas pero cualquiera con el enlace lo ve, que es lo que pide el formulario. Google Drive con enlace público también sirve.

Después pega la URL en:
1. El formulario de entrega del máster.
2. La tabla de enlaces del `README.md`.
