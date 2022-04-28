const co = require('co');
const amqp = require('amqplib');
const logger = require('@elastic.io/component-logger')();
const encryptor = require('../encryptor.js');

let channel;

/**
 * This method will be called from elastic.io platform on initialization
 *
 * @param cfg
 */
function init(cfg) {
  logger.info('Starting initialization');
  const { amqpURI } = cfg;
  const amqpExchange = cfg.topic;
  return co(function* gen() {
    logger.debug('Connecting to amqpURI=%s', amqpURI);
    const conn = yield amqp.connect(amqpURI);
    logger.debug('Creating a confirm channel');
    channel = yield conn.createConfirmChannel();
    logger.debug('Asserting topic exchange exchange=%s', amqpExchange);
    yield channel.assertExchange(amqpExchange, 'topic');
  });
}

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
function processAction(msg, cfg) {
  const self = this;
  const amqpExchange = cfg.topic;
  return co(function* sendMessage() {
    self.logger.info('Publishing message id=%s', msg.id);

    let data;

    if (cfg.encrypt) {
      data = encryptor.encryptMessageContent(self, msg.body.payload || msg.body);
    } else {
      data = msg.body.payload || msg.body
      data = Buffer.from(JSON.stringify(data))
    }
    channel.publish(amqpExchange, msg.body.routingKey || '', data, {
      contentType: cfg.contentType || 'application/octet-stream',
      messageId: msg.id,
    });
    self.logger.info('Message published id=%s', msg.id);
    yield channel.waitForConfirms();
    self.logger.info('Message publishing confirmed id=%s', msg.id);
    return msg;
  });
}

module.exports.process = processAction;
module.exports.init = init;
