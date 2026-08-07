"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CerrarSesion() {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  return (
    <button
      type="button"
      disabled={saliendo}
      onClick={async () => {
        setSaliendo(true);
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
      }}
      className="rounded-md border border-borde px-3 py-1.5 text-xs text-tinta-media transition-colors hover:border-acento/60 hover:text-tinta disabled:opacity-50"
    >
      {saliendo ? "Saliendo…" : "Cerrar sesión"}
    </button>
  );
}
