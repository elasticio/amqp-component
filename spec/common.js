/* eslint-disable import/first */
process.env.LOG_OUTPUT_MODE = 'short';
process.env.API_RETRY_DELAY = '0';
process.env.ELASTICIO_MESSAGE_CRYPTO_PASSWORD = '1';
process.env.ELASTICIO_MESSAGE_CRYPTO_IV = 'yaku5ooSh3iedaem';
process.env.ELASTICIO_EXEC_ID = '1a';
process.env.ELASTICIO_FLOW_ID = '2b';
const sinon = require('sinon');
const getLogger = require('@elastic.io/component-logger');

exports.getContext = () => ({
  logger: getLogger(),
  emit: sinon.spy(),
});
