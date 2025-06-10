const db = require("../utils/db.js");
const response = require("../utils/response.js");
const currentDate = new Date();
const sevenDaysFromNow = new Date(currentDate);
sevenDaysFromNow.setDate(currentDate.getDate() + 7);

const Subscription = function (subscription) {
  this.SUB_CODE = subscription.SUB_CODE;
  this.CUS_CODE = subscription.CUS_CODE;
  this.PLA_CODE = subscription.PLA_CODE;
  this.SUB_STDT = subscription.SUB_STDT;
  this.SUB_ENDT = subscription.SUB_ENDT;
  this.LIC_USER = subscription.LIC_USER;
  this.SUB_ORDN = subscription.SUB_ORDN;
  this.status = subscription.status;
  this.ORD_REQD = subscription.ORD_REQD;
  this.INV_DATE = subscription.INV_DATE;
  this.is_verified = subscription.is_verified; // New field
  this.ad_id = subscription.ad_id;
};

// Create a new Subscription
Subscription.create = async (newSubscription) => {
  try {
    // Convert all string values in newSubscription to uppercase
    for (const key in newSubscription) {
      if (
        typeof newSubscription[key] === "string" &&
        newSubscription[key].constructor === String
      ) {
        newSubscription[key] = newSubscription[key].toUpperCase();
      }
    }

    // Query the database for the highest SUB_CODE
    const [highestCode] = await db.query(
      "SELECT SUB_CODE FROM SUB_MAST ORDER BY SUB_CODE DESC LIMIT 1"
    );
    let nextCode = 1;
    if (highestCode.length > 0) {
      const currentMaxNum =
        parseInt(highestCode[0].SUB_CODE.replace("000", "")) + 1;
      nextCode = currentMaxNum;
    }
    const newSUB_CODE = `000${nextCode.toString().padStart(3, "0")}`;

    // Check for SUB_STDT
    if (!newSubscription.SUB_STDT) {
      return response.badRequest("Subscription start date is required");
    }

    // Fetch plan details
    const [planDetails] = await db.query(
      "SELECT PLA_MONTH FROM SUB_PLAN WHERE PLA_CODE = ?",
      [newSubscription.PLA_CODE]
    );
    if (planDetails.length === 0) {
      return response.notFound("Invalid plan code");
    }
    const planMonths = planDetails[0].PLA_MONTH;

    const startDate = new Date(newSubscription.SUB_STDT);
    if (isNaN(startDate.getTime())) {
      return response.badRequest("Invalid start date format");
    }

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + planMonths);

    const subscriptionData = {
      SUB_CODE: newSUB_CODE,
      CUS_CODE: newSubscription.CUS_CODE,
      PLA_CODE: newSubscription.PLA_CODE,
      SUB_STDT: newSubscription.SUB_STDT, // Already in YYYY-MM-DD format
      SUB_ENDT: endDate,
      LIC_USER: newSubscription.LIC_USER,
      SUB_ORDN: newSubscription.SUB_ORDN,
      status: newSubscription.status || 0,
      ORD_REQD: newSubscription.ORD_REQD,
      ad_id: newSubscription.ad_id,
      INV_DATE: newSubscription.INV_DATE,
      is_verified: newSubscription.is_verified || false, // Default to false if not provided
    };

    const [res] = await db.query(
      "INSERT INTO SUB_MAST SET ?",
      subscriptionData
    );
    console.log("Created subscription: ", {
      id: res.insertId,
      ...subscriptionData,
    });
    return response.success("Subscription created successfully", {
      id: res.insertId,
      ...subscriptionData,
    });
  } catch (err) {
    console.error("Error creating subscription:", err);
    return response.error("An error occurred while creating the subscription");
  }
};

