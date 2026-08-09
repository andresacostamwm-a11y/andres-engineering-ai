/**
 * Pruebas de la lógica pura del sistema.
 *
 * Se prueba lo que debe ser determinista: la aritmética del presupuesto, la
 * consolidación del riesgo, la recuperación de fragmentos y la firma de sesión.
 * Deliberadamente no se prueba la salida del modelo — no es determinista y
 * afirmar sobre ella daría una prueba que falla sin que nada esté roto.
 *
 * Ejecutar con: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { normalizarPartidas, totalPresupuesto } from "../lib/agentes/costos.ts";
import { riesgoGlobal } from "../lib/agentes/normativo.ts";
import { fragmentar, recuperar, tokenizar } from "../lib/rag.ts";
import { crearToken, credencialesValidas, leerToken } from "../lib/auth.ts";
import { verificarLimite } from "../lib/limite.ts";
import { esErrorDeCuota } from "../lib/modelo/tipos.ts";
import { aEsquemaGemini } from "../lib/modelo/esquema.ts";
import { programar } from "../lib/programacion/cpm.ts";
import { calcularSensibilidad, evaluarRiesgo } from "../lib/agentes/riesgos.ts";
import {
  calcularConfianza,
  comprobar,
  veredictoDe,
} from "../lib/verificacion/comprobaciones.ts";
import { MEMORIA_DEMO } from "../lib/demo-proyecto.ts";
import { depuradorDeAndamiaje } from "../lib/modelo/depurar.ts";
import {
  anchoTexto,
  colocar,
  puntoEn,
  solape,
} from "../lib/diagramas/disposicion.ts";
import {
  curvaDeAvance,
  histograma,
  posicionLogaritmica,
  proyectarIsometrico,
  superficieDeSeveridad,
  treemap,
} from "../lib/graficos/analitica.ts";
import { partidaSchema, resumenEjecutivoSchema } from "../lib/schemas.ts";
import { HALLAZGOS_DEMO, PARTIDAS_DEMO, RESUMEN_DEMO } from "../lib/demo.ts";
import type { Hallazgo, Partida } from "../lib/types.ts";
import { deducirPais, PAIS_POR_DEFECTO } from "../lib/moneda/paises.ts";
import { aMoneda, convertir, sumar, variacion } from "../lib/moneda/conversion.ts";
import { compararProveedores } from "../lib/moneda/comparacion.ts";

const partidaBase: Partida = {
  clave: "01.01",
  concepto: "Concepto de prueba",
  unidad: "m2",
  cantidad: 10,
  precioUnitario: 100,
  importe: 0,
  disciplina: "obra-civil",
  matriz: { materiales: 50, manoObra: 20, equipo: 10, indirectos: 20 },
  supuesto: null,
};

describe("normalizarPartidas", () => {
  it("recalcula el importe aunque el modelo lo devuelva mal", () => {
    const [resultado] = normalizarPartidas([{ ...partidaBase, importe: 99999 }]);
    assert.equal(resultado.importe, 1000);
  });

  it("ajusta los indirectos cuando la matriz no suma el precio unitario", () => {
    const [resultado] = normalizarPartidas([
      {
        ...partidaBase,
        precioUnitario: 120,
        matriz: { materiales: 50, manoObra: 20, equipo: 10, indirectos: 20 },
      },
    ]);
    const suma =
      resultado.matriz.materiales +
      resultado.matriz.manoObra +
      resultado.matriz.equipo +
      resultado.matriz.indirectos;
    assert.equal(suma, 120);
    assert.equal(resultado.matriz.indirectos, 40);
  });

  it("no altera una partida ya coherente", () => {
    const coherente = { ...partidaBase, importe: 1000 };
    const [resultado] = normalizarPartidas([coherente]);
    assert.deepEqual(resultado.matriz, coherente.matriz);
    assert.equal(resultado.importe, 1000);
  });

  it("redondea a dos decimales sin arrastrar error de punto flotante", () => {
    const [resultado] = normalizarPartidas([
      { ...partidaBase, cantidad: 3, precioUnitario: 0.1 },
    ]);
    assert.equal(resultado.importe, 0.3);
  });

  it("suma el total del catálogo de demostración", () => {
    assert.equal(totalPresupuesto(PARTIDAS_DEMO), 6027130);
  });
});

describe("riesgoGlobal", () => {
  const hallazgo = (riesgo: Hallazgo["riesgo"]): Hallazgo => ({
    id: "H",
    titulo: "t",
    norma: "n",
    articulo: null,
    riesgo,
    descripcion: "d",
    recomendacion: "r",
    disciplina: "general",
  });

  it("devuelve bajo cuando no hay hallazgos", () => {
    assert.equal(riesgoGlobal([]), "bajo");
  });

  it("un solo hallazgo crítico marca el proyecto como crítico", () => {
    assert.equal(riesgoGlobal([hallazgo("critico"), hallazgo("bajo")]), "critico");
  });

  it("escala a crítico cuando se acumulan tres hallazgos altos", () => {
    assert.equal(
      riesgoGlobal([hallazgo("alto"), hallazgo("alto"), hallazgo("alto")]),
      "critico",
    );
  });

  it("dos hallazgos altos siguen siendo riesgo alto", () => {
    assert.equal(riesgoGlobal([hallazgo("alto"), hallazgo("alto")]), "alto");
  });

  it("clasifica el caso de demostración como crítico", () => {
    assert.equal(riesgoGlobal(HALLAZGOS_DEMO), "critico");
  });
});

describe("tokenizar", () => {
  it("descarta palabras vacías y normaliza acentos", () => {
    assert.deepEqual(tokenizar("La instalación DE la Bomba"), [
      "instalacion",
      "bomba",
    ]);
  });

  it("conserva claves técnicas con guiones y puntos internos", () => {
    const tokens = tokenizar("Conforme a la NOM-001-SEDE-2012.");
    assert.ok(tokens.includes("nom-001-sede-2012"));
  });
});

describe("fragmentar y recuperar", () => {
  const documento = [
    "SECCIÓN ELÉCTRICA. Tablero general con interruptor principal de 250 amperes y protecciones derivadas para la ampliación proyectada del edificio industrial.",
    "SECCIÓN HIDRÁULICA. Red de agua potable en PPR alimentada desde la cisterna existente con bombeo hidroneumático de velocidad variable.",
    "SECCIÓN DE PLAZOS. El plazo de ejecución de los trabajos será de ciento veinte días naturales contados a partir del anticipo.",
  ].join("\f");

  it("crea un fragmento por página y conserva su número", () => {
    const fragmentos = fragmentar(documento);
    assert.equal(fragmentos.length, 3);
    assert.deepEqual(
      fragmentos.map((f) => f.pagina),
      [1, 2, 3],
    );
  });

  it("recupera el fragmento correcto según los términos de la consulta", () => {
    const fragmentos = fragmentar(documento);
    const [mejor] = recuperar(fragmentos, "¿cuál es el plazo de ejecución?", 1);
    assert.match(mejor.texto, /ciento veinte días/);
  });

  it("prioriza el fragmento eléctrico ante una consulta eléctrica", () => {
    const fragmentos = fragmentar(documento);
    const [mejor] = recuperar(fragmentos, "capacidad del tablero e interruptor", 1);
    assert.match(mejor.texto, /Tablero general/);
  });

  it("no devuelve nada cuando ningún término aparece en el documento", () => {
    const fragmentos = fragmentar(documento);
    assert.deepEqual(recuperar(fragmentos, "zzzz qqqq wwww"), []);
  });

  it("tolera un documento vacío sin lanzar", () => {
    assert.deepEqual(recuperar(fragmentar(""), "cualquier cosa"), []);
  });
});

describe("autenticación", () => {
  it("acepta las credenciales de demostración sin distinguir mayúsculas en el usuario", () => {
    assert.ok(credencialesValidas("DEMO@diem.mx", "TFMdemo2026"));
  });

  it("rechaza una contraseña incorrecta", () => {
    assert.equal(credencialesValidas("demo@diem.mx", "otra"), false);
  });

  it("un token firmado se puede leer de vuelta", async () => {
    const token = await crearToken({ usuario: "demo@diem.mx", nombre: "DIEM" });
    const sesion = await leerToken(token);
    assert.equal(sesion?.usuario, "demo@diem.mx");
    assert.equal(sesion?.nombre, "DIEM");
  });

  it("un token manipulado se rechaza", async () => {
    const token = await crearToken({ usuario: "demo@diem.mx", nombre: "DIEM" });
    assert.equal(await leerToken(`${token}x`), null);
  });

  it("una cookie ausente no produce sesión", async () => {
    assert.equal(await leerToken(undefined), null);
  });
});

describe("limitador de peticiones", () => {
  it("permite hasta el máximo y bloquea el siguiente intento", () => {
    const clave = `prueba-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      assert.ok(verificarLimite(clave, 3, 60_000).permitido, `intento ${i}`);
    }
    const bloqueado = verificarLimite(clave, 3, 60_000);
    assert.equal(bloqueado.permitido, false);
    assert.ok(bloqueado.reintentarEn > 0);
  });

  it("cuenta por clave de forma independiente", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    verificarLimite(a, 1, 60_000);
    assert.equal(verificarLimite(a, 1, 60_000).permitido, false);
    assert.ok(verificarLimite(b, 1, 60_000).permitido);
  });
});

describe("esquemas de validación", () => {
  it("acepta las partidas de demostración", () => {
    for (const partida of PARTIDAS_DEMO) {
      assert.ok(partidaSchema.safeParse(partida).success, partida.clave);
    }
  });

  it("acepta el resumen de demostración", () => {
    assert.ok(resumenEjecutivoSchema.safeParse(RESUMEN_DEMO).success);
  });

  it("rechaza una disciplina inventada", () => {
    const invalida = { ...partidaBase, disciplina: "telepatía" };
    assert.equal(partidaSchema.safeParse(invalida).success, false);
  });

  it("acepta cualquier moneda oficial soportada, no solo la mexicana", () => {
    // El presupuesto se emite en la moneda del país donde se construye: un
    // proyecto en Bogotá es válido en COP y uno en Madrid en EUR.
    for (const moneda of ["MXN", "USD", "EUR", "COP"]) {
      const valido = { ...RESUMEN_DEMO, moneda };
      assert.equal(resumenEjecutivoSchema.safeParse(valido).success, true, moneda);
    }
  });

  it("rechaza una moneda que no es un código ISO soportado", () => {
    const invalido = { ...RESUMEN_DEMO, moneda: "DOLARES" };
    assert.equal(resumenEjecutivoSchema.safeParse(invalido).success, false);
  });
});

describe("coherencia de los datos de demostración", () => {
  it("cada importe es el producto de cantidad por precio unitario", () => {
    for (const p of PARTIDAS_DEMO) {
      assert.equal(
        Math.round(p.cantidad * p.precioUnitario * 100) / 100,
        p.importe,
        `partida ${p.clave}`,
      );
    }
  });

  it("cada matriz suma exactamente su precio unitario", () => {
    for (const p of PARTIDAS_DEMO) {
      const suma =
        p.matriz.materiales + p.matriz.manoObra + p.matriz.equipo + p.matriz.indirectos;
      assert.equal(Math.round(suma * 100) / 100, p.precioUnitario, `partida ${p.clave}`);
    }
  });

  it("el total del resumen coincide con la suma de las partidas", () => {
    assert.equal(RESUMEN_DEMO.totalEstimado, totalPresupuesto(PARTIDAS_DEMO));
  });
});

describe("detección de errores de cuota", () => {
  it("reconoce el límite de uso de la API por su mensaje", () => {
    assert.ok(
      esErrorDeCuota(
        new Error(
          'You have reached your specified API usage limits. You will regain access on 2026-09-01.',
        ),
      ),
    );
  });

  it("reconoce el saldo agotado", () => {
    assert.ok(esErrorDeCuota(new Error("Your credit balance is too low")));
  });

  it("reconoce los códigos 429 y 529 aunque el mensaje no lo diga", () => {
    assert.ok(esErrorDeCuota(Object.assign(new Error("boom"), { status: 429 })));
    assert.ok(esErrorDeCuota(Object.assign(new Error("boom"), { status: 529 })));
  });

  it("no confunde un error de programación con uno de cuota", () => {
    assert.equal(esErrorDeCuota(new Error("Cannot read property 'x' of undefined")), false);
    assert.equal(esErrorDeCuota(new TypeError("fetch failed")), false);
  });

  it("tolera valores que no son Error", () => {
    assert.equal(esErrorDeCuota(null), false);
    assert.equal(esErrorDeCuota(undefined), false);
  });
});

describe("conversión de esquema a Gemini", () => {
  it("convierte los tipos nullable de JSON Schema a nullable de OpenAPI", () => {
    const salida = aEsquemaGemini({
      type: "object",
      properties: { pagina: { type: ["number", "null"], description: "d" } },
    }) as Record<string, Record<string, Record<string, unknown>>>;

    assert.equal(salida.properties.pagina.type, "number");
    assert.equal(salida.properties.pagina.nullable, true);
    assert.equal(salida.properties.pagina.description, "d");
  });

  it("deja intactos los tipos simples", () => {
    const salida = aEsquemaGemini({
      type: "object",
      properties: { nombre: { type: "string" } },
    }) as Record<string, Record<string, Record<string, unknown>>>;

    assert.equal(salida.properties.nombre.type, "string");
    assert.equal(salida.properties.nombre.nullable, undefined);
  });

  it("elimina las claves que Gemini no reconoce", () => {
    const salida = aEsquemaGemini({
      type: "object",
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#",
      properties: { a: { type: "string", default: "x" } },
    }) as Record<string, unknown>;

    assert.equal("additionalProperties" in salida, false);
    assert.equal("$schema" in salida, false);
    assert.equal(
      "default" in ((salida.properties as Record<string, object>).a as object),
      false,
    );
  });

  it("conserva enum, required y arrays anidados", () => {
    const salida = aEsquemaGemini({
      type: "object",
      properties: {
        items: {
          type: "array",
          items: { type: "object", properties: { t: { type: "string", enum: ["a", "b"] } } },
        },
      },
      required: ["items"],
    }) as Record<string, unknown>;

    const items = (salida.properties as Record<string, Record<string, Record<string, Record<string, Record<string, unknown>>>>>)
      .items.items.properties.t;
    assert.deepEqual(items.enum, ["a", "b"]);
    assert.deepEqual(salida.required, ["items"]);
  });

  it("reconoce el agotamiento de cuota de Gemini", () => {
    assert.ok(esErrorDeCuota(new Error("Gemini 429: RESOURCE_EXHAUSTED")));
  });
});

describe("moneda: deducción de país", () => {
  it("deduce México y su moneda desde una ubicación mexicana", () => {
    const { pais, deducido } = deducirPais("Tulum, Quintana Roo");
    assert.equal(pais.codigo, "MX");
    assert.equal(pais.moneda, "MXN");
    assert.equal(deducido, true);
  });

  it("deduce la moneda propia de cada país del proyecto", () => {
    assert.equal(deducirPais("Bogotá, Colombia").pais.moneda, "COP");
    assert.equal(deducirPais("Madrid, España").pais.moneda, "EUR");
    assert.equal(deducirPais("Houston, Texas").pais.moneda, "USD");
  });

  it("gana la pista más específica cuando una ciudad se repite entre países", () => {
    // "La Paz" existe en México (BCS) y en Bolivia: la pista larga debe imponerse.
    assert.equal(deducirPais("La Paz").pais.codigo, "MX");
    assert.equal(deducirPais("La Paz Bolivia").pais.codigo, "BO");
  });

  it("no confunde una pista corta metida dentro de otra palabra", () => {
    // "especificar" contiene "ica" (Ica, Perú) y "calidad" contiene "cali"
    // (Cali, Colombia): sin límites de palabra la moneda saldría equivocada.
    assert.equal(deducirPais("Zona industrial sin especificar").deducido, false);
    assert.equal(deducirPais("obra de calidad en Monterrey").pais.codigo, "MX");
  });

  it("marca como no deducido cuando la ubicación no dice nada", () => {
    const { pais, deducido } = deducirPais("Zona industrial sin especificar");
    assert.equal(deducido, false);
    assert.equal(pais.codigo, PAIS_POR_DEFECTO.codigo);
  });
});

describe("moneda: conversión", () => {
  const tc = {
    origen: "MXN" as const,
    destino: "USD" as const,
    tasa: 0.0583,
    fecha: "2026-08-08T00:00:00.000Z",
    consultado: "2026-08-08T00:00:00.000Z",
    fuente: "prueba",
    url: null,
  };

  it("convierte aplicando la tasa", () => {
    const r = convertir({ valor: 1000, moneda: "MXN" }, tc);
    assert.equal(r.valor, 58.3);
    assert.equal(r.moneda, "USD");
  });

  it("invierte el tipo de cambio si se le pasa al revés", () => {
    const r = convertir({ valor: 58.3, moneda: "USD" }, tc);
    assert.equal(r.moneda, "MXN");
    assert.ok(Math.abs(r.valor - 1000) < 0.5);
  });

  it("rechaza un tipo de cambio que no corresponde al par", () => {
    assert.throws(() => convertir({ valor: 100, moneda: "EUR" }, tc));
  });

  it("no convierte dos veces: a la misma moneda devuelve el mismo importe", () => {
    const r = aMoneda({ valor: 1000, moneda: "MXN" }, "MXN", tc);
    assert.equal(r.valor, 1000);
    assert.equal(r.tipoCambio.tasa, 1);
  });

  it("impide sumar monedas distintas dentro de un total", () => {
    assert.throws(() =>
      sumar([{ valor: 10, moneda: "MXN" }, { valor: 10, moneda: "USD" }], "MXN"),
    );
  });

  it("calcula la variación entre el TC de la cotización y el vigente", () => {
    const actual = { ...tc, tasa: 0.0612 };
    assert.equal(variacion(tc, actual), 4.97);
  });
});

describe("comparación de proveedores", () => {
  const tcMxn = (tasa: number, fecha: string) => ({
    origen: "MXN" as const, destino: "USD" as const, tasa,
    fecha, consultado: fecha, fuente: "prueba", url: null,
  });

  const cot = (
    id: string, proveedor: string, valor: number, moneda: "MXN" | "USD",
    tasa: number, vigencia: string | null = null,
  ) => ({
    id, clavePartida: null, concepto: "Bomba", proveedor, pais: "MX",
    importeOriginal: { valor, moneda },
    fecha: "2026-08-01T00:00:00.000Z",
    vigencia,
    tipoCambio: tcMxn(tasa, "2026-08-01T00:00:00.000Z"),
    importeConvertido: { valor, moneda },
    notas: null,
  });

  it("normaliza a una sola moneda antes de decidir quién es más barato", () => {
    // 100.000 MXN a 0,058 son 5.800 USD: más caro que los 5.000 USD del otro,
    // aunque el número '100000' sea mucho mayor que '5000'.
    const r = compararProveedores(
      [cot("a", "Nacional", 100_000, "MXN", 0.058), cot("b", "Importador", 5_000, "USD", 0.058)],
      "USD",
      "emision",
    );
    assert.equal(r.propuestas[0].cotizacion.proveedor, "Importador");
    assert.equal(r.propuestas[0].masBarata, true);
    assert.equal(r.propuestas[1].masBarata, false);
    assert.ok(r.propuestas[1].sobrecoste > 15);
  });

  it("conserva el importe original junto al normalizado", () => {
    const r = compararProveedores([cot("a", "Nacional", 100_000, "MXN", 0.058)], "USD", "emision");
    assert.equal(r.propuestas[0].original.valor, 100_000);
    assert.equal(r.propuestas[0].original.moneda, "MXN");
    assert.equal(r.propuestas[0].normalizado.moneda, "USD");
    assert.equal(r.propuestas[0].normalizado.valor, 5800);
  });

  it("con base común aplica el mismo tipo de cambio a todas", () => {
    const comun = tcMxn(0.05, "2026-08-08T00:00:00.000Z");
    const r = compararProveedores(
      [cot("a", "A", 100_000, "MXN", 0.058), cot("b", "B", 100_000, "MXN", 0.062)],
      "USD",
      "comun",
      comun,
    );
    // Mismo importe y mismo TC común: idéntico resultado pese a TC de emisión distintos.
    assert.equal(r.propuestas[0].normalizado.valor, 5000);
    assert.equal(r.propuestas[1].normalizado.valor, 5000);
    assert.equal(r.propuestas[0].tipoCambioAplicado.tasa, 0.05);
  });

  it("exige tipo de cambio común cuando esa es la base", () => {
    assert.throws(() =>
      compararProveedores([cot("a", "A", 1, "MXN", 0.058)], "USD", "comun"),
    );
  });

  it("marca las cotizaciones vencidas sin excluirlas del listado", () => {
    const r = compararProveedores(
      [cot("a", "A", 1_000, "USD", 0.058, "2026-07-01T00:00:00.000Z")],
      "USD",
      "emision",
      undefined,
      "2026-08-08T00:00:00.000Z",
    );
    assert.equal(r.propuestas[0].vencida, true);
    assert.equal(r.propuestas.length, 1);
  });

  it("no descarta en silencio lo que no puede convertir: lo declara", () => {
    const enEuros = {
      ...cot("c", "Europeo", 4_000, "USD", 0.058),
      importeOriginal: { valor: 4_000, moneda: "EUR" as const },
    };
    const r = compararProveedores([enEuros], "USD", "emision");
    assert.ok(r.propuestas[0].incomparable);
    assert.equal(r.comparables, 0);
  });
});

/* ------------------------------------------------- Programación de obra -- */

