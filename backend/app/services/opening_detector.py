from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

import cv2
import numpy as np


@dataclass
class DetectedOpening:
    opening_type: str
    x: float
    y: float
    w: float
    h: float
    confidence: float


class OpeningDetector:
    def __init__(self, model_path: Optional[Path] = None) -> None:
        self._model: Any = None
        self._available = False
        if model_path is None or not model_path.exists():
            return
        try:
            from ultralytics import YOLO  # type: ignore

            self._model = YOLO(str(model_path))
            self._available = True
        except Exception:
            self._available = False

    @property
    def available(self) -> bool:
        return self._available

    def detect(self, image: np.ndarray) -> list[DetectedOpening]:
        if not self._available:
            return self._detect_cv_heuristic(image)
        try:
            results = self._model.predict(image, conf=0.25, verbose=False)
        except Exception:
            return self._detect_cv_heuristic(image)

        detections: list[DetectedOpening] = []
        for result in results:
            names = result.names
            for box in result.boxes:
                cls = int(box.cls[0].item())
                label = names.get(cls, "window").lower()
                opening_type = "door" if "door" in label else "window"
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                detections.append(
                    DetectedOpening(
                        opening_type=opening_type,
                        x=float(x1),
                        y=float(y1),
                        w=float(x2 - x1),
                        h=float(y2 - y1),
                        confidence=float(box.conf[0].item()),
                    )
                )
        if not detections:
            return self._detect_cv_heuristic(image)
        return detections

    def _detect_cv_heuristic(self, image: np.ndarray) -> list[DetectedOpening]:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(binary, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        detections: list[DetectedOpening] = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            area = w * h
            if area < 180 or area > 6000:
                continue
            ratio = max(w / (h + 1e-6), h / (w + 1e-6))
            if ratio > 4.6:
                continue
            opening_type = "door" if area > 1200 else "window"
            detections.append(
                DetectedOpening(
                    opening_type=opening_type,
                    x=float(x),
                    y=float(y),
                    w=float(w),
                    h=float(h),
                    confidence=0.56,
                )
            )
            if len(detections) > 40:
                break
        return detections
