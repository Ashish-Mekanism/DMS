const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employee.controller");
const authToken = require("../middlewares/authenticateToken");

router.post("/", authToken, employeeController.create); // Create a new employee
router.get("/", authToken, employeeController.findAll); // Retrieve all employees
router.get("/:empId", authToken, employeeController.findOne); // Find an employee by id
router.put("/:empId", authToken, employeeController.update); // Update an employee by id
router.delete("/:empId", authToken, employeeController.delete); // Delete an employee by id

module.exports = router;
