import prisma from './prisma.js';

const ADJACENT_WINDOW_MS = 20 * 60 * 1000; // 20 minutes

/**
 * Recomputes TransmissionOptions for every future AVAILABLE timeslot.
 * Call this after any mutation to appointments or timeslots.
 */
export async function recomputeAllTransmissions() {
  const now = new Date();

  const slots = await prisma.timeSlot.findMany({
    where: {
      status: 'AVAILABLE',
      startTime: { gte: now },
    },
  });

  await Promise.all(slots.map(slot => recomputeSlotTransmission(slot)));
}

/**
 * Recomputes and saves TransmissionOptions for a single timeslot based on
 * booked appointments adjacent to it (within 20 minutes before or after).
 *
 * - One transmission type found → lock to that type
 * - Multiple types or none → clear the restriction (both allowed)
 */
export async function recomputeSlotTransmission(slot) {
  const slotStart = new Date(slot.startTime);
  const slotEnd = new Date(slot.endTime);

  const adjacentAppointments = await prisma.appointment.findMany({
    where: {
      OR: [
        {
          // Appointment ending just before this slot starts
          endTime: {
            gte: new Date(slotStart.getTime() - ADJACENT_WINDOW_MS),
            lte: slotStart,
          },
        },
        {
          // Appointment starting just after this slot ends
          startTime: {
            gte: slotEnd,
            lte: new Date(slotEnd.getTime() + ADJACENT_WINDOW_MS),
          },
        },
      ],
    },
    select: { transmissionChosen: true },
  });

  const types = [...new Set(
    adjacentAppointments
      .map(a => a.transmissionChosen)
      .filter(Boolean)
  )];

  const newOptions = types.length === 1 ? [types[0]] : [];

  await prisma.timeSlot.update({
    where: { id: slot.id },
    data: { TransmissionOptions: { set: newOptions } },
  });
}
