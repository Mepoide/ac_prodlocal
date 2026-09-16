# ac_prodlocal — Asistentes de Productividad Local

Plataforma multiagente de productividad que corre **100% en local**, sin enviar datos a la nube.
Combina un LLM conversacional (Gemma 4 vía Ollama) con modelos especializados (OCR con PaddleOCR-VL)
bajo una misma interfaz web Flask con selector de agente.

---

## Agentes disponibles

| Agente | Backend | Descripción |
|---|---|---|
| **Jira Task Builder** | Gemma 4 E2B (Ollama) | Entrevista al usuario y genera fichas de tarea Jira con plantilla estructurada |
| **OCR — Extractor de texto** | PaddleOCR-VL-1.6 (local) | Extrae texto de imágenes y PDFs arrastrando el fichero, sin pasar por el LLM |

---

## Requisitos Previos

1. **Python 3.10+** y **[uv](https://docs.astral.sh/uv/)** instalados.
2. **[Ollama](https://ollama.com)** instalado y ejecutándose localmente.
3. Modelo LLM descargado. Se recomienda `gemma4:e2b` para GPUs de 6 GB:
   ```bash
   # Descarga directa desde Hugging Face (mucho más rápido que registry.ollama.ai)
   ollama pull hf.co/unsloth/gemma-4-E2B-it-GGUF
   ```
4. *(Opcional)* Para el agente OCR, **CUDA 12.6+** y PaddleOCR:
   ```bash
   pip install paddlepaddle-gpu==3.2.1 \
       -i https://www.paddlepaddle.org.cn/packages/stable/cu126/
   uv pip install -e ".[ocr]"
   ```

---

## Instalación

```bash
git clone https://github.com/Mepoide/ac_prodlocal.git
cd ac_prodlocal
uv sync
```

---

## Ejecución

### Windows
Doble clic sobre `run.bat` — arranca Ollama si no está corriendo, activa el entorno y lanza la app.

### Linux / WSL / macOS
```bash
uv run run.py
```

Abre el navegador en **http://localhost:8080**.

---

## Variables de entorno

| Variable | Por defecto | Descripción |
|---|---|---|
| `OLLAMA_MODEL` | `hf.co/unsloth/gemma-4-E2B-it-GGUF` | Modelo LLM por defecto |
| `OLLAMA_URL` | `http://localhost:11434` | URL del servidor Ollama |
| `PORT` | `8080` | Puerto del servidor Flask |

Ejemplo:
```bash
OLLAMA_MODEL=gemma3:12b PORT=9000 uv run run.py
```

---

## Estructura del Proyecto

```
ac_prodlocal/
├── run.py                        # Punto de entrada
├── run.bat                       # Lanzador Windows
├── pyproject.toml                # Dependencias (uv); extras: [ocr]
└── app/
    ├── config.py                 # OLLAMA_URL, DEFAULT_MODEL, PORT
    ├── ollama_client.py          # Cliente HTTP/streaming → Ollama
    ├── routes.py                 # /api/agents  /api/chat/<id>  /api/ocr
    ├── agents/
    │   ├── base.py               # Dataclass Agent (id, name, prompt, agent_type…)
    │   ├── jira_task_builder.py  # Agente LLM: Jira Task Builder
    │   └── ocr.py                # Agente OCR: PaddleOCR-VL-1.6
    ├── services/
    │   └── paddleocr_client.py   # Wrapper sobre PaddleOCR (singleton lazy)
    ├── templates/index.html      # UI: selector de agente, chat, drop zone OCR
    └── static/                   # CSS + JS
```

---

## Añadir un nuevo agente

1. Crea `app/agents/<nombre>.py` con `AGENT = Agent(id=..., name=..., system_prompt=..., agent_type="llm")`.
2. Regístralo en `app/agents/__init__.py`.
3. **Opciones útiles del dataclass `Agent`:**
   - `model`: modelo Ollama específico para este agente (si es distinto al global).
   - `has_task_panel`: `True` para mostrar el panel lateral de resultado estructurado.
   - `agent_type`: `"llm"` (chat con Ollama) o `"ocr"` (inferencia con PaddleOCR).

Para un backend de inferencia completamente nuevo (e.g. Whisper para audio), crea
`app/services/<nombre>_client.py` e implementa el endpoint correspondiente en `routes.py`.
