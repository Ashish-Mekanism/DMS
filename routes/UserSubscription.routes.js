const express = require("express");
const router = express.Router();
const usrSubsController = require("../controllers/UserSubscription.controller");
const authToken = require("../middlewares/authenticateToken");

router.post("/", authToken, usrSubsController.create);
router.get("/", authToken, usrSubsController.findAll);
router.get("/expiring-soon", authToken, usrSubsController.getExpiringSoon);
router.post("/whatsapp/:GST_CODE", authToken, usrSubsController.sendWhatsAppReminder);
router.post("/email/:GST_CODE", authToken, usrSubsController.sendEmailReminder);
router.get("/:id", authToken, usrSubsController.findOne);
router.put("/:id", authToken, usrSubsController.update);
router.delete("/:id", authToken, usrSubsController.delete);

module.exports = router;
