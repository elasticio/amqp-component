const amqp = require('amqplib');

const RECONNECT_DELAY_MS = 5000;
const RECONNECT_ATTEMPTS_MAX = 10;

const RECREATE_DELAY_MS = 1000;
const RECREATE_ATTEMPTS_MAX = 3;

class AMQPClient {
  constructor(logger, reconnectAttemptsMax, recreateAttemptsMax) {
    this.connection = null;
    this.channel = null;
    this.reconnectAttempts = 0;
    this.recreateAttempts = 0;
    this.logger = logger || console;
    this.reconnectAttemptsMax = reconnectAttemptsMax || RECONNECT_ATTEMPTS_MAX;
    this.recreateAttemptsMax = recreateAttemptsMax || RECREATE_ATTEMPTS_MAX;
  }

  async createConnection() {
    try {
      const newConnection = await amqp.connect('amqp://localhost');
      this.logger.info('Successfully connected to RabbitMQ');
      return newConnection;
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async createChannel() {
    try {
      const newChannel = await this.connection.createChannel();
      this.logger.info('Successfully created channel');
      return newChannel;
    } catch (error) {
      this.logger.error('Failed to create channel:', error);
      throw error;
    }
  }

  async start() {
    try {
      this.connection = await this.createConnection();
      this.connection.on('error', error => this.handleConnectionError(error));
      this.channel = await this.createChannel();
      this.channel.on('error', error => this.handleChannelError(error));
      // Set up your consumer or producer with the channel here
    } catch (error) {
      this.logger.error('Failed to start:', error);
      throw error;
    }
  }

  async handleConnectionError(error) {
    this.logger.error('Connection error:', error.message);
    this.connection.removeListener('error', error => this.handleConnectionError(error));
    try {
      await this.connection.close();
      this.logger.info('Connection closed, attempting to reconnect...');
      await this.attemptReconnect();
    } catch (error) {
      this.logger.error('Failed to close connection:', error);
      await this.attemptReconnect();
    }
  }

  async handleChannelError(error) {
    this.logger.error('Channel error:', error.message);
    this.channel.removeListener('error', error => this.handleChannelError(error));
    try {
      await this.channel.close();
      this.logger.info('Channel closed, attempting to recreate...');
      await this.attemptChannelRecreate();
    } catch (error) {
      this.logger.error('Failed to close channel:', error);
      await this.attemptChannelRecreate();
    }
  }

  async attemptReconnect() {
    if (this.reconnectAttempts < this.reconnectAttemptsMax) {
      await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY_MS));
      try {
        this.connection = await this.createConnection();
        this.connection.on('error', error => this.handleConnectionError(error));
        this.channel = await this.createChannel();
        this.channel.on('error', error => this.handleChannelError(error));
        // Set up your consumer or producer with the channel here
        this.reconnectAttempts = 0;
      } catch (error) {
        this.logger.info(`Reconnect attempt ${ this.reconnectAttempts + 1 } of ${ this.reconnectAttemptsMax } failed, retrying...`);
        this.reconnectAttempts++;
        await this.attemptReconnect();
      }
    } else {
      this.logger.info(`Failed to reconnect after ${ this.reconnectAttemptsMax } attempts, giving up`);
    }
  }

}

exports = { AMQPClient }
