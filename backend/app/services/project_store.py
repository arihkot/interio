from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from app.models import ProcessedProject


class ProjectStore:
    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._cache: dict[str, ProcessedProject] = {}

    def save(self, project: ProcessedProject) -> None:
        self._cache[project.project_id] = project
        path = self.output_dir / f"{project.project_id}.json"
        path.write_text(
            json.dumps(project.model_dump(mode="json"), indent=2), encoding="utf-8"
        )

    def get(self, project_id: str) -> Optional[ProcessedProject]:
        in_memory = self._cache.get(project_id)
        if in_memory is not None:
            return in_memory
        path = self.output_dir / f"{project_id}.json"
        if not path.exists():
            return None
        data = json.loads(path.read_text(encoding="utf-8"))
        project = ProcessedProject.model_validate(data)
        self._cache[project_id] = project
        return project
