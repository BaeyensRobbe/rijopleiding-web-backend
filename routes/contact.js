import express from 'express';
import { PrismaClient } from '@prisma/client';
import contact from '../utils/sendMail.js';

const router = express.Router();
const prisma = new PrismaClient();

// POST: Send contact email
// No authentication needed for this route
router.post('/', async (req, res) => {
  const { email, subject, message } = req.body;
  if (!email || !subject || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    await contact.contact(req.body.email, req.body.subject, req.body.message);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.log(error);
  }
});

export default router;