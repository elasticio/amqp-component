/* eslint-disable import/no-extraneous-dependencies, import/first */
process.env.LOG_LEVEL = 'TRACE';
process.env.LOG_OUTPUT_MODE = 'short';
const logger = require('@elastic.io/component-logger')();
const sinon = require('sinon');
const { existsSync } = require('fs');
const { config } = require('dotenv');

if (existsSync('.env')) {
  config();
  const {
    AMQP_URL, ELASTICIO_MESSAGE_CRYPTO_IV, ELASTICIO_MESSAGE_CRYPTO_PASSWORD,
  } = process.env;
  if (!AMQP_URL || !ELASTICIO_MESSAGE_CRYPTO_IV || !ELASTICIO_MESSAGE_CRYPTO_PASSWORD) {
    throw new Error('Please, provide all environment variables');
  }
} else {
  // throw new Error('Please, provide environment variables to .env');
}
const { AMQP_URL } = process.env;

const creds = {
  amqpURI: AMQP_URL,
};

const getContext = () => ({
  logger,
  emit: sinon.spy(),
});

exports.getContext = getContext;
exports.creds = creds;
