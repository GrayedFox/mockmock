import { count, search, stub } from './api';
import {
  isRecord,
  Matcher,
  Mock,
  MockFixture,
  MockTracker,
  MockTypeString,
  StubMatcher,
} from './types';
import { getType, loadFixtureData, writeData } from './utils';

// Utility class, still needed?
class MockEvent {
  constructor(readonly mock: Record<string, unknown>) {}
}

// Mockmock Singleton
class Mockmock {
  private _recording: MockFixture = {};
  private _fixture: MockFixture = {};
  private _tracker: MockTracker = {};
  private _contextId = 'default';
  private _requestPending = false;
  private _isBusy = true;
  private _isRecording = false;
  private _isReplaying = true;
  private _fixturePath = '';
  private _fixtureName = '';

  // Static Methods
  private static _instance: Mockmock;

  public static get instance(): Mockmock {
    Mockmock.init();
    return Mockmock._instance;
  }

  // Mockmock can optionally be initialized without returning the instance
  public static init() {
    if (!Mockmock._instance) {
      Mockmock._instance = new Mockmock();
    }
  }

  // Instance Methods
  private constructor() {
    // no-op private constructor
  }

  private get recording(): MockFixture {
    return this._recording;
  }

  private set recording(value: MockFixture) {
    this._recording = value;
  }

  public get fixture(): MockFixture {
    return this._fixture;
  }

  private set fixture(value: MockFixture) {
    this._fixture = value;
  }

  public get fixtureName(): string {
    return this._fixtureName;
  }

  private set fixtureName(value: string) {
    this._fixtureName = value;
  }

  public get fixturePath(): string {
    return this._fixturePath;
  }

  public set fixturePath(value: string) {
    this._fixturePath = value;
  }

  private get contextId(): string {
    return this._contextId;
  }

  private set contextId(value: string) {
    this._contextId = value;
  }

  public get isBusy(): boolean {
    return this._isBusy;
  }

  private set isBusy(value: boolean) {
    this._isBusy = value;
  }

  public get isRecording(): boolean {
    return this._isRecording;
  }

  public set isRecording(value: boolean) {
    this._isRecording = value;
  }

  public get isReplaying(): boolean {
    return this._isReplaying;
  }

  public set isReplaying(value: boolean) {
    this._isReplaying = value;
  }

  public get requestPending(): boolean {
    return this._requestPending;
  }

  private set requestPending(value: boolean) {
    this._requestPending = value;
  }

  private get tracker(): MockTracker {
    return this._tracker;
  }

  private set tracker(value: MockTracker) {
    this._tracker = value;
  }

  // PRIVATE

  /**
   * Called when changing contexts, this ensures new contexts have the correct shape
   */
  private initContext(contextId: string) {
    console.log('Mockmock | Switching contexts to: ' + contextId);
    this.contextId = contextId;

    const isNewContext = typeof this.recording[contextId] === 'undefined';
    const isNewTracker = typeof this.tracker[contextId] === 'undefined';

    // init fixture context if we have no data for this context
    if (isNewContext) {
      this.recording[contextId] = { data: {}, sync: {}, async: {} };
    }

    // init tracker context if this is the first time we have switched to this context
    if (isNewTracker) {
      this.tracker[contextId] = { data: {}, sync: {}, async: {} };
    }
  }

  /**
   * Returns false if fixture contains no entries or Mockmock hasn't finished
   * reading the fixture from disk.
   */
  private isFixtureLoaded(): boolean {
    return this.isBusy === false;
  }

  /**
   * Internal method that checks for a matching ID and initializes it if needed as
   * part of the recording API.
   */
  private checkId(id: string, mockTypeString: MockTypeString) {
    // init context
    if (!this.recording[this.contextId]) {
      this.recording[this.contextId] = { data: {}, sync: {}, async: {} };
    }

    const mockType = this.recording[this.contextId][mockTypeString];

    if (!mockType || typeof mockType[id] === 'undefined') {
      mockType[id] = [];
    }
  }

