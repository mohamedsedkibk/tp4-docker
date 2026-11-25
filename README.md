# TP4 : Docker et Docker Compose – Application MERN

**Module :** Introduction au DevOps – ISG de Sousse (3ᵉ LIG)
**Projet d'origine :** https://github.com/wiem-kb/MyAppReact

## Liens

- **Projet GitHub :** https://github.com/mohamedsedkibk/tp4-docker
- **Image serveur sur Docker Hub :** https://hub.docker.com/r/mohamedsedkiboukadida/mern-server
- **Image client sur Docker Hub :** https://hub.docker.com/r/mohamedsedkiboukadida/mern-client

Ce TP containerise une application MERN : MongoDB (base de données), Express/Node.js (API, dossier `Server`) et React/Vite (interface, dossier `Client`). Les trois services tournent dans des conteneurs Docker et sont orchestrés avec Docker Compose.

## Structure du projet

```
tp4-docker/
├── Client/                 # Application React (Vite)
│   ├── Dockerfile
│   ├── .dockerignore
│   └── src/App.jsx         # appelle http://localhost:9000/api/health
├── Server/                 # API Express
│   ├── Dockerfile
│   ├── .dockerignore
│   └── src/index.mjs       # connexion MongoDB via MONGO_URI
├── docker-compose.yml
├── Jenkinsfile             # pipeline CI/CD
└── README.md
```

## Prérequis

- Docker Desktop (Windows / macOS) ou Docker Engine (Linux), avec Docker Compose v2
- Git

Vérification :

```bash
docker --version
docker compose version
```

---

## Étape 1 – Cloner le projet

```bash
git clone https://github.com/wiem-kb/MyAppReact.git
cd MyAppReact
```

Le projet contient deux dossiers : `Client` (React) et `Server` (API Express).

> **Remarque :** les dossiers commencent par une majuscule (`Client`, `Server`). Sous Linux, les chemins sont sensibles à la casse, c'est pourquoi les commandes ci-dessous utilisent `./Server` et `./Client`.

## Étape 2 – Créer les Dockerfiles

### a. Serveur (Express) – `Server/Dockerfile`

```dockerfile
FROM node:lts-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV MONGO_URI=mongodb://mongodb:27017/merndb
EXPOSE 9000
CMD ["npm", "start"]
```

| Instruction | Rôle |
|---|---|
| `FROM node:lts-alpine` | Image de base Node.js (version LTS) légère |
| `WORKDIR /app` | Répertoire de travail dans le conteneur |
| `COPY package*.json ./` | Copie `package.json` et `package-lock.json` d'abord, pour profiter du cache Docker |
| `RUN npm install` | Installe les dépendances (express, cors, dotenv, mongoose) |
| `COPY . .` | Copie le reste du code du serveur |
| `ENV MONGO_URI=...` | Valeur par défaut de l'URL MongoDB (remplacée par Docker Compose) |
| `EXPOSE 9000` | Port de l'API |
| `CMD ["npm", "start"]` | Lance `node src/index.mjs` |

Le fichier `Server/.dockerignore` exclut `node_modules` : le dépôt contient un dossier `node_modules` qu'on ne veut pas copier dans l'image, car les dépendances sont réinstallées par `npm install`.

**Variable MONGO_URI :** le serveur lit `process.env.MONGO_URI` et se connecte à MongoDB avec Mongoose (`Server/src/index.mjs`). La route `/api/health` renvoie aussi l'état de la connexion à la base.

Construire l'image :

```bash
docker build -t mern-server ./Server
```

### b. Client (React) – `Client/Dockerfile`

```dockerfile
FROM node:lts-alpine
WORKDIR /app
COPY package*.json ./
RUN rm -f package-lock.json && npm install
COPY . .
RUN npm run build
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

| Instruction | Rôle |
|---|---|
| `RUN rm -f package-lock.json && npm install` | Installe les dépendances. Le `package-lock.json` du dépôt a été généré sous Windows et ne référence que le module natif Windows de rolldown-vite ; on le supprime pour que npm installe la version Alpine (musl). Sans cela, `npm run build` échoue avec « Cannot find native binding » |
| `RUN npm run build` | Compile l'application React pour la production |
| `RUN npm install -g serve` | Installe `serve`, un serveur HTTP léger |
| `EXPOSE 3000` | Port de l'interface |
| `CMD ["serve", "-s", "dist", "-l", "3000"]` | Sert les fichiers compilés sur le port 3000 |

> **Remarque :** le projet utilise **Vite**, qui génère le build dans le dossier `dist/` (et non `build/` comme Create React App). C'est pourquoi on sert `dist`.

Construire l'image :

```bash
docker build -t mern-client ./Client
```

> L'énoncé indique `docker build -t mern-server ./client` pour le client : c'est une coquille, l'image du client doit s'appeler **mern-client**.

Vérifier les images :

```bash
docker images
```

## Étape 3 – Créer un réseau Docker

```bash
docker network create mern-network
docker network ls
```

Un réseau de type *bridge* permet aux conteneurs de communiquer entre eux en utilisant leur nom comme nom d'hôte.

## Étape 4 – Lancer MongoDB

```bash
docker run -d --name mongodb --network mern-network mongo
```

MongoDB n'est pas exposé sur la machine hôte : seul le serveur y accède, via le réseau `mern-network`, à l'adresse `mongodb:27017`.

## Étape 5 – Lancer le serveur et le client

```bash
docker run -d --name server --network mern-network -p 9000:9000 \
  -e MONGO_URI=mongodb://mongodb:27017/merndb mern-server

