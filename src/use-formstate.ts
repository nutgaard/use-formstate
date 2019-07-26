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
import { useCallback, useMemo, useState } from 'react';

export * from './domain';

export function useFormstateInternal<S extends { [key: string]: any }>(
  keys: Array<Keyof<S>>,
  validation: Validation<S>,
  initialValues: InitialValues<S>
): Formstate<S> {
  const [submitting, setSubmitting] = useState(false);
  const [state, updateState] = useImmer(createInitialState(keys, validation, initialValues));
  const [submittoken, setSubmittoken] = useState(true);

  const values: Values<S> = useMemo(
    () => fromEntries(Object.entries(state.fields).map(([key, field]) => [key, field.value])),
    [state.fields]
  );

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const name = event.target.name;
      const value = event.target.value;
      updateState(draft => {
        const oldValue = draft.fields[name].value;

        draft.fields[name].pristine = oldValue === value;
        draft.fields[name].value = value;
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
    [updateState, validation, values]
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
        fn(values).then(() => setSubmitting(false), () => setSubmitting(false));
      } else {
        setSubmittoken(false);
      }
    },
    [errorsArray, setSubmitting, values, updateState]
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
