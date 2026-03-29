from __future__ import annotations

import json

import requests

from app.core.config import Settings
from app.models import ChatMessageResponse, ProcessedProject


class ChatService:
    def __init__(self, settings: Settings):
        self.settings = settings

    def reply(self, project: ProcessedProject, message: str) -> ChatMessageResponse:
        if self.settings.gemini_api_key:
            try:
                return self._reply_with_llm(project, message)
            except Exception:
                pass
        return self._reply_fallback(project, message)

    def _reply_with_llm(
        self, project: ProcessedProject, message: str
    ) -> ChatMessageResponse:
        endpoint = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.settings.gemini_model}:generateContent?key={self.settings.gemini_api_key}"
        )
        context = {
            "location": project.location.model_dump(mode="json"),
            "weather": project.weather.model_dump(mode="json"),
            "cost_summary": project.cost_summary.model_dump(mode="json"),
            "concerns": project.explainability.structural_concerns,
            "recommendations": [
                {
                    "element_id": rec.element_id,
                    "element_name": rec.element_name,
                    "type": rec.element_type,
                    "selected": rec.selected_material_key,
                    "top_options": [
                        opt.model_dump(mode="json") for opt in rec.options[:2]
                    ],
                }
                for rec in project.recommendations
            ],
        }
        prompt = (
            "You are Interio Assistant. Answer clearly with Indian construction context and INR. "
            "If user asks recommendation reasons, cite scores and climate. Keep response under 120 words unless asked for detail.\n"
            f"Project context: {json.dumps(context)}\n"
            f"User message: {message}"
        )
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.3},
        }
        response = requests.post(endpoint, json=payload, timeout=12)
        response.raise_for_status()
        data = response.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return ChatMessageResponse(
            response=text,
            sources=["project-context", "gemini-3-flash"],
        )

    @staticmethod
    def _reply_fallback(project: ProcessedProject, message: str) -> ChatMessageResponse:
        msg = message.lower()
        if "cost" in msg:
            return ChatMessageResponse(
                response=(
                    f"Primary estimate is INR {project.cost_summary.primary_total_cost_inr:,.0f} with annual "
                    f"maintenance INR {project.cost_summary.annual_maintenance_inr:,.0f}. "
                    f"30-year lifecycle estimate is INR {project.cost_summary.lifecycle_cost_30y_inr:,.0f}."
                ),
                sources=["cost-summary"],
            )
        if "weather" in msg or "location" in msg:
            return ChatMessageResponse(
                response=(
                    f"Current context is {project.weather.city or 'selected location'} in {project.weather.climate_zone} climate, "
                    f"temperature {project.weather.temperature_c:.1f} C and humidity {project.weather.humidity_pct:.0f}%."
                ),
                sources=["weather-context"],
            )
        return ChatMessageResponse(
            response=(
                "I can explain material choices, structural concerns, costs, lifecycle totals, and compare primary vs alternative models. "
                "Ask for a specific wall/room or request full cost breakdown."
            ),
            sources=["project-context"],
        )
