"""
Cliente para PaddleOCR-VL-1.6.
Encapsula la inferencia local para que routes.py no dependa directamente
de paddleocr, facilitando tests y sustitución futura del backend OCR.

Instalación del backend (solo GPU CUDA 12.6+):
    pip install paddlepaddle-gpu==3.2.1 \
        -i https://www.paddlepaddle.org.cn/packages/stable/cu126/
    pip install "paddleocr[doc-parser]>=3.6.0"

Si no hay GPU o la instalación falla, el cliente devuelve un error claro
en vez de romper toda la app.
"""
from __future__ import annotations

import os
import tempfile
from pathlib import Path


def _load_pipeline():
    """Carga PaddleOCRVL una sola vez (singleton)."""
    try:
        from paddleocr import PaddleOCRVL  # type: ignore
        return PaddleOCRVL(pipeline_version="v1.6")
    except ImportError:
        return None


_pipeline = None


def _get_pipeline():
    global _pipeline
    if _pipeline is None:
        _pipeline = _load_pipeline()
    return _pipeline


class PaddleOCRClient:
    """Interfaz síncrona sobre PaddleOCR-VL para uso en Flask."""

    def is_available(self) -> bool:
        return _get_pipeline() is not None

    def extract_text(self, image_bytes: bytes, filename: str = "image.png") -> dict:
        """
        Extrae texto de una imagen.
        Devuelve {"text": str, "blocks": list} en éxito,
        o {"error": str} si algo falla.
        """
        pipeline = _get_pipeline()
        if pipeline is None:
            return {
                "error": (
                    "PaddleOCR no está instalado. Ejecuta:\n"
                    "pip install paddlepaddle-gpu==3.2.1 "
                    "-i https://www.paddlepaddle.org.cn/packages/stable/cu126/\n"
                    'pip install "paddleocr[doc-parser]>=3.6.0"'
                )
            }

        suffix = Path(filename).suffix or ".png"
        try:
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp.write(image_bytes)
                tmp_path = tmp.name

            blocks = []
            full_text_parts = []

            for res in pipeline.predict(tmp_path):
                # res.json() devuelve la estructura completa del resultado
                data = res.json() if hasattr(res, "json") else {}
                rec_texts = data.get("rec_texts", [])
                if isinstance(rec_texts, list):
                    full_text_parts.extend(rec_texts)
                    blocks.extend(rec_texts)
                elif isinstance(rec_texts, str):
                    full_text_parts.append(rec_texts)
                    blocks.append(rec_texts)

            return {
                "text": "\n".join(full_text_parts),
                "blocks": blocks,
            }

        except Exception as exc:
            return {"error": f"Error durante el OCR: {exc}"}
        finally:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass
