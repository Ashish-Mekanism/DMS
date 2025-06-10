// utils/whatsappService.js

require("dotenv").config();
const client = require("twilio")(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Function to send a WhatsApp message using Twilio
 * @param {string} to The recipient's phone number
  * @param {object} data The data to be sent in the message
 */
const sendWhatsAppMessage = async (to,data) => {
  try {
    await client.messages.create({
      from: "whatsapp:+919737211105",
      messagingServiceSid: process.env.TWILIO_MESSAGE_SERVICE_SID,
      contentSid: process.env.TWILIO_TEMPLATE_ID,
      contentVariables: data,
      to: `whatsapp:${to}`,
    });
  } catch (error) {
    console.error(`Error sending WhatsApp message to ${to}: ${error}`);
    throw error;
  }
};

module.exports = { sendWhatsAppMessage };
