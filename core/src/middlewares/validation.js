const validator = (schema) => (req, res, next) => {
  const data = { ...req.body, ...req.params, ...req.query };
  const { error } = schema.validate(data);
  if (error) {
    res.status(400).json({
      message: error.message,
      error: error,
    });
  } else {
    next();
  }
};

module.exports = {
  validator,
};
