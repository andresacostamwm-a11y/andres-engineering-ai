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
import { ZonaCarga } from "./ZonaCarga";

const ESTADOS_INICIALES: Record<AgenteId, EstadoAgente> = {
  extractor: "pendiente",
  costos: "pendiente",
  normativo: "pendiente",
  sintesis: "pendiente",
};

type Fase = "vacio" | "extrayendo" | "analizando" | "listo";

export function Taller({ apiDisponible }: { apiDisponible: boolean }) {
  const [fase, setFase] = useState<Fase>("vacio");
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

  useEffect(() => setHistorial(leerHistorial()), []);

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
  const procesarArchivo = useCallback(
    async (archivo: File) => {
      reiniciar();
      setFase("extrayendo");

      try {
        const cuerpo = new FormData();
        cuerpo.append("archivo", archivo);
        const respuesta = await fetch("/api/extraer", { method: "POST", body: cuerpo });
        const datos = await respuesta.json();

        if (!respuesta.ok) {
          setError(datos.error ?? "No se pudo procesar el PDF.");
          setFase("vacio");
          return;
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
          onArchivo={procesarArchivo}
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
                className="rounded-md bg-acento px-3.5 py-2 text-sm font-medium text-white shadow-[var(--shadow-acento)] transition-opacity hover:opacity-90"
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
          Extrayendo el texto del PDF…
        </p>
      )}

      {resumen && analisisActual && <PanelResumen analisis={analisisActual} />}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,2.15fr)_minmax(21rem,1fr)] 2xl:items-start">
        <div className="space-y-6">
          {partidas.length > 0 && <TablaPresupuesto datos={partidas} />}
          {hallazgos.length > 0 && <ListaHallazgos datos={hallazgos} />}
          {requerimientos.length > 0 && (
            <TablaRequerimientos datos={requerimientos} />
          )}
        </div>

        <div className="space-y-6 2xl:sticky 2xl:top-20">
          {documento && (
            <ChatDocumento
              documento={documento.texto}
              disponible={apiDisponible}
            />
          )}
          {historial.length > 0 && (
            <Historial
              datos={historial}
              onAbrir={abrirDelHistorial}
              onEliminar={(id) => setHistorial(eliminarAnalisis(id))}
            />
          )}
        </div>
      </div>
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
    <section className="overflow-hidden rounded-xl border border-borde bg-superficie shadow-[var(--shadow-tarjeta)]">
      <header className="border-b border-borde-suave px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight">Historial</h2>
        <p className="mt-0.5 text-xs text-tinta-debil">
          Guardado solo en este navegador.
        </p>
      </header>
      <ul className="divide-y divide-borde-suave">
        {datos.map((a) => (
          <li key={a.id} className="flex items-center gap-2 px-5 py-3">
            <button
              type="button"
              onClick={() => onAbrir(a)}
              className="min-w-0 flex-1 text-left"
            >
              <span className="block truncate text-sm">{a.nombreArchivo}</span>
              <span className="cifra mt-0.5 block text-[0.6875rem] text-tinta-debil">
                {fechaCorta(a.creadoEn)} · {a.partidas.length} partidas
              </span>
            </button>
            <button
              type="button"
              onClick={() => onEliminar(a.id)}
              aria-label={`Eliminar análisis de ${a.nombreArchivo}`}
              className="shrink-0 rounded p-1.5 text-tinta-debil transition-colors hover:text-critico"
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
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
    </section>
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
