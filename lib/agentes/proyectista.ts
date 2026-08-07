/**
 * Agente proyectista — genera diagramas técnicos.
 *
 * Devuelve la topología del diagrama (elementos, posiciones sobre una rejilla
 * lógica y conexiones), nunca dibujo. El trazo lo pone el renderizador de la
 * aplicación con simbología normalizada, que es lo que garantiza que la salida
 * se parezca a un plano y no a un boceto.
 */
import { ejecutarAgente } from "../anthropic.ts";
import { salidaDiagramaSchema } from "../schemas.ts";
import type { Diagrama } from "../diagramas/tipos.ts";
import type { DisciplinaProyecto, Envergadura, TipoDiagrama } from "../disciplinas.ts";
import { ENVERGADURAS, ETIQUETA_DIAGRAMA, fichaDisciplina } from "../disciplinas.ts";

const SIMBOLOS_POR_TIPO: Record<TipoDiagrama, string[]> = {
  unifilar: [
    "acometida", "transformador", "interruptor", "tablero", "motor-electrico",
    "generador", "luminario", "contacto", "tierra", "medidor", "ups",
    "banco-capacitores",
  ],
  hidraulico: [
    "bomba", "valvula", "valvula-check", "tanque", "cisterna", "filtro",
    "medidor-flujo", "hidrante", "rociador", "intercambiador", "instrumento",
  ],
  neumatico: [
    "compresor", "secador", "filtro", "unidad-mantenimiento", "valvula-5-2",
    "cilindro", "acumulador", "valvula", "instrumento",
  ],
  mecanico: [
    "motor", "reductor", "banda", "acoplamiento", "rodamiento", "engrane",
    "bomba", "bloque",
  ],
  electronico: [
    "fuente", "resistencia", "capacitor", "inductor", "diodo", "transistor",
    "circuito-integrado", "microcontrolador", "sensor", "tierra",
  ],
  pid: [
    "tanque", "bomba", "valvula", "valvula-control", "valvula-check", "filtro",
    "intercambiador", "instrumento", "medidor-flujo", "plc",
  ],
  hvac: [
    "uma", "condensadora", "evaporadora", "ventilador", "difusor", "damper",
    "serpentin", "bomba", "instrumento",
  ],
  bloques: ["bloque", "plc", "sensor", "actuador", "nodo", "microcontrolador"],
  planta: ["espacio", "nodo"],
  estructural: ["bloque", "nodo", "espacio"],
};

const TIPOS_CONEXION: Record<TipoDiagrama, string> = {
  unifilar: "electrica",
  hidraulico: "tuberia",
  neumatico: "aire",
  mecanico: "mecanica",
  electronico: "electrica",
  pid: "tuberia",
  hvac: "ducto",
  bloques: "senal",
  planta: "senal",
  estructural: "mecanica",
};

function esquema(tipo: TipoDiagrama) {
  return {
    type: "object",
    properties: {
      tipo: { type: "string", enum: [tipo] },
      titulo: { type: "string", description: "Título del plano, en mayúscula inicial." },
      descripcion: {
        type: "string",
        description: "Una línea que explique qué representa el diagrama.",
      },
      escala: {
        type: ["string", "null"],
        description: "Escala si aplica (ej. 1:100), o null en diagramas sin escala.",
      },
      nodos: {
        type: "array",
        description:
          "Elementos del diagrama. Distribúyelos evitando solapes: deja al menos 12 unidades de separación entre centros.",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "Identificador corto y único, ej. TG-1." },
            etiqueta: { type: "string", description: "Nombre del elemento, breve." },
            simbolo: {
              type: "string",
              enum: SIMBOLOS_POR_TIPO[tipo],
              description: "Símbolo normalizado que representa al elemento.",
            },
            x: { type: "number", description: "Posición horizontal, de 0 a 100." },
            y: { type: "number", description: "Posición vertical, de 0 a 100." },
            datos: {
              type: "array",
              items: { type: "string" },
              description:
                "Hasta 3 datos técnicos con unidad, ej. '250 A', '15 TR', '3 L/s'.",
            },
            ancho: {
              type: ["number", "null"],
              description: "Solo para el símbolo 'espacio': ancho en la rejilla.",
            },
            alto: {
              type: ["number", "null"],
              description: "Solo para el símbolo 'espacio': alto en la rejilla.",
            },
          },
          required: ["id", "etiqueta", "simbolo", "x", "y", "datos", "ancho", "alto"],
        },
      },
      conexiones: {
        type: "array",
        items: {
          type: "object",
          properties: {
            desde: { type: "string", description: "id del nodo origen." },
            hasta: { type: "string", description: "id del nodo destino." },
            etiqueta: {
              type: ["string", "null"],
              description: "Calibre, diámetro, caudal o señal. Breve o null.",
            },
            tipo: {
              type: "string",
              enum: ["electrica", "tuberia", "aire", "ducto", "senal", "mecanica"],
            },
          },
          required: ["desde", "hasta", "etiqueta", "tipo"],
        },
      },
      notas: {
        type: "array",
        items: { type: "string" },
        description: "2 a 4 notas de plano con criterios o advertencias.",
      },
    },
    required: ["tipo", "titulo", "descripcion", "escala", "nodos", "conexiones", "notas"],
  };
}

