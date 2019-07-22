import { Mapped } from './domain'

export type InternalFieldState = {
  pristine: boolean
  touched: boolean
  initialValue: string
  error?: string
  value: string
}

export type InternalState<S> = {
  fields: Mapped<S, InternalFieldState>
}
