import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, GetCommand, PutCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * Defines DynamoDB persistence adapter class
 */
class DynamoDbPersistenceAdapter {
  /**
   * Constructor
   */
  constructor({ tableName, partitionKeyName = 'id', attributesName = 'attributes' }) {
    this.tableName = tableName;
    this.partitionKeyName = partitionKeyName;
    this.attributesName = attributesName;

    // Initialize DynamoDB client
    this.client = DynamoDBDocumentClient.from(
      new DynamoDBClient({
        region: process.env.AWS_REGION || 'us-east-1',
        marshallOptions: {
          convertEmptyValues: true
        }
      })
    );
  }

  /**
   * Returns persistent attributes
   * @param  {Object} requestEnvelope
   * @return {Promise}
   */
  async getAttributes(requestEnvelope) {
    // Get attributes from DynamoDB
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          [this.partitionKeyName]: requestEnvelope.context.System.user.userId
        },
        ConsistentRead: true
      })
    );

    return result.Item?.[this.attributesName] || {};
  }

  /**
   * Saves persistent attributes
   * @param  {Object} requestEnvelope
   * @param  {Object} attributes
   * @return {Promise}
   */
  async saveAttributes(requestEnvelope, attributes) {
    // Save attributes to DynamoDB
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          [this.partitionKeyName]: requestEnvelope.context.System.user.userId,
          [this.attributesName]: attributes
        }
      })
    );
  }

  /**
   * Deletes persistent attributes
   * @param  {Object} requestEnvelope
   * @return {Promise}
   */
  async deleteAttributes(requestEnvelope) {
    // Delete attributes from DynamoDB
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: {
          [this.partitionKeyName]: requestEnvelope.context.System.user.userId
        }
      })
    );
  }
}

export { DynamoDbPersistenceAdapter };
