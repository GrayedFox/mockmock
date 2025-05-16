import { isMockFixture, MockFixture } from '../types';
import { readData } from '.';

/**
 * A wrapper that reads a fixture file from disk and attempts to parse it.
 *
 * For now buffers are not supported.
 *
 * @param filePath
 */
export const loadFixtureData = async (
  filePath: string
): Promise<MockFixture> => {
  const result = await readData(filePath);
  const jsonData = JSON.parse(result);

  if (isMockFixture(jsonData)) {
    return jsonData;
  }

  throw new Error(
    `Mockmock | Invalid fixture format! The fixture data is malformed. Did you edit the fixture data by hand?`
  );
};
