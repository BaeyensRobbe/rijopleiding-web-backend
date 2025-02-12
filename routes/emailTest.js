import express from 'express';
import sendMail from '../utils/sendMail.js'; // Import your email sending function

const router = express.Router();

router.get('/test-email', async (req, res) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'robbebaeyenspk@gmail.com',
      subject: 'Test Email from Vercel/Netlify',
      text: 'This is a test email from the deployed environment.',
    };

    await sendMail.sendMail(mailOptions);
    res.send('Test email sent successfully!');
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).send('Failed to send test email.');
  }
});

export default router;
