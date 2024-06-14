const { messages } = require('elasticio-node');

const encryptor = require('../encryptor.js');
const { AMQPClient } = require('../amqp.js');

let amqpClient;
let context;

// eslint-disable-next-line consistent-return
async function processAction(msg, cfg) {
  context = this;
  if (!amqpClient || !amqpClient.connection) {
    context.logger.info('Trigger started');
    amqpClient = new AMQPClient(cfg, context);
    await amqpClient.init(false);
  } else {
    context.logger.info('Trigger is running, waiting for new messages');
    amqpClient.setLogger(context.logger);
    return;
  }

  // eslint-disable-next-line no-shadow
  const consumer = (msg) => {
    context.logger.debug('Got a new message');
    let data;
    if (cfg.doNotDecrypt) {
      data = JSON.parse(msg.content);
    } else {
      data = encryptor.decryptMessageContent(context, msg.content);
      context.logger.debug('Message decrypted');
    }
    const newMsg = messages.newMessageWithBody(data || {});
    newMsg.id = msg.properties.messageId;
    newMsg.attachments = data.attachments || {};
    context.emit('data', newMsg);
  };
  await amqpClient.consume(consumer, {
    noAck: true,
    consumerTag: `consumer_${process.env.ELASTICIO_EXEC_ID}_${process.env.ELASTICIO_FLOW_ID}`,
  });
  context.logger.info('Consumption started');
}

// eslint-disable-next-line no-unused-vars
async function shutdown(cfg) {
  amqpClient = new AMQPClient(cfg, this);
  await amqpClient.init(true, {}, true);
  await amqpClient.shutdown();
}

module.exports.process = processAction;
module.exports.shutdown = shutdown;
