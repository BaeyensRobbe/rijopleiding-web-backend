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
    const { firstName, lastName, email, phone, city, postalCode, street, houseNumber, temporaryLicenseExpiration, pickupAllowed, acceptedTerms } = req.body;
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
        pickupAllowed,
        acceptedTerms
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

  console.log('token here:', token);

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

router.post('/change-password', authenticateJWT, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    console.log('oldPassword:', oldPassword);
    console.log('newPassword:', newPassword);

    if (!oldPassword || !newPassword) {
      return res.status(400).send('Old and new passwords are required');
    }

    // Fetch the user from the database based on the userId from the JWT token
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    console.log('user:', user);

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Compare the old password with the hashed password stored in the database
    if (!user.passwordHash) {
      return res.status(400).send('User has no password set');
    }
    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    console.log('oldPassword:', oldPassword);
    console.log('passwordHash: ', user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).send('Old password is incorrect');
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    // Update the user's password in the database
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedNewPassword, // Update with the new hashed password
      },
    });

    res.json({ message: 'Password successfully updated', user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating password');
  }
});

module.exports = router;
