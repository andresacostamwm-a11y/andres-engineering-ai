import type { Simbolo } from "@/lib/diagramas/tipos";

/**
 * Biblioteca de simbología técnica.
 *
 * Cada símbolo se dibuja centrado en el origen dentro de una caja de 44×44 y
 * hereda `currentColor`, de modo que el renderizador solo tiene que trasladarlo
 * a su posición. La simbología sigue las convenciones habituales de cada
 * disciplina —IEC/NEMA en eléctrico, ISO 1219 en neumático, ISA 5.1 en
 * instrumentación— con el nivel de detalle propio de un esquema de anteproyecto.
 */

const T = 1.7; // grosor de trazo base

interface PropsSimbolo {
  simbolo: Simbolo;
}

export function SimboloTecnico({ simbolo }: PropsSimbolo) {
  return (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth={T}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {dibujo(simbolo)}
    </g>
  );
}

/** Radio de influencia del símbolo, usado para recortar las líneas de conexión. */
export function radioSimbolo(simbolo: Simbolo): number {
  if (simbolo === "espacio" || simbolo === "bloque") return 30;
  if (simbolo === "tanque" || simbolo === "cisterna" || simbolo === "uma") return 24;
  return 20;
}

function dibujo(simbolo: Simbolo) {
  switch (simbolo) {
    /* ------------------------------------------------------ Eléctricos -- */
    case "acometida":
      return (
        <>
          <path d="M-18 6h36" />
          <path d="M-10 6v-8m10 8v-12m10 12v-8" />
          <circle cx="0" cy="-16" r="3" fill="currentColor" stroke="none" />
        </>
      );
    case "transformador":
      return (
        <>
          <circle cx="-7" cy="0" r="11" />
          <circle cx="7" cy="0" r="11" />
        </>
      );
    case "interruptor":
      return (
        <>
          <path d="M0 -18v8" />
          <path d="M0 18v-8" />
          <path d="M0 -10l11 7" />
          <circle cx="0" cy="-10" r="2.2" fill="currentColor" stroke="none" />
          <circle cx="0" cy="10" r="2.2" fill="currentColor" stroke="none" />
        </>
      );
    case "tablero":
      return (
        <>
          <rect x="-17" y="-14" width="34" height="28" rx="2" />
          <path d="M-17 -5h34" />
          <path d="M-9 2v6m9-6v6m9-6v6" />
        </>
      );
    case "motor-electrico":
      return (
        <>
          <circle cx="0" cy="0" r="16" />
          <text
            x="0"
            y="5.5"
            textAnchor="middle"
            fontSize="15"
            fontWeight="600"
            fill="currentColor"
            stroke="none"
          >
            M
          </text>
        </>
      );
    case "generador":
      return (
        <>
          <circle cx="0" cy="0" r="16" />
          <text
            x="0"
            y="5.5"
            textAnchor="middle"
            fontSize="15"
            fontWeight="600"
            fill="currentColor"
            stroke="none"
          >
            G
          </text>
        </>
      );
    case "luminario":
      return (
        <>
          <circle cx="0" cy="0" r="11" />
          <path d="M-7.8 -7.8l15.6 15.6M7.8 -7.8l-15.6 15.6" />
        </>
      );
    case "contacto":
      return (
        <>
          <path d="M-13 8a13 13 0 0 1 26 0z" />
          <path d="M-5 8v-6m10 6v-6" />
        </>
      );
    case "tierra":
      return (
        <>
          <path d="M0 -16v12" />
          <path d="M-14 -4h28M-9 2h18M-4 8h8" />
        </>
      );
    case "medidor":
      return (
        <>
          <circle cx="0" cy="0" r="15" />
          <path d="M-6 4l7-9 4 5" />
        </>
      );
    case "ups":
      return (
        <>
          <rect x="-17" y="-13" width="34" height="26" rx="2" />
          <path d="M-8 -4v8m0-8l4 4-4 4" />
          <path d="M4 -6v12M9 -6v12" />
        </>
      );
    case "banco-capacitores":
      return (
        <>
          <path d="M0 -16v8M0 16v-8" />
          <path d="M-12 -8h24M-12 8h24" />
        </>
      );

    /* ------------------------------------------- Hidráulicos y fluidos -- */
    case "bomba":
      return (
        <>
          <circle cx="0" cy="0" r="15" />
          <path d="M-6 -7l11 7-11 7z" fill="currentColor" stroke="none" />
        </>
      );
    case "valvula":
      return (
        <>
          <path d="M-14 -9l14 9-14 9z" />
          <path d="M14 -9l-14 9 14 9z" />
          <path d="M0 0v-14M-6 -14h12" />
        </>
      );
    case "valvula-check":
      return (
        <>
          <path d="M-14 -9l14 9-14 9z" />
          <path d="M14 -10v20" />
        </>
      );
    case "valvula-control":
      return (
        <>
          <path d="M-13 -8l13 8-13 8z" />
          <path d="M13 -8l-13 8 13 8z" />
          <path d="M0 0v-10" />
          <path d="M-8 -18a8 8 0 0 1 16 0z" />
        </>
      );
    case "tanque":
      return (
        <>
          <path d="M-14 -10v20a14 6 0 0 0 28 0v-20" />
          <ellipse cx="0" cy="-10" rx="14" ry="6" />
          <path d="M-14 2a14 6 0 0 0 28 0" />
        </>
      );
    case "cisterna":
      return (
        <>
          <rect x="-17" y="-11" width="34" height="22" rx="1.5" />
          <path d="M-17 -1c6 3 11 -3 17 0s11 3 17 0" />
        </>
      );
    case "filtro":
      return (
        <>
          <rect x="-11" y="-15" width="22" height="30" rx="1.5" />
          <path d="M-11 -6l22 12M-11 6l22 -12" />
        </>
      );
    case "intercambiador":
      return (
        <>
          <circle cx="0" cy="0" r="16" />
          <path d="M-16 0h6l4 -7 5 14 5 -14 4 7h6" />
        </>
      );
    case "medidor-flujo":
      return (
        <>
          <rect x="-14" y="-9" width="28" height="18" rx="1.5" />
          <path d="M-6 0h12M2 -4l4 4-4 4" />
        </>
      );
    case "hidrante":
      return (
        <>
          <circle cx="0" cy="-4" r="9" />
          <path d="M0 5v11M-8 16h16M-9 -4h-5M9 -4h5" />
        </>
      );
    case "rociador":
      return (
        <>
          <path d="M0 -14v10" />
          <path d="M-9 -4h18" />
          <path d="M-6 4c2 4 10 4 12 0" />
          <circle cx="0" cy="-1" r="2.5" fill="currentColor" stroke="none" />
        </>
      );

    /* -------------------------------------------------------- Neumáticos -- */
    case "compresor":
      return (
        <>
          <circle cx="0" cy="0" r="15" />
          <path d="M-7 6l14 -12M-7 -6l14 12" />
          <path d="M-15 0h-4M15 0h4" />
        </>
      );
    case "cilindro":
      return (
        <>
          <rect x="-16" y="-10" width="24" height="20" />
          <path d="M-6 -10v20" />
          <path d="M8 0h12" />
          <path d="M18 -6v12" />
        </>
      );
    case "valvula-5-2":
      return (
        <>
          <rect x="-18" y="-10" width="18" height="20" />
          <rect x="0" y="-10" width="18" height="20" />
          <path d="M-14 6l5 -10 5 10" />
          <path d="M4 -4h10M4 4h10" />
        </>
      );
    case "unidad-mantenimiento":
      return (
        <>
          <path d="M0 -16l11 8v16l-11 8-11 -8v-16z" />
          <path d="M-6 0h12M0 -6v12" />
        </>
      );
    case "secador":
      return (
        <>
          <rect x="-12" y="-15" width="24" height="30" rx="2" />
          <path d="M-5 -8c5 4 5 8 0 12M5 -8c-5 4 -5 8 0 12" />
        </>
      );
    case "acumulador":
      return (
        <>
          <rect x="-11" y="-15" width="22" height="30" rx="11" />
          <path d="M-11 -2h22" />
        </>
      );

    /* --------------------------------------------------------- Mecánicos -- */
    case "motor":
      return (
        <>
          <rect x="-16" y="-11" width="32" height="22" rx="2" />
          <path d="M-16 -4h32M-16 4h32" />
          <path d="M16 0h5" />
        </>
      );
    case "reductor":
      return (
        <>
          <rect x="-15" y="-13" width="30" height="26" rx="2" />
          <circle cx="-5" cy="0" r="6" />
          <circle cx="7" cy="4" r="4" />
        </>
      );
    case "banda":
      return (
        <>
          <circle cx="-11" cy="0" r="8" />
          <circle cx="11" cy="0" r="5" />
          <path d="M-11 -8h22M-11 8h22" />
        </>
      );
    case "acoplamiento":
      return (
        <>
          <path d="M-18 0h8M10 0h8" />
          <rect x="-10" y="-9" width="9" height="18" rx="1.5" />
          <rect x="1" y="-9" width="9" height="18" rx="1.5" />
        </>
      );
    case "rodamiento":
      return (
        <>
          <circle cx="0" cy="0" r="15" />
          <circle cx="0" cy="0" r="7" />
          <circle cx="0" cy="-11" r="2.6" />
          <circle cx="11" cy="0" r="2.6" />
          <circle cx="0" cy="11" r="2.6" />
          <circle cx="-11" cy="0" r="2.6" />
        </>
      );
    case "engrane":
      return (
        <>
          <circle cx="0" cy="0" r="12" />
          <circle cx="0" cy="0" r="4" />
          <path d="M0 -16v4M0 16v-4M-16 0h4M16 0h-4M-11 -11l3 3M11 11l-3 -3M11 -11l-3 3M-11 11l3 -3" />
        </>
      );

    /* ------------------------------------------------------- Electrónicos -- */
    case "resistencia":
      return (
        <>
          <path d="M-18 0h5l3 -7 5 14 5 -14 3 7h5" />
        </>
      );
    case "capacitor":
      return (
        <>
          <path d="M-18 0h14M4 0h14" />
          <path d="M-4 -11v22M4 -11v22" />
        </>
      );
    case "inductor":
      return (
        <>
          <path d="M-18 0h4" />
          <path d="M-14 0a4 4 0 0 1 8 0a4 4 0 0 1 8 0a4 4 0 0 1 8 0" />
          <path d="M14 0h4" />
        </>
      );
    case "diodo":
      return (
        <>
          <path d="M-18 0h9M9 0h9" />
          <path d="M-9 -9l18 9-18 9z" />
          <path d="M9 -9v18" />
        </>
      );
    case "transistor":
      return (
        <>
          <circle cx="0" cy="0" r="15" />
          <path d="M-14 0h6M-8 -9v18" />
          <path d="M-8 -4l12 -7M-8 4l12 7" />
          <path d="M4 -11v-5M4 11v5" />
        </>
      );
    case "circuito-integrado":
      return (
        <>
          <rect x="-13" y="-15" width="26" height="30" rx="2" />
          <path d="M-13 -8h-5M-13 0h-5M-13 8h-5M13 -8h5M13 0h5M13 8h5" />
          <circle cx="-8" cy="-10" r="1.8" fill="currentColor" stroke="none" />
        </>
      );
    case "microcontrolador":
      return (
        <>
          <rect x="-16" y="-16" width="32" height="32" rx="2.5" />
          <rect x="-8" y="-8" width="16" height="16" rx="1" />
          <path d="M-16 -8h-4M-16 0h-4M-16 8h-4M16 -8h4M16 0h4M16 8h4M-8 -16v-4M0 -16v-4M8 -16v-4" />
        </>
      );
    case "sensor":
      return (
        <>
          <circle cx="0" cy="0" r="14" />
          <path d="M0 -14v-4" />
          <path d="M-6 4c3 -8 9 -8 12 0" />
          <circle cx="0" cy="6" r="2" fill="currentColor" stroke="none" />
        </>
      );
    case "fuente":
      return (
        <>
          <circle cx="0" cy="0" r="15" />
          <path d="M-7 -4h14M-7 4h14M0 -8v8" />
        </>
      );

    /* --------------------------------------------------------------- HVAC -- */
    case "uma":
      return (
        <>
          <rect x="-20" y="-13" width="40" height="26" rx="2" />
          <path d="M-8 -13v26M6 -13v26" />
          <path d="M-16 -5l4 10M-12 -5l4 10" />
          <circle cx="-1" cy="0" r="5" />
        </>
      );
    case "condensadora":
      return (
        <>
          <rect x="-16" y="-14" width="32" height="28" rx="2" />
          <circle cx="0" cy="0" r="9" />
          <path d="M-6 -6c4 3 8 3 12 0M-6 6c4 -3 8 -3 12 0" />
        </>
      );
    case "evaporadora":
      return (
        <>
          <rect x="-18" y="-10" width="36" height="20" rx="2" />
          <path d="M-12 -10v20M-4 -10v20M4 -10v20M12 -10v20" />
        </>
      );
    case "ventilador":
      return (
        <>
          <circle cx="0" cy="0" r="15" />
          <path d="M0 0c-8 -10 8 -10 0 0M0 0c10 -8 10 8 0 0M0 0c8 10 -8 10 0 0M0 0c-10 8 -10 -8 0 0" />
        </>
      );
    case "difusor":
      return (
        <>
          <path d="M-15 -10h30l-8 20h-14z" />
          <path d="M-9 -4h18M-6 2h12" />
        </>
      );
    case "damper":
      return (
        <>
          <rect x="-14" y="-12" width="28" height="24" />
          <path d="M-10 8l20 -16" />
          <circle cx="0" cy="0" r="2" fill="currentColor" stroke="none" />
        </>
      );
    case "serpentin":
      return (
        <>
          <rect x="-16" y="-12" width="32" height="24" />
          <path d="M-10 -12v6c0 4 6 4 6 0v-6M-4 -6c0 4 6 4 6 0M2 -6v6c0 4 6 4 6 0" />
        </>
      );

    /* --------------------------------------------------- Control y genérico -- */
    case "plc":
      return (
        <>
          <rect x="-19" y="-14" width="38" height="28" rx="2" />
          <path d="M-19 -6h38" />
          <text
            x="0"
            y="8"
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="currentColor"
            stroke="none"
          >
            PLC
          </text>
          <path d="M-12 -14v-4M-4 -14v-4M4 -14v-4M12 -14v-4" />
        </>
      );
    case "instrumento":
      return (
        <>
          <circle cx="0" cy="0" r="15" />
          <path d="M-15 0h30" />
        </>
      );
    case "actuador":
      return (
        <>
          <rect x="-13" y="-8" width="26" height="16" rx="2" />
          <path d="M0 -8v-8M-8 -16h16" />
        </>
      );
    case "bloque":
      return <rect x="-30" y="-16" width="60" height="32" rx="3" />;
    case "espacio":
      return null; // el renderizador dibuja su propio rectángulo con dimensiones
    case "nodo":
    default:
      return <circle cx="0" cy="0" r="5" fill="currentColor" stroke="none" />;
  }
}
