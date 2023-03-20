const amqp = require('amqp-connection-manager');
const platformLogger = require('@elastic.io/component-logger')();

const RECONNECT_TIMEOUT = 5;
const RECONNECT_ATTEMPTS = 12;

const validateAttemptsAndTimeout = (input, def) => {
  if (!input) return def;
  if (input && Number(input).toString() !== 'NaN' && Number(input) <= 1000 && Number(input) >= 0) {
    return Number(input);
  }
  throw new Error('"Reconnect Timeout" and "Reconnect Attempts" should be valid number between 0 and 1000');
};

class AMQPClient {
  constructor(cfg, context) {
    this.connection = null;
    this.channel = null;
    this.logger = context.logger || platformLogger;
    this.cfg = cfg;
    this.queueName = `eio_consumer_${process.env.ELASTICIO_FLOW_ID}_${process.env.ELASTICIO_USER_ID}`;
    this.retry = 0;
    this.context = context;
    this.reconnectTimeOut = validateAttemptsAndTimeout(cfg.reconnectTimeOut, RECONNECT_TIMEOUT);
    this.reconnectAttempts = validateAttemptsAndTimeout(cfg.reconnectAttempts, RECONNECT_ATTEMPTS);
  }

  setLogger(logger) {
    this.logger = logger;
  }

  init(confirmChannel = true, assertExchangeOptions, deleteQueue) {
    return new Promise((resolve, reject) => {
      this.connection = amqp.connect([this.cfg.amqpURI], {
        reconnectTimeInSeconds: this.reconnectTimeOut,
      });
      this.connection.on('connect', () => {
        this.retry = 0;
        this.logger.info('Successfully connected to RabbitMQ');
        resolve();
      });
      this.connection.on('connectFailed', ({ err }) => {
        this.retry += 1;
        if (this.retry >= this.reconnectAttempts) {
          const errMsg = new Error(`Connection failed after ${this.reconnectAttempts} attempts`);
          this.connection.emit('error', { err: errMsg });
          this.context.emit('error', errMsg);
          delete this.connection;
        } else {
          this.logger.error(`Connection failed due to: ${err}, ${this.retry} of ${this.reconnectAttempts} retry after ${this.reconnectTimeOut}sec`);
        }
      });
      this.connection.on('disconnect', ({ err }) => { this.logger.error(`Connection disconnected due to: ${err}`); });
      this.connection.on('error', ({ err }) => {
        this.logger.error(`Connection encountered an error: ${err}`);
        reject(err);
      });
      this.connection.on('blocked', ({ reason }) => { this.logger.error(`Connection blocked due to: ${reason}`); });
      this.connection.on('unblocked', () => { this.logger.info('Connection unblocked'); });
      this.channel = this.connection.createChannel({
        confirm: confirmChannel,
        setup: async (channel) => {
          try {
            this.logger.debug('Asserting topic exchange...');
            await channel.assertExchange(this.cfg.topic, 'topic', assertExchangeOptions);
            if (!confirmChannel) {
              this.logger.debug('Asserting queue');
              await channel.assertQueue(this.queueName, { exclusive: false, durable: false });
              const keys = (this.cfg.bindingKeys || '#').split(',').map((s) => s.trim());
              for (const key of keys) {
                this.logger.debug('Binding queue to exchange...');
                await channel.bindQueue(this.queueName, this.cfg.topic, key);
              }
            }
            if (deleteQueue) {
              this.logger.info(`Deleting queue ${this.queueName}`);
              await channel.deleteQueue(this.queueName);
            }
            this.logger.info('Successfully finished channel setup');
            return channel;
          } catch (err) {
            this.logger.error(`Error on Channel setup: ${err}`);
            return channel;
          }
        },
      });
    });
  }

  async publish(routingKey, content, options) {
    await this.init();
    this.logger.info('Going to publish message');
    await this.channel.publish(this.cfg.topic, routingKey, content, options);
    this.logger.info('Message published');
  }

  async consume(onMessage, options) {
    this.logger.info(`Starting consuming from ${this.queueName}`);
    return this.channel.consume(this.queueName, onMessage, options);
  }

  async waitForConnect() {
    return this.channel.waitForConnect();
  }
}

module.exports.AMQPClient = AMQPClient;
