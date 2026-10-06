from __future__ import annotations

import asyncio
import logging
from importlib import metadata
from typing import Any

import redis.asyncio as redis
from bullmq import Job, Worker

from sesame_daemon.backend_config import BackendConfigService
from sesame_daemon.config import Config, ExecutorConfig, is_development
from sesame_daemon.enums import ActionType
from sesame_daemon.executors import CatchAllExecutor, DumpPackageConfigExecutor, Executor, ListBackendsExecutor
from sesame_daemon.logger import VERBOSE, get_logger

ONE_WEEK_SECONDS = 60 * 60 * 24 * 7
REDIS_WATCHDOG_INTERVAL_SECONDS = 5

# Valeurs embarquées si les métadonnées du paquet ne sont pas disponibles
PACKAGE_FALLBACK = {"name": "sesame-daemon", "version": "0.0.0", "description": "Sesame Daemon"}


def read_package_info() -> dict[str, Any]:
    try:
        meta = metadata.metadata("sesame-daemon")
        return {"name": meta["Name"], "version": meta["Version"], "description": meta["Summary"] or ""}
    except metadata.PackageNotFoundError:
        return dict(PACKAGE_FALLBACK)


class BackendRunnerService:
    def __init__(self, config: Config, backends_config: BackendConfigService):
        self._config = config
        self._backends_config = backends_config
        self._logger = get_logger("BackendRunnerService")
        self._package = read_package_info()
        self._worker: Worker | None = None
        self.executors: dict[str, Executor] = {
            "*": CatchAllExecutor(self),
            ActionType.LIST_BACKENDS.value: ListBackendsExecutor(self),
            ActionType.DUMP_PACKAGE_CONFIG.value: DumpPackageConfigExecutor(self),
        }

    @property
    def backends_config(self) -> BackendConfigService:
        return self._backends_config

    @property
    def logger(self) -> logging.Logger:
        return self._logger

    @property
    def package_info(self) -> dict[str, Any]:
        return self._package

    @property
    def backend_executor_config(self) -> ExecutorConfig:
        return self._config.backend_executor_config

    async def process(self, job: Job, _token: str) -> dict[str, Any]:
        job_name = job.name if job.name in self.executors else "*"
        self.logger.info(f"Job {job.name} received. Try to execute...")

        result = await self.executors[job_name].execute(job)
        result["jobName"] = job.name
        result["options"] = job.data.get("options") if isinstance(job.data, dict) else None

        self.logger.log(VERBOSE, f"Job {job.name} executed with status {result['status']}")

        if result["status"] != 0:
            self.logger.error(f"Job {job.name} failed with status {result['status']}")
            for data in result["data"]:
                error = data.get("error") if isinstance(data, dict) else None
                self.logger.error((error or {}).get("message") or "No error message")
            return result

        self.logger.info(f"Job {job.name} success with status {result['status']}")
        return result

    async def _ping(self, client: redis.Redis) -> bool:
        try:
            await client.ping()
            return True
        except Exception as exc:
            self.logger.critical(f"Redis connection closed 🟥 ({exc})")
            return False

    async def redis_watchdog(self, client: redis.Redis) -> None:
        """Équivalent de l'événement ioredis 'close' : se termine dès que Redis devient injoignable.

        En développement, le daemon continue de tourner et attend le retour de Redis.
        """
        connected = True
        while True:
            await asyncio.sleep(REDIS_WATCHDOG_INTERVAL_SECONDS)
            ok = await self._ping(client)
            if not ok and not is_development():
                return
            if ok and not connected:
                self.logger.info("Redis connected 🟢")
            connected = ok

    async def run(self, stop_event: asyncio.Event) -> int:
        """Lance le worker jusqu'à l'arrêt. Retourne le code de sortie du process."""
        client = redis.from_url(self._config.redis_uri, socket_connect_timeout=5, socket_timeout=5)
        self.logger.log(VERBOSE, "Redis connecting... 🟡")
        if not await self._ping(client) and not is_development():
            await client.aclose()
            self.logger.critical("Closing application...")
            return 1
        self.logger.info("Redis connected 🟢")
        watchdog = asyncio.create_task(self.redis_watchdog(client))

        self._worker = Worker(
            self._config.name_queue,
            self.process,
            {
                "connection": self._config.redis_uri,
                "autorun": False,
                "concurrency": 5,
                "removeOnComplete": {"age": ONE_WEEK_SECONDS, "count": 2_500},
                "removeOnFail": {"age": ONE_WEEK_SECONDS, "count": 2_500},
            },
        )
        self._worker.on("error", lambda err, *_: self.logger.error(f"Worker error: {err}"))
        self._worker.on("failed", lambda job, err: self.logger.error(f"Job {job.name} ({job.id}) failed: {err}"))

        worker_task = asyncio.create_task(self._worker.run())
        self.logger.info("Worker now active 🟢")

        stop_task = asyncio.create_task(stop_event.wait())
        done, _ = await asyncio.wait({worker_task, watchdog, stop_task}, return_when=asyncio.FIRST_COMPLETED)
        graceful = stop_task in done

        if graceful:
            self.logger.info("Shutting down worker...")
        elif worker_task in done:
            self.logger.critical("Worker closed 🟥")
            if not worker_task.cancelled() and worker_task.exception() is not None:
                self.logger.error(f"Unexpected error: {worker_task.exception()!r}")

        # Sans Redis, une fermeture propre attendrait indéfiniment : on force
        await self._worker.close(force=not graceful)
        for task in (watchdog, stop_task):
            task.cancel()
        await asyncio.gather(worker_task, watchdog, stop_task, return_exceptions=True)
        await client.aclose()

        if graceful:
            return 0
        self.logger.critical("Closing application...")
        return 1
