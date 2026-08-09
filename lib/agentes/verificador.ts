/**
 * Verificador adversarial — la última compuerta antes de entregar.
 *
 * A diferencia de los demás agentes, este no produce: revisa. Recibe el paquete
 * ya terminado con contexto fresco —no ha visto razonar a nadie— y su encargo
 * es encontrar el error, no confirmar el acierto. La autocrítica de quien acaba
 * de escribir algo es notoriamente mala; un revisor que empieza suponiendo que
 * hay un fallo encuentra lo que el autor ya no ve.
 *
 * Combina dos fuentes:
 *  · Las comprobaciones deterministas, que miden y nunca opinan.
 *  · La revisión del modelo, que juzga coherencia técnica y huecos de alcance.
 *
 * Si el modelo falla, el informe se emite igual con la parte automática: una
 * verificación parcial vale más que ninguna.
 */
import { ejecutarAgente } from "../modelo/index.ts";
import { salidaVerificadorSchema } from "../schemas.ts";
import type { HallazgoVerificacion, Verificacion } from "../tipos-proyecto.ts";
import {
  calcularConfianza,
  comprobar,
  veredictoDe,
  type PaqueteVerificable,
} from "../verificacion/comprobaciones.ts";
import { dineroExacto } from "../formato.ts";
import type { Moneda } from "../moneda/tipos.ts";
import type { DisciplinaProyecto, Envergadura } from "../disciplinas.ts";
import { ENVERGADURAS, fichaDisciplina } from "../disciplinas.ts";

const AMBITOS = [
  "programa",
  "extractor",
  "costos",
  "normativo",
  "proyectista",
  "memoria",
  "sintesis",
  "programacion",
  "riesgos",
] as const;

const ESQUEMA = {
  type: "object",
  properties: {
    hallazgos: {
      type: "array",
      description:
        "Defectos encontrados en el paquete, de 0 a 12. Solo lo que puedas sostener con un dato del propio entregable. Si no encuentras nada real, devuelve la lista vacía: inventar un defecto es peor que no encontrarlo.",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "Identificador corto, ej. 'V01'." },
          ambito: {
            type: "string",
            enum: [...AMBITOS],
            description: "Agente cuya salida presenta el defecto.",
          },
          gravedad: {
            type: "string",
            enum: ["critico", "alto", "medio", "bajo"],
            description:
              "critico: invalida el entregable o compromete la seguridad. alto: obliga a corregir antes de entregar. medio: debilita el documento. bajo: mejora deseable.",
          },
          titulo: { type: "string", description: "Qué está mal, en una frase." },
          evidencia: {
            type: "string",
            description:
              "El dato concreto del entregable que lo demuestra: la cifra, la partida, el requerimiento o la norma. Sin evidencia no hay hallazgo.",
          },
          correccion: { type: "string", description: "Qué habría que corregir, en concreto." },
        },
        required: ["id", "ambito", "gravedad", "titulo", "evidencia", "correccion"],
      },
    },
    comprobado: {
      type: "array",
      items: { type: "string" },
      description:
        "Qué revisaste y encontraste correcto, de 3 a 6 puntos. Concreto: 'la memoria cubre las tres instalaciones del alcance', no 'todo bien'.",
    },
  },
  required: ["hallazgos", "comprobado"],
};

export async function verificar(params: {
  nombre: string;
  disciplina: DisciplinaProyecto;
  envergadura: Envergadura;
  ubicacion?: string;
  alcance: string;
  moneda: Moneda;
  paquete: PaqueteVerificable;
}): Promise<Verificacion> {
  const { nombre, disciplina, envergadura, ubicacion, alcance, moneda, paquete } = params;

  // La parte que no depende del modelo se calcula siempre.
  const automaticos = comprobar(paquete);

  let delModelo: HallazgoVerificacion[] = [];
  let comprobado: string[] = [];

  try {
    const salida = await revisarConModelo({
      nombre,
      disciplina,
      envergadura,
      ubicacion,
      alcance,
      moneda,
      paquete,
    });
    delModelo = salida.hallazgos.map((h) => ({ ...h, automatico: false }));
    comprobado = salida.comprobado;
  } catch {
    // Sin revisión semántica el informe sigue siendo válido, pero debe decirlo.
    comprobado = [
      "Comprobaciones aritméticas y de cobertura ejecutadas. La revisión técnica asistida no pudo completarse.",
    ];
  }

  const hallazgos = ordenar([...automaticos, ...delModelo]);

  return {
    hallazgos,
    confianza: calcularConfianza(hallazgos),
    veredicto: veredictoDe(hallazgos),
    comprobado,
  };
}

