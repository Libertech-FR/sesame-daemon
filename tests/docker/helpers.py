import os
import shutil
import subprocess
import time
import tomllib
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
# glibc 2.31 : le binaire tourne sur Debian 11/12 et RHEL/Rocky 9
BUILD_IMAGE = "python:3.12-slim-bullseye"


def package_version() -> str:
    with open(REPO_ROOT / "pyproject.toml", "rb") as f:
        return tomllib.load(f)["project"]["version"]


def run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, timeout=60 * 20, **kwargs)


def docker_exec(container: str, cmd: str, check: bool = True) -> str:
    result = subprocess.run(
        ["docker", "exec", container, "bash", "-lc", cmd],
        check=check,
        capture_output=True,
        text=True,
        timeout=60 * 5,
    )
    return result.stdout


def build_linux_binary(output_dir: Path) -> Path:
    """Construit le binaire PyInstaller linux/amd64 dans un conteneur jetable."""
    run(
        [
            "docker", "run", "--rm", "--platform", "linux/amd64",
            "-v", f"{REPO_ROOT}:/repo:ro",
            "-v", f"{output_dir}:/output",
            BUILD_IMAGE, "bash", "-lc",
            " && ".join([
                "set -eux",
                "apt-get update && apt-get install -y --no-install-recommends binutils",
                "pip install --no-cache-dir uv",
                "cp -r /repo /src && rm -rf /src/.venv",
                "cd /src && UV_PROJECT_ENVIRONMENT=/tmp/venv scripts/build-binary.sh sesame-daemon-linux /output",
            ]),
        ]
    )  # fmt: skip
    binary = output_dir / "sesame-daemon-linux"
    binary.chmod(0o755)
    return binary


def prepare_package_root(root: Path, binary: Path, group: str = "nogroup") -> None:
    """Reproduit l'arborescence des paquets construite par .github/workflows/release.yml."""
    (root / "usr/bin").mkdir(parents=True)
    shutil.copy(binary, root / "usr/bin/sesame-daemon")
    (root / "usr/bin/sesame-daemon").chmod(0o755)

    shutil.copytree(REPO_ROOT / "backends.example", root / "var/lib/sesame-daemon/backends")
    (root / "var/lib/sesame-daemon/backends/03dummy/bin/dummy.sh").chmod(0o755)

    (root / "usr/share/sesame-daemon").mkdir(parents=True)
    service = (REPO_ROOT / ".debpkg/usr/share/sesame-daemon/sesame-daemon.service").read_text()
    (root / "usr/share/sesame-daemon/sesame-daemon.service").write_text(
        service.replace("Group=nogroup", f"Group={group}")
    )

    (root / "etc/default").mkdir(parents=True)
    shutil.copy(REPO_ROOT / ".debpkg/etc/default/sesame-daemon", root / "etc/default/sesame-daemon")


def start_daemon_and_check(container: str) -> None:
    """Démarre le daemon (sans systemd) et vérifie qu'il tourne toujours après quelques secondes."""
    docker_exec(
        container,
        "cd /var/lib/sesame-daemon; set -a; . /etc/default/sesame-daemon; set +a; "
        "nohup /usr/bin/sesame-daemon </dev/null > /tmp/sesame-daemon.log 2>&1 &",
    )
    time.sleep(8)
    pids = docker_exec(container, "pgrep -f /usr/bin/sesame-daemon || true").strip()
    if not pids:
        logs = docker_exec(container, "cat /tmp/sesame-daemon.log 2>/dev/null || true", check=False)
        redis_ping = docker_exec(container, "redis-cli ping || true", check=False)
        raise AssertionError(f"sesame-daemon is not running.\nredis-cli ping: {redis_ping}\nlogs:\n{logs}")

    logs = docker_exec(container, "cat /tmp/sesame-daemon.log")
    assert "Worker now active" in logs, logs


def remove_container(container: str) -> None:
    subprocess.run(["docker", "rm", "-f", container], capture_output=True)


def unique_name(prefix: str) -> str:
    return f"{prefix}-{os.getpid()}-{int(time.time())}"
