// utils/googleCalendar.js
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const calendarId = process.env.CALENDAR_EMAIL;

const privateKey = process.env.PRIVATE_KEY
let key;
if (privateKey) {
  key = privateKey.replace(/\\n/g, '\n');
}

const auth = new google.auth.JWT(
  process.env.CLIENT_EMAIL,
  undefined,
  key,
  SCOPES
);

const calendar = google.calendar({ version: 'v3', auth });

async function addAppointmentToCalendar(appointment, user) {
  const event = {
    summary: (appointment.isExam ? 'Examen' : 'Rijles') + ` - ${user.firstName} ${user.lastName}`,
    start: {
      dateTime: appointment.startTime.toISOString(),
      timeZone: 'Europe/Amsterdam',
    },
    end: {
      dateTime: appointment.endTime.toISOString(),
      timeZone: 'Europe/Amsterdam',
    },
    location: appointment.location
      ? appointment.location
      : appointment.customPickupStreet
        ? `${appointment.customPickupStreet} ${appointment.customPickupHouseNumber}, ${appointment.customPickupPostalCode} ${appointment.customPickupCity}`
        : 'Baeyens Rijopleiding',
  };

  return calendar.events.insert({
    calendarId,
    requestBody: event,
  });

  
}

async function deleteCalendarEvent(eventId) {
  try {
    await calendar.events.delete({
      calendarId,
      eventId,
    });
    console.log('Event deleted from Google Calendar:', eventId);
  } catch (error) {
    console.error('Error deleting event from Google Calendar:', error);
  }
}

module.exports = { addAppointmentToCalendar, deleteCalendarEvent };
