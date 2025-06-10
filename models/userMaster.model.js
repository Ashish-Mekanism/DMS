const db = require("../utils/apiDb");
const axios = require('axios');

const UsrMast = function (usrMast) {
  this.GST_CODE = usrMast.GST_CODE;
  this.GST_NMBR = usrMast.GST_NMBR;
  this.USR_ID = usrMast.USR_ID;
  this.USR_PASS = usrMast.USR_PASS;
  this.CLIENT_ID = usrMast.CLIENT_ID;
  this.CLIENT_SECRET = usrMast.CLIENT_SECRET;
  this.USR_ACTV = usrMast.USR_ACTV;
  this.CREATED_ON = usrMast.CREATED_ON;
  this.CREATED_BY = usrMast.CREATED_BY;
  this.MODIFY_ON = usrMast.MODIFY_ON;
  this.MODIFY_BY = usrMast.MODIFY_BY;
  this.is_admin = usrMast.is_admin;
  this.last_login = usrMast.last_login;
  this.sandbox_access = usrMast.sandbox_access;
};

UsrMast.create = async (newUsrMast) => {
  try {
    // Convert all string values in newUsrMast to uppercase, except USR_PASS
    for (const key in newUsrMast) {
      if (
        key !== "USR_ID" &&
        key !== "USR_PASS" &&
        typeof newUsrMast[key] === "string" &&
        newUsrMast[key].constructor === String
      ) {
        newUsrMast[key] = newUsrMast[key].toUpperCase();
      }
    }
    const [res] = await db.query("INSERT INTO USR_MAST SET ?", newUsrMast);
    return { id: res.insertId, ...newUsrMast };
  } catch (err) {
    console.error("Error creating user:", err);
    throw err;
  }
};

UsrMast.findByIdOrGstCode = async (identifier) => {
  try {
    // Query to check both id and GST_CODE
    const query = "SELECT * FROM USR_MAST WHERE id = ? OR GST_CODE = ?";
    const values = [identifier, identifier];

    const [users] = await db.query(query, values);

    // Convert Buffer objects to integer values for the boolean fields
    const formattedResult = users.map((row) => ({
      ...row,
      USR_ACTV: row.USR_ACTV ? row.USR_ACTV[0] : 0,
      is_admin: row.is_admin ? row.is_admin[0] : 0,
      sandbox_access: row.sandbox_access ? row.sandbox_access[0] : 0,
    }));

    // Decrypt the password field for each user in the result
    for (let user of formattedResult) {
      try {
        const decryptResponse = await axios.post(process.env.DECRYPTION_URL, {
          text: user.USR_PASS,
        });
        user.USR_PASS = decryptResponse.data;
      } catch (decryptError) {
        console.error("Decryption error:", decryptError);
        throw new Error("Error decrypting the password");
      }
    }

    // Check if identifier is a number (id) or a string (GST_CODE)
    if (!isNaN(identifier)) {
      // Return the first matching user if identifier is an id
      return formattedResult.length ? formattedResult[0] : null;
    } else {
      // Return the array of objects if identifier is a GST_CODE
      return formattedResult;
    }
  } catch (err) {
    console.error(`Error finding user by identifier ${identifier}:`, err);
    throw err;
  }
};

UsrMast.updateById = async (id, usrMast) => {
  try {
    // Convert all string values in usrMast to uppercase
    for (const key in usrMast) {
      if (
        key !== "USR_ID" &&
        key !== "USR_PASS" &&
        typeof usrMast[key] === "string" &&
        usrMast[key].constructor === String
      ) {
        usrMast[key] = usrMast[key].toUpperCase();
      }
    }

    // Remove created_on field
    delete usrMast.CREATED_ON;
    delete usrMast.CUS_NAME;

    const [res] = await db.query("UPDATE USR_MAST SET ? WHERE id = ?", [
      usrMast,
      id,
    ]);
    if (res.affectedRows == 0) {
      throw new Error("User not found");
    }
    return { id: id, ...usrMast };
  } catch (err) {
    console.error("Error updating user:", err);
    throw err;
  }
};

