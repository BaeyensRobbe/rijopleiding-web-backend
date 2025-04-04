import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import sendMail from '../utils/sendMail.js';

import { authenticateJWT, authenticateJWTWithRole } from '../utils/utils.js';

const router = express.Router();
const prisma = new PrismaClient();

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
// Only authenticated users can access their own data
// This route is protected by the authenticateJWT middleware
router.get('/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!user) {
      return res.status(404).send('User not found');
    }

    res.json(user);
  } catch (error) {
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
// Only authenticated users can update their own data
// This route is protected by the authenticateJWT middleware
router.put('/:id', authenticateJWT,async (req, res) => {
  const { id } = req.params;
  const updatedUser = req.body; // This will contain the fields to update

  try {
    // Fetch the user to ensure they exist
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Create a new object with the fields to be updated
    const updatedData = {};

    // Only include the fields that exist in updatedUser
    Object.keys(updatedUser).forEach(key => {
      if (updatedUser[key] !== undefined && key !== 'appointments') {
        updatedData[key] = updatedUser[key];
      }
    });

    // Update the user only with the provided fields
    const updatedUserData = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updatedData
    });

    // Return the updated user
    res.json({ message: 'User updated successfully', updatedUserData });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating user');
  }
});

// POST: Approve a user
// Only admin can approve users
// This route is protected by the authenticateJWTWithRole middleware
router.post('/:id/approve', authenticateJWTWithRole('ADMIN'),async (req, res) => {
  console.log('approve request has been callled');
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });

    if (!user) {
      return res.status(404).send('User not found');
    }

    const generatedPassword = crypto.randomBytes(4).toString('hex');
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);
    console.log('before update');
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        isConfirmed: true,
        passwordHash: hashedPassword,
      },
    });
    console.log('before mailoptions');
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
    console.log(mailOptions);
    await sendMail.sendMail(mailOptions);
    console.log('after sending mail');

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
