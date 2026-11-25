# Image de base Node.js légère
FROM node:lts-alpine

# Répertoire de travail dans le conteneur
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
# Le package-lock.json du dépôt a été généré sous Windows : il ne contient que le
# module natif Windows de rolldown-vite. On le supprime pour que npm installe
# la version Linux/Alpine (musl), sinon "npm run build" échoue.
RUN rm -f package-lock.json && npm install

# Copier le reste des fichiers du client
COPY . .

# Construire l'application React (Vite génère le dossier dist/)
RUN npm run build

# Installer un serveur HTTP léger
RUN npm install -g serve

# Exposer le port 3000
EXPOSE 3000

# Servir les fichiers de build
CMD ["serve", "-s", "dist", "-l", "3000"]
