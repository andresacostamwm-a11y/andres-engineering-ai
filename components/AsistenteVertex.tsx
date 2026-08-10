"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Asistente Vertex AI: el chat del proyecto con cara.
 *
 * No duplica el motor. Usa la misma ruta `/api/chat` que ya combina las dos
 * fuentes: responde con el proyecto cuando el texto lo cubre —citando los
 * fragmentos en los que se apoya— y sale a internet declarando la fuente cuando
 * no. Lo que añade es un único interlocutor, disponible desde cualquier pantalla,
 * en vez de dos paneles sueltos dentro de la sala de control.
 */

interface Mensaje {
  rol: "usuario" | "asistente";
  contenido: string;
  fuentes?: { numero: number; pagina: number | null }[];
}

const SUGERENCIAS_PUBLICAS = [
  "¿Qué hace exactamente esta aplicación?",
  "¿Cómo se organizan los diez agentes?",
  "¿Qué disciplinas y qué planos cubre?",
  "¿Qué puedo descargar al terminar?",
];

const SUGERENCIAS = [
  "¿Qué partidas concentran el mayor coste y por qué?",
  "¿Qué hallazgos normativos son críticos y cómo se resuelven?",
  "¿Qué supuestos asumió el presupuesto?",
  "¿Qué dice la NOM aplicable sobre este sistema?",
];

