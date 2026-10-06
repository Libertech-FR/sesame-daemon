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
    os.environ.get("RUN_DOCKER_RPM_INSTALL_START_TEST") != "1",
    reason="RUN_DOCKER_RPM_INSTALL_START_TEST=1 requis",
)

# %post minimal : systemd n'est pas disponible dans le conteneur
POST_SCRIPT = (
    "mkdir -p /lib/systemd/system; "
    "cp /usr/share/sesame-daemon/sesame-daemon.service /lib/systemd/system/sesame-daemon.service;"
)


def test_build_rpm_install_and_start_on_rocky(tmp_path):
    run(["docker", "version"])
    binary = build_linux_binary(tmp_path)

    # Rocky/RHEL utilise 'nobody' au lieu de 'nogroup'
    prepare_package_root(tmp_path / ".rpmpkg", binary, group="nobody")
    (tmp_path / "github_output").write_text("")

    # Même image que l'action jiro4989/build-rpm-action utilisée dans release.yml
    inputs = {
        "GITHUB_OUTPUT": "/work/github_output",
        "INPUT_SUMMARY": "Sesame Daemon",
        "INPUT_PACKAGE": "sesame-daemon",
        "INPUT_VENDOR": "",
        "INPUT_BUILD_REQUIRES": "-",
        "INPUT_REQUIRES": "-",
        "INPUT_LICENSE": "MIT",
        "INPUT_PACKAGE_ROOT": "/work/.rpmpkg",
        "INPUT_MAINTAINER": "Libertech-FR",
        "INPUT_VERSION": package_version(),
        "INPUT_ARCH": "x86_64",
        "INPUT_DESC": "Sesame Daemon",
        "INPUT_POST": POST_SCRIPT,
    }
    env_args = [arg for key, value in inputs.items() for arg in ("-e", f"{key}={value}")]
    run(
        [
            "docker",
            "run",
            "--rm",
            "-v",
            f"{tmp_path}:/work",
            "-w",
            "/work",
            *env_args,
            "jiro4989/build-rpm-action:2.5.0",
        ]
    )

    rpm_files = [p.name for p in tmp_path.glob("*.rpm") if "debuginfo" not in p.name]
    assert rpm_files, f"RPM not found in {tmp_path}"

    container = unique_name("sesame-daemon-rpm-smoke")
    try:
        run(
            [
                "docker", "run", "-d", "--rm", "--platform", "linux/amd64", "--name", container,
                "-v", f"{tmp_path}:/tmp/payload:ro",
                "rockylinux:9", "bash", "-lc", "while true; do sleep 3600; done",
            ]
        )  # fmt: skip
        docker_exec(container, "dnf -y install redis procps-ng")
        docker_exec(container, "redis-server --daemonize yes")
        docker_exec(container, f"dnf -y install /tmp/payload/{rpm_files[0]}")

        start_daemon_and_check(container)
    finally:
        remove_container(container)
