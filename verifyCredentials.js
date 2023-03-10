/* eslint-disable no-param-reassign */
const { AMQPClient } = require('./lib/amqp.js');

// This function will be called by the platform to verify credentials
module.exports = async function verifyCredentials(cfg) {
  const self = this;
  this.logger.info('Verifying Credentials...');
  cfg.topic = 'verify_credentials_test';
  // eslint-disable-next-line func-names
  try {
    const amqpClient = new AMQPClient(cfg, this.logger);
    await amqpClient.startConfirmChannel();
    self.logger.info('Asserting topic exchange exchange...');
    await amqpClient.assertExchange({ durable: false });
    self.logger.info('Verified successfully');
    return { verified: true };
  } catch (err) {
    this.logger.error('Credentials verification failed!');
    throw err;
  }
};
