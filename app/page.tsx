import Image from "next/image";
import Link from "next/link";
import { Marca } from "@/components/Marca";
import { SelectorTema } from "@/components/SelectorTema";
import { AGENTES } from "@/lib/pipeline-def";
import { USUARIO_DEMO, PASSWORD_DEMO } from "@/lib/auth";

const PROBLEMA = [
  {
    dato: "3-5 días",
    texto:
      "es lo que tarda un equipo en revisar un pliego, cuantificar y presupuestar antes de decidir si conviene competir por la obra.",
  },
  {
    dato: "El 100%",
    texto:
      "de esa revisión se repite en cada licitación, aunque el 70% de los hallazgos sean siempre los mismos.",
  },
  {
    dato: "Lo caro",
    texto:
      "nunca es lo que el pliego dice, sino lo que calla: la partida obligatoria que nadie presupuestó.",
  },
];

export default function Inicio() {
  return (
    <>
      <header className="border-b border-borde">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Marca />
          <div className="flex items-center gap-3">
          <SelectorTema />
          <Link
            href="/app"
            className="rounded-md bg-acento px-4 py-2 text-sm font-medium text-sobre-acento shadow-[var(--shadow-acento)] transition-opacity hover:opacity-90"
          >
            Entrar a la aplicación
          </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* --- Portada --- */}
        <section className="relative overflow-hidden border-b border-borde">
          <div
            className="rejilla-tecnica pointer-events-none absolute inset-0"
            aria-hidden="true"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
            <div>
              <span className="etiqueta-seccion">
                Trabajo de Fin de Máster · Desarrollo con IA
              </span>

              <h1 className="mt-4 max-w-3xl text-titular font-semibold leading-[0.98] tracking-[-0.02em]">
                El pliego dice una cosa.
                <br />
                <span className="text-acento">Lo que cuesta es otra.</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-tinta-media">
                ANDRES Engineering AI proyecta y audita obra en trece
                disciplinas: extrae los requerimientos con su cita, presupuesta
                con matrices de precio unitario, revisa la normativa y dibuja los
                planos y diagramas del sistema.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/app/proyecto"
                  className="rounded-md bg-acento px-6 py-3 font-medium text-sobre-acento shadow-[var(--shadow-acento)] transition-opacity hover:opacity-90"
                >
                  Crear un proyecto
                </Link>
                <Link
                  href="/app"
                  className="rounded-md border border-borde bg-superficie px-6 py-3 text-sm text-tinta-media transition-colors hover:border-acento/60 hover:text-tinta"
                >
                  Analizar un documento
                </Link>
              </div>

              <p className="cifra mt-6 text-xs text-tinta-debil">
                Acceso de prueba: {USUARIO_DEMO} / {PASSWORD_DEMO}
              </p>
            </div>

            <figure className="relative">
              <div className="overflow-hidden rounded-2xl border border-borde shadow-[var(--shadow-elevada)]">
                <Image
                  src="/marca-oficial.jpg"
                  alt="ANDRES Engineering AI — emblema de engranaje y documento técnico con trazado de circuitos sobre un fondo de planos y estructura."
                  width={1100}
                  height={1100}
                  priority
                  className="w-full"
                  sizes="(max-width: 1024px) 92vw, 46vw"
                />
              </div>
              <figcaption className="etiqueta-seccion mt-3 text-center">
                Trece disciplinas, un solo sistema
              </figcaption>
            </figure>
          </div>
        </section>

        {/* --- Problema --- */}
        <section className="border-b border-borde">
          <div className="mx-auto grid max-w-6xl gap-px bg-borde-suave sm:grid-cols-3">
            {PROBLEMA.map((item) => (
              <article key={item.dato} className="bg-superficie px-5 py-9 sm:px-8">
                <p className="cifra text-3xl font-semibold text-acento">
                  {item.dato}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-tinta-media">
                  {item.texto}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* --- Pipeline --- */}
        <section id="como-funciona" className="border-b border-borde">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <span className="etiqueta-seccion">Arquitectura</span>
            <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Cuatro agentes, no un chat
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-tinta-media">
              Cada agente tiene un rol acotado, un esquema de salida obligatorio y
              acceso solo a lo que necesita. Costos y normativo corren en paralelo
              porque ninguno depende del otro.
            </p>

            <ol className="escalonado mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {AGENTES.map((agente, i) => (
                <li
                  key={agente.id}
                  className="elevable relative rounded-xl border border-borde bg-superficie p-5 shadow-[var(--shadow-tarjeta)]"
                >
                  <span className="etiqueta-seccion">{agente.etapa}</span>
                  <p className="mt-2.5 flex items-baseline gap-2 text-lg font-semibold">
                    <span className="cifra text-sm text-acento">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {agente.nombre}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-tinta-media">
                    {agente.rol}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* --- Decisiones técnicas --- */}
        <section className="border-b border-borde">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <span className="etiqueta-seccion">Decisiones de ingeniería</span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Lo que se hizo y por qué
            </h2>

            <dl className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              <Decision titulo="Salida estructurada obligatoria">
                Los agentes no devuelven texto: se les fuerza a invocar una
                herramienta con esquema JSON y su respuesta se valida con Zod. Si
                no encaja, se reintenta pasándole el error de validación.
              </Decision>
              <Decision titulo="La aritmética se calcula en código">
                El modelo estima precios; multiplicar cantidades lo hace el
                servidor. El total del presupuesto y el riesgo global nunca los
                decide el modelo.
              </Decision>
              <Decision titulo="Cada requerimiento lleva su cita">
                El extractor está obligado a citar textualmente el documento. Sin
                evidencia no hay requerimiento, y el usuario puede auditar cada
                renglón contra el original.
              </Decision>
              <Decision titulo="Recuperación léxica, no vectorial">
                Para un solo documento por sesión, BM25 gana a los embeddings: sin
                coste de indexado, sin servicio externo y con la ventaja de poder
                explicar por qué se recuperó cada fragmento.
              </Decision>
              <Decision titulo="El servidor no guarda nada">
                Un pliego contiene información comercial sensible. El documento se
                procesa en memoria y el historial vive en el navegador del
                usuario.
              </Decision>
              <Decision titulo="Los supuestos se declaran">
                Cuando el agente de costos tiene que suponer una cantidad, lo
                escribe en la partida. Un presupuesto con supuestos visibles es
                útil; uno con cifras inventadas y silenciadas es peligroso.
              </Decision>
            </dl>
          </div>
        </section>
      </main>

      <footer className="px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-xs text-tinta-debil">
          <p>
            Trabajo de Fin de Máster · Máster en Desarrollo con IA · BIG School
            <br />
            Heber Andres Acosta Jimenez
          </p>
          <p>
            Análisis asistido por IA. No sustituye la validación de un
            responsable técnico.
          </p>
        </div>
      </footer>
    </>
  );
}

function Decision({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-l-2 border-acento/40 pl-5">
      <dt className="font-semibold">{titulo}</dt>
      <dd className="mt-1.5 text-sm leading-relaxed text-tinta-media">
        {children}
      </dd>
    </div>
  );
}
