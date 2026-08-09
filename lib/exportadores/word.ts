/**
 * Exportación a Word (.docx).
 *
 * Se construye el OOXML mínimo a mano y se comprime con la propia API del
 * navegador (CompressionStream), sin librería de ZIP: un .docx no es más que un
 * ZIP con tres XML dentro, y generarlo así evita añadir 200 kB de dependencia
 * al bundle para producir un documento que Word abre igual.
 */
import type { Proyecto } from "../tipos-proyecto.ts";
import { ETIQUETA_DISCIPLINA, ETIQUETA_RIESGO } from "../types.ts";
import { fichaDisciplina } from "../disciplinas.ts";
import { dineroExacto } from "../formato.ts";
import { MONEDA_POR_DEFECTO } from "../moneda/tipos.ts";
import { filasFichaEconomica } from "../moneda/ficha.ts";
import { descargar, nombreBase } from "./index.ts";

const ACENTO = "155E85";

export async function exportarWord(proyecto: Proyecto): Promise<void> {
  const moneda = proyecto.economia?.moneda ?? MONEDA_POR_DEFECTO;
  const ficha = fichaDisciplina(proyecto.disciplina);
  const cuerpo: string[] = [];

  cuerpo.push(parrafo("ANDRES Engineering AI", { tamano: 18, color: "8794A3", espacioDespues: 60 }));
  cuerpo.push(parrafo(proyecto.nombre, { tamano: 32, negrita: true, espacioDespues: 80 }));
  cuerpo.push(
    parrafo(
      `${ficha.nombre} · ${proyecto.ubicacion || "Ubicación no especificada"} · ${new Date(
        proyecto.creadoEn,
      ).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}`,
      { tamano: 20, color: "5B6B7D", espacioDespues: 240 },
    ),
  );

  if (proyecto.resumen) {
    cuerpo.push(titulo("Resumen ejecutivo"));
    cuerpo.push(
      tabla(
        [["Presupuesto estimado", "Requerimientos", "Partidas", "Riesgo global"]],
        [
          [
            dineroExacto({ valor: proyecto.resumen.totalEstimado, moneda }),
            String(proyecto.requerimientos.length),
            String(proyecto.partidas.length),
            ETIQUETA_RIESGO[proyecto.resumen.riesgoGlobal],
          ],
        ],
        [2600, 2000, 1800, 2400],
      ),
    );
    cuerpo.push(parrafo(proyecto.resumen.sintesis, { espacioAntes: 160, espacioDespues: 160 }));

    // Sin la ficha económica el documento no se puede auditar: qué moneda, qué
    // tipo de cambio, de qué fecha y de qué fuente.
    cuerpo.push(titulo("Condiciones económicas"));
    cuerpo.push(
      tabla(
        [["Concepto", "Valor"]],
        filasFichaEconomica(proyecto.economia).map(([k, v]) => [k, v]),
        [3200, 5600],
      ),
    );

    cuerpo.push(titulo("Acciones recomendadas"));
    proyecto.resumen.recomendaciones.forEach((r, i) =>
      cuerpo.push(parrafo(`${i + 1}. ${r}`, { espacioDespues: 80 })),
    );

    if (proyecto.resumen.supuestos.length > 0) {
      cuerpo.push(titulo("Supuestos del análisis"));
      proyecto.resumen.supuestos.forEach((s) =>
        cuerpo.push(parrafo(`— ${s}`, { tamano: 20, color: "5B6B7D", espacioDespues: 60 })),
      );
    }
  }

  if (proyecto.memoria) {
    const memoria = proyecto.memoria;
    cuerpo.push(titulo("Memoria técnica — objeto"));
    cuerpo.push(parrafo(memoria.objeto, { espacioDespues: 120 }));
    cuerpo.push(titulo("Antecedentes"));
    cuerpo.push(parrafo(memoria.antecedentes, { espacioDespues: 120 }));

    cuerpo.push(titulo("Normativa aplicable"));
    memoria.normativa.forEach((n) =>
      cuerpo.push(parrafo(`— ${n}`, { tamano: 20, espacioDespues: 50 })),
    );

    memoria.sistemas.forEach((sistema) => {
      cuerpo.push(titulo(sistema.nombre));
      cuerpo.push(parrafo(sistema.descripcion, { espacioDespues: 100 }));

      if (sistema.criterios.length > 0) {
        cuerpo.push(parrafo("Criterios de diseño", { negrita: true, tamano: 21, espacioAntes: 120 }));
        sistema.criterios.forEach((c) =>
          cuerpo.push(parrafo(`— ${c}`, { tamano: 19, espacioDespues: 40 })),
        );
      }

      if (sistema.calculos.length > 0) {
        cuerpo.push(parrafo("Memoria de cálculo", { negrita: true, tamano: 21, espacioAntes: 120 }));
        cuerpo.push(
          tabla(
            [["Concepto", "Método", "Datos", "Resultado"]],
            sistema.calculos.map((c) => [c.concepto, c.metodo, c.datos, c.resultado]),
            [2300, 2400, 2300, 2400],
          ),
        );
      }

      if (sistema.especificaciones.length > 0) {
        cuerpo.push(parrafo("Especificaciones", { negrita: true, tamano: 21, espacioAntes: 120 }));
        sistema.especificaciones.forEach((e) =>
          cuerpo.push(parrafo(`— ${e}`, { tamano: 19, espacioDespues: 40 })),
        );
      }
    });

    cuerpo.push(titulo("Conclusiones de la memoria"));
    cuerpo.push(parrafo(memoria.conclusiones, { espacioDespues: 160 }));
  }

  if (proyecto.partidas.length > 0) {
    const total = proyecto.partidas.reduce((s, p) => s + p.importe, 0);
    cuerpo.push(titulo("Catálogo de conceptos"));
    cuerpo.push(
      tabla(
        [["Clave", "Concepto", "Unidad", "Cantidad", "P. unitario", "Importe"]],
        [
          ...proyecto.partidas.map((p) => [
            p.clave,
            p.supuesto ? `${p.concepto}\nSupuesto: ${p.supuesto}` : p.concepto,
            p.unidad,
            p.cantidad.toLocaleString("es-MX"),
            dineroExacto({ valor: p.precioUnitario, moneda }),
            dineroExacto({ valor: p.importe, moneda }),
          ]),
          ["", "TOTAL", "", "", "", dineroExacto({ valor: total, moneda })],
        ],
        [900, 3600, 900, 1100, 1400, 1500],
      ),
    );
  }

  if (proyecto.hallazgos.length > 0) {
    cuerpo.push(titulo("Hallazgos normativos"));
    cuerpo.push(
      tabla(
        [["Riesgo", "Hallazgo", "Norma", "Acción"]],
        proyecto.hallazgos.map((h) => [
          ETIQUETA_RIESGO[h.riesgo],
          `${h.titulo}\n${h.descripcion}`,
          h.articulo ? `${h.norma} — ${h.articulo}` : h.norma,
          h.recomendacion,
        ]),
        [1100, 3400, 2000, 2900],
      ),
    );
  }

  if (proyecto.requerimientos.length > 0) {
    cuerpo.push(titulo("Requerimientos detectados"));
    cuerpo.push(
      tabla(
        [["ID", "Requerimiento", "Disciplina", "Crítico"]],
        proyecto.requerimientos.map((r) => [
          r.id,
          `${r.descripcion}\n"${r.evidencia}"`,
          ETIQUETA_DISCIPLINA[r.disciplina],
          r.critico ? "Sí" : "No",
        ]),
        [900, 4800, 2000, 1000],
      ),
    );
  }

  if (proyecto.verificacion) {
    const v = proyecto.verificacion;
    const etiqueta = {
      entregable: "Entregable",
      "entregable-con-reservas": "Entregable con reservas",
      "requiere-correccion": "Requiere corrección",
    }[v.veredicto];

    cuerpo.push(titulo("Verificación independiente"));
    cuerpo.push(
      parrafo(`Veredicto: ${etiqueta}. Confianza ${v.confianza} de 100.`, {
        negrita: true,
        espacioDespues: 100,
      }),
    );
    if (v.hallazgos.length > 0) {
      cuerpo.push(
        tabla(
          [["Gravedad", "Ámbito", "Hallazgo y evidencia", "Corrección"]],
          v.hallazgos.map((h) => [
            `${ETIQUETA_RIESGO[h.gravedad]} (${h.automatico ? "medido" : "revisión"})`,
            h.ambito,
            `${h.titulo}\n${h.evidencia}`,
            h.correccion,
          ]),
          [1400, 1400, 3900, 2700],
        ),
      );
    }
    v.comprobado.forEach((c) =>
      cuerpo.push(parrafo(`— ${c}`, { tamano: 20, espacioDespues: 50 })),
    );
  }

  if (proyecto.programa && proyecto.programa.actividades.length > 0) {
    const pr = proyecto.programa;
    cuerpo.push(titulo("Programa de obra"));
    cuerpo.push(
      parrafo(
        `Duración total de ${pr.duracionDias} días naturales sobre ${pr.actividades.length} actividades, de las cuales ${pr.rutaCritica.length} están en ruta crítica.`,
        { espacioDespues: 120 },
      ),
    );
    cuerpo.push(
      tabla(
        [["Id", "Actividad", "Frente", "Inicio", "Duración", "Holgura", "Ruta"]],
        pr.actividades.map((a) => [
          a.id,
          a.nombre,
          a.frente,
          `día ${a.inicio}`,
          a.hito ? "hito" : `${a.duracionDias} d`,
          `${a.holgura} d`,
          a.critica ? "Crítica" : "",
        ]),
        [700, 3200, 1800, 900, 1100, 900, 900],
      ),
    );
    pr.supuestos.forEach((sup) =>
      cuerpo.push(parrafo(`— ${sup}`, { tamano: 20, espacioDespues: 50 })),
    );
  }

  if (proyecto.viabilidad) {
    const vi = proyecto.viabilidad;
    cuerpo.push(titulo("Riesgos y viabilidad"));
    cuerpo.push(
      tabla(
        [["Escenario", "Importe", "Nota"]],
        [
          ["Optimista", dineroExacto({ valor: vi.sensibilidad.optimista, moneda }), "Ninguna variable se materializa por completo"],
          ["Base", dineroExacto({ valor: vi.sensibilidad.base, moneda }), "Presupuesto emitido"],
          ["Pesimista", dineroExacto({ valor: vi.sensibilidad.pesimista, moneda }), "Todas las variables al alza a la vez"],
          ["Contingencia sugerida", `${vi.sensibilidad.contingenciaPct} %`, "Sobre el presupuesto base"],
        ],
        [2600, 2600, 4300],
      ),
    );
    cuerpo.push(
      tabla(
        [["Id", "Riesgo", "P × I", "Mitigación"]],
        [...vi.riesgos]
          .sort((a, b) => b.severidad - a.severidad)
          .map((r) => [
            r.id,
            `${r.titulo}\n${r.descripcion}`,
            `${r.probabilidad} × ${r.impacto} = ${r.severidad}`,
            `${r.mitigacion} (${r.responsable})`,
          ]),
        [700, 4200, 1400, 3100],
      ),
    );
    cuerpo.push(parrafo(vi.veredicto, { espacioAntes: 140, espacioDespues: 100 }));
    vi.condiciones.forEach((c) =>
      cuerpo.push(parrafo(`— ${c}`, { tamano: 20, espacioDespues: 50 })),
    );
  }

  if (proyecto.diagramas.length > 0) {
    cuerpo.push(titulo("Planos y diagramas"));
    for (const d of proyecto.diagramas) {
      cuerpo.push(parrafo(d.titulo, { negrita: true, tamano: 22, espacioAntes: 160 }));
      cuerpo.push(parrafo(d.descripcion, { tamano: 20, color: "5B6B7D", espacioDespues: 80 }));
      cuerpo.push(
        tabla(
          [["Elemento", "Símbolo", "Datos técnicos"]],
          d.nodos.map((n) => [`${n.id} · ${n.etiqueta}`, n.simbolo, n.datos.join(" / ") || "—"]),
          [3200, 2400, 3100],
        ),
      );
      d.notas.forEach((n, i) =>
        cuerpo.push(parrafo(`Nota ${i + 1}. ${n}`, { tamano: 19, color: "5B6B7D", espacioAntes: 60 })),
      );
    }
  }

  if (proyecto.alcance) {
    cuerpo.push(titulo("Alcance de obra"));
    proyecto.alcance.split("\n").forEach((linea) =>
      cuerpo.push(parrafo(linea || " ", { tamano: 20, espacioDespues: 40 })),
    );
  }

  cuerpo.push(
    parrafo(
      proyecto.modoDemo
        ? "DOCUMENTO DE DEMOSTRACIÓN. Cifras de ejemplo, sin validez contractual."
        : "Documento generado con asistencia de IA. Requiere validación de un responsable técnico antes de cualquier uso contractual.",
      { tamano: 18, color: "8794A3", espacioAntes: 320 },
    ),
  );

  const documento = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${cuerpo.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body>
</w:document>`;

  const archivos: [string, string][] = [
    [
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
    ],
    [
      "_rels/.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    ],
    ["word/document.xml", documento],
  ];

  const zip = await construirZip(archivos);
  descargar(
    zip,
    `${nombreBase(proyecto)}.docx`,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
}

/* -------------------------------------------------------------- OOXML -- */

function esc(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parrafo(
  texto: string,
  opciones: {
    tamano?: number;
    negrita?: boolean;
    color?: string;
    espacioAntes?: number;
    espacioDespues?: number;
  } = {},
): string {
  const { tamano = 21, negrita, color, espacioAntes = 0, espacioDespues = 100 } = opciones;
  const lineas = texto.split("\n");
  const runs = lineas
    .map(
      (linea, i) =>
        `${i > 0 ? "<w:r><w:br/></w:r>" : ""}<w:r><w:rPr><w:sz w:val="${tamano}"/>${
          negrita ? "<w:b/>" : ""
        }${color ? `<w:color w:val="${color}"/>` : ""}</w:rPr><w:t xml:space="preserve">${esc(linea)}</w:t></w:r>`,
    )
    .join("");

  return `<w:p><w:pPr><w:spacing w:before="${espacioAntes}" w:after="${espacioDespues}"/></w:pPr>${runs}</w:p>`;
}

function titulo(texto: string): string {
  return `<w:p><w:pPr><w:spacing w:before="280" w:after="140"/><w:pBdr><w:bottom w:val="single" w:sz="8" w:color="${ACENTO}"/></w:pBdr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="${ACENTO}"/></w:rPr><w:t>${esc(texto.toUpperCase())}</w:t></w:r></w:p>`;
}

function tabla(cabeceras: string[][], filas: string[][], anchos: number[]): string {
  const celda = (contenido: string, ancho: number, cabecera: boolean) =>
    `<w:tc><w:tcPr><w:tcW w:w="${ancho}" w:type="dxa"/>${
      cabecera ? `<w:shd w:val="clear" w:fill="${ACENTO}"/>` : ""
    }</w:tcPr>${parrafo(contenido, {
      tamano: cabecera ? 17 : 18,
      negrita: cabecera,
      color: cabecera ? "FFFFFF" : undefined,
      espacioDespues: 40,
    })}</w:tc>`;

  const fila = (celdas: string[], cabecera: boolean) =>
    `<w:tr>${celdas.map((c, i) => celda(c, anchos[i] ?? 1500, cabecera)).join("")}</w:tr>`;

  const bordes = `<w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"]
    .map((b) => `<w:${b} w:val="single" w:sz="4" w:color="D8E0E8"/>`)
    .join("")}</w:tblBorders>`;

  return `<w:tbl><w:tblPr><w:tblW w:w="9600" w:type="dxa"/>${bordes}</w:tblPr>${cabeceras
    .map((c) => fila(c, true))
    .join("")}${filas.map((f) => fila(f, false)).join("")}</w:tbl>`;
}

/* ---------------------------------------------------------------- ZIP -- */

/** ZIP sin compresión (método "stored"): válido, simple y suficiente aquí. */
async function construirZip(archivos: [string, string][]): Promise<Blob> {
  const codificador = new TextEncoder();
  const locales: Uint8Array<ArrayBuffer>[] = [];
  const centrales: Uint8Array<ArrayBuffer>[] = [];
  let desplazamiento = 0;

  for (const [nombre, contenido] of archivos) {
    const datos = new Uint8Array(codificador.encode(contenido));
    const nombreBytes = new Uint8Array(codificador.encode(nombre));
    const crc = crc32(datos);

    const cabeceraLocal = new Uint8Array(30 + nombreBytes.length);
    const vistaLocal = new DataView(cabeceraLocal.buffer);
    vistaLocal.setUint32(0, 0x04034b50, true);
    vistaLocal.setUint16(4, 20, true);
    vistaLocal.setUint16(8, 0, true); // stored
    vistaLocal.setUint32(14, crc, true);
    vistaLocal.setUint32(18, datos.length, true);
    vistaLocal.setUint32(22, datos.length, true);
    vistaLocal.setUint16(26, nombreBytes.length, true);
    cabeceraLocal.set(nombreBytes, 30);

    locales.push(cabeceraLocal, datos);

    const cabeceraCentral = new Uint8Array(46 + nombreBytes.length);
    const vistaCentral = new DataView(cabeceraCentral.buffer);
    vistaCentral.setUint32(0, 0x02014b50, true);
    vistaCentral.setUint16(4, 20, true);
    vistaCentral.setUint16(6, 20, true);
    vistaCentral.setUint16(10, 0, true);
    vistaCentral.setUint32(16, crc, true);
    vistaCentral.setUint32(20, datos.length, true);
    vistaCentral.setUint32(24, datos.length, true);
    vistaCentral.setUint16(28, nombreBytes.length, true);
    vistaCentral.setUint32(42, desplazamiento, true);
    cabeceraCentral.set(nombreBytes, 46);
    centrales.push(cabeceraCentral);

    desplazamiento += cabeceraLocal.length + datos.length;
  }

  const tamanoCentral = centrales.reduce((s, c) => s + c.length, 0);
  const fin = new Uint8Array(22);
  const vistaFin = new DataView(fin.buffer);
  vistaFin.setUint32(0, 0x06054b50, true);
  vistaFin.setUint16(8, archivos.length, true);
  vistaFin.setUint16(10, archivos.length, true);
  vistaFin.setUint32(12, tamanoCentral, true);
  vistaFin.setUint32(16, desplazamiento, true);

  const partes: BlobPart[] = [...locales, ...centrales, fin];
  return new Blob(partes, {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

let tablaCrc: Uint32Array | null = null;

function crc32(datos: Uint8Array): number {
  if (!tablaCrc) {
    tablaCrc = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      tablaCrc[i] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < datos.length; i++) {
    crc = (crc >>> 8) ^ tablaCrc[(crc ^ datos[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}
