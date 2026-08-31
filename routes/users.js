import express from 'express';
import * as Sentry from '@sentry/node';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../utils/prisma.js';
import sendMail from '../utils/sendMail.js';

import { authenticateJWT, authenticateJWTWithRole } from '../utils/utils.js';

const router = express.Router();

// Velden die een gebruiker via PUT /:id op zijn EIGEN profiel mag wijzigen.
// Alles wat hier niet in staat (role, passwordHash, isConfirmed, resetToken,
// resetTokenExpiration, acceptedTerms, pickupAllowed, transmissionPreference,
// id, createdAt, ...) is server-gestuurd en wordt genegeerd. Dit sluit het
// gat waarbij een gewone gebruiker zichzelf tot ADMIN kon maken.
const USER_EDITABLE_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'street',
  'houseNumber',
  'postalCode',
  'city',
  'birthDate',
  'temporaryLicenseExpiration',
];

// GET: Fetch all users
// Only admin needs to be able to fetch all users
// This route is protected by the authenticateJWTWithRole middleware
router.get('/', authenticateJWTWithRole('ADMIN'),async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { firstName: 'asc' }
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching users');
  }
});

// GET: Get a user by ID
// A user may only fetch their OWN record; an admin may fetch anyone.
// This route is protected by the authenticateJWT middleware.
router.get('/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const requestedId = parseInt(id);

  // Ownership check: block reading someone else's data unless you're admin.
  if (req.user.role !== 'ADMIN' && req.user.userId !== requestedId) {
    return res.status(403).send('Forbidden: je kan alleen je eigen gegevens opvragen');
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: requestedId }
    });

    if (!user) {
      return res.status(404).send('User not found');
    }

    res.json(user);
  } catch (error) {
    Sentry.captureException(error);
    console.error(error);
    res.status(500).send('Error fetching user');
  }
});

// PUT: Update a user
// Only admin needs to be able to update users
// This route is protected by the authenticateJWTWithRole middleware
router.put('/dashboard-update', authenticateJWTWithRole('ADMIN'), async (req, res) => {
  try {
    const { id, ...updatedData } = req.body;

    if (!id) {
      return res.status(400).send('ID is required');
    }

    const updatedObject = await prisma.user.update({
      where: {
        id: id
      },
      data: updatedData
    });

    res.json(updatedObject);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating Object');
  }
});

// PUT: Update a user by ID
// A user may only update their OWN profile, and only the fields in
// USER_EDITABLE_FIELDS. Server-gestuurde velden zoals role en passwordHash
// worden altijd genegeerd. Admin-bewerkingen lopen via /dashboard-update.
// This route is protected by the authenticateJWT middleware.
router.put('/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const requestedId = parseInt(id);
  const updatedUser = req.body; // This will contain the fields to update

  // Ownership check: a non-admin can only edit their own record.
  if (req.user.role !== 'ADMIN' && req.user.userId !== requestedId) {
    return res.status(403).send('Forbidden: je kan alleen je eigen gegevens wijzigen');
  }

  try {
    // Fetch the user to ensure they exist
    const user = await prisma.user.findUnique({
      where: { id: requestedId }
    });

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Allowlist: alleen expliciet toegestane velden overnemen. Zo kan een
    // gebruiker nooit role, passwordHash, isConfirmed, resetToken, ... zetten
    // door die simpelweg in de request body mee te sturen.
    const updatedData = {};
    USER_EDITABLE_FIELDS.forEach(key => {
      if (updatedUser[key] !== undefined) {
        updatedData[key] = updatedUser[key];
      }
    });

    // Update the user only with the allowed fields
    const updatedUserData = await prisma.user.update({
      where: { id: requestedId },
      data: updatedData
    });

    // Return the updated user
    res.json({ message: 'User updated successfully', updatedUserData });
  } catch (error) {
    Sentry.captureException(error);
    console.error(error);
    res.status(500).send('Error updating user');
  }
});

// POST: Approve a user
// Only admin can approve users
// This route is protected by the authenticateJWTWithRole middleware
router.post('/:id/approve', authenticateJWTWithRole('ADMIN'),async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });

    if (!user) {
      return res.status(404).send('User not found');
    }

    const generatedPassword = crypto.randomBytes(4).toString('hex');
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        isConfirmed: true,
        passwordHash: hashedPassword,
      },
    });
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Welkom bij Baeyens rijopleiding!',
      text: `Beste ${user.firstName},\nWelkom bij Baeyens Rijopleiding! We hebben een account voor je aangemaakt.Vanaf nu kan je aanmelden op ${process.env.FRONTEND_URL} met je email en het volgende wachtwoord: ${generatedPassword}\n\n      
      Om aan te melden klik je op de blauwe knop 'Mijn rijlessen' op de home-pagina. Je zal doorverwezen worden naar "Mijn Account" waar je rijlessen kan inplannen en bekijken.
      Ook is het mogelijk om je gegevens zoals je wachtwoord nog aan te passen.\n
      
      Met vriendelijke groet,
      Baeyens rijopleiding`,
      html: `<p>Beste ${user.firstName},</p>
        <br/>
       <p>Welkom bij Baeyens Rijopleiding! We hebben een account voor je aangemaakt.</p>
       <p>Vanaf nu kan je aanmelden op <a href="${process.env.FRONTEND_URL}">${process.env.FRONTEND_URL}</a> met je email en het volgende wachtwoord: ${generatedPassword}</p>
       <br/>
       <p>Om aan te melden klik je op de blauwe knop 'Mijn rijlessen' op de home-pagina. Je zal doorverwezen worden naar "Mijn Account" waar je rijlessen kan inplannen en bekijken.</p>
       <p>Ook is het mogelijk om je gegevens zoals je wachtwoord nog aan te passen.</p>
       <br/>
       <p>Met vriendelijke groet,</p>
       <p>Baeyens rijopleiding</p>`,
    };
    await sendMail.sendMail(mailOptions);

    res.json({ message: 'User approved and password sent successfully', updatedUser, mailOptions });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error approving user');
  }
});

// DELETE: Deny a user
// Only admin can deny users
// This route is protected by the authenticateJWTWithRole middleware
router.delete('/:id/deny', authenticateJWTWithRole('ADMIN'),async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'User denied and deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting user');
  }
});

export default router;
