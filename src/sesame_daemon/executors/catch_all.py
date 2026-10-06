from __future__ import annotations

import json
import os
from typing import TYPE_CHECKING, Any

from pydantic import ValidationError

from sesame_daemon.enums import BackendCodesError, OnErrorType
from sesame_daemon.executor_task import executor_task
from sesame_daemon.models import BackendConfigV1, BackendResultInfoError, BackendResultInfoSuccess

if TYPE_CHECKING:
    from bullmq import Job

    from sesame_daemon.runner import BackendRunnerService


def extract_last_json(stdout: str | None) -> dict[str, Any]:
    """Extrait le dernier objet JSON de premier niveau présent dans la sortie d'un backend."""
    if not stdout:
        return {"status": BackendCodesError.INVALID_JSON_RESPONSE.value, "message": "No output"}

    json_candidates: list[str] = []
    brace_count = 0
    in_string = False
    escape = False
    current_json = ""

    for char in stdout:
        if escape:
            escape = False
        elif char == "\\":
            escape = True
        elif char == '"':
            in_string = not in_string
        elif not in_string and char == "{":
            brace_count += 1
            if brace_count == 1:
                current_json = char
                continue
        elif not in_string and char == "}":
            brace_count -= 1

        if brace_count > 0:
            current_json += char
        if brace_count == 0 and current_json != "":
            current_json += char
            json_candidates.append(current_json)
            current_json = ""

    if not json_candidates:
        return {"status": BackendCodesError.INVALID_JSON_RESPONSE.value, "message": "No JSON output"}

    return json.loads(json_candidates[-1])


def validation_errors_to_dict(error: ValidationError) -> dict[str, str]:
    """Convertit les erreurs pydantic en {"chemin.du.champ": "message"}."""
    validations: dict[str, str] = {}
    for err in error.errors():
        key = ".".join(str(part) for part in err["loc"]) or "root"
        validations.setdefault(key, err["msg"])
    return validations


class CatchAllExecutor:
    def __init__(self, service: BackendRunnerService):
        self.service = service

    async def execute(self, job: Job) -> dict[str, Any]:
        status = 0
        data = []
        backends = self.service.backends_config.backends
        number_of_backends = len(backends)

        for backend in backends:
            if not backend.active:
                self.service.logger.warning(f"backend {backend.name} is not active")
                continue

            self.service.logger.info(f"Execute backend command {job.name} {backend.name}")
            result = await self.execute_backend(job, backend)
            # Un backend tué par un signal (status None) est compté en erreur
            status += result["status"] if result["status"] is not None else BackendCodesError.GENERIC_ERROR.value
            data.append(result)

            if backend.actions[job.name].onError == OnErrorType.STOP and result["status"] != 0:
                self.service.logger.info("stop on Error")
                await job.updateProgress(100)
                break

            await job.updateProgress(100 / number_of_backends)

        return {"jobId": job.id, "status": status, "data": data}

    async def execute_backend(self, job: Job, backend: BackendConfigV1) -> dict[str, Any]:
        action = backend.actions.get(job.name)
        if action is None:
            raise KeyError(f"Action {job.name} is not defined for backend {backend.name}")

        process = await executor_task(
            os.path.join(backend.path, "bin", action.script),
            job.data,
            self.service.backend_executor_config,
        )

        try:
            if process.status != 0:
                self.service.logger.error(f"Error executing backend {backend.name}")
                error = extract_last_json(process.error or process.output)
                BackendResultInfoError.model_validate(error)
                return {"backend": backend.name, "status": process.status, "error": error}

            self.service.logger.info(f"Backend {backend.name} executed successfully")
            output = extract_last_json(process.output)
            BackendResultInfoSuccess.model_validate(output)
            return {"backend": backend.name, "status": process.status, "output": output}
        except ValidationError as errors:
            validations = validation_errors_to_dict(errors)
        except json.JSONDecodeError as exc:
            validations = {"json": str(exc)}

        fields = ", ".join(validations.keys())
        message = f"Erreur de validation : {fields}".strip()
        self.service.logger.error(f"Invalid JSON response from backend {backend.name}, erreur de validation : {fields}")
        return {
            "backend": backend.name,
            "status": BackendCodesError.INVALID_JSON_RESPONSE.value,
            "message": message,
            "error": {
                "status": BackendCodesError.INVALID_JSON_RESPONSE.value,
                "message": message,
                "data": validations,
            },
        }
