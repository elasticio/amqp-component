const amqp = require('amqplib');

// This function will be called by the platform to verify credentials
module.exports = async function verifyCredentials(credentials) {
  const self = this;
  this.logger.info('Verifying Credentials...');
  const { amqpURI } = credentials;
  const amqpExchange = 'verify_credentials_test';
  // eslint-disable-next-line func-names
  try {
    self.logger.info('Connecting to amqpURI...');
    const conn = await amqp.connect(amqpURI);
    self.logger.info('Creating a confirm channel');
    const channel = await conn.createConfirmChannel();
    self.logger.info('Asserting topic exchange exchange...');
    await channel.assertExchange(amqpExchange, 'topic', { durable: false });
    self.logger.info('Verified successfully');
    return { verified: true };
  } catch (err) {
    this.logger.error('Credentials verification failed!');
    throw err;
  }
};
