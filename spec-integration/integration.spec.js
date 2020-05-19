const fs = require('fs');
const { expect } = require('chai');
const EventEmitter = require('events');
const co = require('co');
const logger = require('@elastic.io/component-logger')();
const publish = require('../lib/actions/publish');
const consume = require('../lib/triggers/consume');

class TestEmitter extends EventEmitter {
  constructor(done) {
    super();
    this.data = [];
    this.end = 0;
    this.error = [];
    this.logger = logger;

    this.on('data', (value) => this.data.push(value));
    this.on('error', (value) => this.error.push(value));
    this.on('end', () => {
      this.end += 1;
      done();
    });
  }
}

describe.skip('Integration test', () => {
  if (fs.existsSync('.env')) {
    // eslint-disable-next-line global-require
    require('dotenv').config();
  }
  before(() => {
    if (!process.env.AMQP_URL) throw new Error('Please set AMQP_URL env variable to proceed');
    if (!process.env.ELASTICIO_MESSAGE_CRYPTO_IV) {
      throw new Error('Please set ELASTICIO_MESSAGE_CRYPTO_IV env '
            + 'variable to proceed');
    }
    if (!process.env.ELASTICIO_MESSAGE_CRYPTO_PASSWORD) {
      throw new Error('Please set '
            + 'ELASTICIO_MESSAGE_CRYPTO_PASSWORD env variable to proceed');
    }
  });

  describe('subscribe then publish', () => {
    const cfg = {
      amqpURI: process.env.AMQP_URL,
      topic: `integration-testing-${process.env.TRAVIS_COMMIT || 'local'
      }-${process.env.TRAVIS_NODE_VERSION || 'local'}`,
      bindingKeys: 'foo.bar',
    };

    before(() => publish.init(cfg).then(consume.init(cfg)));

    it('send and receive', () => co(function* gen() {
      logger.info('Starting test');
      const receiver = new TestEmitter();
      const sender = new TestEmitter();
      const msg1 = {
        id: 'one',
        body: {
          routingKey: 'foo.bar',
          payload: {
            value: 'foo.bar',
          },
        },
        attachments: {
          one: 'http://one.com',
        },
      };
      const msg2 = {
        id: 'two',
        body: {
          routingKey: 'foo.baz',
          payload: {
            value: 'foo.baz',
          },
        },
        attachments: {
          two: 'http://two.com',
        },
      };
      logger.info('Initializing receiver');
      yield consume.process.call(receiver, {}, cfg);
      yield new Promise((ok) => setTimeout(ok, 1000));
      logger.info('Sending messages');
      const out1 = yield publish.process.call(sender, msg1, cfg);
      const out2 = yield publish.process.call(sender, msg2, cfg);
      expect(out1).deep.equal(msg1);
      expect(out2).deep.equal(msg2);
      logger.info('Sending completed, now wait');
      yield new Promise((ok) => setTimeout(ok, 1000));
      logger.info('Lets check');
      expect(receiver.data.length).equal(1);
      expect(receiver.data[0]).deep.equal({
        id: 'one',
        body: {
          value: 'foo.bar',
        },
        attachments: {
          one: 'http://one.com',
        },
        headers: {},
        metadata: {},
      });
    })).timeout(5000);
  });
});
