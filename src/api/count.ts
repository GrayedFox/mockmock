import { Mock, MockFixture, MockTypeString } from '../types';

/**
 *
 * Counts how many frames `id` has across all contexts and types.
 *
 * You can narrow the searched contexts and types (i.e. requests or methods) by specifying only those you wish to tally.
 *
 * This is a synchronous method, V2 will offer an asynchronous counterpart.
 *
 * @param id
 * @param fixtureData
 * @param mockTypes
 * @param contextIds
 */
export const count = (
  id: string,
  fixtureData: MockFixture,
  mockTypes: MockTypeString[],
  contextIds: string[]
): number => {
  let count = 0;
  // this looks computationally bad but the nesting here narrows down the search scope if a leaner scope is provided
  for (const contextId of contextIds) {
    for (const mockType of mockTypes) {
      for (const mockId of Object.keys(fixtureData[contextId][mockType])) {
        if (mockId === id) {
          const mockArray = fixtureData[contextId][mockType][mockId] as Mock[];
          count += mockArray.length;
        }
      }
    }
  }

  return count;
};
