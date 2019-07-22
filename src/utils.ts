import { InitialValues, Keyof, Mapped, Validation } from './domain'
import { InternalFieldState, InternalState } from './internal-domain'

export function fromEntries<SHAPE, DATA>(data: Array<[Keyof<SHAPE>, DATA]>): Mapped<SHAPE, DATA> {
  return data.reduce(
    (acc, [key, value]) => {
      acc[key] = value
      return acc
    },
    {} as Mapped<SHAPE, DATA>
  )
}

export function createInitialState<S>(
  keys: Array<Keyof<S>>,
  validation: Validation<S>,
  initialValues: InitialValues<S>
): () => InternalState<S> {
  return () => {
    const fields: Mapped<S, InternalFieldState> = fromEntries(
      keys.map((key: Keyof<S>) => {
        const field: InternalFieldState = {
          pristine: true,
          touched: false,
          initialValue: initialValues[key],
          error: validation[key](initialValues[key], initialValues),
          value: initialValues[key]
        }

        return [key, field]
      })
    )

    return { fields }
  }
}
