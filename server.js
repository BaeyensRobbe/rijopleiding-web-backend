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

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    'https://rijopleiding-web-frontend.vercel.app', 
    'https://rijopleiding-web-frontend-two.vercel.app',
    'http://localhost:3000',
    'https://baeyensrijopleiding.be',
    'rijopleiding-web-frontend-git-master-robbe-baeyens-projects.vercel.app',
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

app.get('/', (req, res) => {
  res.send('Backend is live!');
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
