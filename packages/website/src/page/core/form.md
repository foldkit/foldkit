# Form

:::Warning{label="Experimental"}
Form ships from `foldkit/experimental` and `foldkit/experimental/form`. Its names, types, and Model shape may change before it enters Foldkit's stable API.
:::

:::Info{label="See it in an app"}
[Experimental Form](/example-apps/experimental-form) has a registration Form and a profile Form that share one email field. It shows:

- validation on change, on blur, and with an async email check
- an age field that keeps text like `12a` and shows an error until it reads as a number
- a list of topics rendered as checkboxes
- a server error shown on the email field
- a parent that records each successful registration
- a profile save that gets the profile id from the parent
- a reset during a save
- Story and Scene tests

:::

## Overview

### Form State in the Parent Update

Every form needs the same state for each field: what the person typed, the value it resets to, its errors, and whether the person has touched it. The form as a whole moves from idle to checking to saving to done. Writing those transitions by hand in each parent update hides the few decisions the application actually makes.

Form is a viewless Submodel that handles those transitions. You describe each field with an Effect Schema and its validation, and you give the Form an Effect that submits it. Form operations return the next Form Model and any Commands for validation or submission. The Runtime performs those Commands.

### What the Parent Decides

The parent stores the Form Model, wraps Form Messages in its own Message, and decides when to submit and when to reset. It passes in any value the submission needs that isn't a field, and it decides what happens after a submission succeeds or fails. It renders ordinary HTML from the values the Form's selectors return.

### When to Use Form

Use Form for a flat set of fields. A field holds one input: a string, number, or boolean, or an immutable compound value such as an array or a tagged union. Form doesn't handle:

- nested fields, or separate state for each item in an array field
- validation that depends on more than one field
- debouncing or cancelling async field checks

Use [Field Validation](/core/field-validation) directly when you need something else.

## Define a Form

### Define Fields

`Form.field` takes a Schema, an initial input, and optional validation. A field gets its name from its key in `Form.define`, so one field definition can appear in several Forms. Each Form keeps its own state for it.

::Snippet{name="formDefine" label="Reusable and inline Form fields"}

Validation has three optional parts:

- `rules` from `FieldValidation.makeRules` check the value right away.
- `validate` is an Effect for checks that need a service or a network request. It returns error messages and runs only after `rules` pass, and only for a non-empty value when the field has no `required` rule. If the Effect fails, its error string becomes the field's error.
- `validateOn` is `'Change'` (the default) or `'Blur'`. A `'Blur'` field clears its errors when the input changes and checks again on blur.

A change or blur shows the first rule that fails. Submitting checks every field, whatever its `validateOn`, and shows every rule that fails. A later blur keeps those errors. A `'Blur'` field is checked on blur when it hasn't been checked since its last change, or when its rules pass but `validate` reported errors or failed, which runs `validate` again.

### Define the Form