docker run -d --name client --network mern-network -p 3000:3000 mern-client
```

Vérifications :

```bash
docker ps
docker logs server
```

- API : http://localhost:9000/api/health → `{"message":"API is running","mongodb":"connecté"}`
- Interface : http://localhost:3000 → affiche « API is running »

> Le navigateur appelle l'API sur `localhost:9000`, c'est pourquoi le port 9000 du serveur est publié sur la machine hôte.

### Nettoyage avant Docker Compose

Docker Compose crée des conteneurs portant les mêmes noms (`mongodb`, `server`, `client`). Il faut donc d'abord supprimer ceux de l'étape 5 :

```bash
docker rm -f client server mongodb
docker network rm mern-network
```

## Étape 6 – Docker Compose

Fichier `docker-compose.yml` à la racine du projet :

```yaml
services:
  mongodb:
    image: mongo
    container_name: mongodb
    networks:
      - mern-network

  server:
    build: ./Server
    image: mern-server
    container_name: server
    ports:
      - "9000:9000"
    networks:
      - mern-network
    depends_on:
      - mongodb
    environment:
      - MONGO_URI=mongodb://mongodb:27017/merndb

  client:
    build: ./Client
    image: mern-client
    container_name: client
    ports:
      - "3000:3000"
    networks:
      - mern-network
    depends_on:
      - server

networks:
  mern-network:
    driver: bridge
```

| Service | Configuration |
|---|---|
| `mongodb` | Image `mongo`, conteneur `mongodb`, réseau `mern-network` |
| `server` | Build `./Server`, conteneur `server`, port 9000, dépend de `mongodb`, variable `MONGO_URI` |
| `client` | Build `./Client`, conteneur `client`, port 3000, dépend de `server` |
| `mern-network` | Réseau avec le driver `bridge` |

Dans `MONGO_URI`, le nom d'hôte `mongodb` est le **nom du service** : Docker Compose le résout automatiquement en adresse IP à l'intérieur du réseau.

Lancer l'application :

```bash
docker compose up --build
```

(ou `docker compose up --build -d` pour la lancer en arrière-plan)

Vérifications :

```bash
docker compose ps
docker compose logs server
```

Puis ouvrir http://localhost:3000 et http://localhost:9000/api/health.

Arrêter et supprimer les conteneurs :

```bash
docker compose down
```

## Récapitulatif des commandes

| Action | Commande |
|---|---|
| Construire l'image serveur | `docker build -t mern-server ./Server` |
| Construire l'image client | `docker build -t mern-client ./Client` |
| Créer le réseau | `docker network create mern-network` |
| Lancer MongoDB | `docker run -d --name mongodb --network mern-network mongo` |
| Lancer le serveur | `docker run -d --name server --network mern-network -p 9000:9000 -e MONGO_URI=mongodb://mongodb:27017/merndb mern-server` |
| Lancer le client | `docker run -d --name client --network mern-network -p 3000:3000 mern-client` |
| Tout lancer avec Compose | `docker compose up --build` |
| Tout arrêter | `docker compose down` |

---

## Étape 7 – Pipeline Jenkins (CI/CD)

Le fichier `Jenkinsfile` à la racine automatise tout le processus. Il fonctionne avec Jenkins sous Windows (commandes `bat`) comme sous Linux (commandes `sh`).

| Stage | Action |
|---|---|
| Checkout | Récupère le code depuis GitHub |
| Build Server Image | `docker build -t mern-server -t <user>/mern-server:latest ./Server` |
| Build Client Image | `docker build -t mern-client -t <user>/mern-client:latest ./Client` |
| Push Images to Docker Hub | Connexion à Docker Hub avec les identifiants Jenkins, puis `docker push` des deux images |
| Deploy with Docker Compose | Supprime les anciens conteneurs puis `docker compose up -d` (`docker-compose up -d` sous Windows) |
| Verify | `docker compose ps` (`docker-compose ps` sous Windows) et `docker images` |

### Configuration de Jenkins

1. Plugins nécessaires : **Pipeline**, **Git** et **Credentials Binding** (installés par défaut avec les « plugins suggérés »).
2. La machine Jenkins doit avoir Docker installé et en marche (Docker Desktop sous Windows).
   Sous Windows, Jenkins tourne comme service et ne trouve pas Docker par défaut (erreur « 'docker' n'est pas reconnu »). Il faut ajouter le dossier de Docker au PATH de Jenkins : *Manage Jenkins → System → Global properties → Environment variables* → nom `PATH+DOCKER`, valeur `C:\Users\<utilisateur>\AppData\Local\Programs\DockerDesktop\resources\bin`. Le plugin `docker compose` n'étant pas visible par le service, le Jenkinsfile utilise `docker-compose.exe` (fourni par Docker Desktop) sous Windows.
3. Créer les identifiants Docker Hub : *Manage Jenkins → Credentials → System → Global credentials → Add Credentials*
   - Kind : *Username with password*
   - Username : nom d'utilisateur Docker Hub
   - Password : un *Personal Access Token* Docker Hub (Account settings → Personal access tokens)
   - ID : `dockerhub-cred`
4. Créer le job : *New Item → Pipeline* → dans *Pipeline*, choisir *Pipeline script from SCM* → SCM *Git* → URL du dépôt GitHub → branche `*/main` → Script Path `Jenkinsfile`.
5. Cliquer sur **Build Now**.

À la fin du pipeline :
- les deux images sont publiées sur Docker Hub ;
- les conteneurs `mongodb`, `server` et `client` tournent ;
- l'application est accessible sur http://localhost:3000.

