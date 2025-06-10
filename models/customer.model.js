const db = require("../utils/db");

const Customer = function (customer) {
  this.CUS_CODE = customer.CUS_CODE;
  this.CUS_NAME = customer.CUS_NAME;
  this.INS_DATE = customer.INS_DATE;
  this.DUE_DAYS = customer.DUE_DAYS;
  this.EXP_DATE = customer.EXP_DATE;
  this.USR_NMBR = customer.USR_NMBR;
  this.CUS_PASS = customer.CUS_PASS;
  this.CUS_MAIL = customer.CUS_MAIL;
  this.CUS_MESG = customer.CUS_MESG;
  this.CON_PERS = customer.CON_PERS;
  this.CUS_ADDR = customer.CUS_ADDR;
  this.PHO_NMBR = customer.PHO_NMBR;
  this.CUS_REFB = customer.CUS_REFB;
  this.is_active =
    customer.is_active !== undefined ? Number(customer.is_active) : 1;
  this.ad_id = customer.ad_id; // Include ad_id from req.user
};

// Create a new Customer
Customer.create = async (newCustomer) => {
  if (!newCustomer.CUS_NAME) {
    throw new Error("CUS_NAME is required");
  }

  // Convert all string values in newCustomer to uppercase
    for (const key in newCustomer) {
    if (
      key !== "CUS_MAIL" && // Exclude CUS_MAIL from being converted to uppercase
      typeof newCustomer[key] === "string" &&
      newCustomer[key].constructor === String
    ) {
      newCustomer[key] = newCustomer[key].toUpperCase();
    }
  }

  const now = new Date();
  const expirationDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  // Generate CUS_CODE
  const nameParts = newCustomer.CUS_NAME.split(" ");
  const initials = nameParts[0].slice(0, 2); // Take first two letters of the first word

  try {
    const nameParts = newCustomer.CUS_NAME.split(" ");
    const initials = nameParts
      .slice(0, 2)
      .map((part) => part[0])
      .join("");
    // Find the highest number for the given initials
    const [rows] = await db.query(
      "SELECT CUS_CODE FROM CUS_MAST WHERE CUS_CODE LIKE ? ORDER BY CUS_CODE DESC LIMIT 1",
      [`${initials}%`]
    );

    let number = 1;
    if (rows.length > 0) {
      const lastCode = rows[0].CUS_CODE;
      const lastNumber = parseInt(lastCode.slice(-4));
      number = lastNumber + 1;
    }

    newCustomer.CUS_CODE = `${initials}${number.toString().padStart(4, "0")}`;

    // Format dates for MySQL
    newCustomer.INS_DATE = now.toISOString().slice(0, 19).replace("T", " ");
    newCustomer.DUE_DAYS = 30;
    newCustomer.EXP_DATE = expirationDate.toISOString().slice(0, 10);

    // Insert the new customer
    const [res] = await db.query("INSERT INTO CUS_MAST SET ?", newCustomer);
    console.log("Created customer: ", { id: res.insertId, ...newCustomer });
    return { id: res.insertId, ...newCustomer };
  } catch (err) {
    console.error("Error creating customer:", err);
    throw err;
  }
};
// Retrieve Customer by id
Customer.findById = async (custId) => {
  try {
    const [customers] = await db.query(
      "SELECT * FROM CUS_MAST WHERE CUS_CODE = ?",
      [custId]
    );
    if (customers.length === 0) {
      throw { message: "Customer not found" };
    }
    return customers[0];
  } catch (err) {
    console.error("Error retrieving customer:", err);
    throw err;
  }
};

// Update Customer by id
Customer.updateById = async (CUS_CODE, updateData) => {
  const allowedFields = [
    "CUS_NAME",
    "INS_DATE",
    "DUE_DAYS",
    "EXP_DATE",
    "USR_NMBR",
    "SYN_DATE",
    "POS_SYNC",
    "CUS_PASS",
    "CUS_MAIL",
    "LOG_INDT",
    "CUS_MESG",
    "MSG_EXDT",
    "CON_PERS",
    "CUS_ADDR",
    "PHO_NMBR",
    "CUS_REFB",
    "GRP_CODE",
    "INS_USER",
    "BUS_CODE",
    "CMP_VERS",
    "client_id",
    "client_secret",
    "database_name",
    "is_active",
    "app_key",
    "reg_type_id",
  ];

  try {
    let updateFields = [];
    let updateValues = [];

      // Convert all string fields in the updateData object to uppercase
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        if (key !== "CUS_MAIL" && typeof value === "string" && value.constructor === String) {
          updateData[key] = value.toUpperCase();
        }
      }
    }

    // Process each field for the SQL update query
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        if (
          [
            "INS_DATE",
            "SYN_DATE",
            "POS_SYNC",
            "LOG_INDT",
            "EXP_DATE",
            "MSG_EXDT",
          ].includes(key)
        ) {
          // Ensure date fields are in the correct format
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            throw new Error(`Invalid ${key} format`);
          }
          updateFields.push(`${key.toUpperCase()} = ?`);
          updateValues.push(date.toISOString().slice(0, 19).replace("T", " "));
        } else {
          updateFields.push(`${key.toUpperCase()} = ?`);
          updateValues.push(value);
        }
      }
    }

    if (updateFields.length === 0) {
      throw new Error("No valid fields to update");
    }

    updateValues.push(CUS_CODE.toUpperCase());

    const sql = `UPDATE CUS_MAST SET ${updateFields.join(
      ", "
    )} WHERE CUS_CODE = ?`;
    const [result] = await db.query(sql, updateValues);

    if (result.affectedRows === 0) {
      throw new Error("Customer not found");
    }

    console.log("Updated customer: ", { CUS_CODE, ...updateData });
    return { CUS_CODE, ...updateData };
  } catch (err) {
    console.error("Error updating customer:", err);
    throw err;
  }
};

