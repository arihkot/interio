from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.models import ProcessedProject


class ReportService:
    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def export_pdf(self, project: ProcessedProject) -> Path:
        pdf_path = self.output_dir / f"{project.project_id}-catalog.pdf"
        doc = SimpleDocTemplate(
            str(pdf_path), pagesize=A4, title="Interio Project Catalog"
        )
        styles = getSampleStyleSheet()
        h1 = ParagraphStyle(
            "H1",
            parent=styles["Heading1"],
            textColor=colors.HexColor("#0f172a"),
            fontSize=18,
        )
        h2 = ParagraphStyle(
            "H2",
            parent=styles["Heading2"],
            textColor=colors.HexColor("#0f172a"),
            fontSize=13,
        )
        body = ParagraphStyle(
            "Body",
            parent=styles["BodyText"],
            textColor=colors.HexColor("#334155"),
            fontSize=9,
            leading=12,
        )

        story = [
            Paragraph("Interio Structural Intelligence Report", h1),
            Spacer(1, 8),
            Paragraph(
                (
                    f"Project ID: {project.project_id}<br/>"
                    f"Location: {project.location.city or 'Unknown'}, {project.location.state or 'India'}<br/>"
                    f"Climate: {project.weather.climate_zone}, Temp {project.weather.temperature_c:.1f} C, "
                    f"Humidity {project.weather.humidity_pct:.0f}%"
                ),
                body,
            ),
            Spacer(1, 12),
            Paragraph("Cost Summary", h2),
            Spacer(1, 6),
        ]

        cost = project.cost_summary
        cost_table = Table(
            [
                ["Metric", "Value (INR / Years)"],
                ["Primary total cost", f"INR {cost.primary_total_cost_inr:,.0f}"],
                [
                    "Alternative total cost",
                    f"INR {cost.alternative_total_cost_inr:,.0f}",
                ],
                ["Annual maintenance", f"INR {cost.annual_maintenance_inr:,.0f}"],
                ["Lifecycle cost (30y)", f"INR {cost.lifecycle_cost_30y_inr:,.0f}"],
                ["Average service life", f"{cost.average_life_years:.1f} years"],
            ]
        )
        cost_table.setStyle(self._table_style())
        story.extend(
            [
                cost_table,
                Spacer(1, 12),
                Paragraph("Element Recommendations", h2),
                Spacer(1, 6),
            ]
        )

        rec_data = [["Element", "Type", "Primary", "Alternative", "Primary Cost"]]
        for rec in project.recommendations:
            primary = rec.options[0]
            alt = rec.options[1] if len(rec.options) > 1 else primary
            rec_data.append(
                [
                    rec.element_name,
                    rec.element_type.replace("_", " "),
                    primary.material_name,
                    alt.material_name,
                    f"INR {primary.total_cost_inr:,.0f}",
                ]
            )
        rec_table = Table(rec_data)
        rec_table.setStyle(self._table_style())
        story.extend(
            [
                rec_table,
                Spacer(1, 12),
                Paragraph("Structural Concerns", h2),
                Spacer(1, 6),
            ]
        )

        concerns = project.explainability.structural_concerns
        if concerns:
            for concern in concerns:
                story.append(Paragraph(f"- {concern}", body))
        else:
            story.append(Paragraph("- No major structural concerns detected.", body))

        story.extend(
            [Spacer(1, 12), Paragraph("Explainability Notes", h2), Spacer(1, 6)]
        )
        story.append(Paragraph(project.explainability.executive_summary, body))
        for note in project.explainability.tradeoff_notes[:8]:
            story.append(Paragraph(f"- {note}", body))

        doc.build(story)
        return pdf_path

    @staticmethod
    def _table_style() -> TableStyle:
        return TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("ALIGN", (1, 1), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [colors.white, colors.HexColor("#f8fafc")],
                ),
            ]
        )
