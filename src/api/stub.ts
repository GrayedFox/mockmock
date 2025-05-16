import { match } from '../lib';
import { isRecord, isJsPrimitive, JSPrimitive, StubMatcher } from '../types';

// stubs any matching object keys via reference
const stubObjectKey = (
  matchers: StubMatcher[],
  target: Record<string, unknown>,
  key: string,
  value: JSPrimitive
) => {
  for (const matcher of matchers) {
    if (match(matcher, value, key)) {
      target[key] = matcher.stub;
    }
  }
};

// greedily stub matching primitive values, prioritizing leading StubMatchers
// otherwise return original value
const stubPrimitive = (
  matchers: StubMatcher[],
  value: JSPrimitive
): JSPrimitive => {
  for (const matcher of matchers) {
    if (match(matcher, value)) {
      return matcher.stub;
    }
  }
  return value;
};

/**
 * Recursively match an array of matchers against an object or array, stubbing matches.
 *
 * Constructs and returns a new object or array in case the source object or any references are immutable.
 */
export const stub = (
  matchers: StubMatcher[],
  source: Record<string, unknown> | unknown[]
): Record<string, unknown> | unknown[] => {
  const copy: Record<string, unknown> | unknown[] = Array.isArray(source) ? [] : {};

  // handle arrays
  if (Array.isArray(source) && Array.isArray(copy)) {
    for (const entry of source) {
      // recurse to handle objects and nested arrays
      if (isRecord(entry) || Array.isArray(entry)) {
        copy.push(stub(matchers, entry));
      }
      // handle primitives
      if (isJsPrimitive(entry)) {
        copy.push(stubPrimitive(matchers, entry));
      }
    }
  }

  // handle objects
  if (isRecord(copy)) {
    for (const [key, value] of Object.entries(source)) {
      // recurse to handle objects and arrays
      if (isRecord(value) || Array.isArray(value)) {
        copy[key] = stub(matchers, value);
      }
      // handle primitives
      if (isJsPrimitive(value)) {
        copy[key] = value;
        stubObjectKey(matchers, copy, key, value);
      }
    }
  }

  return copy;
};
