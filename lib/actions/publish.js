const encryptor = require('../encryptor.js');
const { AMQPClient } = require('../amqp.js');

let amqpClient;

async function processAction(msg, cfg) {
  if (!amqpClient || !amqpClient.connection) {
    amqpClient = new AMQPClient(cfg, this);
    await amqpClient.init();
  }

  amqpClient.setLogger(this.logger);

  let data;
  if (cfg.doNotEncrypt) {
    data = msg.body.payload || msg.body;
    data = Buffer.from(JSON.stringify(data));
  } else {
    data = encryptor.encryptMessageContent(this, {
      body: msg.body.payload || msg.body,
      attachments: msg.attachments,
    });
  }
  this.logger.info('Publishing message...');

  await amqpClient.publish(msg.body.routingKey || '', data, {
    contentType: cfg.contentType || 'application/octet-stream',
    messageId: msg.id,
  });
  return msg;
}

module.exports.process = processAction;
