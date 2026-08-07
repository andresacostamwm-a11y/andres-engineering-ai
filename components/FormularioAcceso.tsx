"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
interface Props {
  usuarioInicial: string;
  passwordInicial: string;
}

function Formulario({ usuarioInicial, passwordInicial }: Props) {
  const router = useRouter();
  const parametros = useSearchParams();
  const siguiente = parametros.get("siguiente") ?? "/app";

  const [usuario, setUsuario] = useState(usuarioInicial);
  const [password, setPassword] = useState(passwordInicial);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const respuesta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });

      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}));
        setError(datos.error ?? "No se pudo iniciar sesión.");
        return;
      }

      router.replace(siguiente);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="mt-6 space-y-4">
      <div>
        <label htmlFor="usuario" className="etiqueta-seccion">
          Usuario
        </label>
        <input
          id="usuario"
          type="text"
          autoComplete="username"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          className="mt-1.5 w-full rounded-md border border-borde bg-superficie px-3.5 py-2.5 text-sm shadow-[var(--shadow-sutil)] focus:border-acento focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="password" className="etiqueta-seccion">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full rounded-md border border-borde bg-superficie px-3.5 py-2.5 text-sm shadow-[var(--shadow-sutil)] focus:border-acento focus:outline-none"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-critico/25 bg-critico-tenue px-3.5 py-2.5 text-sm">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-md bg-acento py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-acento)] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

export function FormularioAcceso(props: Props) {
  return (
    <Suspense
      fallback={<div className="mt-6 h-56 animate-pulse rounded-md bg-superficie" />}
    >
      <Formulario {...props} />
    </Suspense>
  );
}
