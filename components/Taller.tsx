"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AgenteId,
  Analisis,
  EventoAgente,
  Hallazgo,
  Partida,
  Requerimiento,
  ResumenEjecutivo,
} from "@/lib/types";
import { DOCUMENTO_DEMO } from "@/lib/demo";
import { eliminarAnalisis, guardarAnalisis, leerHistorial } from "@/lib/almacen";
import { exportarDictamen } from "@/lib/exportar-pdf";
import { fechaCorta } from "@/lib/formato";
import { PanelAgentes, type EstadoAgente } from "./PanelAgentes";
import {
  ListaHallazgos,
  PanelResumen,
  TablaPresupuesto,
  TablaRequerimientos,
} from "./Resultados";
import { ChatDocumento } from "./ChatDocumento";
import { ConsultaWeb } from "./ConsultaWeb";
import { SalaControl } from "./SalaControl";
import { ZonaCarga } from "./ZonaCarga";

const ESTADOS_INICIALES: Record<AgenteId, EstadoAgente> = {
  extractor: "pendiente",
  costos: "pendiente",
  normativo: "pendiente",
  sintesis: "pendiente",
};

type Fase = "vacio" | "extrayendo" | "analizando" | "listo";
type Vista = "informe" | "sala";

export function Taller({ apiDisponible }: { apiDisponible: boolean }) {
  const [fase, setFase] = useState<Fase>("vacio");
  const [vista, setVista] = useState<Vista>("informe");
  const [error, setError] = useState<string | null>(null);
  const [documento, setDocumento] = useState<{
    texto: string;
    nombre: string;
    paginas: number;
    caracteres: number;
  } | null>(null);

  const [estados, setEstados] = useState(ESTADOS_INICIALES);
  const [mensajes, setMensajes] = useState<Partial<Record<AgenteId, string>>>({});
  const [requerimientos, setRequerimientos] = useState<Requerimiento[]>([]);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([]);
  const [resumen, setResumen] = useState<ResumenEjecutivo | null>(null);
  const [modoDemo, setModoDemo] = useState(false);
  const [historial, setHistorial] = useState<Analisis[]>([]);

  useEffect(() => {
    const guardados = leerHistorial();
    setHistorial(guardados);

    // Si el historial global pidió abrir un análisis, se restaura completo.
    const id = sessionStorage.getItem("aec-copilot:abrir-analisis");
    if (id) {
      sessionStorage.removeItem("aec-copilot:abrir-analisis");
      const analisis = guardados.find((a) => a.id === id);
      if (analisis) abrirDelHistorial(analisis);
    }
    // abrirDelHistorial es estable dentro del componente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reiniciar = useCallback(() => {
    setEstados(ESTADOS_INICIALES);
    setMensajes({});
    setRequerimientos([]);
    setPartidas([]);
    setHallazgos([]);
    setResumen(null);
    setError(null);
  }, []);

  /** Sube el PDF, extrae su texto y lanza el pipeline. */
  const procesarArchivos = useCallback(
    async (archivos: File[]) => {
      reiniciar();
      setFase("extrayendo");

      try {
        const cuerpo = new FormData();
        for (const archivo of archivos) cuerpo.append("archivos", archivo);
        const respuesta = await fetch("/api/extraer", { method: "POST", body: cuerpo });
        const datos = await respuesta.json();

        if (!respuesta.ok) {
          setError(datos.error ?? "No se pudieron procesar los archivos.");
          setFase("vacio");
          return;
        }

        if (Array.isArray(datos.fallidos) && datos.fallidos.length > 0) {
          setError(
            `No se pudieron leer ${datos.fallidos.length} archivo(s): ${datos.fallidos
              .map((f: { nombre: string; motivo: string }) => `${f.nombre} — ${f.motivo}`)
              .join("; ")}`,
          );
        }

        setDocumento({
          texto: datos.texto,
          nombre: datos.nombreArchivo,
          paginas: datos.paginas,
          caracteres: datos.caracteres,
        });
        await ejecutarPipeline(datos.texto, datos.nombreArchivo, datos.paginas, datos.caracteres);
      } catch {
        setError("No se pudo conectar con el servidor.");
        setFase("vacio");
      }
    },
    // ejecutarPipeline se define abajo y no cambia entre renders relevantes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reiniciar],
  );

  const usarEjemplo = useCallback(async () => {
    reiniciar();
    setDocumento({
      texto: DOCUMENTO_DEMO,
      nombre: "alcance-nave-industrial.pdf",
      paginas: 1,
      caracteres: DOCUMENTO_DEMO.length,
    });
    await ejecutarPipeline(
      DOCUMENTO_DEMO,
      "alcance-nave-industrial.pdf",
      1,
      DOCUMENTO_DEMO.length,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reiniciar]);

  /** Consume el flujo SSE del pipeline y va poblando la interfaz. */
  async function ejecutarPipeline(
    texto: string,
    nombre: string,
    paginas: number,
    caracteres: number,
  ) {
    setFase("analizando");

    const acumulado = {
      requerimientos: [] as Requerimiento[],
      partidas: [] as Partida[],
      hallazgos: [] as Hallazgo[],
      resumen: null as ResumenEjecutivo | null,
      demo: false,
    };

    try {
      const respuesta = await fetch("/api/agentes/analizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });

      if (!respuesta.ok || !respuesta.body) {
        const datos = await respuesta.json().catch(() => ({}));
        setError(datos.error ?? "El análisis no pudo iniciarse.");
        setFase("vacio");
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
          const evento = JSON.parse(parte.slice(6)) as EventoAgente;
          aplicarEvento(evento, acumulado);
        }
      }

      const analisis: Analisis = {
        id: `${Date.now()}`,
        nombreArchivo: nombre,
        creadoEn: new Date().toISOString(),
        paginas,
        caracteres,
        texto,
        resumen: acumulado.resumen,
        requerimientos: acumulado.requerimientos,
        partidas: acumulado.partidas,
        hallazgos: acumulado.hallazgos,
        modoDemo: acumulado.demo,
      };
      setHistorial(guardarAnalisis(analisis));
      setFase("listo");
    } catch {
      setError("Se interrumpió la conexión durante el análisis.");
      setFase("vacio");
    }
  }

  function aplicarEvento(
    evento: EventoAgente,
    acumulado: {
      requerimientos: Requerimiento[];
      partidas: Partida[];
      hallazgos: Hallazgo[];
      resumen: ResumenEjecutivo | null;
      demo: boolean;
    },
  ) {
    switch (evento.tipo) {
      case "inicio":
      case "progreso":
        setEstados((prev) => ({ ...prev, [evento.agente]: "corriendo" }));
        setMensajes((prev) => ({ ...prev, [evento.agente]: evento.mensaje }));
        break;

      case "resultado":
        setEstados((prev) => ({ ...prev, [evento.agente]: "listo" }));
        if (evento.agente === "extractor") {
          acumulado.requerimientos = evento.datos;
          setRequerimientos(evento.datos);
        } else if (evento.agente === "costos") {
          acumulado.partidas = evento.datos;
          setPartidas(evento.datos);
        } else if (evento.agente === "normativo") {
          acumulado.hallazgos = evento.datos;
          setHallazgos(evento.datos);
        } else {
          acumulado.resumen = evento.datos;
          setResumen(evento.datos);
        }
        break;

      case "error":
        setEstados((prev) => ({ ...prev, [evento.agente]: "error" }));
        setMensajes((prev) => ({ ...prev, [evento.agente]: evento.mensaje }));
        break;

      case "fin":
        acumulado.demo = evento.modoDemo;
        setModoDemo(evento.modoDemo);
        break;
    }
  }

  function abrirDelHistorial(analisis: Analisis) {
    reiniciar();
    setDocumento({
      texto: analisis.texto,
      nombre: analisis.nombreArchivo,
      paginas: analisis.paginas,
      caracteres: analisis.caracteres,
    });
    setRequerimientos(analisis.requerimientos);
    setPartidas(analisis.partidas);
    setHallazgos(analisis.hallazgos);
    setResumen(analisis.resumen);
    setModoDemo(analisis.modoDemo);
    setEstados({
      extractor: "listo",
      costos: analisis.partidas.length > 0 ? "listo" : "error",
      normativo: analisis.hallazgos.length > 0 ? "listo" : "error",
      sintesis: analisis.resumen ? "listo" : "error",
    });
    setFase("listo");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const analisisActual: Analisis | null =
    documento && fase === "listo"
      ? {
          id: "actual",
          nombreArchivo: documento.nombre,
          creadoEn: new Date().toISOString(),
          paginas: documento.paginas,
          caracteres: documento.caracteres,
          texto: documento.texto,
          resumen,
          requerimientos,
          partidas,
          hallazgos,
          modoDemo,
        }
      : null;

  const ocupado = fase === "extrayendo" || fase === "analizando";

  return (
    <div className="space-y-6">
      {!apiDisponible && (
        <Aviso tono="informativo">
          Este despliegue no tiene API key de Anthropic configurada, así que la
          aplicación funciona en <strong>modo demostración</strong>: el pipeline
          recorre las mismas etapas con un caso real de ejemplo. Configura
          <code className="mx-1 rounded bg-superficie-alta px-1.5 py-0.5 text-xs">
            ANTHROPIC_API_KEY
          </code>
          para analizar tus propios documentos.
        </Aviso>
      )}

      {error && <Aviso tono="error">{error}</Aviso>}

      {fase === "vacio" && (
        <ZonaCarga
          onArchivos={procesarArchivos}
          onEjemplo={usarEjemplo}
          ocupado={ocupado}
        />
      )}

      {documento && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-borde bg-superficie px-5 py-3.5 shadow-[var(--shadow-sutil)]">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{documento.nombre}</p>
            <p className="cifra mt-0.5 text-[0.6875rem] text-tinta-debil">
              {documento.paginas} pág · {documento.caracteres.toLocaleString("es-MX")} caracteres
              {modoDemo && " · datos de demostración"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {analisisActual && (
              <button
                type="button"
                onClick={() => exportarDictamen(analisisActual)}
                className="rounded-md bg-acento px-3.5 py-2 text-sm font-medium text-sobre-acento shadow-[var(--shadow-acento)] transition-opacity hover:opacity-90"
              >
                Descargar dictamen PDF
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                reiniciar();
                setDocumento(null);
                setFase("vacio");
              }}
              disabled={ocupado}
              className="rounded-md border border-borde px-3.5 py-2 text-sm text-tinta-media transition-colors hover:border-acento/60 hover:text-tinta disabled:opacity-40"
            >
              Analizar otro
            </button>
          </div>
        </section>
      )}

      {fase !== "vacio" && (
        <section>
          <h2 className="etiqueta-seccion mb-3">Pipeline de agentes</h2>
          <PanelAgentes
            estados={estados}
            mensajes={mensajes}
            conteos={{
              extractor: requerimientos.length,
              costos: partidas.length,
              normativo: hallazgos.length,
            }}
          />
        </section>
      )}

      {fase === "extrayendo" && (
        <p className="pulso-agente text-center text-sm text-tinta-debil">
          Leyendo los documentos…
        </p>
      )}

      {fase === "listo" && analisisActual && (
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

      {vista === "sala" && fase === "listo" && analisisActual && documento ? (
        <SalaControl
          paneles={[
            {
              id: "chat",
              etiqueta: "Chat",
              contenido: (
                <ChatDocumento
                  documento={documento.texto}
                  disponible={apiDisponible}
                />
              ),
            },
            {
              id: "info",
              etiqueta: "Información del proyecto",
              contenido: (
                <div className="space-y-4">
                  {resumen && <PanelResumen analisis={analisisActual} />}
                  {partidas.length > 0 && <TablaPresupuesto datos={partidas} />}
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
                <section className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-borde bg-superficie/60 px-6 py-10 text-center">
                  <p className="text-sm font-medium">
                    Los planos se dibujan al proyectar desde cero
                  </p>
                  <p className="max-w-sm text-xs leading-relaxed text-tinta-media">
                    El análisis de documentos audita lo que ya existe. Para
                    generar el paquete completo de láminas —unifilar, hidráulico,
                    HVAC, sanitario…— crea el proyecto con este alcance.
                  </p>
                  <a
                    href="/app/proyecto"
                    className="rounded-md bg-acento px-4 py-2 text-sm font-medium text-sobre-acento shadow-[var(--shadow-acento)] transition-opacity hover:opacity-90"
                  >
                    Crear proyecto con planos
                  </a>
                </section>
              ),
            },
          ]}
        />
      ) : (
        <>
          {resumen && analisisActual && <PanelResumen analisis={analisisActual} />}
          {partidas.length > 0 && <TablaPresupuesto datos={partidas} />}
          {hallazgos.length > 0 && <ListaHallazgos datos={hallazgos} />}
          {requerimientos.length > 0 && <TablaRequerimientos datos={requerimientos} />}

          {documento && fase !== "vacio" && (
            <ChatDocumento documento={documento.texto} disponible={apiDisponible} />
          )}
        </>
      )}

      {historial.length > 0 && (
        <Historial
          datos={historial}
          onAbrir={abrirDelHistorial}
          onEliminar={(id) => setHistorial(eliminarAnalisis(id))}
        />
      )}
    </div>
  );
}

function Historial({
  datos,
  onAbrir,
  onEliminar,
}: {
  datos: Analisis[];
  onAbrir: (a: Analisis) => void;
  onEliminar: (id: string) => void;
}) {
  return (
    <details
      open
      className="group overflow-hidden rounded-xl border border-borde bg-superficie shadow-[var(--shadow-tarjeta)]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-3.5">
        <span>
          <span className="text-sm font-semibold tracking-tight">Historial</span>
          <span className="ml-2 cifra text-[0.6875rem] text-tinta-debil">
            {datos.length}
          </span>
        </span>
        <svg
          viewBox="0 0 16 16"
          className="size-4 shrink-0 text-tinta-debil transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </summary>

      <ul className="max-h-64 divide-y divide-borde-suave overflow-y-auto border-t border-borde-suave">
        {datos.map((a) => (
          <li key={a.id} className="flex items-center gap-2 px-5 py-2.5">
            <button
              type="button"
              onClick={() => onAbrir(a)}
              className="min-w-0 flex-1 text-left transition-colors hover:text-acento"
            >
              <span className="block truncate text-xs font-medium">
                {a.nombreArchivo}
              </span>
              <span className="cifra mt-0.5 block text-[0.625rem] text-tinta-debil">
                {fechaCorta(a.creadoEn)} · {a.partidas.length} partidas
              </span>
            </button>
            <button
              type="button"
              onClick={() => onEliminar(a.id)}
              aria-label={`Eliminar análisis de ${a.nombreArchivo}`}
              className="shrink-0 rounded p-1.5 text-tinta-debil transition-colors hover:bg-critico-tenue hover:text-critico"
            >
              <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden="true">
                <path
                  d="M3 4.5h10M6.5 7v4M9.5 7v4M4.5 4.5 5 13h6l.5-8.5M6 4.5V3h4v1.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Aviso({
  tono,
  children,
}: {
  tono: "informativo" | "error";
  children: React.ReactNode;
}) {
  const estilo =
    tono === "error"
      ? "border-critico/25 bg-critico-tenue text-tinta"
      : "border-acento/35 bg-acento-tenue/70 text-tinta-media";
  return (
    <p role={tono === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${estilo}`}>
      {children}
    </p>
  );
}
