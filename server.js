// Sentry wordt via `node --import ./instrument.js` geladen (zie package.json
// "start"), want in ESM worden alle imports gehoist en zou deze regel pas na
// express draaien — dan blijft express oninstrumenteerd. Deze import blijft
// staan als vangnet wanneer iemand `node server.js` rechtstreeks draait.
import './instrument.js';
import * as Sentry from '@sentry/node';

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import appointmentRoutes from './routes/appointments.js';
import timeslotRoutes from './routes/timeslots.js';
import locationRoutes from './routes/locations.js';
import contactRoutes from './routes/contact.js';
import courseRoutes from './routes/course.js';
import courseRegistrationRoutes from './routes/course-registrations.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    'https://rijopleiding-web-frontend.vercel.app', 
    'https://rijopleiding-web-frontend-two.vercel.app',
    'http://localhost:3000',
    'https://baeyensrijopleiding.be',
    'rijopleiding-web-frontend-git-master-robbe-baeyens-projects.vercel.app',
    'https://rijopleiding-web-frontend-robbe-baeyens-projects.vercel.app'
  ],
  methods: ['POST', 'GET', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Use route files
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/timeslots', timeslotRoutes);
app.use('/locations', locationRoutes);
app.use('/contact', contactRoutes);
app.use('/course', courseRoutes);
app.use('/course-registrations', courseRegistrationRoutes);
app.get('/', (req, res) => {
  res.send('Backend is live!');
});

// Sentry error handler: moet NA alle routes komen, maar VOOR andere
// error-middleware. Vangt elke fout die uit een route omhoog borrelt en
// stuurt die naar je Sentry dashboard (en dus naar je telefoon).
Sentry.setupExpressErrorHandler(app);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
