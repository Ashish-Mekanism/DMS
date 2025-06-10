const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customer.controller");
const authToken = require("../middlewares/authenticateToken");

router.post("/", authToken, customerController.create); // Create a new customer
router.get("/", authToken, customerController.findAll); // Retrieve all customers
router.get("/:custId", authToken, customerController.findOne); // Find a customer by id
router.put("/:custId", authToken, customerController.update); // Update a customer by id
router.delete("/:custId", authToken, customerController.delete); // Delete a customer by id


module.exports = router;
