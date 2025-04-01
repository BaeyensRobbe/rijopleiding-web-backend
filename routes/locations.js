import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, authenticateJWTWithRole } from '../utils/utils.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET: Fetch all locations
// Only authenticated users can access this route
// This route is protected by the authenticateJWT middleware
router.get('/', authenticateJWT,async (req, res) => {
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

// GET: Fetch a location by ID
// Only admin can access this route, used for editing appointment location
// This route is protected by the authenticateJWTWithRole middleware
router.get('/:id', authenticateJWTWithRole('ADMIN'),async (req, res) => {
  const { id } = req.params;
  try {
    const location = await prisma.location.findUnique({
      where: { id: parseInt(id) },
    });

    if (!location) {
      return res.status(404).json({ message: 'Location not found' });  // Returning JSON in case of not found
    }

    res.json(location);  // Send location as JSON
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching location', error: error.message });  // Return error in JSON
  }
});

// GET: Fetch a location by name
// Only admin can access this route, used for editing appointment location
// This route is protected by the authenticateJWTWithRole middleware
router.get('/name/:name', authenticateJWTWithRole('ADMIN'),async (req, res) => {
  const { name } = req.params;
  try {
    const location = await prisma.location.findFirst({
      where: { name: name },
    });

    if (!location) {
      return res.status(404).json({ message: 'Location not found' });  // Returning JSON in case of not found
    }

    res.json(location);  // Send location as JSON
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching location', error: error.message });  // Return error in JSON
  }
});

export default router;