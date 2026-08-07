import type { Disciplina, NivelRiesgo } from "@/lib/types";
import { ETIQUETA_DISCIPLINA, ETIQUETA_RIESGO } from "@/lib/types";

const ESTILO_RIESGO: Record<NivelRiesgo, string> = {
  critico: "border-critico/45 bg-critico/12 text-critico",
  alto: "border-alto/45 bg-alto/12 text-alto",
  medio: "border-medio/45 bg-medio/12 text-medio",
  bajo: "border-bajo/45 bg-bajo/12 text-bajo",
};

export function InsigniaRiesgo({
  riesgo,
  grande = false,
}: {
  riesgo: NivelRiesgo;
  grande?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border font-medium ${
        ESTILO_RIESGO[riesgo]
      } ${grande ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-[0.6875rem]"}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {ETIQUETA_RIESGO[riesgo]}
    </span>
  );
}

export function InsigniaDisciplina({ disciplina }: { disciplina: Disciplina }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded border border-borde bg-superficie-alta px-2 py-0.5 text-[0.6875rem] text-tinta-media">
      {ETIQUETA_DISCIPLINA[disciplina]}
    </span>
  );
}

export function InsigniaCritico() {
  return (
    <span className="inline-flex shrink-0 items-center rounded border border-critico/45 bg-critico/12 px-2 py-0.5 text-[0.6875rem] font-medium text-critico">
      Crítico
    </span>
  );
}