describe("motor de ruta crítica", () => {
  const base = { frente: "Obra civil", hito: false };

  it("calcula fechas, holguras y ruta crítica en un encadenado simple", () => {
    // A(5) → C(4); B(2) → C. La rama corta gana holgura.
    const { actividades, duracionDias, rutaCritica } = programar([
      { id: "A", nombre: "A", duracionDias: 5, predecesoras: [], ...base },
      { id: "B", nombre: "B", duracionDias: 2, predecesoras: [], ...base },
      { id: "C", nombre: "C", duracionDias: 4, predecesoras: ["A", "B"], ...base },
    ]);

    assert.equal(duracionDias, 9);
    const porId = new Map(actividades.map((a) => [a.id, a]));
    assert.equal(porId.get("C")!.inicio, 5);
    assert.equal(porId.get("A")!.holgura, 0);
    assert.equal(porId.get("B")!.holgura, 3);
    assert.deepEqual(rutaCritica.sort(), ["A", "C"]);
  });

  it("rompe un ciclo en lugar de colgarse, y lo avisa", () => {
    const resultado = programar([
      { id: "A", nombre: "A", duracionDias: 3, predecesoras: ["B"], ...base },
      { id: "B", nombre: "B", duracionDias: 3, predecesoras: ["A"], ...base },
    ]);

    assert.equal(resultado.actividades.length, 2);
    assert.ok(resultado.duracionDias > 0);
    assert.ok(resultado.avisos.some((a) => a.includes("ciclo")));
  });

  it("ignora una predecesora inexistente sin descartar la actividad", () => {
    const resultado = programar([
      { id: "A", nombre: "A", duracionDias: 4, predecesoras: ["FANTASMA"], ...base },
    ]);

    assert.equal(resultado.actividades.length, 1);
    assert.equal(resultado.actividades[0].inicio, 0);
    assert.ok(resultado.avisos.some((a) => a.includes("no existe")));
  });

  it("un hito no consume tiempo pero sí ordena", () => {
    const { duracionDias, actividades } = programar([
      { id: "A", nombre: "A", duracionDias: 6, predecesoras: [], ...base },
      { id: "H", nombre: "Hito", duracionDias: 0, predecesoras: ["A"], frente: "Entrega", hito: true },
      { id: "B", nombre: "B", duracionDias: 3, predecesoras: ["H"], ...base },
    ]);

    assert.equal(duracionDias, 9);
    assert.equal(actividades.find((a) => a.id === "H")!.inicio, 6);
  });
});

