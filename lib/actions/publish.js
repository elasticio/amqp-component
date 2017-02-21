'use strict';
const co = require('co');
const amqp = require('amqplib');
const encryptor = require('../encryptor.js');

let channel;

module.exports.process = processAction;
module.exports.init = init;

/**
 * This methdo will be called from elastic.io platform on initialization
 *
 * @param cfg
 */
function init(cfg) {
  console.log('Starting initialization, cfg=%j', cfg);
  const amqpURI = cfg.amqpURI;
  const amqpExchange = cfg.topic;
  return co(function* gen() {
    console.log('Connecting to amqpURI=%s', amqpURI);
    const conn = yield amqp.connect(amqpURI);
    console.log('Creating a confirm channel');
    channel = yield conn.createConfirmChannel();
    console.log('Asserting topic exchange exchange=%s', amqpExchange);
    yield channel.assertExchange(amqpExchange, 'topic');
  });
}

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
function processAction(msg, cfg) {
  const amqpExchange = cfg.topic;
  return co(function* sendMessage() {
    console.log('Publishing message id=%s', msg.id);
    let encryptedData = encryptor.encryptMessageContent({
      body: msg.body.payload || msg.body,
      attachments: msg.attachments
    });
    channel.publish(amqpExchange, msg.body.routingKey || '', encryptedData, {
      contentType: "application/octet-stream",
      messageId: msg.id
    });
    console.log('Message published id=%s', msg.id);
    yield channel.waitForConfirms();
    console.log('Message publishing confirmed id=%s', msg.id);
    this.emit('data', msg);
  }.bind(this));
}
