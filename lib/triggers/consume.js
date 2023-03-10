const { messages } = require('elasticio-node');
const logger = require('@elastic.io/component-logger')();

const encryptor = require('../encryptor.js');
const { AMQPClient } = require('../amqp.js');

let listening;
let amqpClient;

/**
 * This function will be called on component before the first message will be processed
 *
 * @param cfg
 */
async function init(cfg) {
  logger.info('Starting initialization...');
  amqpClient = new AMQPClient(cfg);
  const keys = (cfg.bindingKeys || '#').split(',').map((s) => s.trim());
  await amqpClient.startChannel();

  logger.debug('Asserting topic exchange exchange...');
  await amqpClient.assertExchange();

  logger.debug('Asserting queue');
  await amqpClient.assertQueue({
    exclusive: false,
    durable: false,
    autoDelete: true,
  });

  // eslint-disable-next-line no-restricted-syntax
  for (const key of keys) {
    logger.debug('Binding queue to exchange...');
    // eslint-disable-next-line no-await-in-loop
    await amqpClient.bindQueue(key);
  }
  logger.info('Initialization completed');
}

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
// eslint-disable-next-line no-unused-vars,consistent-return
async function processAction(msg, cfg) {
  const self = this;
  self.logger.info('Trigger started');
  if (listening) {
    self.logger.info('Trigger was called again, we will ignore this run');
    return Promise.resolve();
  }
  amqpClient.setLogger(this.logger);
  // eslint-disable-next-line no-shadow
  const consumer = (msg) => {
    self.logger.debug('New message got');
    const decrypted = encryptor.decryptMessageContent(self, msg.content);
    self.logger.debug('Message decrypted');
    const newMsg = messages.newMessageWithBody(decrypted.body || {});
    newMsg.id = msg.properties.messageId;
    newMsg.attachments = decrypted.attachments || {};
    self.emit('data', newMsg);
  };
  await amqpClient.consume(consumer, {
    noAck: true, // We can't really assert if message was consumed if we emit it yet
    consumerTag: `consumer_${process.env.ELASTICIO_EXEC_ID}_${process.env.ELASTICIO_FLOW_ID}`,
  });
  self.logger.info('Consumption started');
  listening = true;
}

module.exports.process = processAction;
module.exports.init = init;
