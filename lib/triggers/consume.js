const { messages } = require('elasticio-node');
const co = require('co');
const amqp = require('amqplib');
const logger = require('@elastic.io/component-logger')();
const encryptor = require('../encryptor.js');

let channel;
let queueName = `eio_consumer_${process.env.ELASTICIO_FLOW_ID}_${process.env.ELASTICIO_USER_ID}`;
let listening;

/**
 * This function will be called on component before the first message will be processed
 *
 * @param cfg
 */
function init(cfg) {
  queueName = cfg.queueName || queueName;
  logger.info('Starting initialization, queueName=%s', queueName);
  const { amqpURI } = cfg;
  const amqpExchange = cfg.topic;
  const keys = (cfg.bindingKeys || '#').split(',').map((s) => s.trim());
  return co(function* initialize() {
    logger.debug('Connecting to amqpURI=%s', amqpURI);
    const conn = yield amqp.connect(amqpURI);

    logger.debug('Creating a receiver channel');
    channel = yield conn.createChannel();

    logger.debug('Asserting topic exchange exchange=%s', amqpExchange);
    yield channel.assertExchange(amqpExchange, 'topic');

    logger.debug('Asserting queue');
    yield channel.assertQueue(queueName, {
      exclusive: false,
      durable: false,
      autoDelete: !cfg.queueName
    });

    // eslint-disable-next-line no-restricted-syntax
    for (const key of keys) {
      logger.debug(`Binding queue to exchange queue=${queueName} exchange=${amqpExchange} bindingKey=${key}`);
      yield channel.bindQueue(queueName, amqpExchange, key);
    }
    logger.info('Initialization completed');
  });
}

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
// eslint-disable-next-line no-unused-vars
function processAction(msg, cfg) {
  const self = this;
  self.logger.info('Trigger started');
  if (listening) {
    self.logger.info('Trigger was called again, we will ignore this run');
    return Promise.resolve();
  }
  // eslint-disable-next-line no-shadow
  const consumer = (msg) => {
    self.logger.debug('Have got message fields=%j properties=%j', msg.fields, msg.properties);
    let data;
    if (cfg.decrypt) {
      data = encryptor.decryptMessageContent(self, msg.content);
      self.logger.debug('Decrypted message=%j', data);
    } else {
      data = JSON.parse(msg.content);
    }
    const newMsg = messages.newMessageWithBody(data || {});
    newMsg.id = msg.properties.messageId;
    newMsg.attachments = data.attachments || {};
    self.emit('data', newMsg);
  };
  return co(function* consume() {
    self.logger.info('Starting consuming from %s', queueName);
    yield channel.consume(queueName, consumer, {
      noAck: true, // We can't really assert if message was consumed if we emit it yet
      consumerTag: `consumer_${process.env.ELASTICIO_EXEC_ID}_${process.env.ELASTICIO_FLOW_ID}`,
    });
    self.logger.info('Consumption started');
    listening = true;
  });
}

module.exports.process = processAction;
module.exports.init = init;
