const flipkart = require('./flipkart.connector');

const connectors = {
  flipkart
};

const getConnector = (source) => connectors[source];

module.exports = {
  flipkart,
  getConnector
};
