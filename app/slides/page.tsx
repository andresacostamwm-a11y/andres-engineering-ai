import Image from "next/image";
import Link from "next/link";
import { Marca } from "@/components/Marca";
import { Diapositivas } from "@/components/Diapositivas";
import { DiagramaPipeline } from "@/components/DiagramaPipeline";

export const metadata = {
  title: "ANDRES Engineering AI — Presentación del TFM",
  description:
    "Presentación del Trabajo de Fin de Máster: sistema multiagente de análisis de proyectos de ingeniería.",
};

const TOTAL = 17;

export default function Presentacion() {
  return (
    <>
      <main
        id="mazo"
        className="h-dvh snap-y snap-mandatory overflow-y-auto scroll-smooth print:h-auto print:overflow-visible"
      >
        {/* 01 — Portada */}
        <Diapositiva indice={0} className="relative">
          <div className="rejilla-tecnica pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative">
            <Marca />
            <p className="etiqueta-seccion mt-12">
              Trabajo de Fin de Máster · Máster en Desarrollo con IA · BIG School
            </p>
            <h1 className="mt-4 max-w-4xl text-titular font-semibold leading-[0.95] tracking-[-0.02em]">
              El pliego dice una cosa.
              <br />
              <span className="text-acento">Lo que cuesta es otra.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-tinta-media">
              Un sistema de cuatro agentes que convierte un alcance de obra en un
              dictamen técnico: requerimientos con evidencia, presupuesto con
              precios unitarios y hallazgos normativos.
            </p>
            <p className="mt-10 text-sm text-tinta-media">
              <strong className="font-semibold text-tinta">Heber Andres Acosta Jimenez</strong>
              <br />
              andresacosta.mwm@gmail.com
            </p>
          </div>
        </Diapositiva>

        {/* 02 — El problema */}
        <Diapositiva indice={1}>
          <Rotulo>01 · El problema</Rotulo>
          <Titulo>Tres días para saber si una obra conviene</Titulo>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-tinta-media">
            Antes de decidir si compite por un contrato, un equipo de ingeniería
            lee el pliego, extrae qué se exige, cuantifica, presupuesta y comprueba
            qué normativa aplica. Es trabajo caro y repetitivo.
          </p>
          <div className="mt-12 grid gap-px bg-borde-suave sm:grid-cols-3">
            <Cifra valor="3-5 días" texto="por pliego, antes de emitir una sola propuesta." />
            <Cifra valor="70%" texto="de los hallazgos se repiten de una licitación a otra." />
            <Cifra
              valor="Lo caro"
              texto="no es lo que el pliego dice, sino lo que calla."
            />
          </div>
        </Diapositiva>

        {/* 03 — La solución */}
        <Diapositiva indice={2}>
          <Rotulo>02 · La solución</Rotulo>
          <Titulo>Un PDF entra. Un dictamen sale.</Titulo>
          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center">
            <ol className="space-y-5">
              {[
                ["Requerimientos con evidencia", "Cada exigencia técnica con la cita textual del documento y su página."],
                ["Presupuesto con matrices", "Catálogo de conceptos con precio unitario desglosado y supuestos declarados."],
                ["Hallazgos normativos", "Contraste contra NOM y reglamentos, incluido lo que el documento omite."],
                ["Planos y entregables", "Diagramas del sistema y exportación a PDF, Word, CSV, HTML, DXF, IFC y SVG."],
              ].map(([titulo, texto], i) => (
                <li key={titulo} className="flex gap-4">
                  <span className="cifra shrink-0 text-sm text-acento">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <strong className="block font-semibold">{titulo}</strong>
                    <span className="mt-1 block text-sm leading-relaxed text-tinta-media">
                      {texto}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <Captura src="/capturas/resumen.png" alt="Resumen ejecutivo generado por la aplicación" />
          </div>
        </Diapositiva>

        {/* 04 — Arquitectura */}
        <Diapositiva indice={3}>
          <Rotulo>03 · Arquitectura</Rotulo>
          <Titulo>Cuatro agentes, no un chat</Titulo>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-tinta-media">
            Cada agente tiene un rol acotado, un esquema de salida obligatorio y
            solo el contexto que necesita. Costos y normativo no dependen entre sí,
            así que corren en paralelo.
          </p>
          <div className="mt-10 overflow-x-auto">
            <DiagramaPipeline className="min-w-[38rem] max-w-3xl text-tinta-media" />
          </div>
          <p className="mt-8 text-sm text-tinta-debil">
            Si un agente falla, <code className="text-acento">Promise.allSettled</code> deja
            que el otro continúe y el pipeline llega igualmente a la síntesis.
          </p>
        </Diapositiva>


        {/* 05 — Dos modos */}
        <Diapositiva indice={4}>
          <Rotulo>04 · Alcance</Rotulo>
          <Titulo>Auditar lo que existe, o proyectar lo que no</Titulo>
          <div className="mt-10 grid max-w-5xl gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-borde bg-superficie p-6 shadow-[var(--shadow-tarjeta)]">
              <p className="etiqueta-seccion">Modo 1</p>
              <h3 className="mt-1.5 text-xl font-semibold">Analizar documentos</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-tinta-media">
                Hasta diez archivos a la vez en PDF, Word, Excel, CSV, HTML, DXF,
                IFC, JSON o texto. De un CAD se extraen capas, bloques y
                anotaciones; de un IFC, la jerarquía espacial y los elementos.
              </p>
            </div>
            <div className="rounded-xl border border-acento/30 bg-acento-tenue p-6 shadow-[var(--shadow-tarjeta)]">
              <p className="etiqueta-seccion">Modo 2</p>
              <h3 className="mt-1.5 text-xl font-semibold">Proyectar desde cero</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-tinta-media">
                Se describe la obra, se elige disciplina y envergadura, y el
                sistema redacta el alcance, lo cuantifica, revisa normativa y
                dibuja los planos.
              </p>
            </div>
          </div>
          <p className="mt-8 max-w-3xl leading-relaxed text-tinta-media">
            Trece disciplinas: arquitectura, civil y estructural, mecánica,
            mecatrónica, eléctrica, electrónica, hidráulica, neumática, HVAC,
            aeronáutica, naval, ferroviaria e ingeniería de fluidos. Cada una
            aporta su normativa y sus diagramas propios.
          </p>
        </Diapositiva>

        {/* 06 — Diagramas */}
        <Diapositiva indice={5}>
          <Rotulo>05 · Lo diferencial</Rotulo>
          <Titulo>El modelo no dibuja: da la topología</Titulo>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-tinta-media">
            El agente proyectista devuelve qué elementos hay, dónde van sobre una
            rejilla lógica y cómo se conectan. El trazo lo pone el código, con
            simbología normalizada, ruteo ortogonal y cajetín.
          </p>
          <div className="mt-8 grid max-w-4xl gap-5 sm:grid-cols-3">
            <Razon titulo="Simbología">
              Más de 50 símbolos en SVG: IEC/NEMA en eléctrico, ISO 1219 en
              neumático, ISA 5.1 en instrumentación.
            </Razon>
            <Razon titulo="Ruteo ortogonal">
              Las conexiones se trazan en L, como en un unifilar o un P&amp;ID
              real, no en diagonal.
            </Razon>
            <Razon titulo="Anticolisión">
              Separación elíptica: más holgura vertical, porque bajo cada símbolo
              van su etiqueta y sus datos.
            </Razon>
          </div>
          <p className="mt-8 text-lg">
            Es lo que hace que la salida se parezca a{" "}
            <strong className="text-acento">un plano y no a un boceto.</strong>
          </p>
        </Diapositiva>

        {/* 07 — Exportación */}
        <Diapositiva indice={6}>
          <Rotulo>06 · Entregables</Rotulo>
          <Titulo>Siete formatos, todos generados en el navegador</Titulo>
          <div className="mt-10 grid gap-px bg-borde-suave sm:grid-cols-4">
            {[
              ["PDF", "Dictamen completo"],
              ["Word", "OOXML propio, sin librería"],
              ["CSV", "Catálogo de conceptos"],
              ["HTML", "Informe con planos"],
              ["DXF", "AutoCAD · importa Revit"],
              ["IFC", "Estándar BIM abierto"],
              ["SVG", "Planos vectoriales"],
              ["—", "El documento nunca vuelve al servidor"],
            ].map(([f, d]) => (
              <div key={f} className="bg-superficie px-5 py-6">
                <p className="cifra text-xl font-semibold text-acento">{f}</p>
                <p className="mt-2 text-xs leading-relaxed text-tinta-media">{d}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-3xl text-sm leading-relaxed text-tinta-media">
            <strong className="text-tinta">Sobre .rvt:</strong> es un formato
            binario propietario que solo Revit puede escribir; ningún sistema lo
            genera por API. Se entrega DXF —que AutoCAD abre y Revit importa— e
            IFC, el estándar abierto que Revit lee sin conversión. Es la vía real
            en la industria.
          </p>
        </Diapositiva>

        {/* 08 — Progreso en vivo */}
        <Diapositiva indice={7}>
          <Rotulo>04 · Experiencia</Rotulo>
          <Titulo>El usuario ve lo que pasa</Titulo>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-tinta-media">
            El pipeline tarda unos dos minutos. En lugar de un spinner opaco, el
            progreso viaja por <strong className="text-tinta">Server-Sent Events</strong> y
            cada tarjeta se completa en vivo con su recuento real.
          </p>
          <div className="mt-9">
            <Captura src="/capturas/pipeline.png" alt="Panel de agentes mostrando el progreso del pipeline" />
          </div>
        </Diapositiva>

        {/* 06 — Decisión 1 */}
        <Diapositiva indice={8}>
          <Rotulo>05 · Decisión técnica</Rotulo>
          <Titulo>El modelo no devuelve texto</Titulo>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-tinta-media">
            Se declara una herramienta con su JSON Schema y se fija{" "}
            <code className="text-acento">tool_choice</code>: el modelo está obligado a
            invocarla. Después, Zod valida. Si falla, se reintenta pasándole el
            error concreto para que se corrija.
          </p>
          <Codigo>{`const respuesta = await cliente.messages.create({
  model: MODELO_TRABAJO,
  tools: [{ name: herramienta, input_schema: esquemaEntrada }],
  tool_choice: { type: "tool", name: herramienta },   // ← obligatorio
  messages,
});

const resultado = validador.safeParse(bloque.input);  // ← Zod
if (resultado.success) return resultado.data;

// Reintento con el error de validación como tool_result`}</Codigo>
        </Diapositiva>

        {/* 07 — Decisión 2 */}
        <Diapositiva indice={9}>
          <Rotulo>06 · Decisión técnica</Rotulo>
          <Titulo>La aritmética no la hace el modelo</Titulo>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-tinta-media">
            Los LLM estiman precios bien y multiplican mal. El precio unitario lo
            propone el modelo; el importe, el total y el riesgo global se calculan
            en código.
          </p>
          <Codigo>{`// lib/agentes/costos.ts
return {
  ...p,
  matriz,                                        // indirectos ajustados si no cuadra
  importe: redondear(p.cantidad * p.precioUnitario),
};`}</Codigo>
          <p className="mt-8 text-lg">
            En la ejecución real documentada:{" "}
            <strong className="text-acento">26 partidas, 0 incoherencias aritméticas.</strong>
          </p>
        </Diapositiva>

        {/* 08 — Decisión 3 */}
        <Diapositiva indice={10}>
          <Rotulo>07 · Decisión técnica</Rotulo>
          <Titulo>Sin cita no hay requerimiento</Titulo>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-tinta-media">
            El extractor está obligado a citar textualmente el documento. Cada
            renglón de la interfaz despliega su evidencia y su página, de modo que
            el usuario puede auditar el resultado contra el original en segundos.
          </p>
          <blockquote className="mt-9 max-w-3xl border-l-2 border-acento/60 bg-superficie px-6 py-5">
            <p className="text-sm italic leading-relaxed text-tinta-media">
              “Cimentación a base de zapatas aisladas de concreto f&apos;c=250 kg/cm2,
              desplante a -1.50 m respecto a nivel de banqueta”
            </p>
            <cite className="cifra mt-2 block not-italic text-xs text-tinta-debil">
              REQ-02 · Documento fuente, página 1
            </cite>
          </blockquote>
          <p className="mt-8 text-sm text-tinta-debil">
            Es la diferencia entre una herramienta auditable y una que hay que creer.
          </p>
        </Diapositiva>

        {/* 09 — Decisión 4 */}
        <Diapositiva indice={11}>
          <Rotulo>08 · Decisión técnica</Rotulo>
          <Titulo>BM25, no embeddings</Titulo>
          <div className="mt-8 grid max-w-4xl gap-6 sm:grid-cols-3">
            <Razon titulo="Un documento por sesión">
              No hay corpus que amortizar indexando ni embeddings que mantener.
            </Razon>
            <Razon titulo="Vocabulario literal">
              «NOM-001-SEDE», «f&apos;c=250», «tablero»: donde el emparejamiento léxico
              rinde mejor.
            </Razon>
            <Razon titulo="Auditable">
              Se puede mostrar qué fragmentos se recuperaron y de qué página.
            </Razon>
          </div>
          <p className="mt-9 max-w-3xl text-lg leading-relaxed text-tinta-media">
            Implementado desde cero en 100 líneas, sin dependencias ni servicios
            externos. La respuesta del chat se limita a los fragmentos recuperados:
            si no está en el documento, contesta que no está.
          </p>
        </Diapositiva>

        {/* 10 — Decisión 5 */}
        <Diapositiva indice={12}>
          <Rotulo>09 · Decisión técnica</Rotulo>
          <Titulo>El servidor no guarda nada</Titulo>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-tinta-media">
            Un pliego contiene información comercialmente sensible. El PDF se
            procesa en memoria, el historial vive en el navegador y el dictamen se
            genera en el cliente.
          </p>
          <div className="mt-10 grid max-w-4xl gap-x-10 gap-y-6 sm:grid-cols-2">
            <Contraste
              elegido="Autenticación propia con JWT firmado"
              descartado="Proveedor externo de identidad"
              motivo="Una sola cuenta pública de evaluación: un proveedor habría añadido dependencia sin aportar nada."
            />
            <Contraste
              elegido="Historial en localStorage"
              descartado="Base de datos con los análisis"
              motivo="Coste asumido: no se sincroniza entre dispositivos. A cambio, el documento nunca se almacena."
            />
          </div>
        </Diapositiva>

        {/* 11 — Stack */}
        <Diapositiva indice={13}>
          <Rotulo>10 · Stack</Rotulo>
          <Titulo>Qué se usó</Titulo>
          <dl className="mt-9 grid max-w-4xl gap-x-10 gap-y-4 sm:grid-cols-2">
            {[
              ["Next.js 16 · React 19", "App Router, Route Handlers, Edge para proteger rutas"],
              ["TypeScript 5 estricto", "Contratos tipados de extremo a extremo"],
              ["Claude Sonnet 5", "Tool use forzado y streaming"],
              ["Zod 4", "Validación de toda salida del modelo"],
              ["Tailwind CSS 4", "Sistema de diseño en tokens con @theme"],
              ["unpdf · mammoth · exceljs", "Ingesta de PDF, Word y Excel; DXF e IFC con parsers propios"],
              ["node:test", "36 pruebas, cero dependencias de desarrollo"],
              ["Vercel", "Despliegue continuo desde GitHub"],
            ].map(([nombre, para]) => (
              <div key={nombre} className="border-l-2 border-acento/40 pl-4">
                <dt className="font-semibold">{nombre}</dt>
                <dd className="mt-0.5 text-sm text-tinta-media">{para}</dd>
              </div>
            ))}
          </dl>
        </Diapositiva>

        {/* 12 — Resultados */}
        <Diapositiva indice={14}>
          <Rotulo>11 · Verificación</Rotulo>
          <Titulo>Una ejecución real, medida</Titulo>
          <p className="mt-5 max-w-3xl text-tinta-media">
            Alcance de obra de una nave industrial de 525 m² en Cancún, con
            claude-sonnet-5, en el despliegue de producción.
          </p>
          <div className="mt-9 grid gap-px bg-borde-suave sm:grid-cols-2 lg:grid-cols-4">
            <Metrica valor="1:58" etiqueta="minutos de pipeline" />
            <Metrica valor="17" etiqueta="requerimientos (7 críticos)" />
            <Metrica valor="7" etiqueta="formatos de salida" />
            <Metrica valor="13" etiqueta="disciplinas soportadas" />
            <Metrica valor="0" etiqueta="incoherencias aritméticas" destacada />
            <Metrica valor="21/26" etiqueta="partidas con supuesto declarado" />
            <Metrica valor="$4.9 M" etiqueta="presupuesto estimado (MXN)" />
            <Metrica valor="36/36" etiqueta="pruebas en verde" destacada />
          </div>
          <p className="mt-8 max-w-3xl text-sm leading-relaxed text-tinta-media">
            Detectó por su cuenta lo que el documento no mencionaba: ausencia de
            tierra física y pararrayos, falta de diseño estructural ante viento
            huracanado —zona ciclónica— y omisión de protección contra incendio en
            el cuarto de máquinas.
          </p>
        </Diapositiva>

        {/* 13 — Límites */}
        <Diapositiva indice={15}>
          <Rotulo>12 · Honestidad</Rotulo>
          <Titulo>Lo que todavía no hace</Titulo>
          <ul className="mt-9 max-w-3xl space-y-4">
            {[
              ["PDF escaneados", "Requiere texto seleccionable. Sin OCR, un plano escaneado se rechaza con un mensaje explícito."],
              ["Precios de referencia", "El modelo estima a valor de mercado; no consulta una base de precios viva."],
              ["Normativa", "El prompt obliga a poner null antes que inventar un artículo, pero toda cita debe verificarse."],
              [".rvt nativo", "No es generable sin Revit: ningún sistema lo escribe por API. Se entrega DXF e IFC, la vía real de intercambio."],
              ["Validación profesional", "Es un anteproyecto. No sustituye la firma de un responsable técnico, y la app lo advierte."],
            ].map(([titulo, texto]) => (
              <li key={titulo} className="flex gap-4">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-alto" aria-hidden="true" />
                <span>
                  <strong className="font-semibold">{titulo}. </strong>
                  <span className="text-tinta-media">{texto}</span>
                </span>
              </li>
            ))}
          </ul>
        </Diapositiva>

        {/* 14 — Cierre */}
        <Diapositiva indice={16} className="relative">
          <div className="rejilla-tecnica pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative">
            <Rotulo>Gracias</Rotulo>
            <h2 className="mt-4 max-w-4xl text-titular font-semibold leading-[0.95] tracking-[-0.02em]">
              Pruébalo tú mismo
            </h2>
            <div className="mt-9 space-y-2.5">
              <Enlace href="https://andres-engineering-ai.vercel.app" etiqueta="Aplicación">
                andres-engineering-ai.vercel.app
              </Enlace>
              <Enlace
                href="https://github.com/andresacostamwm-a11y/andres-engineering-ai"
                etiqueta="Código"
              >
                github.com/andresacostamwm-a11y/andres-engineering-ai
              </Enlace>
            </div>

            <div className="mt-9 inline-block rounded-lg border border-borde bg-superficie px-5 py-4">
              <p className="etiqueta-seccion">Acceso de prueba</p>
              <p className="cifra mt-2 text-sm">demo@diem.mx · TFMdemo2026</p>
            </div>

            <p className="mt-10 text-sm text-tinta-media">
              <strong className="font-semibold text-tinta">Heber Andres Acosta Jimenez</strong>
              <br />
              Máster en Desarrollo con IA · BIG School
            </p>
          </div>
        </Diapositiva>
      </main>

      <Diapositivas total={TOTAL} />

      <Link
        href="/"
        className="fixed left-5 top-5 z-50 rounded-md border border-borde bg-superficie/85 px-3 py-1.5 text-xs text-tinta-media backdrop-blur transition-colors hover:border-acento/60 hover:text-tinta print:hidden sm:left-8"
      >
        ← Inicio
      </Link>
    </>
  );
}

/* ------------------------------------------------------------ Componentes -- */

function Diapositiva({
  indice,
  className = "",
  children,
}: {
  indice: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={`d${indice}`}
      data-diapositiva
      className={`flex min-h-dvh snap-start flex-col justify-center border-b border-borde-suave px-5 py-20 sm:px-8 print:h-[167mm] print:min-h-0 print:break-after-page print:justify-center print:py-10 ${className}`}
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return <p className="etiqueta-seccion">{children}</p>;
}

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
      {children}
    </h2>
  );
}

function Cifra({ valor, texto }: { valor: string; texto: string }) {
  return (
    <div className="bg-fondo px-6 py-8">
      <p className="cifra text-3xl font-semibold text-acento sm:text-4xl">{valor}</p>
      <p className="mt-3 text-sm leading-relaxed text-tinta-media">{texto}</p>
    </div>
  );
}

function Metrica({
  valor,
  etiqueta,
  destacada = false,
}: {
  valor: string;
  etiqueta: string;
  destacada?: boolean;
}) {
  return (
    <div className="bg-fondo px-5 py-6">
      <p
        className={`cifra text-3xl font-semibold ${destacada ? "text-bajo" : "text-acento"}`}
      >
        {valor}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-tinta-media">{etiqueta}</p>
    </div>
  );
}

function Razon({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-borde bg-superficie p-5">
      <p className="font-semibold">{titulo}</p>
      <p className="mt-2 text-sm leading-relaxed text-tinta-media">{children}</p>
    </div>
  );
}

function Contraste({
  elegido,
  descartado,
  motivo,
}: {
  elegido: string;
  descartado: string;
  motivo: string;
}) {
  return (
    <div className="border-l-2 border-acento/40 pl-5">
      <p className="font-semibold text-acento">{elegido}</p>
      <p className="mt-1 text-sm text-tinta-debil line-through decoration-critico/50">
        {descartado}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-tinta-media">{motivo}</p>
    </div>
  );
}

function Codigo({ children }: { children: string }) {
  return (
    <pre className="mt-8 max-w-3xl overflow-x-auto rounded-lg border border-borde bg-superficie px-5 py-4">
      <code className="cifra text-xs leading-relaxed text-tinta-media sm:text-sm">
        {children}
      </code>
    </pre>
  );
}

function Captura({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="overflow-hidden rounded-lg border border-borde">
      <Image
        src={src}
        alt={alt}
        width={1400}
        height={640}
        className="w-full"
        sizes="(max-width: 1024px) 100vw, 55vw"
      />
    </figure>
  );
}

function Enlace({
  href,
  etiqueta,
  children,
}: {
  href: string;
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-3">
      <span className="etiqueta-seccion w-24">{etiqueta}</span>
      <a
        href={href}
        className="cifra text-base text-acento underline-offset-4 hover:underline sm:text-lg"
      >
        {children}
      </a>
    </p>
  );
}
