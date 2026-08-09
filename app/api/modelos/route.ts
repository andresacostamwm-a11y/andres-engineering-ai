/**
 * Catálogo de motores IA disponibles.
 *
 * Cruza dos fuentes. La lista cerrada de `lib/modelo/catalogo` decide QUÉ se
 * ofrece —de los ciento y pico modelos que sirve una cuenta de OpenAI, solo
 * unos pocos valen para este trabajo—, y el catálogo vivo de cada proveedor
 * decide CUÁLES de esos siguen disponibles de verdad. Así el selector nunca
 * muestra un motor que fallaría al pulsarlo, ni por invención ni por un permiso
 * que la cuenta perdió.
 *
 * Se cachea en memoria una hora: los catálogos cambian poco y las tres
 * llamadas tienen costo.
 */
import { NextResponse } from "next/server";
import { motorActivo, preferenciaDeCookie, conMotor } from "@/lib/modelo";
import {
  CATALOGO_MOTORES,
  MOTOR_POR_DEFECTO,
  type OpcionMotor,
} from "@/lib/modelo/catalogo";

export const runtime = "nodejs";

interface Catalogo {
  proveedor: "claude" | "gemini" | "openai";
  nombre: string;
  opciones: OpcionMotor[];
}

const NOMBRE_PROVEEDOR = { claude: "Claude", gemini: "Gemini", openai: "GPT" } as const;

let cache: { catalogos: Catalogo[]; expira: number } | null = null;

export async function GET(request: Request) {
  if (!cache || cache.expira < Date.now()) {
    const [claude, gemini, openai] = await Promise.all([
      listarClaude(),
      listarGemini(),
      listarOpenai(),
    ]);
    const vivos: Record<string, Set<string>> = {
      claude: new Set(claude),
      gemini: new Set(gemini),
      openai: new Set(openai),
    };

    const catalogos: Catalogo[] = [];
    for (const proveedor of ["openai", "gemini", "claude"] as const) {
      const opciones = CATALOGO_MOTORES.filter(
        (o) => o.proveedor === proveedor && vivos[proveedor].has(o.modelo),
      );
      if (opciones.length > 0) {
        catalogos.push({ proveedor, nombre: NOMBRE_PROVEEDOR[proveedor], opciones });
      }
    }
    cache = { catalogos, expira: Date.now() + 60 * 60 * 1000 };
  }

  const preferencia = await preferenciaDeCookie(request);
  const activo = conMotor(preferencia, () => motorActivo());

  return NextResponse.json({
    catalogos: cache.catalogos,
    activo,
    eleccion: preferencia,
    porDefecto: MOTOR_POR_DEFECTO,
  });
}

async function listarClaude(): Promise<string[]> {
  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) return [];
  try {
    const r = await fetch("https://api.anthropic.com/v1/models?limit=50", {
      headers: { "x-api-key": clave, "anthropic-version": "2023-06-01" },
    });
    if (!r.ok) return [];
    const datos = await r.json();
    return ((datos?.data ?? []) as { id: string }[]).map((m) => m.id);
  } catch {
    return [];
  }
}

async function listarGemini(): Promise<string[]> {
  const clave = process.env.GEMINI_API_KEY;
  if (!clave) return [];
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key=${clave}`,
    );
    if (!r.ok) return [];
    const datos = await r.json();
    return ((datos?.models ?? []) as {
      name: string;
      supportedGenerationMethods?: string[];
    }[])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""));
  } catch {
    return [];
  }
}

async function listarOpenai(): Promise<string[]> {
  const clave = process.env.OPENAI_API_KEY;
  if (!clave) return [];
  try {
    const r = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${clave}` },
    });
    if (!r.ok) return [];
    const datos = await r.json();
    return ((datos?.data ?? []) as { id: string }[]).map((m) => m.id);
  } catch {
    return [];
  }
}
