export type Point2D = { x: number; y: number };

export type Point3D = { x: number; y: number; z: number };

export type Wall2D = {
  id: string;
  start: Point2D;
  end: Point2D;
  thickness_m: number;
  length_m: number;
  is_load_bearing: boolean;
  room_ids: string[];
  confidence: number;
};

export type Opening2D = {
  id: string;
  wall_id: string;
  opening_type: "door" | "window";
  position: Point2D;
  width_m: number;
  height_m: number;
  confidence: number;
};

export type Room2D = {
  id: string;
  name: string;
  name_source: "ocr" | "heuristic";
  polygon: Point2D[];
  area_m2: number;
  centroid: Point2D;
  confidence: number;
};

export type FloorPlan2D = {
  image_width_px: number;
  image_height_px: number;
  scale_m_per_px: number;
  boundary: Point2D[];
  walls: Wall2D[];
  rooms: Room2D[];
  openings: Opening2D[];
  labels_detected: string[];
  parsing_confidence: number;
  parsing_notes: string[];
};

export type MaterialOption = {
  material_key: string;
  material_name: string;
  quantity: number;
  quantity_unit: string;
  unit_cost_inr: number;
  total_cost_inr: number;
  annual_maintenance_inr: number;
  average_life_years: number;
  strength_score: number;
  durability_score: number;
  weather_fit_score: number;
  availability_score: number;
  tradeoff_score: number;
  rationale: string;
  color: string;
  price_source_type: "observed" | "proxy" | "imputed";
};

export type ElementRecommendation = {
  element_id: string;
  element_name: string;
  element_type: "load_bearing_wall" | "partition_wall" | "slab" | "column";
  quantity: number;
  unit: string;
  options: MaterialOption[];
  selected_material_key: string;
  alternative_material_key: string | null;
};

export type Wall3D = {
  id: string;
  source_wall_id: string;
  start: Point3D;
  end: Point3D;
  height_m: number;
  thickness_m: number;
  material_key: string;
  color: string;
};

export type FloorSlab3D = {
  id: string;
  boundary: Point3D[];
  thickness_m: number;
  material_key: string;
  color: string;
};

export type InteriorAsset3D = {
  id: string;
  room_id: string;
  room_name: string;
  asset_type: string;
  asset_url?: string | null;
  position: Point3D;
  size: Point3D;
  rotation_deg: number;
};

export type Model3D = {
  id: string;
  detail_level: "simple" | "interior";
  recommendation_variant: "primary" | "alternative";
  walls: Wall3D[];
  slab: FloorSlab3D;
  interiors: InteriorAsset3D[];
  labels: Array<{
    id: string;
    room_id: string;
    text: string;
    position: Point3D;
    confidence: number;
    source: "ocr" | "heuristic";
  }>;
};

export type CostSummary = {
  primary_total_cost_inr: number;
  alternative_total_cost_inr: number;
  annual_maintenance_inr: number;
  average_life_years: number;
  lifecycle_cost_30y_inr: number;
  element_count: number;
};

export type WeatherContext = {
  latitude: number;
  longitude: number;
  city?: string | null;
  state?: string | null;
  country: string;
  climate_zone: string;
  temperature_c: number;
  humidity_pct: number;
  precipitation_mm: number;
  source: string;
};

export type LocationContext = {
  latitude: number;
  longitude: number;
  city?: string | null;
  state?: string | null;
  preferred_radius_km: number;
};

export type StructuralAnalysis = {
  nodes: Array<{ id: string; x: number; y: number }>;
  edges: Array<{
    id: string;
    from_node_id: string;
    to_node_id: string;
    wall_id: string;
    length_m: number;
    is_load_bearing: boolean;
  }>;
  room_spans: Array<{ room_id: string; room_name: string; major_span_m: number; minor_span_m: number }>;
  concerns: string[];
};

export type ExplainabilityReport = {
  executive_summary: string;
  per_element_explanations: Record<string, string>;
  structural_concerns: string[];
  tradeoff_notes: string[];
};

export type PricePoint = {
  material_key: string;
  unit_cost_inr: number;
  unit: string;
  source: string;
  source_type: "observed" | "proxy" | "imputed";
  confidence: number;
  timestamp: string;
};

export type ProcessedProject = {
  project_id: string;
  created_at: string;
  location: LocationContext;
  weather: WeatherContext;
  plan_2d: FloorPlan2D;
  structural_analysis: StructuralAnalysis;
  model_3d_primary_simple: Model3D;
  model_3d_primary_interior: Model3D;
  model_3d_alternative_simple: Model3D;
  model_3d_alternative_interior: Model3D;
  recommendations: ElementRecommendation[];
  pricing_snapshot: PricePoint[];
  cost_summary: CostSummary;
  explainability: ExplainabilityReport;
  selection_source: string;
};

export type ProcessResponse = { project: ProcessedProject };

export type PricingDashboardResponse = {
  location: LocationContext;
  weather: WeatherContext;
  prices: PricePoint[];
  notes: string[];
};
