import Link from "next/link";
import { Marca } from "@/components/Marca";
import { FormularioAcceso } from "@/components/FormularioAcceso";
import { PASSWORD_DEMO, USUARIO_DEMO } from "@/lib/auth";

export const metadata = { title: "Acceso — ANDRES Engineering AI" };

export default function PaginaLogin() {
  return (
    <main className="relative flex flex-1 items-center justify-center px-5 py-12">
      <div className="rejilla-tecnica pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative w-full max-w-sm">
        <Link href="/" className="mb-8 inline-block">
          <Marca />
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight">Acceso</h1>
        <p className="mt-1.5 text-sm text-tinta-media">
          Entra con la cuenta de demostración para probar la aplicación.
        </p>

        <FormularioAcceso
          usuarioInicial={USUARIO_DEMO}
          passwordInicial={PASSWORD_DEMO}
        />

        <div className="mt-6 rounded-lg border border-borde bg-superficie px-4 py-3.5 shadow-[var(--shadow-tarjeta)]">
          <p className="etiqueta-seccion">Credenciales de prueba</p>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-tinta-debil">Usuario</dt>
              <dd className="cifra">{USUARIO_DEMO}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-tinta-debil">Contraseña</dt>
              <dd className="cifra">{PASSWORD_DEMO}</dd>
            </div>
          </dl>
        </div>
      </div>
    </main>
  );
}
