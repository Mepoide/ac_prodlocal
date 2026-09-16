import requests
import json

class OllamaClient:
    def __init__(self, base_url, model):
        self.base_url = base_url.rstrip('/')
        self.model = model

    def list_models(self):
        """Lista los modelos disponibles en el servidor de Ollama."""
        try:
            r = requests.get(f"{self.base_url}/api/tags", timeout=5)
            r.raise_for_status()
            return [m["name"] for m in r.json().get("models", [])]
        except Exception as exc:
            raise RuntimeError(f"Error al conectar con Ollama: {exc}")

    def check_model_available(self):
        """Verifica si el modelo objetivo está descargado en Ollama."""
        try:
            models = self.list_models()
            model_base = self.model.split(":")[0]
            found = any(model_base in m for m in models)
            return found, models
        except Exception:
            return False, []

    def stream_chat(self, messages, model=None):
        """Envía el historial de chat a Ollama y transmite la respuesta vía Server-Sent Events (SSE)."""
        try:
            resp = requests.post(
                f"{self.base_url}/api/chat",
                json={
                    "model":    model or self.model,
                    "messages": messages,
                    "stream":   True,
                    "options":  {
                        "temperature": 0.7,
                        "num_predict": 2048,
                        "num_ctx":     8192,
                    },
                },
                stream=True,
                timeout=180,
            )
            resp.raise_for_status()

            for raw_line in resp.iter_lines():
                if not raw_line:
                    continue
                try:
                    chunk = json.loads(raw_line)
                except json.JSONDecodeError:
                    continue

                if chunk.get("done"):
                    yield "data: [DONE]\n\n"
                    break

                token = chunk.get("message", {}).get("content", "")
                if token:
                    yield f"data: {json.dumps({'token': token}, ensure_ascii=False)}\n\n"

        except requests.exceptions.ConnectionError:
            err = (
                f"No puedo conectar con Ollama en {self.base_url}. "
                f"¿Está corriendo? Ejecuta: ollama serve"
            )
            yield f"data: {json.dumps({'error': err})}\n\n"
        except requests.exceptions.Timeout:
            yield f"data: {json.dumps({'error': 'Timeout: el modelo tardó demasiado en responder.'})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
