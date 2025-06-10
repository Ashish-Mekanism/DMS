const db = require("./utils/db");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
require("./utils/emailService");
require("./utils/whatsappService");

// Use the CORS middleware without any configuration to allow all origins
app.use(cors());

// Handling preflight requests
app.options(
  "*",
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
);

// Parse requests of content-type: application/json
app.use(bodyParser.json());

// Parse requests of content-type: application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
const adminRoutes = require("./routes/admin.routes");
const customerRoutes = require("./routes/customer.routes");
const employeeRoutes = require("./routes/employee.routes");
const subscriptionRoutes = require("./routes/subscription.routes");
const subplanroutes = require("./routes/subplan.routes");
const gstRegistrationsroutes = require("./routes/gstRegistration.routes");
const UserSubscriptionroutes = require("./routes/UserSubscription.routes");
const UserMasterroutes = require("./routes/userMaster.routes");
const gstSystemroutes = require("./routes/gstSystem.routes");

// Use routes
app.use("/initadmin/ifasapp/api/admins", adminRoutes);
app.use("/initadmin/ifasapp/api/customers", customerRoutes);
app.use("/initadmin/ifasapp/api/employees", employeeRoutes);
app.use("/initadmin/ifasapp/api/subscriptions", subscriptionRoutes);
app.use("/initadmin/ifasapp/api/sub-plans", subplanroutes);

app.use("/initadmin/ifasapp/api/admins", adminRoutes);
app.use("/initadmin/ifasapp/api/customers", customerRoutes);
app.use("/initadmin/ifasapp/api/employees", employeeRoutes);
app.use("/initadmin/ifasapp/api/subscriptions", subscriptionRoutes);
app.use("/initadmin/ifasapp/api/sub-plans", subplanroutes);
app.use("/initadmin/ifasapp/api/gstRegistrations", gstRegistrationsroutes);
app.use("/initadmin/ifasapp/api/UserSubscription", UserSubscriptionroutes);
app.use("/initadmin/ifasapp/api/UserMaster", UserMasterroutes);
app.use("/initadmin/ifasapp/api/gstSystems", gstSystemroutes);

// Default route
app.get("/initadmin/ifasapp", async (req, res) => {
  db.sqlConnection.getConnection(function async(err, connection) {
    if (err) {
      res.send("error");
    } else {
      connection.query("select * from CUS_MAST", function (err, result) {
        if (err) res.json({ message: err });
        res.json({ Result: result });
      });
    }
  });
});

app.get("/initadmin/ifasapp/api", (req, res) => {
  res.json({
    message: "Welcome to IFAS API",
    version: "1.0.0",
    description: "This is the API for IFAS application."
  });
});

// Set port, listen for requests
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}.`);
});
