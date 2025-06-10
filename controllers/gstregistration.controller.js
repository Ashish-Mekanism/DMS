const GstRegistration = require("../models/gstRegistration.model");
const response = require("../utils/response.js");

const moment = require("moment");

exports.create = async (req, res) => {
  try {
    if (!req.body) {
      return res
        .status(400)
        .json(response.badRequest("Content cannot be empty!"));
    }

    const formatMomentDate = (date) =>
      date ? moment(date).format("YYYY-MM-DD HH:mm:ss") : null;
    const createdBy = req.user ? req.user.name : "Unknown";

    const gstRegistration = new GstRegistration({
      PHO_NMBR: req.body.PHO_NMBR,
      CUS_MAIL : req.body.CUS_MAIL,
      REG_CODE: req.body.REG_CODE,
      CUS_NAME: req.body.CUS_NAME,
      CUS_ADDR: req.body.CUS_ADDR,
      CMP_NAME: req.body.CMP_NAME,
      notification_date: formatMomentDate(req.body.notification_date),
      CREATED_BY: createdBy,
    });

    const data = await GstRegistration.create(gstRegistration);
    res
      .status(201)
      .json(response.success("GST registration created successfully", data));
  } catch (err) {
    res
      .status(500)
      .json(
        response.error(
          err.message ||
            "Some error occurred while creating the GST registration."
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

    const [gstRegistrations = [], totalCount = 0] =
      await GstRegistration.getAll(
        limit,
        offset,
        sort,
        order,
        search,
        filter_from,
        filter_to
      );

    let paginationData = {};
    if (limit > 0) {
      const totalPages = Math.ceil(totalCount / limit);

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
                filter_from,
                filter_to
              )
            : null,
        items_per_page: limit,
        from: offset + 1,
        to: offset + gstRegistrations.length,
        total: totalCount,
        links,
      };
    }

    res.json(
      response.success(
        "GST registrations retrieved successfully",
        gstRegistrations,
        {
          pagination: paginationData,
        }
      )
    );
  } catch (error) {
    console.error("Error in findAll:", error);
    res
      .status(500)
      .json(
        response.error("Some error occurred while retrieving GST registrations")
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
  filter_from,
  filter_to,
  label = null
) => {
  return {
    url: createUrl(pageNum, limit, sort, order, search, filter_from, filter_to),
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

  if (filter_from) params.append("filter_from", filter_from);
  if (filter_to) params.append("filter_to", filter_to);

  return `/api/gst-registrations?${params.toString()}`;
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
    const data = await GstRegistration.findById(req.params.id);

    if (!data) {
      return res
        .status(404)
        .json(
          response.notFound(
            `GST registration not found with id ${req.params.id}`
          )
        );
    }

    res
      .status(200)
      .json(response.success("GST registration retrieved successfully", data));
  } catch (err) {
    res
      .status(500)
      .json(
        response.error(
          `Error retrieving GST registration with id ${req.params.id}`
        )
      );
  }
};

exports.update = async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json(response.badRequest("Data to update can't be empty!"));
    }

    // Remove created_at from req.body if it exists to let the database handle it as default
    if (req.body.created_at) {
      delete req.body.created_at;
    }

    const data = await GstRegistration.updateById(req.params.id, req.body);

    res
      .status(200)
      .json(response.success("GST registration updated successfully", data));
  } catch (err) {
    if (err.message === "GST registration not found") {
      return res
        .status(404)
        .json(
          response.notFound(
            `Cannot update GST registration with id ${req.params.id}. Maybe GST registration was not found!`
          )
        );
    }
    console.error(
      `Error updating GST registration with id ${req.params.id}`,
      err
    );
    res
      .status(500)
      .json(
        response.error(
          `Error updating GST registration with id ${req.params.id}`
        )
      );
  }
};

exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    // Fetch regCode using id
    const regCode = await GstRegistration.getRegCodeById(id);
    // Check for matches before deleting
    const matches = await GstRegistration.checkForMatches(regCode);

    if (matches.inUserMaster && matches.inUserSubs) {
      return res
        .status(400)
        .json(
          response.error(
            "Cannot delete GST registration. It is associated with both user(s) in User Master and subscription(s) in User Subscriptions."
          )
        );
    } else if (matches.inUserSubs) {
      return res
        .status(400)
        .json(
          response.error(
            "Cannot delete GST registration. It is associated with subscription(s) in User Subscriptions."
          )
        );
    } else if (matches.inUserMaster) {
      // Delete the user from USR_MAST
      await GstRegistration.removeUserByGstCode(regCode);
      // Proceed with GST registration deletion
      await GstRegistration.remove(id);
      return res.json(
        response.success(
          "GST Registration and associated user deleted successfully."
        )
      );
    }

    // If no matches found, proceed with deletion of GST registration only
    const result = await GstRegistration.remove(id);
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json(response.error(`GST Registration with id ${id} not found.`));
    }
    res.json(response.success("GST Registration deleted successfully."));
  } catch (err) {
    res
      .status(500)
      .json(
        response.error(
          err.message ||
            "Some error occurred while deleting the GST Registration."
        )
      );
  }
};