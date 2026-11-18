---
'foldkit': minor
'@foldkit/oxlint-plugin': patch
'@foldkit/vite-plugin': patch
---

Add experimental Form, a viewless Submodel that manages field inputs, validation, interaction metadata, and submission. Import it from `foldkit/experimental` or `foldkit/experimental/form`.

Define each field with an Effect Schema, an initial input, synchronous rules, an optional async `validate` Effect, and a `validateOn` trigger of `'Change'` or `'Blur'`. A field stores the control's input, the Schema's `Encoded` side, so a number field can hold `'12a'` while the person types. Validation decodes the input with the Schema, shows decode failures as field errors, and runs rules and `validate` on the decoded value. `initial` and `changed` take inputs. `init` and `reinitialize` overrides, rules, `validate`, and submission take decoded values. `fieldView(model, name)` returns a field's input, decoded value, errors, and interaction metadata.

`Form.define` takes a `name`, which names the Form's Commands: `Submit<Name>` and `Validate<Name><Field>`, such as `SubmitRegistration` and `ValidateRegistrationEmail`. Field names that differ only in the case of their first letter throw, since their validation Commands would share a name. Configure submission with an `execute` Effect, plus a `data` Schema when it returns a value, an `error` Schema when it can fail, and a `context` Schema when it needs a value the Form doesn't hold, such as a record id. `submit(model, context)` passes that value to `execute`. `toFieldErrors` maps a typed submission error to messages on the fields it concerns. A mapped message stays until the field's input changes or the next submit checks the field again.

The parent stores the Form Model, folds its Messages through `lift`, and renders from its selectors. When Form accepts a submission result, its update returns a `SucceededSubmit` or `FailedSubmit` OutMessage, and `lift` requires a `foldOutMessage` that folds it into the parent. The lifted `reset`, `reinitialize(overrides)`, and `submit(context)` return Steps, so they compose with `Update.combine`. Form ignores stale validation and submission results by generation, and carries validator and submission service requirements onto the Commands it returns. `form.Submit` and `form.ValidateField.<field>` can be matched and resolved in Story and Scene tests.

`got-submodel-message-name` and the other Submodel wrapper lint rules treat a Message Schema from `Form.define` like one from `Query.define`, whether Form is imported from `foldkit/experimental` or `foldkit/experimental/form`.

The Vite plugin prebundles `effect/SchemaGetter` and `effect/SchemaParser` with the rest of Effect, so the dev server loads one copy of each.
