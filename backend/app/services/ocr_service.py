from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import cv2
import numpy as np


@dataclass
class OCRLabel:
    text: str
    x: float
    y: float
    confidence: float
    box: list[tuple[float, float]] | None = None


class OCRService:
    def __init__(self) -> None:
        self._engine: Any = None
        self._available = False
        try:
            from paddleocr import PaddleOCR  # type: ignore

            self._engine = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
            self._available = True
        except Exception:
            self._available = False

    @property
    def available(self) -> bool:
        return self._available

    def detect_labels(self, image: np.ndarray) -> list[OCRLabel]:
        if not self._available:
            return []
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
