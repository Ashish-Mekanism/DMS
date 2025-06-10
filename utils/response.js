exports.success = (message, data, payload, statusCode = 200) => {
  return {
    status: "success",
    message: message,
    data: data,
    payload: payload,
    statusCode: statusCode,
  };
};

exports.error = (message, statusCode = 500) => {
  return {
    status: "error",
    message: message,
    statusCode: statusCode,
  };
};
exports.notFound = (message = "Resource not found", statusCode = 404) => {
  return {
    status: "error",
    message: message,
    statusCode: statusCode,
  };
};

exports.forbidden = (message = "Forbidden", statusCode = 403) => {
  return {
    status: "error",
    message: message,
    statusCode: statusCode,
  };
};

exports.unauthorized = (message = "Unauthorized", statusCode = 401) => {
  return {
    status: "error",
    message: message,
    statusCode: statusCode,
  };
};

exports.badRequest = (message = "Bad request", statusCode = 400) => {
  return {
    status: "error",
    message: message,
    statusCode: statusCode,
  };
};

exports.conflict = (message = "Conflict", statusCode = 409) => {
  return {
    status: "error",
    message: message,
    statusCode: statusCode,
  };
};
