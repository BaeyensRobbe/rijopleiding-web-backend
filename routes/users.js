import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import sendMail from '../utils/sendMail.js'; 

import { authenticateJWT, authenticateJWTWithRole } from '../utils/utils.js';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/',  async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: {firstName: 'asc'}
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching users');
  }
});

router.get('/:id',authenticateJWT, async (req, res) => {
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

router.put('/:id', async (req, res) => {
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

router.post('/:id/approve', async (req, res) => {
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
      text: `Beste ${user.firstName},
      Je kan vanaf nu inloggen op de website met jouw email en het volgende wachtwoord: ${generatedPassword}
      Wanneer je in logt zal je doorverwezen worden naar "Mijn profiel" waar je rijlessen kan inplannen en bekijken.
      Ook is het mogelijk om je gegevens zoals je wachtwoord nog aan te passen.
      Vriendelijke groeten,
      Baeyens rijopleiding`,
      html: `<p>Beste ${user.firstName},</p>
         <p>Je kan vanaf nu inloggen op de website met jouw email en het volgende wachtwoord: ${generatedPassword}</p>
         <p>Wanneer je in logt zal je doorverwezen worden naar "Mijn profiel" waar je rijlessen kan inplannen en bekijken.</p>
         <p>Ook is het mogelijk om je gegevens zoals je wachtwoord nog aan te passen.</p>
         <p>Vriendelijke groeten,</p>
         <p>Baeyens rijopleiding</p>`,
    };
    console.log(mailOptions);
    await sendMail.sendMail(mailOptions);
    console.log('after sending mail');

    res.json({ message: 'User approved and password sent successfully', updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error approving user');
  }
});

router.delete('/:id/deny', async (req, res) => {
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
