import { createInitialState, fromEntries } from '../src/utils';
import { Keyof } from '../src/domain';
import { InternalState } from '../src/internal-domain';

type TestShape = { test1: string; test2: string; test3: string };

describe('utils', () => {
  describe('fromEntries', () => {
    it('should create an object', () => {
      const result = fromEntries(Object.entries({ test: '123' }));
      expect(result).toEqual({ test: '123' });
    });
  });

  describe('createInitialState', () => {
    it('should create initial state', () => {
      const keys: Array<Keyof<TestShape>> = ['test1', 'test2', 'test3'];
      const validation = {
        test1: () => undefined,
        test2: () => 'Error',
        test3: () => undefined
      };
      const initialValues = {
        test1: '',
        test2: '',
        test3: 'value'
      };
      const state: InternalState<TestShape> = createInitialState<TestShape>(
        keys,
        validation,
        initialValues
      )();

      expect(Object.keys(state.fields)).toEqual(keys);
      expect(state.fields.test1.error).toBeUndefined();
      expect(state.fields.test1.pristine).toBe(true);
      expect(state.fields.test1.touched).toBe(false);
      expect(state.fields.test2.error).toBe('Error');
      expect(state.fields.test3.value).toBe('value');
      expect(state.fields.test3.initialValue).toBe('value');
    });
  });
});
