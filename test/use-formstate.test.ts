import { act, renderHook } from '@testing-library/react-hooks';
import useFormstate, { Validation } from '../src/use-formstate';
import { ChangeEvent, FocusEvent, FormEvent } from 'react';

type TestShape = { test1: string; test2: string; test3: string };
type PropsShape = { minedata: number };
const validation: Validation<TestShape> = {
  test1: value => (value === 'empty-error' ? '' : undefined),
  test2: value => (value === 'ok' ? undefined : 'Error'),
  test3: value => (value.length > 5 ? 'Too long' : undefined)
};
const initialValues = {
  test1: '',
  test2: '',
  test3: 'value'
};

function changeEvent(name: string, value: string): ChangeEvent {
  return ({ target: { value, name } } as unknown) as ChangeEvent;
}

function focusEvent(name: string): FocusEvent {
  return ({ target: { name } } as unknown) as FocusEvent;
}
function submitEvent(): FormEvent {
  return ({
    preventDefault() {
      return;
    }
  } as unknown) as FormEvent;
}

describe('use-formstate', () => {
  const hook = useFormstate<TestShape>(validation);

  it('should return state object', () => {
    const state = renderHook(() => hook(initialValues)).result.current;

    expect(Object.keys(state.fields)).toEqual(Object.keys(validation));
    expect(state.valid).toBe(false);
    expect(state.pristine).toBe(true);
    expect(state.submittoken).toBeUndefined();
    expect(state.submitting).toBe(false);
    expect(state.errors).toEqual({ test2: 'Error' });
    expect(state.onSubmit).not.toBeUndefined();
  });

  it('should not treat empty-strings as non-errors', () => {
    const state = renderHook(() => hook({ ...initialValues, test1: 'empty-error' })).result.current;

    expect(state.errors).toEqual({ test1: '', test2: 'Error' });
  });

  it('should return state object if used with function-validator', () => {
    const functionHook = useFormstate<TestShape>((values, props) => ({
      test1: undefined,
      test2: undefined,
      test3: undefined
    }));
    const state = renderHook(() => functionHook(initialValues)).result.current;
    expect(Object.keys(state.fields)).toEqual(Object.keys(validation));
  });

  it('onChange should update value and errors', done => {
    const hookResult = renderHook(() => hook(initialValues));
    const state = hookResult.result.current;

    act(() => {
      state.fields.test3.input.onChange(changeEvent('test3', '123456'));
      hookResult.waitForNextUpdate().then(() => {
        expect(hookResult.result.current.fields.test3.initialValue).toBe('value');
        expect(hookResult.result.current.fields.test3.input.value).toBe('123456');
        expect(hookResult.result.current.fields.test3.error).toBe('Too long');
        expect(hookResult.result.current.fields.test3.pristine).toBe(false);
        expect(hookResult.result.current.fields.test3.touched).toBe(false);
        expect(hookResult.result.current.errors).toEqual({ test2: 'Error', test3: 'Too long' });
        done();
      });
    });
  });

  it('onChange should update value used by validation', done => {
    const spy = jest.fn();
    const hook = useFormstate<TestShape>({
      test1: spy,
      test2: jest.fn(),
      test3: jest.fn()
    });
    const hookResult = renderHook(() => hook(initialValues));
    const state = hookResult.result.current;

    act(() => {
      state.fields.test3.input.onChange(changeEvent('test3', '123456'));
      state.fields.test3.input.onChange(changeEvent('test2', '123456'));
      hookResult.waitForNextUpdate().then(() => {
        expect(hookResult.result.current.fields.test3.initialValue).toBe('value');
        expect(hookResult.result.current.fields.test3.input.value).toBe('123456');
        expect(hookResult.result.current.fields.test2.input.value).toBe('123456');
        expect(hookResult.result.current.fields.test3.pristine).toBe(false);
        expect(hookResult.result.current.fields.test3.touched).toBe(false);

        expect(spy).toHaveBeenCalledTimes(4);
        expect(spy).toHaveBeenNthCalledWith(1, '', initialValues, {});
        expect(spy).toHaveBeenNthCalledWith(2, '', initialValues, {});
        expect(spy).toHaveBeenNthCalledWith(3, '', { test1: '', test2: '', test3: '123456' }, {});
        expect(spy).toHaveBeenNthCalledWith(
          4,
          '',
          { test1: '', test2: '123456', test3: '123456' },
          {}
        );
        done();
      });
    });
  });

  it('onBlur should update pristine', done => {
    const hookResult = renderHook(() => hook(initialValues));
    const state = hookResult.result.current;

    act(() => {
      state.fields.test3.input.onBlur(focusEvent('test3'));
      hookResult.waitForNextUpdate().then(() => {
        expect(hookResult.result.current.fields.test3.initialValue).toBe('value');
        expect(hookResult.result.current.fields.test3.input.value).toBe('value');
        expect(hookResult.result.current.fields.test3.error).toBeUndefined();
        expect(hookResult.result.current.fields.test3.pristine).toBe(true);
        expect(hookResult.result.current.fields.test3.touched).toBe(true);
        expect(hookResult.result.current.errors).toEqual({ test2: 'Error' });
        done();
      });
    });
  });

  it('onSubmit should prevent calls submitter-fn if form is invalid', done => {
    const hookResult = renderHook(() => hook(initialValues));
    const state = hookResult.result.current;

    act(() => {
      const submitter = jest.fn();
      expect(Object.keys(state.errors)).toHaveLength(1);
      state.onSubmit(submitter)(submitEvent());
      hookResult.waitForNextUpdate().then(() => {
        expect(hookResult.result.current.submittoken).not.toBeUndefined();
        expect(hookResult.result.current.valid).toBe(false);
        expect(submitter).toBeCalledTimes(0);
        done();
      });
    });
  });

  it('onSubmit should only call submitter-fn if form is valid', done => {
    const submitter = jest.fn(() => Promise.resolve());
    const hookResult = renderHook(() => hook(initialValues));
    const state = hookResult.result.current;

    act(() => state.fields.test2.input.onChange(changeEvent('test2', 'ok')));

    expect(hookResult.result.current.fields.test2.input.value).toBe('ok');
    expect(hookResult.result.current.fields.test2.error).toBeUndefined();

    act(() => hookResult.result.current.onSubmit(submitter)(submitEvent()));

    expect(hookResult.result.current.errors).toEqual({});
    expect(hookResult.result.current.submitting).toBe(true);
    expect(hookResult.result.current.submittingFailed).toBe(false);
    expect(hookResult.result.current.submittingSuccess).toBe(false);
    expect(hookResult.result.current.valid).toBe(true);
    expect(hookResult.result.current.submittoken).toBeUndefined();
    expect(submitter).toBeCalledTimes(1);
    expect(submitter).toHaveBeenCalledWith({ test1: '', test2: 'ok', test3: 'value' });

    setTimeout(() => {
      expect(hookResult.result.current.submitting).toBe(false);
      expect(hookResult.result.current.submittingFailed).toBe(false);
      expect(hookResult.result.current.submittingSuccess).toBe(true);
      done();
    }, 0);
  });

  it('onSubmit should set submittingFailed if returned promise is rejected', done => {
    const submitter = jest.fn(() => Promise.reject());
    const hookResult = renderHook(() => hook(initialValues));
    const state = hookResult.result.current;

    act(() => state.fields.test2.input.onChange(changeEvent('test2', 'ok')));
    act(() => hookResult.result.current.onSubmit(submitter)(submitEvent()));

    expect(hookResult.result.current.submitting).toBe(true);
    expect(hookResult.result.current.submittingFailed).toBe(false);
    expect(hookResult.result.current.submittingSuccess).toBe(false);
    setTimeout(() => {
      expect(hookResult.result.current.submitting).toBe(false);
      expect(hookResult.result.current.submittingFailed).toBe(true);
      expect(hookResult.result.current.submittingSuccess).toBe(false);
      done();
    }, 0);
  });

  it('onSubmit should honor the preventConcurrent-option and prevent concurrent submits', done => {
    const submitter = jest.fn(() => new Promise(resolve => setTimeout(resolve, 200)));
    const hookResult = renderHook(() => hook(initialValues));
    const state = hookResult.result.current;

    act(() => state.fields.test2.input.onChange(changeEvent('test2', 'ok')));
    act(() =>
      hookResult.result.current.onSubmit(submitter, { preventConcurrent: true })(submitEvent())
    );
    act(() =>
      hookResult.result.current.onSubmit(submitter, { preventConcurrent: true })(submitEvent())
    );

    setTimeout(() => {
      // This is called after the first submition is done (200ms).
      act(() =>
        hookResult.result.current.onSubmit(submitter, { preventConcurrent: true })(submitEvent())
      );
      expect(submitter).toBeCalledTimes(2);
      expect(submitter).toHaveBeenCalledWith({ test1: '', test2: 'ok', test3: 'value' });
      done();
    }, 300);
  });

  describe('onSubmit should not update state if component is unmounted', () => {
    it('should not update when submit is successful', () => {
      const submitter = jest.fn(() => Promise.resolve());
      const hookResult = renderHook(() => hook(initialValues));
      const state = hookResult.result.current;

      act(() => state.fields.test2.input.onChange(changeEvent('test2', 'ok')));

      expect(hookResult.result.current.fields.test2.input.value).toBe('ok');
      expect(hookResult.result.current.fields.test2.error).toBeUndefined();

      act(() => hookResult.result.current.onSubmit(submitter)(submitEvent()));
      hookResult.unmount();

      expect(hookResult.result.current.errors).toEqual({});
      expect(hookResult.result.current.submitting).toBe(true);
      expect(hookResult.result.current.valid).toBe(true);
      expect(submitter).toBeCalledTimes(1);
    });

    it('should not update when submitting fails', () => {
      const submitter = jest.fn(() => Promise.reject());
      const hookResult = renderHook(() => hook(initialValues));
      const state = hookResult.result.current;

      act(() => state.fields.test2.input.onChange(changeEvent('test2', 'ok')));

      expect(hookResult.result.current.fields.test2.input.value).toBe('ok');
      expect(hookResult.result.current.fields.test2.error).toBeUndefined();

      act(() => hookResult.result.current.onSubmit(submitter)(submitEvent()));
      hookResult.unmount();

      expect(hookResult.result.current.errors).toEqual({});
      expect(hookResult.result.current.submitting).toBe(true);
      expect(hookResult.result.current.valid).toBe(true);
      expect(submitter).toBeCalledTimes(1);
    });
  });

  it('should be able to reinitialize', done => {
    const hookResult = renderHook(() => hook(initialValues));

    act(() => {
      hookResult.result.current.fields.test1.input.onChange(changeEvent('test1', 'ok'));
      hookResult.result.current.fields.test1.input.onBlur(focusEvent('test1'));

      hookResult.result.current.reinitialize({
        test1: 'new 1',
        test2: 'new 2',
        test3: 'new 3'
      });

      hookResult.waitForNextUpdate().then(() => {
        expect(hookResult.result.current.fields.test1.input.value).toBe('new 1');
        expect(hookResult.result.current.fields.test1.initialValue).toBe('new 1');
        expect(hookResult.result.current.fields.test2.input.value).toBe('new 2');
        expect(hookResult.result.current.fields.test2.initialValue).toBe('new 2');
        expect(hookResult.result.current.fields.test3.input.value).toBe('new 3');
        expect(hookResult.result.current.fields.test3.initialValue).toBe('new 3');

        expect(hookResult.result.current.fields.test1.touched).toBe(false);
        expect(hookResult.result.current.fields.test1.pristine).toBe(true);
        expect(hookResult.result.current.fields.test1.error).toBeUndefined();

        expect(hookResult.result.current.fields.test2.error).toBe('Error');

        done();
      });
    });
  });

  it('should pass props to validator functions', () => {
    const spy = jest.fn();
    const hook = useFormstate<TestShape, PropsShape>({
      test1: spy,
      test2: jest.fn(),
      test3: jest.fn()
    });
    const props = { minedata: 123 };
    renderHook(() => hook(initialValues, props));

    expect(spy).toHaveBeenCalledWith('', initialValues, props);
  });
});
