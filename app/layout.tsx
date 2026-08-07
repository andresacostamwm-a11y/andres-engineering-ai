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

const URL_BASE = "https://andres-engineering-ai.vercel.app";
const DESCRIPCION =
  "Sistema multiagente que proyecta y audita obra en trece disciplinas: extrae requerimientos con su cita, presupuesta con precios unitarios, revisa normativa y dibuja los planos del sistema.";

export const metadata: Metadata = {
  metadataBase: new URL(URL_BASE),
  title: "ANDRES Engineering AI — Engineering Document Analysis & Project Intelligence",
  description: DESCRIPCION,
  authors: [{ name: "Heber Andres Acosta Jimenez" }],
  applicationName: "ANDRES Engineering AI",
  // Lo que se ve al compartir el enlace por WhatsApp, Telegram, correo o redes.
  openGraph: {
    type: "website",
    siteName: "ANDRES Engineering AI",
    title: "ANDRES Engineering AI",
    description: DESCRIPCION,
    url: URL_BASE,
    locale: "es_MX",
  },
  twitter: {
    card: "summary_large_image",
    title: "ANDRES Engineering AI",
    description: DESCRIPCION,
  },
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
