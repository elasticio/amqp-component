const co = require('co');
const amqp = require('amqplib');

// This function will be called by the platform to verify credentials
module.exports = function verifyCredentials(credentials, cb) {
  const self = this;
  this.logger.info('Credentials passed for verification %j', credentials);
  const { amqpURI } = credentials;
  const amqpExchange = 'verify_credentials_test';
  // eslint-disable-next-line func-names
  co(function* () {
    self.logger.info('Connecting to amqpURI=%s', amqpURI);
    const conn = yield amqp.connect(amqpURI);
    self.logger.info('Creating a confirm channel');
    const channel = yield conn.createConfirmChannel();
    self.logger.info('Asserting topic exchange exchange=%s', amqpExchange);
    yield channel.assertExchange(amqpExchange, 'topic', { durable: false });
    self.logger.info('Verified successfully');
    cb(null, { verified: true });
  }).catch((err) => {
    this.logger.info('Error occurred', err.stack || err);
    cb(err, { verified: false });
  });
};
