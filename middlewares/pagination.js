const db = require("../utils/db"); // Adjust this path as needed

const pagination = (table) => async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  try {
    const countQuery = `SELECT COUNT(*) as total FROM ${table}`;
    const dataQuery = `SELECT * FROM ${table} LIMIT ? OFFSET ?`;

    const [[countResult], data] = await Promise.all([
      db.query(countQuery),
      db.query(dataQuery, [limit, startIndex]),
    ]);

    const totalItems = countResult.total;
    const totalPages = Math.ceil(totalItems / limit);

    const results = {
      data,
      meta: {
        totalItems,
        itemsPerPage: limit,
        currentPage: page,
        totalPages,
      },
      links: {
        first: `/api/${table}?page=1&limit=${limit}`,
        last: `/api/${table}?page=${totalPages}&limit=${limit}`,
        prev: page > 1 ? `/api/${table}?page=${page - 1}&limit=${limit}` : null,
        next:
          page < totalPages
            ? `/api/${table}?page=${page + 1}&limit=${limit}`
            : null,
      },
    };

    req.paginatedResults = results;
    next();
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error occurred while fetching data",
        error: error.message,
      });
  }
};

module.exports = pagination;
