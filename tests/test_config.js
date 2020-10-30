/* eslint-disable babel/camelcase */
import tap from 'tap';
import DynamoDbClient from '../src';

const qConfig = {
  region: 'us-east-1',
  endpoint: process.env.NODE_ENV === 'test' ? 'http://localhost:8000' : undefined,
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
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
      TableName: 'trips',
    };
    await dynamoDb.client.createTable(tableParams).promise().catch(() => {});
  }

  let doc = await dynamoDb.put(ctx, {
    TableName: TripItem.TableName,
    Item: {
      ...TripItem.Key,
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
