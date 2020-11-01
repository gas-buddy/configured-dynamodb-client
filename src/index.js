import { EventEmitter } from 'events';
import { DynamoDB } from 'aws-sdk';

export default class ConfiguredDynamoDbClient extends EventEmitter {
  constructor(context, config) {
    super();

    this.config = config;
    this.logger = context.logger;
    const { module, ...rest } = config;

    this.logger.info('Creating DynamoDB client', rest);
    this.client = new DynamoDB(rest);
  }

  async start() {
    this.documentClient = new DynamoDB.DocumentClient({ service: this.client });
    return this;
  }

  async put(context, params: DynamoDB.DocumentClient.PutItemInput) {
    return this.documentClient.put(params).promise();
  }

  async get(context, params: DynamoDB.DocumentClient.GetItemInput) {
    return this.documentClient.get(params).promise();
  }

  async batchGet(context, params: DynamoDB.DocumentClient.BatchGetItemInput) {
    return this.documentClient.batchGet(params).promise();
  }

  async batchWrite(context, params) {
    return this.documentClient.batchWrite(params).promise();
  }

  async query(context, params: DynamoDB.DocumentClient.QueryInput) {
    return this.documentClient.query(params).promise();
  }

  async delete(context, params: DynamoDB.DocumentClient.DeleteItemInput) {
    return this.documentClient.delete(params).promise();
  }
}
