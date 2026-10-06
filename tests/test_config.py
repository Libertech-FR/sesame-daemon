import pytest

from sesame_daemon.config import ExecutorConfig, load_config

ENV_VARS = [
    "SESAME_LOG_LEVEL",
    "SESAME_NAME_QUEUE",
    "SESAME_REDIS_URI",
    "SESAME_BACKENDS_PATH",
    "SESAME_BACKENDS_EXECUTOR_SHELL",
]


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    for var in ENV_VARS:
        monkeypatch.delenv(var, raising=False)


def test_default_values_when_env_is_missing():
    cfg = load_config()

    assert cfg.log_level == "info"
    assert cfg.name_queue == "sesame"
    assert cfg.redis_uri == "redis://localhost:6379/0"
    assert cfg.backends_path.endswith("backends")
    assert cfg.backend_executor_config == ExecutorConfig(shell=True)


def test_env_overrides(monkeypatch):
    monkeypatch.setenv("SESAME_LOG_LEVEL", "DEBUG")
    monkeypatch.setenv("SESAME_NAME_QUEUE", "custom-queue")
    monkeypatch.setenv("SESAME_REDIS_URI", "redis://127.0.0.1:6379/4")
    monkeypatch.setenv("SESAME_BACKENDS_PATH", "/tmp/backends")

    cfg = load_config()

    assert cfg.log_level == "debug"
    assert cfg.name_queue == "custom-queue"
    assert cfg.redis_uri == "redis://127.0.0.1:6379/4"
    assert cfg.backends_path.endswith("/tmp/backends")


@pytest.mark.parametrize(
    ("value", "expected"),
    [("true", True), ("false", False), ("/bin/bash", "/bin/bash")],
)
def test_executor_shell(monkeypatch, value, expected):
    monkeypatch.setenv("SESAME_BACKENDS_EXECUTOR_SHELL", value)
    assert load_config().backend_executor_config.shell == expected
