import * as React from 'react';

export type Mapped<S, T> = { [P in keyof S]: T };
export type Keyof<S> = string & keyof S;

export type Validator<T> = (value: string, values: Values<T>) => string | undefined;
export type Validation<S> = Mapped<S, Validator<S>>;
export type Values<S> = Mapped<S, string>;
export type InitialValues<S> = Mapped<S, string>;
export type Errors<S> = Mapped<S, string>;
export type SubmitHandler<S> = (values: Values<S>) => Promise<any>;

export type FieldState = {
  pristine: boolean;
  touched: boolean;
  initialValue: string;
  error?: string;
  input: {
    value: string;
    onChange: React.ChangeEventHandler;
    onBlur: React.FocusEventHandler;
  };
};

export type Formstate<T> = {
  submitting: boolean;
  pristine: boolean;
  valid: boolean;
  submittoken?: string;
  errors: Errors<T>;
  fields: Mapped<T, FieldState>;
  onSubmit(fn: SubmitHandler<T>): React.FormEventHandler;
  reinitialize(initialValues: InitialValues<T>): void;
};
