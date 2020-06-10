import { FunctionValidator, InitialValues, Keyof, Mapped, Validation, Values } from './domain';
import { InternalFieldState, InternalState } from './internal-domain';

export function fromEntries<SHAPE, DATA>(data: Array<[Keyof<SHAPE>, DATA]>): Mapped<SHAPE, DATA> {
  return data.reduce(
    (acc, [key, value]) => {
      acc[key] = value;
      return acc;
    },
    {} as Mapped<SHAPE, DATA>
  );
}

export function createInitialState<S, P = {}>(
  keys: Array<Keyof<S>>,
  validation: FunctionValidator<S, P>,
  initialValues: InitialValues<S>,
  props: P
): () => InternalState<S> {
  return () => {
    const errors = validation(initialValues, props);
    const fields: Mapped<S, InternalFieldState> = fromEntries(
      keys.map((key: Keyof<S>) => {
        const field: InternalFieldState = {
          pristine: true,
          touched: false,
          initialValue: initialValues[key],
          error: errors[key],
          value: initialValues[key]
        };

        return [key, field];
      })
    );

    return { fields };
  };
}

export function mapToValidationFunction<
  S extends { [key: string]: any },
  P extends { [key: string]: any } = {}
>(keys: Array<Keyof<S>>, validation: Validation<S, P>): FunctionValidator<S, P> {
  if (typeof validation === 'function') {
    return validation;
  } else {
    return (values: Values<S>, props: P) => {
      return fromEntries(
        keys.map((key: Keyof<S>) => {
          const value = values[key];
          const error = validation[key](value, values, props);
          return [key, error];
        })
      );
    };
  }
}
