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
    const valid = Object.values(state.fields).every(field => !field.error);
    const [beenValidSinceSubmit, setBeenValidSinceSubmit] = useState(valid);

    const createFormstate: () => Formstate<S> = () => {
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

      const fieldsArray: Array<[Keyof<S>, FieldState]> = Object.entries(state.fields).map(
        ([key, field]) => {
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
        }
      );

      const errorsArray: Array<[Keyof<S>, string]> = fieldsArray
        .filter(([key, field]) => field.error)
        .map(([key, field]) => [key, field.error!]);
      const valid = errorsArray.length === 0;
      if (valid) {
        setBeenValidSinceSubmit(true);
      }
      const pristine = fieldsArray.every(([key, field]) => field.pristine);
      const errors: Errors<S> = fromEntries(errorsArray);
      const fields: Mapped<S, FieldState> = fromEntries(fieldsArray);
      const onSubmit = (fn: SubmitHandler<S>) => (event: React.FormEvent) => {
        event.preventDefault();
        if (errorsArray.length === 0) {
          setSubmitting(true);
          fn(values).then(() => setSubmitting(false), () => setSubmitting(false));
        } else {
          setBeenValidSinceSubmit(false);
        }
      };

      return {
        submitting,
        valid,
        pristine,
        beenValidSinceSubmit,
        errors,
        fields,
        onSubmit
      };
    };

    return useMemo(() => createFormstate(), [
      submitting,
      setSubmitting,
      state,
      updateState,
      beenValidSinceSubmit,
      setBeenValidSinceSubmit
    ]);
  };
}
