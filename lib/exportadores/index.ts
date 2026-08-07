/**
 * Exportadores de entregables.
 *
 * Todos generan el archivo en el navegador: el proyecto no vuelve al servidor.
 *
 * Sobre los formatos CAD/BIM: `.rvt` es un formato binario propietario que solo
 * Revit puede escribir, así que no se genera. En su lugar se produce **DXF**
 * —que AutoCAD abre nativamente y Revit importa— e **IFC**, el estándar abierto
 * de intercambio BIM que Revit lee sin conversión. Es la vía habitual en la
 * industria para entregar geometría y datos entre plataformas distintas.
 */
import type { Proyecto } from "../tipos-proyecto.ts";
import type { Diagrama } from "../diagramas/tipos.ts";
import { ETIQUETA_DISCIPLINA, ETIQUETA_RIESGO } from "../types.ts";
import { fichaDisciplina } from "../disciplinas.ts";
import { pesosExactos } from "../formato.ts";

export function descargar(contenido: string | Blob, nombre: string, tipo: string): void {
  const blob =
    typeof contenido === "string" ? new Blob([contenido], { type: tipo }) : contenido;
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

export function nombreBase(proyecto: Proyecto): string {
  return proyecto.nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    .toLowerCase() || "proyecto";
}

/* ------------------------------------------------------------------- CSV -- */

export function exportarCsv(proyecto: Proyecto): void {
  const escapar = (v: string | number) => {
    const s = String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const filas: string[][] = [
    ["Clave", "Concepto", "Disciplina", "Unidad", "Cantidad", "Precio unitario",
     "Materiales", "Mano de obra", "Equipo", "Indirectos", "Importe", "Supuesto"],
    ...proyecto.partidas.map((p) => [
      p.clave, p.concepto, ETIQUETA_DISCIPLINA[p.disciplina], p.unidad,
      String(p.cantidad), String(p.precioUnitario),
      String(p.matriz.materiales), String(p.matriz.manoObra),
      String(p.matriz.equipo), String(p.matriz.indirectos),
      String(p.importe), p.supuesto ?? "",
    ]),
    [],
    ["", "TOTAL", "", "", "", "", "", "", "", "",
     String(proyecto.partidas.reduce((s, p) => s + p.importe, 0)), ""],
  ];

  // BOM para que Excel en Windows reconozca UTF-8 y no rompa los acentos.
  const csv = "﻿" + filas.map((f) => f.map(escapar).join(",")).join("\r\n");
  descargar(csv, `${nombreBase(proyecto)}-presupuesto.csv`, "text/csv;charset=utf-8");
}

/* ------------------------------------------------------------------ HTML -- */

export function exportarHtml(proyecto: Proyecto, svgs: string[]): void {
  const total = proyecto.partidas.reduce((s, p) => s + p.importe, 0);
  const ficha = fichaDisciplina(proyecto.disciplina);
  const e = escaparHtml;

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(proyecto.nombre)} — ANDRES Engineering AI</title>
<style>
  :root { --tinta:#1f2937; --media:#5b6b7d; --acento:#155e85; --borde:#e2e8f0; --laton:#8a6a24; }
  * { box-sizing:border-box }
  body { margin:0; font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
         color:var(--tinta); background:#fbfcfd; }
  .hoja { max-width:1100px; margin:0 auto; padding:48px 32px 80px }
  header { border-bottom:3px solid var(--acento); padding-bottom:20px; margin-bottom:32px }
  h1 { font-size:30px; margin:8px 0 6px; letter-spacing:-.02em }
  h2 { font-size:13px; text-transform:uppercase; letter-spacing:.14em; color:var(--acento);
       border-bottom:1px solid var(--borde); padding-bottom:8px; margin:40px 0 16px }
  .meta { color:var(--media); font-size:14px }
  .rejilla { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:1px;
             background:var(--borde); border:1px solid var(--borde); margin:24px 0 }
  .rejilla div { background:#fff; padding:14px 16px }
  .rejilla dt { font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:var(--media) }
  .rejilla dd { margin:6px 0 0; font-size:20px; font-weight:600; font-variant-numeric:tabular-nums }
  table { width:100%; border-collapse:collapse; font-size:13px; background:#fff }
  th { background:var(--acento); color:#fff; text-align:left; padding:9px 10px; font-size:11px;
       text-transform:uppercase; letter-spacing:.06em }
  td { padding:8px 10px; border-bottom:1px solid var(--borde); vertical-align:top }
  td.n { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap }
  tfoot td { font-weight:700; background:#eef4f8; border-top:2px solid var(--acento) }
  .sup { color:var(--laton); font-size:11px; display:block; margin-top:3px }
  .riesgo { display:inline-block; padding:2px 9px; border-radius:99px; font-size:11px; font-weight:700 }
  .critico{background:#fdecea;color:#a82826} .alto{background:#fdf2e4;color:#a6601a}
  .medio{background:#fbf7e0;color:#8c7612} .bajo{background:#e8f6ef;color:#1e6e4c}
  .plano { border:1px solid var(--borde); background:#fff; margin:20px 0; overflow-x:auto }
  .plano svg { display:block; width:100%; min-width:900px; height:auto }
  .nota { background:#fff; border-left:3px solid var(--acento); padding:12px 16px; margin:10px 0;
          font-size:14px; color:var(--media) }
  pre { white-space:pre-wrap; font:14px/1.7 inherit; color:var(--media); background:#fff;
        border:1px solid var(--borde); padding:20px }
  footer { margin-top:56px; padding-top:20px; border-top:1px solid var(--borde);
           font-size:12px; color:var(--media) }
  @media print { body{background:#fff} .hoja{padding:0} h2{page-break-after:avoid} table{page-break-inside:auto} }
</style>
</head>
<body>
<div class="hoja">
<header>
  <div class="meta">ANDRES Engineering AI · Engineering Document Analysis &amp; Project Intelligence</div>
  <h1>${e(proyecto.nombre)}</h1>
  <div class="meta">${e(ficha.nombre)} · ${e(proyecto.ubicacion || "Ubicación no especificada")} · ${new Date(proyecto.creadoEn).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</div>
</header>

${proyecto.resumen ? `
<dl class="rejilla">
  <div><dt>Presupuesto estimado</dt><dd>${pesosExactos(proyecto.resumen.totalEstimado)}</dd></div>
  <div><dt>Requerimientos</dt><dd>${proyecto.requerimientos.length}</dd></div>
  <div><dt>Partidas</dt><dd>${proyecto.partidas.length}</dd></div>
  <div><dt>Riesgo global</dt><dd><span class="riesgo ${proyecto.resumen.riesgoGlobal}">${ETIQUETA_RIESGO[proyecto.resumen.riesgoGlobal]}</span></dd></div>
</dl>

<h2>Resumen ejecutivo</h2>
<p>${e(proyecto.resumen.sintesis)}</p>

<h2>Acciones recomendadas</h2>
<ol>${proyecto.resumen.recomendaciones.map((r) => `<li>${e(r)}</li>`).join("")}</ol>
` : ""}

${svgs.length > 0 ? `<h2>Planos y diagramas</h2>
${proyecto.diagramas.map((d, i) => `
  <h3 style="font-size:15px;margin:24px 0 4px">${e(d.titulo)}</h3>
  <div class="meta" style="font-size:13px">${e(d.descripcion)}</div>
  <div class="plano">${svgs[i] ?? ""}</div>
  ${d.notas.map((n) => `<div class="nota">${e(n)}</div>`).join("")}
`).join("")}` : ""}

${proyecto.partidas.length > 0 ? `<h2>Catálogo de conceptos</h2>
<table>
  <thead><tr><th>Clave</th><th>Concepto</th><th>Unidad</th><th style="text-align:right">Cantidad</th><th style="text-align:right">P.U.</th><th style="text-align:right">Importe</th></tr></thead>
  <tbody>${proyecto.partidas.map((p) => `<tr>
    <td>${e(p.clave)}</td>
    <td>${e(p.concepto)}${p.supuesto ? `<span class="sup">Supuesto: ${e(p.supuesto)}</span>` : ""}</td>
    <td>${e(p.unidad)}</td>
    <td class="n">${p.cantidad.toLocaleString("es-MX")}</td>
    <td class="n">${pesosExactos(p.precioUnitario)}</td>
    <td class="n">${pesosExactos(p.importe)}</td></tr>`).join("")}</tbody>
  <tfoot><tr><td colspan="5" style="text-align:right">TOTAL</td><td class="n">${pesosExactos(total)}</td></tr></tfoot>
</table>` : ""}

${proyecto.hallazgos.length > 0 ? `<h2>Hallazgos normativos</h2>
<table>
  <thead><tr><th>Riesgo</th><th>Hallazgo</th><th>Norma</th><th>Acción</th></tr></thead>
  <tbody>${proyecto.hallazgos.map((h) => `<tr>
    <td><span class="riesgo ${h.riesgo}">${ETIQUETA_RIESGO[h.riesgo]}</span></td>
    <td><strong>${e(h.titulo)}</strong><br><span class="meta">${e(h.descripcion)}</span></td>
    <td>${e(h.norma)}${h.articulo ? `<br><span class="meta">${e(h.articulo)}</span>` : ""}</td>
    <td>${e(h.recomendacion)}</td></tr>`).join("")}</tbody>
</table>` : ""}

${proyecto.requerimientos.length > 0 ? `<h2>Requerimientos</h2>
<table>
  <thead><tr><th>ID</th><th>Requerimiento</th><th>Disciplina</th><th>Crítico</th></tr></thead>
  <tbody>${proyecto.requerimientos.map((r) => `<tr>
    <td>${e(r.id)}</td>
    <td>${e(r.descripcion)}<span class="sup">“${e(r.evidencia)}”</span></td>
    <td>${ETIQUETA_DISCIPLINA[r.disciplina]}</td>
    <td>${r.critico ? "Sí" : "No"}</td></tr>`).join("")}</tbody>
</table>` : ""}

${proyecto.alcance ? `<h2>Alcance de obra</h2><pre>${e(proyecto.alcance)}</pre>` : ""}

<footer>
  Documento generado por ANDRES Engineering AI el ${new Date().toLocaleString("es-MX")}.
  ${proyecto.modoDemo ? "DOCUMENTO DE DEMOSTRACIÓN, sin validez contractual." : "Análisis asistido por IA: requiere validación de un responsable técnico antes de cualquier uso contractual."}
</footer>
</div>
</body>
</html>`;

  descargar(html, `${nombreBase(proyecto)}.html`, "text/html;charset=utf-8");
}

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ------------------------------------------------------------------- DXF -- */

/**
 * Genera un DXF R12 con el diagrama: capas por tipo de elemento, símbolos como
 * geometría y las conexiones como polilíneas. R12 es el dialecto más compatible:
 * lo abre cualquier CAD desde 1990 y Revit lo importa como base de trazado.
 */
export function exportarDxf(proyecto: Proyecto, diagrama: Diagrama): void {
  const l: string[] = [];
  const par = (codigo: number | string, valor: string | number) => {
    l.push(String(codigo), String(valor));
  };

  // Rejilla lógica 0-100 → milímetros de plano (A3 apaisado útil).
  const EX = 3.8;
  const EY = 2.4;
  const px = (x: number) => (x * EX).toFixed(2);
  const py = (y: number) => ((100 - y) * EY).toFixed(2);

  par(0, "SECTION"); par(2, "HEADER");
  par(9, "$ACADVER"); par(1, "AC1009");
  par(9, "$EXTMIN"); par(10, "0"); par(20, "0");
  par(9, "$EXTMAX"); par(10, (100 * EX).toFixed(2)); par(20, (100 * EY).toFixed(2));
  par(0, "ENDSEC");

  const capas = ["EQUIPOS", "CONEXIONES", "TEXTOS", "DATOS", "MARCO"];
  par(0, "SECTION"); par(2, "TABLES");
  par(0, "TABLE"); par(2, "LAYER"); par(70, capas.length);
  capas.forEach((capa, i) => {
    par(0, "LAYER"); par(2, capa); par(70, 0); par(62, [5, 3, 7, 8, 1][i]); par(6, "CONTINUOUS");
  });
  par(0, "ENDTAB"); par(0, "ENDSEC");

  par(0, "SECTION"); par(2, "ENTITIES");

  // Marco del plano
  const marco = [
    [0, 0], [100 * EX, 0], [100 * EX, 100 * EY], [0, 100 * EY], [0, 0],
  ];
  for (let i = 0; i < marco.length - 1; i++) {
    par(0, "LINE"); par(8, "MARCO");
    par(10, marco[i][0].toFixed(2)); par(20, marco[i][1].toFixed(2)); par(30, 0);
    par(11, marco[i + 1][0].toFixed(2)); par(21, marco[i + 1][1].toFixed(2)); par(31, 0);
  }

  // Conexiones como polilíneas ortogonales
  for (const c of diagrama.conexiones) {
    const a = diagrama.nodos.find((n) => n.id === c.desde);
    const b = diagrama.nodos.find((n) => n.id === c.hasta);
    if (!a || !b) continue;

    const puntos: [number, number][] = [
      [Number(px(a.x)), Number(py(a.y))],
      [Number(px(b.x)), Number(py(a.y))],
      [Number(px(b.x)), Number(py(b.y))],
    ];
    for (let i = 0; i < puntos.length - 1; i++) {
      par(0, "LINE"); par(8, "CONEXIONES");
      par(10, puntos[i][0].toFixed(2)); par(20, puntos[i][1].toFixed(2)); par(30, 0);
      par(11, puntos[i + 1][0].toFixed(2)); par(21, puntos[i + 1][1].toFixed(2)); par(31, 0);
    }
    if (c.etiqueta) {
      par(0, "TEXT"); par(8, "DATOS");
      par(10, ((puntos[0][0] + puntos[1][0]) / 2).toFixed(2));
      par(20, (puntos[0][1] + 2).toFixed(2));
      par(30, 0); par(40, 2.4); par(1, c.etiqueta);
    }
  }

  // Elementos: círculo de referencia + etiqueta + datos
  for (const n of diagrama.nodos) {
    const x = Number(px(n.x));
    const y = Number(py(n.y));
    par(0, "CIRCLE"); par(8, "EQUIPOS");
    par(10, x.toFixed(2)); par(20, y.toFixed(2)); par(30, 0); par(40, 6);

    par(0, "TEXT"); par(8, "TEXTOS");
    par(10, (x - 12).toFixed(2)); par(20, (y - 10).toFixed(2)); par(30, 0);
    par(40, 3); par(1, `${n.id} ${n.etiqueta}`);

    n.datos.slice(0, 2).forEach((dato, i) => {
      par(0, "TEXT"); par(8, "DATOS");
      par(10, (x - 12).toFixed(2)); par(20, (y - 14.5 - i * 4).toFixed(2)); par(30, 0);
      par(40, 2.4); par(1, dato);
    });
  }

  // Cajetín
  par(0, "TEXT"); par(8, "MARCO");
  par(10, "6"); par(20, "6"); par(30, 0); par(40, 5);
  par(1, `${diagrama.titulo} - ${proyecto.nombre}`);

  par(0, "ENDSEC");
  par(0, "EOF");

  descargar(
    l.join("\r\n"),
    `${nombreBase(proyecto)}-${diagrama.tipo}.dxf`,
    "application/dxf",
  );
}

/* ------------------------------------------------------------------- IFC -- */

/**
 * Genera un IFC4 mínimo pero válido con la jerarquía espacial del proyecto y un
 * elemento por equipo del diagrama, con sus datos como propiedades. Revit,
 * Navisworks, BIMcollab y Solibri lo abren directamente.
 */
export function exportarIfc(proyecto: Proyecto, diagrama: Diagrama): void {
  const lineas: string[] = [];
  let id = 0;
  const nuevo = () => ++id;
  const guid = (n: number) =>
    `${n.toString(36).padStart(4, "0").toUpperCase()}${"$0ANDRESENGAI0000".slice(0, 18)}`.slice(0, 22);
  const t = (texto: string) => `'${texto.replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;

  const fecha = Math.floor(new Date(proyecto.creadoEn).getTime() / 1000);
  const ficha = fichaDisciplina(proyecto.disciplina);

  const persona = nuevo();
  lineas.push(`#${persona}=IFCPERSON($,${t("Acosta Jimenez")},${t("Heber Andres")},$,$,$,$,$);`);
  const organizacion = nuevo();
  lineas.push(`#${organizacion}=IFCORGANIZATION($,${t("ANDRES Engineering AI")},$,$,$);`);
  const personaOrg = nuevo();
  lineas.push(`#${personaOrg}=IFCPERSONANDORGANIZATION(#${persona},#${organizacion},$);`);
  const aplicacion = nuevo();
  lineas.push(`#${aplicacion}=IFCAPPLICATION(#${organizacion},${t("1.0")},${t("ANDRES Engineering AI")},${t("AEAI")});`);
  const historial = nuevo();
  lineas.push(`#${historial}=IFCOWNERHISTORY(#${personaOrg},#${aplicacion},$,.ADDED.,$,$,$,${fecha});`);

  const ejeZ = nuevo(); lineas.push(`#${ejeZ}=IFCDIRECTION((0.,0.,1.));`);
  const ejeX = nuevo(); lineas.push(`#${ejeX}=IFCDIRECTION((1.,0.,0.));`);
  const origen = nuevo(); lineas.push(`#${origen}=IFCCARTESIANPOINT((0.,0.,0.));`);
  const ejes = nuevo(); lineas.push(`#${ejes}=IFCAXIS2PLACEMENT3D(#${origen},#${ejeZ},#${ejeX});`);
  const contexto = nuevo();
  lineas.push(`#${contexto}=IFCGEOMETRICREPRESENTATIONCONTEXT($,${t("Model")},3,1.E-05,#${ejes},$);`);

  const mm = nuevo(); lineas.push(`#${mm}=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);`);
  const m2 = nuevo(); lineas.push(`#${m2}=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);`);
  const unidades = nuevo(); lineas.push(`#${unidades}=IFCUNITASSIGNMENT((#${mm},#${m2}));`);

  const proyectoIfc = nuevo();
  lineas.push(`#${proyectoIfc}=IFCPROJECT('${guid(proyectoIfc)}',#${historial},${t(proyecto.nombre)},${t(ficha.nombre)},$,$,$,(#${contexto}),#${unidades});`);

  const colocacion = nuevo();
  lineas.push(`#${colocacion}=IFCLOCALPLACEMENT($,#${ejes});`);
  const sitio = nuevo();
  lineas.push(`#${sitio}=IFCSITE('${guid(sitio)}',#${historial},${t(proyecto.ubicacion || "Sitio")},$,$,#${colocacion},$,$,.ELEMENT.,$,$,$,$,$);`);
  const edificio = nuevo();
  lineas.push(`#${edificio}=IFCBUILDING('${guid(edificio)}',#${historial},${t(proyecto.nombre)},$,$,#${colocacion},$,$,.ELEMENT.,$,$,$);`);
  const nivel = nuevo();
  lineas.push(`#${nivel}=IFCBUILDINGSTOREY('${guid(nivel)}',#${historial},${t("Nivel 00")},$,$,#${colocacion},$,$,.ELEMENT.,0.);`);

  const rel1 = nuevo();
  lineas.push(`#${rel1}=IFCRELAGGREGATES('${guid(rel1)}',#${historial},$,$,#${proyectoIfc},(#${sitio}));`);
  const rel2 = nuevo();
  lineas.push(`#${rel2}=IFCRELAGGREGATES('${guid(rel2)}',#${historial},$,$,#${sitio},(#${edificio}));`);
  const rel3 = nuevo();
  lineas.push(`#${rel3}=IFCRELAGGREGATES('${guid(rel3)}',#${historial},$,$,#${edificio},(#${nivel}));`);

  const elementos: number[] = [];
  for (const nodo of diagrama.nodos) {
    const punto = nuevo();
    lineas.push(`#${punto}=IFCCARTESIANPOINT((${(nodo.x * 100).toFixed(1)},${((100 - nodo.y) * 100).toFixed(1)},0.));`);
    const ejeLocal = nuevo();
    lineas.push(`#${ejeLocal}=IFCAXIS2PLACEMENT3D(#${punto},$,$);`);
    const sitioLocal = nuevo();
    lineas.push(`#${sitioLocal}=IFCLOCALPLACEMENT(#${colocacion},#${ejeLocal});`);

    const elemento = nuevo();
    lineas.push(`#${elemento}=IFCBUILDINGELEMENTPROXY('${guid(elemento)}',#${historial},${t(`${nodo.id} ${nodo.etiqueta}`)},${t(nodo.datos.join(" / ") || nodo.simbolo)},${t(nodo.simbolo)},#${sitioLocal},$,$,.NOTDEFINED.);`);
    elementos.push(elemento);

    if (nodo.datos.length > 0) {
      const props = nodo.datos.map((dato, i) => {
        const prop = nuevo();
        lineas.push(`#${prop}=IFCPROPERTYSINGLEVALUE(${t(`Dato_${i + 1}`)},$,IFCTEXT(${t(dato)}),$);`);
        return prop;
      });
      const conjunto = nuevo();
      lineas.push(`#${conjunto}=IFCPROPERTYSET('${guid(conjunto)}',#${historial},${t("AEAI_Datos_tecnicos")},$,(${props.map((p) => `#${p}`).join(",")}));`);
      const relProp = nuevo();
      lineas.push(`#${relProp}=IFCRELDEFINESBYPROPERTIES('${guid(relProp)}',#${historial},$,$,(#${elemento}),#${conjunto});`);
    }
  }

  if (elementos.length > 0) {
    const relEspacial = nuevo();
    lineas.push(`#${relEspacial}=IFCRELCONTAINEDINSPATIALSTRUCTURE('${guid(relEspacial)}',#${historial},$,$,(${elementos.map((e) => `#${e}`).join(",")}),#${nivel});`);
  }

  const marca = new Date().toISOString().replace(/\.\d+Z$/, "");
  const ifc = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('${nombreBase(proyecto)}.ifc','${marca}',('Heber Andres Acosta Jimenez'),('ANDRES Engineering AI'),'ANDRES Engineering AI','ANDRES Engineering AI','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
${lineas.join("\n")}
ENDSEC;
END-ISO-10303-21;
`;

  descargar(ifc, `${nombreBase(proyecto)}-${diagrama.tipo}.ifc`, "application/x-step");
}

/* ------------------------------------------------------------------- SVG -- */

export function exportarSvg(proyecto: Proyecto, diagrama: Diagrama, svg: string): void {
  descargar(
    svg,
    `${nombreBase(proyecto)}-${diagrama.tipo}.svg`,
    "image/svg+xml;charset=utf-8",
  );
}
