"use client";

import type { Economia } from "@/lib/moneda/tipos";
import { MONEDA_POR_DEFECTO } from "@/lib/moneda/tipos";
import { PanelTipoCambio } from "./PanelTipoCambio";
import { Cotizaciones } from "./Cotizaciones";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Diagrama } from "@/lib/diagramas/tipos";
import type {
  AgenteProyecto,
  EventoProyecto,
  Proyecto,
} from "@/lib/tipos-proyecto";
import type {
  DisciplinaProyecto,
  Envergadura,
} from "@/lib/disciplinas";
import { DISCIPLINAS, ENVERGADURAS, ETIQUETA_DIAGRAMA } from "@/lib/disciplinas";
import { EXTENSIONES_ACEPTADAS } from "@/lib/extractores";
import type { Hallazgo, Partida, Requerimiento, ResumenEjecutivo } from "@/lib/types";
import type { MemoriaProyecto } from "@/lib/tipos-proyecto";
import { Lamina } from "./diagramas/Lamina";
import { GenerarPlano } from "./diagramas/GenerarPlano";
import { AccesoPlanos } from "./diagramas/AccesoPlanos";
import { MemoriaPanel } from "./MemoriaPanel";
import { ChatDocumento } from "./ChatDocumento";
import { ConsultaWeb } from "./ConsultaWeb";
import { SalaControl } from "./SalaControl";
import { PanelAgentesProyecto, type EstadoAgente } from "./PanelAgentesProyecto";
import {
  ListaHallazgos,
  PanelResumen,
  TablaPresupuesto,
  TablaRequerimientos,
} from "./Resultados";
import { ExportarProyecto } from "./ExportarProyecto";
import { guardarProyecto, leerProyectos } from "@/lib/almacen";

const ESTADOS_INICIALES: Record<AgenteProyecto, EstadoAgente> = {
  programa: "pendiente",
  extractor: "pendiente",
  costos: "pendiente",
  normativo: "pendiente",
  proyectista: "pendiente",
  memoria: "pendiente",
  sintesis: "pendiente",
};

const EJEMPLOS: Record<string, string> = {
  electrica:
    "Nave industrial de 1,200 m² con subestación propia de 500 kVA, tres tableros derivados (producción, oficinas y servicios), planta de emergencia y sistema de tierra física. Iluminación LED industrial con 300 luxes en área de trabajo.",
  hvac: "Climatización de una planta de producción de alimentos de 2,000 m² que debe mantenerse a 18 °C con humedad relativa controlada, más oficinas anexas de 400 m² con confort estándar. Clima cálido húmedo.",
  hidraulica:
    "Red hidrosanitaria de un hotel de 120 habitaciones: alimentación desde cisterna de 200 m³, equipo hidroneumático, red de agua caliente con recirculación, drenaje sanitario y red contra incendio con hidrantes.",
  mecanica:
    "Línea de transporte y dosificación de material granular con capacidad de 20 toneladas por hora: tolva de recepción, banda transportadora de 30 m, elevador de cangilones y silo de almacenamiento.",
  arquitectura:
    "Edificio de oficinas de tres niveles con 1,800 m² totales, planta libre, núcleo de servicios centrado, estacionamiento en planta baja y azotea con área común. Terreno de 30 × 25 m.",
};

type Fase = "formulario" | "generando" | "listo";
type Vista = "informe" | "sala";

