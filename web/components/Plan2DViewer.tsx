"use client";

import { FloorPlan2D } from "@/lib/types";

type Props = {
  plan: FloorPlan2D;
  selectedElementId: string | null;
  onSelectElement: (elementId: string) => void;
};

const COLOR_LOAD_BEARING = "#9B3E2E";
const COLOR_PARTITION = "#59767F";
const COLOR_ROOM = "#DDE6EB";

export function Plan2DViewer({ plan, selectedElementId, onSelectElement }: Props) {
  const width = 640;
  const height = 440;
  const padding = 24;

  const allX = [
    ...plan.walls.flatMap((wall) => [wall.start.x, wall.end.x]),
    ...plan.rooms.flatMap((room) => room.polygon.map((point) => point.x))
  ];
  const allY = [
    ...plan.walls.flatMap((wall) => [wall.start.y, wall.end.y]),
    ...plan.rooms.flatMap((room) => room.polygon.map((point) => point.y))
  ];

  const minX = Math.min(...allX, 0);
  const maxX = Math.max(...allX, 10);
  const minY = Math.min(...allY, 0);
  const maxY = Math.max(...allY, 10);

  const scaleX = (width - padding * 2) / Math.max(0.001, maxX - minX);
  const scaleY = (height - padding * 2) / Math.max(0.001, maxY - minY);
  const scale = Math.min(scaleX, scaleY);

  const tx = (x: number) => (x - minX) * scale + padding;
  const ty = (y: number) => (y - minY) * scale + padding;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <svg 
        style={{ width: "100%", height: "100%", cursor: "crosshair" }} 
        viewBox={`0 0 ${width} ${height}`} 
        preserveAspectRatio="xMidYMid meet" 
        role="img" 
        aria-label="Detected floor plan"
      >
        {/* Draw subtle grid background in the SVG bounding box if desired, or let it transparent. We'll leave it transparent to blend with the container */}
        
        <g transform={`translate(${width/2 - (maxX-minX)*scale/2 - padding}, ${height/2 - (maxY-minY)*scale/2 - padding})`}>
          {plan.rooms.map((room) => (
            <g key={room.id}>
              <polygon
                points={room.polygon.map((point) => `${tx(point.x)},${ty(point.y)}`).join(" ")}
                fill={selectedElementId === room.id ? "#fbbf24" : COLOR_ROOM}
                stroke={selectedElementId === room.id ? "#d97706" : "#9FB3BE"}
                strokeWidth={selectedElementId === room.id ? 2 : 1}
                onClick={() => onSelectElement(room.id)}
                style={{ cursor: "pointer", transition: "all 0.2s" }}
              />
              <text
                x={tx(room.centroid.x)}
                y={ty(room.centroid.y)}
                fontSize={10}
                textAnchor="middle"
                fill="#1F3540"
                style={{ pointerEvents: "none" }}
              >
                {room.name}
              </text>
            </g>
          ))}

          {plan.walls.map((wall) => {
            const selected = selectedElementId === wall.id;
            return (
              <line
                key={wall.id}
                x1={tx(wall.start.x)}
                y1={ty(wall.start.y)}
                x2={tx(wall.end.x)}
                y2={ty(wall.end.y)}
                stroke={selected ? "#fbbf24" : wall.is_load_bearing ? COLOR_LOAD_BEARING : COLOR_PARTITION}
                strokeWidth={selected ? 4 : wall.is_load_bearing ? 3 : 2}
                strokeLinecap="round"
                onClick={() => onSelectElement(wall.id)}
                style={{ cursor: "pointer", transition: "all 0.2s" }}
              />
            );
          })}

          {plan.openings.map((opening) => {
            const selected = selectedElementId === opening.id;
            return (
              <circle
                key={opening.id}
                cx={tx(opening.position.x)}
                cy={ty(opening.position.y)}
                r={opening.opening_type === "door" ? 4.5 : 3.5}
                fill={selected ? "#fbbf24" : opening.opening_type === "door" ? "#B5643A" : "#4A7CA2"}
                stroke={selected ? "#d97706" : "#FFFFFF"}
                strokeWidth={selected ? 1.5 : 1.2}
                onClick={() => onSelectElement(opening.id)}
                style={{ cursor: "pointer", transition: "all 0.2s" }}
              />
            );
          })}
        </g>
      </svg>
      
      <div 
        style={{ 
          position: "absolute", 
          bottom: "2.5rem", 
          right: "2.5rem", 
          pointerEvents: "auto", 
          display: "flex", 
          gap: "1.25rem", 
          background: "var(--surface)", 
          padding: "1rem 1.5rem", 
          borderRadius: "var(--radius)", 
          boxShadow: "var(--shadow-sm)", 
          color: "var(--text-muted)", 
          fontSize: "0.9rem", 
          border: "1px solid var(--border)",
          zIndex: 10
        }}
      >
        <span><strong style={{ color: "var(--text)", fontWeight: 600 }}>Parsing confidence:</strong> {(plan.parsing_confidence * 100).toFixed(0)}%</span>
        <span><strong style={{ color: "var(--text)", fontWeight: 600 }}>Walls:</strong> {plan.walls.length}</span>
        <span><strong style={{ color: "var(--text)", fontWeight: 600 }}>Rooms:</strong> {plan.rooms.length}</span>
        <span><strong style={{ color: "var(--text)", fontWeight: 600 }}>Openings:</strong> {plan.openings.length}</span>
      </div>
    </div>
  );
}
