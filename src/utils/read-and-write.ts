import nodePath from 'node:path';

import { readFile, writeFile } from 'fs/promises';

/**
 * Asynchronously reads some data from the disk, yielding the data upon completion
 *
 * @param filePath The file path including extension (if any)
 * @param options Encoding and other options
 */
export const readData = async (filePath: string): Promise<string> => {
  try {
    const resolvedPath = nodePath.resolve('.', filePath);
    const data = await readFile(resolvedPath, 'utf8');
    if (typeof data !== 'string') {
      throw new Error(
        'Non-text files are not yet supported, ensure the file you are reading does not result in a buffer'
      );
    }
    return data;
  } catch (err) {
    throw new Error(`Failed to read data from disk! Error: \n ${err}`);
  }
};

/**
 * Asynchronously write some data to the disk, yields nothing
 *
 * @param filePath The file path including extension (if any)
 * @param data The data to write to disk
 */
export const writeData = async (filePath: string, data: string) => {
  try {
    const resolvedPath = nodePath.resolve('.', filePath);
    await writeFile(resolvedPath, data);
  } catch (err) {
    throw new Error(`Failed to write data to disk! Error: \n ${err}`);
  }
};
