const SubPlan = require("../models/subplan.models.js");
const moment = require("moment");
const response = require("../utils/response.js");


// Find all subplans
exports.findAll = async (req, res) => {
  try {
    const subplans = await SubPlan.getAll();
    res.status(200).json(response.success("Subplans retrieved successfully", subplans));
  } catch (err) {
    res.status(500).json(response.error("Some error occurred while retrieving subplans"));
  }
};

// Find a single subplan with id
exports.findOne = async (req, res) => {
  try {
    const subplan = await SubPlan.findById(req.params.id);
    if (!subplan) {
      return res.status(404).json(response.notFound(`Subplan not found with id ${req.params.id}`));
    }
    res.status(200).json(response.success("Subplan retrieved successfully", subplan));
  } catch (err) {
    res.status(500).json(response.error(`Error retrieving subplan with id ${req.params.id}`));
  }
};

// Create and Save a new subplan
exports.create = async (req, res) => {
  if (!req.body) {
    return res.status(400).json(response.badRequest("Content can not be empty!"));
  }

  try {
    const subplan = new SubPlan({
      PLA_CODE: req.body.PLA_CODE,
      PLA_DESC: req.body.PLA_DESC,
      PLA_MONTH: req.body.PLA_MONTH
    });

    const data = await SubPlan.create(subplan);
    res.status(201).json(response.success("Subplan created successfully", data));
  } catch (err) {
    res.status(500).json(response.error("Some error occurred while creating the Subplan"));
  }
};

// Update a subplan identified by the id in the request
exports.update = async (req, res) => {
  if (!req.body) {
    return res.status(400).json(response.badRequest("Content can not be empty!"));
  }

  try {
    const data = await SubPlan.updateById(req.params.id, new SubPlan(req.body));
    if (!data) {
      return res.status(404).json(response.notFound(`Cannot update Subplan with id ${req.params.id}. Maybe Subplan was not found!`));
    }
    res.status(200).json(response.success("Subplan was updated successfully", data));
  } catch (err) {
    res.status(500).json(response.error(`Error updating Subplan with id ${req.params.id}`));
  }
};

// Delete a subplan with the specified id in the request
exports.delete = async (req, res) => {
  try {
    const data = await SubPlan.remove(req.params.id);
    if (!data) {
      return res.status(404).json(response.notFound(`Cannot delete Subplan with id ${req.params.id}. Maybe Subplan was not found!`));
    }
    res.status(200).json(response.success("Subplan was deleted successfully", data));
  } catch (err) {
    res.status(500).json(response.error(`Could not delete Subplan with id ${req.params.id}`));
  }
};

// Delete all subplans from the database.
exports.deleteAll = async (req, res) => {
  try {
    const data = await SubPlan.removeAll();
    res.status(200).json(response.success(`${data.affectedRows} Subplans were deleted successfully`, data));
  } catch (err) {
    res.status(500).json(response.error("Some error occurred while removing all subplans"));
  }
};