const db = require("../utils/db.js");
const Subscription = require("../models/subscription.model.js");
const response = require("../utils/response.js");
const { sendEmail } = require("../utils/emailService");
const { sendWhatsAppMessage } = require("../utils/whatsappService");

exports.create = async (req, res) => {
  try {
    if (!req.body) {
      return res
        .status(400)
        .json(response.badRequest("Content cannot be empty!"));
    }
    if (!req.body.SUB_STDT) {
      return res
        .status(400)
        .json(
          response.badRequest("Subscription start date (SUB_STDT) is required.")
        );
    }

    const subscription = new Subscription({
      CUS_CODE: req.body.CUS_CODE,
      PLA_CODE: req.body.PLA_CODE,
      SUB_STDT: req.body.SUB_STDT, // Already in YYYY-MM-DD format
      LIC_USER: req.body.LIC_USER,
      SUB_ORDN: req.body.SUB_ORDN,
      status: req.body.status,
      ORD_REQD: req.body.ORD_REQD,
      ad_id: req.user.id,
      INV_DATE: req.body.INV_DATE, // Assuming this is also in YYYY-MM-DD format
      is_verified: req.body.is_verified, // Include is_verified field
    });

    const result = await Subscription.create(subscription);

    if (result.status === "error") {
      return res.status(result.statusCode).json(result);
    }

    res.status(result.statusCode).json(result);
  } catch (err) {
    res
      .status(500)
      .json(
        response.error(
          err.message || "Some error occurred while creating the Subscription."
        )
      );
  }
};

exports.findAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.items_per_page) || 0;
    const offset = (page - 1) * limit;
    const sort = req.query.sort || "created_at";
    const order = req.query.order || "desc";
    const search = req.query.search || "";
    const filter_ad_id = req.query.filter_ad_id || null;
    const filter_from = req.query.filter_from || null;
    const filter_to = req.query.filter_to || null;

    if (filter_from && !isValidDate(filter_from)) {
      return res
        .status(400)
        .json(response.error("Invalid filter_from date format"));
    }
    if (filter_to && !isValidDate(filter_to)) {
      return res
        .status(400)
        .json(response.error("Invalid filter_to date format"));
    }

    const [subscriptions, totalCount] = await Subscription.getAll(
      limit,
      offset,
      sort,
      order,
      search,
      filter_ad_id,
      filter_from,
      filter_to
    );

    let paginationData = {};
    if (limit !== null) {
      const totalPages = Math.ceil(totalCount / (limit || 1));

      let links = [];
      const maxPageLinks = 5;
      const startPage = Math.max(1, page - Math.floor(maxPageLinks / 2));
      const endPage = Math.min(totalPages, startPage + maxPageLinks - 1);

      for (let i = startPage; i <= endPage; i++) {
        links.push(
          createPageLink(
            i,
            page,
            limit,
            sort,
            order,
            search,
            filter_ad_id,
            filter_from,
            filter_to
          )
        );
      }

      if (page > 1) {
        links.unshift(
          createPageLink(
            page - 1,
            page,
            limit,
            sort,
            order,
            search,
            filter_ad_id,
            filter_from,
            filter_to,
            "Previous"
          )
        );
      }
      if (page < totalPages) {
        links.push(
          createPageLink(
            page + 1,
            page,
            limit,
            sort,
            order,
            search,
            filter_ad_id,
            filter_from,
            filter_to,
            "Next"
          )
        );
      }

      paginationData = {
        page: page,
        first_page_url: createUrl(
          1,
          limit,
          sort,
          order,
          search,
          filter_ad_id,
          filter_from,
          filter_to
        ),
        last_page: totalPages,
        next_page_url:
          page < totalPages
            ? createUrl(
                page + 1,
                limit,
                sort,
                order,
                search,
                filter_ad_id,
                filter_from,
                filter_to
              )
            : null,
        prev_page_url:
          page > 1
            ? createUrl(
                page - 1,
                limit,
                sort,
                order,
                search,
                filter_ad_id,
                filter_from,
                filter_to
              )
            : null,
        items_per_page: limit,
        from: offset + 1,
        to: offset + subscriptions.length,
        total: totalCount,
        links,
      };
    }

    res.json(
      response.success("Subscriptions retrieved successfully", subscriptions, {
        pagination: paginationData,
      })
    );
  } catch (err) {
    console.error("Error in findAll:", err);
    res
      .status(500)
      .json(
        response.error("An error occurred while retrieving subscriptions.")
      );
  }
};

