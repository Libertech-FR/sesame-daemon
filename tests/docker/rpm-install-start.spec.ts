import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function run(cmd: string, opts?: { cwd?: string }) {
  execSync(cmd, {
    stdio: 'inherit',
    cwd: opts?.cwd,
    env: process.env,
    timeout: 1000 * 60 * 20, // 20 minutes per command
  });
}

function dockerExec(container: string, cmd: string) {
  // Use bash -lc so we get shell features (&&, quotes) reliably.
  execSync(`docker exec ${container} bash -lc ${JSON.stringify(cmd)}`, {
    stdio: 'pipe',
    env: process.env,
    timeout: 1000 * 60 * 5,
  });
}

function dockerExecCapture(container: string, cmd: string) {
  return execSync(`docker exec ${container} bash -lc ${JSON.stringify(cmd)}`, {
    stdio: 'pipe',
    env: process.env,
    timeout: 1000 * 60 * 5,
  }).toString('utf8');
}

const shouldRun = process.env.RUN_DOCKER_RPM_INSTALL_START_TEST === '1';

const itOrSkip = shouldRun ? it : it.skip;

describe('Docker Rocky RPM smoke', () => {
  // Must be set at definition time, not inside the test body.
  jest.setTimeout(1000 * 60 * 30); // 30 minutes

  itOrSkip('build rpm, install and start sesame-daemon on Rocky Linux', async () => {

    // __dirname = <repoRoot>/tests/docker
    // => repoRoot = <repoRoot>/tests/docker/../..
    const repoRoot = path.resolve(__dirname, '../..');
    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

    if (!process.env.DOCKER_HOST && process.env.DOCKER_BUILDKIT === undefined) {
      // no-op: just to avoid lint warnings about unused env vars
    }

    // Quick preflight.
    run('docker version');

    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sesame-daemon-rpm-test-'));
    const githubOutputFile = path.join(workDir, 'github_output');
    fs.writeFileSync(githubOutputFile, '');
    const containerName = `sesame-daemon-rpm-smoke-${process.pid}-${Date.now()}`;

    try {
      const binPath = path.join(workDir, 'sesame-daemon-linux');

      // Build the Linux binary (pkg) in a throwaway container.
      // NOTE: this step is isolated so the host doesn't get polluted with dist/ or pkg caches.
      run(
        [
          'docker run --rm',
          `-v ${JSON.stringify(repoRoot)}:/repo`,
          `-v ${JSON.stringify(workDir)}:/output`,
          '-w /repo',
          // pkg a des targets basés sur les versions Node supportées.
          // On force un runtime connu via node18 (et une cible x64 explicite ci-dessous).
          'node:18-bookworm-slim bash -lc',
          JSON.stringify([
            'set -eux',
            'yarn install --prefer-offline --frozen-lockfile --non-interactive',
            'yarn run build',
            'npm i -g pkg',
            `rm -f /output/sesame-daemon-linux`,
            `pkg dist/main.js -o /output/sesame-daemon-linux --targets node18-linux-x64 --config package.json`,
            'chmod +x /output/sesame-daemon-linux',
          ].join(' && ')),
        ].join(' '),
      );

      // Prepare rpmpkg root in the same layout as the GitHub workflow.
      const rpmpkgRoot = path.join(workDir, '.rpmpkg');
      fs.mkdirSync(path.join(rpmpkgRoot, 'usr/bin'), { recursive: true });
      fs.copyFileSync(binPath, path.join(rpmpkgRoot, 'usr/bin/sesame-daemon'));
      fs.chmodSync(path.join(rpmpkgRoot, 'usr/bin/sesame-daemon'), 0o755);

      fs.mkdirSync(path.join(rpmpkgRoot, 'var/lib/sesame-daemon/backends'), { recursive: true });
      fs.mkdirSync(path.join(rpmpkgRoot, 'var/lib/sesame-daemon'), { recursive: true });
      // `pkg` peut ne pas rendre le `package.json` attendu. Le service retombe alors sur
      // `readFileSync('package.json')` (chemin relatif). Installer le fichier évite l'erreur ENOENT.
      fs.copyFileSync(path.join(repoRoot, 'package.json'), path.join(rpmpkgRoot, 'var/lib/sesame-daemon/package.json'));
      // Copy backends.example/* into /var/lib/sesame-daemon/backends (so the daemon finds config.yml files).
      for (const entry of fs.readdirSync(path.join(repoRoot, 'backends.example'))) {
        const from = path.join(repoRoot, 'backends.example', entry);
        const to = path.join(rpmpkgRoot, 'var/lib/sesame-daemon/backends', entry);
        fs.cpSync(from, to, { recursive: true });
      }

      fs.mkdirSync(path.join(rpmpkgRoot, 'usr/share/sesame-daemon'), { recursive: true });
      // Rocky/RHEL usually uses 'nobody' instead of 'nogroup' (see unit comment).
      {
        const serviceSrc = fs.readFileSync(
          path.join(repoRoot, '.debpkg/usr/share/sesame-daemon/sesame-daemon.service'),
          'utf8',
        );
        const serviceAdjusted = serviceSrc.replace('Group=nogroup', 'Group=nobody');
        fs.writeFileSync(
          path.join(rpmpkgRoot, 'usr/share/sesame-daemon/sesame-daemon.service'),
          serviceAdjusted,
          'utf8',
        );
      }

      fs.mkdirSync(path.join(rpmpkgRoot, 'etc/default'), { recursive: true });
      fs.copyFileSync(
        path.join(repoRoot, '.debpkg/etc/default/sesame-daemon'),
        path.join(rpmpkgRoot, 'etc/default/sesame-daemon'),
      );

      // Build the RPM using the same Docker action image as in .github/workflows/release.yml.
      // We inject a minimal %post that only copies the systemd unit file into place.
      // systemctl enable/start will be done after we start systemd + redis inside Rocky.
      const postScript =
        'mkdir -p /lib/systemd/system; cp /usr/share/sesame-daemon/sesame-daemon.service /lib/systemd/system/sesame-daemon.service;';

      run(
        [
          'docker run --rm',
          '-v ' + JSON.stringify(workDir) + ':/work',
          '-w /work',
          ' -e ' + JSON.stringify('GITHUB_OUTPUT') + '=' + JSON.stringify('/work/github_output'),
          ' -e ' + JSON.stringify('INPUT_SUMMARY') + '=' + JSON.stringify('Sesame Daemon'),
          ' -e ' + JSON.stringify('INPUT_PACKAGE') + '=' + JSON.stringify('sesame-daemon'),
          // build-rpm-action uses `set -eu` and fails if INPUT_VENDOR is not defined.
          ' -e ' + JSON.stringify('INPUT_VENDOR') + '=' + JSON.stringify(''),
          // jiro4989/build-rpm-action attend '-' pour "aucune dépendance"
          ' -e ' + JSON.stringify('INPUT_BUILD_REQUIRES') + '=' + JSON.stringify('-'),
          ' -e ' + JSON.stringify('INPUT_REQUIRES') + '=' + JSON.stringify('-'),
          ' -e ' + JSON.stringify('INPUT_LICENSE') + '=' + JSON.stringify('MIT'),
          ' -e ' + JSON.stringify('INPUT_PACKAGE_ROOT') + '=' + JSON.stringify('/work/.rpmpkg'),
          ' -e ' + JSON.stringify('INPUT_MAINTAINER') + '=' + JSON.stringify('Libertech-FR'),
          ' -e ' + JSON.stringify('INPUT_VERSION') + '=' + JSON.stringify(pkg.version),
          ' -e ' + JSON.stringify('INPUT_ARCH') + '=' + JSON.stringify('x86_64'),
          ' -e ' + JSON.stringify('INPUT_DESC') + '=' + JSON.stringify('Sesame Daemon'),
          ' -e ' + JSON.stringify('INPUT_POST') + '=' + JSON.stringify(postScript),
          ' jiro4989/build-rpm-action:2.5.0',
        ].join(' '),
      );

      const rpmFiles = fs
        .readdirSync(workDir)
        .filter((f) => f.endsWith('.rpm'))
        .filter((f) => !f.includes('debuginfo'));

      if (rpmFiles.length === 0) {
        throw new Error('RPM not found in temp dir: ' + workDir);
      }

      const rpmPath = path.join('/tmp/payload', rpmFiles[0]);

      // Start Rocky Linux (without systemd dependency).
      run(
        [
          'docker run -d --rm --platform linux/amd64',
          '--name ' + containerName,
          '-v ' + JSON.stringify(workDir) + ':/tmp/payload:ro',
          'rockylinux:9 bash -lc "while true; do sleep 3600; done"',
        ].join(' '),
      );

      // Install redis (required) and procps (pgrep/ps) for health checks.
      dockerExec(containerName, 'dnf -y update && dnf -y install redis procps-ng');
      dockerExec(containerName, 'redis-server --daemonize yes');

      // Install RPM.
      dockerExec(containerName, `dnf -y install ${rpmPath}`);

      // Start the daemon directly (systemd is often unavailable in container tests).
      const pidRaw = dockerExecCapture(
        containerName,
        'cd /var/lib/sesame-daemon; set -a; . /etc/default/sesame-daemon; set +a; ' +
          // Use nohup so the daemon survives `docker exec` shell exit.
          'nohup /usr/bin/sesame-daemon </dev/null > /tmp/sesame-daemon.log 2>&1 & sleep 5; ' +
          // pgrep is usually available via procps.
          'pgrep -f sesame-daemon | sed -n \'1p\'',
      );
      const pid = Number(pidRaw.trim());
      if (!Number.isFinite(pid) || pid <= 0) {
        const logsHead = dockerExecCapture(
          containerName,
          "sed -n '1,400p' /tmp/sesame-daemon.log 2>/dev/null || true",
        );
        const logsTail = dockerExecCapture(
          containerName,
          "tail -n 200 /tmp/sesame-daemon.log 2>/dev/null || true",
        );
        const ls = dockerExecCapture(
          containerName,
          'ls -l /usr/bin/sesame-daemon /etc/default/sesame-daemon /var/lib/sesame-daemon/package.json 2>/dev/null || true',
        );
        const ps = dockerExecCapture(containerName, "ps -ef | grep -v grep | grep -E 'sesame-daemon|node' || true");
        throw new Error(
          'Failed to start sesame-daemon (invalid PID). Raw: ' +
            pidRaw +
            '\\nls:\\n' +
            ls +
            '\\nps:\\n' +
            ps +
            '\\nlogs(head):\\n' +
            logsHead +
            '\\nlogs(tail):\\n' +
            logsTail,
        );
      }

      // Wait for the process to stay up for a bit.
      let running = false;
      for (let i = 0; i < 30; i++) {
        const pids = dockerExecCapture(containerName, "pgrep -f sesame-daemon || true").trim();
        if (pids) {
          running = true;
          break;
        }
        // eslint-disable-next-line no-await-in-loop
        await sleep(1000);
      }

      if (!running) {
        const logsHead = dockerExecCapture(
          containerName,
          "sed -n '1,400p' /tmp/sesame-daemon.log 2>/dev/null || true",
        );
        const logsTail = dockerExecCapture(
          containerName,
          "tail -n 200 /tmp/sesame-daemon.log 2>/dev/null || true",
        );
        const ps = dockerExecCapture(containerName, "ps -ef | grep -v grep | grep -E 'sesame-daemon|node' || true");
        const redisPing = dockerExecCapture(containerName, 'redis-cli ping || true');
        throw new Error(
          'sesame-daemon process is not running.\\nredis-cli ping: ' +
            redisPing +
            '\\nps:\\n' +
            ps +
            '\\nlogs(head):\\n' +
            logsHead +
            '\\nlogs(tail):\\n' +
            logsTail,
        );
      }
    } finally {
      // Best-effort cleanup.
      try {
        run(`docker rm -f ${containerName}`);
      } catch {
        // ignore
      }
    }
  });
});

