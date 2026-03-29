from __future__ import annotations

import json
from typing import Iterable

import requests

from app.core.config import Settings
from app.models import (
    ElementRecommendation,
    ExplainabilityReport,
    StructuralAnalysis,
    WeatherContext,
)


class ExplainabilityService:
    def __init__(self, settings: Settings):
        self.settings = settings

    def build_report(
        self,
        recommendations: list[ElementRecommendation],
        weather: WeatherContext,
        structural_analysis: StructuralAnalysis,
    ) -> ExplainabilityReport:
        fallback = self._fallback_report(recommendations, weather, structural_analysis)
        if not self.settings.gemini_api_key:
            return fallback
        try:
            generated = self._call_gemini(recommendations, weather, structural_analysis)
            return generated
        except Exception:
            return fallback

    def _call_gemini(
        self,
        recommendations: list[ElementRecommendation],
        weather: WeatherContext,
        structural_analysis: StructuralAnalysis,
    ) -> ExplainabilityReport:
        endpoint = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.settings.gemini_model}:generateContent?key={self.settings.gemini_api_key}"
        )
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": self._prompt(
                                recommendations, weather, structural_analysis
                            ),
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            },
        }
        response = requests.post(endpoint, json=payload, timeout=12)
        response.raise_for_status()
        data = response.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(text)
        return ExplainabilityReport.model_validate(parsed)

    @staticmethod
    def _top_option(rec: ElementRecommendation) -> str:
        top = rec.options[0]
        return (
            f"{rec.element_name} uses {top.material_name} (score {top.tradeoff_score:.2f}) "
            f"for quantity {top.quantity} {top.quantity_unit} at INR {top.total_cost_inr:.0f}."
        )

    def _fallback_report(
        self,
        recommendations: list[ElementRecommendation],
        weather: WeatherContext,
        structural_analysis: StructuralAnalysis,
    ) -> ExplainabilityReport:
        per_element: dict[str, str] = {}
        notes = []
        for rec in recommendations:
            top = rec.options[0]
            alt = rec.options[1] if len(rec.options) > 1 else None
            statement = (
                f"{top.material_name} is selected for {rec.element_name} because it combines "
                f"strength score {top.strength_score:.2f}, durability {top.average_life_years:.0f} years, and "
                f"weather fit {top.weather_fit_score:.2f} for {weather.climate_zone} climate."
            )
            if alt:
                statement += (
                    f" Alternative option {alt.material_name} costs INR {alt.total_cost_inr:.0f} "
                    f"with tradeoff score {alt.tradeoff_score:.2f}."
                )
            per_element[rec.element_id] = statement
            notes.append(self._top_option(rec))
        concerns = structural_analysis.concerns or [
            "No critical structural anomalies detected from current graph heuristics."
        ]
        return ExplainabilityReport(
            executive_summary=(
                "Interio recommends materials by balancing structural role, lifecycle cost, climate suitability, "
                "and local availability in India context."
            ),
            per_element_explanations=per_element,
            structural_concerns=concerns,
            tradeoff_notes=notes[:6],
        )

    def _prompt(
        self,
        recommendations: Iterable[ElementRecommendation],
        weather: WeatherContext,
        structural_analysis: StructuralAnalysis,
    ) -> str:
        compact = [
            {
                "element_id": rec.element_id,
                "element_name": rec.element_name,
                "element_type": rec.element_type,
                "options": [
                    option.model_dump(mode="json") for option in rec.options[:3]
                ],
            }
            for rec in recommendations
        ]
        return (
            "You are generating an explainability report for an Indian construction assistant. "
            "Return JSON with keys executive_summary, per_element_explanations, structural_concerns, tradeoff_notes. "
            "Cite numbers from the options and spans. Keep language non-technical but specific.\n"
            f"Weather: {weather.model_dump(mode='json')}\n"
            f"Structural: {structural_analysis.model_dump(mode='json')}\n"
            f"Recommendations: {json.dumps(compact)}"
        )
