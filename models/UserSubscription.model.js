const db = require("../utils/apiDb");

const USRSubs = function (usrSubs) {
  this.GST_CODE = usrSubs.GST_CODE;
  this.GST_NMBR = usrSubs.GST_NMBR;
  this.SYSTEM_ID = usrSubs.SYSTEM_ID;
  this.SUBSCRIPTION_ID = usrSubs.SUBSCRIPTION_ID;
  this.SUBSCRIPTION_DATE = usrSubs.SUBSCRIPTION_DATE;
  this.ALLOTED_CALLS = usrSubs.ALLOTED_CALLS;
  this.USED_CALLS = usrSubs.USED_CALLS;
  this.PENDING_CALLS = usrSubs.PENDING_CALLS;
  this.is_active = usrSubs.is_active;
  this.created_by = usrSubs.created_by;
  this.user_id = usrSubs.user_id;
  this.expiry_date = usrSubs.expiry_date;
  this.INV_DATE = usrSubs.INV_DATE;
  this.INV_NO = usrSubs.INV_NO;
  this.IS_VERIFIED = usrSubs.IS_VERIFIED;
};

USRSubs.create = async (newUSRSubs) => {
  try {
    // Calculate expiry_date as one year from SUBSCRIPTION_DATE
    const subscriptionDate = new Date(newUSRSubs.SUBSCRIPTION_DATE);
    const expiryDate = new Date(subscriptionDate);
    expiryDate.setFullYear(subscriptionDate.getFullYear() + 1);

    // Set the calculated expiry_date
    newUSRSubs.expiry_date = expiryDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

    // Remove created_on from newUSRSubs if it exists
    const { created_on, ...insertData } = newUSRSubs;

    const [res] = await db.query("INSERT INTO USR_SUBS SET ?", insertData);

    // Fetch the newly created record to get all fields including created_on
    const [newRecord] = await db.query("SELECT * FROM USR_SUBS WHERE id = ?", [
      res.insertId,
    ]);

    return newRecord[0];
  } catch (err) {
    console.error("Error creating user subscription:", err);
    throw err;
  }
};

USRSubs.findById = async (id) => {
  try {
    const [result] = await db.query("SELECT * FROM USR_SUBS WHERE id = ?", [
      id,
    ]);

    if (!result.length) {
      return null;
    }

    // Convert Buffer objects to integer values for the is_active field
    const formattedUsrSubs = result.map((row) => ({
      ...row,
      is_active: row.is_active[0],
    }));

    return formattedUsrSubs[0];
  } catch (err) {
    console.error(`Error finding user subscription by ID ${id}:`, err);
    throw err;
  }
};