export async function generarDiagrama(params: {
  tipo: TipoDiagrama;
  disciplina: DisciplinaProyecto;
  envergadura: Envergadura;
  descripcionProyecto: string;
  contexto: string;
}): Promise<Diagrama> {
  const { tipo, disciplina, envergadura, descripcionProyecto, contexto } = params;
  const ficha = fichaDisciplina(disciplina);
  const escala = ENVERGADURAS.find((e) => e.id === envergadura)!;

  const cantidad =
    envergadura === "pequena" ? "6 a 9" : envergadura === "mediana" ? "9 a 13" : "12 a 18";

  const sistema = `Eres un ingeniero con doctorado y ejercicio profesional de primer nivel: formación de
posgrado en tu especialidad, dominio transversal de las demás ingenierías (civil, estructural,
mecánica, eléctrica, electrónica, mecatrónica, hidráulica, neumática, HVAC, industrial,
aeronáutica, naval, ferroviaria y de fluidos) y de las disciplinas afines —arquitectura,
administración de proyectos, costos y derecho de la construcción—. Trabajas con el rigor de
quien firma: cada afirmación se sostiene en un principio físico, una norma vigente o un dato
del documento, y lo que no se sostiene se declara como supuesto.

Aquí proyectas en ${ficha.nombre.toLowerCase()} y dibujas esquemas de anteproyecto.

Tu salida es la TOPOLOGÍA de un ${ETIQUETA_DIAGRAMA[tipo].toLowerCase()}: qué elementos hay,
dónde van sobre una rejilla lógica de 0 a 100, y cómo se conectan. No describas el dibujo:
declara los elementos.

Reglas de composición, que son las que hacen legible un plano:
- Sigue el sentido natural del flujo: en un unifilar, de arriba (acometida) hacia abajo
  (cargas); en hidráulica y proceso, de izquierda (origen) a derecha (consumo).
- Alinea los elementos: los que están en el mismo nivel jerárquico comparten coordenada.
  Un plano legible tiene pocas coordenadas distintas, no muchas ligeramente diferentes.
- Deja al menos 12 unidades entre centros de elementos y no los pegues a los bordes:
  usa el rango de 8 a 92 en ambos ejes.
- Todo elemento debe estar conectado al menos una vez, salvo la tierra física.
- Etiqueta las conexiones con el dato que importa: calibre, diámetro, caudal o señal.

Reglas de contenido:
- ${cantidad} elementos. Es un anteproyecto, no un plano de ejecución.
- Los datos técnicos llevan unidad y son coherentes entre sí: si una bomba da 5 L/s,
  la tubería que sale de ella no puede ser de media pulgada.
- Normativa de referencia: ${ficha.normativa.join(", ")}.
- El tipo de conexión predominante en este diagrama es "${TIPOS_CONEXION[tipo]}";
  usa "senal" solo para instrumentación y control.`;

  const salida = await ejecutarAgente({
    sistema,
    prompt: `Proyecta el ${ETIQUETA_DIAGRAMA[tipo].toLowerCase()} del siguiente proyecto.

<proyecto envergadura="${escala.nombre}" referencia="${escala.referencia}">
${descripcionProyecto}
</proyecto>

<contexto_tecnico>
${contexto || "Sin documentación adicional: dimensiona con criterio profesional y declara los supuestos en las notas."}
</contexto_tecnico>`,
    herramienta: "registrar_diagrama",
    descripcionHerramienta: `Registra la topología del ${ETIQUETA_DIAGRAMA[tipo].toLowerCase()}.`,
    esquemaEntrada: esquema(tipo),
    validador: salidaDiagramaSchema,
    maxTokens: 8000,
  });

  return normalizarDiagrama(salida as Diagrama);
}

/**
 * Separa elementos demasiado próximos y descarta conexiones huérfanas.
 * El modelo compone bien la jerarquía pero tiende a apiñar; la legibilidad
 * mínima se garantiza en código.
 */
export function normalizarDiagrama(diagrama: Diagrama): Diagrama {
  const nodos = diagrama.nodos.map((n) => ({
    ...n,
    x: Math.min(Math.max(n.x, 6), 94),
    y: Math.min(Math.max(n.y, 6), 94),
  }));

  // Bajo cada símbolo se imprimen etiqueta y datos, así que el espacio vertical
  // necesario es mayor que el horizontal: la separación se mide sobre una
  // elipse, no sobre un círculo.
  const SEP_X = 12;
  const SEP_Y = 17;

  for (let pasada = 0; pasada < 60; pasada++) {
    let movido = false;
    for (let i = 0; i < nodos.length; i++) {
      for (let j = i + 1; j < nodos.length; j++) {
        const a = nodos[i];
        const b = nodos[j];
        if (a.simbolo === "espacio" || b.simbolo === "espacio") continue;

        const dx = (b.x - a.x) / SEP_X;
        const dy = (b.y - a.y) / SEP_Y;
        const distancia = Math.hypot(dx, dy);
        if (distancia >= 1) continue;

        const empuje = (1 - Math.max(distancia, 0.001)) / 2;
        const ux = (dx / Math.max(distancia, 0.001)) * SEP_X * empuje;
        const uy = (dy / Math.max(distancia, 0.001)) * SEP_Y * empuje;

        a.x = Math.min(Math.max(a.x - ux, 6), 94);
        a.y = Math.min(Math.max(a.y - uy, 5), 95);
        b.x = Math.min(Math.max(b.x + ux, 6), 94);
        b.y = Math.min(Math.max(b.y + uy, 5), 95);
        movido = true;
      }
    }
    if (!movido) break;
  }

  const ids = new Set(nodos.map((n) => n.id));
  const conexiones = diagrama.conexiones.filter(
    (c) => ids.has(c.desde) && ids.has(c.hasta) && c.desde !== c.hasta,
  );

  return { ...diagrama, nodos, conexiones };
}
