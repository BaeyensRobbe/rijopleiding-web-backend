import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const timeslots = await prisma.timeSlot.findMany({ orderBy: { startTime: 'asc' } });
    res.json(timeslots);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching timeslots');
  }
});

router.post('/', async (req, res) => {
  try {
    const { startTime, endTime, isVisible, status } = req.body;

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


router.get('/available', async (req, res) => {
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

router.get('/byId', async (req, res) => {
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

router.put('/book/:id', async (req, res) => {
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

router.delete('/:id', async (req, res) => {
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

export default router;
