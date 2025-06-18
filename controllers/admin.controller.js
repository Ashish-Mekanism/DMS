// Controllers for managing admin users in the application
const Admin = require("../models/admin.model");
const response = require("../utils/response");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pagination = require("../middlewares/pagination");
const db = require("../utils/db");
const axios = require("axios");
const crypto = require("crypto");

exports.sendAdminOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    const [adminQueryResult] = await db.query(
      "SELECT ad_id, ad_name, ad_email, ad_phone, ad_type FROM usr_admin WHERE ad_phone = ?",
      [phoneNumber]
    );

    if (adminQueryResult.length === 0) {
      console.log(phoneNumber, "not present in any user");
      return res
        .status(404)
        .json({ error: "No admin user found with the provided phone number" });
    }

    const adminUser = adminQueryResult[0];

    // Generate a new 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Construct the URL with the phone number and new OTP
    const url = `http://msg.jmdinfotek.in/api/mt/SendSMS?user=SSIFAS&password=123456&senderid=SSIFAS&channel=Trans&DCS=0&flashsms=0&number=${phoneNumber}&text=OTP+for+SAISUN+iFAS+ERP+App+is:+${otp}&route=07`;

    // Make the GET request
    const apiResponse = await axios.get(url);

    // Generate JWT token
    const token = jwt.sign(
      {
        id: adminUser.ad_id,
        phone: adminUser.ad_phone,
        name: adminUser.ad_name
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Send the API response along with the generated OTP and JWT token
    const responseObj = {
      ...apiResponse.data,
      generatedOTP: otp,
      token: token
    };

    return res.json(responseObj);
  } catch (error) {
    return res.status(500).json({ error: "Error sending OTP" });
  }
};

exports.Login = async (req, res) => {
  const { ad_email, ad_pass } = req.body;

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not defined.");
    return res.status(500).json(response.error("Internal server error"));
  }

  try {
    const admin = await Admin.findByEmail(ad_email);
    if (!admin) {
      return res.status(404).json(response.error("Admin not found"));
    }

    const passwordIsValid = await bcrypt.compare(ad_pass, admin.ad_pass);
    if (!passwordIsValid) {
      return res.status(401).json(response.error("Invalid Password!"));
    }

    const token = jwt.sign(
      { id: admin.ad_id, name: admin.ad_name },
      process.env.JWT_SECRET,
      {
        expiresIn: 259200 // 3 days in seconds (3 * 24 * 60 * 60)
      }
    );

    res.json(
      response.success("Admin logged in successfully", {
        id: admin.ad_id,
        name: admin.ad_name,
        email: admin.ad_email,
        accessToken: token
      })
    );
  } catch (err) {
    res
      .status(500)
      .json(response.error(err.message || "Error logging in admin"));
  }
};
// Create and Save a new Admin
exports.create = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json(response.error("Content cannot be empty!"));
    }

    const hashedPassword = await bcrypt.hash(req.body.ad_pass, 10);

    const admin = new Admin({
      ad_name: req.body.ad_name,
      ad_email: req.body.ad_email,
      ad_pass: hashedPassword,
      ad_delete: req.body.ad_delete,
      ad_type: req.body.ad_type,
      ad_id: req.body.ad_id, // Optional: pass only if not auto-increment
      ad_phone: req.body.ad_phone
    });

    const data = await Admin.create(admin);
    res.json(response.success("Admin created successfully", data));
  } catch (err) {
    res
      .status(500)
      .json(
        response.error(
          err.message || "Some error occurred while creating the Admin."
        )
      );
  }
};

exports.findAll = async (req, res) => {
  try {
    const data = await Admin.getAll();
    res.json({
      success: true,
      message: "Admins retrieved successfully",
      data: data
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Some error occurred while retrieving admins."
    });
  }
};

// Find a single Admin with an id
exports.findOne = async (req, res) => {
  try {
    const data = await Admin.findById(req.params.adId);
    res.json(response.success("Admin retrieved successfully", data));
  } catch (err) {
    if (err.message === "Admin not found") {
      res.status(404).json(response.error(err.message));
    } else {
      res
        .status(500)
        .json(
          response.error("Error retrieving admin with id " + req.params.adId)
        );
    }
  }
};

// Update an Admin identified by the id in the request
exports.update = async (req, res) => {
  try {
    if (!req.body) {
      res.status(400).json(response.error("Content cannot be empty!"));
      return;
    }

    const data = await Admin.updateById(req.params.adId, new Admin(req.body));
    if (!data) {
      res.status(404).json(response.error("Admin not found"));
    } else {
      res.json(response.success("Admin updated successfully", data));
    }
  } catch (err) {
    res
      .status(500)
      .json(response.error("Error updating admin with id " + req.params.adId));
  }
};

// Delete an Admin with the specified id in the request
exports.delete = async (req, res) => {
  try {
    const data = await Admin.remove(req.params.adId);
    if (!data) {
      res.status(404).json(response.error("Admin not found"));
    } else {
      res.json(response.success("Admin deleted successfully", {}));
    }
  } catch (err) {
    res
      .status(500)
      .json(
        response.error("Could not delete admin with id " + req.params.adId)
      );
  }
};
exports.getAdminDetailsByToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json(response.error("Token is required"));
    }

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error("JWT Verification Error:", jwtError);
      return res.status(401).json(response.error("Invalid token"));
    }

    if (!decoded || !decoded.id) {
      return res.status(400).json(response.error("Invalid token structure"));
    }

    // Find the admin in the database using the new method
    const admin = await Admin.findByTokenId(decoded.id);

    if (!admin) {
      return res.status(404).json(response.error("Admin not found"));
    }

    // Return the admin details
    return res.json(
      response.success("Admin retrieved successfully", {
        id: admin.ad_id,
        name: admin.ad_name,
        email: admin.ad_email,
        type: admin.ad_type
      })
    );
  } catch (error) {
    console.error("Unexpected Error:", error);
    return res
      .status(500)
      .json(response.error("Error retrieving admin details"));
  }
};
