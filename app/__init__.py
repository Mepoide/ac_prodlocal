from flask import Flask
from app.config import OLLAMA_URL, DEFAULT_MODEL
from app.ollama_client import OllamaClient

def create_app():
    app = Flask(__name__)
    app.config["JSON_AS_ASCII"] = False

    # Instanciar el cliente de Ollama y guardarlo en la configuración de Flask
    client = OllamaClient(OLLAMA_URL, DEFAULT_MODEL)
    app.config["OLLAMA_CLIENT"] = client

    # Registrar el blueprint principal
    from app.routes import bp as main_bp
    app.register_blueprint(main_bp)

    return app
