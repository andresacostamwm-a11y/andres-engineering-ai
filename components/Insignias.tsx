import type { Disciplina, NivelRiesgo } from "@/lib/types";
import { ETIQUETA_DISCIPLINA, ETIQUETA_RIESGO } from "@/lib/types";

/*
 * Sobre superficie clara el color plano pierde presencia, así que cada nivel de
 * riesgo combina fondo teñido, borde del mismo tono y texto en la versión
 * saturada. Los pares están calibrados para superar el contraste AA.
 */
const ESTILO_RIESGO: Record<NivelRiesgo, string> = {
  critico: "border-critico/25 bg-critico-tenue text-critico",
  alto: "border-alto/25 bg-alto-tenue text-alto",
  medio: "border-medio/30 bg-medio-tenue text-medio",
  bajo: "border-bajo/25 bg-bajo-tenue text-bajo",
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
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border font-semibold ${
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
    <span className="inline-flex shrink-0 items-center rounded border border-borde bg-superficie-alta px-2 py-0.5 text-[0.6875rem] font-medium text-tinta-media">
      {ETIQUETA_DISCIPLINA[disciplina]}
    </span>
  );
}

export function InsigniaCritico() {
  return (
    <span className="inline-flex shrink-0 items-center rounded border border-critico/25 bg-critico-tenue px-2 py-0.5 text-[0.6875rem] font-semibold text-critico">
      Crítico
    </span>
  );
}
