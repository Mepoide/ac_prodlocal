from app.agents.base import Agent

# El agente OCR no usa system_prompt de LLM — la inferencia la hace PaddleOCR.
# El campo system_prompt queda vacío; routes.py detecta has_task_panel=False
# y el tipo "ocr" para enrutar al endpoint /api/ocr en lugar de /api/chat.
AGENT = Agent(
    id="ocr",
    name="OCR — Extractor de texto",
    description="Extrae texto de imágenes y documentos usando PaddleOCR-VL-1.6 (local, sin LLM).",
    system_prompt="",
    greeting="Sube una imagen o documento y extraeré todo el texto que contenga.",
    has_task_panel=False,
    agent_type="ocr",
)