/* ------------------------------------------------- Riesgos y viabilidad -- */

describe("evaluación de riesgo", () => {
  const plantilla = {
    id: "R", titulo: "t", categoria: "Técnico",
    descripcion: "d", mitigacion: "m", responsable: "r",
  };

  it("deriva severidad y nivel del producto probabilidad × impacto", () => {
    assert.equal(evaluarRiesgo({ ...plantilla, probabilidad: 5, impacto: 5 }).nivel, "critico");
    assert.equal(evaluarRiesgo({ ...plantilla, probabilidad: 3, impacto: 3 }).nivel, "alto");
    assert.equal(evaluarRiesgo({ ...plantilla, probabilidad: 2, impacto: 2 }).nivel, "medio");
    assert.equal(evaluarRiesgo({ ...plantilla, probabilidad: 1, impacto: 2 }).nivel, "bajo");
  });

  it("acota una escala fuera de rango en lugar de propagarla", () => {
    const r = evaluarRiesgo({ ...plantilla, probabilidad: 9, impacto: -3 });
    assert.equal(r.probabilidad, 5);
    assert.equal(r.impacto, 1);
    assert.equal(r.severidad, 5);
  });
});

describe("sensibilidad económica", () => {
  it("aplica cada variación solo a la parte del presupuesto que afecta", () => {
    // 20 % sobre el 50 % del presupuesto = 10 % de exposición total.
    const s = calcularSensibilidad(1_000_000, [
      { concepto: "Acero", variacionPct: 20, pesoPct: 50, justificacion: "j" },
    ]);

    assert.equal(s.pesimista, 1_100_000);
    assert.equal(s.contingenciaPct, 10);
    // El optimista recupera solo una fracción: los ahorros son menos probables.
    assert.ok(s.optimista > 900_000 && s.optimista < 1_000_000);
  });

  it("mantiene la contingencia dentro de límites defendibles", () => {
    const enorme = calcularSensibilidad(100, [
      { concepto: "x", variacionPct: 90, pesoPct: 100, justificacion: "j" },
    ]);
    const nula = calcularSensibilidad(100, []);

    assert.equal(enorme.contingenciaPct, 30);
    assert.equal(nula.contingenciaPct, 5);
    assert.equal(nula.pesimista, 100);
  });
});

