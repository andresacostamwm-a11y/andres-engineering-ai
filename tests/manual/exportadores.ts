import { exportarDxf, exportarIfc } from "../../lib/exportadores/index.ts";
import { DIAGRAMAS_DEMO, PROYECTO_DEMO } from "../../lib/demo-proyecto.ts";
import type { Proyecto } from "../../lib/tipos-proyecto.ts";
import { writeFileSync } from "node:fs";

// Se captura lo que el exportador enviaría a descargar.
const capturado: Record<string, string> = {};
(globalThis as any).document = {
  createElement: () => ({ click() {}, set href(_: string) {}, set download(v: string) { (this as any)._n = v; }, get download() { return (this as any)._n; } }),
  body: { appendChild() {}, removeChild() {} },
};
(globalThis as any).URL = {
  createObjectURL: (b: any) => { capturado[Object.keys(capturado).length] = b.__texto; return "blob:x"; },
  revokeObjectURL() {},
};
(globalThis as any).Blob = class { __texto: string; constructor(p: any[]) { this.__texto = p.join(""); } } as any;

const proyecto: Proyecto = {
  id: "t", nombre: "Prueba PTAR Tulum", descripcion: "d",
  disciplina: "hidraulica", envergadura: "mediana", ubicacion: "Tulum",
  creadoEn: new Date(0).toISOString(), alcance: PROYECTO_DEMO.alcance,
  premisas: PROYECTO_DEMO.premisas, requerimientos: PROYECTO_DEMO.requerimientos,
  partidas: PROYECTO_DEMO.partidas, hallazgos: PROYECTO_DEMO.hallazgos,
  diagramas: DIAGRAMAS_DEMO.hidraulica!, resumen: PROYECTO_DEMO.resumen, modoDemo: true,
};

exportarDxf(proyecto, proyecto.diagramas[0]);
const dxf = capturado["0"];
exportarIfc(proyecto, proyecto.diagramas[0]);
const ifc = capturado["1"];

writeFileSync("/tmp/prueba.dxf", dxf);
writeFileSync("/tmp/prueba.ifc", ifc);

console.log("DXF bytes:", dxf.length);
console.log("  cabecera AC1009:", dxf.includes("AC1009"));
console.log("  secciones:", ["HEADER","TABLES","ENTITIES"].filter(s=>dxf.includes(s)).join(","));
console.log("  EOF final:", dxf.trim().endsWith("EOF"));
console.log("  capas:", ["EQUIPOS","CONEXIONES","TEXTOS","DATOS","MARCO"].filter(c=>dxf.includes(c)).length, "de 5");
console.log("  entidades LINE:", (dxf.match(/\bLINE\b/g)||[]).length, "CIRCLE:", (dxf.match(/\bCIRCLE\b/g)||[]).length, "TEXT:", (dxf.match(/\bTEXT\b/g)||[]).length);

console.log("IFC bytes:", ifc.length);
console.log("  ISO-10303-21:", ifc.startsWith("ISO-10303-21;"), "· cierre:", ifc.trim().endsWith("END-ISO-10303-21;"));
console.log("  esquema IFC4:", ifc.includes("FILE_SCHEMA(('IFC4'))"));
console.log("  jerarquía:", ["IFCPROJECT","IFCSITE","IFCBUILDING","IFCBUILDINGSTOREY"].filter(t=>ifc.includes(t)).length, "de 4");
console.log("  elementos:", (ifc.match(/IFCBUILDINGELEMENTPROXY/g)||[]).length, "· property sets:", (ifc.match(/IFCPROPERTYSET\(/g)||[]).length);
const ids = [...ifc.matchAll(/^#(\d+)=/gm)].map(m=>+m[1]);
console.log("  ids únicos y correlativos:", new Set(ids).size === ids.length && Math.max(...ids) === ids.length);
