const validator = (schema) => (req, res, next) => {
  const { body, params, query, cookies } = req;
  const data = { body, params, query, cookies };

  const { value, error } = schema.validate(data);

  if (error) {
    res.status(400).json({
      message: error.message,
      error: error.details,
    });
  } else {
    req.body = value.body;
    req.params = value.params;
    req.query = value.query;
    req.cookies = value.cookies;

    next();
  }
};

const customValidator = (schema) => (req) => {
  const response = { errorStatus: false, message: '', error: '' };

  const { body, params, query, cookies } = req;
  const data = { body, params, query, cookies };

  const { error } = schema.validate(data);

  if (error) {
    response.errorStatus = true;
    response.message = error.message;
    response.error = error.details;
  }

  return response;
};

module.exports = {
  validator,
  customValidator,
};