// Retrieve all Customers
Customer.getAll = async (
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
        CUS_MAST.*, 
        usr_admin.ad_name AS admin_name 
      FROM CUS_MAST
      LEFT JOIN usr_admin ON CUS_MAST.ad_id = usr_admin.ad_id`;
    let countQuery = "SELECT COUNT(*) as total FROM CUS_MAST";
    let params = [];
    let countParams = [];

    // Handle search
    if (search) {
      query +=
        " WHERE CONCAT_WS('', CUS_CODE, CUS_NAME, CUS_MAIL, PHO_NMBR, CUS_ADDR) LIKE ?";
      countQuery +=
        " WHERE CONCAT_WS('', CUS_CODE, CUS_NAME, CUS_MAIL, PHO_NMBR, CUS_ADDR) LIKE ?";
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    // Handle filters
    if (filter_ad_id || filter_from || filter_to) {
      if (!search) {
        query += " WHERE";
        countQuery += " WHERE";
      } else {
        query += " AND";
        countQuery += " AND";
      }

      const filters = [];
      if (filter_ad_id) {
        filters.push(" ad_id = ?");
        params.push(filter_ad_id);
        countParams.push(filter_ad_id);
      }
      if (filter_from) {
        filters.push(" CREATED_AT >= ?");
        params.push(filter_from);
        countParams.push(filter_from);
      }
      if (filter_to) {
        filters.push(" CREATED_AT <= ?");
        params.push(`${filter_to} 23:59:59`);
        countParams.push(`${filter_to} 23:59:59`);
      }

      query += filters.join(" AND ");
      countQuery += filters.join(" AND ");
    }

    // Handle sorting
    if (
      sort &&
      [
        "CUS_CODE",
        "CUS_NAME",
        "INS_DATE",
        "EXP_DATE",
        "CUS_MAIL",
        "PHO_NMBR",
      ].includes(sort.toUpperCase())
    ) {
      query += ` ORDER BY ${sort} ${
        order.toUpperCase() === "DESC" ? "DESC" : "ASC"
      }`;
    } else {
      query += " ORDER BY CREATED_AT DESC"; // default sorting
    }

    // Execute queries
    const [countResult] = await db.query(countQuery, countParams);
    const totalCount = countResult[0].total;

    if (limit === 0) {
      limit = totalCount; // Set limit to total count if limit is 0
    }

    // Handle pagination
    query += " LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [customers] = await db.query(query, params);

    return [customers, totalCount];
  } catch (err) {
    console.error("Error retrieving customers:", err);
    throw err;
  }
};

// Delete Customer by id
Customer.remove = async (CUS_CODE) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Check if there are any active subscriptions for the customer
    const [activeSubscriptions] = await connection.query(
      "SELECT COUNT(*) as count FROM SUB_MAST WHERE CUS_CODE = ? AND status = 1",
      [CUS_CODE]
    );

    if (activeSubscriptions[0].count > 0) {
      await connection.rollback();
      return {
        status: "forbidden",
        message: "Customer has active subscriptions and cannot be deleted",
      };
    }

    // Delete related records from EMP_MAST
    await connection.query("DELETE FROM EMP_MAST WHERE CUS_CODE = ?", [
      CUS_CODE,
    ]);

    // Delete related records from SUB_MAST
    await connection.query("DELETE FROM SUB_MAST WHERE CUS_CODE = ?", [
      CUS_CODE,
    ]);

    // Delete the customer from CUS_MAST
    const [result] = await connection.query(
      "DELETE FROM CUS_MAST WHERE CUS_CODE = ?",
      [CUS_CODE]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return { status: "notFound", message: "Customer not found" };
    }

    await connection.commit();
    return {
      status: "success",
      message: "Customer deleted successfully",
      data: result,
    };
  } catch (err) {
    await connection.rollback();
    console.error("Error deleting customer:", err);
    return { status: "error", message: "Error deleting customer" };
  } finally {
    connection.release();
  }
};

module.exports = Customer;
