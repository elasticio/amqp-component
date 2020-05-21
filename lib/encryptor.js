const cipher = require('./cipher.js');

function encryptMessageContent(self, messagePayload) {
  return cipher.encrypt(self, JSON.stringify(messagePayload));
}

function decryptMessageContent(self, messagePayload) {
  if (!messagePayload || !Buffer.isBuffer(messagePayload)) {
    throw new Error('Message payload supplied for decryption is either empty or not a Buffer');
  }
  try {
    return JSON.parse(cipher.decrypt(self, messagePayload));
  } catch (err) {
    self.logger.error(err.stack);
    throw Error(`Failed to decrypt message: ${err.message}`);
  }
}

exports.encryptMessageContent = encryptMessageContent;
exports.decryptMessageContent = decryptMessageContent;
