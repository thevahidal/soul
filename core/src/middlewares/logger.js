// including the method, url, status code and response time
const logger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const delta = Date.now() - start;
    console.log(`${req.method} ${req.url} ${res.statusCode} ${delta}ms`);
  });
  next();
};

module.exports = {
  logger,
};
