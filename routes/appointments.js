import express from 'express';
import { authenticateJWTWithRole, authenticateJWT } from '../utils/utils.js';
import prisma from '../utils/prisma.js';
import { addAppointmentToCalendar, deleteCalendarEvent } from '../utils/googleCalendar.js';
import { calendar } from 'googleapis/build/src/apis/calendar/index.js';

const router = express.Router();

// GET: Fetch all appointments for the authenticated user
// Only admin needs to fetch be able to fetch all appointments
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

// GET: Fetch all upcoming appointments 
// Only admin needs to fetch be able to fetch all appointments
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

router.post('/appointmentandtimeslot', authenticateJWTWithRole('ADMIN'), async (req, res) => {
  try {
    const { startTime, endTime, selectedUser, location } = req.body;
    if (!startTime || !endTime || !selectedUser || !location) {
      return res.status(400).json({ message: 'Alle velden zijn verplicht.' });
    }
    // Check for overlapping time slots
    const overlappingTimeSlot = await prisma.timeSlot.findFirst({
      where: {
      OR: [
        {
        startTime: {
          lt: new Date(endTime),
        },
        endTime: {
          gt: new Date(startTime),
        },
        }
      ]
      },
    });

    if (overlappingTimeSlot) {
      return res.status(400).json({ message: 'Time slot overlaps with an already existing time slot.' });
    }

    // Create a new time slot
    const newTimeSlot = await prisma.timeSlot.create({
      data: {
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      isVisible: false,
      status: 'BOOKED',
      },
    });

    if (!newTimeSlot) {
      throw new Error('Failed to create time slot');
    }

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
          timeSlotId: newTimeSlot.id,
          customPickupCity: user?.city,
          customPickupPostalCode: user?.postalCode,
          customPickupStreet: user?.street,
          customPickupHouseNumber: user?.houseNumber,
          isExam: false,
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
          timeSlotId: newTimeSlot.id,
          locationId: locationObject?.id,
          customPickupCity: locationObject?.city,
          customPickupPostalCode: locationObject?.postalCode,
          customPickupStreet: locationObject?.street,
          customPickupHouseNumber: locationObject?.houseNumber,
          isExam: false,
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: selectedUser },
      select: { firstName: true, lastName: true },
    });

    try {
      const calendarEventId = await addAppointmentToCalendar(appointment, user);

      // Update the appointment with the calendar event ID
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { calendarEventId: calendarEventId.data.id },
      });
    } catch (calendarError) {
      console.error('Failed to add event to Google Calendar:', calendarError);
      // Optionally continue even if calendar fails
    }

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Fout bij maken van afspraak:', error);
    res.status(500).json({ message: 'Er is een fout opgetreden.', error });
  }
})

// POST: Create a new EXAM appointment
// Only admin needs to create an exam
router.post('/exam', authenticateJWTWithRole('ADMIN'), async (req, res) => {
  try {
    const { startTime, endTime, selectedUser, location } = req.body;

    if (!startTime || !endTime || !selectedUser || !location) {
      return res.status(400).json({ message: 'Alle velden zijn verplicht.' });
    }
    // Check for overlapping time slots
    const overlappingTimeSlot = await prisma.timeSlot.findFirst({
      where: {
      OR: [
        {
        startTime: {
          lt: new Date(endTime),
        },
        endTime: {
          gt: new Date(startTime),
        },
        }
      ]
      },
    });

    if (overlappingTimeSlot) {
      return res.status(400).json({ message: 'Time slot overlaps with an already existing time slot.' });
    }

    // Create a new time slot
    const newTimeSlot = await prisma.timeSlot.create({
      data: {
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      isVisible: false,
      status: 'BOOKED',
      },
    });

    if (!newTimeSlot) {
      throw new Error('Failed to create time slot');
    }

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
          timeSlotId: newTimeSlot.id,
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
          timeSlotId: newTimeSlot.id,
          locationId: locationObject?.id,
          customPickupCity: locationObject?.city,
          customPickupPostalCode: locationObject?.postalCode,
          customPickupStreet: locationObject?.street,
          customPickupHouseNumber: locationObject?.houseNumber,
          isExam: true,
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: selectedUser },
      select: { firstName: true, lastName: true },
    });

    try {
      const calendarEventId = await addAppointmentToCalendar(appointment, user);

      // Update the appointment with the calendar event ID
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { calendarEventId: calendarEventId.data.id },
      });
    } catch (calendarError) {
      console.error('Failed to add event to Google Calendar:', calendarError);
      // Optionally continue even if calendar fails
    }

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Fout bij maken van afspraak:', error);
    res.status(500).json({ message: 'Er is een fout opgetreden.', error });
  }
});

// POST: Create a new appointment
// Only authenticated users can create/book an appointment
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

    const user = await prisma.user.findUnique({
      where: { id: userId },  
      select: { firstName: true, lastName: true },
    });

     try {
      const calendarEventId = await addAppointmentToCalendar(appointment, user);

      // Update the appointment with the calendar event ID
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { calendarEventId: calendarEventId.data.id },
      });
    } catch (calendarError) {
      console.error('Failed to add event to Google Calendar:', calendarError);
      // Optionally continue even if calendar fails
    }



    res.json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating appointment');
  }
});

// 🗑️ DELETE: Cancel an appointment
// Only admin can cancel an appointment
router.delete('/:appointmentId', authenticateJWTWithRole('ADMIN'), async (req, res) => {
  try {
    const { appointmentId } = req.params;

    // Find the appointment and ensure it belongs to the authenticated user
    const appointment = await prisma.appointment.findUnique({
      where: { id: parseInt(appointmentId) },
    });

    const isExamen = appointment?.isExam || false; // Check if the appointment is an exam

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.calendarEventId){
      try {
        await deleteCalendarEvent(appointment.calendarEventId);
      } catch (googleErr) {
        console.error('Failed to delete event from Google Calendar:', googleErr);
      }
    }

    const timeSlotId = appointment.timeSlotId;

    // Delete the appointment
    await prisma.appointment.delete({
      where: { id: parseInt(appointmentId) },
    });
    
    console.log(timeSlotId);
    if (timeSlotId) {
      if (isExamen) {
        await prisma.timeSlot.delete({
          where: { id: timeSlotId },
        });
      } else {
        await prisma.timeSlot.update({
          where: { id: timeSlotId },
          data: { 
            status: 'AVAILABLE',
            isVisible: true,
            appointmentId: null,
          },
        });
      }
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

// PUT: Update an appointment
// Only admin can update an appointment
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
