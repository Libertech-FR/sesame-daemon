from pathlib import Path

import pytest

from sesame_daemon.backend_config import BackendConfigService

EXAMPLES = Path(__file__).resolve().parent.parent / "backends.example"


def test_loads_example_backends():
    service = BackendConfigService(str(EXAMPLES))
    service.initialize()

    assert [b["name"] for b in service.backends_config_data] == ["dummy"]
    assert service.backends_config_data[0]["path"] == str(EXAMPLES / "03dummy")
    assert service.backends[0].name == "dummy"


def test_skips_files_without_version_or_name(tmp_path):
    (tmp_path / "a").mkdir()
    (tmp_path / "a" / "config.yml").write_text("name: x\n")
    (tmp_path / "other.yml").write_text("_version: 1\nname: y\n")

    service = BackendConfigService(str(tmp_path))
    service.initialize()

    assert service.backends_config_data == []


def test_exits_on_invalid_config(tmp_path):
    (tmp_path / "config.yml").write_text("_version: 1\nname: bad\nactions: {}\n")

    with pytest.raises(SystemExit) as exc:
        BackendConfigService(str(tmp_path)).initialize()
    assert exc.value.code == 1
