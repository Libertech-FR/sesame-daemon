from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from bullmq import Job

    from sesame_daemon.runner import BackendRunnerService


class DumpPackageConfigExecutor:
    def __init__(self, service: BackendRunnerService):
        self.service = service

    async def execute(self, job: Job) -> dict[str, Any]:
        package_info = self.service.package_info
        summary = {key: package_info[key] for key in ("name", "description", "version") if key in package_info}
        self.service.logger.debug("Dump package config: " + json.dumps(summary, separators=(",", ":")))

        return {"status": 0, "jobId": job.id, "data": [package_info]}
