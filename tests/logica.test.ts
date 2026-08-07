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
import { partidaSchema, resumenEjecutivoSchema } from "../lib/schemas.ts";
import { HALLAZGOS_DEMO, PARTIDAS_DEMO, RESUMEN_DEMO } from "../lib/demo.ts";
import type { Hallazgo, Partida } from "../lib/types.ts";

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

  it("rechaza una moneda distinta de MXN", () => {
    const invalido = { ...RESUMEN_DEMO, moneda: "USD" };
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
