import stat

import pytest

from sesame_daemon.backend_config import BackendConfigService
from sesame_daemon.enums import BackendCodesError
from sesame_daemon.executors.catch_all import CatchAllExecutor, extract_last_json, validation_errors_to_dict
from sesame_daemon.models import BackendResultInfoError
from tests.conftest import FakeJob, FakeService


class TestExtractLastJson:
    def test_no_output(self):
        assert extract_last_json("") == {"status": BackendCodesError.INVALID_JSON_RESPONSE, "message": "No output"}

    def test_no_json(self):
        assert extract_last_json("hello world") == {
            "status": BackendCodesError.INVALID_JSON_RESPONSE,
            "message": "No JSON output",
        }

    def test_returns_last_json(self):
        assert extract_last_json('prefix {"a":1} middle {"b":2}') == {"b": 2}

    def test_ignores_braces_in_strings(self):
        assert extract_last_json('{"a":"{not json}", "b":1}') == {"a": "{not json}", "b": 1}

    def test_nested_objects(self):
        assert extract_last_json('log\n{"status":0,"data":{"x":{"y":1}}}\n') == {"status": 0, "data": {"x": {"y": 1}}}


def test_validation_errors_to_dict():
    try:
        BackendResultInfoError.model_validate({"status": 3, "message": 1, "data": {"a": 1}})
    except Exception as exc:
        validations = validation_errors_to_dict(exc)
    assert set(validations) == {"status", "message"}


def make_backend(root, name, body, on_error="stop", active=True):
    backend_dir = root / name
    (backend_dir / "bin").mkdir(parents=True)
    script = backend_dir / "bin" / "run.sh"
    script.write_text("#!/bin/sh\n" + body)
    script.chmod(script.stat().st_mode | stat.S_IEXEC)
    (backend_dir / "config.yml").write_text(
        f"_version: 1\nname: {name}\nactive: {str(active).lower()}\n"
        f"actions:\n  IDENTITY_CREATE:\n    script: run.sh\n    onError: {on_error}\n"
    )


def make_executor(root):
    backends = BackendConfigService(str(root))
    backends.initialize()
    return CatchAllExecutor(FakeService(backends))


async def test_runs_all_backends(tmp_path):
    make_backend(tmp_path, "01a", 'echo \'{"status":0,"message":"a"}\'\n')
    make_backend(tmp_path, "02b", 'echo \'{"status":0,"message":"b"}\'\n')
    job = FakeJob(data={"payload": None})

    result = await make_executor(tmp_path).execute(job)

    assert result == {
        "jobId": "job-1",
        "status": 0,
        "data": [
            {"backend": "01a", "status": 0, "output": {"status": 0, "message": "a"}},
            {"backend": "02b", "status": 0, "output": {"status": 0, "message": "b"}},
        ],
    }
    assert job.progress == [50, 50]


async def test_skips_inactive_backend(tmp_path):
    make_backend(tmp_path, "01a", "echo '{\"status\":0}'\n", active=False)
    result = await make_executor(tmp_path).execute(FakeJob())
    assert result["data"] == []


async def test_stops_on_error(tmp_path):
    make_backend(tmp_path, "01a", 'echo \'{"status":8,"message":"bad login"}\' >&2\nexit 8\n', on_error="stop")
    make_backend(tmp_path, "02b", "echo '{\"status\":0}'\n")
    job = FakeJob()

    result = await make_executor(tmp_path).execute(job)

    assert result["status"] == 8
    assert result["data"] == [{"backend": "01a", "status": 8, "error": {"status": 8, "message": "bad login"}}]
    assert job.progress == [100]


async def test_continues_on_error(tmp_path):
    make_backend(tmp_path, "01a", "echo '{\"status\":4}'\nexit 4\n", on_error="continue")
    make_backend(tmp_path, "02b", "echo '{\"status\":0}'\n")

    result = await make_executor(tmp_path).execute(FakeJob())

    assert result["status"] == 4
    assert [d["backend"] for d in result["data"]] == ["01a", "02b"]


async def test_invalid_json_response(tmp_path):
    make_backend(tmp_path, "01a", 'echo \'{"status":0,"message":42}\'\n')

    result = await make_executor(tmp_path).execute(FakeJob())

    data = result["data"][0]
    assert result["status"] == BackendCodesError.INVALID_JSON_RESPONSE
    assert data["message"] == "Erreur de validation : message"
    assert data["error"]["status"] == BackendCodesError.INVALID_JSON_RESPONSE
    assert set(data["error"]["data"]) == {"message"}


async def test_no_output_is_invalid(tmp_path):
    make_backend(tmp_path, "01a", "exit 0\n")
    result = await make_executor(tmp_path).execute(FakeJob())
    assert result["data"][0]["status"] == BackendCodesError.INVALID_JSON_RESPONSE


async def test_missing_action_raises(tmp_path):
    make_backend(tmp_path, "01a", "exit 0\n")
    with pytest.raises(KeyError):
        await make_executor(tmp_path).execute(FakeJob(name="IDENTITY_DELETE"))
