import { writeFileSync } from "node:fs";
import { construirDictamen } from "../../lib/exportar-pdf.ts";
import { PROYECTO_DEMO } from "../../lib/demo-proyecto.ts";

const doc = construirDictamen({
  id: "demo",
  nombreArchivo: "Red hidrosanitaria — Hotel Riviera Maya",
  creadoEn: new Date().toISOString(),
  paginas: 0,
  caracteres: PROYECTO_DEMO.alcance.length,
  texto: PROYECTO_DEMO.alcance,
  resumen: PROYECTO_DEMO.resumen,
  requerimientos: PROYECTO_DEMO.requerimientos,
  partidas: PROYECTO_DEMO.partidas,
  hallazgos: PROYECTO_DEMO.hallazgos,
  economia: null,
  modoDemo: true,
});

const bytes = doc.output("arraybuffer");
writeFileSync(process.argv[2] ?? "/tmp/dictamen.pdf", Buffer.from(bytes));
console.log("PDF generado:", (bytes as ArrayBuffer).byteLength, "bytes ·", doc.getNumberOfPages(), "páginas");
