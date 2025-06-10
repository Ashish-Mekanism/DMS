const db = require("../utils/apiDb");
const moment = require("moment");

const GstRegistration = function (gstRegistration) {
  this.REG_CODE = gstRegistration.REG_CODE;
  this.CUS_NAME = gstRegistration.CUS_NAME;
  this.CUS_ADDR = gstRegistration.CUS_ADDR;
  this.CMP_NAME = gstRegistration.CMP_NAME;
  this.notification_date = gstRegistration.notification_date;
  this.CREATED_BY = gstRegistration.CREATED_BY;
  this.PHO_NMBR = gstRegistration.PHO_NMBR; 
  this.CUS_MAIL = gstRegistration.CUS_MAIL; 
};

GstRegistration.create = async (newGstRegistration) => {
  if (!newGstRegistration.CUS_NAME) {
    throw new Error("CUS_NAME is required");
  }

  // Convert all string values in newGstRegistration to uppercase
   for (const key in newGstRegistration) {
    if (
      key !== "CUS_MAIL" && // Exclude CUS_MAIL from being converted to uppercase
      typeof newGstRegistration[key] === "string" &&
      newGstRegistration[key].constructor === String
    ) {
      newGstRegistration[key] = newGstRegistration[key].toUpperCase();
    }
  }

  const now = new Date();

  // Generate REG_CODE
  const nameParts = newGstRegistration.CUS_NAME.split(" ");
  const initials = nameParts
    .slice(0, 2)
    .map((part) => part[0])
    .join(""); // Take the first letter of the first two words

  try {
    // Find the highest number for the given initials
    const [rows] = await db.query(
      "SELECT REG_CODE FROM gst_registration WHERE REG_CODE LIKE ? ORDER BY REG_CODE DESC LIMIT 1",
      [`${initials}%`]
    );

    let number = 1;
    if (rows.length > 0) {
      const lastCode = rows[0].REG_CODE;
      const lastNumber = parseInt(lastCode.slice(-4));
      number = lastNumber + 1;
    }

    newGstRegistration.REG_CODE = `${initials}${number
      .toString()
      .padStart(4, "0")}`;

    // Format notification_date for MySQL
    newGstRegistration.notification_date = now
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    // Insert the new GST registration
    const [res] = await db.query(
      "INSERT INTO gst_registration SET ?",
      newGstRegistration
    );
    return { id: res.insertId, ...newGstRegistration };
  } catch (err) {
    console.error("Error creating GST registration:", err);
    throw err;
  }
};

GstRegistration.findById = async (id) => {
  try {
    const [result] = await db.query(
      "SELECT * FROM gst_registration WHERE id = ?",
      [id]
    );
    return result.length ? result[0] : null;
  } catch (err) {
    console.error(`Error finding GST registration by id ${id}:`, err);
    throw err;
  }
};

GstRegistration.updateById = async (id, gstRegistration) => {
  try {
    const [res] = await db.query("UPDATE gst_registration SET ? WHERE id = ?", [
      gstRegistration,
      id,
    ]);
    if (res.affectedRows == 0) {
      throw new Error("GST registration not found");
    }
    return { id: id, ...gstRegistration };
  } catch (err) {
    console.error("Error updating GST registration:", err);
    throw err;
  }
};

