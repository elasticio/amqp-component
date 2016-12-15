'use strict';
const co = require('co');
const amqp = require('amqplib');

// This function will be called by the platform to verify credentials
module.exports = function verifyCredentials(credentials, cb) {
  console.log('Credentials passed for verification %j', credentials);
  const amqpURI = credentials.amqpURI;
  const amqpExchange = 'verify_credentials_test';
  co(function*() {
    console.log('Connecting to amqpURI=%s', amqpURI);
    const conn = yield amqp.connect(amqpURI);
    console.log('Creating a confirm channel');
    const channel = yield conn.createConfirmChannel();
    console.log('Asserting topic exchange exchange=%s', amqpExchange);
    yield channel.assertExchange(amqpExchange, 'topic', { durable: false });
    console.log('Verified successfully');
    cb(null, {verified: true});
  }).catch(err => {
    console.log('Error occurred', err.stack || err);
    cb(err , {verified: false});
  });
};
