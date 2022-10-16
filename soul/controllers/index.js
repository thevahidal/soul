const db = require('../db/index');
const version = require('../../package.json').version;

// Root endpoint
const root = async (req, res) => {
  /* 	
    #swagger.tags = ['Root']
    #swagger.summary = 'Timestamp' 
    #swagger.description = 'Endpoint to return server timestamp' 
  */

  res.json({
    message: 'Soul is running...',
    data: {
      version,
      timestamp: new Date().toISOString(),
    },
  });
};

// Run any query transactions
// inspired by https://github.com/proofrock/ws4sqlite
// e.g. body:
// "transaction": [
//    {
//      "statement": "INSERT INTO users (id, firstName, lastName) VALUES (:id, :firstName, :lastName)",
//      "values": { "id": 1, "firstName": "John", "lastName": "Doe" }
//    },
//    {
//      "query": "SELECT * FROM users"
//    }
// }
//
// response:
// "data": [
//   {
//     "changes": 1,
//     "lastInsertRowid": 1
//   },
//   [
//     {
//       "id": 1,
//       "createdAt": "2022-10-10 10:55:29",
//       "updatedAt": "2022-10-10 10:55:29",
//       "firstName": "John",
//       "lastName": "Doe"
//     }
//   ]
// ]
//

const transaction = async (req, res) => {
  /* 	
    #swagger.tags = ['Root']
    #swagger.summary = 'Transaction' 
    #swagger.description = 'Endpoint to run any transaction, e.g. [{ "query": "" }, { "statement": "", "values": {} }, { "query": "" }]',
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: { $ref: "#/definitions/TransactionRequestBody" }
    }
  */
  const { transaction } = req.body;
  const results = [];
  try {
    db.transaction(() => {
      transaction.forEach((query) => {
        if (query.statement) {
          const { statement, values } = query;
          const data = db.prepare(statement).run(values);
          results.push(data);
        } else if (query.query) {
          const { query: queryString } = query;
          const data = db.prepare(queryString).all();
          results.push(data);
        }
      });
    })();

    res.json({
      data: results,
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
  transaction,
};
