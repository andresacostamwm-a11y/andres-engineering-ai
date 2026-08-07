"use client";

import { useEffect, useRef, useState } from "react";
import type { MensajeChat } from "@/lib/types";

const SUGERENCIAS = [
  "¿Qué plazo de ejecución se establece?",
  "¿Qué se especifica sobre la instalación eléctrica?",
  "¿Qué entregables se exigen al cierre?",
];

export function ChatDocumento({
  documento,
  disponible,
}: {
  documento: string;
  disponible: boolean;
}) {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [pregunta, setPregunta] = useState("");
  const [cargando, setCargando] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes]);

  async function preguntar(texto: string) {
    const limpio = texto.trim();
    if (!limpio || cargando) return;

    setPregunta("");
    setMensajes((prev) => [
      ...prev,
      { rol: "usuario", contenido: limpio },
      { rol: "asistente", contenido: "" },
    ]);
    setCargando(true);

    try {
      const respuesta = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: limpio, documento }),
      });

      if (!respuesta.ok || !respuesta.body) {
        const error = await respuesta.json().catch(() => ({}));
        actualizarUltimo(
          error.error ?? "No se pudo obtener respuesta del servidor.",
          [],
        );
        return;
      }

      const lector = respuesta.body.getReader();
      const decodificador = new TextDecoder();
      let acumulado = "";
      let texto = "";
      let fuentes: MensajeChat["fuentes"] = [];

      while (true) {
        const { done, value } = await lector.read();
        if (done) break;
        acumulado += decodificador.decode(value, { stream: true });

        const partes = acumulado.split("\n\n");
        acumulado = partes.pop() ?? "";

        for (const parte of partes) {
          if (!parte.startsWith("data: ")) continue;
          const evento = JSON.parse(parte.slice(6));
          if (evento.tipo === "fuentes") fuentes = evento.fuentes;
          if (evento.tipo === "texto") {
            texto += evento.texto;
            actualizarUltimo(texto, fuentes);
          }
          if (evento.tipo === "error") actualizarUltimo(evento.mensaje, fuentes);
        }
      }
    } catch {
      actualizarUltimo("Se interrumpió la conexión con el servidor.", []);
    } finally {
      setCargando(false);
    }
  }

  function actualizarUltimo(contenido: string, fuentes: MensajeChat["fuentes"]) {
    setMensajes((prev) => {
      const copia = [...prev];
      copia[copia.length - 1] = { rol: "asistente", contenido, fuentes };
      return copia;
    });
  }

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-borde bg-superficie">
      <header className="border-b border-borde-suave px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight">
          Consultar el documento
        </h2>
        <p className="mt-0.5 text-xs text-tinta-debil">
          Recuperación BM25 sobre el texto original. Responde solo con lo que el
          documento dice.
        </p>
      </header>

      <div className="max-h-[26rem] min-h-[10rem] flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {mensajes.length === 0 && (
          <div>
            <p className="text-sm text-tinta-debil">
              {disponible
                ? "Pregunta cualquier cosa sobre el documento cargado."
                : "El chat requiere una API key configurada en el despliegue. El análisis en modo demostración sigue disponible."}
            </p>
            {disponible && (
              <ul className="mt-3 space-y-1.5">
                {SUGERENCIAS.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => preguntar(s)}
                      className="w-full rounded-md border border-borde-suave px-3 py-2 text-left text-xs text-tinta-media transition-colors hover:border-acento/50 hover:text-tinta"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {mensajes.map((mensaje, i) => (
          <div
            key={i}
            className={mensaje.rol === "usuario" ? "flex justify-end" : ""}
          >
            {mensaje.rol === "usuario" ? (
              <p className="max-w-[85%] rounded-lg rounded-br-sm bg-acento-tenue px-3.5 py-2 text-sm">
                {mensaje.contenido}
              </p>
            ) : (
              <div className="max-w-[92%]">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-tinta-media">
                  {mensaje.contenido || (
                    <span className="pulso-agente text-tinta-debil">
                      Consultando el documento…
                    </span>
                  )}
                </p>
                {mensaje.fuentes && mensaje.fuentes.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[0.6875rem] text-tinta-debil hover:text-acento">
                      {mensaje.fuentes.length}{" "}
                      {mensaje.fuentes.length === 1
                        ? "fragmento recuperado"
                        : "fragmentos recuperados"}
                    </summary>
                    <ul className="mt-2 space-y-1.5">
                      {mensaje.fuentes.map((f, j) => (
                        <li
                          key={j}
                          className="rounded border-l-2 border-borde bg-superficie-alta/50 px-3 py-2 text-[0.6875rem] leading-relaxed text-tinta-debil"
                        >
                          {f.pagina && (
                            <span className="cifra mr-1.5 text-acento">
                              p.{f.pagina}
                            </span>
                          )}
                          {f.fragmento}…
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={finRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          preguntar(pregunta);
        }}
        className="flex gap-2 border-t border-borde-suave p-3"
      >
        <label htmlFor="pregunta" className="sr-only">
          Pregunta sobre el documento
        </label>
        <input
          id="pregunta"
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          disabled={!disponible || cargando}
          placeholder={disponible ? "Escribe tu pregunta…" : "No disponible en modo demostración"}
          className="flex-1 rounded-md border border-borde bg-fondo px-3 py-2 text-sm placeholder:text-tinta-debil focus:border-acento focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!disponible || cargando || !pregunta.trim()}
          className="rounded-md bg-acento px-4 py-2 text-sm font-medium text-fondo transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Enviar
        </button>
      </form>
    </section>
  );
}
