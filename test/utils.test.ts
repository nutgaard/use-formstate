import { FieldState } from '../src/domain';
import { toCheckboxProps } from '../src/utils';
import { ChangeEvent } from 'react';

describe('utils', () => {
  it('toCheckboxProps', () => {
    const setValueMock = jest.fn();
    const onChangeMock = jest.fn();
    const onBlurMock = jest.fn();
    const fieldstate: FieldState = {
      pristine: true,
      touched: false,
      initialValue: 'value',
      error: undefined,
      setValue: setValueMock,
      input: {
        id: 'id',
        name: 'name',
        value: 'value',
        onChange: onChangeMock,
        onBlur: onBlurMock
      }
    };

    const result = toCheckboxProps(fieldstate);
    expect(result.id).toBe('id');
    expect(result.name).toBe('name');
    expect(result.value).toBe('value');
    expect(result.checked).toBe(false);

    result.onChange &&
      result.onChange(({ target: { checked: true } } as unknown) as ChangeEvent<HTMLInputElement>);
    expect(setValueMock).toHaveBeenCalledTimes(1);
    expect(setValueMock).toHaveBeenCalledWith('true');
  });
});
