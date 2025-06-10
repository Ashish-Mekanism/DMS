const GSTSystem = require("../models/gstSystem.model.js");
const response = require("../utils/response.js");

// Find all GST systems
exports.findAll = async (req, res) => {
  try {
    const gstSystems = await GSTSystem.getAll();
    res
      .status(200)
      .json(response.success("GST systems retrieved successfully", gstSystems));
  } catch (err) {
    res
      .status(500)
      .json(response.error("Some error occurred while retrieving GST systems"));
  }
};

// Find a single GST system with id
exports.findOne = async (req, res) => {
  try {
    const gstSystem = await GSTSystem.findById(req.params.id);
    if (!gstSystem) {
      return res
        .status(404)
        .json(
          response.notFound(`GST system not found with id ${req.params.id}`)
        );
    }
    res
      .status(200)
      .json(response.success("GST system retrieved successfully", gstSystem));
  } catch (err) {
    res
      .status(500)
      .json(
        response.error(`Error retrieving GST system with id ${req.params.id}`)
      );
  }
};

// Create and Save a new GST system
exports.create = async (req, res) => {
  if (!req.body) {
    return res
      .status(400)
      .json(response.badRequest("Content can not be empty!"));
  }

  try {
    const gstSystem = new GSTSystem({
      GST_CODE: req.body.GST_CODE,
      GST_DESC: req.body.GST_DESC,
      GST_RATE: req.body.GST_RATE,
    });

    const data = await GSTSystem.create(gstSystem);
    res
      .status(201)
      .json(response.success("GST system created successfully", data));
  } catch (err) {
    res
      .status(500)
      .json(
        response.error("Some error occurred while creating the GST system")
      );
  }
};

// Update a GST system identified by the id in the request
exports.update = async (req, res) => {
  if (!req.body) {
    return res
      .status(400)
      .json(response.badRequest("Content can not be empty!"));
  }

  try {
    const data = await GSTSystem.updateById(
      req.params.id,
      new GSTSystem(req.body)
    );
    if (!data) {
      return res
        .status(404)
        .json(
          response.notFound(
            `Cannot update GST system with id ${req.params.id}. Maybe GST system was not found!`
          )
        );
    }
    res
      .status(200)
      .json(response.success("GST system was updated successfully", data));
  } catch (err) {
    res
      .status(500)
      .json(
        response.error(`Error updating GST system with id ${req.params.id}`)
      );
  }
};

// Delete a GST system with the specified id in the request
exports.delete = async (req, res) => {
  try {
    const data = await GSTSystem.remove(req.params.id);
    if (!data) {
      return res
        .status(404)
        .json(
          response.notFound(
            `Cannot delete GST system with id ${req.params.id}. Maybe GST system was not found!`
          )
        );
    }
    res
      .status(200)
      .json(response.success("GST system was deleted successfully", data));
  } catch (err) {
    res
      .status(500)
      .json(
        response.error(`Could not delete GST system with id ${req.params.id}`)
      );
  }
};

// Delete all GST systems from the database.
exports.deleteAll = async (req, res) => {
  try {
    const data = await GSTSystem.removeAll();
    res
      .status(200)
      .json(
        response.success(
          `${data.affectedRows} GST systems were deleted successfully`,
          data
        )
      );
  } catch (err) {
    res
      .status(500)
      .json(
        response.error("Some error occurred while removing all GST systems")
      );
  }
};
