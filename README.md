<p align="center">
  <a href="https://libertech-fr.github.io/sesame-daemon" target="blank"><img src="./static/sesame-logo.svg" width="200" alt="Sesame Logo" /></a>
</p>
<p align="center">Sésame daemon - Synchronisation d'Identités Multi-sources</p>
<br>

## Description

Le **Sesame daemon** est le worker d’exécution de Sésame. Il se connecte à **Redis** et écoute une **queue BullMQ** (par défaut `sesame`). Lorsqu’un job arrive, il exécute l’action demandée via un **backend** (script/exécutable) présent dans un répertoire de backends.

## Architecture (vue rapide)

- **Daemon**: application NestJS lancée en *application context* (pas d’API HTTP), qui démarre un `Worker` BullMQ.
- **Redis**: broker BullMQ (obligatoire).
- **Backends**: dossiers contenant un `config.yml` décrivant le backend + les exécutables associés.

Ressource: [Figma](https://www.figma.com/file/OplQ0tHFHS5rFz5K6OCgEd/Sesame?type=whiteboard&node-id=0%3A1&t=ZiPEDwJPp0id8frN-1)

## Prérequis

- **Node.js** (CI en Node 18)
- **Yarn** (le repo est en Yarn v1)
- **Redis** accessible depuis le daemon

## Configuration (variables d’environnement)

Les variables effectivement utilisées par le daemon sont dans `src/config.ts`.

- **`SESAME_REDIS_URI`**: URI Redis (défaut `redis://localhost:6379/0`)
- **`SESAME_NAME_QUEUE`**: nom de la queue BullMQ (défaut `sesame`)
- **`SESAME_BACKENDS_PATH`**: chemin vers le répertoire des backends (défaut `./backends` à côté du code)
- **`SESAME_LOG_LEVEL`**: niveau de logs (défaut `info`)
- **`SESAME_BACKENDS_EXECUTOR_SHELL`**: configuration “shell” d’exécution (défaut: `true`)

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
yarn install
```

2) Démarrer Redis (ex: en local sur `6379`) puis lancer le daemon:

```bash
export SESAME_REDIS_URI="redis://localhost:6379/0"
yarn start:dev
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
yarn test
```

## Build / packaging

Le workflow de release génère un binaire via `pkg` (ex: `sesame-daemon-linux`) et des paquets `.deb` / `.rpm`.

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
