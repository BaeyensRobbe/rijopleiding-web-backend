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

// Get all courses that are available for registration (future courses)
// No authorization needed for this route
router.get('/available', async (req, res) => {
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

// Get all courses with registration counts
// Only accessible by admin
router.get('/registration-count', authenticateJWTWithRole('ADMIN'), async (req, res) => {
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

// Get all fututre courses with registration counts
// Only accessible by admin
router.get('/registration-count/upcoming', authenticateJWTWithRole('ADMIN'), async (req, res) => {
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


// Get course by ID
// No authorization needed for this route
// This route is used to fetch course details for registration
router.get('/:id', async (req, res) => {
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

// Get registrations for a specific course
// Only accessible by admin
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

// Create a new course
// Only accessible by admin
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

// Register for a course
// No authorization needed for this route
router.post('/register', async (req, res) => {
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
      text: `Beste ${firstName},
    
    Je bent ingeschreven voor het vormingsmoment voor begeleiders.
    
    Datum: ${formatDate(course.startTime)}
    Tijdstip: van 19:00 tot 22:15
    Locatie: OC Kasterlee, Binnenpad 2
    
    Gelieve onderstaande informatie aandachtig door te nemen.
    
    1. Registratie:
    - Elke begeleider moet zich zowel bij het begin als bij het einde van het vormingsmoment digitaal registreren.
    - Eens de vorming gestart is, is het onmogelijk om nog iemand aan te melden.
    - De registratie gebeurt via je smartphone en het scannen van een QR-code. Dit doe je best gewoon met je fototoestel of met een app voor het lezen van QR-codes. (De scanner van Itsme levert vaak problemen op).
    - Na het scannen van de code, kan je je aanmelden met:
      - Itsme
      - Beveiligingscode via mobiele app
      - Beveiligingscode via SMS
      - Beveiligingscode via mail
    
    BELANGRIJK: De aanwezigheden worden digitaal gecontroleerd door het departement Mobiliteit en Openbare Werken (MOW). Wie te laat komt of vroeger vertrekt, krijgt geen attest en moet het vormingsmoment opnieuw volgen.
    
    2. Duur:
    Het vormingsmoment duurt 3 uur. De pauze mag daarin niet meetellen. Het vormingsmoment zal daarom eindigen rond 22u15.
    
    3. Lokaal:
    Het vormingsmoment gaat door in lokaal “De Pompier” op de eerste verdieping van het OC Kasterlee. (Binnenpad 2 – ingang via de Karekietstraat of via de ondergrondse parkeergarage (gratis – validatie parkeerticket op het gelijkvloers))
    
    4. Betaling:
    Gelieve 20 euro per begeleider over te schrijven op rekening: BE67 3631 1612 3487 van Baeyens Rijopleiding, met vermelding van je voornaam, naam en de datum van het vormingsmoment. Het aantal plaatsen per cursus is beperkt. Inschrijvingen waarvoor na 4 werkdagen nog geen betaling werd ontvangen, zullen daarom geannuleerd worden.
    
    5. Attest:
    Je ontvangt op het einde van het vormingsmoment een attest als bewijs. Dit attest blijft 10 jaar geldig en moet getoond worden bij het praktijkexamen.
    
    Samengevat:
    1. Kom op tijd. We starten de registratie van aanwezigen 10 min voor het begin van het vormingsmoment, dus vanaf 18u50.
    2. Vergeet je smartphone niet.
    3. Kijk vooraf na of je een QR-code kan scannen met je gsm.
    4. Zijn er onvoorziene omstandigheden op de avond van het vormingsmoment, gelieve me dan zo snel mogelijk te contacteren op 0486/ 71 48 32
    
    Je merkt het: Het is een ingewikkelde procedure. Gelukkig is het vormingsmoment zelf gemakkelijker.
    
    Tenslotte nog dit: Je kan niet reageren op dit mailadres. Je kan me bereiken via rijopleidingbaeyens@telenet.be.
    
    Tot binnenkort!
    
    Met vriendelijke groeten,
    Sieg Baeyens
    Hoogblok 11
    2460 Kasterlee
    0486 71 43 82
    rijopleidingbaeyens@telenet.be
    www.baeyensrijopleiding.be`,
    
      html: `
        <p>Beste ${firstName},</p>
    
        <p>Je bent ingeschreven voor het vormingsmoment voor begeleiders.</p>
    
        <p><strong>Datum:</strong> ${formatDate(course.startTime)}<br>
        <strong>Tijdstip:</strong> van 19:00 tot 22:15<br>
        <strong>Locatie:</strong> OC Kasterlee, Binnenpad 2</p>
    
        <h3>Gelieve onderstaande informatie aandachtig door te nemen:</h3>
        
        <h4>1. Registratie:</h4>
        <ul>
          <li>Elke begeleider moet zich zowel bij het begin als bij het einde van het vormingsmoment digitaal registreren.</li>
          <li>Eens de vorming gestart is, is het onmogelijk om nog iemand aan te melden.</li>
          <li>De registratie gebeurt via je smartphone en het scannen van een QR-code. Dit doe je best gewoon met je fototoestel of met een app voor het lezen van QR-codes. (De scanner van Itsme levert vaak problemen op).</li>
          <li>Na het scannen van de code, kan je je aanmelden met:</li>
          <ul>
            <li>Itsme</li>
            <li>Beveiligingscode via mobiele app</li>
            <li>Beveiligingscode via SMS</li>
            <li>Beveiligingscode via mail</li>
          </ul>
        </ul>
    
        <p><strong style="color: red;">BELANGRIJK:</strong> De aanwezigheden worden digitaal gecontroleerd door het departement Mobiliteit en Openbare Werken (MOW). Wie te laat komt of vroeger vertrekt, krijgt geen attest en moet het vormingsmoment opnieuw volgen.</p>
        
        <h4>2. Duur:</h4>
        <p>Het vormingsmoment duurt 3 uur. De pauze mag daarin niet meetellen. Het vormingsmoment zal daarom eindigen rond 22u15.</p>
    
        <h4>3. Lokaal:</h4>
        <p>Het vormingsmoment gaat door in lokaal “De Pompier” op de eerste verdieping van het OC Kasterlee. (Binnenpad 2 – ingang via de Karekietstraat of via de ondergrondse parkeergarage (gratis – validatie parkeerticket op het gelijkvloers))</p>
    
        <h4>4. Betaling:</h4>
        <p>Gelieve 20 euro per begeleider over te schrijven op rekening: BE67 3631 1612 3487 van Baeyens Rijopleiding, met vermelding van je voornaam, naam en de datum van het vormingsmoment. Het aantal plaatsen per cursus is beperkt. Inschrijvingen waarvoor na 4 werkdagen nog geen betaling werd ontvangen, zullen daarom geannuleerd worden.</p>
    
        <h4>5. Attest:</h4>
        <p>Je ontvangt op het einde van het vormingsmoment een attest als bewijs. Dit attest blijft 10 jaar geldig en moet getoond worden bij het praktijkexamen.</p>
    
        <h3>Samengevat:</h3>
        <ul>
          <li>Kom op tijd. We starten de registratie van aanwezigen 10 min voor het begin van het vormingsmoment, dus vanaf 18u50.</li>
          <li>Vergeet je smartphone niet.</li>
          <li>Kijk vooraf na of je een QR-code kan scannen met je gsm.</li>
          <li>Zijn er onvoorziene omstandigheden op de avond van het vormingsmoment, gelieve me dan zo snel mogelijk te contacteren op 0486/ 71 48 32.</li>
        </ul>
    
        <p>Je merkt het: Het is een ingewikkelde procedure. Gelukkig is het vormingsmoment zelf gemakkelijker.</p>
    
        <p>Tenslotte nog dit: Je kan niet reageren op dit mailadres. Je kan me bereiken via rijopleidingbaeyens@telenet.be.</p>
    
        <p>Tot binnenkort!</p>
    
        <p>Met vriendelijke groeten,<br>
        Sieg Baeyens<br>
        Hoogblok 11<br>
        2460 Kasterlee<br>
        0486 71 43 82<br>
        rijopleidingbaeyens@telenet.be<br>
        <a href="http://www.baeyensrijopleiding.be">www.baeyensrijopleiding.be</a></p>
    
        <p><img src="cid:image1" alt="Image 1" width="200" height="58" /></p>
      `,
      attachments: [
        {
          filename: 'logo.jpg',
          path: 'public/images/logo-new.png', // path to the image file
          cid: 'image1' // this links the image to the email's HTML
        },
      ]
    };
    
    

    await sendMail.sendMail(mailOptions);
    

    res.json(registration);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error registering for course');
  }
});

// Update a course
// Only accessible by admin
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