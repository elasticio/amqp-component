'use strict';
const co = require('co');
const amqp = require('amqplib');
const encryptor = require('../encryptor.js');

var conn, channel;

module.exports.process = processAction;

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 * @param snapshot - current values from the snapshot
 */
function processAction(msg, cfg, snapshot) {
  console.log('Action started');
  const amqpURI = process.env.ELASTICIO_AMQP_URI;
  const amqpExchange = `pubsub_${process.env.ELASTICIO_TASK_ID}_${process.env.ELASTICIO_USER_ID}`;
  co(function*() {
    if (!conn) {
      console.log('Connecting to amqpURI=%s', amqpURI);
      conn = yield amqp.connect(amqpURI);
    }
    if (!channel) {
      console.log('Creating a confirm channel');
      channel = yield conn.createConfirmChannel();
      console.log('Asserting topic exchange exchange=%s', amqpExchange);
      yield channel.assertExchange(amqpExchange, 'topic');
    }
    console.log('Publishing message id=%s', msg.id);
    let encryptedData = encryptor.encryptMessageContent({
      id: msg.id,
      body: msg.body,
      attachments: msg.attachments
    });
    channel.publish(amqpExchange, 'foo', encryptedData);
    console.log('Message published id=%s', msg.id);
    yield channel.waitForConfirms();
    console.log('Message publishing confirmed id=%s', msg.id);
    this.emit('data', msg);
    this.emit('end');
  }.bind(this)).catch(err => {
    console.log('Error occurred', err.stack || err);
    this.emit('error', err);
    this.emit('end');
  });
}
