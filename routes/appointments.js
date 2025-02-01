import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany();
    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching appointments');
  }
});

router.post('/', async (req, res) => {
  try {
    const { timeSlotId, userId, locationId, customPickupStreet, customPickupHouseNumber, customPickupPostalCode, customPickupCity, startTime, endTime } = req.body;
    const appointment = await prisma.appointment.create({
      data: {
        timeSlotId,
        userId,
        locationId,
        customPickupStreet,
        customPickupHouseNumber,
        customPickupPostalCode,
        customPickupCity,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      },
    });

    res.json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating appointment');
  }
});

export default router;
