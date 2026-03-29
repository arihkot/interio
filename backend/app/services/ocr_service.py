from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

import cv2
import numpy as np


@dataclass
class OCRLabel:
    text: str
    x: float
    y: float
    confidence: float
    box: Optional[list[tuple[float, float]]] = None


class GLM09BOCRService:
    def __init__(self, model_name: str = "THUDM/glm-4v-0.9b") -> None:
        self._model_name = model_name
        self._available = False
        self._processor: Any = None
        self._model: Any = None
        self._torch: Any = None

        try:
            import torch  # type: ignore
            from transformers import (  # type: ignore
                AutoModelForVision2Seq,
                AutoProcessor,
            )

            self._torch = torch
            self._processor = AutoProcessor.from_pretrained(
                model_name, trust_remote_code=True
            )
            self._model = AutoModelForVision2Seq.from_pretrained(
                model_name,
                trust_remote_code=True,
                torch_dtype=torch.float16 if hasattr(torch, "float16") else None,
            )
            if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                self._model = self._model.to("mps")
            else:
                self._model = self._model.to("cpu")
            self._model.eval()
            self._available = True
        except Exception:
            self._available = False

    @property
    def available(self) -> bool:
        return self._available

    def detect_labels(self, image: np.ndarray) -> list[OCRLabel]:
        if not self._available or self._processor is None or self._model is None:
            return []

        # GLM-4V returns text only by default. We request structured room labels and
        # approximate centroids; if response cannot be parsed we gracefully return [].
        try:
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            prompt = (
                "Extract room labels from this floor plan. Return strict JSON list only. "
                'Each item must be: {"text": str, "x": number, "y": number, "confidence": number}. '
                "x,y are image pixel centroids of the room label."
            )
            inputs = self._processor(images=rgb, text=prompt, return_tensors="pt")
            if (
                self._torch is not None
                and hasattr(self._torch.backends, "mps")
                and self._torch.backends.mps.is_available()
            ):
                for key, value in inputs.items():
                    inputs[key] = value.to("mps")

            outputs = self._model.generate(**inputs, max_new_tokens=512)
            decoded = self._processor.batch_decode(outputs, skip_special_tokens=True)
            if not decoded:
                return []
            payload = decoded[0]
            start = payload.find("[")
            end = payload.rfind("]")
            if start < 0 or end <= start:
                return []

            import json

            parsed = json.loads(payload[start : end + 1])
            labels: list[OCRLabel] = []
            for item in parsed:
                text = str(item.get("text", "")).strip()
                if len(text) < 2:
                    continue
                x = float(item.get("x", 0.0))
                y = float(item.get("y", 0.0))
                conf = float(item.get("confidence", 0.55))
                labels.append(
                    OCRLabel(text=text, x=x, y=y, confidence=max(0.0, min(conf, 0.99)))
                )
            return labels
        except Exception:
            return []


class OCRService:
    def __init__(
        self, prefer_glm: bool = True, glm_model_name: str = "THUDM/glm-4v-0.9b"
    ) -> None:
        self._engine: Any = None
        self._available = False
        self._backend = "none"

        self._glm = GLM09BOCRService(model_name=glm_model_name) if prefer_glm else None
        if self._glm and self._glm.available:
            self._available = True
            self._backend = self._model_tag(glm_model_name)
            return

        try:
            from paddleocr import PaddleOCR  # type: ignore

            self._engine = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
            self._available = True
            self._backend = "paddleocr"
        except Exception:
            self._available = False
            self._backend = "none"

    @staticmethod
    def _model_tag(model_name: str) -> str:
        tag = model_name.split("/")[-1].strip()
        return tag if tag else "glm"

    @property
    def available(self) -> bool:
        return self._available

    @property
    def backend(self) -> str:
        return self._backend

    def detect_labels(self, image: np.ndarray) -> list[OCRLabel]:
        if not self._available:
            return []

        if self._glm and self._glm.available:
            labels = self._glm.detect_labels(image)
            if labels:
                return labels

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        upscaled = cv2.resize(gray, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
        try:
            result = self._engine.ocr(upscaled, cls=True)
        except Exception:
            return []

        labels: list[OCRLabel] = []
        for block in result:
            if not block:
                continue
            for line in block:
                box = line[0]
                text = line[1][0].strip()
                conf = float(line[1][1])
                if conf < 0.45 or len(text) < 2:
                    continue
                x = sum(point[0] for point in box) / 4.0
                y = sum(point[1] for point in box) / 4.0
                labels.append(
                    OCRLabel(
                        text=text,
                        x=x / 1.5,
                        y=y / 1.5,
                        confidence=conf,
                        box=[(pt[0] / 1.5, pt[1] / 1.5) for pt in box],
                    )
                )
        return labels
