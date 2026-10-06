from sesame_daemon.backend_config import BackendConfigService
from sesame_daemon.config import load_config
from sesame_daemon.runner import BackendRunnerService
from tests.conftest import FakeJob


class StubExecutor:
    def __init__(self, result):
        self.result = result
        self.jobs = []

    async def execute(self, job):
        self.jobs.append(job)
        return dict(self.result)


def make_runner():
    return BackendRunnerService(load_config(), BackendConfigService("/nonexistent"))


async def test_dispatch_known_job():
    runner = make_runner()
    stub = StubExecutor({"jobId": "1", "status": 0, "data": []})
    runner.executors["LIST_BACKENDS"] = stub

    result = await runner.process(FakeJob(name="LIST_BACKENDS", data={"options": {"x": 1}}), "token")

    assert stub.jobs
    assert result == {"jobId": "1", "status": 0, "data": [], "jobName": "LIST_BACKENDS", "options": {"x": 1}}


async def test_dispatch_unknown_job_to_catch_all():
    runner = make_runner()
    stub = StubExecutor({"jobId": "1", "status": 8, "data": [{"error": {"message": "bad"}}]})
    runner.executors["*"] = stub

    result = await runner.process(FakeJob(name="IDENTITY_CREATE", data={}), "token")

    assert stub.jobs
    assert result["jobName"] == "IDENTITY_CREATE"
    assert result["options"] is None
    assert result["status"] == 8


def test_package_info_has_version():
    info = make_runner().package_info
    assert info["name"] == "sesame-daemon"
    assert info["version"]
