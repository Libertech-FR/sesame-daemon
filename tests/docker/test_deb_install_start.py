import os

import pytest

from tests.docker.helpers import (
    build_linux_binary,
    docker_exec,
    package_version,
    prepare_package_root,
    remove_container,
    run,
    start_daemon_and_check,
    unique_name,
)

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_DOCKER_DEB_INSTALL_START_TEST") != "1",
    reason="RUN_DOCKER_DEB_INSTALL_START_TEST=1 requis",
)


def test_build_deb_install_and_start_on_debian(tmp_path):
    run(["docker", "version"])
    version = package_version()
    binary = build_linux_binary(tmp_path)

    # Paquet minimal : pas de postinst/postrm, systemd n'est pas disponible dans le conteneur
    deb_root = tmp_path / ".debpkg"
    prepare_package_root(deb_root, binary)
    (deb_root / "DEBIAN").mkdir()
    (deb_root / "DEBIAN/control").write_text(
        "Package: sesame-daemon\n"
        f"Version: {version}\n"
        "Section: utils\n"
        "Priority: optional\n"
        "Architecture: amd64\n"
        "Maintainer: Libertech-FR <noreply@example.com>\n"
        "Description: Sesame Daemon\n"
    )

    deb_file = f"sesame-daemon_{version}_amd64.deb"
    run(
        [
            "docker", "run", "--rm", "--platform", "linux/amd64",
            "-v", f"{tmp_path}:/work", "-w", "/work",
            "debian:bookworm-slim", "bash", "-lc",
            "set -eux && apt-get update && apt-get install -y dpkg-dev"
            f" && dpkg-deb --build --root-owner-group .debpkg {deb_file}",
        ]
    )  # fmt: skip
    assert (tmp_path / deb_file).exists()

    container = unique_name("sesame-daemon-deb-smoke")
    try:
        run(
            [
                "docker", "run", "-d", "--rm", "--platform", "linux/amd64", "--name", container,
                "-v", f"{tmp_path}:/tmp/payload:ro",
                "debian:bookworm-slim", "bash", "-lc", "while true; do sleep 3600; done",
            ]
        )  # fmt: skip
        docker_exec(container, "apt-get update && apt-get install -y bash ca-certificates procps redis-server")
        docker_exec(container, "redis-server --daemonize yes")
        docker_exec(container, f"dpkg -i /tmp/payload/{deb_file}")

        start_daemon_and_check(container)
    finally:
        remove_container(container)