export function AsistenteVertex({
  contexto,
  nombreProyecto,
  publico = false,
}: {
  /** Alcance, memoria y resultados del proyecto, en texto plano. */
  contexto: string;
  nombreProyecto?: string;
  /** En la portada se usa la ruta pública, que no acepta documento del cliente. */
  publico?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [pregunta, setPregunta] = useState("");
  const [cargando, setCargando] = useState(false);
  const finRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes]);


  function actualizarUltimo(texto: string, fuentes: Mensaje["fuentes"]) {
    setMensajes((prev) => {
      const copia = [...prev];
      copia[copia.length - 1] = { rol: "asistente", contenido: texto, fuentes };
      return copia;
    });
  }

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
      const respuesta = await fetch(publico ? "/api/consulta-publica" : "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          publico ? { pregunta: limpio } : { pregunta: limpio, documento: contexto },
        ),
      });

      if (!respuesta.ok || !respuesta.body) {
        const error = await respuesta.json().catch(() => ({}));
        actualizarUltimo(error.error ?? "No se pudo obtener respuesta.", []);
        return;
      }

      // Las dos rutas hablan distinto: la pública devuelve texto plano y
      // /api/chat devuelve eventos SSE. Se lee cada una en su formato; pintar el
      // SSE en crudo era lo que sacaba los «data: {...}» por pantalla.
      const lector = respuesta.body.getReader();
      const decodificador = new TextDecoder();
      let texto = "";
      let resto = "";
      let fuentes: Mensaje["fuentes"] = [];

      for (;;) {
        const { done, value } = await lector.read();
        if (done) break;
        const trozo = decodificador.decode(value, { stream: true });

        if (publico) {
          texto += trozo;
          actualizarUltimo(texto, fuentes);
          continue;
        }

        resto += trozo;
        const partes = resto.split("\n\n");
        resto = partes.pop() ?? "";
        for (const parte of partes) {
          if (!parte.startsWith("data: ")) continue;
          try {
            const evento = JSON.parse(parte.slice(6));
            if (evento.tipo === "fuentes") fuentes = evento.fuentes;
            if (evento.tipo === "texto") {
              texto += evento.texto;
              actualizarUltimo(texto, fuentes);
            }
            if (evento.tipo === "error") actualizarUltimo(evento.mensaje, fuentes);
          } catch {
            // Fragmento incompleto: llegará entero en la siguiente lectura.
          }
        }
      }
    } catch {
      actualizarUltimo("Se interrumpió la conexión con el asistente.", []);
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      {/* Botón flotante con el busto del robot. */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={abierto ? "Cerrar el asistente" : "Abrir el asistente Vertex AI"}
        /* margin:0 blinda la posición: los contenedores con space-y-* inyectan
           margin-top y desplazarían el robot respecto a otras páginas. */
        style={{ margin: 0 }}
        className="group fixed bottom-[2.5rem] right-[2.5rem] z-40 flex flex-col items-center gap-[0.5mm] transition-transform duration-300 hover:-translate-y-1"
      >
        {/* El robot vive en su propio contenedor relativo: así queda centrado
           sobre la píldora y el indicador de estado no se despega de él. */}
        <span className="relative block">
          <Image
            src="/vertex-robot.png"
            alt=""
            width={520}
            height={871}
            priority={false}
            className="h-[4.3rem] w-auto object-contain drop-shadow-[0_10px_28px_rgba(0,0,0,0.28)] sm:h-[5.4rem] xl:h-[6.7rem]"
          />
          <span className="absolute right-3 top-4 size-2.5 rounded-full bg-acento shadow-[0_0_0_4px_var(--color-acento-tenue)]" />
        </span>

        {/* Invitación fija: sin ella el robot parece decorativo y nadie lo pulsa.
           Solo desde xl, que es donde las páginas reservan el carril derecho
           (xl:pr-[15.5rem]); por debajo invadiría el contenido. Al abrir se oculta
           sin desmontarse: así conserva el ancho y el robot no salta de sitio. */}
        <span
          aria-hidden={abierto}
          className={`hidden w-max whitespace-nowrap rounded-full border border-acento/35 bg-superficie px-3.5 py-1.5 text-center text-xs font-medium text-tinta shadow-[var(--shadow-elevada)] xl:block ${abierto ? "invisible" : ""}`}
        >
          {publico ? "Pregúntame sobre la app" : "Pregúntame sobre el proyecto"}
        </span>
      </button>


      {abierto && (
        <section
          role="dialog"
          aria-label="Asistente Vertex AI"
          className="fixed bottom-[2.8rem] right-[12rem] z-40 sm:right-[14.5rem] flex max-h-[min(38rem,75dvh)] w-[min(26rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-xl border border-borde bg-superficie shadow-[var(--shadow-elevada)]"
        >
          <header className="flex items-center gap-3 border-b border-borde px-4 py-3">
            <Image
              src="/vertex-robot-busto.png"
              alt=""
              width={96}
              height={96}
              className="size-10 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-tinta">Asistente Vertex AI</p>
              <p className="truncate text-xs text-tinta-media">
                {nombreProyecto
                  ? `Responde sobre «${nombreProyecto}», sobre la app e internet`
                  : contexto.trim()
                    ? "Responde sobre el proyecto, la app e internet"
                    : "Responde sobre la app; carga un proyecto para consultarlo"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar"
              className="ml-auto text-tinta-debil transition-colors hover:text-tinta"
            >
              ✕
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {mensajes.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs leading-relaxed text-tinta-media">
                  {publico || !contexto.trim()
                    ? "Pregúntame lo que quieras sobre la herramienta: qué hace, cómo se organiza y qué entrega. Cuando cargues un proyecto, respondo también sobre él."
                    : "Pregunta lo que necesites del proyecto. Si el documento lo cubre, responde citando sus fragmentos; si no, sale a internet y declara la fuente."}
                </p>
                <ul className="space-y-1.5">
                  {(publico || !contexto.trim()
                    ? SUGERENCIAS_PUBLICAS
                    : SUGERENCIAS
                  ).map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => preguntar(s)}
                        className="w-full rounded-md border border-borde px-3 py-2 text-left text-xs text-tinta-media transition-colors hover:border-acento/50 hover:text-tinta"
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {mensajes.map((m, i) => (
              <div
                key={i}
                className={m.rol === "usuario" ? "flex justify-end" : "flex gap-2"}
              >
                {m.rol === "asistente" && (
                  <Image
                    src="/vertex-robot-busto.png"
                    alt=""
                    width={64}
                    height={64}
                    className="mt-0.5 size-7 shrink-0 object-contain"
                  />
                )}
                <p
                  className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    m.rol === "usuario"
                      ? "max-w-[85%] bg-acento-tenue text-tinta"
                      : "flex-1 bg-superficie-alta text-tinta"
                  }`}
                >
                  {m.contenido || (cargando ? "Pensando…" : "")}
                </p>
              </div>
            ))}
            <div ref={finRef} />
          </div>

          {/* Sugerencias siempre a mano: al desaparecer tras la primera
              pregunta, no había forma de elegir otra sin escribirla entera. */}
          {mensajes.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto border-t border-borde px-3 py-2">
              {(publico || !contexto.trim() ? SUGERENCIAS_PUBLICAS : SUGERENCIAS).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={cargando}
                  onClick={() => preguntar(s)}
                  title={s}
                  className="shrink-0 rounded-full border border-borde px-3 py-1 text-xs text-tinta-media transition-colors hover:border-acento/50 hover:text-tinta disabled:opacity-40"
                >
                  {s.replace(/^¿|\?$/g, "").slice(0, 34)}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              preguntar(pregunta);
            }}
            className="flex gap-2 border-t border-borde px-3 py-3"
          >
            <input
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              placeholder="Pregunta sobre la app o el proyecto…"
              className="min-w-0 flex-1 rounded-md border border-borde bg-superficie px-3 py-2 text-sm placeholder:text-tinta-debil focus:border-acento focus:outline-none"
            />
            <button
              type="submit"
              disabled={cargando || !pregunta.trim()}
              className="rounded-md bg-acento px-3.5 py-2 text-sm font-medium text-sobre-acento transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Enviar
            </button>
          </form>
        </section>
      )}
    </>
  );
}
