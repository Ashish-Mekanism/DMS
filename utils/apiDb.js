require("dotenv").config();
const mysql = require("mysql2");

// const pool = mysql.createPool({
//   host: process.env.API_DB_HOST,
//   user: process.env.API_DB_USER,
//   password: process.env.API_DB_PASSWORD,
//   database: process.env.API_DB_DATABASE,
//   port: process.env.API_DB_PORT,
//   waitForConnections: true,
//   //connectionLimit: process.env.DB_POOL_MAX,
//   queueLimit: 0,
//   dateStrings: true
// });
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

// Check if the pool has successfully connected
pool.getConnection((err, connection) => {
  if (err) {
    console.log(" ===>", err);
    console.error("Error connecting to MySQL:", err);
    return;
  }
  console.log("API MySQL connected successfully!");
  connection.release(); // Release the connection
});

// Export the pool with promises enabled
module.exports = pool.promise();
