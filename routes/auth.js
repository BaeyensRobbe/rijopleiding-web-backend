import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import crypto from 'crypto';
import sendMail from '../utils/sendMail.js';

import { authenticateJWT } from '../utils/utils.js';

const prisma = new PrismaClient();

dotenv.config();

const router = express.Router();

// SECRET KEY voor JWT (te plaatsen in .env bestand)
const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

// POST: Registratie van een nieuwe gebruiker
// Deze route is toegankelijk voor iedereen
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, city, postalCode, street, houseNumber, birthDate, temporaryLicenseExpiration, pickupAllowed, acceptedTerms } = req.body;
    
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
      birthDate,
      temporaryLicenseExpiration,
      pickupAllowed: pickupAllowed,
      acceptedTerms,
      },
    });

    if (user) {
      const loginUrl = `${process.env.FRONTEND_URL}/authentication/login`;
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_RIJOPLEIDING,
        subject: 'Er is een nieuwe gebruiker geregistreerd',
        html: `
          <p>Dag Sieg,</p>
          <p>Er is een nieuwe gebruiker geregistreerd:</p>
          <p>Naam: ${user.firstName} ${user.lastName}</p>
          <p>Email: ${user.email}</p>
          <p>Telefoonnummer: ${user.phone}</p>
          <p>Login via: ${loginUrl}/</p>
        `,
      };
  
      // Send the reset password email
      await sendMail.sendMail(mailOptions);
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating user');
  }
});

// GET: Controleer of een email al bestaat in de database
// Deze route is toegankelijk voor iedereen (bijvoorbeeld voor registratie)
router.get('/check-email', async (req, res) => {
  const { email } = req.query;
  
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (user) {
      return res.json({ exists: true }); // Email already exists
    }
    return res.json({ exists: false }); // Email doesn't exist
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Inloggen van een gebruiker
// Deze route is toegankelijk voor iedereen
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
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: '1h', // Het token vervalt na 1 uur
    });

    // Verstuur het token naar de client
    res.json({ message: 'Login successful', token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error logging in');
  }
});

// GET: Ophalen van de profielinformatie van de ingelogde gebruiker
// Deze route is beveiligd met JWT-authenticatie
// Alleen ingelogde gebruikers kunnen hun profielinformatie ophalen
router.get('/profile', authenticateJWT, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
      appointments: {
        include: {
        location: {
          select: {
          name: true,
          },
        }
        
        },
        orderBy: {
          startTime: 'asc',
        },
      },
      },
    });

    if (!user) {
      return res.status(404).send('User not found');
    }

    user.appointments.forEach(appointment => {
      if (!appointment.location) {
        appointment.location = { name: 'Thuis' };
      }
    });

    res.json({ profile: user });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching user profile');
  }
});

// POST: Wijzig wachtwoord van de ingelogde gebruiker
// Deze route is beveiligd met JWT-authenticatie
// Alleen ingelogde gebruikers kunnen hun wachtwoord wijzigen
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

// POST: Reset wachtwoord
// Deze route is toegankelijk voor iedereen
// Gebruikers kunnen hun wachtwoord resetten met een token dat naar hun e-mailadres is verzonden 
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).send('Token and new password are required');
    }

    // Find the user by the reset token
    const user = await prisma.user.findFirst({
      where: { resetToken: token },
    });

    if (!user) {
      return res.status(404).send('Invalid token or user not found');
    }

    // Check if the reset token has expired
    const tokenExpiration = user.resetTokenExpiration ? new Date(user.resetTokenExpiration) : null;
    const currentTime = new Date();

    if (tokenExpiration === null) {
      return res.status(400).send('No reset token found for this user');
    }

    if (currentTime > tokenExpiration) {
      return res.status(400).send('The password reset token has expired');
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    // Update the user's password in the database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedNewPassword,
        resetToken: null, // Clear the reset token after it's used
        resetTokenExpiration: null, // Clear the expiration date after it's used
      },
    });

    res.json({ message: 'Password successfully reset' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error resetting password');
  }
});



const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// POST: Verzoek om wachtwoord reset
// Deze route is toegankelijk voor iedereen
// Gebruikers kunnen een verzoek indienen om hun wachtwoord te resetten door hun e-mailadres op te geven
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).send('Er is nog geen account met dit e-mailadres geregistreerd');
    }

    if (user.isConfirmed === false) {
      return res.status(403).send('Je account is nog niet bevestigd. Wanneer je account bevestigd is, krijg je een e-mail met een wachtwoord. Neem contact op voor meer informatie.');
    }

    const resetToken = generateResetToken();
    const resetTokenExpiration = new Date(Date.now() + 3600000); // Token expires in 1 hour
    console.log('resetToken:', resetToken);

    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiration,
      },
    });

    const resetUrl = `${process.env.FRONTEND_URL}/authentication/reset-password?token=${resetToken}`;
    const contactUrl = `${process.env.FRONTEND_URL}/contact`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verzoek om wachtwoord te resetten',
      text: `Beste ${user.firstName},\nJe hebt aangegeven je wachtwoord van Baeyens Rijopleiding te zijn vergeten.\nKlik op de volgende link om je wachtwoord te herstellen:${resetUrl}\nAls je geen verzoek hebt gedaan om je wachtwoord te herstellen, neem dan contact op via ${contactUrl}\nMet vriendelijke groet,\nBaeyens Rijopleiding`,
      html: `
      <p>Beste ${user.firstName},</p>
      <br/>
      <p>Je hebt aangegeven je wachtwoord van Baeyens Rijopleiding te zijn vergeten.</p>
      <p>Klik op de volgende link om je wachtwoord te herstellen:</p>
 
      <p><a href="${resetUrl}">Stel wachtwoord opnieuw in</a></p>

      <p>Als je geen verzoek hebt gedaan om je wachtwoord te herstellen, neem dan contact op via ${contactUrl}</p>
      <br/>
      <p>Met vriendelijke groet,</p>
      <p>Baeyens Rijopleiding</p>
      `,
    };

    // Send the reset password email
    await sendMail.sendMail(mailOptions);

    // Respond to the client with a success message
    res.json({
      message: 'A password reset link has been sent to your email address.',
    });
  } catch (error) {
    console.error('error: ', error);
    res.status(500).send('Er is iets fout gegaan bij het versturen van de e-mail, neem contact op met de beheerder');
  }
});

export default router;
