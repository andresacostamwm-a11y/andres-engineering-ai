import { generarDiagrama } from "../../lib/agentes/proyectista.ts";

const d = await generarDiagrama({
  tipo: "unifilar",
  disciplina: "electrica",
  envergadura: "mediana",
  descripcionProyecto:
    "Nave industrial de 1,200 m2 en Cancún con subestación propia de 500 kVA, tablero general, tres tableros derivados para producción, oficinas y servicios, planta de emergencia y sistema de tierra física.",
  contexto: "",
});

console.log("TÍTULO:", d.titulo);
console.log("ESCALA:", d.escala);
console.log("NODOS:", d.nodos.length);
for (const n of d.nodos) {
  console.log(`  ${n.id.padEnd(10)} ${n.simbolo.padEnd(20)} (${n.x.toFixed(0)},${n.y.toFixed(0)})  ${n.etiqueta} [${n.datos.join(" | ")}]`);
}
console.log("CONEXIONES:", d.conexiones.length);
for (const c of d.conexiones) console.log(`  ${c.desde} -> ${c.hasta}  ${c.tipo}  ${c.etiqueta ?? ""}`);
console.log("NOTAS:", d.notas.length);
d.notas.forEach((n) => console.log("  -", n));

// Comprobación de solapes tras la normalización
let minimo = Infinity;
for (let i = 0; i < d.nodos.length; i++)
  for (let j = i + 1; j < d.nodos.length; j++)
    minimo = Math.min(minimo, Math.hypot(d.nodos[i].x - d.nodos[j].x, d.nodos[i].y - d.nodos[j].y));
console.log("SEPARACIÓN MÍNIMA:", minimo.toFixed(1), minimo >= 10.5 ? "OK" : "APIÑADO");
