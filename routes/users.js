import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import sendMail from '../utils/sendMail.js'; 

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching users');
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

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        isConfirmed: true,
        passwordHash: hashedPassword,
      },
    });

    await sendMail.sendMail(user, generatedPassword);

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
