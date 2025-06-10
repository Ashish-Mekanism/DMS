const db = require("../utils/db");

// constructor
const SubPlan = function (subPlan) {
  this.PLA_ID = subPlan.PLA_ID;
  this.PLA_CODE = subPlan.PLA_CODE;
  this.PLA_DESC = subPlan.PLA_DESC;
  this.PLA_MONTH = subPlan.PLA_MONTH;
};

SubPlan.getAll = async () => {
  try {
    const [rows] = await db.query("SELECT * FROM SUB_PLAN");
    
    return rows;
  } catch (err) {
    console.log("error: ", err);
    throw err;
  }
};

SubPlan.findById = async (id) => {
  try {
    const [rows] = await db.query("SELECT * FROM SUB_PLAN WHERE PLA_CODE = ?", [
      id,
    ]);
    if (rows.length) {
      
      return rows[0];
    }
    throw { kind: "not_found" };
  } catch (err) {
    console.log("error: ", err);
    throw err;
  }
};

SubPlan.create = async (newSubPlan) => {
  try {
    // Convert all string values in newSubPlan to uppercase
    for (const key in newSubPlan) {
      if (
        typeof newSubPlan[key] === "string" &&
        newSubPlan[key].constructor === String
      ) {
        newSubPlan[key] = newSubPlan[key].toUpperCase();
      }
    }
    const [result] = await db.query("INSERT INTO SUB_PLAN SET ?", newSubPlan);

    return { id: result.insertId, ...newSubPlan };
  } catch (err) {
    console.log("error: ", err);
    throw err;
  }
};

SubPlan.updateById = async (id, subPlan) => {
  try {
    // Convert all string fields in the subPlan object to uppercase
    for (const key in subPlan) {
      if (
        typeof subPlan[key] === "string" &&
        subPlan[key].constructor === String
      ) {
        subPlan[key] = subPlan[key].toUpperCase();
      }
    }

    // Convert id to uppercase
    id = id.toUpperCase();

    const [result] = await db.query(
      "UPDATE SUB_PLAN SET PLA_CODE = ?, PLA_DESC = ?, PLA_MONTH = ? WHERE PLA_ID = ?",
      [subPlan.PLA_CODE, subPlan.PLA_DESC, subPlan.PLA_MONTH, id]
    );

    if (result.affectedRows == 0) {
      throw { kind: "not_found" };
    }

    return { id: id, ...subPlan };
  } catch (err) {
    console.log("error: ", err);
    throw err;
  }
};


SubPlan.remove = async (id) => {
  try {
    const [result] = await db.query("DELETE FROM SUB_PLAN WHERE PLA_ID = ?", [
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

SubPlan.removeAll = async () => {
  try {
    const [result] = await db.query("DELETE FROM SUB_PLAN");

    return result;
  } catch (err) {
    console.log("error: ", err);
    throw err;
  }
};

module.exports = SubPlan;
