import logging
import sys

VERBOSE = 5
logging.addLevelName(VERBOSE, "VERBOSE")
logging.addLevelName(logging.CRITICAL, "FATAL")

LOG_LEVELS: dict[str, int] = {
    "fatal": logging.CRITICAL,
    "error": logging.ERROR,
    "warn": logging.WARNING,
    "info": logging.INFO,
    "debug": logging.DEBUG,
    "verbose": VERBOSE,
}


def get_log_level(log_level: str | None = None) -> int:
    return LOG_LEVELS.get((log_level or "").lower(), LOG_LEVELS["info"])


def setup_logging(log_level: str | None = None) -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)7s [%(name)s] %(message)s"))
    root = logging.getLogger()
    root.handlers[:] = [handler]
    root.setLevel(get_log_level(log_level))
    # bullmq/redis sont très bavards en debug
    for name in ("bullmq", "redis", "asyncio"):
        logging.getLogger(name).setLevel(max(root.level, logging.INFO))


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
