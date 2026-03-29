from __future__ import annotations

from math import atan2, cos, degrees, hypot, sin


def line_length(x1: float, y1: float, x2: float, y2: float) -> float:
    return hypot(x2 - x1, y2 - y1)


def midpoint(x1: float, y1: float, x2: float, y2: float) -> tuple[float, float]:
    return (x1 + x2) * 0.5, (y1 + y2) * 0.5


def segment_angle_deg(x1: float, y1: float, x2: float, y2: float) -> float:
    return abs(degrees(atan2(y2 - y1, x2 - x1))) % 180


def orthogonalize_segment(
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    angle_tolerance_deg: float = 12.0,
) -> tuple[float, float, float, float]:
    angle = segment_angle_deg(x1, y1, x2, y2)
    if angle <= angle_tolerance_deg or angle >= 180 - angle_tolerance_deg:
        avg_y = (y1 + y2) * 0.5
        return x1, avg_y, x2, avg_y
    if abs(angle - 90) <= angle_tolerance_deg:
        avg_x = (x1 + x2) * 0.5
        return avg_x, y1, avg_x, y2
    return x1, y1, x2, y2


def quantize_point(x: float, y: float, grid: float = 0.05) -> tuple[float, float]:
    return round(x / grid) * grid, round(y / grid) * grid


def rotate_2d(x: float, y: float, angle_deg: float) -> tuple[float, float]:
    theta = angle_deg * 3.141592653589793 / 180.0
    return x * cos(theta) - y * sin(theta), x * sin(theta) + y * cos(theta)
