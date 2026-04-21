class ConnectorError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ConnectorError';
    this.details = details;
  }
}

module.exports = ConnectorError;