`Form.define` takes a `name`, the `fields`, and a `submit` configuration, covered in [Configure Submission](#configure-submission).

The `name` names the Form's Commands, which DevTools and test failures show. With `name: 'Registration'`, the submission Command is `SubmitRegistration` and the email field's check is `ValidateRegistrationEmail`. Two field names that differ only in the case of their first letter, such as `userName` and `UserName`, would produce the same Command name, so `Form.define` throws for them. Choose names so that no two Forms produce the same Command name. For example, a `Sign` Form with an `upEmail` field and a `SignUp` Form with an `email` field both produce `ValidateSignUpEmail`.

`Form.Values<typeof registrationForm>` is the type of the values the submission receives. Name the Form's Model and Message types with `typeof registrationForm.Model.Type` and `typeof registrationForm.Message.Type`.

### Inputs and Values

A field stores its input: what the control produces, such as the text of an `<input>`. The field's Schema turns that input into the value your code works with. In Schema terms, the input is the `Encoded` side and the value is the `Type` side.

For a `Schema.String` field they are the same string. For an age field whose Schema turns text into a number, the field stores `'12a'` while the person types and shows an error until the text reads as a number.

| Works with the input (`Encoded`) | Works with the value (`Type`)                 |
| -------------------------------- | --------------------------------------------- |
| `initial` in `Form.field`        | Overrides passed to `init` and `reinitialize` |
| `changed(name, input)`           | `rules` and `validate`                        |
| `fieldView(model, name).input`   | `submit.execute`                              |
| `inputs(model)`                  | `fieldView(model, name).maybeValue`           |

Overrides are values because they usually come from a record you already have, such as a saved profile. Form turns each one into an input with the field's Schema, and that input becomes the field's default. A saved value that the Schema would reject, such as an empty name, is still loaded and shows its error once the field is checked.

### Typed Inputs

Validation reads the input with the Schema first. If that fails, the Schema's messages become the field's errors, and `rules` and `validate` don't run. Effect's default messages are written for developers, so add a `message` annotation to the Schema.

Pick a Schema whose `Encoded` side is exactly what the control produces:

::Snippet{name="formFieldInputs" label="Number and optional text inputs"}

- The age input must not be empty or only spaces. `Schema.Trim` trims the text, `Schema.isNonEmpty` rejects an empty result, and `SchemaTransformation.numberFromString` parses the rest. `Schema.FiniteFromString` alone reads `''` as `0`.
- The nickname input reads `''` as `Option.none()` and any other text as `Option.some(text)`. `init({ nickname: Option.none() })` shows an empty input.

A field can hold an input its Schema rejects, such as `''` for a `Schema.NonEmptyString` field. The Schema's checks run when the input is validated.

Field Schemas must decode and encode synchronously, without services, and both sides must be plain data that can live in a Model. A Schema with an optional key, such as `Schema.OptionFromOptionalKey`, can't be a field Schema.

### Compound Values

An input can be a compound value when the control produces one. The snippet below has three:

- `topics` is the list of checked boxes. A required array field treats `[]` as empty.
- `favoriteTopic` comes from a select whose "none" option produces `null`. `Schema.OptionFromNullOr` turns it into an `Option`, so its rules set `isEmpty` to `Option.isNone`.
- `meetupLocation` comes from a map picker that produces `Unspecified` or `Coordinates`.

::Snippet{name="formCompoundValues" label="Array, nullable, and tagged union inputs"}

An array field has one set of errors and `meta`. To change part of it, send `changed` with the whole new array. In the example app, a checkbox click sends `ClickedProfileTopic`, and the parent adds or removes that topic before folding `profileForm.changed('topics', nextTopics)`.

## Connect the Form to Its Parent

Put the Form's Model Schema in the parent Model and wrap its Message Schema in a `Got*` Message. `lift` connects the Form's operations to the parent. It takes:

- `parentField`, the parent field that always holds this Form's Model
- `toParentMessage`, which wraps each Form Message in the parent's `Got*` Message
- `foldOutMessage`, which handles each submission result, covered in [React to Submission Results](#react-to-submission-results)

::Snippet{name="formParent" label="Submission Effect and parent wiring"}

The lifted Form has four operations:

- `fold` applies a Form Message to the parent Model. Like `Update.foldChild`, call it as `registration.fold(model, message)` or use it data-last as a Step.
- `submit()` returns a Step for a new attempt. It checks every field and returns the validation or submission Commands.
- `reset` is a Step that restores the Form's defaults.
- `reinitialize(overrides)` returns a Step that loads new defaults.

`submit`, `reset`, and `reinitialize` return Steps, so they compose with `Update.combine`. Apply one directly with `registration.submit()(model)`.

### React to Submission Results

When Form accepts a submission result, its update returns an OutMessage:

- `SucceededSubmit` with the typed `data`
- `FailedSubmit` with the typed `error`

`foldOutMessage` handles them in the parent. For example: store the new user's id, navigate, or refresh a Query. Match every variant with `registrationForm.OutMessage.match`. Each branch returns a Step that receives the parent Model with the Form already updated.

`foldOutMessage` is required. A parent with nothing to do still names each variant and returns the Model unchanged, as `foldProfileOutMessage` does in [Pass Context to Submission](#pass-context-to-submission).

### Report Results From a Submodel

When the Form lives inside a Submodel that reports to its own parent, pass the Submodel's OutMessage type as the third type argument to `lift`. Each `foldOutMessage` branch can then return the Submodel's OutMessage, and the lifted `fold` returns it.

::Snippet{name="formParentOutMessage" label="A Submodel that reports a successful sign-up"}

To pass a Form OutMessage up unchanged, add `toParentOutMessage`. It receives each Form OutMessage and returns the Submodel's OutMessage, or `undefined` to stop it at the Submodel.

### Optional and Nested Forms

`parentField` accepts only a parent field whose type is exactly the Form's Model. When the Form is optional, nested, or one of several, pass a lens instead: `lift({ read, write, toParentMessage, foldOutMessage })`, as with [`Update.foldChild`](/core/submodel#fold-child). When `read` returns `None`, every lifted operation leaves the parent unchanged and returns no Commands.

If the lens points at an object that holds the Form Model's fields plus other fields, such as a record id, `write` must copy the other fields back. `reinitialize` passes `write` a fresh Form Model without them. Keeping that data in a separate parent field avoids the problem.

## Submit a Form

### Configure Submission

`submit.execute` receives the field values and returns an Effect. Once every field passes validation, Form returns the `Submit` Command, and the Runtime runs the Effect.

- Add a `data` Schema when the Effect returns a value.
- Add an `error` Schema when the Effect can fail.
- Add a `context` Schema when the Effect needs a value that isn't a field.
- Add `toFieldErrors` when some errors belong to a single field.

These Schemas must decode and encode synchronously, without services. The Effect and a field's `validate` Effect can require services. The application provides them the same way it provides services to any other Command.

### Pass Context to Submission

Some submissions need a value that isn't a field, such as the id of the record being edited. Add a `context` Schema, and `submit` takes that value. `execute` receives it after the field values.

::Snippet{name="formContext" label="Submission that needs the record id"}

Form keeps the context with the attempt. If async field checks delay the submission, `execute` receives the context from the `submit` call that started the attempt.

### Show Submission Errors on Fields

A server can reject a submission because of one field, such as an email that is already registered. `toFieldErrors` receives the typed error and returns a message for each field it concerns. TypeScript rejects a key that isn't a field name.

::Snippet{name="formFieldErrors" label="Typed submission errors mapped to fields"}

The submission also becomes `Failed` with the typed error, so the parent can show a message above the form too. Return `{}` for an error that isn't about one field.

A mapped message shows in that field's `errors`:

- It stays when the field loses focus without a change.
- It clears when the field's input changes.
- The next submit checks the field again.

A field doesn't get the message if its input no longer matches what was sent, for example because the person edited it while the submission was running.

### The Submission Lifecycle

Submitting counts one attempt and checks every field. If a field needs its `validate` Effect and hasn't already passed it for the current input, the submission waits in `Validating`. When the checks finish:

- If any field is invalid, its errors show and the submission goes back to `Idle`. The submission Effect doesn't run.
- If every field is valid, the submission is `Submitting` and Form returns the `Submit` Command.

When the last check's result arrives, `fold` returns the `Submit` Command. The parent doesn't call `submit` again.

When the `Submit` result arrives, the submission becomes `Succeeded` with the typed data or `Failed` with the typed error. Read it with `submission(model)` and match it with `registrationForm.Submission.match`. `Form.Submission<typeof registrationForm>` is its type.

While the submission is `Validating` or `Submitting`, another submit does nothing. Editing a field while `Validating` cancels the attempt: the submission returns to `Idle` and the person submits again. Editing a field while `Submitting` doesn't, because the values were already sent. Editing after `Succeeded` or `Failed` returns the submission to `Idle`.

### Stale Results

Form ignores results it no longer waits for: a result from before a reset, from an older attempt, or from a check that a later edit replaced. These change nothing and return no OutMessage.

Fold each Form Message back through the lifted Form that started the work. Two Forms built from one definition count attempts separately, so a result folded into the wrong one can be mistaken for one of its own.

### Initial Values and Reset

`init()` builds a Form from each field's `initial` input. Pass overrides to start from other values, such as an existing record: `init({ email: 'reader@example.com' })`. Fields you leave out use their `initial` input.

`reset` returns every field to its default and clears errors, interaction state, the submission, and the attempt count. `reinitialize(overrides)` loads a different record into an existing Form: it replaces the defaults, then resets.

Use `init` only when building a new parent Model. Replacing a live Form with `init()` forgets which attempts and checks it already started, so a late result from before the replacement could be taken for a new one. `reset` and `reinitialize` remember them.

## Read Fields and Render HTML

Render from the Form's selectors, not from its Model:

- `fieldView(model, name)` returns the field's `input`, `maybeValue`, `errors`, and `meta`.
- `inputs(model)` returns every field's input by name.
- `submission(model)` returns the submission state.
- `submitCount(model)` returns the number of attempts since the Form was built, reset, or reinitialized.

::Snippet{name="formView" label="Form fields rendered with input and blur events"}

Render `input` in the control and send each new input with `changed`. Send `blurred(name)` when the control loses focus; a `validateOn: 'Blur'` field is checked then. `maybeValue` is `Some` whenever the input decodes, even when `rules` reject it, and `None` when it doesn't.

`meta` describes how the person has used the field:

- `isEdited` turns true on the first change and stays true, even if the input goes back to its default.
- `isBlurred` turns true when the field first loses focus.
- `isTouched` is true when the field is edited or blurred.
- `isDefaultInput` is true when the input equals the default, comparing arrays and records by content.

## Test Form Commands

Story and Scene tests can match and resolve `registrationForm.Submit` and `registrationForm.ValidateField.<field>` without running their Effects. `Submit` takes the decoded `values`, the `context`, and the attempt's `generation`. `ValidateField` has a Command for each field with a `validate` Effect. It takes the field's `value` and the check's `generation`.

Start these Commands with `submit` and field changes, not by calling them directly. A direct call skips the Form update, so Form isn't waiting for its result and ignores it.

The [Experimental Form example](/example-apps/experimental-form) resolves both Commands in its Story and Scene tests.
