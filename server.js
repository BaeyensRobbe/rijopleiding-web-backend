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
import emailRoutes from './routes/emailTest.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Use route files
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/timeslots', timeslotRoutes);
app.use('/locations', locationRoutes);
app.use('/contact', contactRoutes);
app.use('/course', courseRoutes);
app.use('/test', emailRoutes);

app.get('/', (req, res) => {
  res.send('Backend is live!');
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
