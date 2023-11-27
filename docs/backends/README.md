# Structure d'un backend
## Architecture
Un repertoire doit etre mise dans backends
avec dedans : 
* un fichier de configuration (config.yml)
* un repertoire bin comprenant les scripts
* un repertoire etc optionnel peut aussi etre créé pour mettre les fichiers de configuration des scripts

```
./nomDuBackend
./nomDuBackend/config.yml
./nomDuBackend/bin/
```
A NOTER : Les backends seront executé tour à tour par ordre aphabétique
## Fichier de configuration config.yml
```yaml
name: 'dummy'
description: 'Dummy backend for tests'
active: 1
actions:
  CHANGEPWD:
    exec: "dummy.sh"
    onError: 'stop'
  RESETPWD:
    exec: "dummy.sh"
    onError: 'stop'
  ADDIDENT:
    exec: 'dummy.sh'
    onError: 'continue'
  UPDATEIDENT:
    exec: 'dummy.sh'
    onError: 'continue'
  DELIDENT:
    exec: 'dummy.sh'
    onError: 'continue'


```
Le fichier de configuration doit comprendre : 
* name : le nom du backend
* description : sa description 
* active : 0|1 0 le backend sera ignoré
* actions : un tableau decrivant les actions 
    * **CHANGEPWD** : exec sera executé sur l ordre de changement de mot de passe
    * **RESETPWD** : exec sera executé sur ordre de reset de mot de passe
    * **ADDIDENT** : exec sera executé sur l ordre de l'ajout d'une identite
    * **UPDATEIDENT** : exec sera executé sur l ordre  de modification d'une identite
    * **DELIDENT** : exec sera executé sur l ordre de suppression d'une identite
    * Chaque action doit comprendre : 
      * exec: le script qui sera executé (sans le path). Ce script doit être dans le répertoire bin du backend
      * onError : 'continue'|'stop Si une erreur se produit on arrete (stop) tout l'execution des backend ou on passe au suivant (continue)
      

## Communication avec le script 
Le script recevera les données sur son entrée standard (STDIN) sous la forme d'une chaine json.
Il redonnera le resultat sur sa sortie standard (STDOUT) et si il y a une erreur sur la sortie erreur (STDERR)
le code d'erreur qu il doit fournir au demon : 
* 0 : OK 
* 1 : declenchera sur l'api une erreur de type 401
* 2 : déclenchera sur l'api une erreur de type 403 
* ... : declenchera une erreur 500

Exemple de script bash : 
```bash
#!/bin/bash
echo "Hello Word"
sleep 2
echo "j'ai recu :"
cat -
echo "je provoque une erreur " >&2
exit 3
```