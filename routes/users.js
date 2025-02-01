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

    await sendMail(user, generatedPassword);

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
