  import nodemailer from 'nodemailer';
  import { OAuth2Client } from 'google-auth-library';
  import dotenv from 'dotenv';

  dotenv.config();

  const CLIENT_ID = process.env.CLIENT_ID;
  const CLIENT_SECRET = process.env.CLIENT_SECRET;
  const REDIRECT_URI = process.env.REDIRECT_URI;
  const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

  const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

  async function sendMail(mailOptions) {
    try {
      console.log('Sending email... send email called');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      console.log(`Email to ${mailOptions.to} will be sent!`);
      return await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  async function contact(email, subject, message) {
    try {

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: `Rijopleiding Baeyens <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_RIJOPLEIDING,
        replyTo: email,
        subject: subject,
        text: message,
        html: `<p>${message}</p>`,
      };

      const result = await transporter.sendMail(mailOptions);
      return result;
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

  export default { sendMail, contact };
