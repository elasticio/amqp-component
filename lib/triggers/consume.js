const { messages } = require('elasticio-node');

const encryptor = require('../encryptor.js');
const { AMQPClient } = require('../amqp.js');

let amqpClient;

// eslint-disable-next-line consistent-return
async function processAction(msg, cfg) {
  this.logger.info('Trigger started');
  if (!amqpClient || !amqpClient.connection) {
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

// eslint-disable-next-line no-unused-vars
async function shutdown(cfg) {
  amqpClient = new AMQPClient(cfg, this);
  await amqpClient.init(true, {}, true);
  await amqpClient.shutdown();
}

module.exports.process = processAction;
module.exports.shutdown = shutdown;
