var cipher = require('./cipher.js');

exports.encryptMessageContent = encryptMessageContent;
exports.decryptMessageContent = decryptMessageContent;

function encryptMessageContent(messagePayload) {
    return cipher.encrypt(JSON.stringify(messagePayload));
}

function decryptMessageContent(messagePayload) {
    if (!messagePayload || ! Buffer.isBuffer(messagePayload)) {
        throw new Error("Message payload supplied for decryption is either empty or not a Buffer");
    }
    try {
        return JSON.parse(cipher.decrypt(messagePayload));
    } catch (err) {
        console.error(err.stack);
        throw Error('Failed to decrypt message: ' + err.message);
    }
}
