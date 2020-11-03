import { createInitialState, fromEntries, mapToValidationFunction } from '../src/internal-utils';
import { FunctionValidator, Keyof, Validation } from '../src/domain';
import { InternalState } from '../src/internal-domain';

type TestShape = { test1: string; test2: string; test3: string };

describe('internal-utils', () => {
  describe('fromEntries', () => {
    it('should create an object', () => {
      const result = fromEntries(Object.entries({ test: '123' }));
      expect(result).toEqual({ test: '123' });
    });
  });

  describe('createInitialState', () => {
    it('should create initial state', () => {
      const keys: Array<Keyof<TestShape>> = ['test1', 'test2', 'test3'];
      const validation: FunctionValidator<TestShape> = () => ({
        test1: undefined,
        test2: 'Error',
        test3: undefined
      });
      const initialValues = {
        test1: '',
        test2: '',
        test3: 'value'
      };
      const state: InternalState<TestShape> = createInitialState<TestShape>(
        keys,
        validation,
        initialValues,
        {}
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

  describe('mapToValidationFunction', () => {
    it('should handle object format', () => {
      const keys: Array<Keyof<TestShape>> = ['test1', 'test2', 'test3'];
      const validation: Validation<TestShape> = {
        test1: () => undefined,
        test2: value => (value === 'ok' ? undefined : 'Error'),
        test3: value => (value.length > 5 ? 'Too long' : undefined)
      };
      const validator = mapToValidationFunction<TestShape>(keys, validation);
      const result = validator({ test1: '', test2: 'ok', test3: '123456' }, {});

      expect(result.test1).toBeUndefined();
      expect(result.test2).toBeUndefined();
      expect(result.test3).toBe('Too long');
    });
  });
});
