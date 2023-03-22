/* eslint-disable no-unused-vars */
const sinon = require('sinon');
const { expect } = require('chai');
const { getContext } = require('../common');
const { AMQPClient } = require('../../lib/amqp');
const consume = require('../../lib/triggers/consume');

describe('processAction', () => {
  beforeEach(() => {
  });
  afterEach(() => {
    sinon.restore();
  });

  it('should start consume messages', async () => {
    const configuration = {
      doNotEncrypt: true,
    };
    sinon.stub(AMQPClient.prototype, 'init').callsFake(async () => { });
    const consumeStub = sinon.stub(AMQPClient.prototype, 'consume').callsFake(async () => { });
    await consume.process.call(getContext(), {}, configuration);
    expect(consumeStub.getCall(0).args[1]).to.be.deep.equal({
      noAck: true,
      consumerTag: `consumer_${process.env.ELASTICIO_EXEC_ID}_${process.env.ELASTICIO_FLOW_ID}`,
    });
  });
});
