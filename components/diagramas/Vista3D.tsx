"use client";

import { useEffect, useRef, useState } from "react";
import type { Diagrama, NodoDiagrama, TipoConexion } from "@/lib/diagramas/tipos";

/**
 * Vista 3D navegable de un diagrama: el mismo modelo topológico que dibuja el
 * plano 2D, extruido como maqueta holográfica. three.js se carga con import
 * dinámico solo cuando el usuario abre la vista, para no cargar 150 kB a quien
 * nunca la usa. La órbita automática está siempre activa; el botón la pausa.
 */

type TipoSimbolo3D = "torre" | "tanque" | "equipo" | "instrumento" | "area";

const FAMILIA: Record<string, TipoSimbolo3D> = {
  acometida: "torre",
  transformador: "equipo",
  interruptor: "instrumento",
  tablero: "torre",
  "motor-electrico": "equipo",
  generador: "equipo",
  luminario: "instrumento",
  contacto: "instrumento",
  tierra: "instrumento",
  medidor: "instrumento",
  ups: "equipo",
  "banco-capacitores": "equipo",
  bomba: "equipo",
  valvula: "instrumento",
  "valvula-check": "instrumento",
  "valvula-control": "instrumento",
  tanque: "tanque",
  cisterna: "tanque",
  filtro: "equipo",
  intercambiador: "equipo",
  "medidor-flujo": "instrumento",
  hidrante: "instrumento",
  rociador: "instrumento",
  compresor: "equipo",
  cilindro: "equipo",
  "valvula-5-2": "instrumento",
  "unidad-mantenimiento": "equipo",
  secador: "equipo",
  acumulador: "tanque",
  motor: "equipo",
  reductor: "equipo",
  banda: "equipo",
  acoplamiento: "instrumento",
  rodamiento: "instrumento",
  engrane: "equipo",
  resistencia: "instrumento",
  capacitor: "instrumento",
  inductor: "instrumento",
  diodo: "instrumento",
  transistor: "instrumento",
  "circuito-integrado": "equipo",
  microcontrolador: "equipo",
  sensor: "instrumento",
  fuente: "equipo",
  uma: "equipo",
  condensadora: "equipo",
  evaporadora: "equipo",
  ventilador: "equipo",
  difusor: "instrumento",
  damper: "instrumento",
  serpentin: "equipo",
  plc: "torre",
  instrumento: "instrumento",
  actuador: "instrumento",
  bloque: "equipo",
  nodo: "instrumento",
  espacio: "area",
};

const COLOR_CONEXION: Record<TipoConexion, number> = {
  electrica: 0x53d8e8,
  tuberia: 0x4b9fdd,
  aire: 0x9adfae,
  ducto: 0x9aa8bd,
  senal: 0xd8b25e,
  mecanica: 0xd88a5e,
};

