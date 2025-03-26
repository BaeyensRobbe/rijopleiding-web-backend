  import nodemailer from 'nodemailer';
  import { OAuth2Client } from 'google-auth-library';
  import dotenv from 'dotenv';
  import fs from 'fs';

  dotenv.config();

  const CLIENT_ID = process.env.CLIENT_ID;
  const CLIENT_SECRET = process.env.CLIENT_SECRET;
  const REDIRECT_URI = process.env.REDIRECT_URI;
  const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

  const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

  async function getAccessToken() {
    try {
      const { token, res } = await oAuth2Client.getAccessToken();

      // If Google provides a new refresh token, update .env
      if (res && res.data && res.data.refresh_token) {
        console.log("New refresh token received, updating...");
        process.env.REFRESH_TOKEN = res.data.refresh_token;

        // Update refresh token in .env file
        const envConfig = fs.readFileSync('.env', 'utf8').split('\n');
        const newEnvConfig = envConfig.map(line =>
          line.startsWith("REFRESH_TOKEN=") ? `REFRESH_TOKEN=${res.data.refresh_token}` : line
        ).join('\n');
        fs.writeFileSync('.env', newEnvConfig);
      }

      return token;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }

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
