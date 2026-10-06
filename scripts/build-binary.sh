#!/bin/sh
# Construit le binaire autonome sesame-daemon avec PyInstaller.
# Usage : scripts/build-binary.sh [nom-du-binaire] [dossier-de-sortie]
set -eu

NAME="${1:-sesame-daemon-linux}"
DIST="${2:-.}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

cd "$ROOT"
uv sync --frozen
uv run pyinstaller \
  --onefile \
  --clean \
  --noconfirm \
  --name "$NAME" \
  --copy-metadata sesame-daemon \
  --collect-data bullmq \
  --distpath "$DIST" \
  --workpath "$WORK/build" \
  --specpath "$WORK" \
  src/sesame_daemon/__main__.py
