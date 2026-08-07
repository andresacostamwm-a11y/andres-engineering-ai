/**
 * Capa de hologramas animados.
 *
 * Wireframes técnicos que flotan sobre la escena de fondo: una estructura de
 * edificio, una red de ductos isométrica, un rotor y un trazado de circuito.
 * Todo es SVG animado por CSS —solo `transform` y `opacity`, propiedades que
 * resuelve el compositor— así que no cuesta trabajo al hilo principal ni
 * interfiere con el scroll.
 *
 * Va detrás del contenido y sin capturar el puntero: es ambiente, no interfaz.
 */
export function CapaHologramas() {
  return (
    <div
      className="capa-hologramas pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {/* Estructura de edificio, arriba a la izquierda */}
      <svg className="holo holo-edificio" viewBox="0 0 200 260" fill="none">
        <g stroke="currentColor" strokeWidth="1.1" opacity="0.75">
          <path d="M40 240V60l60-34 60 34v180" />
          <path d="M40 60h120M40 96h120M40 132h120M40 168h120M40 204h120" />
          <path d="M70 60v180M100 26v214M130 60v180" />
          <path d="M40 240h120" strokeWidth="1.8" />
        </g>
        <g fill="currentColor" opacity="0.95">
          <circle cx="40" cy="60" r="2.6" />
          <circle cx="160" cy="60" r="2.6" />
          <circle cx="100" cy="26" r="3" />
          <circle cx="40" cy="240" r="2.6" />
          <circle cx="160" cy="240" r="2.6" />
        </g>
      </svg>

      {/* Red isométrica de ductos, derecha */}
      <svg className="holo holo-red" viewBox="0 0 240 200" fill="none">
        <g stroke="currentColor" strokeWidth="1.2" opacity="0.7">
          <path d="M20 120 90 80l70 40-70 40z" />
          <path d="M90 80V30M90 30l70 40M90 30 20 70M20 70v50M160 70v50" />
          <path d="M160 120 230 80M230 80v50l-70 40" />
        </g>
        <g fill="currentColor" opacity="0.95">
          <circle cx="90" cy="30" r="3.2" />
          <circle cx="20" cy="70" r="2.6" />
          <circle cx="160" cy="70" r="2.6" />
          <circle cx="90" cy="160" r="2.6" />
          <circle cx="230" cy="80" r="2.6" />
        </g>
      </svg>

      {/* Rotor / engrane, abajo a la izquierda */}
      <svg className="holo holo-rotor" viewBox="0 0 160 160" fill="none">
        <g stroke="currentColor" strokeWidth="1.2" opacity="0.7">
          <circle cx="80" cy="80" r="58" />
          <circle cx="80" cy="80" r="40" />
          <circle cx="80" cy="80" r="12" />
          <path d="M80 22v-14M80 138v14M22 80H8M138 80h14M39 39l-10-10M121 121l10 10M121 39l10-10M39 121l-10 10" />
          <path d="M80 40 96 80 80 120 64 80z" />
        </g>
        <circle cx="80" cy="80" r="4" fill="currentColor" />
      </svg>

      {/* Trazado de circuito, franja inferior */}
      <svg className="holo holo-circuito" viewBox="0 0 320 120" fill="none">
        <g stroke="currentColor" strokeWidth="1.2" opacity="0.6">
          <path d="M0 60h60l20-20h60l20 20h60l20 20h80" />
          <path d="M0 90h40l20-20M140 40V14M220 80v26" />
        </g>
        <g fill="currentColor" opacity="0.9">
          <circle cx="60" cy="60" r="3" />
          <circle cx="140" cy="40" r="3" />
          <circle cx="220" cy="80" r="3" />
          <circle cx="300" cy="80" r="3" />
        </g>
      </svg>

      {/* Barrido de escáner: una línea de luz que recorre la pantalla */}
      <span className="escaner" />
    </div>
  );
}
