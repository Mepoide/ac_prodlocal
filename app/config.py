import os

OLLAMA_URL    = os.getenv("OLLAMA_URL", "http://localhost:11434")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "hf.co/unsloth/gemma-4-E2B-it-GGUF")
PORT          = int(os.getenv("PORT", "8080"))
