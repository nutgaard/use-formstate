import { createInitialState, fromEntries } from './utils';
import {
  Errors,
  FieldState,
  Formstate,
  InitialValues,
  Keyof,
  Mapped,
  SubmitHandler,
  Validation,
  Values
} from './domain';
import { useImmer } from 'use-immer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InternalState } from './internal-domain';
import { Draft } from 'immer';

export * from './domain';

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

function getValues<S extends { [key: string]: any }>(
  state: Draft<InternalState<S>> | InternalState<S>
): Values<S> {
  return fromEntries(Object.entries(state.fields).map(([key, field]) => [key, field.value]));
}

export function useFormstateInternal<S extends { [key: string]: any }>(
  keys: Array<Keyof<S>>,
  validation: Validation<S>,
  initialValues: InitialValues<S>
): Formstate<S> {
  const isMounted = useIsMounted();
  const [submitting, setSubmitting] = useState(false);
  const [state, updateState] = useImmer(createInitialState(keys, validation, initialValues));
  const [submittoken, setSubmittoken] = useState(true);

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const name = event.target.name;
      const value = event.target.value;
      updateState(draft => {
        const initialValue = draft.fields[name].initialValue;

        draft.fields[name].pristine = initialValue === value;
        draft.fields[name].value = value;
        const values = getValues(draft);
        const formHasError = Object.keys(draft.fields)
          .map(key => {
            const error = validation[key](draft.fields[key].value, values);
            draft.fields[key].error = error;
            return !!error;
          })
          .some(error => error);

        if (!formHasError) {
          setSubmittoken(true);
        }
      });
    },
    [updateState, validation]
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
        const fieldstate = {
          pristine: field.pristine,
          touched: field.touched,
          initialValue: field.initialValue,
          error: field.error,
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
    [state.fields, onChange, onBlur]
  );

  const errorsArray: Array<[Keyof<S>, string]> = useMemo(
    () =>
      fieldsArray.filter(([key, field]) => field.error).map(([key, field]) => [key, field.error!]),
    [fieldsArray]
  );

  const values = getValues(state);
  const pristine = fieldsArray.every(([key, field]) => field.pristine);
  const errors: Errors<S> = useMemo(() => fromEntries(errorsArray), [errorsArray]);
  const fields: Mapped<S, FieldState> = useMemo(() => fromEntries(fieldsArray), [fieldsArray]);
  const onSubmit = useCallback(
    (fn: SubmitHandler<S>) => (event: React.FormEvent) => {
      event.preventDefault();
      updateState(draft => {
        Object.keys(draft.fields).forEach(field => (draft.fields[field].touched = true));
      });

      if (errorsArray.length === 0) {
        setSubmitting(true);
        const submitDoneHandler = () => {
          if (isMounted.current) {
            setSubmitting(false);
          }
        };
        fn(values).then(submitDoneHandler, submitDoneHandler);
      } else {
        setSubmittoken(false);
      }
    },
    [errorsArray, setSubmitting, updateState, values]
  );

  return useMemo(
    () => ({
      submitting,
      valid: errorsArray.length === 0,
      pristine,
      submittoken,
      errors,
      fields,
      onSubmit
    }),
    [submitting, errorsArray, pristine, submittoken, errors, fields, onSubmit]
  );
}

export default function useFormstate<S extends { [key: string]: any }>(validation: Validation<S>) {
  const keys: Array<Keyof<S>> = Object.keys(validation) as Array<Keyof<S>>;
  // eslint-disable-next-line
  return (initialValues: InitialValues<S>): Formstate<S> =>
    useFormstateInternal(keys, validation, initialValues);
}
