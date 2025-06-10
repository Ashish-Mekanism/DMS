const USRSubs = require("../models/UserSubscription.model.js");
const response = require("../utils/response.js");
const moment = require("moment");
const { sendEmail } = require("../utils/emailService");
const { sendWhatsAppMessage } = require("../utils/whatsappService");
const db = require("../utils/apiDb.js");

exports.create = async (req, res) => {
  try {
    if (!req.body) {
      return res
        .status(400)
        .json(response.badRequest("Content cannot be empty!"));
    }

    const formatMomentDate = (date) =>
      date ? moment(date).format("YYYY-MM-DD HH:mm:ss") : null;

    const nextSubscriptionId = await USRSubs.getNextSubscriptionId();
    // console.log("new sub id", nextSubscriptionId);

    const usrSubs = new USRSubs({
      GST_CODE: req.body.GST_CODE,
      GST_NMBR: req.body.GST_NMBR,
      SYSTEM_ID: req.body.SYSTEM_ID,
      SUBSCRIPTION_ID: nextSubscriptionId,
      SUBSCRIPTION_DATE: formatMomentDate(req.body.SUBSCRIPTION_DATE),
      ALLOTED_CALLS: req.body.ALLOTED_CALLS,
      USED_CALLS: 0,
      PENDING_CALLS: req.body.ALLOTED_CALLS,
      is_active: req.body.is_active,
      created_by: req.user.name,
      user_id: req.body.user_id,
      expiry_date: formatMomentDate(req.body.expiry_date),
      INV_DATE: formatMomentDate(req.body.INV_DATE),
      INV_NO: req.body.INV_NO,
      IS_VERIFIED: false,
    });

    const data = await USRSubs.create(usrSubs);

    res
      .status(201)
      .json(response.success("User subscription created successfully", data));
  } catch (err) {
    res
      .status(500)
      .json(
        response.error(
          err.message ||
            "Some error occurred while creating the user subscription."
        )
      );
  }
};

