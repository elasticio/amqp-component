const amqp = require('amqplib');
const platformLogger = require('@elastic.io/component-logger')();

const RECONNECT_DELAY_MS = 5000;
const RECONNECT_ATTEMPTS_MAX = 10;

const RECREATE_DELAY_MS = 1000;
const RECREATE_ATTEMPTS_MAX = 3;

class AMQPClient {
  constructor(cfg, logger, reconnectAttemptsMax, recreateAttemptsMax) {
    this.connection = null;
    this.channel = null;
    this.reconnectAttempts = 0;
    this.recreateAttempts = 0;
    this.logger = logger || platformLogger;
    this.reconnectAttemptsMax = reconnectAttemptsMax || RECONNECT_ATTEMPTS_MAX;
    this.recreateAttemptsMax = recreateAttemptsMax || RECREATE_ATTEMPTS_MAX;
    this.cfg = cfg;
    this.queueName = `eio_consumer_${process.env.ELASTICIO_FLOW_ID}_${process.env.ELASTICIO_USER_ID}`;
  }

  setLogger(logger) {
    this.logger = logger;
  }

  async createConnection() {
    try {
      const newConnection = await amqp.connect(this.cfg.amqpURI);
      this.logger.info('Successfully connected to RabbitMQ');
      return newConnection;
    } catch (error) {
      this.logger.error(`Failed to connect to RabbitMQ: ${error.message}`);
      throw error;
    }
  }

  async publish(routingKey, content, options) {
    this.channel.publish(this.cfg.topic, routingKey, content, options);
    this.logger.info('Message published');
    await this.channel.waitForConfirms();
    this.logger.info('Message publishing confirmed');
  }

  async assertExchange(options) {
    await this.channel.assertExchange(this.cfg.topic, 'topic', options);
  }

  async assertQueue(options) {
    await this.channel.assertQueue(this.queueName, options);
  }

  async bindQueue(pattern) {
    await this.channel.bindQueue(this.queueName, this.cfg.topic, pattern);
  }

  async consume(onMessage, options) {
    this.logger.info('Starting consuming from %s', this.queueName);
    await this.channel.consume(this.queueName, onMessage, options);
  }

  async createChannel() {
    try {
      const newChannel = await this.connection.createChannel();
      this.logger.info('Successfully created channel');
      return newChannel;
    } catch (error) {
      this.logger.error(`Failed to create channel: ${error.message}`);
      throw error;
    }
  }

  async createConfirmChannel() {
    try {
      const newChannel = await this.connection.createConfirmChannel();
      this.logger.info('Successfully created confirm channel');
      return newChannel;
    } catch (error) {
      this.logger.error(`Failed to create confirm channel: ${error.message}`);
      throw error;
    }
  }

  async startChannel() {
    try {
      this.connection = await this.createConnection();
      this.connection.on('error', (error) => this.handleConnectionError(error));
      this.channel = await this.createChannel();
      this.channel.on('error', (error) => this.handleChannelError(error));
      // Set up your consumer or producer with the channel here
    } catch (error) {
      this.logger.error(`Failed to start Channel: ${error.message}`);
      throw error;
    }
  }

  async startConfirmChannel() {
    try {
      this.connection = await this.createConnection();
      this.connection.on('error', (error) => this.handleConnectionError(error));
      this.channel = await this.createChannel();
      this.channel.on('error', (error) => this.handleConfirmChannelError(error));
      // Set up your consumer or producer with the channel here
    } catch (error) {
      this.logger.error(`Failed to start Confirm Channel: ${error.message}`);
      throw error;
    }
  }

  async handleConnectionError(error) {
    this.logger.error('Connection error:', error.message);
    this.connection.removeListener('error', (err) => this.handleConnectionError(err));
    try {
      await this.connection.close();
      this.logger.info('Connection closed, attempting to reconnect...');
      await this.attemptReconnect();
    } catch (err) {
      this.logger.error(`Failed to close connection: ${error.message}`);
      await this.attemptReconnect();
    }
  }

  async handleChannelError(error) {
    this.logger.error(`Channel error: ${error.message}`);
    this.channel.removeListener('error', (err) => this.handleChannelError(err));
    try {
      await this.channel.close();
      this.logger.info('Channel closed, attempting to recreate...');
      await this.attemptChannelRecreate();
    } catch (err) {
      this.logger.error(`Failed to close channel: ${err.message}`);
      await this.attemptChannelRecreate();
    }
  }

  async handleConfirmChannelError(error) {
    this.logger.error(`Confirm Channel error: ${error.message}`);
    this.channel.removeListener('error', (err) => this.handleConfirmChannelError(err));
    try {
      await this.channel.close();
      this.logger.info('Channel closed, attempting to recreate...');
      await this.attemptConfirmChannelRecreate();
    } catch (err) {
      this.logger.error(`Failed to close channel: ${err.message}`);
      await this.attemptConfirmChannelRecreate();
    }
  }

  async attemptReconnect() {
    if (this.reconnectAttempts < this.reconnectAttemptsMax) {
      await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY_MS));
      try {
        this.connection = await this.createConnection();
        this.connection.on('error', (error) => this.handleConnectionError(error));
        this.channel = await this.createChannel();
        this.channel.on('error', (error) => this.handleChannelError(error));
        // Set up your consumer or producer with the channel here
        this.reconnectAttempts = 0;
      } catch (error) {
        this.logger.info(`Reconnect attempt ${this.reconnectAttempts + 1} of ${this.reconnectAttemptsMax} failed, retrying...`);
        this.reconnectAttempts += 1;
        await this.attemptReconnect();
      }
    } else {
      const errMsg = `Failed to reconnect after ${this.reconnectAttemptsMax} attempts, giving up`;
      this.logger.info(errMsg);
      throw new Error(errMsg);
    }
  }

  async attemptChannelRecreate() {
    if (this.recreateAttempts < this.recreateAttemptsMax) {
      await new Promise((resolve) => setTimeout(resolve, RECREATE_DELAY_MS));
      try {
        this.channel = await this.createChannel();
        this.channel.on('error', (error) => this.handleChannelError(error));
        // Set up your consumer or producer with the channel here
        this.recreateAttempts = 0;
      } catch (error) {
        this.logger.info(`Recreate attempt ${this.recreateAttempts + 1} of ${this.recreateAttemptsMax} failed, retrying...`);
        this.recreateAttempts += 1;
        await this.attemptChannelRecreate();
      }
    } else {
      const errMsg = `Failed to recreate channel after ${this.recreateAttemptsMax} attempts`;
      this.logger.info(errMsg);
      throw new Error(errMsg);
    }
  }

  async attemptConfirmChannelRecreate() {
    if (this.recreateAttempts < this.recreateAttemptsMax) {
      await new Promise((resolve) => setTimeout(resolve, RECREATE_DELAY_MS));
      try {
        this.channel = await this.createConfirmChannel();
        this.channel.on('error', (error) => this.handleConfirmChannelError(error));
        // Set up your consumer or producer with the channel here
        this.recreateAttempts = 0;
      } catch (error) {
        this.logger.info(`Recreate attempt ${this.recreateAttempts + 1} of ${this.recreateAttemptsMax} failed, retrying...`);
        this.recreateAttempts += 1;
        await this.attemptConfirmChannelRecreate();
      }
    } else {
      const errMsg = `Failed to recreate confirm channel after ${this.recreateAttemptsMax} attempts`;
      this.logger.info(errMsg);
      throw new Error(errMsg);
    }
  }
}

module.exports.AMQPClient = AMQPClient;
