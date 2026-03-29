from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

import cv2
import numpy as np
from shapely.geometry import Polygon
from shapely.ops import unary_union

from app.models import FloorPlan2D, Opening2D, Point2D, Room2D, Wall2D
from app.services.ocr_service import OCRService
from app.services.opening_detector import OpeningDetector
from app.utils.geometry import (
    line_length,
    midpoint,
    orthogonalize_segment,
    quantize_point,
)


@dataclass
class ParserConfig:
    min_wall_length_px: int = 30
    hough_threshold: int = 70
    room_area_min_px: int = 2800
    default_scale_m_per_px: float = 0.02


class PlanParser:
    def __init__(
        self,
        config: Optional[ParserConfig] = None,
        ocr_service: Optional[OCRService] = None,
        opening_detector: Optional[OpeningDetector] = None,
    ):
        self.config = config or ParserConfig()
        self.ocr_service = ocr_service or OCRService()
        self.opening_detector = opening_detector or OpeningDetector()

    def parse_image(self, image_path: Path) -> FloorPlan2D:
        image = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError(f"Unable to load image: {image_path}")

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Detect labels first to mask them out
        labels = self.ocr_service.detect_labels(image)
        for label in labels:
            if label.box:
                pts = np.array(label.box, dtype=np.int32)
                # Expand the box slightly to ensure the text is fully covered
                x, y, w, h = cv2.boundingRect(pts)
                cv2.rectangle(
                    gray, (x - 2, y - 2), (x + w + 2, y + h + 2), (255, 255, 255), -1
                )

        binary = self._binarize(gray)
        walls = self._detect_walls(binary)
        rooms, boundary = self._detect_rooms(binary)
        openings = self._detect_openings(image, walls)
        self._assign_room_names(rooms, labels)

        notes = []
        if len(rooms) == 0:
            notes.append(
                "No enclosed rooms detected; fallback manual geometry is recommended."
            )
        if len(walls) < 4:
            notes.append("Low wall count; model may be incomplete.")
        if not self.ocr_service.available:
            notes.append(
                "OCR model unavailable locally; room names inferred heuristically."
            )
        if not self.opening_detector.available:
            notes.append(
                "YOLO opening detector unavailable locally; CV heuristics used for doors/windows."
            )
        confidence = self._confidence_score(walls, rooms, openings)

        return FloorPlan2D(
            image_width_px=image.shape[1],
            image_height_px=image.shape[0],
            scale_m_per_px=self.config.default_scale_m_per_px,
            boundary=boundary,
            walls=walls,
            rooms=rooms,
            openings=openings,
            labels_detected=[label.text for label in labels],
            parsing_confidence=confidence,
            parsing_notes=notes,
        )

    def _binarize(self, gray: np.ndarray) -> np.ndarray:
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        _, binary = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)
        return cleaned

    def _merge_collinear_walls(self, walls: list[Wall2D]) -> list[Wall2D]:
        merged_walls = []

        # Separate into horizontal and vertical
        horizontal = []
        vertical = []
        for w in walls:
            if abs(w.start.y - w.end.y) < 0.1:
                horizontal.append(w)
            elif abs(w.start.x - w.end.x) < 0.1:
                vertical.append(w)

        def merge_segments(segments, is_horizontal):
            if not segments:
                return []

            # Group by the constant coordinate
            groups = {}
            tolerance = 0.3

            for seg in segments:
                const_val = seg.start.y if is_horizontal else seg.start.x

                # Find an existing group
                matched_key = None
                for key in groups.keys():
                    if abs(key - const_val) < tolerance:
                        matched_key = key
                        break

                if matched_key is None:
                    matched_key = const_val
                    groups[matched_key] = []

                groups[matched_key].append(seg)

            merged_result = []
            for const_val, segs in groups.items():
                # Extract intervals
                intervals = []
                for s in segs:
                    if is_horizontal:
                        val1, val2 = s.start.x, s.end.x
                    else:
                        val1, val2 = s.start.y, s.end.y
                    intervals.append(
                        [min(val1, val2), max(val1, val2), s.thickness_m, s.confidence]
                    )

                # Sort intervals
                intervals.sort(key=lambda x: x[0])

                # Merge overlapping or close intervals
                merged_intervals = []
                gap_tolerance = 0.5

                current = intervals[0]
                for nxt in intervals[1:]:
                    if current[1] + gap_tolerance >= nxt[0]:
                        # Merge
                        current[1] = max(current[1], nxt[1])
                        current[2] = max(current[2], nxt[2])  # max thickness
                        current[3] = max(current[3], nxt[3])  # max confidence
                    else:
                        merged_intervals.append(current)
                        current = nxt
                merged_intervals.append(current)

                for interval in merged_intervals:
                    start_pt = (
                        Point2D(x=interval[0], y=const_val)
                        if is_horizontal
                        else Point2D(x=const_val, y=interval[0])
                    )
                    end_pt = (
                        Point2D(x=interval[1], y=const_val)
                        if is_horizontal
                        else Point2D(x=const_val, y=interval[1])
                    )
                    length = interval[1] - interval[0]
                    if length < 0.1:
                        continue

                    merged_result.append(
                        Wall2D(
                            id="",  # will be set later
                            start=start_pt,
                            end=end_pt,
                            thickness_m=interval[2],
                            length_m=round(length, 3),
                            is_load_bearing=False,
                            confidence=interval[3],
                        )
                    )

            return merged_result

        merged_walls.extend(merge_segments(horizontal, is_horizontal=True))
        merged_walls.extend(merge_segments(vertical, is_horizontal=False))

        for idx, w in enumerate(merged_walls, 1):
            w.id = f"W{idx}"

        return merged_walls

    def _detect_walls(self, binary: np.ndarray) -> list[Wall2D]:
        lines = cv2.HoughLinesP(
            binary,
            rho=1,
            theta=np.pi / 180,
            threshold=self.config.hough_threshold,
            minLineLength=self.config.min_wall_length_px,
            maxLineGap=10,
        )
        if lines is None:
            return []
        wall_segments: list[Wall2D] = []
        idx = 1
        for line in lines:
            x1, y1, x2, y2 = line[0].tolist()
            x1m, y1m, x2m, y2m = self._to_meters(x1, y1, x2, y2)
            x1m, y1m, x2m, y2m = orthogonalize_segment(x1m, y1m, x2m, y2m)
            x1m, y1m = quantize_point(x1m, y1m)
            x2m, y2m = quantize_point(x2m, y2m)
            length = line_length(x1m, y1m, x2m, y2m)
            if (
                length
                < self.config.min_wall_length_px
                * self.config.default_scale_m_per_px
                * 0.6
            ):
                continue
            wall_segments.append(
                Wall2D(
                    id=f"W{idx}",
                    start=Point2D(x=x1m, y=y1m),
                    end=Point2D(x=x2m, y=y2m),
                    thickness_m=0.23 if idx % 4 == 0 else 0.12,
                    length_m=round(length, 3),
                    is_load_bearing=False,
                    confidence=0.7,
                )
            )
            idx += 1
        deduped = self._dedupe_walls(wall_segments)
        merged = self._merge_collinear_walls(deduped)
        self._mark_load_bearing(merged)
        return merged

    def _detect_rooms(self, binary: np.ndarray) -> tuple[list[Room2D], list[Point2D]]:
        contours, _ = cv2.findContours(binary, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        rooms: list[Room2D] = []
        room_idx = 1
        polygons: list[Polygon] = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < self.config.room_area_min_px:
                continue
            perimeter = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.01 * perimeter, True)
            points = [self._px_to_point(p[0][0], p[0][1]) for p in approx]
            if len(points) < 4:
                continue
            poly = Polygon([(p.x, p.y) for p in points]).buffer(0)
            if not poly.is_valid or poly.area <= 0.3:
                continue
            polygons.append(poly)
            centroid = poly.centroid
            room = Room2D(
                id=f"R{room_idx}",
                name=self._guess_room_name(room_idx),
                polygon=[
                    Point2D(x=round(x, 3), y=round(y, 3))
                    for x, y in list(poly.exterior.coords)[:-1]
                ],
                area_m2=round(poly.area, 3),
                centroid=Point2D(x=round(centroid.x, 3), y=round(centroid.y, 3)),
                confidence=0.68,
            )
            rooms.append(room)
            room_idx += 1

        boundary: list[Point2D] = []
        if polygons:
            merged = unary_union(polygons)
            if hasattr(merged, "exterior"):
                boundary = [
                    Point2D(x=round(x, 3), y=round(y, 3))
                    for x, y in list(merged.exterior.coords)[:-1]
                ]
            else:
                max_poly = max(merged.geoms, key=lambda p: p.area)
                boundary = [
                    Point2D(x=round(x, 3), y=round(y, 3))
                    for x, y in list(max_poly.exterior.coords)[:-1]
                ]
        return rooms, boundary

    def _detect_openings(
        self, image: np.ndarray, walls: list[Wall2D]
    ) -> list[Opening2D]:
        openings: list[Opening2D] = []
        if not walls:
            return openings

        detections = self.opening_detector.detect(image)
        idx = 1
        for detection in detections:
            cx = detection.x + detection.w * 0.5
            cy = detection.y + detection.h * 0.5
            cxm, cym = self._to_meter_point(cx, cy)
            wall = self._nearest_wall(cxm, cym, walls)
            if wall is None:
                continue
            openings.append(
                Opening2D(
                    id=f"O{idx}",
                    wall_id=wall.id,
                    opening_type=detection.opening_type,
                    position=Point2D(x=round(cxm, 3), y=round(cym, 3)),
                    width_m=round(detection.w * self.config.default_scale_m_per_px, 3),
                    height_m=round(
                        (2.1 if detection.opening_type == "door" else 1.2), 2
                    ),
                    confidence=round(detection.confidence, 2),
                )
            )
            idx += 1
            if idx > 32:
                break
        return openings

    def _assign_room_names(self, rooms: list[Room2D], labels: list[Any]) -> None:
        if not labels:
            return
        for room in rooms:
            best = None
            best_dist = 1e9
            for label in labels:
                lx, ly = self._to_meter_point(label.x, label.y)
                dist = (
                    (room.centroid.x - lx) ** 2 + (room.centroid.y - ly) ** 2
                ) ** 0.5
                if dist < best_dist:
                    best_dist = dist
                    best = label
            if best is not None and best_dist < 2.2:
                room.name = best.text.title()
                room.confidence = round(
                    min(0.95, max(room.confidence, best.confidence)), 2
                )

    def _dedupe_walls(self, walls: list[Wall2D]) -> list[Wall2D]:
        unique: list[Wall2D] = []
        seen: set[tuple[float, float, float, float]] = set()
        for wall in walls:
            key = (
                round(min(wall.start.x, wall.end.x), 2),
                round(min(wall.start.y, wall.end.y), 2),
                round(max(wall.start.x, wall.end.x), 2),
                round(max(wall.start.y, wall.end.y), 2),
            )
            if key in seen:
                continue
            seen.add(key)
            unique.append(wall)
        for idx, wall in enumerate(unique, start=1):
            wall.id = f"W{idx}"
        return unique

    def _mark_load_bearing(self, walls: list[Wall2D]) -> None:
        if not walls:
            return
        xs = [w.start.x for w in walls] + [w.end.x for w in walls]
        ys = [w.start.y for w in walls] + [w.end.y for w in walls]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        x_mid = (min_x + max_x) * 0.5
        y_mid = (min_y + max_y) * 0.5
        for wall in walls:
            x_avg = (wall.start.x + wall.end.x) * 0.5
            y_avg = (wall.start.y + wall.end.y) * 0.5
            near_shell = (
                abs(x_avg - min_x) < 0.35
                or abs(x_avg - max_x) < 0.35
                or abs(y_avg - min_y) < 0.35
                or abs(y_avg - max_y) < 0.35
            )
            spine = abs(x_avg - x_mid) < 0.3 or abs(y_avg - y_mid) < 0.3
            long_span = wall.length_m > 4.4
            wall.is_load_bearing = near_shell or (spine and long_span)
            if wall.is_load_bearing:
                wall.thickness_m = max(wall.thickness_m, 0.2)

    @staticmethod
    def _guess_room_name(index: int) -> str:
        presets = {
            1: "Living Room",
            2: "Bedroom 1",
            3: "Bedroom 2",
            4: "Kitchen",
            5: "Bathroom",
            6: "Foyer",
            7: "Laundry",
        }
        return presets.get(index, f"Room {index}")

    def _confidence_score(
        self, walls: list[Wall2D], rooms: list[Room2D], openings: list[Opening2D]
    ) -> float:
        wall_score = min(len(walls) / 24, 1.0) * 0.4
        room_score = min(len(rooms) / 8, 1.0) * 0.4
        opening_score = min(len(openings) / 10, 1.0) * 0.2
        return round(wall_score + room_score + opening_score, 3)

    def _nearest_wall(
        self, x: float, y: float, walls: list[Wall2D]
    ) -> Optional[Wall2D]:
        nearest: Optional[Wall2D] = None
        best = 1e9
        for wall in walls:
            mx, my = midpoint(wall.start.x, wall.start.y, wall.end.x, wall.end.y)
            d = ((mx - x) ** 2 + (my - y) ** 2) ** 0.5
            if d < best:
                best = d
                nearest = wall
        if best > 2.2:
            return None
        return nearest

    def _to_meter_point(self, x_px: float, y_px: float) -> tuple[float, float]:
        return round(x_px * self.config.default_scale_m_per_px, 3), round(
            y_px * self.config.default_scale_m_per_px, 3
        )

    def _px_to_point(self, x_px: float, y_px: float) -> Point2D:
        x_m, y_m = self._to_meter_point(x_px, y_px)
        return Point2D(x=x_m, y=y_m)

    def _to_meters(
        self, x1: float, y1: float, x2: float, y2: float
    ) -> tuple[float, float, float, float]:
        x1m, y1m = self._to_meter_point(x1, y1)
        x2m, y2m = self._to_meter_point(x2, y2)
        return x1m, y1m, x2m, y2m