USRSubs.getAll = async (
  limit,
  offset,
  sort,
  order,
  search,
  filter_user_id,
  filter_from,
  filter_to,
  filter_gst_code,
  filter_system_id,
  filter_created_by
) => {
  try {
    let query = `
      SELECT USR_SUBS.*, GST_SYSTEM.system_name, gst_registration.CUS_NAME,USR_MAST.USR_ID
      FROM USR_SUBS
      LEFT JOIN GST_SYSTEM ON USR_SUBS.SYSTEM_ID = GST_SYSTEM.id
            LEFT JOIN gst_registration ON USR_SUBS.GST_CODE = gst_registration.REG_CODE
            LEFT JOIN USR_MAST ON USR_SUBS.user_id = USR_MAST.id
    `;
    let countQuery = `
      SELECT COUNT(*) as total
      FROM USR_SUBS
      LEFT JOIN GST_SYSTEM ON USR_SUBS.SYSTEM_ID = GST_SYSTEM.id
            LEFT JOIN gst_registration ON USR_SUBS.GST_CODE = gst_registration.REG_CODE
            LEFT JOIN USR_MAST ON USR_SUBS.user_id = USR_MAST.id
    `;
    let params = [];
    let countParams = [];
    const conditions = [];

    // Add search condition if provided
    if (search) {
      const searchCondition =
        "CONCAT_WS('', USR_SUBS.GST_CODE, USR_SUBS.GST_NMBR, USR_SUBS.SYSTEM_ID, USR_SUBS.SUBSCRIPTION_ID, USR_SUBS.created_by, gst_registration.CUS_NAME) LIKE ?";
      conditions.push(searchCondition);
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }


    if (filter_created_by) {
       conditions.push(`USR_SUBS.created_by = ?`);
      params.push(filter_created_by);
      countParams.push(filter_created_by);
    }
    // Add filter_gst_code condition if provided
    if (filter_gst_code) {
      conditions.push("USR_SUBS.GST_CODE = ?");
      params.push(filter_gst_code);
      countParams.push(filter_gst_code);
    }

    // Add filter_user_id condition if provided
    if (filter_user_id) {
      conditions.push("USR_SUBS.user_id = ?");
      params.push(filter_user_id);
      countParams.push(filter_user_id);
    }

    // Add filter_from condition if provided
    if (filter_from) {
      conditions.push("USR_SUBS.created_on >= ?");
      params.push(filter_from);
      countParams.push(filter_from);
    }

    // Add filter_to condition if provided
    if (filter_to) {
      conditions.push("USR_SUBS.created_on <= ?");
      params.push(`${filter_to} 23:59:59`);
      countParams.push(`${filter_to} 23:59:59`);
    }

    // Add filter_system_id condition if provided
    if (filter_system_id) {
      if (filter_system_id == 2) {
        conditions.push("USR_SUBS.SYSTEM_ID IN (1, 2)");
      } else {
        conditions.push("USR_SUBS.SYSTEM_ID = ?");
        params.push(filter_system_id);
        countParams.push(filter_system_id);
      }
    }

    // Build the WHERE clause if there are any conditions
    if (conditions.length > 0) {
      const conditionString = conditions.join(" AND ");
      query += ` WHERE ${conditionString}`;
      countQuery += ` WHERE ${conditionString}`;
    }

    // Set sorting
    const validSortFields = [
      "GST_CODE",
      "SYSTEM_ID",
      "SUBSCRIPTION_ID",
      "SUBSCRIPTION_DATE",
      "ALLOTED_CALLS",
      "USED_CALLS",
      "PENDING_CALLS",
      "is_active",
      "created_on",
      "expiry_date",
      "ID",
      "system_name", // Include system_name in sorting options
      
    ];

    if (sort && validSortFields.includes(sort.toUpperCase())) {
      query += ` ORDER BY ${sort.toUpperCase()} ${
        order.toUpperCase() === "DESC" ? "DESC" : "ASC"
      }`;
    } else {
      query += " ORDER BY created_on DESC";
    }

    // Log the constructed queries and parameters
    // console.log("SQL Query:", query);
    // console.log("Query Parameters:", params);
    // console.log("Count Query:", countQuery);
    // console.log("Count Query Parameters:", countParams);

    // Execute count query
    const [countResult] = await db.query(countQuery, countParams);
    const totalCount = countResult[0].total;

    if (limit === 0) {
      limit = totalCount;
    }

    // Add LIMIT and OFFSET to the query
    query += " LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));



    // Execute the main query
    const [usrSubs] = await db.query(query, params);

    // Convert Buffer objects to integer values for the is_active field
    const formattedUsrSubs = usrSubs.map((row) => ({
      ...row,
      is_active: row.is_active[0],
    }));

    return [formattedUsrSubs, totalCount];
  } catch (err) {
    console.error("Error retrieving user subscriptions:", err);
    throw err;
  }
};

