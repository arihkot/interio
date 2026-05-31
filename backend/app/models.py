from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class Point2D(BaseModel):
    x: float
    y: float


class Point3D(BaseModel):
    x: float
    y: float
    z: float


class Wall2D(BaseModel):
    id: str
    start: Point2D
    end: Point2D
    thickness_m: float = 0.2
    length_m: float = 0.0
    is_load_bearing: bool = False
    room_ids: list[str] = Field(default_factory=list)
    confidence: float = 0.0


class Opening2D(BaseModel):
    id: str
    wall_id: str
    opening_type: Literal["door", "window"]
    position: Point2D
    width_m: float
    height_m: float
    confidence: float = 0.0


class Room2D(BaseModel):
    id: str
    name: str
    polygon: list[Point2D]
    area_m2: float
    centroid: Point2D
    confidence: float = 0.0


class FloorPlan2D(BaseModel):
    image_width_px: int
    image_height_px: int
    scale_m_per_px: float
    boundary: list[Point2D]
    walls: list[Wall2D]
    rooms: list[Room2D]
    openings: list[Opening2D]
    labels_detected: list[str] = Field(default_factory=list)
    parsing_confidence: float = 0.0
    parsing_notes: list[str] = Field(default_factory=list)


class GraphNode(BaseModel):
    id: str
    x: float
    y: float


class GraphEdge(BaseModel):
    id: str
    from_node_id: str
    to_node_id: str
    wall_id: str
    length_m: float
    is_load_bearing: bool


class SpanInfo(BaseModel):
    room_id: str
    room_name: str
    major_span_m: float
    minor_span_m: float


class StructuralAnalysis(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    room_spans: list[SpanInfo]
    concerns: list[str] = Field(default_factory=list)


class Wall3D(BaseModel):
    id: str
    source_wall_id: str
    start: Point3D
    end: Point3D
    height_m: float
    thickness_m: float
    material_key: str
    color: str


class FloorSlab3D(BaseModel):
    id: str
    boundary: list[Point3D]
    thickness_m: float
    material_key: str
    color: str


class InteriorAsset3D(BaseModel):
    id: str
    room_id: str
    room_name: str
    asset_type: str
    asset_url: Optional[str] = None
    position: Point3D
    size: Point3D
    rotation_deg: float = 0.0


class Model3D(BaseModel):
    id: str
    detail_level: Literal["simple", "interior"]
    recommendation_variant: Literal["primary", "alternative"]
    walls: list[Wall3D]
    slab: FloorSlab3D
    interiors: list[InteriorAsset3D] = Field(default_factory=list)


class MaterialSpec(BaseModel):
    key: str
    name: str
    best_use: list[str]
    base_unit_cost_inr: float
    unit: Literal["m3", "m2", "kg", "count"]
    strength_score: float
    durability_years: float
    maintenance_ratio_annual: float
    climate_fit: dict[str, float] = Field(default_factory=dict)
    availability_regions: dict[str, float] = Field(default_factory=dict)
    color: str


class PricePoint(BaseModel):
    material_key: str
    unit_cost_inr: float
    unit: str
    source: str
    source_type: Literal["observed", "proxy", "imputed"]
    confidence: float
    timestamp: datetime


class MaterialOption(BaseModel):
    material_key: str
    material_name: str
    quantity: float
    quantity_unit: str
    unit_cost_inr: float
    total_cost_inr: float
    annual_maintenance_inr: float
    average_life_years: float
    strength_score: float
    durability_score: float
    weather_fit_score: float
    availability_score: float
    tradeoff_score: float
    rationale: str
    color: str
    price_source_type: Literal["observed", "proxy", "imputed"]


class ElementRecommendation(BaseModel):
    element_id: str
    element_name: str
    element_type: Literal["load_bearing_wall", "partition_wall", "slab", "column"]
    quantity: float
    unit: str
    options: list[MaterialOption]
    selected_material_key: str
    alternative_material_key: Optional[str] = None


class CostSummary(BaseModel):
    primary_total_cost_inr: float
    alternative_total_cost_inr: float
    annual_maintenance_inr: float
    average_life_years: float
    lifecycle_cost_30y_inr: float
    element_count: int


class WeatherContext(BaseModel):
    latitude: float
    longitude: float
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    climate_zone: str = "composite"
    temperature_c: float = 30.0
    humidity_pct: float = 55.0
    precipitation_mm: float = 0.0
    source: str = "imputed"


class LocationContext(BaseModel):
    latitude: float
    longitude: float
    city: Optional[str] = None
    state: Optional[str] = None
    preferred_radius_km: int = 150


class ExplainabilityReport(BaseModel):
    executive_summary: str
    per_element_explanations: dict[str, str]
    structural_concerns: list[str]
    tradeoff_notes: list[str]


class ProcessedProject(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    project_id: str
    created_at: datetime
    location: LocationContext
    weather: WeatherContext
    plan_2d: FloorPlan2D
    structural_analysis: StructuralAnalysis
    model_3d_primary_simple: Model3D
    model_3d_primary_interior: Model3D
    model_3d_alternative_simple: Model3D
    model_3d_alternative_interior: Model3D
    recommendations: list[ElementRecommendation]
    pricing_snapshot: list[PricePoint]
    cost_summary: CostSummary
    explainability: ExplainabilityReport
    selection_source: str = "score_engine"


class ProcessResponse(BaseModel):
    project: ProcessedProject


class ManualProcessRequest(BaseModel):
    plan_2d: FloorPlan2D
    location: LocationContext
    weather: Optional[WeatherContext] = None


class ChatMessageRequest(BaseModel):
    project_id: str
    message: str
    language: str = "en-IN"


class ChatMessageResponse(BaseModel):
    response: str
    sources: list[str] = Field(default_factory=list)


class PricingDashboardResponse(BaseModel):
    location: LocationContext
    weather: WeatherContext
    prices: list[PricePoint]
    notes: list[str]
