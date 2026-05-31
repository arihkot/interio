import { ProcessedProject, PricingDashboardResponse } from "./types";

export const MOCK_PROJECT: ProcessedProject = {
  project_id: "pj-vercel-demo",
  created_at: new Date().toISOString(),
  location: {
    latitude: 19.076,
    longitude: 72.8777,
    city: "Mumbai",
    state: "Maharashtra",
    preferred_radius_km: 150,
  },
  weather: {
    latitude: 19.076,
    longitude: 72.8777,
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    climate_zone: "warm_humid",
    temperature_c: 31.0,
    humidity_pct: 76.0,
    precipitation_mm: 8.0,
    source: "imputed",
  },
  plan_2d: {
    image_width_px: 800,
    image_height_px: 600,
    scale_m_per_px: 0.02,
    boundary: [
      { x: 0, y: 0 },
      { x: 16, y: 0 },
      { x: 16, y: 12 },
      { x: 0, y: 12 },
    ],
    walls: [
      {
        id: "w1",
        start: { x: 2, y: 2 },
        end: { x: 14, y: 2 },
        thickness_m: 0.2,
        length_m: 12,
        is_load_bearing: true,
        room_ids: ["r1"],
        confidence: 0.95,
      },
      {
        id: "w2",
        start: { x: 14, y: 2 },
        end: { x: 14, y: 10 },
        thickness_m: 0.2,
        length_m: 8,
        is_load_bearing: true,
        room_ids: ["r1"],
        confidence: 0.95,
      },
      {
        id: "w3",
        start: { x: 14, y: 10 },
        end: { x: 2, y: 10 },
        thickness_m: 0.2,
        length_m: 12,
        is_load_bearing: true,
        room_ids: ["r1"],
        confidence: 0.95,
      },
      {
        id: "w4",
        start: { x: 2, y: 10 },
        end: { x: 2, y: 2 },
        thickness_m: 0.2,
        length_m: 8,
        is_load_bearing: true,
        room_ids: ["r1"],
        confidence: 0.95,
      },
    ],
    rooms: [
      {
        id: "r1",
        name: "Main Room",
        polygon: [
          { x: 2, y: 2 },
          { x: 14, y: 2 },
          { x: 14, y: 10 },
          { x: 2, y: 10 },
        ],
        area_m2: 96,
        centroid: { x: 8, y: 6 },
        confidence: 0.9,
      },
    ],
    openings: [],
    labels_detected: ["Living Room"],
    parsing_confidence: 0.92,
    parsing_notes: ["Mocked data for Vercel deployment."],
  },
  structural_analysis: {
    nodes: [],
    edges: [],
    room_spans: [],
    concerns: ["None (Mock Data)"],
  },
  model_3d_primary_simple: {
    id: "m1",
    detail_level: "simple",
    recommendation_variant: "primary",
    walls: [
      { id: "mw1", source_wall_id: "w1", start: { x: 2, y: 0, z: 2 }, end: { x: 14, y: 0, z: 2 }, height_m: 3, thickness_m: 0.2, material_key: "rcc", color: "#a3a3a3" },
      { id: "mw2", source_wall_id: "w2", start: { x: 14, y: 0, z: 2 }, end: { x: 14, y: 0, z: 10 }, height_m: 3, thickness_m: 0.2, material_key: "rcc", color: "#a3a3a3" },
      { id: "mw3", source_wall_id: "w3", start: { x: 14, y: 0, z: 10 }, end: { x: 2, y: 0, z: 10 }, height_m: 3, thickness_m: 0.2, material_key: "rcc", color: "#a3a3a3" },
      { id: "mw4", source_wall_id: "w4", start: { x: 2, y: 0, z: 10 }, end: { x: 2, y: 0, z: 2 }, height_m: 3, thickness_m: 0.2, material_key: "rcc", color: "#a3a3a3" },
    ],
    slab: { id: "ms1", boundary: [{ x: 2, y: 0, z: 2 }, { x: 14, y: 0, z: 2 }, { x: 14, y: 0, z: 10 }, { x: 2, y: 0, z: 10 }], thickness_m: 0.15, material_key: "concrete", color: "#d4d4d8" },
    interiors: [],
  },
  model_3d_primary_interior: {
    id: "m2",
    detail_level: "interior",
    recommendation_variant: "primary",
    walls: [
      { id: "mw1", source_wall_id: "w1", start: { x: 2, y: 0, z: 2 }, end: { x: 14, y: 0, z: 2 }, height_m: 3, thickness_m: 0.2, material_key: "rcc", color: "#a3a3a3" },
      { id: "mw2", source_wall_id: "w2", start: { x: 14, y: 0, z: 2 }, end: { x: 14, y: 0, z: 10 }, height_m: 3, thickness_m: 0.2, material_key: "rcc", color: "#a3a3a3" },
      { id: "mw3", source_wall_id: "w3", start: { x: 14, y: 0, z: 10 }, end: { x: 2, y: 0, z: 10 }, height_m: 3, thickness_m: 0.2, material_key: "rcc", color: "#a3a3a3" },
      { id: "mw4", source_wall_id: "w4", start: { x: 2, y: 0, z: 10 }, end: { x: 2, y: 0, z: 2 }, height_m: 3, thickness_m: 0.2, material_key: "rcc", color: "#a3a3a3" },
    ],
    slab: { id: "ms1", boundary: [{ x: 2, y: 0, z: 2 }, { x: 14, y: 0, z: 2 }, { x: 14, y: 0, z: 10 }, { x: 2, y: 0, z: 10 }], thickness_m: 0.15, material_key: "concrete", color: "#d4d4d8" },
    interiors: [
      { id: "i1", room_id: "r1", room_name: "Main Room", asset_type: "sofa", position: { x: 8, y: 0, z: 8 }, size: { x: 2, y: 0.8, z: 0.8 }, rotation_deg: 0 }
    ],
  },
  model_3d_alternative_simple: {
    id: "m3",
    detail_level: "simple",
    recommendation_variant: "alternative",
    walls: [
      { id: "mw1", source_wall_id: "w1", start: { x: 2, y: 0, z: 2 }, end: { x: 14, y: 0, z: 2 }, height_m: 3, thickness_m: 0.2, material_key: "flyash", color: "#78716c" },
      { id: "mw2", source_wall_id: "w2", start: { x: 14, y: 0, z: 2 }, end: { x: 14, y: 0, z: 10 }, height_m: 3, thickness_m: 0.2, material_key: "flyash", color: "#78716c" },
      { id: "mw3", source_wall_id: "w3", start: { x: 14, y: 0, z: 10 }, end: { x: 2, y: 0, z: 10 }, height_m: 3, thickness_m: 0.2, material_key: "flyash", color: "#78716c" },
      { id: "mw4", source_wall_id: "w4", start: { x: 2, y: 0, z: 10 }, end: { x: 2, y: 0, z: 2 }, height_m: 3, thickness_m: 0.2, material_key: "flyash", color: "#78716c" },
    ],
    slab: { id: "ms1", boundary: [{ x: 2, y: 0, z: 2 }, { x: 14, y: 0, z: 2 }, { x: 14, y: 0, z: 10 }, { x: 2, y: 0, z: 10 }], thickness_m: 0.15, material_key: "concrete", color: "#d4d4d8" },
    interiors: [],
  },
  model_3d_alternative_interior: {
    id: "m4",
    detail_level: "interior",
    recommendation_variant: "alternative",
    walls: [
      { id: "mw1", source_wall_id: "w1", start: { x: 2, y: 0, z: 2 }, end: { x: 14, y: 0, z: 2 }, height_m: 3, thickness_m: 0.2, material_key: "flyash", color: "#78716c" },
      { id: "mw2", source_wall_id: "w2", start: { x: 14, y: 0, z: 2 }, end: { x: 14, y: 0, z: 10 }, height_m: 3, thickness_m: 0.2, material_key: "flyash", color: "#78716c" },
      { id: "mw3", source_wall_id: "w3", start: { x: 14, y: 0, z: 10 }, end: { x: 2, y: 0, z: 10 }, height_m: 3, thickness_m: 0.2, material_key: "flyash", color: "#78716c" },
      { id: "mw4", source_wall_id: "w4", start: { x: 2, y: 0, z: 10 }, end: { x: 2, y: 0, z: 2 }, height_m: 3, thickness_m: 0.2, material_key: "flyash", color: "#78716c" },
    ],
    slab: { id: "ms1", boundary: [{ x: 2, y: 0, z: 2 }, { x: 14, y: 0, z: 2 }, { x: 14, y: 0, z: 10 }, { x: 2, y: 0, z: 10 }], thickness_m: 0.15, material_key: "concrete", color: "#d4d4d8" },
    interiors: [
      { id: "i1", room_id: "r1", room_name: "Main Room", asset_type: "sofa", position: { x: 8, y: 0, z: 8 }, size: { x: 2, y: 0.8, z: 0.8 }, rotation_deg: 0 }
    ],
  },
  recommendations: [
    {
      element_id: "w1",
      element_name: "Outer Walls",
      element_type: "load_bearing_wall",
      quantity: 40,
      unit: "m2",
      options: [
        {
          material_key: "red_brick",
          material_name: "Red Clay Brick",
          quantity: 40,
          quantity_unit: "m2",
          unit_cost_inr: 800,
          total_cost_inr: 32000,
          annual_maintenance_inr: 500,
          average_life_years: 50,
          strength_score: 8,
          durability_score: 7,
          weather_fit_score: 6,
          availability_score: 9,
          tradeoff_score: 7.5,
          rationale: "Standard choice for mock data.",
          color: "#b91c1c",
          price_source_type: "proxy"
        },
        {
          material_key: "flyash_brick",
          material_name: "Fly Ash Brick",
          quantity: 40,
          quantity_unit: "m2",
          unit_cost_inr: 700,
          total_cost_inr: 28000,
          annual_maintenance_inr: 400,
          average_life_years: 45,
          strength_score: 7,
          durability_score: 8,
          weather_fit_score: 8,
          availability_score: 8,
          tradeoff_score: 7.8,
          rationale: "Alternative choice for mock data.",
          color: "#78716c",
          price_source_type: "proxy"
        }
      ],
      selected_material_key: "red_brick",
      alternative_material_key: "flyash_brick"
    }
  ],
  pricing_snapshot: [
    { material_key: "red_brick", unit_cost_inr: 800, unit: "m2", source: "Mock", source_type: "proxy", confidence: 0.9, timestamp: new Date().toISOString() },
    { material_key: "flyash_brick", unit_cost_inr: 700, unit: "m2", source: "Mock", source_type: "proxy", confidence: 0.85, timestamp: new Date().toISOString() }
  ],
  cost_summary: {
    primary_total_cost_inr: 32000,
    alternative_total_cost_inr: 28000,
    annual_maintenance_inr: 500,
    average_life_years: 48,
    lifecycle_cost_30y_inr: 47000,
    element_count: 4
  },
  explainability: {
    executive_summary: "This is a Vercel-compatible mock generated project.",
    per_element_explanations: { "w1": "Mocked explanation for wall 1." },
    structural_concerns: ["None"],
    tradeoff_notes: ["Mock tradeoff notes."]
  },
  selection_source: "Mock LLM Orchestrator"
};

export const MOCK_PRICING: PricingDashboardResponse = {
  location: MOCK_PROJECT.location,
  weather: MOCK_PROJECT.weather,
  prices: MOCK_PROJECT.pricing_snapshot,
  notes: ["This is mock pricing data due to Vercel deployment constraints."]
};
