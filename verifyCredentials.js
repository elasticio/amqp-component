/* eslint-disable no-param-reassign */
const { AMQPClient } = require('./lib/amqp.js');

module.exports = async function verifyCredentials(cfg) {
  this.logger.info('Verifying Credentials...');
  cfg.topic = 'verify_credentials_test';
  try {
    const amqpClient = new AMQPClient(cfg, this);
    await amqpClient.init(true, { durable: false });
    this.logger.info('Verified successfully');
    return { verified: true };
  } catch (err) {
    this.logger.error('Credentials verification failed!');
    throw err;
  }
};
