---
'foldkit': minor
'@foldkit/oxlint-plugin': patch
'@foldkit/vite-plugin': patch
---

Add experimental Form, a viewless Submodel for form state. It keeps each field's input, errors, and interaction state, and returns the Commands that validate and submit it. Import it from `foldkit/experimental` or `foldkit/experimental/form`.

Define each field with an Effect Schema, an initial input, optional `rules`, an optional async `validate` Effect, and `validateOn: 'Change' | 'Blur'`. A field stores what the control produces, the Schema's `Encoded` side, so a number field can hold `'12a'` while the person types. The Schema turns the input into the value, and a failure shows as a field error. `initial` and `changed` take inputs. `rules`, `validate`, `execute`, and the overrides passed to `init` and `reinitialize` take values. `fieldView(model, name)` returns a field's input, value, errors, and interaction state.

`Form.define` takes a `name`, used for the Form's Commands, such as `SubmitRegistration` and `ValidateRegistrationEmail`. It throws when two field names differ only in the case of their first letter, because their Commands would share a name. Configure submission with an `execute` Effect, plus optional Schemas for its `data`, its `error`, and a `context` value that isn't a field, such as a record id. `toFieldErrors` shows a typed submission error on the fields it concerns. Services that `validate` and `execute` need become requirements of the Commands Form returns.

The parent stores the Form Model, connects it with `lift`, and renders from its selectors. `lift` requires `foldOutMessage`, which handles the `SucceededSubmit` and `FailedSubmit` OutMessages. The lifted `reset`, `reinitialize(overrides)`, and `submit(context)` return Steps, so they compose with `Update.combine`. Form ignores results from attempts and checks it no longer waits for. Story and Scene tests can match and resolve each Form's `Submit` and `ValidateField.<field>` Commands.

The Submodel wrapper lint rules, such as `got-submodel-message-name`, recognize Form Message Schemas imported from `foldkit/experimental` or `foldkit/experimental/form`.

The Vite plugin prebundles `effect/SchemaGetter` and `effect/SchemaParser` with the rest of Effect, so the dev server loads one copy of each.
