# Image de base Node.js légère
FROM node:lts-alpine

# Répertoire de travail dans le conteneur
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste des fichiers du serveur
COPY . .

# Variable d'environnement (valeur réelle fournie par Docker Compose / docker run -e)
ENV MONGO_URI=mongodb://mongodb:27017/merndb

# Exposer le port de l'API
EXPOSE 9000

# Démarrer l'application
CMD ["npm", "start"]
