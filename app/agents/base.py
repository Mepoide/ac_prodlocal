from dataclasses import dataclass


@dataclass(frozen=True)
class Agent:
    id: str
    name: str
    description: str
    system_prompt: str
    greeting: str = "Hola"
    model: str | None = None  # None = usa el modelo por defecto de la app
    has_task_panel: bool = False
    agent_type: str = "llm"  # "llm" | "ocr" — determina el backend de inferencia
