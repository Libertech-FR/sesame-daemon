<p align="center">
  <a href="http://sesame.github.io/" target="blank"><img src="./static/sesame-logo.svg" width="200" alt="Sesame Logo" /></a>
</p>
<p align="center">Sesame - Un outil de synchronisation des comptes utilisateur</p>
<p align="center">
  <img alt="GitHub all releases" src="https://img.shields.io/github/downloads/libertech-fr/sesame-daemon/total">
  <img alt="GitHub" src="https://img.shields.io/github/license/libertech-fr/sesame-daemon">
  <img alt="GitHub contributors" src="https://img.shields.io/github/contributors/libertech-fr/sesame-daemon">
  <a href="https://github.com/Libertech-Fr/sesame-daemon/actions/workflows/release.yml?event=workflow_dispatch"><img alt="GitHub contributors" src="https://github.com/Libertech-Fr/sesame-daemon/actions/workflows/release.yml/badge.svg"></a>
</p>
<br>

# Sesame - Un outil de synchronisation des comptes utilisateur
## Description

Daemon pour Sesame. Le demon est chargé d'executer les backends sur les ordres de l'orchestrator
## Installation developpement 
un environnement de developpement est donné en docker 

Copiez le dossier ./backends.example dans ./backends et ajouter vos backends dans ce dossier

### Docker 
#### contruisez l'image :
dans ./docker 
````bash
docker-compose build
````
Puis lancer le 
````bash
docker-compose up -d
````
#### Installation 
````bash
docker exec sesame-daemon yarn
````
#### Lancez l'application en mode dev ou debug 
copier .env.example en .env
editer et regler les variable d'environnements 
```
# Host Redis (defaut "redis://localhost:6379/0")
REDIS_URL=redis://localhost:6379/0 

# Chemin des backends par defaut le repertoire backends du projet
#BACKENDS_PATH=

# nom de la queue bullMQ (defaut: 'backend')
#NAME_QUEUE=

# Nom ou chemin du binaire d'exécution du shell (defaut: true)
#BACKENDS_EXECUTOR_SHELL=
```
Vous etes pret
````bash
docker exec sesame-daemon yarn start:dev
````

### complation du daemon en un executable 
Générer une nouvelle release : [ici](https://github.com/Libertech-Fr/sesame-daemon/actions/workflows/release.yml?event=workflow_dispatch)
- via le bouton run workflow

## License


