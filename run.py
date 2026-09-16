#!/usr/bin/env python3
"""
ac_prodlocal — Asistentes de productividad local (LLM + OCR + ...)
"""

import sys
import threading
import webbrowser
from app import create_app
from app.config import PORT, DEFAULT_MODEL, OLLAMA_URL
from app.agents import list_agents

app = create_app()

if __name__ == "__main__":
    url = f"http://localhost:{PORT}"

    # Comprobación de padding del banner ASCII
    def _pad(s, w=36):
        return s + " " * max(0, w - len(s))

    print()
    print("  ╔══════════════════════════════════════════╗")
    print("  ║   ac_prodlocal — productividad local    ║")
    print("  ╠══════════════════════════════════════════╣")
    print(f"  ║  Modelo : {_pad(DEFAULT_MODEL, 31)}║")
    print(f"  ║  Ollama : {_pad(OLLAMA_URL, 31)}║")
    print(f"  ║  URL    : {_pad(url, 31)}║")
    print("  ╠══════════════════════════════════════════╣")
    print("  ║  OLLAMA_MODEL=<nombre> para cambiar     ║")
    print("  ║  Ctrl+C para parar                      ║")
    print("  ╚══════════════════════════════════════════╝")
    print()

    print("  Agentes disponibles:")
    for agent in list_agents():
        print(f"    • {agent.id} — {agent.name}")
    print()

    # Verificar Ollama y modelo
    client = app.config["OLLAMA_CLIENT"]
    try:
        available, all_models = client.check_model_available()
        if available:
            print(f"  ✓  Ollama OK — modelo '{DEFAULT_MODEL}' detectado.\n")
        else:
            print(f"  ⚠️  Modelo '{DEFAULT_MODEL}' no encontrado en Ollama.")
            if all_models:
                print("     Modelos disponibles (usa exactamente este nombre):")
                for m in all_models:
                    print(f"       • {m}")
            else:
                print("     No hay modelos descargados. Ejecuta: ollama pull <modelo>")
            print(f"\n     Cambia con: OLLAMA_MODEL=<nombre> python {sys.argv[0]}\n")

    except Exception as exc:
        print(f"  ⚠️  Error al comprobar Ollama o conectar con el servicio: {exc}\n")

    # Abrir navegador tras un segundo
    threading.Timer(1.5, lambda: webbrowser.open(url)).start()
    app.run(host="0.0.0.0", port=PORT, debug=False, threaded=True)
