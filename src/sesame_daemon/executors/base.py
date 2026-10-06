from __future__ import annotations

from typing import TYPE_CHECKING, Any, Protocol

if TYPE_CHECKING:
    from bullmq import Job

    from sesame_daemon.runner import BackendRunnerService


class Executor(Protocol):
    service: BackendRunnerService

    async def execute(self, job: Job) -> dict[str, Any]:
        """Retourne {jobId, status, data: [...]}"""
        ...
