<p align="center">
  <a href="https://libertech-fr.github.io/sesame-daemon" target="blank"><img src="./static/sesame-logo.svg" width="200" alt="Sesame Logo" /></a>
</p>
<p align="center">Sésame daemon - Synchronisation d'Identités Multi-sources</p>
<br>

## Description

Le **Sesame daemon** est le worker d’exécution de Sésame. Il se connecte à **Redis** et écoute une **queue BullMQ** (par défaut `sesame`). Lorsqu’un job arrive, il exécute l’action demandée via un **backend** (script/exécutable) présent dans un répertoire de backends.

## Architecture (vue rapide)

- **Daemon**: application Python (asyncio, pas d’API HTTP) qui démarre un `Worker` BullMQ (client [`bullmq`](https://pypi.org/project/bullmq/) Python, compatible avec les queues de l’orchestrateur Node).
- **Redis**: broker BullMQ (obligatoire).
- **Backends**: dossiers contenant un `config.yml` décrivant le backend + les exécutables associés.

Ressource: [Figma](https://www.figma.com/file/OplQ0tHFHS5rFz5K6OCgEd/Sesame?type=whiteboard&node-id=0%3A1&t=ZiPEDwJPp0id8frN-1)

## Prérequis

- **Python 3.11+** (CI et binaire en Python 3.12)
- **[uv](https://docs.astral.sh/uv/)** pour gérer les dépendances
- **Redis** accessible depuis le daemon

## Configuration (variables d’environnement)

Les variables effectivement utilisées par le daemon sont dans `src/sesame_daemon/config.py`. Un fichier `.env` dans le répertoire courant est chargé au démarrage (sans écraser les variables déjà définies).

- **`SESAME_REDIS_URI`**: URI Redis (défaut `redis://localhost:6379/0`)
- **`SESAME_NAME_QUEUE`**: nom de la queue BullMQ (défaut `sesame`)
- **`SESAME_BACKENDS_PATH`**: chemin vers le répertoire des backends (défaut `./backends`, relatif au répertoire courant)
- **`SESAME_LOG_LEVEL`**: niveau de logs `fatal|error|warn|info|debug|verbose` (défaut `info`, insensible à la casse)
- **`SESAME_BACKENDS_EXECUTOR_SHELL`**: exécution des scripts via un shell (défaut `true` = `/bin/sh`, `false` = exécution directe, ou chemin d’un shell, ex. `/bin/bash`)
- **`SESAME_ENV`**: `development` empêche l’arrêt du daemon quand Redis devient injoignable (`NODE_ENV` est encore accepté)

Exemple minimal (copie de `.env.example`) :

```bash
SESAME_REDIS_URI=redis://localhost:6379/0
```

## Backends

### Structure attendue

Le daemon **scanne récursivement** `SESAME_BACKENDS_PATH` et charge **uniquement** les fichiers `config.yml`.

Règles de chargement:
- le YAML doit contenir au minimum **`_version`** et **`name`**
- si `path` n’est pas défini, il est automatiquement fixé au **dossier du `config.yml`**
- si une config est invalide, le daemon **s’arrête** (exit 1)

### Exemple de backends

Le dépôt fournit des exemples dans `backends.example/`.

Pour démarrer rapidement:

```bash
cp -R ./backends.example ./backends
```

Puis ajoutez vos backends dans `./backends` (ou pointez `SESAME_BACKENDS_PATH` ailleurs).

## Démarrage en développement (local)

1) Installer:

```bash
uv sync
```

2) Démarrer Redis (ex: en local sur `6379`) puis lancer le daemon:

```bash
export SESAME_REDIS_URI="redis://localhost:6379/0"
uv run sesame-daemon
# ou, avec rechargement automatique :
uv run watchfiles --filter python 'python -m sesame_daemon' src
```

## Environnement de dev via Docker (Makefile)

Le dépôt contient un `Makefile` qui fournit un parcours “container + network dev”.

- **Démarrer Redis + Mongo (si besoin)**:

```bash
make dbs
```

- **Construire l’image**:

```bash
make build
```

- **Installer les dépendances dans le container**:

```bash
make install
```

- **Lancer le daemon en watch mode**:

```bash
make dev
```

## Tests

```bash
uv run pytest
uv run ruff check
```

Les tests d’installation des paquets `.deb` / `.rpm` dans Docker sont désactivés par défaut :

```bash
RUN_DOCKER_DEB_INSTALL_START_TEST=1 uv run pytest tests/docker/test_deb_install_start.py
RUN_DOCKER_RPM_INSTALL_START_TEST=1 uv run pytest tests/docker/test_rpm_install_start.py
```

## Build / packaging

Le workflow de release génère un binaire autonome via [PyInstaller](https://pyinstaller.org) (`sesame-daemon-linux`) et des paquets `.deb` / `.rpm`.

Le binaire est construit dans une image `python:3.12-slim-bullseye` (glibc 2.31) pour fonctionner sur Debian 11/12 et RHEL/Rocky 9 :

```bash
make pkg   # produit ./sesame-daemon-linux
```

Hors Docker, `scripts/build-binary.sh [nom] [dossier]` construit le binaire pour la plateforme courante.

- **Release GitHub (binaire + paquets)**: déclencher le workflow “Release” via GitHub Actions:
  - `https://github.com/Libertech-Fr/sesame-daemon/actions/workflows/release.yml?event=workflow_dispatch`

### Service systemd (paquets)

Les paquets installent un service systemd `sesame-daemon` qui exécute `/usr/bin/sesame-daemon` avec:
- `WorkingDirectory=/var/lib/sesame-daemon`
- un fichier d’environnement optionnel: `/etc/default/sesame-daemon`

Exemple de variables (fichier `/etc/default/sesame-daemon`) :

```bash
SESAME_LOG_LEVEL=INFO
SESAME_REDIS_URI=redis://localhost:6379/0
SESAME_BACKENDS_PATH=/var/lib/sesame-daemon/backends
```

## Licence

Voir `LICENSE`.
