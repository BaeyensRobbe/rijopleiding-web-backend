import express from 'express';
import { PrismaClient } from '@prisma/client';
import sendMail from '../utils/sendMail.js';
import { formatDate, formatTime } from '../utils/utils.js';
import ExcelJS from 'exceljs';

import { authenticateJWT ,authenticateJWTWithRole } from '../utils/utils.js';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticateJWTWithRole('ADMIN'),async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        Course_registration: {
          select: { firstName: true, lastName: true }
        }
      }
    });
    
    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching courses');
  }
});

router.get('/available', authenticateJWT, async (req, res) => {
  try {
    const currentDate = new Date();
    const courses = await prisma.course.findMany({
      where: {
        startTime: {
          gt: currentDate
        }
      },
      include: {
        Course_registration: {
          select: { firstName: true, lastName: true, RegistrationRole: true }
        }
      }
    });

    const availableCourses = courses
      .map(course => {
        const totalRegistrations = course.Course_registration.length;
        const begeleiderCount = course.Course_registration.filter(reg => reg.RegistrationRole === 'BEGELEIDER').length;

        const totalAvailablePlaces = 24 - totalRegistrations;
        const availableBegeleiderPlaces = Math.min(20 - begeleiderCount, totalAvailablePlaces); // Ensure it doesn't exceed total spots left

        return {
          ...course,
          totalAvailablePlaces,
          availableBegeleiderPlaces
        };
      })
      .filter(course => course.totalAvailablePlaces > 0); // Only return courses that have space left

    res.json(availableCourses);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching courses');
  }
});


router.get('/registration-count', authenticateJWT, async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        Course_registration: {
          select: { firstName: true, lastName: true, RegistrationRole: true }
        }
      },
      orderBy: {
        startTime: 'asc' // Sort by startTime in ascending order
      }
    });

    // Modify the course data to include the count of registrations
    const modifiedCourses = courses.map(course => {
      const begeleiderCount = course.Course_registration.filter(reg => reg.RegistrationRole === 'BEGELEIDER').length;
      const kandidaatCount = course.Course_registration.filter(reg => reg.RegistrationRole === 'KANDIDAAT').length;
      return {
        ...course,
        begeleiderCount,
        kandidaatCount
      };
    });

    res.json(modifiedCourses);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching courses');
  }
});

router.get('/registration-count/upcoming', authenticateJWT, async (req, res) => {
  try {
    // Get the current date and time
    const currentDate = new Date();

    // Fetch courses with registrations
    const courses = await prisma.course.findMany({
      where: {
        startTime: {
          // Only fetch courses that have not started yet
          gte: currentDate
        }
      },
      include: {
        Course_registration: {
          select: { firstName: true, lastName: true, RegistrationRole: true }
        }
      },
      orderBy: {
        startTime: 'asc' // Sort by startTime in ascending order
      }
    });

    // Modify the course data to include the count of registrations
    const modifiedCourses = courses.map(course => {
      const begeleiderCount = course.Course_registration.filter(reg => reg.RegistrationRole === 'BEGELEIDER').length;
      const kandidaatCount = course.Course_registration.filter(reg => reg.RegistrationRole === 'KANDIDAAT').length;
      return {
        ...course,
        begeleiderCount,
        kandidaatCount
      };
    });

    res.json(modifiedCourses);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching future courses');
  }
});



router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const course = await prisma.course.findUnique({
      where: {
        id: parseInt(id)
      }
    });
    res.json(course);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching course');
  }
})

router.get('/export-registrations/:id', authenticateJWTWithRole('ADMIN'),async (req, res) => {
  try {
    const { id } = req.params;
    const registrations = await prisma.course_registration.findMany({
      where: {
        courseId: parseInt(id)
      }
    });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Registrations');

    worksheet.columns = [
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'National Number', key: 'national_number', width: 20 },
      { header: 'Registration Role', key: 'RegistrationRole', width: 20 },
      { header: 'Street', key: 'street', width: 20 },
      { header: 'House Number', key: 'houseNumber', width: 10 },
      { header: 'City', key: 'city', width: 20 },
      { header: 'Postal Code', key: 'postalCode', width: 10 }
    ];

    registrations.forEach(registration => {
      worksheet.addRow(registration);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=registrations-${id}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching registrations');
  }
})

router.post('/', authenticateJWTWithRole('ADMIN'), async (req, res) => {
  try {
    const {startTime, endTime} = req.body;
    const course = await prisma.course.create({
      data: {
        startTime,
        endTime
      }
    });
    res.json(course);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating course');
  }
})

router.post('/register', authenticateJWT, async (req, res) => {
  try {
    const { courseId, firstName, lastName, email, phone, nationalNumber, RegistrationRole, street, houseNumber, city, postalCode } = req.body;
    const registration = await prisma.course_registration.create({
      data: {
        courseId,
        firstName,
        lastName,
        email,
        phone,
        national_number: nationalNumber,
        RegistrationRole,
        street,
        houseNumber,
        city,
        postalCode     
      }
    });

    const course = await prisma.course.findUnique({
      where: {
        id: courseId
      }
    });

    if (!course) {
      return res.status(404).send('Course not found');
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Bevestiging registratie vormingsmoment',
      text: `Dag ${firstName} ${lastName},
    
    Bedankt voor je registratie voor het vormingsmoment op ${formatDate(course.startTime)}.
    
    Hier zijn de details van het evenement:
    - Locatie: Ontmoetingscentrum Kasterlee
    - Adres: Binnenpad 2, 2460 Kasterlee
    - Tijd: ${formatTime(course.startTime)} - ${formatTime(course.endTime)}
    
    We kijken ernaar uit je daar te zien!
    
    Met vriendelijke groeten,  
    Baeyens rijopleiding`,
      html: `
      <p>Dag ${firstName} ${lastName},</p>
      <p>Bedankt voor je registratie voor het vormingsmoment op <strong>${formatDate(course.startTime)}</strong>.</p>
      <p>Hier zijn de details van het evenement:</p>
      <ul>
        <li><strong>Locatie:</strong> Ontmoetingscentrum Kasterlee</li>
        <li><strong>Adres:</strong> Binnenpad 2, 2460 Kasterlee</li>
        <li><strong>Tijd:</strong> ${formatTime(course.startTime)} - ${formatTime(course.endTime)}</li>
      </ul>
      <p>We kijken ernaar uit je daar te zien!</p>
      <p>Met vriendelijke groeten,</p>
      <p>Baeyens rijopleiding</p>
      `
    };

    await sendMail.sendMail(mailOptions);
    

    res.json(registration);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error registering for course');
  }
});

router.put('/dashboard-update', authenticateJWTWithRole('ADMIN'),async (req, res) => {
  try {
    const { id, ...updateData } = req.body;

    if (!id) {
      return res.status(400).send('Course ID is required');
    }

    console.log('Update Data: ', updateData);

    const updatedCourse = await prisma.course.update({
      where: {
        id: id
      },
      data: updateData
    });

    res.json(updatedCourse);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating course');
  }
});

export default router;