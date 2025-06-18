// Controller for managing customers
const Customer = require("../models/customer.model");
const moment = require("moment");
const response = require("../utils/response");

// Create and Save a new Customer
exports.create = async (req, res) => {
  try {
    if (!req.body) {
      res.status(400).json(response.error("Content cannot be empty!"));
      return;
    }

    const formatMomentDate = (date) =>
      date ? moment(date).format("YYYY-MM-DD HH:mm:ss") : null;

    const customer = new Customer({
      CUS_CODE: req.body.CUS_CODE,
      CUS_NAME: req.body.CUS_NAME,
      INS_DATE: formatMomentDate(req.body.INS_DATE),
      DUE_DAYS: req.body.DUE_DAYS,
      EXP_DATE: req.body.EXP_DATE,
      USR_NMBR: req.body.USR_NMBR,
      SYN_DATE: null,
      POS_SYNC: formatMomentDate(req.body.POS_SYNC),
      CUS_PASS: req.body.CUS_PASS,
      CUS_MAIL: req.body.CUS_MAIL,
      LOG_INDT: formatMomentDate(req.body.LOG_INDT),
      CUS_MESG: req.body.CUS_MESG,
      MSG_EXDT: req.body.MSG_EXDT,
      CON_PERS: req.body.CON_PERS,
      CUS_ADDR: req.body.CUS_ADDR,
      PHO_NMBR: req.body.PHO_NMBR,
      CUS_REFB: req.body.CUS_REFB,
      GRP_CODE: req.body.GRP_CODE,
      INS_USER: req.body.INS_USER,
      BUS_CODE: req.body.BUS_CODE,
      CMP_VERS: req.body.CMP_VERS,
      client_id: req.body.client_id,
      client_secret: req.body.client_secret,
      database_name: req.body.database_name,
      is_active: req.body.is_active !== undefined ? req.body.is_active : 0,
      app_key: req.body.app_key,
      reg_type_id: req.body.reg_type_id,
      ad_id: req.user.id // Set ad_id from req.user
    });

    const data = await Customer.create(customer);
    res.json(response.success("Customer created successfully", data));
  } catch (err) {
    res
      .status(500)
      .json(
        response.error(
          err.message || "Some error occurred while creating the Customer."
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

    const [customers, totalCount] = await Customer.getAll(
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
        to: offset + customers.length,
        total: totalCount,
        links
      };
    }

    res.json(
      response.success("Customers retrieved successfully", customers, {
        pagination: paginationData
      })
    );
  } catch (err) {
    console.error("Error in findAll:", err);
    res
      .status(500)
      .json(response.error("An error occurred while retrieving customers."));
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
    page: pageNum
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
    search: encodeURIComponent(search)
  });

  if (filter_ad_id) params.append("filter_ad_id", filter_ad_id);
  if (filter_from) params.append("filter_from", filter_from);
  if (filter_to) params.append("filter_to", filter_to);

  return `/api/customers?${params.toString()}`;
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

// Find a single Customer with an id
exports.findOne = async (req, res) => {
  try {
    const data = await Customer.findById(req.params.custId);
    if (!data) {
      res.status(404).json(response.error("Customer not found"));
    } else {
      res.json(response.success("Customer retrieved successfully", data));
    }
  } catch (err) {
    res
      .status(500)
      .json(
        response.error("Error retrieving customer with id " + req.params.custId)
      );
  }
};

exports.update = async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).send({ message: "Update data cannot be empty!" });
  }

  const allowedFields = [
    "CUS_NAME",
    "DUE_DAYS",
    "USR_NMBR",
    "POS_SYNC",
    "CUS_PASS",
    "CUS_MAIL",
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
    "reg_type_id"
  ];

  const updateData = {};
  let hasValidField = false;

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
      hasValidField = true;
    }
  }

  if (!hasValidField) {
    return res.status(400).send({
      message:
        "No valid fields to update. Allowed fields are: " +
        allowedFields.join(", ")
    });
  }

  try {
    const updatedCustomer = await Customer.updateById(
      req.params.custId,
      updateData
    );
    res.send(updatedCustomer);
  } catch (err) {
    if (err.message === "Customer not found") {
      res.status(404).send({ message: "Customer not found" });
    } else if (err.message === "No valid fields to update") {
      res.status(400).send({ message: "No valid fields to update" });
    } else {
      console.error("Error in update controller:", err);
      res.status(500).send({
        message: "Error updating customer with id " + req.params.custId
      });
    }
  }
};

// Delete a Customer with the specified id in the request
exports.delete = async (req, res) => {
  try {
    const result = await Customer.remove(req.params.custId);

    switch (result.status) {
      case "forbidden":
        return res.status(403).json(response.forbidden(result.message));
      case "notFound":
        return res.status(404).json(response.notFound(result.message));
      case "success":
        return res.status(200).json(response.success(result.message, []));
      case "error":
      default:
        return res.status(500).json(response.error(result.message));
    }
  } catch (err) {
    console.error("Error in deleteCustomer:", err);
    return res
      .status(500)
      .json(response.error("An error occurred while deleting the customer"));
  }
};
