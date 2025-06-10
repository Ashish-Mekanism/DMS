// utils/emailService.js

const nodemailer = require("nodemailer");
require("dotenv").config();

// Configure your email transporter (e.g., using nodemailer)
const transporter = nodemailer.createTransport({
  host: "sg1-ts4.a2hosting.com",
  port: 465,
  auth: {
    user: process.env.EMAIL, // Your email
    pass: process.env.EMAIL_PASSWORD, // Your email password
  },
});

/**
 * Function to send an email using nodemailer
 * @param {string} to The recipient's email address
 * @param {string} subject The email subject
 * @param {string} html The email content in HTML
 */
const sendEmail = async (to, subject, html) => {
  const mailOptions = {
    from: process.env.EMAIL,
    to: to,
    subject: subject,
    html: html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

module.exports = { sendEmail };
