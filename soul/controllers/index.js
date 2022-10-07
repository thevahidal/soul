const db = require('../db/index');

// Root endpoint
const root = async (req, res) => {
  res.json({
    message: 'Soul is running...',
  });
};

// Run any query
const query = async (req, res) => {
  const { query } = req.body;
  try {
    const data = db.prepare(query).all();
    res.json({
      data,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
      error: error,
    });
  }
};

module.exports = {
  root,
  query,
};
