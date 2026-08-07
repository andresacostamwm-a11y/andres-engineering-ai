"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cifra que cuenta hasta su valor al aparecer.
 *
 * Aporta a la lectura: en un tablero con varias métricas, el movimiento dirige
 * la mirada hacia el dato que acaba de calcularse. Se detiene de inmediato si el
 * usuario pidió movimiento reducido, y en ese caso muestra el valor final sin
 * animar.
 */
export function Contador({
  hasta,
  duracion = 900,
  decimales = 0,
  prefijo = "",
  sufijo = "",
}: {
  hasta: number;
  duracion?: number;
  decimales?: number;
  prefijo?: string;
  sufijo?: string;
}) {
  const [valor, setValor] = useState(hasta);
  const cuadroRef = useRef<number | null>(null);

  useEffect(() => {
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducido || hasta === 0) {
      setValor(hasta);
      return;
    }

    const inicio = performance.now();
    setValor(0);

    const paso = (ahora: number) => {
      const avance = Math.min((ahora - inicio) / duracion, 1);
      // Desaceleración cúbica: rápido al principio, se posa al final.
      const suavizado = 1 - Math.pow(1 - avance, 3);
      setValor(hasta * suavizado);
      if (avance < 1) cuadroRef.current = requestAnimationFrame(paso);
    };

    cuadroRef.current = requestAnimationFrame(paso);
    return () => {
      if (cuadroRef.current) cancelAnimationFrame(cuadroRef.current);
    };
  }, [hasta, duracion]);

  const texto = valor.toLocaleString("es-MX", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });

  return (
    <span>
      {prefijo}
      {texto}
      {sufijo}
    </span>
  );
}
