/**
 * Catálogo de motores IA disponibles.
 *
 * Consulta la lista de modelos REAL de cada proveedor configurado, de modo que
 * el selector solo ofrece modelos que la cuenta puede invocar de verdad: si un
 * modelo no aparece, es que la API key no lo sirve. Se cachea en memoria una
 * hora porque los catálogos cambian poco y las tres llamadas tienen costo.
 */
import { NextResponse } from "next/server";
import { motorActivo, preferenciaDeCookie, conMotor } from "@/lib/modelo";

export const runtime = "nodejs";

interface Catalogo {
  proveedor: "claude" | "gemini" | "openai";
  nombre: string;
  modelos: string[];
}

let cache: { catalogos: Catalogo[]; expira: number } | null = null;

export async function GET(request: Request) {
  if (!cache || cache.expira < Date.now()) {
    const [claude, gemini, openai] = await Promise.all([
      listarClaude(),
      listarGemini(),
      listarOpenai(),
    ]);
    const catalogos: Catalogo[] = [];
    if (claude.length) catalogos.push({ proveedor: "claude", nombre: "Claude", modelos: claude });
    if (gemini.length) catalogos.push({ proveedor: "gemini", nombre: "Gemini", modelos: gemini });
    if (openai.length) catalogos.push({ proveedor: "openai", nombre: "GPT", modelos: openai });
    cache = { catalogos, expira: Date.now() + 60 * 60 * 1000 };
  }

  const preferencia = await preferenciaDeCookie(request);
  const activo = conMotor(preferencia, () => motorActivo());

  return NextResponse.json({
    catalogos: cache.catalogos,
    activo,
    eleccion: preferencia,
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
    return ((datos?.data ?? []) as { id: string }[])
      .map((m) => m.id)
      .filter((id) => id.startsWith("claude"));
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
      .map((m) => m.name.replace(/^models\//, ""))
      .filter((id) => /^gemini-\d/.test(id) && !/(embedding|tts|image|audio|live)/.test(id));
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
    return ((datos?.data ?? []) as { id: string }[])
      .map((m) => m.id)
      .filter(
        (id) =>
          /^(gpt-[45]|o\d|chatgpt)/.test(id) &&
          !/(audio|realtime|transcribe|tts|image|embedding|moderation|search)/.test(id),
      )
      .sort()
      .reverse();
  } catch {
    return [];
  }
}
