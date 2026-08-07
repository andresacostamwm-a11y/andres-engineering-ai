import { redactarAlcance } from "../../lib/agentes/programa.ts";
try {
  const r = await redactarAlcance({
    nombre: "Red hidrosanitaria — Hotel",
    descripcion: "Hotel de 120 habitaciones con cisterna de 200 m3, equipo hidroneumatico, agua caliente con recirculacion, drenaje sanitario y red contra incendio.",
    disciplina: "hidraulica",
    envergadura: "mediana",
    ubicacion: "Playa del Carmen",
  });
  console.log("OK alcance:", r.alcance.length, "caracteres, premisas:", r.premisas.length);
} catch (e) {
  console.log("ERROR COMPLETO:", e instanceof Error ? e.message : e);
}
