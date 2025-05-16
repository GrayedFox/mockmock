/**
 * Returns a file safe name by replacing all non alphanumeric characters with underscores
 *
 * @example fileSafeNamer('https://www.example.com') // >> https___www_example_com
 */
export const fileSafeNamer = (s: string) =>
  s.replace(/[^a-z0-9]/gi, '_').toLowerCase();