const createPageLink = (
  pageNum,
  currentPage,
  limit,
  sort,
  order,
  search,
  filter_ad_id,
  filter_from,
  filter_to,
  label = null
) => {
  return {
    url: createUrl(
      pageNum,
      limit,
      sort,
      order,
      search,
      filter_ad_id,
      filter_from,
      filter_to
    ),
    label: label || `${pageNum}`,
    active: pageNum === currentPage,
    page: pageNum,
  };
};

const createUrl = (
  page,
  limit,
  sort,
  order,
  search,
  filter_ad_id,
  filter_from,
  filter_to
) => {
  const params = new URLSearchParams({
    page: page.toString(),
    items_per_page: limit.toString(),
    sort,
    order,
    search: encodeURIComponent(search),
  });

  if (filter_ad_id) params.append("filter_ad_id", filter_ad_id);
  if (filter_from) params.append("filter_from", filter_from);
  if (filter_to) params.append("filter_to", filter_to);

  return `/api/subscriptions?${params.toString()}`;
};

const isValidDate = (dateString) => {
  const regex = /^\d{4}-(0[1-9]|1[0-2]|[1-3]\d)-(0[1-9]|[12]\d|3[01])$/;
  if (!regex.test(dateString)) return false;

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

// Find a single Subscription with an id
exports.findOne = async (req, res) => {
  try {
    const { filter_ad_id, filter_from, filter_to } = req.query;
    const data = await Subscription.findById(
      req.params.subId,
      filter_ad_id,
      filter_from,
      filter_to
    );
    console.log("Subscription retrieved successfully:", data);
    // Always return status 200, even if the subscription is not found
    return res
      .status(200)
      .send(response.success("Subscription retrieved successfully", data));
  } catch (err) {
    console.error(
      "Error retrieving subscription with id",
      req.params.subId,
      ":",
      err
    );
    return res
      .status(500)
      .send(
        response.error(
          "Error retrieving subscription with id " + req.params.subId
        )
      );
  }
};

// Update a Subscription identified by the id in the request
exports.update = async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    console.log("Empty request body");
    return res
      .status(400)
      .send(response.badRequest("Content can not be empty!"));
  }

  const subCode = req.params.subCode;

  try {
    const result = await Subscription.updateByCode(subCode, req.body);

    if (result.error) {
      return res
        .status(result.statusCode)
        .send(response.error(result.error, result.statusCode));
    }

    const updatedSubscription = result.data;
    return res
      .status(200)
      .send(
        response.success(
          "Subscription updated successfully",
          updatedSubscription
        )
      );
  } catch (err) {
    console.error("Error in updateByCode:", err);
    return res
      .status(500)
      .send(
        response.error(
          `Error updating Subscription with code ${subCode}: ${err.message}`
        )
      );
  }
};

// Delete a Subscription with the specified id in the request
exports.delete = async (req, res) => {
  try {
    const result = await Subscription.remove(
      req.params.subId,
      req.params.cusCode
    );
    if (result.success) {
      res.send({ message: "Subscription deleted successfully!" });
    } else {
      if (result.message === "Subscription not found") {
        res.status(404).send({ message: "Subscription not found" });
      } else {
        res.status(400).send({ message: result.message });
      }
    }
  } catch (err) {
    console.error("Error in delete controller:", err);
    res.status(500).send({
      message: `Could not delete subscription with id ${req.params.subId}`,
    });
  }
};