/* ---------------------------------------------- Verificación adversarial -- */

describe("comprobaciones deterministas del verificador", () => {
  const partida = {
    clave: "P1", concepto: "Muro", unidad: "m2", cantidad: 10, precioUnitario: 100,
    importe: 1000, disciplina: "obra-civil" as const,
    matriz: { materiales: 60, manoObra: 25, equipo: 5, indirectos: 10 },
    supuesto: null,
  };
  const vacio = {
    requerimientos: [], hallazgos: [], diagramas: [], memoria: null, resumen: null,
    programa: null, viabilidad: null, diagramasPedidos: [], disciplinas: [],
  };

  it("no reporta nada cuando la aritmética cuadra", () => {
    const hallazgos = comprobar({ ...vacio, partidas: [partida], memoria: MEMORIA_DEMO });
    assert.deepEqual(hallazgos.filter((h) => h.id.startsWith("AUT-IMP")), []);
    assert.deepEqual(hallazgos.filter((h) => h.id.startsWith("AUT-MAT")), []);
  });

  it("detecta un importe que no es cantidad por precio unitario", () => {
    const hallazgos = comprobar({
      ...vacio,
      partidas: [{ ...partida, importe: 900 }],
      memoria: MEMORIA_DEMO,
    });
    const encontrado = hallazgos.find((h) => h.id === "AUT-IMP-P1");
    assert.ok(encontrado, "debía detectar el importe descuadrado");
    assert.equal(encontrado!.gravedad, "critico");
    assert.equal(encontrado!.automatico, true);
  });

  it("detecta una matriz que no suma su precio unitario", () => {
    const hallazgos = comprobar({
      ...vacio,
      partidas: [{ ...partida, matriz: { ...partida.matriz, indirectos: 40 } }],
      memoria: MEMORIA_DEMO,
    });
    assert.ok(hallazgos.some((h) => h.id === "AUT-MAT-P1"));
  });

  it("un hallazgo crítico baja la confianza y bloquea la entrega", () => {
    const hallazgos = comprobar({ ...vacio, partidas: [{ ...partida, importe: 1 }] });
    assert.equal(veredictoDe(hallazgos), "requiere-correccion");
    assert.ok(calcularConfianza(hallazgos) < 100);
  });

  it("sin hallazgos el paquete es entregable con confianza plena", () => {
    assert.equal(veredictoDe([]), "entregable");
    assert.equal(calcularConfianza([]), 100);
  });

  it("la confianza sigue bajando con muchos hallazgos en vez de tocar fondo", () => {
    const uno = (i: number) => ({
      id: `V${i}`,
      ambito: "costos" as const,
      gravedad: "alto" as const,
      titulo: "t",
      evidencia: "e",
      correccion: "c",
      automatico: false,
    });
    const diez = Array.from({ length: 10 }, (_, i) => uno(i));
    const veinte = Array.from({ length: 20 }, (_, i) => uno(i));

    // La resta lineal dejaba ambos en cero y el número perdía significado.
    assert.ok(calcularConfianza(veinte) < calcularConfianza(diez));
    assert.ok(calcularConfianza(diez) > 5);
    assert.ok(calcularConfianza(veinte) >= 5);
  });

  it("un crítico pesa más que un alto, y un alto más que un medio", () => {
    const con = (gravedad: "critico" | "alto" | "medio") => [
      { id: "V", ambito: "costos" as const, gravedad, titulo: "t", evidencia: "e", correccion: "c", automatico: false },
    ];
    assert.ok(calcularConfianza(con("critico")) < calcularConfianza(con("alto")));
    assert.ok(calcularConfianza(con("alto")) < calcularConfianza(con("medio")));
  });
});