async function revisarConModelo(params: {
  nombre: string;
  disciplina: DisciplinaProyecto;
  envergadura: Envergadura;
  ubicacion?: string;
  alcance: string;
  moneda: Moneda;
  paquete: PaqueteVerificable;
}) {
  const { nombre, disciplina, envergadura, ubicacion, alcance, moneda, paquete } = params;
  const ficha = fichaDisciplina(disciplina);
  const escala = ENVERGADURAS.find((e) => e.id === envergadura)!;

  const sistema = `Eres el revisor técnico independiente de un despacho de ingeniería. No participaste en
este proyecto y no tienes ningún interés en que esté bien: tu trabajo es encontrar lo que
está mal antes de que lo encuentre el cliente, la autoridad o el tribunal.

Revisas el paquete completo de un proyecto de ${ficha.nombre.toLowerCase()} de envergadura
${escala.nombre.toLowerCase()} (${escala.referencia}).

Qué buscas, en este orden:
1. Contradicciones entre piezas: que el presupuesto, la memoria, los planos y el cronograma
   no describan proyectos distintos. Una capacidad en la memoria que no aparece en el
   catálogo es un hallazgo.
2. Huecos de alcance: la instalación que el proyecto necesita y nadie proyectó, la partida
   que la norma obliga y nadie presupuestó, el requerimiento crítico que no se ejecuta.
3. Cifras que no se sostienen: dimensionamientos incoherentes con la envergadura, precios
   fuera de mercado por orden de magnitud, plazos imposibles para el volumen de obra.
4. Normativa citada de forma incorrecta o inaplicable al caso.

Reglas duras:
- Sin evidencia no hay hallazgo. Cita la cifra, la partida, el requerimiento o la norma.
- No repitas errores aritméticos de importe ni de matriz: ya se comprobaron por separado.
- AGREGA lo que comparte causa. Si faltan cinco partidas que la normativa obliga, eso es
  UN hallazgo sobre la cobertura del presupuesto que las enumera en su evidencia, no cinco
  hallazgos. Repetir la misma causa infla la lista y hunde la confianza sin añadir nada
  que el lector no supiera ya tras el primero.
- Un hallazgo normativo que el agente normativo ya reportó CON su recomendación está
  documentado, no oculto: solo es defecto del paquete si además debía costearse y no se
  costeó, y entonces el ámbito es «costos» y va agregado con los demás.
- No inventes defectos para parecer riguroso. Una lista vacía es una respuesta legítima.
- No propongas mejoras de estilo ni de redacción: solo lo que cambia el resultado técnico
  o económico.
- Español técnico, sin Markdown.`;

  const total = paquete.partidas.reduce((suma, p) => suma + p.importe, 0);

  const bloques = [
    `<alcance>\n${alcance.slice(0, 12_000)}\n</alcance>`,
    `<requerimientos>\n${paquete.requerimientos
      .map((r) => `- [${r.id}] ${r.descripcion}${r.critico ? " (crítico)" : ""}`)
      .join("\n")}\n</requerimientos>`,
    `<presupuesto total="${dineroExacto({ valor: total, moneda })}">\n${paquete.partidas
      .map(
        (p) =>
          `- ${p.clave} ${p.concepto}: ${p.cantidad} ${p.unidad} × ${p.precioUnitario} = ${p.importe} (${p.disciplina})`,
      )
      .join("\n")}\n</presupuesto>`,
    `<hallazgos_normativos>\n${paquete.hallazgos
      .map((h) => `- [${h.riesgo}] ${h.titulo} — ${h.norma}${h.articulo ? ` ${h.articulo}` : ""}`)
      .join("\n")}\n</hallazgos_normativos>`,
    `<laminas>\n${paquete.diagramas
      .map((d) => `- ${d.titulo} (${d.tipo}): ${d.nodos.length} elementos`)
      .join("\n")}\n</laminas>`,
  ];

  if (paquete.memoria) {
    bloques.push(
      `<memoria>\nSistemas: ${paquete.memoria.sistemas.map((s) => s.nombre).join(", ")}\nNormativa: ${paquete.memoria.normativa.join(", ")}\nConclusiones: ${paquete.memoria.conclusiones}\n</memoria>`,
    );
  }
  if (paquete.programa) {
    bloques.push(
      `<cronograma dias="${paquete.programa.duracionDias}">\n${paquete.programa.actividades
        .map(
          (a) =>
            `- ${a.id} ${a.nombre} (${a.frente}): ${a.duracionDias} d, inicia día ${a.inicio}${a.critica ? ", ruta crítica" : ""}`,
        )
        .join("\n")}\n</cronograma>`,
    );
  }
  if (paquete.viabilidad) {
    bloques.push(
      `<riesgos>\n${paquete.viabilidad.riesgos
        .map((r) => `- [${r.nivel}] ${r.titulo} (P${r.probabilidad}×I${r.impacto})`)
        .join("\n")}\n</riesgos>`,
    );
  }
  if (paquete.resumen) {
    bloques.push(
      `<resumen_ejecutivo total="${paquete.resumen.totalEstimado}" riesgo="${paquete.resumen.riesgoGlobal}">\n${paquete.resumen.sintesis}\n</resumen_ejecutivo>`,
    );
  }

  return ejecutarAgente({
    sistema,
    prompt: `Revisa el paquete de este proyecto y reporta lo que esté mal.

<proyecto nombre="${nombre}" ubicacion="${ubicacion || "México (asumir)"}">
${bloques.join("\n\n")}
</proyecto>`,
    herramienta: "registrar_verificacion",
    descripcionHerramienta:
      "Registra los defectos encontrados en el paquete y lo que se comprobó correcto.",
    esquemaEntrada: ESQUEMA,
    validador: salidaVerificadorSchema,
    maxTokens: 8_000,
  });
}

/** Lo grave primero, y dentro de cada nivel lo medido antes que lo opinado. */
function ordenar(hallazgos: HallazgoVerificacion[]): HallazgoVerificacion[] {
  const peso = { critico: 0, alto: 1, medio: 2, bajo: 3 };
  return [...hallazgos].sort(
    (a, b) =>
      peso[a.gravedad] - peso[b.gravedad] || Number(b.automatico) - Number(a.automatico),
  );
}