// Find Subscription by id
Subscription.findById = async (subId, filter_ad_id, filter_from, filter_to) => {
  try {
    // Convert subId to uppercase
    subId = subId.toUpperCase();

    let query = `
      SELECT
        SUB_MAST.*,
        usr_admin.ad_name AS admin_name,
        CUS_MAST.CUS_NAME AS customer_name,
        SUB_PLAN.PLA_DESC AS plan_description
      FROM SUB_MAST
      LEFT JOIN usr_admin ON SUB_MAST.ad_id = usr_admin.ad_id
      LEFT JOIN SUB_PLAN ON SUB_MAST.PLA_CODE = SUB_PLAN.PLA_CODE
      LEFT JOIN CUS_MAST ON SUB_MAST.CUS_CODE = CUS_MAST.CUS_CODE
      WHERE (SUB_MAST.SUB_CODE = ? OR SUB_MAST.CUS_CODE = ?)`;

    let params = [subId, subId];

    // Add filter conditions
    if (filter_ad_id) {
      query += " AND SUB_MAST.ad_id = ?";
      params.push(filter_ad_id);
    }
    if (filter_from) {
      query += " AND SUB_MAST.CREATED_AT >= ?";
      params.push(filter_from);
    }
    if (filter_to) {
      query += " AND SUB_MAST.CREATED_AT <= ?";
      params.push(`${filter_to} 23:59:59`);
    }

    const [subscriptions] = await db.query(query, params);

    if (subscriptions.length === 0) {
      return [];
    }

    // Check if the match is by SUB_CODE
    const subCodeMatch = subscriptions.find((sub) => sub.SUB_CODE === subId);

    // If there's a SUB_CODE match, return it as a single object
    if (subCodeMatch) {
      return subCodeMatch;
    }

    // Otherwise, return the array of subscriptions (matching CUS_CODE)
    return subscriptions;
  } catch (err) {
    console.error("Error retrieving subscriptions:", err);
    throw err;
  }
};

Subscription.findBySUB_CODE = async (SUB_CODE) => {
  const subscription = await db.query(
    `SELECT sm.*, cm.CUS_MAIL, cm.PHO_NMBR , cm.CUS_NAME 
     FROM SUB_MAST sm
     JOIN CUS_MAST cm ON sm.CUS_CODE = cm.CUS_CODE
     WHERE sm.SUB_CODE = ?`,
    [SUB_CODE]
  );

  return subscription[0][0];
};

