import logging
from dataclasses import dataclass, field
from typing import Any

import pytest

from sesame_daemon.backend_config import BackendConfigService
from sesame_daemon.config import ExecutorConfig


@dataclass
class FakeJob:
    name: str = "IDENTITY_CREATE"
    data: Any = field(default_factory=dict)
    id: str = "job-1"
    progress: list[float] = field(default_factory=list)

    async def updateProgress(self, progress: float) -> None:  # noqa: N802 - API bullmq
        self.progress.append(progress)


class FakeService:
    def __init__(self, backends_config: BackendConfigService | None = None, package_info: dict | None = None):
        self.backends_config = backends_config
        self.package_info = package_info or {}
        self.logger = logging.getLogger("test")
        self.backend_executor_config = ExecutorConfig(shell=True)


@pytest.fixture
def fake_job():
    return FakeJob