/* ------------------------------------------- Depurado del andamiaje del modelo -- */

describe("depurador de andamiaje", () => {
  /** Une el flujo depurado como lo vería la interfaz. */
  function depurar(trozos: string[]): string {
    const d = depuradorDeAndamiaje();
    return trozos.map((t) => d.procesar(t)).join("") + d.cerrar();
  }

  it("elimina el bloque tool_code y el rótulo thought con su razonamiento", () => {
    const salida = depurar([
      "tool_code\nprint(google_search.search(queries=['supuestos']))\n",
      "thought\nThe user is asking about the assumptions.\n\n",
      "El presupuesto asume tres supuestos declarados.\n",
    ]);

    assert.ok(!salida.includes("tool_code"));
    assert.ok(!salida.includes("google_search"));
    assert.ok(!salida.includes("The user is asking"));
    assert.ok(salida.includes("El presupuesto asume tres supuestos declarados."));
  });

  it("no toca una respuesta legítima que mencione esas palabras dentro de una frase", () => {
    const texto = "El pensamiento (thought) del proyectista queda documentado.\n";
    assert.equal(depurar([texto]), texto);
  });

  it("recompone una línea partida entre dos trozos del flujo", () => {
    assert.equal(depurar(["La cister", "na es de 30 m³."]), "La cisterna es de 30 m³.");
  });

  it("descarta un andamiaje que llega troceado carácter a carácter", () => {
    const salida = depurar([..."tool_code\nprint(default_api.buscar())\n\nRespuesta real."]);
    assert.equal(salida.trim(), "Respuesta real.");
  });
});

