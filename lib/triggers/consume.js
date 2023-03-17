const { messages } = require('elasticio-node');

const encryptor = require('../encryptor.js');
const { AMQPClient } = require('../amqp.js');

let amqpClient;

// eslint-disable-next-line consistent-return
async function processAction(msg, cfg) {
  this.logger.info('Trigger started');
  if (!amqpClient || !amqpClient.connection) {
    if (process.env.ELASTICIO_FLOW_TYPE === 'ordinary') this.logger.warn('Real-time flow is highly recommended for this trigger to avoid data loss');

    amqpClient = new AMQPClient(cfg, this);
    await amqpClient.init(false);
  } else {
    this.logger.info('Trigger was called again, we will ignore this run');
    return;
  }

  // eslint-disable-next-line no-shadow
  const consumer = (msg) => {
    this.logger.debug('New message got');
    let data;
    if (cfg.doNotDecrypt) {
      data = JSON.parse(msg.content);
    } else {
      data = encryptor.decryptMessageContent(this, msg.content);
      this.logger.debug('Message decrypted');
    }
    const newMsg = messages.newMessageWithBody(data || {});
    newMsg.id = msg.properties.messageId;
    newMsg.attachments = data.attachments || {};
    this.emit('data', newMsg);
  };
  await amqpClient.consume(consumer, {
    noAck: true,
    consumerTag: `consumer_${process.env.ELASTICIO_EXEC_ID}_${process.env.ELASTICIO_FLOW_ID}`,
  });
  this.logger.info('Consumption started');
}

module.exports.process = processAction;
