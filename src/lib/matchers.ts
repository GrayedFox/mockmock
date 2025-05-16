import { JSPrimitive, Matcher } from '../types';
import { getType } from '../utils';

/**
 * This method matches the type of the specified primitive value against the Matcher.types.
 *
 * Returns true if Matcher.types is undefined.
 *
 * @param matcher the matcher with the matching type(s)
 * @param value the value that will be type checked for a match
 */
const isMatchingType = (matcher: Matcher, value: JSPrimitive): boolean => {
  if (typeof matcher.types === 'undefined') {
    return true;
  }
  return Array.prototype.includes.call(matcher.types, getType(value));
};

/**
 * This method matches the specified key against the Matcher.keys.
 *
 * Returns true if Matcher.keys is undefined or the keyName parameter is undefined.
 *
 * @param matcher the matcher with the matching key(s)
 * @param keyName the key that will be checked for an exact string match
 */
const isMatchingKey = (matcher: Matcher, keyName?: string): boolean => {
  if (typeof matcher.keys === 'undefined' || typeof keyName === 'undefined') {
    return true;
  }
  return Array.prototype.includes.call(matcher.keys, keyName);
};

/**
 * This method matches the specified primitive value against the Matcher.values.
 *
 * Returns true if Matcher.values is undefined.
 *
 * @param matcher the matcher with the matching value(s)
 * @param value the primitive value that will be losely checked for equality
 */
const isMatchingValue = (matcher: Matcher, value: JSPrimitive): boolean => {
  if (typeof matcher.values === 'undefined') {
    return true;
  }
  return Array.prototype.includes.call(matcher.values, value);
};

/**
 * The match method returns true if the Matcher has at least one exact matching type, value, and/or key.
 *
 * @param matcher a {@link Matcher} to match against
 * @param value the value to match against
 * @param key an optional key to match against
 */
export const match = (
  matcher: Matcher,
  value: JSPrimitive,
  key?: string
): boolean => {
  const matchesType = isMatchingType(matcher, value);
  const matchesKey = isMatchingKey(matcher, key);
  const matchesValue = isMatchingValue(matcher, value);
  // Matcher contract states that undefined Matcher.properties always match so this works
  return matchesType && matchesKey && matchesValue;
};