// Get subscriptions expiring in the next 7 days
exports.getExpiringSoon = async (req, res) => {
  try {
    const subscriptions = await Subscription.getExpiringSoon();

    res.json(
      response.success(
        "Subscriptions expiring in the next 7 days retrieved successfully",
        subscriptions
      )
    );
  } catch (err) {
    console.error("Error in getExpiringSoon:", err);
    res
      .status(500)
      .json(
        response.error(
          "An error occurred while retrieving expiring subscriptions."
        )
      );
  }
};

exports.sendWhatsAppReminder = async (req, res) => {
  try {
    const subscription = await Subscription.findBySUB_CODE(req.params.SUB_CODE);

    if (!subscription) {
      return res
        .status(404)
        .json(
          response.notFound(
            `Subscription not found with SUB_CODE ${req.params.SUB_CODE}`
          )
        );
    }

    // Check if the WhatsApp reminder has already been sent
    if (subscription.remainder_whatsapp) {
      return res
        .status(400)
        .json(
          response.error(
            `WhatsApp reminder has already been sent for SUB_CODE ${req.params.SUB_CODE}`
          )
        );
    }

    // Calculate days until expiration
    const today = new Date();
    const expirationDate = new Date(subscription.SUB_ENDT);
    const daysUntilExpiration = Math.ceil(
      (expirationDate - today) / (1000 * 60 * 60 * 24)
    );

    // Format the phone number to E.164 format
    const formattedPhoneNumber = `+91${subscription.PHO_NMBR.replace(
      /\D/g,
      ""
    )}`;

    // Send the WhatsApp message
    await sendWhatsAppMessage(
      formattedPhoneNumber,
      JSON.stringify({
        1: subscription.CUS_NAME,
        2: subscription.SUB_CODE,
        3: subscription.SUB_STDT,
        4: subscription.SUB_ENDT,
        5: `${daysUntilExpiration}`,
        6: `${subscription.LIC_USER}`,
      })
    );
    const query = `
      UPDATE SUB_MAST 
      SET remainder_whatsapp = 1 
      WHERE SUB_CODE = ?
    `;
    await db.query(query, [req.params.SUB_CODE]);

    res
      .status(200)
      .json(response.success("WhatsApp reminder sent successfully"));
  } catch (err) {
    console.error(
      `Error sending WhatsApp reminder for SUB_CODE ${req.params.SUB_CODE}:`,
      err
    );
    res
      .status(500)
      .json(
        response.error(
          `Error sending WhatsApp reminder for SUB_CODE ${req.params.SUB_CODE}`
        )
      );
  }
};

