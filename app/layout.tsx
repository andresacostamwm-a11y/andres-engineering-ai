import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/*
 * Emparejamiento tipográfico: IBM Plex Sans e IBM Plex Mono comparten esqueleto,
 * lo que permite mezclar prosa y cifras en la misma tabla sin que el ojo salte.
 * Plex nació precisamente para documentación técnica.
 */
const plexSans = IBM_Plex_Sans({
  variable: "--font-sans-app",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono-app",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DIEM Copilot — Análisis de proyectos de ingeniería con IA",
  description:
    "Sistema multiagente que analiza pliegos y alcances de obra: extrae requerimientos, elabora presupuesto con precios unitarios y detecta hallazgos normativos.",
  authors: [{ name: "Heber Andres Acosta Jimenez" }],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
