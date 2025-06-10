const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscription.controller");
const authToken = require("../middlewares/authenticateToken");

router.post("/", authToken, subscriptionController.create); // Create a new subscription
router.get("/", authToken, subscriptionController.findAll); // Retrieve all subscriptions
router.get("/expiring-soon", authToken, subscriptionController.getExpiringSoon);  // retrieves the subscription expiring in the next seven days
router.post("/whatsapp/:SUB_CODE", authToken, subscriptionController.sendWhatsAppReminder); // sends a reminder to the user via WhatsApp
router.post("/email/:SUB_CODE",authToken, subscriptionController.sendEmailReminder); // sends a reminder to the user via email
router.get("/:subId", authToken, subscriptionController.findOne); // Find a subscription by id
router.put("/:subCode", authToken, subscriptionController.update); // Update a subscription by id
router.delete("/:subId", authToken, subscriptionController.delete); // Delete a subscription by id

module.exports = router;