  /**
   * Internal method that keeps track of the number of calls to a method or request as
   * part of the playback API. This ensures consecutive calls to the same request or
   * method returns consecutive data.
   */
  private trackId(id: string, mockTypeString: MockTypeString): number {
    // init tracker
    if (!this.tracker[this.contextId]) {
      this.tracker[this.contextId] = { data: {}, sync: {}, async: {} };
    }
    const mockType = this.tracker[this.contextId][mockTypeString];
    if (mockType[id] >= 0) {
      mockType[id]++;
    } else {
      mockType[id] = 0;
    }
    return mockType[id];
  }

  /**
   * Internal method that saves mocked data to a unique id so that they later can be written to disk.
   */
  private add(id: string, mockType: MockTypeString, data: unknown) {
    if (!isRecord(data)) {
      throw new Error('Mockmock | Object cannot be null or or undefined');
    }

    // initialize array if we have not encountered this ID before
    this.checkId(id, mockType);

    // For now expects an object, V2 will support streams
    const mockEvent = new MockEvent(data);
    const context = this.recording[this.contextId];

    context[mockType][id].push(mockEvent);
  }

  /**
   * Record data directly, useful for capturing multiple calls to event listeners or data streams
   *
   * @param id the unique ID representing the data chunk
   * @param data an object
   */
  private recordData(id: string, data: unknown): void {
    this.add(id, 'data', data);
  }

  /**
   * Record the result of calling a synchronous method
   *
   * @param id unique ID representing the method
   * @param syncMethodName the name of the synchronous method
   * @param scope the scope (object) that method should be called with
   */
  private recordSync<T>(
    id: string,
    syncMethodName: string,
    scope: object
  ): () => T {
    if (!isRecord(scope)) {
      throw new Error('Mockmock | Object cannot be null or or undefined');
    }

    if (typeof scope[syncMethodName] !== 'function') {
      throw new Error('Mockmock | Method does not exist on object');
    }

    const originalMethod = scope[syncMethodName];

    // wrap the original method
    const fnWrapper = <Type>(...args: Type[]): Type => {
      const result = originalMethod.call(scope, args);
      this.add(id, 'sync', result);
      return result;
    };

    // return a wrapped version of the synchronous method that records the result
    return fnWrapper;
  }

  /**
   * Record the result of calling an asynchronous method
   *
   * @param id unique ID representing the asynchronous method
   * @param asyncMethodName name of the asynchronous method
   * @param scope the scope (object) that method should be called with
   */
  private recordAsync<T>(
    id: string,
    asyncMethodName: string,
    scope: object
  ): () => Promise<T> {
    if (!isRecord(scope)) {
      throw new Error('Mockmock | Object cannot be null or or undefined');
    }

    if (typeof scope[asyncMethodName] !== 'function') {
      throw new Error('Mockmock | Method does not exist on object');
    }

    const originalMethod = scope[asyncMethodName];

    // Wrap the original method
    const fnWrapper = async <Type>(...args: Type[]): Promise<Type> => {
      const result = await originalMethod.call(scope, args);
      this.add(id, 'async', result);
      return Promise.resolve(result);
    };

    // Return a wrapped version of the async method that records the result
    return fnWrapper;
  }

  // PUBLIC

  /**
   * Get and/or set the current contextId. Returns the current contextId after setting it if called
   * with a parameter.
   *
   * @param contextId
   */
  public context(contextId?: string): string {
    // zero length strings and undefined are ignored, as are switches to the existing context
    if (contextId && contextId.length >= 0 && contextId !== this.contextId) {
      this.initContext(contextId);
    }
    return this.contextId;
  }

  /**
   * Get total amount of frames recorded under a specific ID.
   *
   * @param id the unique data id
   * @param mockTypes defaults to all possible mock types
   * @param contextIds defaults to the current context
   */
  public frameCount(
    id: string,
    mockTypes: MockTypeString[] = ['data', 'sync', 'async'],
    contextIds: string[] = [this.contextId]
  ): number {
    return count(id, this.fixture, mockTypes, contextIds);
  }

