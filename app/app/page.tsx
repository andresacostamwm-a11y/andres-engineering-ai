import { cookies } from "next/headers";
import Link from "next/link";
import { Taller } from "@/components/Taller";
import { Marca } from "@/components/Marca";
import { hayApiKey } from "@/lib/modelo";
import { NOMBRE_COOKIE, leerToken } from "@/lib/auth";
import { CerrarSesion } from "@/components/CerrarSesion";
import { SelectorTema } from "@/components/SelectorTema";
import { SelectorMotor } from "@/components/SelectorMotor";
import { BotonHistorial } from "@/components/BotonHistorial";

export const dynamic = "force-dynamic";

export default async function PaginaTaller() {
  const galletas = await cookies();
  const sesion = await leerToken(galletas.get(NOMBRE_COOKIE)?.value);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-borde bg-superficie/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link href="/" aria-label="Inicio de ANDRES Engineering AI">
            <Marca compacta />
          </Link>

          <div className="flex items-center gap-4">
            <BotonHistorial />
            <SelectorMotor />
            <SelectorTema />
            <span className="hidden text-xs text-tinta-debil sm:inline">
              {sesion?.usuario}
            </span>
            <CerrarSesion />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[92rem] flex-1 px-5 py-7 sm:px-8">
        <div className="mb-7">
          <span className="etiqueta-seccion">Área de trabajo</span>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            Analizar un documento de proyecto
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-tinta-media">
            Sube hasta diez documentos en PDF, Word, Excel, CSV, HTML, DXF, IFC,
            JSON o texto. Los agentes extraen los requerimientos con su cita,
            elaboran el presupuesto y revisan el cumplimiento normativo.
          </p>
        </div>

        <Taller apiDisponible={hayApiKey()} />
      </main>

      <footer className="border-t border-borde px-5 py-5 text-center text-xs text-tinta-debil sm:px-8">
        Análisis asistido por IA. Requiere validación de un responsable técnico
        antes de cualquier uso contractual.
      </footer>
    </>
  );
}
