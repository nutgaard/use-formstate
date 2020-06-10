# UseFormstate
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Travis](https://img.shields.io/travis/nutgaard/use-formstate.svg)](https://travis-ci.org/nutgaard/use-formstate)
[![Dev Dependencies](https://david-dm.org/nutgaard/use-formstate/dev-status.svg)](https://david-dm.org/nutgaard/use-formstate?type=dev)

A react-hook for managing form values, errors and more

### Usage

**Preparations**

The form-shape and how it should be validated is defined using the `useFormstate` function.
Optimally this should be outside of your react-component.

```typescript jsx
interface FormData {
  name: string;
  city: string;
  hobby: string;
}

interface FormProps {
  validate: boolean;
}

const initialState: FormData = {
  name: '',
  city: '',
  hobby: ''
};

const validator = useFormstate<FormData, FormProps>({
  name: (value) => value.length > 256 ? 'Thats a might long name' : undefined,
  city: (value, values, props) => {
     if (props.validate) {
       return value.length === 0 ? 'Must provide a city' : undefined
     }
     return undefined;
  },
  hobby: (value, values, props) => {
     if (values.city.length > 0 && props.validate) {
       return value.length === 0 ? 'Hobby is required if city is provided' : undefined
     }
     return undefined;
  }
});
```

As an alternative you may pass a function instead of an object to `useFormstate`.
This may useful in instances where form-elements are conditonally-validated, though the two approaches are functionally equivalent.
```typescript jsx
const validator = useFormstate<FormData, FormProps>((values, props) => {
  const name = values.name.length > 256 ? 'Thats a might long name' : undefined;
  const city = props.validate && values.city.length === 0 ? 'Must provide a city' : undefined;
  const hobby = values.city.length > 0 && props.validate && values.hobby.length === 0 ? 'Hobby is required if city is provided' : undefined;

  return { name, city, hobby };
});
```

**Use it**

```typescript jsx
function submithandler(values: FormData) {
    return fetch('...Do your thing...');
}

function MyForm(props: Props) {
  const state: Formstate<FormData> = validator(initialState);
  
  return (
    <form onSubmit={state.onSubmit(submithandler)}>
      <label htmlFor={state.fields.name.input.id}>Name:</label>
      <input {...state.fields.name.input} />
      {state.field.name.error ? <span>state.field.name.error</span> : undefined}

      <label htmlFor={state.fields.city.input.id}>City:</label>
      <input {...state.fields.city.input} />
      {state.field.city.error ? <span>state.field.city.error</span> : undefined}

      <label htmlFor={state.fields.hobby.input.id}Name>Hobby:</label>
      <input {...state.fields.hobby.input} />
      {state.field.hobby.error ? <span>state.field.hobby.error</span> : undefined}

      <button type="submit" disabled={state.submitting}>Save</button>
    </form>
  );
}
```

## Types
Most notable types are `Formstate<S>` and `FieldState`:

**Formstate**
```
submitting: boolean;                // is the submithandler current running
pristine: boolean;                  // is 'values === initialValues'
valid: boolean;                     // is the form as a whole valid, e.g no errors
errors: { fieldnames: string };     
fields: { fieldnames: FieldState }
```

**FieldState**
```
pristine: boolean;                  // is 'values === initialValues'
touched: boolean;                   // has this element had focus
initialValue: boolean;              // initialValue as specified 
error?: string;                     // this elements error if any 
input: {
  id: string;                       
  name: string;
  value: string;
  onChange: ChangeEventHandler;
  onBlur: FocusEventHandler;
};                      
```

## Credits

Made using the awesome [typescript library starter](https://github.com/alexjoverm/typescript-library-starter) 
