from flask import Blueprint, render_template, request, jsonify, Response, current_app
from app.config import OLLAMA_URL, DEFAULT_MODEL
from app.agents import AGENTS, DEFAULT_AGENT_ID, get_agent, list_agents

bp = Blueprint("main", __name__)

@bp.route("/")
def index():
    return render_template("index.html")

@bp.route("/api/config")
def api_config():
    return jsonify({"model": DEFAULT_MODEL, "ollama_url": OLLAMA_URL})

@bp.route("/api/agents")
def api_agents():
    return jsonify({
        "agents": [
            {
                "id": a.id,
                "name": a.name,
                "description": a.description,
                "greeting": a.greeting,
                "model": a.model or DEFAULT_MODEL,
                "has_task_panel": a.has_task_panel,
                "agent_type": a.agent_type,
            }
            for a in list_agents()
        ],
        "default": DEFAULT_AGENT_ID,
    })

@bp.route("/api/chat/<agent_id>", methods=["POST"])
def api_chat(agent_id):
    if agent_id not in AGENTS:
        return jsonify({"error": f"Agente desconocido: {agent_id}"}), 404

    agent = get_agent(agent_id)
    if agent.agent_type != "llm":
        return jsonify({"error": f"El agente '{agent_id}' no es de tipo LLM. Usa /api/ocr para OCR."}), 400

    data = request.get_json(force=True, silent=True) or {}
    u_msgs = data.get("messages", [])
    all_msgs = [{"role": "system", "content": agent.system_prompt}] + u_msgs

    client = current_app.config["OLLAMA_CLIENT"]

    return Response(
        client.stream_chat(all_msgs, model=agent.model),
        content_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "X-Accel-Buffering": "no",
            "Connection":        "keep-alive",
        },
    )

@bp.route("/api/ocr", methods=["POST"])
def api_ocr():
    if "file" not in request.files:
        return jsonify({"error": "No se recibió ningún fichero (campo 'file')."}), 400

    f = request.files["file"]
    if f.filename == "":
        return jsonify({"error": "Nombre de fichero vacío."}), 400

    allowed = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif", ".pdf"}
    from pathlib import Path
    ext = Path(f.filename).suffix.lower()
    if ext not in allowed:
        return jsonify({"error": f"Formato no soportado: {ext}. Permitidos: {', '.join(sorted(allowed))}"}), 415

    image_bytes = f.read()

    from app.services.paddleocr_client import PaddleOCRClient
    result = PaddleOCRClient().extract_text(image_bytes, filename=f.filename)
    return jsonify(result)

@bp.route("/api/models")
def api_models():
    client = current_app.config["OLLAMA_CLIENT"]
    try:
        models = client.list_models()
        return jsonify({"models": models, "current": DEFAULT_MODEL})
    except Exception as exc:
        return jsonify({"models": [], "current": DEFAULT_MODEL, "error": str(exc)})
