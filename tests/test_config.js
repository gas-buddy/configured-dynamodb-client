/* eslint-disable babel/camelcase */
import tap from 'tap';
import DynamoDbClient from '../src';

const testConfig = process.env.NODE_ENV === 'test' ? {
  region: 'local',
  endpoint: 'http://localhost:8000',
} : {};

const qConfig = {
  region: 'us-east-1',
  ...testConfig,
};

const ctx = {
  logger: console,
  headers: { correlationid: `test-request-${Date.now()}` },
  service: {
    wrapError(e, args = {}) { return Object.assign(e, args); },
  },
};

const trip_taker_guid = 'test-trip-taker-guid';
const date_and_trip_guid = '2020-10-30-08:00:00-test_trip_guid';

const TripItem = {
  TableName: 'trips',
  Key: {
    trip_taker_guid,
    date_and_trip_guid,
  },
};

tap.test('test_basic_operations', async (t) => {
  const dynamoDb = new DynamoDbClient(ctx, qConfig);
  t.ok(dynamoDb, 'Should create the client');
  await dynamoDb.start();

  if (process.env.NODE_ENV === 'test') {
    const tableParams = {
      AttributeDefinitions: [
        {
          AttributeName: 'trip_taker_guid',
          AttributeType: 'S',
        },
        {
          AttributeName: 'date_and_trip_guid',
          AttributeType: 'S',
        },
        {
          AttributeName: 'trip_id',
          AttributeType: 'S',
        },
      ],
      KeySchema: [
        {
          AttributeName: 'trip_taker_guid',
          KeyType: 'HASH',
        },
        {
          AttributeName: 'date_and_trip_guid',
          KeyType: 'RANGE',
        },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'trips_by_id',
          KeySchema: [{ AttributeName: 'trip_id', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'KEYS_ONLY' },
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
          },
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
      TableName: 'trips',
    };
    await dynamoDb.client.createTable(tableParams).promise().catch((error) => {
      if (error.code !== 'ResourceInUseException') {
        // eslint-disable-next-line no-console
        console.error('Table creation failed', error);
      }
    });
  }

  let doc = await dynamoDb.put(ctx, {
    TableName: TripItem.TableName,
    Item: {
      ...TripItem.Key,
      trip_id: 'test-trip-id',
      this: 'is',
      a: 'test',
      really: true,
    },
  });
  t.ok(true, 'Should put a document');
  doc = await dynamoDb.get(ctx, TripItem);
  t.ok(doc?.Item, 'Should retrieve the item');
  let docs = await dynamoDb.query(ctx, {
    TableName: TripItem.TableName,
    KeyConditionExpression: 'trip_taker_guid = :trip_taker_guid AND begins_with (date_and_trip_guid, :date)',
    ExpressionAttributeValues: {
      ':trip_taker_guid': TripItem.Key.trip_taker_guid,
      ':date': '2020',
    },
  });
  t.equals(docs?.Items?.length, 1, 'Should get 1 item');
  docs = await dynamoDb.query(ctx, {
    TableName: TripItem.TableName,
    IndexName: 'trips_by_id',
    KeyConditionExpression: 'trip_id = :trip_id',
    ExpressionAttributeValues: { ':trip_id': 'test-trip-id' },
  });
  t.equals(docs?.Items?.length, 1, 'Should get 1 item');
  t.equals(docs?.Items?.[0]?.date_and_trip_guid, TripItem.Key.date_and_trip_guid, 'Should match');
  docs = await dynamoDb.query(ctx, {
    TableName: TripItem.TableName,
    KeyConditionExpression: 'trip_taker_guid = :trip_taker_guid AND begins_with (date_and_trip_guid, :date)',
    ExpressionAttributeValues: {
      ':trip_taker_guid': TripItem.Key.trip_taker_guid,
      ':date': '2019',
    },
  });
  t.equal(docs.Count, 0, 'Should return no items');
  await dynamoDb.delete(ctx, TripItem);
  doc = await dynamoDb.get(ctx, TripItem);
  t.notOk(doc?.Item, 'Should return no item');
});
