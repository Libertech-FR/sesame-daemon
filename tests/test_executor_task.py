import json
import os
import stat

import pytest

from sesame_daemon.config import ExecutorConfig
from sesame_daemon.executor_task import convert_null_to_empty_string, executor_task, serialize_job_data


@pytest.fixture
def make_script(tmp_path):
    def _make(body: str):
        bin_dir = tmp_path / "bin"
        bin_dir.mkdir(exist_ok=True)
        script = bin_dir / "script.sh"
        script.write_text("#!/bin/sh\n" + body)
        script.chmod(script.stat().st_mode | stat.S_IEXEC)
        return str(script)

    return _make


def test_convert_null_to_empty_string():
    data = {"user": None, "profile": {"mail": None, "age": 42}, "groups": [None, "dev"]}
    assert convert_null_to_empty_string(data) == {"user": "", "profile": {"mail": "", "age": 42}, "groups": ["", "dev"]}


def test_serialize_matches_json_stringify():
    assert serialize_job_data({"a": None, "b": [1, "é"]}) == '{"a":"","b":[1,"é"]}'


async def test_writes_json_on_stdin(make_script):
    script = make_script("cat\n")
    data = {"user": None, "profile": {"mail": None, "age": 42}, "groups": [None, "dev"]}

    result = await executor_task(script, data, ExecutorConfig(shell=True))

    assert result.status == 0
    assert result.output == json.dumps(
        {"user": "", "profile": {"mail": "", "age": 42}, "groups": ["", "dev"]}, separators=(",", ":")
    )


async def test_aggregates_stdout_and_stderr(make_script):
    script = make_script('printf \'{"status":0,\'\nprintf \'"message":"ok"}\'\nprintf warning >&2\nexit 1\n')

    result = await executor_task(script, {"action": "x"})

    assert result.status == 1
    assert result.output == '{"status":0,"message":"ok"}'
    assert result.error == "warning"


async def test_preserves_escaped_characters(make_script):
    script = make_script("cat\n")
    data = {"raw": "line1\\nline2", "quote": 'He said "hello"', "slash": "C:\\\\temp\\\\script.sh"}

    result = await executor_task(script, data)

    assert json.loads(result.output) == data


async def test_large_payload_without_truncation(make_script):
    script = make_script("cat\n")
    data = {"items": [{"id": i, "value": f"v-{i}"} for i in range(5000)]}

    result = await executor_task(script, data)

    assert len(result.output) > 100_000
    assert len(json.loads(result.output)["items"]) == 5000


async def test_runs_in_script_directory(make_script, tmp_path):
    script = make_script("pwd\n")
    result = await executor_task(script, {})
    assert os.path.realpath(result.output.strip()) == os.path.realpath(tmp_path / "bin")


async def test_without_shell(make_script):
    script = make_script("echo direct\n")
    result = await executor_task(script, {}, ExecutorConfig(shell=False))
    assert result.output == "direct\n"


async def test_status_none_when_killed_by_signal(make_script):
    # Sans shell intermédiaire : sinon /bin/sh (dash) renvoie 128+signal
    script = make_script("kill -9 $$\n")
    result = await executor_task(script, {}, ExecutorConfig(shell=False))
    assert result.status is None
    assert result.output == ""
    assert result.error == ""
