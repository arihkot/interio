from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.core.config import get_settings
from app.models import (
    ChatMessageRequest,
    ChatMessageResponse,
    LocationContext,
    ManualProcessRequest,
    PricingDashboardResponse,
    ProcessResponse,
    ProcessedProject,
)
from app.services.chat_service import ChatService
from app.services.explainability_service import ExplainabilityService
from app.services.geometry_service import GeometryService
from app.services.material_service import MaterialService
from app.services.model_service import ModelService
from app.services.plan_parser import PlanParser
from app.services.pricing_service import PricingService
from app.services.project_store import ProjectStore
from app.services.report_service import ReportService
from app.services.weather_service import WeatherService

settings = get_settings()
material_service = MaterialService(settings.material_db_path)
plan_parser = PlanParser()
geometry_service = GeometryService()
weather_service = WeatherService(settings)
model_service = ModelService(settings.generated_dir)
explainability_service = ExplainabilityService(settings)
chat_service = ChatService(settings)
pricing_service = PricingService(settings, material_service)
report_service = ReportService(settings.generated_dir)
project_store = ProjectStore(settings.generated_dir)

app = FastAPI(title="Interio Engine", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}


@app.post("/api/process", response_model=ProcessResponse)
async def process_floorplan(
    file: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    city: Optional[str] = Form(default=None),
    state: Optional[str] = Form(default=None),
) -> ProcessResponse:
    suffix = Path(file.filename or "plan.png").suffix.lower()
    if suffix not in {".png", ".jpg", ".jpeg", ".webp"}:
        raise HTTPException(status_code=400, detail="Only image uploads are supported.")

    project_id = f"pj-{uuid4().hex[:10]}"
    image_path = settings.generated_dir / f"{project_id}{suffix}"
    image_path.write_bytes(await file.read())

    location = LocationContext(
        latitude=latitude,
        longitude=longitude,
        city=city,
        state=state,
        preferred_radius_km=150,
    )
    weather = weather_service.fetch_weather(location)

    plan = plan_parser.parse_image(image_path)
    structural = geometry_service.build_structural_graph(plan)
    recommendations, _, summary = material_service.recommend(
        plan.walls,
        plan.rooms,
        location,
        weather,
        structural_analysis=structural,
    )
    preliminary_report = explainability_service.build_report(
        recommendations, weather, structural
    )
    recommendations, selection_source = (
        material_service.apply_llm_orchestrated_selection(
            recommendations,
            preliminary_report,
        )
    )
    summary = material_service.recompute_cost_summary(recommendations)
    primary_simple, primary_interior, alt_simple, alt_interior = (
        model_service.build_models(plan, recommendations)
    )

    model_service.export_model_json(primary_simple, "primary-simple")
    model_service.export_model_json(primary_interior, "primary-interior")
    model_service.export_model_json(alt_simple, "alternative-simple")
    model_service.export_model_json(alt_interior, "alternative-interior")
    model_service.export_model_obj(primary_simple, "primary-simple")
    model_service.export_model_obj(primary_interior, "primary-interior")
    model_service.export_model_obj(alt_simple, "alternative-simple")
    model_service.export_model_obj(alt_interior, "alternative-interior")

    prices, _ = pricing_service.get_pricing_dashboard(location, weather)
    explainability = explainability_service.build_report(
        recommendations, weather, structural
    )

    project = ProcessedProject(
        project_id=project_id,
        created_at=datetime.now(timezone.utc),
        location=location,
        weather=weather,
        plan_2d=plan,
        structural_analysis=structural,
        model_3d_primary_simple=primary_simple,
        model_3d_primary_interior=primary_interior,
        model_3d_alternative_simple=alt_simple,
        model_3d_alternative_interior=alt_interior,
        recommendations=recommendations,
        pricing_snapshot=prices,
        cost_summary=summary,
        explainability=explainability,
        selection_source=selection_source,
    )
    project_store.save(project)
    return ProcessResponse(project=project)


