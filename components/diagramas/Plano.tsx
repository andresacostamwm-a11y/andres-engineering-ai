"use client";

import { useId, useMemo } from "react";
import type { Diagrama, NodoDiagrama, TipoConexion } from "@/lib/diagramas/tipos";
import { SimboloTecnico, radioSimbolo } from "./Simbolos";
import {
  anchoTexto,
  colocar,
  puntoEn,
  type BloqueColocable,
  type Caja,
} from "@/lib/diagramas/disposicion";

/**
 * Renderiza un diagrama técnico como plano: marco, cajetín, rejilla de
 * referencia, simbología y ruteo ortogonal de las conexiones.
 *
 * El ruteo es en L (horizontal-vertical) porque es como se dibuja realmente un
 * unifilar o un P&ID; las diagonales solo aparecen en diagramas de bloques,
 * donde sí son convención.
 *
 * Los rótulos no se dibujan donde caigan: pasan antes por el colocador de
 * `lib/diagramas/disposicion`, que les busca hueco. Sin ese paso, un unifilar
 * con veinte elementos acaba con las palabras montadas unas sobre otras y el
 * plano deja de poderse leer.
 */

const ANCHO = 1200;
const ALTO = 900;
const MARGEN = 56;
const ALTO_CAJETIN = 96;

const AREA = {
  x0: MARGEN,
  y0: MARGEN,
  x1: ANCHO - MARGEN,
  y1: ALTO - MARGEN - ALTO_CAJETIN,
};

/** Métrica de los textos del plano. Se usa para medir y para dibujar. */
const TEXTO = {
  etiqueta: 12,
  dato: 10,
  conexion: 10.5,
  /** Separación entre el renglón de la etiqueta y el primer dato. */
  interlineado: 12,
};

/** Puntos que se muestrean de cada trazo para tratarlo como obstáculo. */
const MUESTRAS_TRAZO = 10;

const ESTILO_CONEXION: Record<TipoConexion, { trazo: string; ancho: number }> = {
  electrica: { trazo: "", ancho: 1.9 },
  tuberia: { trazo: "", ancho: 2.6 },
  aire: { trazo: "7 4", ancho: 1.9 },
  ducto: { trazo: "", ancho: 3.4 },
  senal: { trazo: "3 4", ancho: 1.4 },
  mecanica: { trazo: "10 3 2 3", ancho: 2.1 },
};

