/* eslint-disable new-cap */
const _ = require('lodash');
const crypto = require('crypto');

const ALGORYTHM = 'aes-256-cbc';
const PASSWORD = process.env.ELASTICIO_MESSAGE_CRYPTO_PASSWORD;
const VECTOR = process.env.ELASTICIO_MESSAGE_CRYPTO_IV;

function encryptIV(self, rawData) {
  self.logger.debug('About to encrypt raw data');

  if (!_.isString(rawData)) {
    throw new Error('RabbitMQ message cipher.encryptIV() accepts only string as parameter.');
  }

  if (!PASSWORD) {
    self.logger.info('Encryption will be skipped as ELASTICIO_MESSAGE_CRYPTO_PASSWORD env is empty');
    return new Buffer.from(rawData);
  }

  if (!VECTOR) {
    throw new Error('process.env.ELASTICIO_MESSAGE_CRYPTO_IV is not set');
  }

  const encodeKey = crypto.createHash('sha256').update(PASSWORD, 'utf-8').digest();
  const cipher = crypto.createCipheriv(ALGORYTHM, encodeKey, VECTOR);
  return Buffer.concat([cipher.update(new Buffer.from(rawData)), cipher.final()]);
}

function decryptIV(self, encData) {
  self.logger.debug('About to decrypt encrypted data');

  if (!PASSWORD) {
    self.logger.info('Decryption will be skipped as ELASTICIO_MESSAGE_CRYPTO_PASSWORD env is empty');
    return encData;
  }

  if (!VECTOR) {
    throw new Error('process.env.ELASTICIO_MESSAGE_CRYPTO_IV is not set');
  }

  const decodeKey = crypto.createHash('sha256').update(PASSWORD, 'utf-8').digest();
  const cipher = crypto.createDecipheriv(ALGORYTHM, decodeKey, VECTOR);

  const result = cipher.update(encData, 'base64', 'utf-8') + cipher.final('utf-8');

  return result;
}

exports.id = 1;
exports.encrypt = encryptIV;
exports.decrypt = decryptIV;