export function Vista3D({ diagrama }: { diagrama: Diagrama }) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [pausado, setPausado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const controlesRef = useRef<{ autoRotate: boolean } | null>(null);

  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;

    let desmontado = false;
    let limpiar: (() => void) | null = null;

    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import(
        "three/examples/jsm/controls/OrbitControls.js"
      );
      if (desmontado || !contenedor) return;
      setCargando(false);

      const ancho = contenedor.clientWidth;
      const alto = Math.max(contenedor.clientHeight, 420);

      const escena = new THREE.Scene();
      escena.fog = new THREE.FogExp2(0x0a1622, 0.012);

      const camara = new THREE.PerspectiveCamera(48, ancho / alto, 0.1, 500);
      camara.position.set(26, 22, 30);

      const renderizador = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      renderizador.setSize(ancho, alto);
      renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderizador.setClearColor(0x0a1622, 1);
      contenedor.appendChild(renderizador.domElement);

      const controles = new OrbitControls(camara, renderizador.domElement);
      controles.enableDamping = true;
      controles.dampingFactor = 0.06;
      controles.autoRotate = true;
      controles.autoRotateSpeed = 0.9;
      controles.maxPolarAngle = Math.PI / 2.05;
      controles.minDistance = 12;
      controles.maxDistance = 90;
      controlesRef.current = controles;

      // Luz: ambiente fría + un punto cian que hace de "proyector holográfico".
      escena.add(new THREE.AmbientLight(0x9fd8e8, 0.55));
      const foco = new THREE.PointLight(0x53d8e8, 900, 120);
      foco.position.set(0, 28, 0);
      escena.add(foco);
      const relleno = new THREE.DirectionalLight(0xffffff, 0.7);
      relleno.position.set(18, 24, 12);
      escena.add(relleno);

      // Suelo: rejilla de proyección.
      const rejilla = new THREE.GridHelper(60, 30, 0x2b6b7d, 0x14323f);
      escena.add(rejilla);

      const aPlano = (n: { x: number; y: number }) => ({
        x: (n.x - 50) * 0.5,
        z: (n.y - 50) * 0.5,
      });

      const grupo = new THREE.Group();
      escena.add(grupo);

      const materialLinea = new Map<TipoConexion, InstanceType<typeof THREE.MeshStandardMaterial>>();
      const posiciones = new Map<string, { x: number; z: number; altura: number }>();

      for (const nodo of diagrama.nodos) {
        const { x, z } = aPlano(nodo);
        const familia = FAMILIA[nodo.simbolo] ?? "equipo";
        const malla = crearMalla(THREE, familia, nodo);
        malla.position.set(x, 0, z);
        grupo.add(malla);
        posiciones.set(nodo.id, { x, z, altura: alturaDe(familia) });

        if (familia !== "area") {
          const etiqueta = crearEtiqueta(THREE, nodo.etiqueta);
          etiqueta.position.set(x, alturaDe(familia) + 2.1, z);
          grupo.add(etiqueta);
        }
      }

      for (const conexion of diagrama.conexiones) {
        const a = posiciones.get(conexion.desde);
        const b = posiciones.get(conexion.hasta);
        if (!a || !b) continue;

        const yTubo = 0.35;
        const puntos = [
          new THREE.Vector3(a.x, yTubo, a.z),
          new THREE.Vector3(b.x, yTubo, a.z),
          new THREE.Vector3(b.x, yTubo, b.z),
        ];
        const curva = new THREE.CatmullRomCurve3(puntos, false, "catmullrom", 0.02);
        const geometria = new THREE.TubeGeometry(curva, 24, conexion.tipo === "ducto" ? 0.22 : 0.12, 8, false);

        let material = materialLinea.get(conexion.tipo);
        if (!material) {
          material = new THREE.MeshStandardMaterial({
            color: COLOR_CONEXION[conexion.tipo],
            emissive: COLOR_CONEXION[conexion.tipo],
            emissiveIntensity: 0.55,
            roughness: 0.4,
            metalness: 0.1,
          });
          materialLinea.set(conexion.tipo, material);
        }
        grupo.add(new THREE.Mesh(geometria, material));
      }

      let idAnimacion = 0;
      const animar = () => {
        idAnimacion = requestAnimationFrame(animar);
        controles.update();
        renderizador.render(escena, camara);
      };
      animar();

      const alCambiarTamano = () => {
        const w = contenedor.clientWidth;
        const h = Math.max(contenedor.clientHeight, 420);
        camara.aspect = w / h;
        camara.updateProjectionMatrix();
        renderizador.setSize(w, h);
      };
      window.addEventListener("resize", alCambiarTamano);

      limpiar = () => {
        cancelAnimationFrame(idAnimacion);
        window.removeEventListener("resize", alCambiarTamano);
        controles.dispose();
        renderizador.dispose();
        escena.traverse((objeto) => {
          const malla = objeto as { geometry?: { dispose(): void }; material?: unknown };
          malla.geometry?.dispose?.();
          const material = malla.material;
          if (Array.isArray(material)) material.forEach((m) => (m as { dispose(): void }).dispose());
          else (material as { dispose?: () => void } | undefined)?.dispose?.();
        });
        if (renderizador.domElement.parentElement === contenedor) {
          contenedor.removeChild(renderizador.domElement);
        }
      };
    })();

    return () => {
      desmontado = true;
      limpiar?.();
    };
    // El diagrama es inmutable dentro de una lámina montada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagrama]);

  function alternarRotacion() {
    setPausado((p) => {
      if (controlesRef.current) controlesRef.current.autoRotate = p;
      return !p;
    });
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-borde bg-[#0a1622]">
      <div ref={contenedorRef} className="h-[26rem] w-full" role="img" aria-label={`Maqueta 3D: ${diagrama.titulo}`} />

      {cargando && (
        <p className="pulso-agente absolute inset-0 flex items-center justify-center text-sm text-tinta-debil">
          Construyendo la maqueta 3D…
        </p>
      )}

      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <button
          type="button"
          onClick={alternarRotacion}
          className="rounded-md border border-acento/40 bg-superficie/80 px-3 py-1.5 text-xs font-medium text-acento backdrop-blur transition-colors hover:bg-acento-tenue"
        >
          {pausado ? "Reanudar órbita" : "Pausar órbita"}
        </button>
        <span className="hidden rounded-md bg-superficie/60 px-2.5 py-1.5 text-[0.6875rem] text-tinta-debil backdrop-blur sm:inline">
          Arrastra para orbitar · rueda para acercar
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Geometría -- */

function alturaDe(familia: TipoSimbolo3D): number {
  switch (familia) {
    case "torre":
      return 3.2;
    case "tanque":
      return 2.6;
    case "equipo":
      return 1.8;
    case "instrumento":
      return 1.1;
    case "area":
      return 0.15;
  }
}

type ThreeNS = typeof import("three");

function crearMalla(
  THREE: ThreeNS,
  familia: TipoSimbolo3D,
  nodo: NodoDiagrama,
) {
  const altura = alturaDe(familia);
  const materialCuerpo = new THREE.MeshStandardMaterial({
    color: 0x1d4756,
    emissive: 0x53d8e8,
    emissiveIntensity: familia === "area" ? 0.08 : 0.28,
    roughness: 0.35,
    metalness: 0.45,
    transparent: familia === "area",
    opacity: familia === "area" ? 0.35 : 1,
  });

  let geometria;
  switch (familia) {
    case "torre":
      geometria = new THREE.BoxGeometry(1.7, altura, 1.1);
      break;
    case "tanque":
      geometria = new THREE.CylinderGeometry(1.2, 1.2, altura, 24);
      break;
    case "equipo":
      geometria = new THREE.BoxGeometry(1.6, altura, 1.6);
      break;
    case "instrumento":
      geometria = new THREE.SphereGeometry(0.62, 20, 16);
      break;
    case "area": {
      const ancho = ((nodo.ancho ?? 18) / 100) * 50;
      const fondo = ((nodo.alto ?? 14) / 100) * 50;
      geometria = new THREE.BoxGeometry(ancho, altura, fondo);
      break;
    }
  }

  const malla = new THREE.Mesh(geometria, materialCuerpo);
  malla.position.y = familia === "instrumento" ? 0.75 : altura / 2;

  // Arista luminosa: el contorno es lo que lo hace leerse como holograma.
  const aristas = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometria),
    new THREE.LineBasicMaterial({ color: 0x53d8e8, transparent: true, opacity: 0.8 }),
  );
  malla.add(aristas);

  const grupo = new THREE.Group();
  grupo.add(malla);
  return grupo;
}

function crearEtiqueta(THREE: ThreeNS, texto: string) {
  const lienzo = document.createElement("canvas");
  const escala = 4;
  const fuente = `${13 * escala}px ui-monospace, monospace`;
  const ctx = lienzo.getContext("2d")!;
  ctx.font = fuente;
  const anchoTexto = ctx.measureText(texto).width;
  lienzo.width = anchoTexto + 20 * escala;
  lienzo.height = 26 * escala;

  ctx.font = fuente;
  ctx.fillStyle = "rgba(10, 26, 34, 0.72)";
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.strokeStyle = "rgba(83, 216, 232, 0.5)";
  ctx.lineWidth = escala;
  ctx.strokeRect(0, 0, lienzo.width, lienzo.height);
  ctx.fillStyle = "#bdeef5";
  ctx.textBaseline = "middle";
  ctx.fillText(texto, 10 * escala, lienzo.height / 2);

  const textura = new THREE.CanvasTexture(lienzo);
  textura.anisotropy = 4;
  const material = new THREE.SpriteMaterial({ map: textura, transparent: true });
  const sprite = new THREE.Sprite(material);
  const proporcion = lienzo.width / lienzo.height;
  sprite.scale.set(2.2 * proporcion, 2.2, 1);
  return sprite;
}