@app.post("/api/process/manual", response_model=ProcessResponse)
def process_manual(request: ManualProcessRequest) -> ProcessResponse:
    project_id = f"pj-{uuid4().hex[:10]}"
    weather = request.weather or weather_service.fetch_weather(request.location)
    structural = geometry_service.build_structural_graph(request.plan_2d)
    recommendations, _, summary = material_service.recommend(
        request.plan_2d.walls,
        request.plan_2d.rooms,
        request.location,
        weather,
        structural_analysis=structural,
    )
    preliminary_report = explainability_service.build_report(
        recommendations, weather, structural
    )
    recommendations, selection_source = (
        material_service.apply_llm_orchestrated_selection(
            recommendations,
            preliminary_report,
        )
    )
    summary = material_service.recompute_cost_summary(recommendations)
    primary_simple, primary_interior, alt_simple, alt_interior = (
        model_service.build_models(request.plan_2d, recommendations)
    )
    model_service.export_model_json(primary_simple, "primary-simple")
    model_service.export_model_json(primary_interior, "primary-interior")
    model_service.export_model_json(alt_simple, "alternative-simple")
    model_service.export_model_json(alt_interior, "alternative-interior")
    model_service.export_model_obj(primary_simple, "primary-simple")
    model_service.export_model_obj(primary_interior, "primary-interior")
    model_service.export_model_obj(alt_simple, "alternative-simple")
    model_service.export_model_obj(alt_interior, "alternative-interior")
    prices, _ = pricing_service.get_pricing_dashboard(request.location, weather)
    explainability = explainability_service.build_report(
        recommendations, weather, structural
    )

    project = ProcessedProject(
        project_id=project_id,
        created_at=datetime.now(timezone.utc),
        location=request.location,
        weather=weather,
        plan_2d=request.plan_2d,
        structural_analysis=structural,
        model_3d_primary_simple=primary_simple,
        model_3d_primary_interior=primary_interior,
        model_3d_alternative_simple=alt_simple,
        model_3d_alternative_interior=alt_interior,
        recommendations=recommendations,
        pricing_snapshot=prices,
        cost_summary=summary,
        explainability=explainability,
        selection_source=selection_source,
    )
    project_store.save(project)
    return ProcessResponse(project=project)


@app.get("/api/project/{project_id}", response_model=ProcessResponse)
def get_project(project_id: str) -> ProcessResponse:
    project = project_store.get(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProcessResponse(project=project)


@app.get("/api/pricing/{project_id}", response_model=PricingDashboardResponse)
def get_pricing(project_id: str) -> PricingDashboardResponse:
    project = project_store.get(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    prices, notes = pricing_service.get_pricing_dashboard(
        project.location, project.weather
    )
    return PricingDashboardResponse(
        location=project.location, weather=project.weather, prices=prices, notes=notes
    )


@app.post("/api/chat", response_model=ChatMessageResponse)
def chat(request: ChatMessageRequest) -> ChatMessageResponse:
    project = project_store.get(request.project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return chat_service.reply(project, request.message)


@app.get("/api/export/pdf/{project_id}")
def export_pdf(project_id: str) -> FileResponse:
    project = project_store.get(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    path = report_service.export_pdf(project)
    return FileResponse(path, media_type="application/pdf", filename=path.name)


@app.get("/api/export/model/{project_id}/{variant}/{detail}")
def export_model(project_id: str, variant: str, detail: str) -> FileResponse:
    project = project_store.get(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    valid_variant = variant in {"primary", "alternative"}
    valid_detail = detail in {"simple", "interior"}
    if not valid_variant or not valid_detail:
        raise HTTPException(
            status_code=400, detail="Invalid variant/detail combination"
        )

    model = project.model_3d_primary_simple
    if variant == "primary" and detail == "interior":
        model = project.model_3d_primary_interior
    elif variant == "alternative" and detail == "simple":
        model = project.model_3d_alternative_simple
    elif variant == "alternative" and detail == "interior":
        model = project.model_3d_alternative_interior

    path = model_service.export_model_json(model, f"{variant}-{detail}")
    return FileResponse(path, media_type="application/json", filename=path.name)


@app.post("/api/web3/mint/{project_id}")
def mint_project_nft(project_id: str) -> dict:
    from app.services.stellar_service import mint_stellar_nft

    project = project_store.get(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    cost = project.cost_summary
    total_cost = str(cost.primary_total_cost_inr)
    maintenance = str(cost.annual_maintenance_inr)
    model_url = (
        f"http://localhost:8000/api/export/model-obj/{project_id}/primary/simple"
    )

    return mint_stellar_nft(project_id, total_cost, maintenance, model_url)


@app.get("/api/export/model-obj/{project_id}/{variant}/{detail}")
def export_model_obj(project_id: str, variant: str, detail: str) -> FileResponse:
    project = project_store.get(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    valid_variant = variant in {"primary", "alternative"}
    valid_detail = detail in {"simple", "interior"}
    if not valid_variant or not valid_detail:
        raise HTTPException(
            status_code=400, detail="Invalid variant/detail combination"
        )

    model = project.model_3d_primary_simple
    if variant == "primary" and detail == "interior":
        model = project.model_3d_primary_interior
    elif variant == "alternative" and detail == "simple":
        model = project.model_3d_alternative_simple
    elif variant == "alternative" and detail == "interior":
        model = project.model_3d_alternative_interior

    path = model_service.export_model_obj(model, f"{variant}-{detail}")
    return FileResponse(path, media_type="text/plain", filename=path.name)