exports.sendEmailReminder = async (req, res) => {
  try {
    const subscription = await Subscription.findBySUB_CODE(req.params.SUB_CODE);

    if (!subscription) {
      return res
        .status(404)
        .json(
          response.notFound(
            `Subscription not found with SUB_CODE ${req.params.SUB_CODE}`
          )
        );
    }

    // Check if the WhatsApp reminder has already been sent
    if (subscription.remainder_mail) {
      return res
        .status(400)
        .json(
          response.error(
            `E-Mail reminder has already been sent for SUB_CODE ${req.params.SUB_CODE}`
          )
        );
    }

    const subject = "IFAS ERP Subscription Expiration Reminder";
    const html = `
          <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IFAS ERP SUBSCRIPTION EXPIRATION REMINDER</title>
  <style>
    :root {
      --primary-color: #ff4c4c;
      --secondary-color: #f4f4f4;
      --text-color: #333333;
      --light-text-color: #666666;
      --white: #ffffff;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f4f4;
      color: #333333;
      margin: 0;
      padding: 0;
      line-height: 1.4;
    }

    .email-container {
      width: 100%;
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    }

    .header {
      background-color: #ff4c4c;
      color: #ffffff;
      padding: 20px;
      text-align: center;
    }

    .header h1 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      letter-spacing: 1px;
    }

    .logo {
      padding: 20px;
      text-align: center;
      background-color: #ffffff;
      border-bottom: 2px solid #f0f0f0;
    }

    .logo img {
      max-width: 100px;
      display: inline-block;
    }

    .content {
      padding: 20px;
      line-height: 1.5;
      text-align: left;
      background-color: #ffffff;
    }

    .content p {
      margin: 0 0 15px;
      color: #333333;
    }

    .subscription-details {
      background-color: #f9f9f9;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
    }

    .subscription-details h3 {
      margin-top: 0;
      color: #ff4c4c;
    }

    .subscription-details ul {
      list-style-type: none;
      padding: 0;
    }

    .subscription-details li {
      margin-bottom: 8px;
    }

    .cta-button {
      display: inline-block;
      padding: 10px 20px;
      color: #ffffff;
      background-color: #ff4c4c;
      text-decoration: none;
      border-radius: 50px;
      font-weight: bold;
      font-size: 12px;
      margin-top: 15px;
      transition: all 0.3s ease;
      box-shadow: 0 3px 10px rgba(255, 76, 76, 0.3);
    }

    .cta-button:hover {
      background-color: #e60000;
      transform: translateY(-1px);
      box-shadow: 0 4px 15px rgba(255, 76, 76, 0.4);
    }

    .footer {
      background-color: #f4f4f4;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666666;
      border-top: 1px solid #e0e0e0;
      line-height: 1.3;
    }

    .footer p {
      margin: 3px 0;
    }

    @media (max-width: 600px) {
      .email-container {
        margin: 0;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>SUBSCRIPTION EXPIRATION REMINDER</h1>
    </div>
    <div class="logo">
      <img src="https://raw.githubusercontent.com/jash413/INIT_Backend/main/assets/ifaslogo.jpg" alt="IFAS ERP Logo">
    </div>
    <div class="content">
      <p>Dear ${subscription.CUS_NAME},</p>
      <p>We hope you are enjoying our services. This is a reminder that your subscription is set to expire on <strong>${subscription.SUB_ENDT}</strong>.</p>
      <p>To ensure uninterrupted access to our services, please renew your subscription before the expiration date.</p>
      
      <div class="subscription-details">
        <h3>Subscription Details</h3>
        <ul>
          <li><strong>Start Date:</strong> ${subscription.SUB_STDT}</li>
          <li><strong>End Date:</strong> ${subscription.SUB_ENDT}</li>
          <li><strong>License Users:</strong> ${subscription.LIC_USER}</li>
        </ul>
      </div>
      
      <p>Thank you for your continued support!</p>
      <p>If you have any questions, feel free to contact us at:</p>
      <p>Email: info@initinfologic.com</p>
      <p>Phone: (0261)-3503481/82/83/84</p>
      <p>Best regards,</p>
      <p>IFAS ERP Team</p>
      <a href="https://api.whatsapp.com/send?phone=919737211105&text=Hello,%20I%20would%20like%20to%20renew%20my%20IFAS%20ERP%20subscription." style="display: inline-block; padding: 10px 20px; color: #ffffff; background-color: #ff4c4c; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 12px; margin-top: 15px; transition: all 0.3s ease; box-shadow: 0 3px 10px rgba(255, 76, 76, 0.3);">Renew Now</a>
    </div>
    <div class="footer">
      <p>Thank you for being a part of the IFAS ERP family!</p>
      <p>&copy; 2024 INIT INFOLOGIC. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
        `;

    // Send the email
    await sendEmail(subscription.CUS_MAIL, subject, html);
    const query = `
      UPDATE SUB_MAST 
      SET remainder_mail = 1 
      WHERE SUB_CODE = ?
    `;
    await db.query(query, [req.params.SUB_CODE]);

    res.status(200).json(response.success("Email reminder sent successfully"));
  } catch (err) {
    console.error(
      `Error sending email reminder for SUB_CODE ${req.params.SUB_CODE}:`,
      err
    );
    res
      .status(500)
      .json(
        response.error(
          `Error sending email reminder for SUB_CODE ${req.params.SUB_CODE}`
        )
      );
  }
};
