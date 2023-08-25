const validator = (schema) => (req, res, next) => {
  const { body, params, query } = req;
  const data = { body, params, query };

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

    next();
  }
};

module.exports = {
  validator,
};