UsrMast.getAll = async (
  limit,
  offset,
  sort,
  order,
  search,
  filter_from,
  filter_to,
  filter_created_by
) => {
  try {
    let query = `
      SELECT USR_MAST.id, USR_MAST.GST_CODE, USR_MAST.GST_NMBR, USR_MAST.USR_ID, USR_MAST.USR_PASS, 
             USR_MAST.CLIENT_ID, USR_MAST.CLIENT_SECRET, USR_MAST.USR_ACTV, USR_MAST.CREATED_ON, 
             USR_MAST.CREATED_BY, USR_MAST.MODIFY_ON, USR_MAST.MODIFY_BY, USR_MAST.is_admin, 
             USR_MAST.last_login, USR_MAST.sandbox_access, gst_registration.CUS_NAME
      FROM USR_MAST
      LEFT JOIN gst_registration ON USR_MAST.GST_CODE = gst_registration.REG_CODE
    `;
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM USR_MAST
      LEFT JOIN gst_registration ON USR_MAST.GST_CODE = gst_registration.REG_CODE
    `;
    let params = [];
    let countParams = [];
    const conditions = [];

    // Handle search
    if (search) {
      const searchCondition = `(
        USR_MAST.GST_CODE LIKE ? OR
        USR_MAST.GST_NMBR LIKE ? OR
        USR_MAST.USR_ID LIKE ? OR
        USR_MAST.CLIENT_ID LIKE ? OR
        USR_MAST.ID LIKE ? OR
        gst_registration.CUS_NAME LIKE ?
      )`;
      conditions.push(searchCondition);
      const searchValue = `%${search}%`;
      params.push(
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue
      );
      countParams.push(
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue
      );
    }

    // Handle filters 
    if (filter_from) {
      conditions.push(`USR_MAST.CREATED_ON >= ?`);
      params.push(filter_from);
      countParams.push(filter_from);
    }
    if (filter_created_by) {
      conditions.push(`USR_MAST.CREATED_BY = ?`);
      params.push(filter_created_by);
      countParams.push(filter_created_by);
    }
    if (filter_to) {
      conditions.push(`USR_MAST.CREATED_ON <= ?`);
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
      "GST_CODE",
      "GST_NMBR",
      "USR_ID",
      "CLIENT_ID",
      "CREATED_ON",
      "ID",
      "CUS_NAME",
    ];
    if (sort && validSortFields.includes(sort.toUpperCase())) {
      query += ` ORDER BY ${sort.toUpperCase()} ${
        order.toUpperCase() === "DESC" ? "DESC" : "ASC"
      }`;
    } else {
      query += " ORDER BY USR_MAST.CREATED_ON DESC"; // default sorting
    }

    // Execute count query first to get total count
    const [countResult] = await db.query(countQuery, countParams);
    const totalCount = countResult[0]?.total || 0;

    // Handle pagination limit
    if (limit === 0) {
      limit = totalCount; // Set limit to total count if limit is 0
    }

    // Execute main query with limit and offset
    query += " LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [users = []] = await db.query(query, params);

    // Convert Buffer objects to integer values for the boolean fields
    const formattedResult = users.map((row) => ({
      ...row,
      USR_ACTV: row.USR_ACTV ? row.USR_ACTV[0] : 0,
      is_admin: row.is_admin ? row.is_admin[0] : 0,
      sandbox_access: row.sandbox_access ? row.sandbox_access[0] : 0,
    }));

    return [formattedResult, totalCount];
  } catch (err) {
    console.error("Error retrieving users:", err);
    throw err;
  }
};

// Check if user ID is present in usr_subs table
UsrMast.checkForAssociations = async (userId) => {
  try {
    const [result] = await db.query(
      "SELECT COUNT(*) as count FROM USR_SUBS WHERE user_id = ?",
      [userId]
    );

    const userSubsCount = result[0].count;

    return userSubsCount > 0;
  } catch (err) {
    console.error("Error checking for associations:", err);
    throw err;
  }
};

UsrMast.remove = async (id) => {
  try {
    // Check if there are any associations before deleting
    const hasAssociations = await UsrMast.checkForAssociations(id);

    if (hasAssociations) {
      return {
        success: false,
        message: "Cannot delete user. It is associated with subscription(s).",
      };
    }

    const [res] = await db.query("DELETE FROM USR_MAST WHERE id = ?", [id]);
    if (res.affectedRows === 0) {
      return { success: false, message: "User not found" };
    }
    console.log("Deleted user with id: ", id);
    return { success: true, message: "User deleted successfully" };
  } catch (err) {
    console.error("Error deleting user:", err);
    throw err;
  }
};

module.exports = UsrMast;