  /**
   * The primary means for recording data that can later be replayed with the replay API.
   *
   * This method has different signatures based on the type of the second paramater.
   *
   * **Note: recording data directly should be done when wrapping a method is insufficient**
   *
   * @param id the unique data id
   * @param data the data to record
   */
  public record(id: string, data: unknown): void;

  /**
   * The primary means for recording data that can later be replayed with the replay API.
   *
   * This method has different signatures based on whether or not the method parameter is asynchronous or not.
   *
   * **Note: recording a method will not call or yield the result of the wrapped method - do this from within your application's code**
   *
   * @param id unique method id
   * @param method the asynchronous method to be wrapped
   * @param scope the object used as the context for calling the wrapped method
   */
  public record<T>(
    id: string,
    method: () => Promise<T>,
    scope: object
  ): () => Promise<T>;

  /**
   * The primary means for recording data that can later be replayed with the replay API.
   *
   * This method has different signatures based on whether or not the method parameter is asynchronous or not.
   *
   * **Note: recording a method will not call or yield the result of the wrapped method - do this from within your application's code**
   *
   * @param id unique request (async method) id
   * @param method the synchronous method to be wrapped
   * @param scope the object used as the context for calling the wrapped method
   */
  public record<T>(id: string, method: () => T, scope: object): () => T;

  /**
   * See above signature definitions for hints.
   */
  public record<T>(
    id: string,
    methodOrData:
      | (() => Promise<unknown>)
      | (() => unknown)
      | Record<string, unknown>,
    scope?: object
  ): (() => T) | (() => Promise<T>) | void {
    if (typeof methodOrData !== 'function') {
      // handle recording raw data
      return this.recordData(id, methodOrData);
    } else if (methodOrData.constructor.name === 'AsyncFunction' && scope) {
      // handle asynchronous methods
      return this.recordAsync<T>(id, methodOrData.name, scope);
    } else if (methodOrData.constructor.name === 'Function' && scope) {
      // handle synchronous methods
      return this.recordSync<T>(id, methodOrData.name, scope);
    } else {
      // throw an error if the constructor name doesn't match
      throw new Error('Unspported method type or scope undefined');
    }
  }

  /**
   * The primary means of replaying mocked data captured by the recording API. Consecutive
   * calls to this method using the same unique ID will return different responses based on the
   * current test execution context. For example:
   *
   * ```
   * Mockmock.replay('uniqueId', 'requests'); // >> returns 1st matching request response tied to uniqueId
   * Mockmock.replay('uniqueId', 'requests'); // >> returns 2nd matching request response tied to uniqueId
   * ```
   */
  public replay(id: string, mockType: MockTypeString): Mock {
    if (!this || !this.isFixtureLoaded()) {
      throw new Error(`
      Mockmock | No fixture data loaded or Mockmock not yet initialized.

      To replay data you must first record some data and then load it using Mockmock.load('your-fixture')`);
    }

    const testData = this.fixture[this.contextId][mockType];
    const matches: Mock[] = testData[id];
    const index = this.trackId(id, mockType);

    if (!matches || matches.length === 0) {
      throw new Error(`
      Mockmock | No match found.

      Your test code is expecting to find "${id}" of type "${mockType}" given the context "${this.contextId}" inside ${this.fixtureName}.

      Are you sure saved data exists for the methods or requests inside the context you are trying to replay?`);
    }

    if (index >= matches.length) {
      throw new Error(`
      Mockmock | Index (${index}) out of bounds (match length: ${matches.length}).

      Your test code is expecting a sequential call that Mockmock has not recorded.`);
    }

    // this should never be the case - something is definitely wrong if the returned match is undefined
    if (typeof matches[index] === 'undefined') {
      throw new Error(`
      Mockmock | You broke me! Match is undefined. Please consider opening a bug report and telling the QA they need to fix things.
      `);
    }

    return matches[index];
  }

  /**
   * This will reset the playback tracker - useful if you want to replay the same set of mocked data within
   * a spec file after changing contexts.
   */
  public resetPlayback(): void {
    this.tracker[this.contextId] = { data: {}, sync: {}, async: {} };
  }

