import { Mockmock } from '../index';
import { JSONObject } from '../types';

const MM = Mockmock.instance;
const fixtureDir = './src/tests/fixtures/';
const tempDir = './dist/';

// Todo: need to add record and replay smoke tests as well as consecutive data tests

test('it can load a specific context', async () => {
  MM.fixturePath = fixtureDir;
  await MM.load('test-data', 'contextOne');
  expect(MM.context()).toBe('contextOne');
});

// this fails because the saving logic isn't based on whatever fixture data is loaded,
// it's based on whatever new data has been **recorded** - need to think on whetherh
// this is desired behaviour or not
test.skip('it can write a fixture to disk', async () => {
  MM.fixturePath = tempDir;
  await MM.save('temp-data');
  await MM.load('temp-data', 'contextTwo');
  expect(MM.context()).toBe('contextTwo');
});

test('it can change and then search the current context for a mock', async () => {
  MM.context('contextTwo');
  const mock = MM.search([
    { keys: ['x-powered-by'], values: ['Express'] },
    { keys: ['sessionId'], values: ['zzz'] },
  ]);
  expect(mock.mock['method']).toBe('updateCart');
});

test('it can search a different context than the one loaded for a mock', async () => {
  const mock = MM.search(
    [
      { keys: ['type'], values: ['contextOneMethodIdOneMockTwo'] },
      { keys: ['sessionId'], values: ['xxx'] },
    ],
    ['sync'],
    ['contextOne']
  );
  const payload = mock.mock['payload'] as JSONObject;
  const cart = payload['cart'] as JSONObject;
  expect(cart['count']).toBe(123);
});

test('it can switch contexts using the context() method', () => {
  MM.context('contextOne');
  expect(MM.context()).toBe('contextOne');
});

test('it can stub all occurances of a matching key no matter how nested', () => {
  const data = {
    mock: {
      type: 'contextOneMethodIdOneMockTwo',
      displayValue: null,
      payload: {
        apiKey: 'key',
        displayValue: undefined,
        cart: {
          sessionId: 'xxx',
          count: 123,
          pricing: {
            totalPrice: {
              __typename: 'Money',
              amount: 279.93,
              currency: 'USD',
              displayValue: 279.93,
            },
            subtotalPrice: {
              __typename: 'Money',
              amount: 279.93,
              currency: 'USD',
              values: [
                {
                  displayValue: '$279.93',
                },
                {
                  displayValue: false,
                },
                {
                  displayValue: Symbol('x'),
                },
              ],
            },
            tax: {
              __typename: 'Money',
              amount: 3.33,
              currency: 'USD',
              displayValue: true,
            },
            shipping: {
              __typename: 'Money',
              amount: 25,
              currency: 'AUD',
              displayValue: '$25.00',
            },
          },
          errors: [],
        },
      },
    },
  };

  const expectedData = {
    mock: {
      type: 'contextOneMethodIdOneMockTwo',
      displayValue: 'lemons',
      payload: {
        apiKey: 'key',
        displayValue: 'lemons',
        cart: {
          sessionId: 'xxx',
          count: 123,
          pricing: {
            totalPrice: {
              __typename: 'Money',
              amount: 279.93,
              currency: 'USD',
              displayValue: 'lemons',
            },
            subtotalPrice: {
              __typename: 'Money',
              amount: 279.93,
              currency: 'USD',
              values: [
                {
                  displayValue: 'lemons',
                },
                {
                  displayValue: 'lemons',
                },
                {
                  displayValue: 'lemons',
                },
              ],
            },
            tax: {
              __typename: 'Money',
              amount: 3.33,
              currency: 'USD',
              displayValue: 'lemons',
            },
            shipping: {
              __typename: 'Money',
              amount: 25,
              currency: 'AUD',
              displayValue: 'lemons',
            },
          },
          errors: [],
        },
      },
    },
  };

  const stubbedData = MM.stub(
    [{ stub: 'lemons', keys: ['displayValue'] }],
    data
  ) as Record<string, unknown>;
  expect(stubbedData).toEqual(expectedData);
});
