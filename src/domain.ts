import * as React from 'react';

export type Mapped<S, T> = { [P in keyof S]: T };
export type Keyof<S> = string & keyof S;

export type Validator<T, P = {}> = (
  value: string,
  values: Values<T>,
  props: P
) => string | undefined;
export type FunctionValidator<S, P = {}> = (
  values: Values<S>,
  props: P
) => Mapped<S, string | undefined>;
export type ObjectValidator<S, P = {}> = Mapped<S, Validator<S, P>>;
export type Validation<S, P = {}> = ObjectValidator<S, P> | FunctionValidator<S, P>;
export type Values<S> = Mapped<S, string>;
export type InitialValues<S> = Mapped<S, string>;
export type Errors<S> = Mapped<S, string>;
export type SubmitHandler<S> = (values: Values<S>) => Promise<any>;

export type FieldInputProps = {
  id: string;
  name: string;
  value: string;
  onChange: React.ChangeEventHandler;
  onBlur: React.FocusEventHandler;
};

export type FieldState = {
  pristine: boolean;
  touched: boolean;
  initialValue: string;
  error?: string;
  setValue(value: string): void;
  input: FieldInputProps;
};

export type Formstate<T> = {
  submitting: boolean;
  pristine: boolean;
  valid: boolean;
  submittoken?: string;
  errors: Errors<T>;
  fields: Mapped<T, FieldState>;
  setValue(name: keyof T, value: string): void;
  onSubmit(fn: SubmitHandler<T>): React.FormEventHandler;
  reinitialize(initialValues: InitialValues<T>): void;
};