  /**
   * Load a specific fixture file - a fixture file must be loaded before any data can be replayed.
   *
   * @param directory the path containing the fixture file
   * @param name the name of the fixture (without the trailing `.fixture.json`)
   * @param contextId an optional contextId to switch to, uses current context otherwise
   */
  public async load(name: string, contextId = this.contextId): Promise<void> {
    this.isBusy = true;
    // don't load the same fixture twice
    if (this.fixtureName !== name) {
      console.log(
        `Mockmock | Loading fixture: ${this.fixturePath}${name}.fixture.json`
      );
      const path = `${this.fixturePath}${name}.fixture.json`;
      const fixtureData = await loadFixtureData(path);
      this.fixture = fixtureData;
      this.fixtureName = name;
    }

    this.context(contextId);
    this.isBusy = false;
  }

  /**
   * Write all recorded method results and request responses to a fixture file.
   *
   * **Note: do not include the file extension, it will be saved as a `.fixture.json` file**
   *
   * **Note: saved mock data is stringified as JSON when saving, be careful of data loss (i.e. undefined values)**
   */
  public async save(name: string) {
    this.isBusy = true;
    const path = `${this.fixturePath}${name}.fixture.json`;
    const stringData = JSON.stringify(this.recording, null, 2);
    await writeData(path, stringData);

    this.isBusy = false;
  }

  /**
   * Greedily search previously saved data for a matching request or method {@link Mock}.
   * Each additional {@link Matcher} is treated as an additional search term.
   *
   * **Note: a positive match must contain all of the given terms**.
   *
   * Each individual term (Matcher) can occur **at any level of nesting within the serachable data.**
   *
   * @param matchers an array of Matchers that will be used as search terms
   * @param mockTypes an optional array of the types of results to search (`requests`, `methods`, or both)
   * @param context an array of contexts to search, defaults to an array with the current context only
   */
  public search(
    matchers: Matcher[],
    mockTypes: MockTypeString[] = ['data', 'sync', 'async'],
    contextIds: string[] = [this.contextId]
  ): Mock {
    if (!this.isFixtureLoaded()) {
      throw new Error(`
      Mockmock | The search API cannot be used before loading a fixture!

      Please load a fixture first and wait until Mockmock is ready.`);
    }
    return search(matchers, this.fixture, mockTypes, contextIds);
  }

  /**
   * Recursively match an array of {@link StubMatcher}s against an object, stubbing any matches with the
   * stub value. A {@link StubMatcher} may optionally specify Matcher.types to match against.
   *
   * Consider the following complex object:
   *
   * ```
   * const obj = { a: 'baz', b: 'bar', c: { b: true }, d: [{ b: 100 }], e: undefined };
   * ```
   *
   * The first example passes an array containing a single Matcher to the stub method. The matcher finds all matching keys and, regardless of the type or value, replaces it, resulting in:
   *
   * ```
   * const matcher = { stub: 'apple', keys: ['b'] };
   * Mockmock.stub(obj, [matcher]);
   * // results in
   * { a: 'baz', b: 'apple', c: { b: 'apple'}, d: [{ b: 'apple' }], e: undefined }
   * ```
   *
   * The second example passes an array of two Matchers to the stub method, with the first Matcher also specifying types to match against, while the second matcher replaces all undefined property values with the value `null`, resulting in:
   *
   * ```
   * const matchOne = { stub: 'lemon', keys: ['b'], types: ['string', 'number'] };
   * const matchTwo = { stub: null, values: [undefined] };
   * Mockmock.stub(obj, [matchOne, matchTwo]);
   * // results in
   * { a: 'baz', b: 'lemon', c: { b: true }, d: [{ b: 'lemon' }], e: null }
   * ```
   *
   * In the second example we also see that the types were checked against, which is why the boolean value of the `c['b']` key persisted.
   */
  public stub(matchers: StubMatcher[], obj: unknown) {
    if (!isRecord(obj)) {
      throw new Error(`
      Mockmock | Object to stub cannot be null or undefined`);
    }

    return stub(matchers, obj);
  }
}

export { Mockmock };