export function CrearProyecto({ apiDisponible }: { apiDisponible: boolean }) {
  const [fase, setFase] = useState<Fase>("formulario");
  const [vista, setVista] = useState<Vista>("informe");
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [disciplina, setDisciplina] = useState<DisciplinaProyecto>("electrica");
  const [envergadura, setEnvergadura] = useState<Envergadura>("mediana");
  const [ubicacion, setUbicacion] = useState("");
  const [adjuntos, setAdjuntos] = useState<File[]>([]);
  const entradaRef = useRef<HTMLInputElement>(null);

  const [estados, setEstados] = useState(ESTADOS_INICIALES);
  const [mensajes, setMensajes] = useState<Partial<Record<AgenteProyecto, string>>>({});
  const [alcance, setAlcance] = useState("");
  const [premisas, setPremisas] = useState<string[]>([]);
  const [requerimientos, setRequerimientos] = useState<Requerimiento[]>([]);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([]);
  const [diagramas, setDiagramas] = useState<Diagrama[]>([]);
  const [memoria, setMemoria] = useState<MemoriaProyecto | null>(null);
  const [resumen, setResumen] = useState<ResumenEjecutivo | null>(null);
  const [modoDemo, setModoDemo] = useState(false);
  const [economia, setEconomia] = useState<Economia | null>(null);

  const ficha = DISCIPLINAS.find((d) => d.id === disciplina)!;

  // Si el historial global pidió abrir un proyecto, se restaura completo.
  useEffect(() => {
    const id = sessionStorage.getItem("aec-copilot:abrir-proyecto");
    if (!id) return;
    sessionStorage.removeItem("aec-copilot:abrir-proyecto");
    const guardado = leerProyectos().find((p) => p.id === id);
    if (!guardado) return;

    setNombre(guardado.nombre);
    setDescripcion(guardado.descripcion);
    setDisciplina(guardado.disciplina);
    setEnvergadura(guardado.envergadura);
    setUbicacion(guardado.ubicacion);
    setAlcance(guardado.alcance);
    setPremisas(guardado.premisas);
    setRequerimientos(guardado.requerimientos);
    setPartidas(guardado.partidas);
    setHallazgos(guardado.hallazgos);
    setDiagramas(guardado.diagramas);
    setMemoria(guardado.memoria);
    setResumen(guardado.resumen);
    setModoDemo(guardado.modoDemo);
    setEstados({
      programa: "listo",
      extractor: "listo",
      costos: guardado.partidas.length > 0 ? "listo" : "error",
      normativo: guardado.hallazgos.length > 0 ? "listo" : "error",
      proyectista: guardado.diagramas.length > 0 ? "listo" : "error",
      memoria: guardado.memoria ? "listo" : "error",
      sintesis: guardado.resumen ? "listo" : "error",
    });
    setFase("listo");
  }, []);

  const generar = useCallback(async () => {
    setError(null);
    if (nombre.trim().length < 3) return setError("Ponle un nombre al proyecto.");
    if (descripcion.trim().length < 20)
      return setError("Describe el proyecto con al menos 20 caracteres.");

    setEstados(ESTADOS_INICIALES);
    setMensajes({});
    setAlcance("");
    setPremisas([]);
    setRequerimientos([]);
    setPartidas([]);
    setHallazgos([]);
    setDiagramas([]);
    setMemoria(null);
    setResumen(null);
    setFase("generando");

    let documentosAdjuntos: string | undefined;
    if (adjuntos.length > 0) {
      try {
        const cuerpo = new FormData();
        for (const a of adjuntos) cuerpo.append("archivos", a);
        const r = await fetch("/api/extraer", { method: "POST", body: cuerpo });
        const d = await r.json();
        if (r.ok) documentosAdjuntos = d.texto;
        else setError(`No se pudieron leer los adjuntos: ${d.error}`);
      } catch {
        setError("No se pudieron leer los archivos adjuntos.");
      }
    }

    const acumulado = {
      requerimientos: [] as Requerimiento[],
      partidas: [] as Partida[],
      hallazgos: [] as Hallazgo[],
      diagramas: [] as Diagrama[],
      memoria: null as MemoriaProyecto | null,
      resumen: null as ResumenEjecutivo | null,
      alcance: "",
      premisas: [] as string[],
      economia: null as Economia | null,
      demo: false,
    };

    try {
      const respuesta = await fetch("/api/proyecto/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          descripcion,
          disciplina,
          envergadura,
          ubicacion,
          documentosAdjuntos,
        }),
      });

      if (!respuesta.ok || !respuesta.body) {
        const datos = await respuesta.json().catch(() => ({}));
        setError(datos.error ?? "No se pudo iniciar el proyecto.");
        setFase("formulario");
        return;
      }

      const lector = respuesta.body.getReader();
      const decodificador = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await lector.read();
        if (done) break;
        buffer += decodificador.decode(value, { stream: true });
        const partes = buffer.split("\n\n");
        buffer = partes.pop() ?? "";

        for (const parte of partes) {
          if (!parte.startsWith("data: ")) continue;
          aplicar(JSON.parse(parte.slice(6)) as EventoProyecto, acumulado);
        }
      }

      guardarProyecto({
        id: `${Date.now()}`,
        nombre,
        descripcion,
        disciplina,
        envergadura,
        ubicacion,
        creadoEn: new Date().toISOString(),
        alcance: acumulado.alcance,
        premisas: acumulado.premisas,
        requerimientos: acumulado.requerimientos,
        partidas: acumulado.partidas,
        hallazgos: acumulado.hallazgos,
        diagramas: acumulado.diagramas,
        memoria: acumulado.memoria,
        resumen: acumulado.resumen,
        economia: acumulado.economia,
        modoDemo: acumulado.demo,
      });

      setFase("listo");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Se interrumpió la conexión durante la generación.");
      setFase("formulario");
    }
  }, [nombre, descripcion, disciplina, envergadura, ubicacion, adjuntos]);

  function aplicar(
    evento: EventoProyecto,
    acumulado: {
      requerimientos: Requerimiento[];
      partidas: Partida[];
      hallazgos: Hallazgo[];
      diagramas: Diagrama[];
      memoria: MemoriaProyecto | null;
      resumen: ResumenEjecutivo | null;
      alcance: string;
      premisas: string[];
      economia: Economia | null;
      demo: boolean;
    },
  ) {
    switch (evento.tipo) {
      case "inicio":
        setEstados((p) => ({ ...p, [evento.agente]: "corriendo" }));
        setMensajes((p) => ({ ...p, [evento.agente]: evento.mensaje }));
        break;
      case "alcance":
        setEstados((p) => ({ ...p, programa: "listo" }));
        acumulado.alcance = evento.alcance;
        acumulado.premisas = evento.premisas;
        setAlcance(evento.alcance);
        setPremisas(evento.premisas);
        break;
      case "diagrama":
        acumulado.diagramas.push(evento.diagrama);
        setDiagramas((p) => [...p, evento.diagrama]);
        break;
      case "resultado":
        setEstados((p) => ({ ...p, [evento.agente]: "listo" }));
        if (evento.agente === "extractor") {
          acumulado.requerimientos = evento.datos;
          setRequerimientos(evento.datos);
        } else if (evento.agente === "costos") {
          acumulado.partidas = evento.datos;
          setPartidas(evento.datos);
        } else if (evento.agente === "normativo") {
          acumulado.hallazgos = evento.datos;
          setHallazgos(evento.datos);
        } else if (evento.agente === "memoria") {
          acumulado.memoria = evento.datos;
          setMemoria(evento.datos);
        } else if (evento.agente === "sintesis") {
          acumulado.resumen = evento.datos;
          setResumen(evento.datos);
        }
        break;
      case "error":
        setEstados((p) => ({ ...p, [evento.agente]: "error" }));
        setMensajes((p) => ({ ...p, [evento.agente]: evento.mensaje }));
        break;
      case "fin":
        acumulado.demo = evento.modoDemo;
        acumulado.economia = evento.economia;
        setEconomia(evento.economia);
        setModoDemo(evento.modoDemo);
        break;
    }
  }

  const proyecto: Proyecto | null =
    fase === "listo"
      ? {
          id: "actual",
          nombre,
          descripcion,
          disciplina,
          envergadura,
          ubicacion,
          creadoEn: new Date().toISOString(),
          alcance,
          premisas,
          requerimientos,
          partidas,
          hallazgos,
          diagramas,
          memoria,
          resumen,
          economia,
          modoDemo,
        }
      : null;

  /* ------------------------------------------------------------ Formulario -- */

  if (fase === "formulario") {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {!apiDisponible && (
          <p className="rounded-lg border border-acento/25 bg-acento-tenue px-4 py-3 text-sm text-tinta-media">
            Este despliegue no tiene API key configurada: el proyecto se generará
            en <strong>modo demostración</strong> con un caso de ejemplo.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-lg border border-critico/25 bg-critico-tenue px-4 py-3 text-sm text-critico">
            {error}
          </p>
        )}

        <section className="tarjeta p-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight">Datos del proyecto</h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Campo etiqueta="Nombre del proyecto" htmlFor="nombre" className="sm:col-span-2">
              <input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ampliación de nave industrial — Parque Industrial Cancún"
                className={CLASE_ENTRADA}
              />
            </Campo>

            <Campo etiqueta="Ubicación" htmlFor="ubicacion">
              <input
                id="ubicacion"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                placeholder="Cancún, Quintana Roo"
                className={CLASE_ENTRADA}
              />
            </Campo>

            <Campo etiqueta="Envergadura" htmlFor="envergadura">
              <div className="mt-1.5 flex gap-1.5 rounded-lg border border-borde bg-superficie-alta p-1">
                {ENVERGADURAS.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setEnvergadura(e.id)}
                    title={e.referencia}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                      envergadura === e.id
                        ? "bg-superficie text-acento shadow-[var(--shadow-sutil)]"
                        : "text-tinta-debil hover:text-tinta"
                    }`}
                  >
                    {e.nombre}
                  </button>
                ))}
              </div>
            </Campo>

            <Campo
              etiqueta="Descripción de lo que quieres proyectar"
              htmlFor="descripcion"
              className="sm:col-span-2"
            >
              <textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={5}
                placeholder="Describe el proyecto: superficies, capacidades, equipos, condiciones del sitio…"
                className={`${CLASE_ENTRADA} resize-y leading-relaxed`}
              />
              {EJEMPLOS[disciplina] && (
                <button
                  type="button"
                  onClick={() => setDescripcion(EJEMPLOS[disciplina])}
                  className="mt-2 text-xs font-medium text-acento underline-offset-2 hover:underline"
                >
                  Usar un ejemplo de {ficha.nombre.toLowerCase()}
                </button>
              )}
            </Campo>
          </div>
        </section>

        <section className="tarjeta p-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight">Disciplina principal</h2>
          <p className="mt-1 text-sm text-tinta-media">
            Determina la normativa aplicable y qué planos se dibujan.
          </p>

          <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {DISCIPLINAS.map((d) => {
              const activa = disciplina === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDisciplina(d.id)}
                  aria-pressed={activa}
                  className={`rounded-lg border p-3.5 text-left transition-all ${
                    activa
                      ? "border-acento bg-acento-tenue shadow-[var(--shadow-sutil)]"
                      : "border-borde bg-superficie hover:border-acento/50"
                  }`}
                >
                  <span
                    className={`block text-sm font-semibold ${activa ? "text-acento" : ""}`}
                  >
                    {d.nombre}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-tinta-media">
                    {d.descripcion}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-lg border border-borde-suave bg-superficie-alta px-4 py-3.5">
            <p className="etiqueta-seccion">Paquete completo de láminas</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {ficha.diagramas.map((t) => (
                  <li
                    key={t}
                    className="rounded-full border border-acento/25 bg-superficie px-2.5 py-1 text-xs font-medium text-acento"
                  >
                    {ETIQUETA_DIAGRAMA[t]}
                  </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-tinta-media">
              Además de estas láminas podrás pedir cualquier otra del catálogo al
              terminar. Normativa de referencia: {ficha.normativa.join(" · ")}
            </p>
          </div>
        </section>

        <section className="tarjeta p-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight">
            Documentación de apoyo <span className="font-normal text-tinta-debil">(opcional)</span>
          </h2>
          <p className="mt-1 text-sm text-tinta-media">
            Planos, memorias, hojas de cálculo o modelos que el proyectista deba
            tener en cuenta. PDF, Word, Excel, CSV, HTML, DXF, IFC, JSON y texto.
          </p>

          <input
            ref={entradaRef}
            type="file"
            multiple
            accept={EXTENSIONES_ACEPTADAS}
            className="sr-only"
            onChange={(e) => {
              setAdjuntos((prev) => [...prev, ...Array.from(e.target.files ?? [])].slice(0, 10));
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => entradaRef.current?.click()}
            className="mt-4 rounded-md border border-borde px-4 py-2 text-sm font-medium text-tinta-media transition-colors hover:border-acento/60 hover:text-tinta"
          >
            Adjuntar archivos
          </button>

          {adjuntos.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {adjuntos.map((a, i) => (
                <li
                  key={`${a.name}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-borde-suave bg-superficie-alta px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">{a.name}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="cifra text-[0.6875rem] text-tinta-debil">
                      {(a.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => setAdjuntos((p) => p.filter((_, j) => j !== i))}
                      className="text-tinta-debil transition-colors hover:text-critico"
                      aria-label={`Quitar ${a.name}`}
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={generar}
            className="rounded-md bg-acento px-7 py-3 font-semibold text-sobre-acento shadow-[var(--shadow-acento)] transition-opacity hover:opacity-90"
          >
            Generar proyecto
          </button>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------- Generación y resultado -- */

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-borde bg-superficie px-5 py-3.5 shadow-[var(--shadow-sutil)]">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{nombre}</p>
          <p className="cifra mt-0.5 text-[0.6875rem] text-tinta-debil">
            {ficha.nombre} · {ENVERGADURAS.find((e) => e.id === envergadura)!.nombre}
            {ubicacion ? ` · ${ubicacion}` : ""}
            {modoDemo && " · demostración"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {proyecto && <ExportarProyecto proyecto={proyecto} />}
          <button
            type="button"
            onClick={() => setFase("formulario")}
            disabled={fase === "generando"}
            className="rounded-md border border-borde px-3.5 py-2 text-sm text-tinta-media transition-colors hover:border-acento/60 hover:text-tinta disabled:opacity-40"
          >
            Nuevo proyecto
          </button>
        </div>
      </section>

      <section>
        <h2 className="etiqueta-seccion mb-3">Pipeline de proyecto</h2>
        <PanelAgentesProyecto estados={estados} mensajes={mensajes} />
      </section>

      {error && (
        <p role="alert" className="rounded-lg border border-critico/25 bg-critico-tenue px-4 py-3 text-sm text-critico">
          {error}
        </p>
      )}

      {fase === "listo" && proyecto && (
        <div
          className="flex gap-1 self-start rounded-lg border border-borde bg-superficie-alta p-0.5"
          role="group"
          aria-label="Modo de vista"
        >
          <button
            type="button"
            onClick={() => setVista("informe")}
            aria-pressed={vista === "informe"}
            className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
              vista === "informe"
                ? "bg-superficie text-acento shadow-[var(--shadow-sutil)]"
                : "text-tinta-debil hover:text-tinta"
            }`}
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M2.5 4h11M2.5 8h11M2.5 12h11" />
            </svg>
            Informe
          </button>
          <button
            type="button"
            onClick={() => setVista("sala")}
            aria-pressed={vista === "sala"}
            title="Pantalla dividida: chat, información, internet y planos, en 3 o 4 partes"
            className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
              vista === "sala"
                ? "bg-superficie text-acento shadow-[var(--shadow-sutil)]"
                : "text-tinta-debil hover:text-tinta"
            }`}
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <rect x="2" y="2" width="5" height="5" rx="1" />
              <rect x="9" y="2" width="5" height="5" rx="1" />
              <rect x="2" y="9" width="5" height="5" rx="1" />
              <rect x="9" y="9" width="5" height="5" rx="1" />
            </svg>
            Pantalla dividida
          </button>
        </div>
      )}

      {vista === "sala" && fase === "listo" && proyecto ? (
        <SalaControl
          paneles={[
            {
              id: "chat",
              etiqueta: "Chat",
              contenido: (
                <ChatDocumento documento={alcance} disponible={apiDisponible} />
              ),
            },
            {
              id: "info",
              etiqueta: "Información del proyecto",
              contenido: (
                <div className="space-y-4">
                  {resumen && (
                    <PanelResumen
                      analisis={{
                        id: proyecto.id,
                        nombreArchivo: proyecto.nombre,
                        creadoEn: proyecto.creadoEn,
                        paginas: 0,
                        caracteres: alcance.length,
                        texto: alcance,
                        resumen,
                        requerimientos,
                        partidas,
                        hallazgos,
                        economia,
                        modoDemo,
                      }}
                    />
                  )}
                  {memoria && <MemoriaPanel proyecto={proyecto} />}
                  {partidas.length > 0 && economia && <PanelTipoCambio economia={economia} />}
      {partidas.length > 0 && proyecto && (
        <Cotizaciones proyectoId={proyecto.id} economia={economia} />
      )}
                  {partidas.length > 0 && <TablaPresupuesto
                      datos={partidas}
                      moneda={economia?.moneda ?? MONEDA_POR_DEFECTO}
                      tipoCambio={economia?.tipoCambio}
                    />}
                  {hallazgos.length > 0 && <ListaHallazgos datos={hallazgos} />}
                  {requerimientos.length > 0 && (
                    <TablaRequerimientos datos={requerimientos} />
                  )}
                </div>
              ),
            },
            {
              id: "internet",
              etiqueta: "Acceso a internet",
              contenido: <ConsultaWeb />,
            },
            {
              id: "planos",
              etiqueta: "Planos",
              contenido: (
                <section className="space-y-5 rounded-xl border border-borde bg-superficie p-4 shadow-[var(--shadow-tarjeta)] sm:p-5">
                  <AccesoPlanos
                    encargo={{ nombre, descripcion, disciplina, envergadura, contexto: alcance }}
                    diagramas={diagramas}
                    onDiagrama={(d) => setDiagramas((prev) => [...prev, d])}
                  />
                  {diagramas.map((d, i) => (
                    <div key={`sala-${d.tipo}-${i}`} id={`lamina-${i}`} className="scroll-mt-4">
                      <Lamina
                        diagrama={d}
                        proyecto={proyecto}
                        cabecera={{
                          nombre,
                          disciplina: ficha.nombre,
                          fecha: new Date().toLocaleDateString("es-MX"),
                        }}
                      />
                    </div>
                  ))}
                </section>
              ),
            },
          ]}
        />
      ) : (
        <>
      {resumen && proyecto && (
        <PanelResumen
          analisis={{
            id: proyecto.id,
            nombreArchivo: proyecto.nombre,
            creadoEn: proyecto.creadoEn,
            paginas: 0,
            caracteres: alcance.length,
            texto: alcance,
            resumen,
            requerimientos,
            partidas,
            hallazgos,
            economia,
            modoDemo,
          }}
        />
      )}

      {diagramas.length > 0 && (
        <section className="aparecer overflow-hidden rounded-xl border border-borde bg-superficie shadow-[var(--shadow-tarjeta)]">
          <header className="space-y-3.5 border-b border-borde-suave px-5 py-4 sm:px-7">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Planos y diagramas
              </h2>
              <p className="mt-0.5 text-xs text-tinta-debil">
                {diagramas.length} lámina{diagramas.length > 1 ? "s" : ""} generada
                {diagramas.length > 1 ? "s" : ""} con simbología normalizada.
              </p>
            </div>
            <AccesoPlanos
              encargo={{ nombre, descripcion, disciplina, envergadura, contexto: alcance }}
              diagramas={diagramas}
              onDiagrama={(d) => setDiagramas((prev) => [...prev, d])}
            />
          </header>

          <div className="space-y-8 p-5 sm:p-7">
            {diagramas.map((d, i) => (
              <div key={`${d.tipo}-${i}`} id={`lamina-${i}`} className="scroll-mt-24">
                <Lamina
                  diagrama={d}
                  proyecto={proyecto}
                  cabecera={{
                    nombre,
                    disciplina: ficha.nombre,
                    fecha: new Date().toLocaleDateString("es-MX"),
                  }}
                />
              </div>
            ))}

            {fase === "listo" && (
              <GenerarPlano
                encargo={{ nombre, descripcion, disciplina, envergadura, contexto: alcance }}
                yaGenerados={diagramas.map((d) => d.tipo)}
                onDiagrama={(d) => setDiagramas((prev) => [...prev, d])}
              />
            )}
          </div>
        </section>
      )}

      {fase === "listo" && diagramas.length === 0 && (
        <GenerarPlano
          encargo={{ nombre, descripcion, disciplina, envergadura, contexto: alcance }}
          yaGenerados={[]}
          onDiagrama={(d) => setDiagramas((prev) => [...prev, d])}
        />
      )}

      {memoria && proyecto && <MemoriaPanel proyecto={proyecto} />}

      {partidas.length > 0 && economia && <PanelTipoCambio economia={economia} />}
                  {partidas.length > 0 && <TablaPresupuesto
                      datos={partidas}
                      moneda={economia?.moneda ?? MONEDA_POR_DEFECTO}
                      tipoCambio={economia?.tipoCambio}
                    />}
      {hallazgos.length > 0 && <ListaHallazgos datos={hallazgos} />}
      {requerimientos.length > 0 && <TablaRequerimientos datos={requerimientos} />}

      {alcance && (
        <details className="tarjeta overflow-hidden">
          <summary className="cursor-pointer px-5 py-4 text-base font-semibold tracking-tight sm:px-7">
            Alcance de obra generado
          </summary>
          <div className="border-t border-borde-suave px-5 py-5 sm:px-7">
            {premisas.length > 0 && (
              <div className="mb-5 rounded-lg border border-laton/25 bg-laton-tenue px-4 py-3">
                <p className="etiqueta-seccion text-laton">Premisas asumidas</p>
                <ul className="mt-1.5 space-y-1 text-sm text-tinta-media">
                  {premisas.map((p, i) => (
                    <li key={i}>— {p}</li>
                  ))}
                </ul>
              </div>
            )}
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-tinta-media">
              {alcance}
            </pre>
          </div>
        </details>
      )}
        </>
      )}
    </div>
  );
}

const CLASE_ENTRADA =
  "mt-1.5 w-full rounded-md border border-borde bg-superficie px-3.5 py-2.5 text-sm shadow-[var(--shadow-sutil)] placeholder:text-tinta-debil focus:border-acento focus:outline-none";

function Campo({
  etiqueta,
  htmlFor,
  className = "",
  children,
}: {
  etiqueta: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="etiqueta-seccion">
        {etiqueta}
      </label>
      {children}
    </div>
  );
}
