/**
 * Marca del producto. El isotipo son cuatro nodos unidos: los cuatro agentes
 * del pipeline convergiendo en un dictamen.
 */
export function Isotipo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      fill="none"
      strokeWidth="1.6"
    >
      <path
        d="M6 8h8M6 16h5M6 24h8M14 8l7 8-7 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <circle cx="5" cy="8" r="2" fill="currentColor" />
      <circle cx="5" cy="16" r="2" fill="currentColor" opacity="0.7" />
      <circle cx="5" cy="24" r="2" fill="currentColor" />
      <circle cx="23" cy="16" r="3.2" fill="currentColor" />
    </svg>
  );
}

export function Marca({ compacta = false }: { compacta?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Isotipo className="size-7 text-acento" />
      <span className="leading-none">
        <span className="block text-[0.95rem] font-semibold tracking-tight">
          DIEM<span className="text-acento"> Copilot</span>
        </span>
        {!compacta && (
          <span className="etiqueta-seccion mt-1 block">
            Análisis de proyectos
          </span>
        )}
      </span>
    </span>
  );
}