exports.findAll = async (req, res) => {
  try {
    // Extract query parameters
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.items_per_page) || 0;
    const offset = (page - 1) * limit;
    const sort = req.query.sort || "created_on";
    const order = req.query.order || "desc";
    const search = req.query.search || "";
    const filter_user_id = req.query.filter_user_id || null;
    const filter_from = req.query.filter_from || null;
    const filter_to = req.query.filter_to || null;
    const filter_gst_code = req.query.filter_gst_code || null; // Ensure filter_gst_code is included
    const filter_system_id = req.query.filter_system_id || null;
    const filter_created_by = req.query.filter_created_by || null;

    // Validate date filters
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

    // Fetch data and total count from the database
    const [usrSubs, totalCount] = await USRSubs.getAll(
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
    );

    // Initialize pagination data
    let paginationData = {};
    if (limit !== 0) {
      const totalPages = Math.ceil(totalCount / limit);
      let links = [];
      const maxPageLinks = 5;
      const startPage = Math.max(1, page - Math.floor(maxPageLinks / 2));
      const endPage = Math.min(totalPages, startPage + maxPageLinks - 1);

      // Generate pagination links
      for (let i = startPage; i <= endPage; i++) {
        links.push(
          createPageLink(
            i,
            page,
            limit,
            sort,
            order,
            search,
            filter_user_id,
            filter_from,
            filter_to,
            filter_gst_code,
            filter_created_by
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
            filter_user_id,
            filter_from,
            filter_to,
            filter_gst_code, // Include filter_gst_code in Previous link
            filter_created_by,
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
            filter_user_id,
            filter_from,
            filter_to,
            filter_gst_code, // Include filter_gst_code in Next link
            filter_created_by,
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
          filter_user_id,
          filter_from,
          filter_to,
          filter_gst_code, // Include filter_gst_code in the first page URL
          filter_created_by
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
                filter_user_id,
                filter_from,
                filter_to,
                filter_gst_code, // Include filter_gst_code in the next page URL
                filter_created_by
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
                filter_user_id,
                filter_from,
                filter_to,
                filter_gst_code, // Include filter_gst_code in the previous page URL
                filter_created_by
              )
            : null,
        items_per_page: limit,
        from: offset + 1,
        to: offset + usrSubs.length,
        total: totalCount,
        links,
      };
    }

    // Send response
    res.json(
      response.success("User subscriptions retrieved successfully", usrSubs, {
        pagination: paginationData,
      })
    );
  } catch (err) {
    console.error("Error in findAll:", err);
    res
      .status(500)
      .json(
        response.error("An error occurred while retrieving user subscriptions.")
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

exports.findOne = async (req, res) => {
  try {
    const data = await USRSubs.findById(req.params.id);

    if (!data) {
      return res
        .status(404)
        .json(
          response.notFound(
            `User subscription not found with id ${req.params.id}`
          )
        );
    }

    res
      .status(200)
      .json(response.success("User subscription retrieved successfully", data));
  } catch (err) {
    res
      .status(500)
      .json(
        response.error(
          `Error retrieving user subscription with id ${req.params.id}`
        )
      );
  }
};

exports.getExpiringSoon = async (req, res) => {
  try {
    const subscriptions = await USRSubs.getExpiringSoon();

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
    const subscription = await USRSubs.findByGST_CODE(req.params.GST_CODE);
    console.log("subscription for email", subscription);

    if (!subscription) {
      return res
        .status(404)
        .json(
          response.notFound(
            `API Subscription not found with GST_CODE ${req.params.GST_CODE}`
          )
        );
    }

    // Check if the WhatsApp reminder has already been sent
    if (subscription.remainder_whatsapp) {
      return res
        .status(400)
        .json(
          response.error(
            `WhatsApp reminder has already been sent for GST_CODE ${req.params.GST_CODE}`
          )
        );
    }

    // Calculate days until expiration
    const today = new Date();
    const expirationDate = new Date(subscription.SUB_ENDT);
    const daysUntilExpiration = Math.ceil(
      (expirationDate - today) / (1000 * 60 * 60 * 24)
    );

    // Generate the message content
    const message = `
🔔 *IFAS ERP API Subscription Reminder*

Hello ${subscription.CUS_NAME},

Your IFAS ERP subscription (Code: ${subscription.GST_CODE}) is expiring soon.

📅 *API Subscription Details:*
• Start Date: ${subscription.SUB_STDT}
• End Date: ${subscription.SUB_ENDT}
• Days Left: ${daysUntilExpiration}
• Licensed Users: ${subscription.LIC_USER}

To ensure uninterrupted service, please renew your subscription before it expires.

If you have any questions, please contact us:
📧 Email: info@initinfologic.com
📞 Phone: (0261)-3503481/82/83/84


Thank you for choosing IFAS ERP!
    `.trim();

    // Format the phone number to E.164 format
    const formattedPhoneNumber = `+91${subscription.PHO_NMBR.replace(
      /\D/g,
      ""
    )}`;

    // Send the WhatsApp message
    await sendWhatsAppMessage(formattedPhoneNumber, message);
    console.log("number", formattedPhoneNumber);
    // const query = `
    //   UPDATE SUB_MAST
    //   SET remainder_whatsapp = 1
    //   WHERE GST_CODE = ?
    // `;
    // await db.query(query, [req.params.GST_CODE]);

    res
      .status(200)
      .json(response.success("WhatsApp reminder sent successfully"));
  } catch (err) {
    console.error(
      `Error sending WhatsApp reminder for GST_CODE ${req.params.GST_CODE}:`,
      err
    );
    res
      .status(500)
      .json(
        response.error(
          `Error sending WhatsApp reminder for GST_CODE ${req.params.GST_CODE}`
        )
      );
  }
};

exports.sendEmailReminder = async (req, res) => {
  try {
    const subscription = await USRSubs.findByGST_CODE(req.params.GST_CODE);
    console.log("subscription for email", subscription);

    if (!subscription) {
      return res
        .status(404)
        .json(
          response.notFound(
            `API Subscription not found with GST_CODE ${req.params.GST_CODE}`
          )
        );
    }

    // Check if the WhatsApp reminder has already been sent
    if (subscription.remainder_mail) {
      return res
        .status(400)
        .json(
          response.error(
            `E-Mail reminder has already been sent for GST_CODE ${req.params.GST_CODE}`
          )
        );
    }

    const subject = "API Subscription Renewal Reminder";
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
      <p>We hope you are enjoying our services. This is a reminder that your subscription is set to expire on <strong>${moment(
        subscription.expiry_date
      ).format("YYYY-MM-DD")}</strong>.</p>
      <p>To ensure uninterrupted access to our services, please renew your subscription before the expiration date.</p>
      
      <div class="subscription-details">
        <h3>API Subscription Details</h3>
        <ul>
          <li><strong>Start Date:</strong> ${
            subscription.SUBSCRIPTION_DATE
          }</li>
          <li><strong>End Date:</strong>${moment(
            subscription.expiry_date
          ).format("YYYY-MM-DD")}</li>
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
    // const query = `
    //   UPDATE SUB_MAST
    //   SET remainder_mail = 1
    //   WHERE GST_CODE = ?
    // `;
    // await db.query(query, [req.params.GST_CODE]);
    console.log("");

    res.status(200).json(response.success("Email reminder sent successfully"));
  } catch (err) {
    console.error(
      `Error sending email reminder for GST_CODE ${req.params.GST_CODE}:`,
      err
    );
    res
      .status(500)
      .json(
        response.error(
          `Error sending email reminder for GST_CODE ${req.params.GST_CODE}`
        )
      );
  }
};

exports.update = async (req, res) => {
  try {
    if (!req.body) {
      return res
        .status(400)
        .json(response.badRequest("Data to update can't be empty!"));
    }

    const data = await USRSubs.updateById(req.params.id, req.body);

    res
      .status(200)
      .json(response.success("User subscription updated successfully", data));
  } catch (err) {
    console.error("Error updating user subscription:", err.message, err.stack);
    res
      .status(500)
      .json(
        response.error(
          `Error updating user subscription with id ${req.params.id}`,
          err.message
        )
      );
  }
};

exports.delete = async (req, res) => {
  try {
    const result = await USRSubs.remove(req.params.id);

    if (!result.success) {
      return res
        .status(result.statusCode)
        .send(response.error(result.message, result.statusCode));
    }

    res.status(result.statusCode).send(response.success(result.message));
  } catch (err) {
    res
      .status(500)
      .send(
        response.error(
          "Could not delete user subscription with id " + req.params.id
        )
      );
  }
};
