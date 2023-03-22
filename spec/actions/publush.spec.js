/* eslint-disable no-unused-vars */
const sinon = require('sinon');
const { expect } = require('chai');
const { getContext } = require('../common');
const { AMQPClient } = require('../../lib/amqp');
const { process } = require('../../lib/actions/publish');

describe('processAction', () => {
  beforeEach(() => {
  });
  afterEach(() => {
    sinon.restore();
  });

  it('should send unencrypted message if doNotEncrypt is truthy', async () => {
    const message = {
      id: '123',
      body: {
        payload: {
          name: 'John',
          age: 30,
        },
        routingKey: 'test',
      },
    };
    const configuration = {
      doNotEncrypt: true,
    };
    const publishStub = sinon.stub(AMQPClient.prototype, 'publish').callsFake(async () => { });
    const result = await process.call(getContext(), message, configuration);

    expect(result).to.deep.equal(message);
    expect(publishStub.getCall(0).args[0]).to.be.deep.equal(message.body.routingKey);
    expect(publishStub.getCall(0).args[1]).to.be.deep.equal(Buffer.from(JSON.stringify(message.body.payload)));
    expect(publishStub.getCall(0).args[2]).to.be.deep.equal({
      contentType: 'application/octet-stream',
      messageId: message.id,
    });
  });

  it('should send encrypted message if doNotEncrypt is falsy', async () => {
    const message = {
      id: '123',
      body: {
        payload: {
          name: 'John',
          age: 30,
        },
        routingKey: 'test',
      },
    };
    const publishStub = sinon.stub(AMQPClient.prototype, 'publish').callsFake(async () => { });
    const result = await process.call(getContext(), message, {});

    expect(result).to.deep.equal(message);
    expect(publishStub.getCall(0).args[0]).to.be.deep.equal(message.body.routingKey);
    expect(publishStub.getCall(0).args[1].toString('utf8')).to.be.deep.equal('Z�.�g�{.\u0018�Cƚ\n�95�Ì(��6�-rN*��h(]�=qEa���cu�<\u0013');
    expect(publishStub.getCall(0).args[2]).to.be.deep.equal({
      contentType: 'application/octet-stream',
      messageId: message.id,
    });
  });
});