export function Plano({
  diagrama,
  proyecto,
  className = "",
}: {
  diagrama: Diagrama;
  proyecto?: { nombre: string; disciplina: string; fecha: string };
  className?: string;
}) {
  const idBase = useId().replace(/:/g, "");

  const posiciones = useMemo(() => {
    const mapa = new Map<string, { x: number; y: number }>();
    for (const nodo of diagrama.nodos) {
      mapa.set(nodo.id, {
        x: AREA.x0 + (Math.min(Math.max(nodo.x, 0), 100) / 100) * (AREA.x1 - AREA.x0),
        y: AREA.y0 + (Math.min(Math.max(nodo.y, 0), 100) / 100) * (AREA.y1 - AREA.y0),
      });
    }
    return mapa;
  }, [diagrama.nodos]);

  const ortogonal = diagrama.tipo !== "bloques";

  const disposicion = useMemo(
    () => calcularDisposicion(diagrama, posiciones, ortogonal),
    [diagrama, posiciones, ortogonal],
  );

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      className={className}
      data-plano="true"
      role="img"
      aria-label={`${diagrama.titulo}. ${diagrama.descripcion}`}
    >
      <defs>
        <pattern
          id={`rejilla-${idBase}`}
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M24 0H0V24"
            fill="none"
            stroke="var(--color-borde)"
            strokeWidth="0.6"
            opacity="0.55"
          />
        </pattern>
        <marker
          id={`flecha-${idBase}`}
          viewBox="0 0 10 10"
          refX="8.5"
          refY="5"
          markerWidth="5.5"
          markerHeight="5.5"
          orient="auto-start-reverse"
        >
          <path d="M0 0 10 5 0 10z" fill="var(--color-tinta-media)" />
        </marker>
      </defs>

      {/* Hoja */}
      <rect width={ANCHO} height={ALTO} fill="var(--color-superficie)" />
      <rect
        x={AREA.x0}
        y={AREA.y0}
        width={AREA.x1 - AREA.x0}
        height={AREA.y1 - AREA.y0}
        fill={`url(#rejilla-${idBase})`}
      />

      {/* Marco del plano */}
      <rect
        x={18}
        y={18}
        width={ANCHO - 36}
        height={ALTO - 36}
        fill="none"
        stroke="var(--color-tinta)"
        strokeWidth="2"
      />
      <rect
        x={28}
        y={28}
        width={ANCHO - 56}
        height={ALTO - 56}
        fill="none"
        stroke="var(--color-tinta)"
        strokeWidth="0.8"
      />

      {/* Áreas (plantas arquitectónicas) por debajo de todo lo demás */}
      {diagrama.nodos
        .filter((n) => n.simbolo === "espacio")
        .map((nodo) => {
          const p = posiciones.get(nodo.id)!;
          const w = ((nodo.ancho ?? 18) / 100) * (AREA.x1 - AREA.x0);
          const h = ((nodo.alto ?? 14) / 100) * (AREA.y1 - AREA.y0);
          return (
            <g key={nodo.id}>
              <rect
                x={p.x - w / 2}
                y={p.y - h / 2}
                width={w}
                height={h}
                fill="var(--color-acento-tenue)"
                stroke="var(--color-tinta)"
                strokeWidth="1.6"
              />
              <text
                x={p.x}
                y={p.y - 2}
                textAnchor="middle"
                fontSize="13"
                fontWeight="600"
                fill="var(--color-tinta)"
              >
                {nodo.etiqueta}
              </text>
              {nodo.datos[0] && (
                <text
                  x={p.x}
                  y={p.y + 14}
                  textAnchor="middle"
                  fontSize="11"
                  fontFamily="var(--font-mono)"
                  fill="var(--color-tinta-media)"
                >
                  {nodo.datos[0]}
                </text>
              )}
            </g>
          );
        })}

      {/* Conexiones */}
      {diagrama.conexiones.map((conexion, i) => {
        const a = posiciones.get(conexion.desde);
        const b = posiciones.get(conexion.hasta);
        if (!a || !b) return null;

        const nodoA = diagrama.nodos.find((n) => n.id === conexion.desde)!;
        const nodoB = diagrama.nodos.find((n) => n.id === conexion.hasta)!;
        const estilo = ESTILO_CONEXION[conexion.tipo];

        const { d } = ruta(a, b, radioSimbolo(nodoA.simbolo), radioSimbolo(nodoB.simbolo), ortogonal);
        const rotulo = disposicion.conexiones.get(claveConexion(conexion, i));

        return (
          <g key={`${conexion.desde}-${conexion.hasta}-${i}`}>
            <path
              d={d}
              fill="none"
              stroke="var(--color-tinta-media)"
              strokeWidth={estilo.ancho}
              strokeDasharray={estilo.trazo || undefined}
              strokeLinejoin="round"
              markerEnd={`url(#flecha-${idBase})`}
            />
            {conexion.etiqueta && rotulo && (
              <>
                {/* El fondo opaco impide que el rótulo se lea sobre el trazo. */}
                <rect
                  x={rotulo.x - rotulo.ancho / 2}
                  y={rotulo.y - 8}
                  width={rotulo.ancho}
                  height={16}
                  rx={3}
                  fill="var(--color-superficie)"
                />
                <text
                  x={rotulo.x}
                  y={rotulo.y + 3.5}
                  textAnchor="middle"
                  fontSize={TEXTO.conexion}
                  fontFamily="var(--font-mono)"
                  fill="var(--color-tinta-media)"
                >
                  {conexion.etiqueta}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* Símbolos */}
      {diagrama.nodos
        .filter((n) => n.simbolo !== "espacio")
        .map((nodo) => (
          <Elemento
            key={nodo.id}
            nodo={nodo}
            p={posiciones.get(nodo.id)!}
            rotulo={disposicion.nodos.get(nodo.id)!}
          />
        ))}

      {/* Cajetín */}
      <Cajetin diagrama={diagrama} proyecto={proyecto} />
    </svg>
  );
}

function Elemento({
  nodo,
  p,
  rotulo,
}: {
  nodo: NodoDiagrama;
  p: { x: number; y: number };
  /** Centro del bloque de texto, ya resuelto sin colisiones. */
  rotulo: { x: number; y: number; alto: number };
}) {
  const datos = nodo.datos.slice(0, 2);
  // El bloque se ancla por su primer renglón, no por su centro.
  const primeraLinea = rotulo.y - rotulo.alto / 2 + TEXTO.etiqueta;

  return (
    <g>
      <g transform={`translate(${p.x} ${p.y})`} className="text-[var(--color-acento-fuerte)]">
        <SimboloTecnico simbolo={nodo.simbolo} />
      </g>

      <text
        x={rotulo.x}
        y={primeraLinea}
        textAnchor="middle"
        fontSize={TEXTO.etiqueta}
        fontWeight="600"
        fill="var(--color-tinta)"
      >
        {nodo.etiqueta}
      </text>

      {datos.map((dato, i) => (
        <text
          key={i}
          x={rotulo.x}
          y={primeraLinea + TEXTO.interlineado * (i + 1)}
          textAnchor="middle"
          fontSize={TEXTO.dato}
          fontFamily="var(--font-mono)"
          fill="var(--color-tinta-media)"
        >
          {dato}
        </text>
      ))}
    </g>
  );
}

function Cajetin({
  diagrama,
  proyecto,
}: {
  diagrama: Diagrama;
  proyecto?: { nombre: string; disciplina: string; fecha: string };
}) {
  const y = ALTO - MARGEN - ALTO_CAJETIN + 12;
  const x0 = 28;
  const x1 = ANCHO - 28;

  return (
    <g>
      <rect
        x={x0}
        y={y}
        width={x1 - x0}
        height={ALTO_CAJETIN - 12 - 10}
        fill="var(--color-superficie-alta)"
        stroke="var(--color-tinta)"
        strokeWidth="1.4"
      />
      <path
        d={`M${x0 + 640} ${y}V${y + ALTO_CAJETIN - 22}M${x0 + 880} ${y}V${y + ALTO_CAJETIN - 22}`}
        stroke="var(--color-tinta)"
        strokeWidth="1"
      />

      <text x={x0 + 16} y={y + 22} fontSize="10" fontFamily="var(--font-mono)" fill="var(--color-tinta-debil)" letterSpacing="1.4">
        PLANO
      </text>
      <text x={x0 + 16} y={y + 44} fontSize="16" fontWeight="700" fill="var(--color-tinta)">
        {diagrama.titulo}
      </text>
      <text x={x0 + 16} y={y + 62} fontSize="11" fill="var(--color-tinta-media)">
        {recorta(diagrama.descripcion, 96)}
      </text>

      <text x={x0 + 656} y={y + 22} fontSize="10" fontFamily="var(--font-mono)" fill="var(--color-tinta-debil)" letterSpacing="1.4">
        PROYECTO
      </text>
      <text x={x0 + 656} y={y + 42} fontSize="12" fontWeight="600" fill="var(--color-tinta)">
        {recorta(textoOVacio(proyecto?.nombre) || "—", 30)}
      </text>
      <text x={x0 + 656} y={y + 60} fontSize="11" fill="var(--color-tinta-media)">
        {proyecto?.disciplina ?? ""}
      </text>

      <text x={x0 + 896} y={y + 22} fontSize="10" fontFamily="var(--font-mono)" fill="var(--color-tinta-debil)" letterSpacing="1.4">
        ESCALA
      </text>
      <text x={x0 + 896} y={y + 42} fontSize="12" fontFamily="var(--font-mono)" fill="var(--color-tinta)">
        {textoOVacio(diagrama.escala) || "S/E"}
      </text>
      <text x={x0 + 896} y={y + 60} fontSize="10" fontFamily="var(--font-mono)" fill="var(--color-tinta-media)">
        {proyecto?.fecha ?? ""}
      </text>
      <text x={x1 - 16} y={y + 60} textAnchor="end" fontSize="10" fill="var(--color-tinta-debil)">
        ANDRES Engineering AI · anteproyecto
      </text>
    </g>
  );
}

/** Ruteo en L con salida por el eje dominante, o recta en diagramas de bloques. */
function ruta(
  a: { x: number; y: number },
  b: { x: number; y: number },
  radioA: number,
  radioB: number,
  ortogonal: boolean,
): { d: string; puntos: { x: number; y: number }[] } {
  if (!ortogonal) {
    const angulo = Math.atan2(b.y - a.y, b.x - a.x);
    const ini = {
      x: a.x + Math.cos(angulo) * radioA,
      y: a.y + Math.sin(angulo) * radioA,
    };
    const fin = {
      x: b.x - Math.cos(angulo) * (radioB + 6),
      y: b.y - Math.sin(angulo) * (radioB + 6),
    };
    return { d: `M${ini.x} ${ini.y}L${fin.x} ${fin.y}`, puntos: [ini, fin] };
  }

  const horizontalPrimero = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
  const signoX = Math.sign(b.x - a.x) || 1;
  const signoY = Math.sign(b.y - a.y) || 1;

  if (horizontalPrimero) {
    const ini = { x: a.x + signoX * radioA, y: a.y };
    const fin = { x: b.x, y: b.y - signoY * (radioB + 6) };
    const codo = { x: fin.x, y: ini.y };
    return {
      d: `M${ini.x} ${ini.y}H${codo.x}V${fin.y}`,
      puntos: [ini, codo, { x: codo.x, y: fin.y }],
    };
  }

  const ini = { x: a.x, y: a.y + signoY * radioA };
  const fin = { x: b.x - signoX * (radioB + 6), y: b.y };
  const codo = { x: ini.x, y: fin.y };
  return {
    d: `M${ini.x} ${ini.y}V${codo.y}H${fin.x}`,
    puntos: [ini, codo, { x: fin.x, y: codo.y }],
  };
}

/** Identificador estable de una conexión dentro del plano. */
function claveConexion(
  conexion: { desde: string; hasta: string },
  indice: number,
): string {
  return `${conexion.desde}>${conexion.hasta}#${indice}`;
}

interface Disposicion {
  nodos: Map<string, { x: number; y: number; alto: number }>;
  conexiones: Map<string, { x: number; y: number; ancho: number }>;
}

/**
 * Busca sitio a cada rótulo del plano.
 *
 * Primero los bloques de los elementos, que apenas pueden moverse porque
 * pertenecen a un símbolo concreto; después los de las conexiones, que sí
 * pueden deslizarse a lo largo de su trazo y separarse de él. Los símbolos y el
 * cajetín entran como obstáculos: ningún texto debe caer encima de ellos.
 */
function calcularDisposicion(
  diagrama: Diagrama,
  posiciones: Map<string, { x: number; y: number }>,
  ortogonal: boolean,
): Disposicion {
  const limites = { x0: AREA.x0 - 28, y0: AREA.y0 - 28, x1: AREA.x1 + 28, y1: AREA.y1 };

  const elementos = diagrama.nodos.filter((n) => n.simbolo !== "espacio");

  // Obstáculos fijos: los símbolos y el rótulo de las áreas dibujadas al fondo.
  const obstaculos: Caja[] = [];
  for (const nodo of elementos) {
    const p = posiciones.get(nodo.id);
    if (!p) continue;
    const r = radioSimbolo(nodo.simbolo);
    obstaculos.push({ x: p.x, y: p.y, ancho: r * 2 + 6, alto: r * 2 + 6 });
  }

  // Los trazos también estorban: una etiqueta cruzada por su propia línea se
  // lee mal aunque no pise a ninguna otra etiqueta. Se muestrean como cajas
  // finas a lo largo del recorrido.
  for (const conexion of diagrama.conexiones) {
    const a = posiciones.get(conexion.desde);
    const b = posiciones.get(conexion.hasta);
    const nodoA = diagrama.nodos.find((n) => n.id === conexion.desde);
    const nodoB = diagrama.nodos.find((n) => n.id === conexion.hasta);
    if (!a || !b || !nodoA || !nodoB) continue;

    const { puntos } = ruta(
      a,
      b,
      radioSimbolo(nodoA.simbolo),
      radioSimbolo(nodoB.simbolo),
      ortogonal,
    );
    for (let k = 0; k <= MUESTRAS_TRAZO; k++) {
      const punto = puntoEn(puntos, k / MUESTRAS_TRAZO);
      obstaculos.push({ x: punto.x, y: punto.y, ancho: 9, alto: 9 });
    }
  }

  const bloquesNodo: BloqueColocable[] = [];
  const alturas = new Map<string, number>();

  for (const nodo of elementos) {
    const p = posiciones.get(nodo.id);
    if (!p) continue;
    const datos = nodo.datos.slice(0, 2);
    const ancho =
      Math.max(
        anchoTexto(nodo.etiqueta, TEXTO.etiqueta),
        ...datos.map((d) => anchoTexto(d, TEXTO.dato, true)),
        24,
      ) + 8;
    const alto = TEXTO.etiqueta + 4 + datos.length * TEXTO.interlineado;
    alturas.set(nodo.id, alto);

    const r = radioSimbolo(nodo.simbolo);
    const debajo = p.y + r + 8 + alto / 2;
    const encima = p.y - r - 8 - alto / 2;

    bloquesNodo.push({
      id: nodo.id,
      ancho,
      alto,
      candidatos: [
        // Debajo del símbolo es la convención; lo demás son salidas de socorro.
        { x: p.x, y: debajo },
        { x: p.x, y: encima },
        { x: p.x, y: debajo + alto + 6 },
        { x: p.x + ancho / 2 + r + 10, y: p.y },
        { x: p.x - ancho / 2 - r - 10, y: p.y },
        { x: p.x, y: encima - alto - 6 },
        { x: p.x + ancho / 2 + r + 10, y: debajo },
        { x: p.x - ancho / 2 - r - 10, y: debajo },
      ],
    });
  }

  const colocadosNodo = colocar(bloquesNodo, obstaculos, limites);

  const nodos = new Map<string, { x: number; y: number; alto: number }>();
  const ocupadas: Caja[] = [...obstaculos];
  for (const bloque of bloquesNodo) {
    const punto = colocadosNodo.get(bloque.id)!;
    nodos.set(bloque.id, { ...punto, alto: bloque.alto });
    ocupadas.push({ ...punto, ancho: bloque.ancho, alto: bloque.alto });
  }

  // Etiquetas de conexión: se deslizan por el trazo y se apartan de él.
  const bloquesConexion: BloqueColocable[] = [];
  const anchos = new Map<string, number>();

  diagrama.conexiones.forEach((conexion, i) => {
    if (!conexion.etiqueta) return;
    const a = posiciones.get(conexion.desde);
    const b = posiciones.get(conexion.hasta);
    if (!a || !b) return;

    const nodoA = diagrama.nodos.find((n) => n.id === conexion.desde);
    const nodoB = diagrama.nodos.find((n) => n.id === conexion.hasta);
    if (!nodoA || !nodoB) return;

    const { puntos } = ruta(
      a,
      b,
      radioSimbolo(nodoA.simbolo),
      radioSimbolo(nodoB.simbolo),
      ortogonal,
    );

    const ancho = anchoTexto(conexion.etiqueta, TEXTO.conexion, true) + 10;
    const clave = claveConexion(conexion, i);
    anchos.set(clave, ancho);

    // Se prueba a lo largo del trazo y a ambos lados: un desplazamiento
    // vertical aparta de un tramo horizontal, pero sobre uno vertical hay que
    // moverse en x para salirse de la línea.
    const candidatos: { x: number; y: number }[] = [];
    for (const t of [0.5, 0.36, 0.64, 0.24, 0.76]) {
      const base = puntoEn(puntos, t);
      for (const [dx, dy] of [
        [0, -13],
        [0, 13],
        [ancho / 2 + 10, 0],
        [-(ancho / 2 + 10), 0],
        [0, -26],
        [0, 26],
        [ancho / 2 + 22, 0],
        [-(ancho / 2 + 22), 0],
        [0, 0],
      ]) {
        candidatos.push({ x: base.x + dx, y: base.y + dy });
      }
    }

    bloquesConexion.push({ id: clave, ancho, alto: 16, candidatos });
  });

  const colocadosConexion = colocar(bloquesConexion, ocupadas, limites);

  const conexiones = new Map<string, { x: number; y: number; ancho: number }>();
  for (const bloque of bloquesConexion) {
    const punto = colocadosConexion.get(bloque.id)!;
    conexiones.set(bloque.id, { ...punto, ancho: anchos.get(bloque.id)! });
  }

  return { nodos, conexiones };
}

/**
 * Devuelve el texto solo si dice algo.
 *
 * Los modelos llegan a escribir la cadena "null" o "N/A" en un campo opcional,
 * y el cajetín lo imprimía tal cual: se leía «ESCALA null» en un plano.
 */
function textoOVacio(valor: string | null | undefined): string {
  const limpio = (valor ?? "").trim();
  return /^(null|undefined|n\/?a|none|-)$/i.test(limpio) ? "" : limpio;
}

function recorta(texto: string, maximo: number): string {
  return texto.length > maximo ? `${texto.slice(0, maximo - 1)}…` : texto;
}