/* ------------------------------------- Disposición de rótulos en el plano -- */

describe("colocación de rótulos", () => {
  const limites = { x0: 0, y0: 0, x1: 1000, y1: 800 };

  it("mide el solape de dos cajas y devuelve cero si no se tocan", () => {
    const a = { x: 100, y: 100, ancho: 40, alto: 20 };
    assert.equal(solape(a, { x: 100, y: 100, ancho: 40, alto: 20 }), 800);
    assert.equal(solape(a, { x: 400, y: 100, ancho: 40, alto: 20 }), 0);
  });

  it("aparta el segundo rótulo cuando el primero ya ocupa su sitio preferido", () => {
    const sitio = { x: 200, y: 200 };
    const bloques = [
      { id: "a", ancho: 80, alto: 20, candidatos: [sitio, { x: 200, y: 260 }] },
      { id: "b", ancho: 80, alto: 20, candidatos: [sitio, { x: 200, y: 260 }] },
    ];
    const puestos = colocar(bloques, [], limites);

    assert.deepEqual(puestos.get("a"), sitio);
    assert.deepEqual(puestos.get("b"), { x: 200, y: 260 });
  });

  it("esquiva un obstáculo aunque sea la posición preferida", () => {
    const puestos = colocar(
      [{ id: "a", ancho: 60, alto: 20, candidatos: [{ x: 300, y: 300 }, { x: 300, y: 400 }] }],
      [{ x: 300, y: 300, ancho: 60, alto: 20 }],
      limites,
    );
    assert.deepEqual(puestos.get("a"), { x: 300, y: 400 });
  });

  it("prefiere quedarse dentro del área útil antes que fuera del marco", () => {
    // La primera candidata está debajo del borde inferior: ahí caería sobre el
    // cajetín, que es exactamente lo que recortaba los rótulos.
    const puestos = colocar(
      [{ id: "a", ancho: 60, alto: 20, candidatos: [{ x: 500, y: 900 }, { x: 500, y: 700 }] }],
      [],
      limites,
    );
    assert.deepEqual(puestos.get("a"), { x: 500, y: 700 });
  });

  it("cuando todo está ocupado elige la posición que menos pisa", () => {
    const puestos = colocar(
      [{ id: "a", ancho: 100, alto: 20, candidatos: [{ x: 300, y: 300 }, { x: 340, y: 300 }] }],
      [{ x: 300, y: 300, ancho: 100, alto: 20 }],
      limites,
    );
    assert.deepEqual(puestos.get("a"), { x: 340, y: 300 });
  });

  it("sitúa un punto a lo largo de la polilínea por longitud real", () => {
    const puntos = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    assert.deepEqual(puntoEn(puntos, 0), { x: 0, y: 0 });
    assert.deepEqual(puntoEn(puntos, 0.5), { x: 100, y: 0 });
    assert.deepEqual(puntoEn(puntos, 1), { x: 100, y: 100 });
  });

  it("estima anchuras crecientes con la longitud del texto", () => {
    assert.ok(anchoTexto("Tablero General", 12) > anchoTexto("TG", 12));
    assert.ok(anchoTexto("480 V", 10, true) > 0);
  });
});

