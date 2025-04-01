import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWTWithRole, authenticateJWT } from '../utils/utils.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET: Fetch all timeslots
// Only admin needs to fetch be able to fetch all timeslots
// This route is protected by the authenticateJWTWithRole middleware
router.get('/', authenticateJWTWithRole('ADMIN'),async (req, res) => {
  try {
    const timeslots = await prisma.timeSlot.findMany({ orderBy: { startTime: 'asc' } });
    res.json(timeslots);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching timeslots');
  }
});

// GET: Fetch all upcoming timeslots
// Only admin needs to fetch be able to fetch all timeslots
// This route is protected by the authenticateJWTWithRole middleware
router.get('/upcoming', authenticateJWTWithRole('ADMIN'),async (req, res) => {
  try {
    const now = new Date();
    const timeslots = await prisma.timeSlot.findMany({
      where: {
        startTime: {
          gt: now, // Fetch only appointments with a startTime greater than the current time
        },
      },
      orderBy: {
        startTime: 'asc', // Sort by startTime in ascending order
      },
    });
    res.json(timeslots);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching timeslots');
  }
});

// POST: Create a new timeslot
// Only admin needs to be able to create a new timeslot
// This route is protected by the authenticateJWTWithRole middleware
router.post('/', authenticateJWTWithRole('ADMIN'), async (req, res) => {
  try {
    const { startTime, endTime, isVisible, status } = req.body;

    console.log('Start Time:', startTime);
    console.log('End Time:', endTime);

    const isoStartTime = new Date(startTime);
    const isoEndTime = new Date(endTime).toISOString();

    console.log('ISO Start Time:', isoStartTime);
    console.log('ISO End Time:', isoEndTime);

    const overlappingTimeslot = await prisma.timeSlot.findFirst({
      where: {
      OR: [
        {
        startTime: {
          lt: endTime,
        },
        endTime: {
          gt: startTime,
        },
        },
        {
        startTime: {
          lt: endTime,
        },
        endTime: {
          gt: startTime,
        },
        },
      ],
      NOT: [
        {
        startTime: endTime,
        },
        {
        endTime: startTime,
        },
      ],
      },
    });

    if (overlappingTimeslot) {
      console.log('Overlapping timeslot:', overlappingTimeslot);
      return res.status(400).json(`Deze uren overlappen met het tijdsslot van ${new Date(overlappingTimeslot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(overlappingTimeslot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    }

    // Strip milliseconds from startTime and endTime by setting milliseconds to 0
    const start = new Date(startTime);
    const end = new Date(endTime);

    start.setMilliseconds(0);
    end.setMilliseconds(0);

    const timeslot = await prisma.timeSlot.create({
      data: {
        startTime: start,
        endTime: end,
        isVisible,
        status,
      },
    });

    res.json(timeslot);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating timeslot');
  }
});

// GET: Fetch all available timeslots
// Only authenticated users can access this route
// This route is protected by the authenticateJWT middleware
router.get('/available', authenticateJWT, async (req, res) => {
  try {
    const now = new Date();

    const timeslots = await prisma.timeSlot.findMany({
      where: {
        status: 'AVAILABLE',
        isVisible: true,
        startTime: {
          gte: now,
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
    res.json(timeslots);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching timeslots');
  }
});

// GET: Fetch a timeslot by startTime
// Only admin can access this route, used for editing appointment location
// This route is protected by the authenticateJWTWithRole middleware
router.get('/byId', authenticateJWTWithRole('ADMIN'), async (req, res) => {
  try {
    const { startTime } = req.query;

    if (!startTime) {
      return res.status(400).json({ message: 'Start time is required' });
    }

    console.log('Start Time:', startTime);

    // Parse the startTime string into a JavaScript Date object
    const parsedStartTime = new Date(startTime);

    // Ensure the parsed start time is valid
    if (isNaN(parsedStartTime.getTime())) {
      return res.status(400).json({ message: 'Invalid start time format' });
    }

    // Fetch the timeSlot from the database based on the parsed startTime
    const timeSlot = await prisma.timeSlot.findFirst({
      where: {
        startTime: parsedStartTime, // Compare with the actual Date object
      },
    });

    if (!timeSlot) {
      return res.status(404).json({ message: 'TimeSlot not found' });
    }

    res.json(timeSlot);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching timeslot');
  }
});

// PUT: Update a timeslot
// Only authenticated users can access this route, used for booking a timeslot / appointment
// This route is protected by the authenticateJWT middleware
router.put('/book/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const timeSlot = await prisma.timeSlot.findUnique({ where: { id: parseInt(id) } });

    if (!timeSlot) {
      return res.status(404).json({ message: 'TimeSlot not found' });
    }

    const updatedTimeSlot = await prisma.timeSlot.update({
      where: { id: parseInt(id) },
      data: {
        isVisible: false,
        status: 'BOOKED',
      },
    });

    res.json(updatedTimeSlot);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating timeslot');
  }
});

// DELETE: Delete a timeslot
// Only admin can access this route, used for deleting a timeslot
// This route is protected by the authenticateJWTWithRole middleware
router.delete('/:id', authenticateJWTWithRole('ADMIN'),async (req, res) => {
  try {
    const { id } = req.params;

    const timeSlot = await prisma.timeSlot.findUnique({ where: { id: parseInt(id) } });

    if (!timeSlot) {
      return res.status(404).json({ message: 'TimeSlot not found' });
    }

    await prisma.timeSlot.delete({ where: { id: parseInt(id) } });

    res.json({ message: 'TimeSlot deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting timeslot');
  }
});

// GET: Fetch a timeslot by ID
// Only admin can access this route
// This route is protected by the authenticateJWTWithRole middleware
router.get('/:id', authenticateJWTWithRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  try {
    const timeslot = await prisma.timeSlot.findUnique({
      where: { id: parseInt(id) }
    });

    if (!timeslot) {
      return res.status(404).send('Timeslot not found');
    }

    res.json(timeslot);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching timeslot');
  }
});

// PUT: Update a timeslot
// Only admin can access this route
// This route is protected by the authenticateJWTWithRole middleware
router.put('/dashboard-update', authenticateJWTWithRole('ADMIN'), async (req, res) => {
  try {
    const { id, ...updatedData } = req.body;

    if (!id) {
      return res.status(400).send('ID is required');
    }

    console.log('Updated Data: ', updatedData);

    const updatedObject = await prisma.timeSlot.update({
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

export default router;
