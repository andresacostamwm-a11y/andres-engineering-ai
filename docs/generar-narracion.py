#!/usr/bin/env python3
"""
Genera la narración del vídeo con ElevenLabs y la mezcla sobre demo-editado.mp4.

Uso:
    export ELEVENLABS_API_KEY=sk_...
    python3 docs/generar-narracion.py

Cada bloque de docs/guion-tts.json se sintetiza por separado y se coloca en su
marca de tiempo. Si un bloque se pasa de su ventana, se comprime ligeramente con
atempo (hasta 1.12) antes que solaparse con el siguiente; si aun así no cabe, se
avisa para acortar el texto en lugar de acelerar hasta hacerlo ininteligible.
"""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
GUION = RAIZ / "docs" / "guion-tts.json"
SALIDA = Path(
    os.environ.get(
        "DIR_SALIDA",
        Path.home() / "Desktop" / "TRABAJO FIN DE MASTER " / "video",
    )
)
PISTAS = SALIDA / "narracion"
VIDEO_ENTRADA = SALIDA / "demo-editado.mp4"
VIDEO_SALIDA = SALIDA / "demo-narrado-voz-ia.mp4"

ATEMPO_MAXIMO = 1.12


def clave() -> str:
    valor = os.environ.get("ELEVENLABS_API_KEY", "").strip()

    # Respaldo: archivo local fuera de cualquier repositorio.
    if not valor:
        archivo = Path.home() / ".claude" / "eleven.env"
        if archivo.exists():
            for linea in archivo.read_text(encoding="utf-8").splitlines():
                if linea.startswith("ELEVENLABS_API_KEY="):
                    valor = linea.split("=", 1)[1].strip().strip('"').strip("'")
                    break

    if not valor:
        sys.exit(
            "Falta ELEVENLABS_API_KEY en el entorno.\n"
            "Consíguela en elevenlabs.io → perfil → API Keys (empieza por sk_)."
        )
    if not valor.startswith("sk_"):
        sys.exit(
            "La clave no tiene el formato actual de ElevenLabs (debe empezar por 'sk_').\n"
            "Genera una nueva en elevenlabs.io → perfil → API Keys."
        )
    return valor


def sintetizar(texto: str, voz: str, modelo: str, destino: Path, api_key: str) -> None:
    cuerpo = json.dumps(
        {
            "text": texto,
            "model_id": modelo,
            "voice_settings": {
                "stability": 0.45,
                "similarity_boost": 0.8,
                "style": 0.15,
                "use_speaker_boost": True,
            },
        }
    ).encode("utf-8")

    peticion = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voz}?output_format=mp3_44100_128",
        data=cuerpo,
        headers={"xi-api-key": api_key, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(peticion, timeout=180) as respuesta:
            destino.write_bytes(respuesta.read())
    except urllib.error.HTTPError as error:
        detalle = error.read()[:400].decode("utf-8", "replace")
        sys.exit(f"ElevenLabs devolvió HTTP {error.code}: {detalle}")


def duracion(ruta: Path) -> float:
    salida = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(ruta),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return float(salida.stdout.strip())


def main() -> None:
    api_key = clave()
    guion = json.loads(GUION.read_text(encoding="utf-8"))
    PISTAS.mkdir(parents=True, exist_ok=True)

    if not VIDEO_ENTRADA.exists():
        sys.exit(f"No encuentro el vídeo de entrada: {VIDEO_ENTRADA}")

    entradas: list[str] = []
    filtros: list[str] = []
    etiquetas: list[str] = []
    avisos: list[str] = []

    for indice, bloque in enumerate(guion["bloques"]):
        pista = PISTAS / f"{bloque['id']}.mp3"

        if pista.exists():
            print(f"  {bloque['id']}: ya existe, se reutiliza")
        else:
            print(f"  {bloque['id']}: sintetizando…")
            sintetizar(bloque["texto"], guion["voz"], guion["modelo"], pista, api_key)

        real = duracion(pista)
        ventana = float(bloque["ventana"])
        ritmo = 1.0

        if real > ventana:
            ritmo = min(real / ventana, ATEMPO_MAXIMO)
            if real / ritmo > ventana + 0.4:
                avisos.append(
                    f"{bloque['id']}: dura {real:.1f}s y la ventana es {ventana:.1f}s. "
                    f"Acorta el texto unas {int((real / ritmo - ventana) * 2.6)} palabras."
                )

        retardo = int(float(bloque["inicio"]) * 1000)
        cadena = f"[{indice + 1}:a]"
        if ritmo > 1.001:
            cadena += f"atempo={ritmo:.4f},"
        cadena += f"adelay={retardo}|{retardo}[a{indice}]"

        entradas += ["-i", str(pista)]
        filtros.append(cadena)
        etiquetas.append(f"[a{indice}]")
        print(f"      {real:5.1f}s en ventana de {ventana:4.1f}s  ritmo x{ritmo:.3f}")

    filtro = (
        ";".join(filtros)
        + ";"
        + "".join(etiquetas)
        + f"amix=inputs={len(etiquetas)}:normalize=0:dropout_transition=0,"
        + "alimiter=limit=0.92,aresample=48000[voz]"
    )

    orden = [
        "ffmpeg", "-y",
        "-i", str(VIDEO_ENTRADA),
        *entradas,
        "-filter_complex", filtro,
        "-map", "0:v", "-map", "[voz]",
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        "-movflags", "+faststart",
        str(VIDEO_SALIDA),
    ]

    print("\nMezclando…")
    resultado = subprocess.run(orden, capture_output=True, text=True)
    if resultado.returncode != 0:
        sys.exit(resultado.stderr[-1500:])

    print(f"\nListo: {VIDEO_SALIDA}  ({duracion(VIDEO_SALIDA):.1f}s)")
    for aviso in avisos:
        print(f"AVISO  {aviso}")


if __name__ == "__main__":
    main()
