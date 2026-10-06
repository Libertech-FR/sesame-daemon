import asyncio
import signal
import sys

from sesame_daemon.backend_config import BackendConfigService
from sesame_daemon.config import load_config, load_dotenv
from sesame_daemon.logger import get_logger, setup_logging
from sesame_daemon.runner import BackendRunnerService


async def main() -> int:
    load_dotenv()
    config = load_config()
    setup_logging(config.log_level)
    logger = get_logger("Main")

    backends_config = BackendConfigService(config.backends_path)
    backends_config.initialize()

    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop_event.set)

    runner = BackendRunnerService(config, backends_config)
    logger.info("Starting sesame-daemon...")
    return await runner.run(stop_event)


def run() -> None:
    sys.exit(asyncio.run(main()))


if __name__ == "__main__":
    run()
