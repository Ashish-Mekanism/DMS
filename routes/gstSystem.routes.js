const express = require("express");
const router = express.Router();
const gstSystem = require("../controllers/gstSystem.controller.js");

router.post("/", gstSystem.create);
router.get("/", gstSystem.findAll);
router.get("/:id", gstSystem.findOne);
router.put("/:id", gstSystem.update);
router.delete("/:id", gstSystem.delete);

module.exports = router;
