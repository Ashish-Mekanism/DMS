// make CRUD OPERATIONS FOR GST_SYSTEM TABLE
const db = require("../utils/apiDb");

// constructor
const GSTSystem = function (gstSystem) {
  this.system_name = gstSystem.system_name;
  this.is_active = gstSystem.is_active;
};

GSTSystem.getAll = async () => {
  try {
    const [rows] = await db.query("SELECT * FROM GST_SYSTEM");
    // Convert Buffer objects to integer values for the is_active field
    const formattedRows = rows.map((row) => ({
      ...row,
      is_active: row.is_active[0],
    }));
    return formattedRows;
  } catch (err) {
    console.log("error: ", err);
    throw err;
  }
};

GSTSystem.findById = async (id) => {
  try {
    const [rows] = await db.query("SELECT * FROM GST_SYSTEM WHERE id = ?", [id]);
    if (rows.length) {
      // Convert Buffer objects to integer values for the is_active field
      const formattedRow = {
        ...rows[0],
        is_active: rows[0].is_active[0],
      };
      return formattedRow;
    }
    throw { kind: "not_found" };
  } catch (err) {
    console.log("error: ", err);
    throw err;
  }
};

GSTSystem.create = async (newGSTSystem) => {
  try {
    const [result] = await db.query(
      "INSERT INTO GST_SYSTEM SET ?",
      newGSTSystem
    );
    return { id: result.insertId, ...newGSTSystem };
  } catch (err) {
    console.log("error: ", err);
    throw err;
  }
};

GSTSystem.updateById = async (id, gstSystem) => {
  try {
    const [result] = await db.query(
      "UPDATE GST_SYSTEM SET system_name = ?, is_active = ? WHERE id = ?",
      [gstSystem.system_name, gstSystem.is_active, id]
    );
    if (result.affectedRows == 0) {
      throw { kind: "not_found" };
    }
    return { id: id, ...gstSystem };
  } catch (err) {
    console.log("error: ", err);
    throw err;
  }
};

GSTSystem.remove = async (id) => {
  try {
    const [result] = await db.query("DELETE FROM GST_SYSTEM WHERE id = ?", [
      id,
    ]);
    if (result.affectedRows == 0) {
      throw { kind: "not_found" };
    }
    return result;
  } catch (err) {
    console.log("error: ", err);
    throw err;
  }
};

GSTSystem.removeAll = async () => {
  try {
    const [result] = await db.query("DELETE FROM GST_SYSTEM");
    return result;
  } catch (err) {
    console.log("error: ", err);
    throw err;
  }
};

module.exports = GSTSystem;