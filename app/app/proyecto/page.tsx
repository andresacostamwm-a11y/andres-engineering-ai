import Link from "next/link";
import { cookies } from "next/headers";
import { Marca } from "@/components/Marca";
import { CerrarSesion } from "@/components/CerrarSesion";
import { SelectorTema } from "@/components/SelectorTema";
import { SelectorMotor } from "@/components/SelectorMotor";
import { BotonHistorial } from "@/components/BotonHistorial";
import { CrearProyecto } from "@/components/CrearProyecto";
import { hayApiKey } from "@/lib/modelo";
import { NOMBRE_COOKIE, leerToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Crear proyecto — ANDRES Engineering AI",
};

export default async function PaginaProyecto() {
  const galletas = await cookies();
  const sesion = await leerToken(galletas.get(NOMBRE_COOKIE)?.value);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-borde bg-superficie/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link href="/" aria-label="Inicio">
            <Marca compacta />
          </Link>

          <nav className="flex items-center gap-4">
            <BotonHistorial />
            <SelectorMotor />
            <SelectorTema />
            <Link
              href="/app"
              className="text-xs font-medium text-tinta-media transition-colors hover:text-acento"
            >
              Analizar documentos
            </Link>
            <span className="hidden text-xs text-tinta-debil sm:inline">
              {sesion?.usuario}
            </span>
            <CerrarSesion />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[92rem] flex-1 px-5 py-7 sm:px-8">
        <div className="mb-7">
          <span className="etiqueta-seccion">Nuevo proyecto</span>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            Proyectar desde cero
          </h1>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-tinta-media">
            Describe qué quieres construir y en qué disciplina. Siete agentes con
            perfil doctoral redactan el alcance, extraen los requerimientos,
            presupuestan, revisan la normativa, dibujan el paquete completo de
            planos de las instalaciones y entregan la memoria descriptiva y de
            cálculo del proyecto.
          </p>
        </div>

        <CrearProyecto apiDisponible={hayApiKey()} />
      </main>

      <footer className="border-t border-borde px-5 py-5 text-center text-xs text-tinta-debil sm:px-8">
        Anteproyecto asistido por IA. Requiere validación y firma de un responsable
        técnico antes de cualquier uso constructivo o contractual.
      </footer>
    </>
  );
}
