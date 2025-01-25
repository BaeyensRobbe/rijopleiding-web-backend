const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware instellen
app.use(cors());  // Om CORS-problemen te voorkomen
app.use(express.json());  // Zorg ervoor dat de backend JSON kan verwerken

// Basis route voor testen
app.get('/', (req, res) => {
  res.send('Backend is live!');
});

// Zet de server aan op poort 5000 of zoals aangegeven in .env
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
