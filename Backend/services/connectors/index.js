const amazon = require('./amazon.connector');
const flipkart = require('./flipkart.connector');

const connectors = {
  amazon,
  flipkart
};

const getConnector = (source) => connectors[source];

module.exports = {
  amazon,
  flipkart,
  getConnector
};