// Update Subscription by id
Subscription.updateByCode = async (SUB_CODE, updateData) => {
  const allowedFields = [
    "CUS_CODE",
    "PLA_CODE",
    "SUB_STDT",
    "SUB_ENDT",
    "LIC_USER",
    "SUB_PDAT",
    "SUB_ORDN",
    "status",
    "ORD_REQD",
    "is_verified",
  ];

  const dateFields = ["SUB_STDT", "SUB_ENDT"];

  try {
    let updateFields = [];
    let updateValues = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        if (dateFields.includes(key) && value !== null) {
          // Handle date fields
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            return { error: `Invalid ${key} format`, statusCode: 400 };
          }
          updateFields.push(`${key} = ?`);
          updateValues.push(date); // Format as YYYY-MM-DD
        } else if (key === "LIC_USER") {
          // Ensure LIC_USER is a smallint
          const licUser = parseInt(value, 10);
          if (isNaN(licUser) || licUser < 0 || licUser > 32767) {
            return { error: "Invalid LIC_USER value", statusCode: 400 };
          }
          updateFields.push(`${key} = ?`);
          updateValues.push(licUser);
        } else if (key === "status") {
          // Ensure status is 0 or 1
          const status = parseInt(value, 10);
          if (status !== 0 && status !== 1) {
            return { error: "Invalid status value", statusCode: 400 };
          }
          updateFields.push(`${key} = ?`);
          updateValues.push(status);
        } else if (key === "is_verified") {
          // Ensure is_verified is a boolean
          const isVerified = value ? 1 : 0;
          updateFields.push(`${key} = ?`);
          updateValues.push(isVerified);
        } else {
          updateFields.push(`${key} = ?`);
          updateValues.push(value);
        }
      }
    }

    if (updateFields.length === 0) {
      return { error: "No valid fields to update", statusCode: 400 };
    }

    // Handle plan code and calculate end date
    if (updateData.PLA_CODE) {
      const [planDetails] = await db.query(
        "SELECT PLA_MONTH FROM SUB_PLAN WHERE PLA_CODE = ?",
        [updateData.PLA_CODE]
      );

      if (planDetails.length === 0) {
        return { error: "Invalid plan code", statusCode: 400 };
      }

      const planMonths = planDetails[0]["PLA_MONTH"];
      const startDate = new Date(updateData.SUB_STDT || new Date());
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + planMonths);

      updateFields.push("SUB_ENDT = ?");
      updateValues.push(endDate); // Format as YYYY-MM-DD
    }

    updateValues.push(SUB_CODE);

    const sql = `UPDATE SUB_MAST SET ${updateFields.join(
      ", "
    )} WHERE SUB_CODE = ?`;
    const [result] = await db.query(sql, updateValues);

    if (result.affectedRows === 0) {
      return { error: "Subscription not found", statusCode: 404 };
    }

    // Fetch the updated subscription
    const [updatedSubscription] = await db.query(
      "SELECT * FROM SUB_MAST WHERE SUB_CODE = ?",
      [SUB_CODE]
    );

    return { data: updatedSubscription, statusCode: 200 };
  } catch (err) {
    console.error("Error updating subscription:", err);
    return {
      error: `Error updating Subscription: ${err.message}`,
      statusCode: 500,
    };
  }
};

// Delete Subscription by id
Subscription.remove = async (subId, cusCode) => {
  try {
    // Check if there are any related records in EMP_MAST matching SUB_CODE
    const [empResultBySubCode] = await db.query(
      "SELECT COUNT(*) AS count FROM EMP_MAST WHERE SUB_CODE = ?",
      [subId]
    );
    // Check if there are any related records in EMP_MAST matching CUS_CODE
    const [empResultByCusCode] = await db.query(
      "SELECT COUNT(*) AS count FROM EMP_MAST WHERE CUS_CODE = ?",
      [cusCode]
    );
    if (empResultBySubCode[0].count > 0 || empResultByCusCode[0].count > 0) {
      return {
        success: false,
        message: "Cannot delete subscription with associated employees",
      };
    }
    // Delete the subscription from SUB_MAST
    const [result] = await db.query("DELETE FROM SUB_MAST WHERE SUB_CODE = ?", [
      subId,
    ]);
    if (result.affectedRows === 0) {
      return { success: false, message: "Subscription not found" };
    }
    return {
      success: true,
      deletedSubID: subId,
      affectedRows: result.affectedRows,
    };
  } catch (err) {
    console.error("Error deleting subscription:", err);
    throw err;
  }
};