GstRegistration.getAll = async (
  limit,
  offset,
  sort,
  order,
  search,
  filter_from,
  filter_to
) => {
  try {
    let query = `SELECT * FROM gst_registration`;
    let countQuery = `SELECT COUNT(*) as total FROM gst_registration`;
    let params = [];
    let countParams = [];

    const conditions = [];

    // Handle search
    if (search) {
      const searchCondition = `(
        REG_CODE LIKE ? OR 
        CUS_NAME LIKE ? OR 
        CMP_NAME LIKE ? OR
        id LIKE ?
      )`;
      conditions.push(searchCondition);
      const searchValue = `%${search}%`;
      params.push(searchValue, searchValue, searchValue, searchValue);
      countParams.push(searchValue, searchValue, searchValue, searchValue);
    }

    // Handle filters
    if (filter_from) {
      conditions.push(`created_at >= ?`);
      params.push(filter_from);
      countParams.push(filter_from);
    }
    if (filter_to) {
      conditions.push(`created_at <= ?`);
      params.push(`${filter_to} 23:59:59`);
      countParams.push(`${filter_to} 23:59:59`);
    }

    if (conditions.length > 0) {
      const conditionString = conditions.join(" AND ");
      query += ` WHERE ${conditionString}`;
      countQuery += ` WHERE ${conditionString}`;
    }

    // Handle sorting
    const validSortFields = ["REG_CODE", "CUS_NAME", "CMP_NAME", "created_at","ID"];
    if (sort && validSortFields.includes(sort.toUpperCase())) {
      query += ` ORDER BY ${sort.toUpperCase()} ${
        order.toUpperCase() === "DESC" ? "DESC" : "ASC"
      }`;
    } else {
      query += " ORDER BY created_at DESC"; // default sorting
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

    const [gstRegistrations = []] = await db.query(query, params);

    // Convert Buffer objects to integer values for the is_active field
    const formattedResult = gstRegistrations.map((row) => ({
      ...row,
      USR_ACTV: row.USR_ACTV ? row.USR_ACTV[0] : 0, // Safe access
      is_admin: row.is_admin ? row.is_admin[0] : 0, // Safe access
      sandbox_access: row.sandbox_access ? row.sandbox_access[0] : 0, // Safe access
    }));

    return [formattedResult, totalCount];
  } catch (err) {
    console.error("Error retrieving GST registrations:", err);
    throw err;
  }
};

GstRegistration.checkForMatches = async (regCode) => {
  try {
    // Check in user_master table
    const [userMasterResult] = await db.query(
      "SELECT COUNT(*) as count FROM USR_MAST WHERE GST_CODE = ?",
      [regCode]
    );

    // Check in usr_subs table
    const [userSubsResult] = await db.query(
      "SELECT COUNT(*) as count FROM USR_SUBS WHERE GST_CODE = ?",
      [regCode]
    );

    const userMasterCount = userMasterResult[0].count;
    const userSubsCount = userSubsResult[0].count;

    return {
      inUserMaster: userMasterCount > 0,
      inUserSubs: userSubsCount > 0,
    };
  } catch (err) {
    console.error("Error checking for matches:", err);
    throw err;
  }
};

GstRegistration.getRegCodeById = async (id) => {
  try {
    const [result] = await db.query(
      "SELECT REG_CODE FROM gst_registration WHERE id = ?",
      [id]
    );

    if (result.length === 0) {
      throw new Error("GST registration not found");
    }

    return result[0].REG_CODE;
  } catch (err) {
    console.error("Error fetching REG_CODE:", err);
    throw err;
  }
};

GstRegistration.remove = async (id) => {
  try {
    const [res] = await db.query(
      "DELETE FROM gst_registration WHERE id = ?",
      [id] // Pass the id as an array element
    );
    if (res.affectedRows === 0) {
      throw new Error("GST registration not found");
    }
    console.log("Deleted GST registration with id: ", id);
    return res;
  } catch (err) {
    console.error("Error deleting GST registration:", err);
    throw err;
  }
};

GstRegistration.removeUserByGstCode = async (gstCode) => {
  try {
    const [result] = await db.query("DELETE FROM USR_MAST WHERE GST_CODE = ?", [
      gstCode,
    ]);
    if (result.affectedRows === 0) {
      throw new Error("User not found in USR_MAST");
    }
    console.log("Deleted user with GST_CODE: ", gstCode);
    return result;
  } catch (err) {
    console.error("Error deleting user from USR_MAST:", err);
    throw err;
  }
};
 




module.exports = GstRegistration;
