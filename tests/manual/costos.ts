import { generarPresupuesto } from "../../lib/agentes/costos.ts";
import { REQUERIMIENTOS_DEMO, DOCUMENTO_DEMO } from "../../lib/demo.ts";
import { PAIS_POR_DEFECTO } from "../../lib/moneda/paises.ts";

const salida = await generarPresupuesto(
  REQUERIMIENTOS_DEMO,
  DOCUMENTO_DEMO.slice(0, 4000),
  PAIS_POR_DEFECTO,
);
const p = salida.partidas;
const malas = p.filter((x) => Math.abs(x.cantidad * x.precioUnitario - x.importe) > 0.02);
const matriz = p.filter(
  (x) => Math.abs(Object.values(x.matriz).reduce((a, b) => a + b, 0) - x.precioUnitario) > 0.02,
);
console.log("moneda:", PAIS_POR_DEFECTO.moneda, "| mercado:", salida.mercado);
console.log("partidas:", p.length, "| total:", p.reduce((s, x) => s + x.importe, 0).toLocaleString("es-MX"));
console.log("importes incoherentes:", malas.length, "| matrices descuadradas:", matriz.length);
console.log("con supuesto:", p.filter((x) => x.supuesto).length);
