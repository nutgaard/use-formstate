import React from 'react';
import { FieldState } from './domain';

export function checkboxAdapter(field: FieldState): React.InputHTMLAttributes<HTMLInputElement> {
  return {
    ...field.input,
    checked: 'true' === field.input.value,
    onChange(event: React.ChangeEvent<HTMLInputElement>) {
      field.setValue('' + event.target.checked);
    }
  };
}
