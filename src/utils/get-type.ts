/**
 * This method returns a more accurate type than the typeof operator.
 *
 * See: {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof#custom_method_that_gets_a_more_specific_type}
 *
 * @example getType(null) // >> 'null'
 * @example getType(new CustomClass('value'))) // >> 'CustomClass'
 * @example getType(() => console.log('hello world')) // >> 'Function'
 */

export const getType = (value: unknown): string => {
  // null case, return null intead of 'object'
  if (value === null) {
    return 'null';
  }

  // undefined case, catch early for type safety
  if (typeof value === 'undefined') {
    return 'undefined';
  }

  const baseType = typeof value;

  // safe primitive types
  if (!['object', 'function'].includes(baseType)) {
    return baseType;
  }

  // classes in JS are basically functions whose source code starts with the "class" keyword
  if (
    baseType === 'function' &&
    Function.prototype.toString.call(value).startsWith('class')
  ) {
    return 'class';
  }

  // the name of the constructor; for example `Array`, `GeneratorFunction`, `Number`, `String`, `Boolean`, or `MyCustomClass`
  const className = value.constructor.name;
  if (typeof className === 'string' && className !== '') {
    return className;
  }

  // given the conditions above we can be 99% sure that value is an object but to make tsc happy we type check it again here
  if (typeof value === 'object' && Symbol.toStringTag in value) {
    const tag = value[Symbol.toStringTag];
    // Symbol.toStringTag often specifies the "display name" of the object's class, it's used in Object.prototype.toString()
    if (typeof tag === 'string') {
      return tag;
    }
  }

  // at this point there's no robust way to get the type of value so we use the base implementation
  return baseType;
};
