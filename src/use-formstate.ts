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

export default function useFormstate<S extends { [key: string]: any }>(validation: Validation<S>) {
  const keys: Array<Keyof<S>> = Object.keys(validation) as Array<Keyof<S>>;
  return (initialValues: InitialValues<S>): Formstate<S> => {
    const [submitting, setSubmitting] = useState(false);
    const [state, updateState] = useImmer(createInitialState(keys, validation, initialValues));
    const initialValid = Object.values(state.fields).every(field => !field.error);
    const [beenValidSinceSubmit, setBeenValidSinceSubmit] = useState(initialValid);

    const values: Values<S> = useMemo(
      () => fromEntries(Object.entries(state.fields).map(([key, field]) => [key, field.value])),
      [state.fields]
    );

    const onChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        updateState(draft => {
          const value = event.target.value;
          const oldValue = draft.fields[event.target.name].value;

          draft.fields[event.target.name].pristine = oldValue === value;
          draft.fields[event.target.name].value = value;
          Object.keys(draft.fields).map(key => {
            draft.fields[key].error = validation[key](draft.fields[key].value, values);
          });
        });
      },
      [updateState, validation, values]
    );

    const onBlur = useCallback(
      (event: React.FocusEvent<HTMLInputElement>) => {
        updateState(draft => {
          const name = event.target.name;
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
        fieldsArray
          .filter(([key, field]) => field.error)
          .map(([key, field]) => [key, field.error!]),
      [fieldsArray]
    );
    if (errorsArray.length === 0) {
      setBeenValidSinceSubmit(true);
    }
    const pristine = fieldsArray.every(([key, field]) => field.pristine);
    const errors: Errors<S> = useMemo(() => fromEntries(errorsArray), [errorsArray]);
    const fields: Mapped<S, FieldState> = useMemo(() => fromEntries(fieldsArray), [fieldsArray]);
    const onSubmit = useCallback(
      (fn: SubmitHandler<S>) => (event: React.FormEvent) => {
        event.preventDefault();
        if (errorsArray.length === 0) {
          setSubmitting(true);
          fn(values).then(() => setSubmitting(false), () => setSubmitting(false));
        } else {
          setBeenValidSinceSubmit(false);
        }
      },
      [errorsArray, setSubmitting, values]
    );

    return useMemo(
      () => ({
        submitting,
        valid: errorsArray.length === 0,
        pristine,
        beenValidSinceSubmit,
        errors,
        fields,
        onSubmit
      }),
      [submitting, errorsArray, pristine, beenValidSinceSubmit, errors, fieldsArray, onSubmit]
    );
  };
}
