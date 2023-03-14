/* eslint-disable no-unused-vars */
const logger = require('@elastic.io/component-logger')();

const encryptor = require('../encryptor.js');
const { AMQPClient } = require('../amqp.js');

let amqpClient;

/**
 * This method will be called from elastic.io platform on initialization
 *
 * @param cfg
 */
async function init(cfg) {
  amqpClient = new AMQPClient(cfg);
  logger.info('Starting initialization');
  await amqpClient.startConfirmChannel();
  logger.debug('Asserting topic exchange exchange...');
  await amqpClient.assertExchange();
}

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
async function processAction(msg, cfg) {
  const self = this;
  amqpClient.setLogger(this.logger);
  self.logger.info('Publishing message...');
  const encryptedData = encryptor.encryptMessageContent(self, {
    body: msg.body.payload || msg.body,
    attachments: msg.attachments,
  });
  await amqpClient.publish(msg.body.routingKey || '', encryptedData, {
    contentType: 'application/octet-stream',
    messageId: msg.id,
  });
  return msg;
}

module.exports.process = processAction;
module.exports.init = init;
