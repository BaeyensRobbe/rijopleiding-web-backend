import express from 'express';
import prisma from '../utils/prisma.js';

import { authenticateJWTWithRole } from '../utils/utils.js';

const router = express.Router();

// Update a registration
router.put('/:id', authenticateJWTWithRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await prisma.course_registration.update({
      where: { id: parseInt(id) },
      data: req.body
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating registration');
  }
});

// Delete a registration
router.delete('/:id', authenticateJWTWithRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.course_registration.delete({
      where: { id: parseInt(id) }
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting registration');
  }
});

export default router;