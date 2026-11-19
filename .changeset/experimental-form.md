---
'foldkit': minor
---

Add experimental Form, a viewless Submodel for form state. It tracks each field's input, errors, and interaction state, and returns the Commands that validate and submit it. Import it from `foldkit/experimental` or `foldkit/experimental/form`.

Define each field with an Effect Schema, an initial input, and optional validation: `rules`, an async `validate` Effect, and `validateOn: 'Change' | 'Blur'`. A field stores the control's input, the Schema's `Encoded` side, so a number field can hold `'12a'` while the person types and show the decode failure as an error. `initial` and `changed` take inputs, while `rules`, `validate`, `execute`, and overrides passed to `init` and `reinitialize` take decoded values.

`Form.define` takes a `name` for the Form's Commands, such as `SubmitRegistration` and `ValidateRegistrationEmail`, the fields, and a submission: an `execute` Effect with optional `data`, `error`, and `context` Schemas. `Form.define` throws when two field names differ only in the case of their first letter. Services that `execute` and `validate` need become requirements of those Commands.

A parent connects a Form with `lift`, whose required `foldOutMessage` handles the `SucceededSubmit` and `FailedSubmit` OutMessages. The lifted `submit`, `reset`, and `reinitialize` return Steps that compose with `Update.combine`. A Form inside a Submodel passes the Submodel's OutMessage type to `lift` and can forward Form OutMessages with `toParentOutMessage`. Form ignores results it no longer waits for, such as those from before a reset.

Form also includes:

- `toFieldErrors`, which shows a typed submission error on the fields it concerns, and `formError(model)`, which returns the error when no field shows it
- `fieldView`, `inputs`, `submission`, `isSubmitPending`, and `submitCount` selectors
- `changedFields`, which changes several fields in one Message
- `Form.RequiredFromNullOr(schema, message)`, a field Schema for a control that holds `null` until the person chooses
- `Form.Fields<Schemas, Model, Message>`, which types a view helper that accepts any Form with those fields
- `Form.FieldValues<typeof fields>`, which types a helper that `execute` calls
- `Form.FieldSchemasOf<typeof fields>`, which names the Schemas of shared fields for `Form.Fields`

Story and Scene tests can match and resolve each Form's `Submit` Command and the `ValidateField.<field>` Command of each field with a `validate` Effect.
