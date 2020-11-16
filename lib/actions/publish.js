const amqp = require('amqplib');
const logger = require('@elastic.io/component-logger')();

const encryptor = require('../encryptor.js');

let channel;

/**
 * This method will be called from elastic.io platform on initialization
 *
 * @param cfg
 */
async function init(cfg) {
  logger.info('Starting initialization');
  const { amqpURI } = cfg;
  const amqpExchange = cfg.topic;
  logger.debug('Connecting to amqp...');
  const conn = await amqp.connect(amqpURI);
  logger.debug('Creating a confirm channel');
  channel = await conn.createConfirmChannel();
  logger.debug('Asserting topic exchange exchange...');
  await channel.assertExchange(amqpExchange, 'topic');
}

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
async function processAction(msg, cfg) {
  const self = this;
  const amqpExchange = cfg.topic;

  self.logger.info('Publishing message...');
  const encryptedData = encryptor.encryptMessageContent(self, {
    body: msg.body.payload || msg.body,
    attachments: msg.attachments,
  });
  channel.publish(amqpExchange, msg.body.routingKey || '', encryptedData, {
    contentType: 'application/octet-stream',
    messageId: msg.id,
  });
  self.logger.info('Message published');
  await channel.waitForConfirms();
  self.logger.info('Message publishing confirmed');
  return msg;
}

module.exports.process = processAction;
module.exports.init = init;
