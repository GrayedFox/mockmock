import { match } from '../lib';
import {
  isRecord,
  isJsPrimitive,
  Matcher,
  Mock,
  MockFixture,
  MockTypeString,
} from '../types';

/**
 * Greedy recursive search of an array of Mocks against all provided Matchers (terms)
 *
 * The search will go as deep as it needs to, removing a term from the search terms once it has been found.
 */
const recursiveMatch = (
  matchers: Matcher[],
  mocks: Mock[]
): Mock | undefined => {
  // populate search terms
  const terms: Matcher[] = matchers.slice();

  const recurse = (data: Record<string, unknown> | Record<string, unknown>[]): boolean => {
    // handle arrays
    if (Array.isArray(data)) {
      data.map((el) => recurse(el));
    }

    // handle objects
    if (isRecord(data)) {
      for (const [key, value] of Object.entries(data)) {
        // step into nested objects and nested arrays
        if (isRecord(value) || Array.isArray(value)) {
          recurse(value);
        }
        // handle primitives
        if (isJsPrimitive(value)) {
          for (let i = 0; i < terms.length; i++) {
            if (match(terms[i], value, key)) {
              terms.splice(i, 1);
              break;
            }
          }
        }
        // if we are out of search terms we have found a match
        if (terms.length === 0) {
          return true;
        }
      }
    }
    // if we reach this point we must still have terms left so there is no nested match
    return false;
  };

  // iterate over all mocks of inside a grouping
  for (const mock of mocks) {
    if (recurse(mock.mock)) {
      return mock;
    }
  }
};

/**
 *
 * A recursive greedy search for a matching {@link Mock} based on one or more {@link Matcher}(s).
 *
 * **Note: a positive match must contain all of the given Matchers (terms)**.
 *
 * Each individual match (term) can occur at any level of nesting within the fixture data.
 *
 * To help speed up long searches specify only the needed contexts and mock types (i.e. requests or methods).
 *
 * This is a synchronous method, V2 will offer an asynchronous counterpart.
 *
 * @param matcher
 * @param fixtureData
 * @param mockTypes
 * @param contextIds
 */
export const search = (
  matchers: Matcher[],
  fixtureData: MockFixture,
  mockTypes: MockTypeString[],
  contextIds: string[]
): Mock => {
  // this looks computationally bad but the nesting here narrows down the search scope, if a leaner scope is provided
  for (const contextId of contextIds) {
    for (const mockType of mockTypes) {
      for (const mockId of Object.keys(fixtureData[contextId][mockType])) {
        const mockArray = fixtureData[contextId][mockType][mockId] as Mock[];
        const match = recursiveMatch(matchers, mockArray);
        // greedy: returns the first matching mock if found
        if (match) {
          return match;
        }
      }
    }
  }

  throw new Error(
    `Could not find a full match in any of the specified contexts with the provided Matcher(s)!`
  );
};
