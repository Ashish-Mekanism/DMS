// this file defines the routes for GST registration operations
const express = require("express");
const router = express.Router();
const gstRegistrationController = require("../controllers/gstregistration.controller");
const authToken = require("../middlewares/authenticateToken");

router.post("/", authToken, gstRegistrationController.create);
router.get("/", authToken, gstRegistrationController.findAll);
router.get("/:id", authToken, gstRegistrationController.findOne);
router.put("/:id", authToken, gstRegistrationController.update);
router.delete("/:id", authToken, gstRegistrationController.delete);

module.exports = router;
