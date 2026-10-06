import asyncio
import json
import os
from dataclasses import dataclass
from typing import Any

from sesame_daemon.config import ExecutorConfig
from sesame_daemon.logger import get_logger

logger = get_logger("executorTask")


@dataclass
class ExecutorResponse:
    # None si le processus a été tué par un signal
    status: int | None
    output: str = ""
    error: str = ""


def convert_null_to_empty_string(obj: Any) -> Any:
    if obj is None:
        return ""
    if isinstance(obj, list):
        return [convert_null_to_empty_string(item) for item in obj]
    if isinstance(obj, dict):
        return {key: convert_null_to_empty_string(value) for key, value in obj.items()}
    return obj


def serialize_job_data(data: Any) -> str:
    # Même rendu que JSON.stringify côté Node
    return json.dumps(convert_null_to_empty_string(data), separators=(",", ":"), ensure_ascii=False)


async def _spawn(command: str, shell: bool | str) -> asyncio.subprocess.Process:
    options = {
        "stdin": asyncio.subprocess.PIPE,
        "stdout": asyncio.subprocess.PIPE,
        "stderr": asyncio.subprocess.PIPE,
        "cwd": os.path.dirname(command) or None,
    }
    if shell is False:
        return await asyncio.create_subprocess_exec(command, **options)
    if isinstance(shell, str):
        return await asyncio.create_subprocess_shell(command, executable=shell, **options)
    return await asyncio.create_subprocess_shell(command, **options)


async def executor_task(command: str, data: Any, options: ExecutorConfig | None = None) -> ExecutorResponse:
    job_data_arg = serialize_job_data(data)
    shell = options.shell if options is not None else True

    logger.debug(f"Execute command {command} with data {job_data_arg}")
    try:
        process = await _spawn(command, shell)
    except Exception:
        logger.exception("Erreur lors du lancement du processus enfant")
        raise

    stdout, stderr = await process.communicate(job_data_arg.encode("utf-8"))
    output = stdout.decode("utf-8", errors="replace")
    error = stderr.decode("utf-8", errors="replace")

    if output:
        logger.info(f"stdout: {output}")
    if error:
        logger.error(f"stderr: {error}")

    status = process.returncode
    if status is not None and status < 0:
        status = None

    logger.info(f"Le processus enfant s'est terminé avec le code {status}")
    return ExecutorResponse(status=status, output=output, error=error)
