import logging

from sesame_daemon.executors import DumpPackageConfigExecutor, ListBackendsExecutor
from tests.conftest import FakeJob, FakeService


class FakeBackends:
    backends_config_data = [{"name": "dummy", "active": True}]


async def test_list_backends():
    result = await ListBackendsExecutor(FakeService(FakeBackends())).execute(FakeJob(id="job-list"))
    assert result == {"status": 0, "jobId": "job-list", "data": [{"name": "dummy", "active": True}]}


async def test_dump_package_config(caplog):
    package_info = {"name": "sesame-daemon", "version": "1.2.3", "description": "daemon"}
    service = FakeService(package_info=package_info)

    with caplog.at_level(logging.DEBUG, logger="test"):
        result = await DumpPackageConfigExecutor(service).execute(FakeJob(id="job-pkg"))

    assert result == {"status": 0, "jobId": "job-pkg", "data": [package_info]}
    assert 'Dump package config: {"name":"sesame-daemon"' in caplog.text
