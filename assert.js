const assert = (condition, message) => {
  if (!condition) {
    message = message || 'Assertion failed';
    throw message;
  }
};

module.exports = assert;