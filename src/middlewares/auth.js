const config = require('../config');
const { decodeToken } = require('../utils/index');

const isAuthorized = async (req, res, next) => {
  try {
    // extract the payload from the token and verify it
    const payload = await decodeToken(
      req.cookies.accessToken,
      config.jwtSecret,
    );

    req.user = payload;

    next();
  } catch (error) {
    res.status(401).send({ message: error.message });
  }
};

module.exports = { isAuthorized };
