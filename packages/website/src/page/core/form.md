# Form

:::Warning{label="Experimental"}
Form ships from `foldkit/experimental` and `foldkit/experimental/form`. Its names, types, and Model shape may change before it enters Foldkit's stable API.
:::

:::Info{label="See it in an app"}
[Experimental Form](/example-apps/experimental-form) is a registration Form and a profile Form that share one email field. It demonstrates:

- validation on change and on blur, and an async email check
- an age field that holds text like `12a` and shows an error until it reads as a number
- a topics array rendered as checkboxes
- a server error shown on the email field
- a parent that records each successful registration
- a profile save that receives the profile id from the parent
- a reset during a save
- Story and Scene tests

:::

## Overview

### Form State in the Parent Update

A form in a Foldkit application usually repeats the same pieces for every field: what the person typed, the default it resets to, validation results, whether the person has touched it, and a submission state that moves from idle to saving to done. Writing those transitions by hand in each parent update buries the decisions the application actually makes.

Form is a viewless Submodel that owns those transitions. You describe each field with an Effect Schema and its validation, and you give the Form a submission Effect. The Form Model holds every field's state and the submission state. Form operations return the next Model and any validation or submission Commands. The Runtime performs those Commands later.

### What the Parent Decides

The parent stores the Form Model, wraps Form Messages in its own Message, and decides when to submit and when to reset. It supplies any context the submission needs that the Form doesn't hold, and it decides what happens after a submission succeeds or fails. It renders ordinary HTML from the values the Form's selectors return. Form never renders anything.

### When to Use Form

Use Form for a flat set of fields. Each field holds one input: a string, number, or boolean, or an immutable compound value such as a readonly array or a tagged union. Form doesn't handle:

- Nested field paths, or per-element state inside an array field
- Validation that depends on more than one field
- Debouncing or cancelling async field checks

Use [Field Validation](/core/field-validation) directly when the application needs a different field lifecycle.

## Define a Form

### Define Fields

`Form.field` takes a Schema, an initial input, and optional validation. A field has no name. Its key in `Form.define` names it, so one field definition can appear in several Forms, and each Form keeps its own state for it.

::Snippet{name="formDefine" label="Reusable and inline Form fields"}

Validation has three optional parts:

- `rules` comes from `FieldValidation.makeRules` and checks the decoded value synchronously.
- `validate` is an Effect that returns error messages, for checks that need a service or a network request. It runs only after `rules` pass. If the Effect fails, its error string becomes the field's error.
- `validateOn` is `'Change'` (the default) or `'Blur'`. A `'Blur'` field clears its errors when the input changes and checks again on blur.

A change or blur shows the first rule that fails. Submitting checks every field, whatever its `validateOn`, and shows every rule that fails.

### Define the Form

