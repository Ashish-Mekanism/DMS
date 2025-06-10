const express = require("express");
const router = express.Router();
const usrMastController = require("../controllers/userMaster.controller");
const authToken = require("../middlewares/authenticateToken");

router.post("/",authToken, usrMastController.create);
router.get("/", authToken, usrMastController.findAll);
router.get("/:id",authToken, usrMastController.findOne);
router.put("/:id",authToken ,usrMastController.update);
router.delete("/:id",authToken, usrMastController.delete);

module.exports = router;
