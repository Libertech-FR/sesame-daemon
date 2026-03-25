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

const shouldRun = process.env.RUN_DOCKER_DEB_INSTALL_START_TEST === '1';
const itOrSkip = shouldRun ? it : it.skip;

describe('Docker Debian DEB smoke', () => {
  jest.setTimeout(1000 * 60 * 30); // 30 minutes

  itOrSkip('build deb, install and start sesame-daemon on Debian', async () => {
    const repoRoot = path.resolve(__dirname, '../..');
    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

    run('docker version');

    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sesame-daemon-deb-test-'));
    const containerName = `sesame-daemon-deb-smoke-${process.pid}-${Date.now()}`;

    try {
      const binPath = path.join(workDir, 'sesame-daemon-linux');

      // Build the Linux binary (pkg) in a throwaway container.
      run(
        [
          'docker run --rm',
          `-v ${JSON.stringify(repoRoot)}:/repo`,
          `-v ${JSON.stringify(workDir)}:/output`,
          '-w /repo',
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

      // Prepare deb package root.
      const debRoot = path.join(workDir, '.debpkg');
      fs.mkdirSync(path.join(debRoot, 'DEBIAN'), { recursive: true });

      // Minimal control file (we avoid postinst/postrm because systemd is fragile in containers).
      const control = [
        'Package: sesame-daemon',
        `Version: ${pkg.version}`,
        'Section: utils',
        'Priority: optional',
        'Architecture: amd64',
        'Maintainer: Libertech-FR <noreply@example.com>',
        'Description: Sesame Daemon',
        '',
      ].join('\n');
      fs.writeFileSync(path.join(debRoot, 'DEBIAN', 'control'), control, 'utf8');

      fs.mkdirSync(path.join(debRoot, 'usr/bin'), { recursive: true });
      fs.copyFileSync(binPath, path.join(debRoot, 'usr/bin/sesame-daemon'));
      fs.chmodSync(path.join(debRoot, 'usr/bin/sesame-daemon'), 0o755);

      // Data directory + backends + package.json for runtime reads.
      fs.mkdirSync(path.join(debRoot, 'var/lib/sesame-daemon'), { recursive: true });
      fs.copyFileSync(path.join(repoRoot, 'package.json'), path.join(debRoot, 'var/lib/sesame-daemon/package.json'));
      fs.mkdirSync(path.join(debRoot, 'var/lib/sesame-daemon/backends'), { recursive: true });
      for (const entry of fs.readdirSync(path.join(repoRoot, 'backends.example'))) {
        const from = path.join(repoRoot, 'backends.example', entry);
        const to = path.join(debRoot, 'var/lib/sesame-daemon/backends', entry);
        fs.cpSync(from, to, { recursive: true });
      }

      // Service file + defaults (even if we don't use systemd in this test).
      fs.mkdirSync(path.join(debRoot, 'usr/share/sesame-daemon'), { recursive: true });
      fs.copyFileSync(
        path.join(repoRoot, '.debpkg/usr/share/sesame-daemon/sesame-daemon.service'),
        path.join(debRoot, 'usr/share/sesame-daemon/sesame-daemon.service'),
      );
      fs.mkdirSync(path.join(debRoot, 'etc/default'), { recursive: true });
      fs.copyFileSync(
        path.join(repoRoot, '.debpkg/etc/default/sesame-daemon'),
        path.join(debRoot, 'etc/default/sesame-daemon'),
      );

      // Build the .deb inside a Debian container (ensures dpkg-deb availability).
      const debFileName = `sesame-daemon_${pkg.version}_amd64.deb`;
      run(
        [
          'docker run --rm --platform linux/amd64',
          `-v ${JSON.stringify(workDir)}:/work`,
          '-w /work',
          'debian:bookworm-slim bash -lc',
          JSON.stringify(['set -eux', 'apt-get update', 'apt-get install -y dpkg-dev', `dpkg-deb --build .debpkg ${debFileName}`].join(' && ')),
        ].join(' '),
      );

      const debPathOnHost = path.join(workDir, debFileName);
      if (!fs.existsSync(debPathOnHost)) {
        throw new Error(`.deb not found: ${debPathOnHost}`);
      }

      const debPathInContainer = path.join('/tmp/payload', debFileName);

      // Start Debian runtime container.
      run(
        [
          'docker run -d --rm --platform linux/amd64',
          '--name ' + containerName,
          '-v ' + JSON.stringify(workDir) + ':/tmp/payload:ro',
          'debian:bookworm-slim bash -lc "while true; do sleep 3600; done"',
        ].join(' '),
      );

      // Install runtime dependencies + tools.
      dockerExec(
        containerName,
        'apt-get update && apt-get install -y bash ca-certificates procps redis-server',
      );
      dockerExec(containerName, 'redis-server --daemonize yes');

      // Install .deb.
      try {
        dockerExec(containerName, `dpkg -i ${debPathInContainer}`);
      } catch {
        dockerExec(containerName, 'apt-get -f install -y');
        dockerExec(containerName, `dpkg -i ${debPathInContainer}`);
      }

      // Start the daemon directly (systemd is often unavailable in container tests).
      dockerExecCapture(
        containerName,
        'cd /var/lib/sesame-daemon; set -a; . /etc/default/sesame-daemon; set +a; ' +
          'nohup /usr/bin/sesame-daemon </dev/null > /tmp/sesame-daemon.log 2>&1 &',
      );

      // Wait for process to show up and stay up briefly.
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
        const logsHead = dockerExecCapture(containerName, "sed -n '1,400p' /tmp/sesame-daemon.log 2>/dev/null || true");
        const logsTail = dockerExecCapture(containerName, "tail -n 200 /tmp/sesame-daemon.log 2>/dev/null || true");
        const ps = dockerExecCapture(containerName, "ps -ef | grep -v grep | grep -E 'sesame-daemon|node' || true");
        const redisPing = dockerExecCapture(containerName, 'redis-cli ping || true');
        throw new Error(
          'sesame-daemon process is not running.' +
            '\nredis-cli ping: ' +
            redisPing +
            '\nps:\n' +
            ps +
            '\nlogs(head):\n' +
            logsHead +
            '\nlogs(tail):\n' +
            logsTail,
        );
      }
    } finally {
      try {
        run(`docker rm -f ${containerName}`);
      } catch {
        // ignore
      }
    }
  });
});

