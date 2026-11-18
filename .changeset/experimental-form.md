---
'foldkit': minor
'@foldkit/oxlint-plugin': patch
'@foldkit/vite-plugin': patch
---

Add experimental Form, a viewless Submodel that manages field inputs, validation, interaction metadata, and submission. Import it from `foldkit/experimental` or `foldkit/experimental/form`.

Define each field with an Effect Schema, an initial input, synchronous rules, an optional async `validate` Effect, and a `validateOn` trigger of `'Change'` or `'Blur'`. A field stores the control's input, the Schema's `Encoded` side, so a number field can hold `'12a'` while the person types. Validation decodes the input with the Schema, shows decode failures as field errors, and runs rules and `validate` on the decoded value. `initial` and `changed` take inputs. `init` and `reinitialize` overrides, rules, and submission take decoded values.

Configure submission with an `execute` Effect, plus a `data` Schema when it returns a value, an `error` Schema when it can fail, and a `context` Schema when it needs a value the Form doesn't hold. With a `context` Schema, `submit(model, context)` passes that value to `execute`. `toFieldErrors` maps a typed submission error to messages on the fields it concerns. A mapped message stays until the field's input changes or the next submit checks the field again.

The parent stores the Form Model, folds its Messages through `lift`, and renders from its selectors. When Form accepts a submission result, its update returns a `SucceededSubmit` or `FailedSubmit` OutMessage, which the parent handles by passing `foldOutMessage` to `lift`. Form rejects stale validation and submission results by generation, and carries validator and submission service requirements onto the Commands it returns. `form.Submit` and `form.ValidateField.<field>` can be matched and resolved in Story and Scene tests.

Recognize locally defined Form Message schemas in Submodel wrapper lint rules through both experimental imports.

Include `effect/SchemaGetter` and `effect/SchemaParser` in the Vite plugin's forced Effect dependency entries.
