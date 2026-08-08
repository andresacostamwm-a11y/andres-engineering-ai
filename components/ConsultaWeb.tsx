"use client";

import { useState } from "react";

/**
 * Panel de acceso a internet: consulta directa con búsqueda web, independiente
 * del documento. Para normas vigentes, precios de mercado, proveedores, clima
 * del sitio… El modelo responde citando la fuente.
 */

const EJEMPLOS = [
  "Precio actual del acero de refuerzo en México",
  "¿Qué versión de la NOM-001-SEDE está vigente?",
  "Proveedores de tableros eléctricos en Quintana Roo",
  "Tarifa GDMTH de CFE vigente",
];

export function ConsultaWeb() {
  const [pregunta, setPregunta] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [cargando, setCargando] = useState(false);

  async function consultar(texto: string) {
    const limpio = texto.trim();
    if (!limpio || cargando) return;
    setPregunta("");
    setRespuesta("");
    setCargando(true);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: limpio, modo: "web" }),
      });

      if (!r.ok || !r.body) {
        const error = await r.json().catch(() => ({}));
        setRespuesta(error.error ?? "No se pudo consultar internet.");
        return;
      }

      const lector = r.body.getReader();
      const decodificador = new TextDecoder();
      let acumulado = "";
      let texto2 = "";

      while (true) {
        const { done, value } = await lector.read();
        if (done) break;
        acumulado += decodificador.decode(value, { stream: true });
        const partes = acumulado.split("\n\n");
        acumulado = partes.pop() ?? "";
        for (const parte of partes) {
          if (!parte.startsWith("data: ")) continue;
          const evento = JSON.parse(parte.slice(6));
          if (evento.tipo === "texto") {
            texto2 += evento.texto;
            setRespuesta(texto2);
          }
          if (evento.tipo === "error") setRespuesta(evento.mensaje);
        }
      }
    } catch {
      setRespuesta("Se interrumpió la conexión con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-xl border border-borde bg-superficie shadow-[var(--shadow-tarjeta)]">
      <header className="border-b border-borde-suave px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight">Acceso a internet</h2>
        <p className="mt-0.5 text-xs text-tinta-debil">
          Búsqueda web en vivo: normas vigentes, precios, proveedores. Cita la fuente.
        </p>
      </header>

      <div className="min-h-[10rem] flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {!respuesta && !cargando && (
          <ul className="flex flex-wrap gap-2">
            {EJEMPLOS.map((e) => (
              <li key={e}>
                <button
                  type="button"
                  onClick={() => consultar(e)}
                  className="rounded-full border border-borde-suave px-3.5 py-2 text-left text-xs text-tinta-media transition-colors hover:border-acento/50 hover:text-tinta"
                >
                  {e}
                </button>
              </li>
            ))}
          </ul>
        )}
        {cargando && !respuesta && (
          <p className="pulso-agente text-sm text-tinta-debil">Buscando en internet…</p>
        )}
        {respuesta && (
          <p className="max-w-[85ch] whitespace-pre-wrap text-sm leading-relaxed text-tinta-media">
            {respuesta}
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          consultar(pregunta);
        }}
        className="flex gap-2 border-t border-borde-suave p-3"
      >
        <label htmlFor="consulta-web" className="sr-only">
          Consulta a internet
        </label>
        <input
          id="consulta-web"
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          disabled={cargando}
          placeholder="Busca en internet: normas, precios, proveedores…"
          className="flex-1 rounded-md border border-borde bg-superficie px-4 py-2.5 text-sm placeholder:text-tinta-debil focus:border-acento focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={cargando || !pregunta.trim()}
          className="rounded-md bg-acento px-4 py-2 text-sm font-medium text-sobre-acento shadow-[var(--shadow-acento)] transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Buscar
        </button>
      </form>
    </section>
  );
}
