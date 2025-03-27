import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { authenticateJWTWithRole, authenticateJWT } from '../utils/utils.js';

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';
const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

router.get('/', authenticateJWTWithRole('ADMIN'), async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
        location: {
          select: { name: true },
        }
      }
    });

    appointments.forEach(appointment => {
      if (!appointment.location) {
        appointment.location = { name: 'Thuis' };
      }
    });

    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching appointments');
  }
});

router.get('/upcoming', authenticateJWTWithRole('ADMIN'),async (req, res) => {
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
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
        location: {
          select: { name: true },
        }
      }
    });

    appointments.forEach(appointment => {
      if (!appointment.location) {
        appointment.location = { name: 'Thuis' };
      }
    });
    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching appointments');
  }
});

router.post('/exam', authenticateJWTWithRole('ADMIN'), async (req, res) => {
  try {
    const { startTime, endTime, selectedUser, location } = req.body;

    if (!startTime || !endTime || !selectedUser || !location) {
      return res.status(400).json({ message: 'Alle velden zijn verplicht.' });
    }
    const response = await fetch(`${backendUrl}/timeslots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        isVisible: false,
        status: 'BOOKED',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create time slot');
    }

    const timeSlot = await response.json();
    let appointment = {};
    // Create a new Appointment linked to the TimeSlot and User
    if (location === 'Thuis ophalen') {
      const user = await prisma.user.findUnique({
        where: { id: selectedUser },
      });
      appointment = await prisma.appointment.create({
        data: {
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          userId: selectedUser,
          timeSlotId: timeSlot.id,
          customPickupCity: user?.city,
          customPickupPostalCode: user?.postalCode,
          customPickupStreet: user?.street,
          customPickupHouseNumber: user?.houseNumber,
          isExam: true,
        },
      });

    } else {
      const locationObject = await prisma.location.findFirst({
        where: { name: location },
      });
      appointment = await prisma.appointment.create({
        data: {
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          userId: selectedUser,
          timeSlotId: timeSlot.id,
          locationId: locationObject?.id,
          customPickupCity: locationObject?.city,
          customPickupPostalCode: locationObject?.postalCode,
          customPickupStreet: locationObject?.street,
          customPickupHouseNumber: locationObject?.houseNumber,
          isExam: true,
        },
      });
    }

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Fout bij maken van afspraak:', error);
    res.status(500).json({ message: 'Er is een fout opgetreden.', error });
  }
});



router.post('/', authenticateJWT, async (req, res) => {
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

router.get('/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: parseInt(id) }
    });

    if (!appointment) {
      return res.status(404).send('Appointment not found');
    }

    res.json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching appointment');
  }
});

router.put('/dashboard-update', authenticateJWTWithRole('ADMIN'), async (req, res) => {
  try {
    const { id, ...updatedData } = req.body;

    if (!id) {
      return res.status(400).send('ID is required');
    }

    console.log('Updated Data: ', updatedData);

    const { location, ...filteredData } = updatedData; // Exclude location from updatedData
    
    const updatedObject = await prisma.appointment.update({
      where: {
      id: id
      },
      data: filteredData
    });

    res.json(updatedObject);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating Object');
  }
});


export default router;
