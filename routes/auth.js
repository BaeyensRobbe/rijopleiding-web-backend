const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const dotenv = require('dotenv');

dotenv.config();

const router = express.Router();

// SECRET KEY voor JWT (te plaatsen in .env bestand)
const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

// Register route (voor het creëren van een nieuwe gebruiker)
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, city, postalCode, street, houseNumber, temporaryLicenseExpiration, pickupAllowed } = req.body;
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        city,
        postalCode,
        street,
        houseNumber,
        country: 'Belgium',
        temporaryLicenseExpiration,
        pickupAllowed
      },
    });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating user');
  }
});

// Login route (voor het inloggen van een gebruiker)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Zoek gebruiker op basis van email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).send('User not found');
    }

    // Vergelijk het ingevoerde wachtwoord met het gehashte wachtwoord
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).send('Invalid credentials');
    }

    // Als het wachtwoord correct is, genereer een JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '1h', // Het token vervalt na 1 uur
    });

    // Verstuur het token naar de client
    res.json({ message: 'Login successful', token });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error logging in');
  }
});

// Middleware om routes te beschermen met JWT
const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).send('Access Denied');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Voeg de gedecodeerde gebruiker toe aan het verzoek
    next(); // Ga verder naar de volgende middleware of route
  } catch (error) {
    console.error(error);
    res.status(401).send('Invalid or expired token');
  }
};

// Voorbeeld van een beveiligde route die alleen toegankelijk is voor ingelogde gebruikers
router.get('/profile', authenticateJWT, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        appointments: true, // This will include appointments in the response
      },
    });

    if (!user) {
      return res.status(404).send('User not found');
    }

    res.json({ profile: user });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching user profile');
  }
});

module.exports = router;
