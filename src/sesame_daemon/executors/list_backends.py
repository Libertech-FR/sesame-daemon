from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from bullmq import Job

    from sesame_daemon.runner import BackendRunnerService


class ListBackendsExecutor:
    def __init__(self, service: BackendRunnerService):
        self.service = service

    async def execute(self, job: Job) -> dict[str, Any]:
        return {
            "status": 0,
            "jobId": job.id,
            "data": self.service.backends_config.backends_config_data,
        }
