import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ message: 'Location name is required' });
    }

    // Fetch the location from the database based on the 'name' query parameter
    const location = await prisma.location.findFirst({
      where: {
        name: name, 
      },
    });

    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    res.json(location);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching location');
  }
});

export default router;