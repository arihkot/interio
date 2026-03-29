from __future__ import annotations

from dataclasses import dataclass

import networkx as nx
from shapely.geometry import Polygon

from app.models import (
    FloorPlan2D,
    GraphEdge,
    GraphNode,
    Point2D,
    SpanInfo,
    StructuralAnalysis,
)


@dataclass
class GeometryService:
    node_grid_m: float = 0.05

    def build_structural_graph(self, plan: FloorPlan2D) -> StructuralAnalysis:
        nodes_map: dict[tuple[float, float], str] = {}
        nodes: list[GraphNode] = []
        edges: list[GraphEdge] = []
        graph = nx.Graph()

        def get_node_id(pt: Point2D) -> str:
            key = (
                round(pt.x / self.node_grid_m) * self.node_grid_m,
                round(pt.y / self.node_grid_m) * self.node_grid_m,
            )
            if key not in nodes_map:
                node_id = f"N{len(nodes_map) + 1}"
                nodes_map[key] = node_id
                nodes.append(
                    GraphNode(id=node_id, x=round(key[0], 3), y=round(key[1], 3))
                )
                graph.add_node(node_id, pos=key)
            return nodes_map[key]

        for wall in plan.walls:
            from_id = get_node_id(wall.start)
            to_id = get_node_id(wall.end)
            edge_id = f"E{len(edges) + 1}"
            edges.append(
                GraphEdge(
                    id=edge_id,
                    from_node_id=from_id,
                    to_node_id=to_id,
                    wall_id=wall.id,
                    length_m=wall.length_m,
                    is_load_bearing=wall.is_load_bearing,
                )
            )
            graph.add_edge(
                from_id,
                to_id,
                wall_id=wall.id,
                length=wall.length_m,
                load_bearing=wall.is_load_bearing,
            )

        spans = self._estimate_spans(plan)
        concerns = self._detect_concerns(graph, spans)
        return StructuralAnalysis(
            nodes=nodes, edges=edges, room_spans=spans, concerns=concerns
        )

    @staticmethod
    def _estimate_spans(plan: FloorPlan2D) -> list[SpanInfo]:
        spans: list[SpanInfo] = []
        for room in plan.rooms:
            poly = Polygon([(p.x, p.y) for p in room.polygon])
            if poly.area <= 0:
                continue
            minx, miny, maxx, maxy = poly.bounds
            spans.append(
                SpanInfo(
                    room_id=room.id,
                    room_name=room.name,
                    major_span_m=round(max(maxx - minx, maxy - miny), 3),
                    minor_span_m=round(min(maxx - minx, maxy - miny), 3),
                )
            )
        return spans

    @staticmethod
    def _detect_concerns(graph: nx.Graph, spans: list[SpanInfo]) -> list[str]:
        concerns: list[str] = []
        if graph.number_of_nodes() == 0:
            concerns.append("No structural graph detected from the input floor plan.")
            return concerns
        articulation = list(nx.articulation_points(graph))
        if articulation:
            concerns.append(
                f"Detected {len(articulation)} critical junction points; verify load path continuity around these nodes."
            )
        large_spans = [span for span in spans if span.major_span_m > 5.0]
        for span in large_spans:
            concerns.append(
                f"Room '{span.room_name}' has a major unsupported span of {span.major_span_m:.2f} m; consider RCC beam or steel support."
            )
        return concerns
