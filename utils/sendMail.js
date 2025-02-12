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
    const accessToken = await oAuth2Client.getAccessToken();

    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });
    console.log(`Email to ${mailOptions.to} will be sent!`);
    return await transport.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

async function contact(email, subject, message) {
  try {
    const accessToken = await oAuth2Client.getAccessToken();

    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken,
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

    const result = await transport.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

export default {sendMail, contact};
