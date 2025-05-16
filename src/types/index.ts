import { getType } from '../utils';

/**
 * Each individual data point that is mocked is wrapped in a mock object
 */
export interface Mock {
  readonly mock: Record<string, unknown>;
}

/**
 * A stub is an object with a stub key that stores a primitive value
 */
export interface Stub {
  /** The value used to replace all occurances of a match */
  stub: JSPrimitive;
}

/**
 * The matcher interface is a fundamental component of Mockmock that is used when searching and stubbing data.
 *
 * A matcher defines one or more keys, values, or types to match against. It also defines a contract: for any
 */
export interface Matcher {
  /** Keys to match against - a matcher must define a set of keys, values, or both */
  keys?: string[];
  /** Values to match against - a matcher must define a set of keys, values, or both */
  values?: JSPrimitive[];
  /** Optional types to match against. If not defined will match any type. */
  types?: JSPrimitiveStrings[];
}

/**
 * The stub matcher interface combines the stub and matcher interfaces by also defining a stub value to replace any match.
 */
export interface StubMatcher extends Stub, Matcher {}

/**
 * A fixture file contains one or more {@link MockContext}(s). Fixture data is the outer most wrapper of all the mocked
 * data saved in a single session after calling Mockmock.save().
 */
export interface MockFixture {
  [context: string]: MockContext;
}

/**
 * The mock type interface is an ID mapped to an array of {@link Mock}s
 */
export interface MockType {
  [id: string]: Mock[];
}

/** Covenience type for array of JSON values */
export type JSONArray = Array<JSONValue>;

/**
 * All of the mock type strings
 */
export type MockTypeString = 'data' | 'sync' | 'async';

/**
 * Each context contains mocked method, request, and/or other data. A default context will be created and used if the developer
 * chooses not to specify one. Contexts are useful for segregating saved data when recording.
 */
export type MockContext = {
  [mockType in MockTypeString]: MockType;
};

/** Used to track consecutive calls to the replay() method */
export interface MockTracker {
  [context: string]: {
    data: { [id: string]: number };
    sync: { [id: string]: number };
    async: { [id: string]: number };
  };
}

/**
 * JSON primitive values are a subset of JavaScript primitive values, one of `string`, `number`, `boolean`, or `null`.
 */
export type JSONPrimitive = string | number | boolean | null;

/**
 * A JSON value can be any {@link JSONPrimitive}, a {@link JSONObject}, or a {@link JSONArray}
 */
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;

/**
 * A JSON object may define an arbitrary amount of string keys mapped to a {@link JSONValue}
 */
export interface JSONObject {
  [key: string]: JSONValue;
}

/**
 * All JavaScript primitive types as strings
 */
export type JSPrimitiveStrings =
  | 'string'
  | 'number'
  | 'bigint'
  | 'boolean'
  | 'undefined'
  | 'symbol'
  | 'null';

/**
 * All JavaScript primitive types
 */
export type JSPrimitive =
  | string
  | number
  | bigint
  | boolean
  | undefined
  | symbol
  | null;

/**
 * Check if a value is a JS primitive, using the more accurate {@link getType} method
 *
 * @param value
 */
export const isJsPrimitive = (value: unknown): value is JSPrimitive => {
  const primitiveStrings: string[] = [
    'string',
    'number',
    'bigint',
    'boolean',
    'undefined',
    'symbol',
    'null'
  ];

  return primitiveStrings.includes(getType(value));
};

/**
 * This method checks if a value is defined, non-null object which we signal to tsc means is satisfies the Record<string, unknown> schema
 *
 * @param value
 */
export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return ['Object', 'object'].includes(getType(value));
};

/**
 * Check if an object is a valid {@link MockContext} object (should have, `methods`,  `requests`, and `data` keys).
 *
 * @param object
 */
export const isMockContext = (object: Record<string, unknown>): object is MockContext => {
  return object
    && isRecord(object['data'])
    && isRecord(object['sync'])
    && isRecord(object['async']);
};

/**
 * Check if an object is a valid {@link MockFixture} object (should have string entries containing {@link MockContext}s).
 *
 * @param object
 */
export const isMockFixture = (object: object): object is MockFixture => {
  return (
    object &&
    Object.entries(object).every(([key, value]) => {
      return getType(key) === 'string' && isRecord(object) && isMockContext(value);
    })
  );
};




