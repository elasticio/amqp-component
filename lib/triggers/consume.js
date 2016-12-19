'use strict';
const eioUtils = require('elasticio-node').messages;
const co = require('co');
const amqp = require('amqplib');
const encryptor = require('../encryptor.js');
const debug = require('debug')('consumer');

module.exports.process = processAction;

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
function processAction(msg, cfg) {
  console.log('Trigger started, cfg=%j', cfg);
  const amqpURI = cfg.amqpURI;
  const amqpExchange = cfg.topic;
  const queueName = `eio_consumer_${process.env.ELASTICIO_TASK_ID}_${process.env.ELASTICIO_USER_ID}`;
  const keys = (cfg.bindingKeys || '#').split(',').map((s) => s.trim());
  const consumer = (msg) => {
    console.log('Have got message fields=%j properties=%j', msg.fields, msg.properties);
    const decrypted = encryptor.decryptMessageContent(msg.content);
    debug('Decrypted message=%j', decrypted);
    const newMsg = eioUtils.newMessageWithBody(decrypted.body || {});
    newMsg.id = msg.properties.messageId;
    newMsg.attachments = decrypted.attachments || {};
    this.emit('data', newMsg);
  };
  co(function*() {
    debug('Connecting to amqpURI=%s', amqpURI);
    const conn = yield amqp.connect(amqpURI);

    debug('Creating a receiver channel');
    const channel = yield conn.createChannel();

    debug('Asserting topic exchange exchange=%s', amqpExchange);
    yield channel.assertExchange(amqpExchange, 'topic');

    debug('Asserting queue');
    yield channel.assertQueue(queueName, {
      exclusive: false,
      durable: false,
      autoDelete: true
    });

    for (let key of keys) {
      debug(`Binding queue to exchange queue=${queueName} exchange=${amqpExchange} bindingKey=${key}`);
      yield channel.bindQueue(queueName, amqpExchange, key);
    }

    console.log('Start consuming');
    yield channel.consume(queueName, consumer, {
      noAck: true, // We can't really assert if message was consumed if we emit it yet
      consumerTag: `consumer_${process.env.ELASTICIO_EXEC_ID}_${process.env.ELASTICIO_TASK_ID}`
    });
    console.log('After consume!');
  }.bind(this)).catch(err => {
    console.log('Error occurred', err.stack || err);
    this.emit('error', err);
    this.emit('end');
  });
}
