import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

router.get('/', async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany();
    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching appointments');
  }
});

router.get('/upcoming', async (req, res) => {
  try {
    const now = new Date();
    const appointments = await prisma.appointment.findMany({
      where: {
        startTime: {
          gt: now, // Fetch only appointments with a startTime greater than the current time
        },
      },
      orderBy: {
        startTime: 'asc', // Sort by startTime in ascending order
      },
    });
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

const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Access Denied' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attach the user info to the request object
    next(); // Continue with the request
  } catch (error) {
    console.error('JWT Error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// 🗑️ DELETE: Cancel an appointment
router.delete('/:appointmentId', authenticateJWT, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user.userId; // Extract user ID from JWT

    // Find the appointment and ensure it belongs to the authenticated user
    const appointment = await prisma.appointment.findUnique({
      where: { id: parseInt(appointmentId) },
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    const timeSlotId = appointment.timeSlotId;

    // Delete the appointment
    await prisma.appointment.delete({
      where: { id: parseInt(appointmentId) },
    });
    
    console.log(timeSlotId);
    if (timeSlotId) {
      await prisma.timeSlot.update({
        where: { id: timeSlotId },
        data: { 
          status: 'AVAILABLE',
          isVisible: true,
          appointmentId: null,
         },
      });
    }

    return res.status(200).json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