/* --------------------------------------- Gráficos analíticos del dictamen -- */

describe("treemap", () => {
  it("reparte todo el lienzo sin dejar hueco ni desbordarlo", () => {
    const celdas = treemap(
      [
        { etiqueta: "a", valor: 50 },
        { etiqueta: "b", valor: 30 },
        { etiqueta: "c", valor: 20 },
      ],
      200,
      100,
    );

    assert.equal(celdas.length, 3);
    const area = celdas.reduce((s, c) => s + c.ancho * c.alto, 0);
    assert.ok(Math.abs(area - 200 * 100) < 1, `área repartida ${area}`);
    for (const celda of celdas) {
      assert.ok(celda.x >= -0.001 && celda.x + celda.ancho <= 200.001);
      assert.ok(celda.y >= -0.001 && celda.y + celda.alto <= 100.001);
    }
  });

  it("da a cada celda un área proporcional a su valor", () => {
    const celdas = treemap(
      [
        { etiqueta: "grande", valor: 75 },
        { etiqueta: "chica", valor: 25 },
      ],
      100,
      100,
    );
    const grande = celdas.find((c) => c.etiqueta === "grande")!;
    const chica = celdas.find((c) => c.etiqueta === "chica")!;

    assert.ok(Math.abs((grande.ancho * grande.alto) / (chica.ancho * chica.alto) - 3) < 0.05);
    assert.ok(Math.abs(grande.fraccion - 0.75) < 0.001);
  });

  it("ignora valores nulos o negativos y devuelve vacío si no queda nada", () => {
    assert.deepEqual(treemap([{ etiqueta: "x", valor: 0 }], 100, 100), []);
    assert.equal(treemap([{ etiqueta: "x", valor: -5 }, { etiqueta: "y", valor: 10 }], 100, 100).length, 1);
  });
});

