import { createInitialState, fromEntries, mapToValidationFunction } from './internal-utils';
import {
  Errors,
  FieldState,
  Formstate,
  FunctionValidator,
  InitialValues,
  Keyof,
  Mapped,
  SubmitHandler,
  SubmitHandlerOptions,
  Validation,
  Values
} from './domain';
import { useImmer } from 'use-immer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InternalState } from './internal-domain';
import { Draft } from 'immer';

export * from './domain';
export * from './utils';

function useIsMounted() {
  const isMounted = useRef(false);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, [isMounted]);

  return isMounted;
}

function getValues<S extends { [key: string]: string }>(
  state: Draft<InternalState<S>> | InternalState<S>
): Values<S> {
  return fromEntries(Object.entries(state.fields).map(([key, field]) => [key, field.value]));
}

function uid() {
  return 'xxxxxx-xxxxxx-xxxxxx-xxxxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16));
}

export function useFormstateInternal<
  S extends { [key: string]: string },
  P extends { [key: string]: any }
>(
  keys: Array<Keyof<S>>,
  validation: FunctionValidator<S, P>,
  initialValues: InitialValues<S>,
  props: P
): Formstate<S> {
  const isMounted = useIsMounted();
  const [submitting, setSubmitting] = useState(false);
  const [submittingFailed, setSubmittingFailed] = useState(false);
  const [submittingSuccess, setSubmittingSuccess] = useState(false);
  const [state, updateState] = useImmer(createInitialState(keys, validation, initialValues, props));
  const [submittoken, setSubmittoken] = useState<string | undefined>(undefined);

  const setValue = useCallback(
    (name: string, value: string) => {
      updateState(draft => {
        const initialValue = draft.fields[name].initialValue;

        draft.fields[name].pristine = initialValue === value;
        draft.fields[name].value = value;
        const values = getValues(draft);
        const errors = validation(values, props);
        const formHasError = Object.keys(draft.fields).some(error => error);

        Object.keys(draft.fields).forEach(key => {
          draft.fields[key].error = errors[key];
        });

        if (!formHasError) {
          setSubmittoken(undefined);
        }
      });
    },
    [updateState, validation, props]
  );

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const name = event.target.name;
      const value = event.target.value;
      setValue(name, value);
    },
    [setValue]
  );

  const onBlur = useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      const name = event.target.name;
      updateState(draft => {
        draft.fields[name].touched = true;
      });
    },
    [updateState]
  );

  const fieldsArray: Array<[Keyof<S>, FieldState]> = useMemo(
    () =>
      Object.entries(state.fields).map(([key, field]) => {
        const setFieldValue = (value: string) => setValue(key, value);
        const fieldstate = {
          pristine: field.pristine,
          touched: field.touched,
          initialValue: field.initialValue,
          error: field.error,
          setValue: setFieldValue,
          input: {
            id: key,
            name: key,
            value: field.value,
            onChange,
            onBlur
          }
        };
        return [key, fieldstate];
      }),
    [state.fields, onChange, onBlur, setValue]
  );

  const errorsArray: Array<[Keyof<S>, string]> = useMemo(
    () =>
      fieldsArray
        .filter(([key, field]) => field.error !== undefined)
        .map(([key, field]) => [key, field.error!]),
    [fieldsArray]
  );

  const values = getValues(state);
  const pristine = fieldsArray.every(([key, field]) => field.pristine);
  const errors: Errors<S> = useMemo(() => fromEntries(errorsArray), [errorsArray]);
  const fields: Mapped<S, FieldState> = useMemo(() => fromEntries(fieldsArray), [fieldsArray]);
  const onSubmit = useCallback(
    (fn: SubmitHandler<S>, options?: SubmitHandlerOptions) => (event: React.FormEvent) => {
      event.preventDefault();
      if (options && options.preventConcurrent && submitting) {
        return;
      }
      updateState(draft => {
        Object.keys(draft.fields).forEach(field => (draft.fields[field].touched = true));
      });

      if (errorsArray.length === 0) {
        setSubmitting(true);
        const submitOkHandler = () => {
          if (isMounted.current) {
            setSubmitting(false);
            setSubmittingFailed(false);
            setSubmittingSuccess(true);
          }
        };
        const submitErrorHandler = () => {
          if (isMounted.current) {
            setSubmitting(false);
            setSubmittingFailed(true);
            setSubmittingSuccess(false);
          }
        };
        fn(values).then(submitOkHandler, submitErrorHandler);
      } else {
        setSubmittoken(uid());
      }
    },
    [errorsArray, setSubmitting, updateState, values]
  );

  const reinitialize = useCallback(
    (newInitialValues: InitialValues<S>) => {
      const errors = validation(newInitialValues, props);
      updateState(draft => {
        Object.entries(draft.fields).forEach(([name, field]) => {
          field.initialValue = newInitialValues[name];
          field.value = newInitialValues[name];
          field.pristine = true;
          field.error = errors[name];
          field.touched = false;
        });
      });
    },
    [updateState, props]
  );

  useEffect(() => {
    updateState(draft => {
      const values = getValues(draft);
      const errors = validation(values, props);
      Object.entries(draft.fields).forEach(([name, field]) => {
        field.error = errors[name];
      });
    });
  }, [updateState, props]);

  return useMemo(
    () => ({
      submitting,
      submittingFailed,
      submittingSuccess,
      valid: errorsArray.length === 0,
      pristine,
      submittoken,
      errors,
      fields,
      onSubmit,
      reinitialize,
      setValue
    }),
    [
      submitting,
      submittingFailed,
      submittingSuccess,
      errorsArray,
      pristine,
      submittoken,
      errors,
      fields,
      onSubmit,
      reinitialize,
      setValue
    ]
  );
}

const defaultPropsValue = {};
export default function useFormstate<
  S extends { [key: string]: string },
  P extends { [key: string]: any } = {}
>(
  validation: Validation<S, P>
): {} extends P
  ? (initialValues: Mapped<S, string>) => Formstate<S>
  : (initialValues: Mapped<S, string>, props: P) => Formstate<S>;

export default function useFormstate<
  S extends { [key: string]: string },
  P extends { [key: string]: any } = {}
>(validation: Validation<S, P>) {
  if (typeof validation === 'function') {
    return (initialValues: InitialValues<S>, props: P): Formstate<S> => {
      const keys: Array<Keyof<S>> = Object.keys(initialValues) as Array<Keyof<S>>;
      return useFormstateInternal(
        keys,
        validation,
        initialValues,
        props || (defaultPropsValue as P)
      );
    };
  } else {
    const keys: Array<Keyof<S>> = Object.keys(validation) as Array<Keyof<S>>;
    const internalValidation = mapToValidationFunction(keys, validation);
    return (initialValues: InitialValues<S>, props: P): Formstate<S> =>
      useFormstateInternal(
        keys,
        internalValidation,
        initialValues,
        props || (defaultPropsValue as P)
      );
  }
}