`Form.define` takes a `name`, the `fields` record, and a `submit` configuration, described in [Configure Submission](#configure-submission). The `name` names the Form's Commands. With `name: 'Registration'`, the submission Command is `SubmitRegistration` and the email field's check is `ValidateRegistrationEmail`. Those are the names DevTools and test failures show. Two field names that differ only in the case of their first letter, such as `userName` and `UserName`, would give their checks the same name, so `Form.define` throws for them. Pick a `name` that can't run together with another Form's name and field into the same Command name.

`Form.Values<typeof registrationForm>` is the record of decoded values that the submission Effect receives. Use `typeof registrationForm.Model.Type` and `typeof registrationForm.Message.Type` when you need to name a Form's Model or Message type.

### Inputs and Values

A field stores its input: whatever the control produces, such as the text of an `<input>`. The field's Schema parses that input into the value the application works with. In Schema terms, the input is the Schema's `Encoded` side and the value is its `Type` side.

For a `Schema.String` field the two are the same string. They differ for a typed field. An age field whose Schema decodes a string into a number stores `'12a'` while the person is typing it, and shows an error until the text reads as a number.

Each operation works with one side or the other:

| Works with the input (`Encoded`) | Works with the decoded value (`Type`)         |
| -------------------------------- | --------------------------------------------- |
| `initial` in `Form.field`        | Overrides passed to `init` and `reinitialize` |
| `changed(name, input)`           | `rules` and `validate`                        |
| `fieldView(model, name).input`   | `submit.execute`                              |
| `inputs(model)`                  | `fieldView(model, name).maybeValue`           |

Overrides take decoded values because they usually come from a record the application already holds, such as a saved profile. Form encodes each override with the field's Schema and stores the result as the field's input and its reset default. An override that fails the Schema's checks, such as an empty name loaded from a saved record, is stored as is and shows its error once the field is validated.

### Typed Inputs

Validation decodes the input first. When decoding fails, the Schema's messages become the field's errors, and `rules` and `validate` don't run. Add a `message` annotation to the Schema to replace Effect's default wording, which is written for developers.

Pick a Schema whose `Encoded` side is exactly what the control produces:

::Snippet{name="formFieldInputs" label="Number and optional text inputs"}

- The age input must not be empty or only spaces. `Schema.Trim` trims the text, the `Schema.isNonEmpty` check rejects what is left when it's empty, and `SchemaTransformation.numberFromString` parses the rest. `Schema.FiniteFromString` alone decodes `''` as `0`, so an empty input would pass as zero.
- The nickname input decodes `''` as `Option.none()` and any other text as `Option.some(text)`. Encoding turns `None` back into `''`, so `init({ nickname: Option.none() })` shows an empty input.

The field stores any input of the Schema's `Encoded` type, including one the Schema rejects, such as an empty string for a `Schema.NonEmptyString` field. Decoding the input applies the Schema's checks, and their messages become the field's errors.

Field Schemas become part of the Form's Model and Message Schemas, so they must decode and encode synchronously without services. Both sides must be serializable Model data, so functions and DOM handles can't be field inputs or values. Form stores each input in a required property, so a Schema with an optional key, such as `Schema.OptionFromOptionalKey`, can't be a field Schema.

### Compound Values

An input can be a compound value when the control produces one. The snippet below has three:

- `topics` is the list of checked boxes. A required array field uses the default empty check, so `[]` counts as empty.
- `favoriteTopic` comes from a select whose "none" option produces `null`. `Schema.OptionFromNullOr` decodes it to an `Option`, so its rules set `isEmpty` to `Option.isNone`.
- `meetupLocation` comes from a map picker that produces `Unspecified` or `Coordinates`.

::Snippet{name="formCompoundValues" label="Array, nullable, and tagged union inputs"}

An array field is one input with one set of errors and metadata. A change replaces the whole array.

### Service Requirements

A field's `validate` Effect and the submission Effect can require services. Form carries those requirements onto the Commands its operations return, so the application provides them the same way it provides services to any other Command.

## Connect the Form to Its Parent

Put the Form's Model Schema in the parent Model and wrap its Message Schema in a `Got*` Message. `lift` adapts the Form's operations to the parent Model and Message. It takes three fields:

- `parentField` names the parent field that always holds this Form's Model.
- `toParentMessage` wraps each Form Message in the parent's `Got*` Message.
- `foldOutMessage` folds each submission result into the parent. It's described in [React to Submission Results](#react-to-submission-results).

::Snippet{name="formParent" label="Submission Effect and parent wiring"}

The lifted Form has four operations:

- `fold` applies a Form Message and returns the parent Model with any Commands mapped to parent Messages. Like `Update.foldChild`, it works data-first, `registration.fold(model, message)`, or data-last as a Step.
- `submit()` returns a Step that checks every field and returns the validation Commands or the `Submit` Command for a new attempt.
- `reset` is a Step that restores the Form's defaults.
- `reinitialize(overrides)` returns a Step that replaces the Form's defaults and restores them.

Because `submit`, `reset`, and `reinitialize` return Steps, they compose with `Update.combine`. Apply one to the parent Model directly: `registration.submit()(model)`.

### React to Submission Results

When Form accepts a submission result, its update returns an OutMessage:

- `SucceededSubmit` carries the typed `data`.
- `FailedSubmit` carries the typed `error`.

`foldOutMessage` handles them in the parent, for example to store the new user's id, navigate, or refresh a Query. Match every variant with `registrationForm.OutMessage.match`. Each branch returns a Step that receives the parent Model with the Form already written back.

`foldOutMessage` is required. A parent that only reads the result from `submission(model)` still names each variant and returns the Model unchanged, as `foldProfileOutMessage` does in [Pass Context to Submission](#pass-context-to-submission).

Form returns an OutMessage only for a result it accepts. A result from an attempt that a reset or a newer attempt replaced changes nothing and returns no OutMessage.

### Optional and Nested Forms

`parentField` works only when the parent field always holds a complete Form Model. When the Form is optional, nested, or one of several, pass a lens instead: `lift({ read, write, toParentMessage, foldOutMessage })`. It follows [`Update.foldChild`](/core/submodel#fold-child). When `read` returns `None`, every lifted operation returns the parent Model unchanged and no Commands.

A lens can point at an object that holds the Form Model's fields together with other fields, such as a record id. In that case `write` must copy those other fields back, because `reinitialize` passes `write` a newly built Form Model without them. Storing extra data in a sibling field of the parent Model avoids this.

## Submit a Form

### Configure Submission

`submit.execute` receives the decoded values and returns an Effect. Form runs it inside its `Submit` Command after every field passes validation.

- When the Effect returns a value, add a `data` Schema for it. Omit `data` when it returns `void`.
- When the Effect can fail, add an `error` Schema for its error type. Omit `error` when it can't fail.
- When the Effect needs a value the Form doesn't hold, add a `context` Schema for it.
- When some errors concern a single field, add `toFieldErrors`.

Every Schema must decode and encode synchronously without services, like field Schemas.

### Pass Context to Submission

Some submissions need a value that isn't a field, such as the id of the record being edited or the current workspace. Add a `context` Schema, and `submit` takes the context value. `execute` receives it after the values.

::Snippet{name="formContext" label="Submission that needs the record id"}

The submission uses the value the parent passed when it called `submit`. Form keeps that value while field checks are pending and passes it to the `Submit` Command.

### Show Submission Errors on Fields

A server can reject a submission because of one field, such as an email that is already registered. `toFieldErrors` receives the typed error and returns a message for each field it concerns. TypeScript rejects a key that isn't a field name.

::Snippet{name="formFieldErrors" label="Typed submission errors mapped to fields"}

The submission is `Failed` with the typed error whether or not `toFieldErrors` maps it, so the parent can still show a form-level message. Return `{}` for an error that concerns no single field.

A mapped message shows in that field's `errors`:

- It stays when the field is blurred without a change.
- It clears when the field's input changes.
- The next submit checks the field again.

A field doesn't receive the message when it holds a different input from the one that was sent, because the person changed it while the submission was pending.

### The Submission Lifecycle

Call `registration.submit()(model)` on the lifted Form, or `registrationForm.submit(formModel)` on the Form Model directly. Submit counts one attempt and checks every field: it decodes the input and runs `rules`. For each field that passes, has a `validate` Effect, and whose current input hasn't already passed or started that check, Form returns a validation Command and the submission is `Validating`.

Once no check is pending, Form decides the attempt:

- If any field is invalid, its errors appear and the submission returns to `Idle`. The submission Effect doesn't run.
- If every field is valid, the submission is `Submitting` and Form returns the `Submit` Command with each field's decoded value.

When the last pending check's result arrives, `fold` returns the `Submit` Command. The parent doesn't call `submit` again.

Folding the `Submit` result moves the submission to `Succeeded` with the typed data or `Failed` with the typed error, and returns the matching OutMessage. Read the submission with `submission(model)` and match it with `registrationForm.Submission.match`. `Form.Submission<typeof registrationForm>` names its type.

While the submission is `Validating` or `Submitting`, another submit does nothing. Editing a field while `Validating` cancels the attempt. Editing a field while `Submitting` doesn't: the `Submit` Command already captured the values it sends. Editing after `Succeeded` or `Failed` returns the submission to `Idle`.

### Stale Results

Each submission attempt and each field check carries a generation number. Form accepts a result only when its generation matches the attempt or check it is waiting for. A result from before a reset, from an older attempt, or from a check that a later edit replaced leaves the Form unchanged.

Route every Form Message back through the same lifted Form that started the work. Two lifted Forms built from one definition count generations separately, so a result folded into the wrong one can match an attempt there.

### Initial Values and Reset

`init()` builds a Form from each field's `initial` input. Pass overrides to start from other values, for example an existing record: `init({ email: 'reader@example.com' })`. Fields you leave out use their `initial` input.

`reset` returns every field to its default and clears validation, interaction metadata, the submission, and the attempt count. Use `reinitialize(overrides)` to load a different record into a Form that already exists. It replaces the defaults and then resets.

Use `init` only to build a new parent Model. Replacing a live Form with `init()` would restart its generations, so a result from before the replacement could match a new attempt. `reset` and `reinitialize` keep the generations.

## Read Fields and Render HTML

Render from the Form's selectors rather than from its Model fields:

- `fieldView(model, name)` returns the field's `input`, its decoded `maybeValue`, its `errors`, and `meta`.
- `inputs(model)` returns every field's input, indexed by name.
- `submission(model)` returns the submission state.
- `submitCount(model)` returns the number of attempts since the Form was built, reset, or reinitialized.

::Snippet{name="formView" label="Rendering a Form with ordinary input events"}

Render `input` in the control and send the control's new input with `changed`. Send `blurred(name)` when the control loses focus. It sets `meta.isBlurred`, and for a `validateOn: 'Blur'` field it runs validation. `maybeValue` is `Some` whenever the input decodes, even when `rules` reject the value, and `None` when it doesn't decode.

`meta` describes how the person has interacted with the field:

- `isEdited` is true once a change arrives for the field. It stays true when the input returns to its default.
- `isBlurred` is true once the field has lost focus.
- `isTouched` is true when the field is edited or blurred.
- `isDefaultValue` compares the current input with the default, so arrays and records compare by content.

Field inputs are immutable. Change a field by folding `changed` with its complete new input. In the example app, a checkbox click sends `ClickedProfileTopic`, and the parent adds or removes that topic from the current array before folding `profileForm.changed('topics', nextTopics)`.

## Test Form Commands

`registrationForm.Submit` and `registrationForm.ValidateField.<field>` are public so Story and Scene tests can match and resolve them without running their Effects. The `Submit` Command's arguments are the decoded `values`, the `context`, and the attempt's `generation`. A `ValidateField` Command's arguments are the decoded `value` and the check's `generation`.

Start these Commands through `submit` and field changes rather than calling the definitions directly. Calling them directly skips the Model transition and the generation that lets Form accept the result.

The [Experimental Form example](/example-apps/experimental-form) resolves both Commands in its Story and Scene tests.
