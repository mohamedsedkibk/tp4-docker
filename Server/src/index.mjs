import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();  // Charge les variables d'environnement à partir d'un fichier .env

const app = express();

// Middleware pour autoriser les requêtes cross-origin
app.use(cors());

// Middleware pour parser les requêtes JSON
app.use(express.json());

// Connexion à MongoDB via la variable d'environnement MONGO_URI
// (dans Docker Compose, "mongodb" est le nom du service = hostname)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/merndb';

mongoose
  .connect(MONGO_URI)
  .then(() => console.log(`Connecté à MongoDB : ${MONGO_URI}`))
  .catch((err) => console.error('Erreur de connexion MongoDB :', err.message));

// Exemple de route API
app.get('/api/health', (req, res) => {
  const etats = ['déconnecté', 'connecté', 'connexion en cours', 'déconnexion'];
  res.json({
    message: 'API is running',
    mongodb: etats[mongoose.connection.readyState] || 'inconnu',
  });
});

// Démarrer le serveur sur le port 9000
const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
