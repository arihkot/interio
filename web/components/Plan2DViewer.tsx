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
    <section className="panel viewer-panel">
      <div className="panel-header">
        <h3>Detected 2D Plan</h3>
        <p>Walls, openings, rooms, OCR labels, and load-bearing classification.</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Detected floor plan">
        <rect x="0" y="0" width={width} height={height} fill="#F6FAFB" />

        {plan.rooms.map((room) => (
          <g key={room.id}>
            <polygon
              points={room.polygon.map((point) => `${tx(point.x)},${ty(point.y)}`).join(" ")}
              fill={selectedElementId === room.id ? "#C7D9E2" : COLOR_ROOM}
              stroke="#9FB3BE"
              strokeWidth={1}
              onClick={() => onSelectElement(room.id)}
            />
            <text
              x={tx(room.centroid.x)}
              y={ty(room.centroid.y)}
              fontSize={10}
              textAnchor="middle"
              fill="#1F3540"
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
              stroke={selected ? "#102129" : wall.is_load_bearing ? COLOR_LOAD_BEARING : COLOR_PARTITION}
              strokeWidth={selected ? 4 : wall.is_load_bearing ? 3 : 2}
              strokeLinecap="round"
              onClick={() => onSelectElement(wall.id)}
            />
          );
        })}

        {plan.openings.map((opening) => (
          <circle
            key={opening.id}
            cx={tx(opening.position.x)}
            cy={ty(opening.position.y)}
            r={opening.opening_type === "door" ? 4.5 : 3.5}
            fill={opening.opening_type === "door" ? "#B5643A" : "#4A7CA2"}
            stroke="#FFFFFF"
            strokeWidth={1.2}
            onClick={() => onSelectElement(opening.id)}
          />
        ))}
      </svg>
      <div className="viewer-footnote" style={{ display: "flex", gap: "1rem", marginTop: "1rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
        <span>Parsing confidence: {(plan.parsing_confidence * 100).toFixed(0)}%</span>
        <span>Walls: {plan.walls.length}</span>
        <span>Rooms: {plan.rooms.length}</span>
        <span>Openings: {plan.openings.length}</span>
      </div>
    </section>
  );
}
