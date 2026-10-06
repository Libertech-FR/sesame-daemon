import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ExecutorConfig:
    # True => /bin/sh, False => exécution directe, str => chemin du shell à utiliser
    shell: bool | str = True


@dataclass(frozen=True)
class Config:
    log_level: str
    name_queue: str
    backends_path: str
    backend_executor_config: ExecutorConfig
    redis_uri: str


def _parse_shell(value: str | None) -> bool | str:
    if value is None or value.strip().lower() in ("", "true", "1", "yes"):
        return True
    if value.strip().lower() in ("false", "0", "no"):
        return False
    return value


def load_config() -> Config:
    return Config(
        log_level=(os.environ.get("SESAME_LOG_LEVEL") or "info").lower(),
        name_queue=os.environ.get("SESAME_NAME_QUEUE") or "sesame",
        backends_path=str(Path(os.environ.get("SESAME_BACKENDS_PATH") or "backends").resolve()),
        backend_executor_config=ExecutorConfig(shell=_parse_shell(os.environ.get("SESAME_BACKENDS_EXECUTOR_SHELL"))),
        redis_uri=os.environ.get("SESAME_REDIS_URI") or "redis://localhost:6379/0",
    )


def load_dotenv(path: str = ".env") -> None:
    """Charge un fichier .env (KEY=VALUE) sans écraser les variables déjà définies."""
    try:
        with open(path, encoding="utf-8") as f:
            lines = f.readlines()
    except OSError:
        return

    for line in lines:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip().removeprefix("export ").strip()
        value = value.strip().strip("'\"")
        os.environ.setdefault(key, value)


def is_development() -> bool:
    return (os.environ.get("SESAME_ENV") or os.environ.get("NODE_ENV")) == "development"
