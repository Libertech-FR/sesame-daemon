import json
import os
import sys
from typing import Any

import yaml
from pydantic import ValidationError

from sesame_daemon.logger import VERBOSE, get_logger
from sesame_daemon.models import BackendConfigV1

logger = get_logger("BackendConfigService")


def _find_yml_files(base_path: str) -> list[str]:
    files = []
    for root, _dirs, names in os.walk(base_path):
        files.extend(os.path.join(root, name) for name in names if name.endswith(".yml"))
    return sorted(files)


class BackendConfigService:
    def __init__(self, backends_path: str):
        self.backends_path = backends_path
        self._backends_config_data: list[dict[str, Any]] = []
        self._backends: list[BackendConfigV1] = []

    @property
    def backends_config_data(self) -> list[dict[str, Any]]:
        """Configs brutes (telles que lues dans les config.yml), renvoyées par LIST_BACKENDS."""
        return self._backends_config_data

    @property
    def backends(self) -> list[BackendConfigV1]:
        """Configs validées, dans le même ordre que backends_config_data."""
        return self._backends

    def initialize(self) -> None:
        backends_config_data = []
        backends = []
        logger.info(f"Load backends config... {self.backends_path}")

        for file in _find_yml_files(self.backends_path):
            if not file.endswith("config.yml"):
                logger.debug(f"Skipping {file}...")
                continue

            logger.info(f"Loading {file}...")
            with open(file, encoding="utf-8") as f:
                config = yaml.safe_load(f)

            if not isinstance(config, dict) or not config.get("_version") or not config.get("name"):
                logger.debug(f"Skipping with bad structure _version & name: {file}...")
                continue

            if not config.get("path"):
                config["path"] = os.path.dirname(file)

            try:
                backends.append(BackendConfigV1.model_validate(config))
            except ValidationError as errors:
                logger.error(f"Invalid backend config file {file}: {errors}")
                sys.exit(1)

            backends_config_data.append(config)
            logger.info(f"New config file loaded {config['name']}")

        logger.log(VERBOSE, json.dumps(backends_config_data, default=str))
        self._backends_config_data = backends_config_data
        self._backends = backends