// Retrieve all Subscriptions
Subscription.getAll = async (
  limit,
  offset,
  sort,
  order,
  search,
  filter_ad_id,
  filter_from,
  filter_to
) => {
  try {
    let query = `
      SELECT 
        SUB_MAST.*, 
        usr_admin.ad_name AS admin_name, 
        CUS_MAST.CUS_NAME AS customer_name,
        SUB_PLAN.PLA_DESC AS plan_description
      FROM SUB_MAST
      LEFT JOIN usr_admin ON SUB_MAST.ad_id = usr_admin.ad_id
      LEFT JOIN SUB_PLAN ON SUB_MAST.PLA_CODE = SUB_PLAN.PLA_CODE
      LEFT JOIN CUS_MAST ON SUB_MAST.CUS_CODE = CUS_MAST.CUS_CODE`;

    let countQuery = `
      SELECT COUNT(*) as total 
      FROM SUB_MAST
      LEFT JOIN CUS_MAST ON SUB_MAST.CUS_CODE = CUS_MAST.CUS_CODE`;

    let params = [];
    let countParams = [];

    const conditions = [];

    // Handle search
    if (search) {
      const searchCondition =
        "(SUB_MAST.SUB_CODE LIKE ? OR " +
        "SUB_MAST.CUS_CODE LIKE ? OR " +
        "SUB_MAST.PLA_CODE LIKE ? OR " +
        "SUB_MAST.SUB_ORDN LIKE ? OR " +
        "CUS_MAST.CUS_NAME LIKE ?)";
      conditions.push(searchCondition);
      const searchParam = `%${search}%`;
      params.push(
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam
      );
      countParams.push(
        searchParam,
        searchParam,
        searchParam,
        searchParam,
        searchParam
      );
    }

    // Handle filters
    if (filter_ad_id) {
      conditions.push("SUB_MAST.ad_id = ?");
      params.push(filter_ad_id);
      countParams.push(filter_ad_id);
    }
    if (filter_from) {
      conditions.push("SUB_MAST.CREATED_AT >= ?");
      params.push(filter_from);
      countParams.push(filter_from);
    }
    if (filter_to) {
      conditions.push("SUB_MAST.CREATED_AT <= ?");
      params.push(`${filter_to} 23:59:59`);
      countParams.push(`${filter_to} 23:59:59`);
    }

    if (conditions.length > 0) {
      const conditionString = conditions.join(" AND ");
      query += ` WHERE ${conditionString}`;
      countQuery += ` WHERE ${conditionString}`;
    }

    // Handle sorting
    const validSortFields = [
      "SUB_CODE",
      "CUS_CODE",
      "PLA_CODE",
      "SUB_STDT",
      "SUB_ENDT",
      "SUB_PDAT",
      "SUB_ORDN",
      "status",
      "CREATED_AT",
    ];
    if (sort && validSortFields.includes(sort.toUpperCase())) {
      query += ` ORDER BY ${sort.toUpperCase()} ${
        order.toUpperCase() === "DESC" ? "DESC" : "ASC"
      }`;
    } else {
      query += " ORDER BY SUB_MAST.CREATED_AT DESC"; // default sorting
    }

    // Execute count query first to get total count
    const [countResult] = await db.query(countQuery, countParams);
    const totalCount = countResult[0].total;

    // Handle pagination limit
    if (limit === 0) {
      limit = totalCount; // Set limit to total count if limit is 0
    }

    // Execute main query with limit and offset
    query += " LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [subscriptions] = await db.query(query, params);

    return [subscriptions, totalCount];
  } catch (err) {
    console.error("Error retrieving subscriptions:", err);
    throw err;
  }
};

// Retrieve Subscriptions expiring in the next 7 days
Subscription.getExpiringSoon = async () => {
  try {
    const today = new Date();
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    const [subscriptions] = await db.query(
      `SELECT 
         SUB_MAST.*, 
         usr_admin.ad_name AS admin_name, 
         CUS_MAST.CUS_NAME AS customer_name,
         SUB_PLAN.PLA_DESC AS plan_description
       FROM SUB_MAST
       LEFT JOIN usr_admin ON SUB_MAST.ad_id = usr_admin.ad_id
       LEFT JOIN SUB_PLAN ON SUB_MAST.PLA_CODE = SUB_PLAN.PLA_CODE
       LEFT JOIN CUS_MAST ON SUB_MAST.CUS_CODE = CUS_MAST.CUS_CODE
       WHERE SUB_MAST.SUB_ENDT BETWEEN ? AND ?`,
      [
        today.toISOString().split("T")[0],
        sevenDaysFromNow.toISOString().split("T")[0],
      ]
    );

    return subscriptions;
  } catch (err) {
    console.error("Error retrieving expiring subscriptions:", err);
    throw err;
  }
};


module.exports = Subscription;