USRSubs.updateById = async (id, usrSubs) => {
  try {
    // Remove fields that should not be updated
    delete usrSubs.created_on;
    delete usrSubs.CUS_NAME;
    delete usrSubs.USR_ID;
    if (usrSubs.hasOwnProperty("system_name")) {
      delete usrSubs.system_name;
    }

    // Fetch the current subscription data
    const [currentSubs] = await db.query(
      "SELECT * FROM USR_SUBS WHERE id = ?",
      [id]
    );

    if (currentSubs.length === 0) {
      throw new Error("User subscription not found");
    }

    const current = currentSubs[0];

    // Ensure the new ALLOTED_CALLS is not less than current or updated USED_CALLS
    const usedCalls =
      usrSubs.USED_CALLS !== undefined
        ? usrSubs.USED_CALLS
        : current.USED_CALLS;
    if (usrSubs.ALLOTED_CALLS < usedCalls) {
      throw new Error("Allocated calls cannot be less than used calls");
    }

    // Ensure the updated USED_CALLS does not exceed ALLOTED_CALLS
    if (usrSubs.USED_CALLS && usrSubs.USED_CALLS > usrSubs.ALLOTED_CALLS) {
      throw new Error("Used calls cannot exceed allocated calls");
    }

    // Calculate pending calls based on the updated values
    usrSubs.PENDING_CALLS = usrSubs.ALLOTED_CALLS - usedCalls;

    // Perform the update
    const [res] = await db.query("UPDATE USR_SUBS SET ? WHERE id = ?", [
      usrSubs,
      id,
    ]);

    if (res.affectedRows == 0) {
      throw new Error("User subscription not found");
    }

    // Return the updated data including the new PENDING_CALLS
    return { id, ...usrSubs };
  } catch (err) {
    console.error("Error updating user subscription:", err.message, err.stack);
    throw err;
  }
};


// Retrieve API-Subscriptions expiring in the next 7 days
USRSubs.getExpiringSoon = async () => {
  try {
    const today = new Date();
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    const [subscriptions] = await db.query(
      `SELECT 
         USR_SUBS.*, 
         gst_registration.CUS_NAME AS customer_name
       FROM USR_SUBS
       LEFT JOIN gst_registration ON USR_SUBS.GST_CODE = gst_registration.REG_CODE
       WHERE USR_SUBS.expiry_date BETWEEN ? AND ?`,
      [
        today.toISOString().split("T")[0],
        sevenDaysFromNow.toISOString().split("T")[0],
      ]
    );
    // Convert Buffer objects to integer values for the is_active field
    const formattedUsrSubs = subscriptions.map((row) => ({
      ...row,
      is_active: row.is_active[0],
    }));

    return formattedUsrSubs;
  } catch (err) {
    console.error("Error retrieving expiring subscriptions:", err);
    throw err;
  }
};

USRSubs.findByGST_CODE = async (GST_CODE) => {
  const subscription = await db.query(
    `SELECT sm.*, cm.CUS_MAIL, cm.PHO_NMBR , cm.CUS_NAME 
     FROM USR_SUBS sm
      JOIN gst_registration cm ON sm.GST_CODE = cm.REG_CODE
     WHERE sm.GST_CODE = ?`,
    [GST_CODE]
  );
  return subscription[0][0];
};


USRSubs.getNextSubscriptionId = async () => {
  try {
    const [result] = await db.query(
      "SELECT MAX(SUBSCRIPTION_ID) as maxId FROM USR_SUBS"
    );
    const maxId = result[0].maxId || 0;
    return maxId + 1;
  } catch (err) {
    console.error("Error getting next subscription ID:", err);
    throw err;
  }
};

USRSubs.remove = async (id) => {
  try {
    // Check if USED_CALLS is greater than zero
    const [checkRes] = await db.query(
      "SELECT USED_CALLS FROM USR_SUBS WHERE id = ?",
      [id]
    );
    if (checkRes.length === 0) {
      return {
        success: false,
        message: "User subscription not found",
        statusCode: 404,
      };
    }
    if (checkRes[0].USED_CALLS > 0) {
      return {
        success: false,
        message: "Cannot delete subscription with USED_CALLS greater than zero",
        statusCode: 400,
      };
    }

    // Proceed with deletion if USED_CALLS is zero
    const [res] = await db.query("DELETE FROM USR_SUBS WHERE id = ?", [id]);
    if (res.affectedRows == 0) {
      return {
        success: false,
        message: "User subscription not found",
        statusCode: 404,
      };
    }
    return {
      success: true,
      message: "User subscription was deleted successfully",
      statusCode: 200,
    };
  } catch (err) {
    console.error("Error deleting user subscription:", err);
    throw err;
  }
};

module.exports = USRSubs;