describe("histograma", () => {
  it("mete cada valor en un intervalo y no pierde ninguno", () => {
    const valores = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const intervalos = histograma(valores);
    assert.equal(
      intervalos.reduce((s, i) => s + i.cuenta, 0),
      valores.length,
    );
  });

  it("incluye el máximo en el último intervalo en vez de dejarlo fuera", () => {
    const intervalos = histograma([1, 2, 3, 4, 100]);
    assert.equal(intervalos[intervalos.length - 1].cuenta >= 1, true);
    assert.equal(intervalos.reduce((s, i) => s + i.cuenta, 0), 5);
  });

  it("resuelve el caso de un único valor repetido sin dividir por cero", () => {
    const intervalos = histograma([7, 7, 7]);
    assert.equal(intervalos.length, 1);
    assert.equal(intervalos[0].cuenta, 3);
  });
});

describe("curva de avance", () => {
  const programa = {
    actividades: [
      { id: "A", nombre: "A", frente: "f", duracionDias: 10, predecesoras: [], hito: false, inicio: 0, fin: 10, holgura: 0, critica: true },
      { id: "B", nombre: "B", frente: "f", duracionDias: 10, predecesoras: ["A"], hito: false, inicio: 10, fin: 20, holgura: 0, critica: true },
    ],
    duracionDias: 20,
    rutaCritica: ["A", "B"],
    supuestos: [],
    avisos: [],
  };

  it("va de cero a uno de forma monótona", () => {
    const curva = curvaDeAvance(programa, 20);
    assert.equal(curva[0].avance, 0);
    assert.ok(Math.abs(curva[curva.length - 1].avance - 1) < 1e-9);
    for (let i = 1; i < curva.length; i++) {
      assert.ok(curva[i].avance >= curva[i - 1].avance);
    }
  });

  it("a mitad del plazo lleva la mitad ejecutada si las actividades son iguales", () => {
    const curva = curvaDeAvance(programa, 20);
    const mitad = curva.find((p) => Math.abs(p.dia - 10) < 1e-9)!;
    assert.ok(Math.abs(mitad.avance - 0.5) < 1e-9);
  });
});

describe("superficie de severidad", () => {
  it("construye una malla completa cuya severidad es el producto de los ejes", () => {
    const s = superficieDeSeveridad([], 4);
    assert.equal(s.malla.length, 5);
    assert.equal(s.malla[0].length, 5);
    assert.equal(s.malla[4][4].severidad, 25);
    assert.equal(s.malla[0][0].severidad, 1);
  });

  it("levanta el vértice sobre su propio punto del plano según la severidad", () => {
    // Se compara contra el MISMO punto del plano con altura cero: comparar dos
    // esquinas distintas mezclaría el relieve con la profundidad isométrica.
    const enAlto = proyectarIsometrico({ probabilidad: 5, impacto: 5, severidad: 25 }, 300, 200, 25);
    const aRas = proyectarIsometrico({ probabilidad: 5, impacto: 5, severidad: 0 }, 300, 200, 25);
    // En SVG la y crece hacia abajo: más severo, y menor.
    assert.ok(enAlto.y < aRas.y);
    assert.equal(enAlto.x, aRas.x);
  });

  it("separa en horizontal las dos esquinas opuestas del plano", () => {
    const izquierda = proyectarIsometrico({ probabilidad: 5, impacto: 1, severidad: 5 }, 300, 200, 25);
    const derecha = proyectarIsometrico({ probabilidad: 1, impacto: 5, severidad: 5 }, 300, 200, 25);
    assert.ok(derecha.x > izquierda.x);
  });
});

describe("escala logarítmica", () => {
  it("sitúa el mínimo en 0, el máximo en 1 y la media geométrica en el centro", () => {
    assert.equal(posicionLogaritmica(1, 1, 100), 0);
    assert.equal(posicionLogaritmica(100, 1, 100), 1);
    assert.ok(Math.abs(posicionLogaritmica(10, 1, 100) - 0.5) < 1e-9);
  });

  it("no explota con valores no positivos", () => {
    assert.equal(posicionLogaritmica(0, 1, 100), 0);
    assert.equal(posicionLogaritmica(-3, 1, 100), 0);
  });
});
