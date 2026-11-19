# Form

:::Warning{label="Experimental"}
Form ships from `foldkit/experimental` and `foldkit/experimental/form`. Its names, types, and Model shape may change before it joins Foldkit's stable API.
:::

:::Info{label="See it in an app"}
[Experimental Form](/example-apps/experimental-form) has a registration Form and a profile Form that share an email field. It shows:

- validation on change, on blur, and with an async email check
- an age field that keeps text like `12a` and shows an error until it's a number
- topics rendered as checkboxes
- a required select
- two checkboxes that change together
- a server error shown on the email field
- a profile save that needs the profile id from the parent
- a reset during a save
- Story and Scene tests

:::

## Overview

### Form State in the Parent Update

Every form tracks the same things for each field: what the person typed, the value it resets to, its errors, and whether the person has touched it. The form as a whole goes from idle to checking to saving to done. Written by hand in every parent update, that bookkeeping buries the few decisions the application makes.

Form is a viewless Submodel that does the bookkeeping. You describe each field with an Effect Schema and its validation, and give the Form an Effect that submits it. Form operations return the next Form Model and the Commands for validation and submission, which the Runtime performs.

### What the Parent Decides

The parent stores the Form Model, wraps Form Messages in its own Message, and decides when to submit and reset. It supplies any value the submission needs that isn't a field, decides what happens when the submission succeeds or fails, and renders ordinary HTML from the Form's selectors.

### When to Use Form

Use Form for a flat set of fields. Each field holds one input: a string, number, or boolean, or an immutable compound value such as an array or a tagged union. Form doesn't handle:

- nested fields, or separate state for each item of an array field
- validation that depends on more than one field
- debouncing or cancelling async field checks

For those, use [Field Validation](/core/field-validation) directly.

## Define a Form

### Define Fields

`Form.field` takes a Schema, an initial input, and optional validation. A field takes its name from its key in `Form.define`, so one field definition can appear in several Forms, each with its own state for it.

::Snippet{name="formDefine" label="Reusable and inline Form fields"}

To declare a Form's fields outside `Form.define`, for example to share them between Forms, wrap them in `Form.defineFields`. It returns the fields unchanged with the types `Form.define` would infer, and reports a value that isn't a field, or a field name that isn't a string, where you declare the fields. The snippet in [Configure Submission](#configure-submission) declares its fields this way.

Validation has three optional parts:

- `rules` from `FieldValidation.makeRules` check the value right away.
- `validate` is an Effect for checks that need a service or a request. It runs only after `rules` pass, and skips an empty value unless the field has a `required` rule. It returns error messages, and if it fails, its error string becomes the field's error.
- `validateOn` is `'Change'` (the default) or `'Blur'`. A `'Blur'` field clears its errors when the input changes and checks again when it loses focus.

A change or blur shows the first failing rule. Submitting checks every field, whatever its `validateOn`, and shows every failing rule. A later blur keeps those errors. On blur, a `'Blur'` field is checked only if it hasn't been checked since it last changed, or if its rules pass but `validate` reported errors or failed.

### Define the Form

`Form.define` takes a `name`, the `fields`, and a `submit` configuration, covered in [Configure Submission](#configure-submission).

The `name` names the Form's Commands, which DevTools and test failures show. With `name: 'Registration'`, the submission Command is `SubmitRegistration` and the email field's check is `ValidateRegistrationEmail`. `Form.define` throws for two field names that differ only in the case of their first letter, such as `userName` and `UserName`, because their Commands would share a name. Choose Form names so that no two Forms produce the same Command name. For example, a `Sign` Form with an `upEmail` field and a `SignUp` Form with an `email` field both produce `ValidateSignUpEmail`.

`Form.Values<typeof registrationForm>` is the type of the values the submission receives. The Form's Model and Message types are `typeof registrationForm.Model.Type` and `typeof registrationForm.Message.Type`.

### Inputs and Values

A field stores its input, which is what the control produces, such as the text of an `<input>`. The field's Schema turns the input into the value your code uses. In Schema terms, the input is the `Encoded` side and the value is the `Type` side.

For a `Schema.String` field, both are the same string. For an age field whose Schema turns text into a number, the field holds `'12a'` while the person types and shows an error until the text is a number.

| Takes or returns the input (`Encoded`) | Takes or returns the value (`Type`)           |
| -------------------------------------- | --------------------------------------------- |
| `initial` in `Form.field`              | Overrides passed to `init` and `reinitialize` |
| `changed(name, input)`                 | `rules` and `validate`                        |
| `changedFields(inputs)`                | `submit.execute`                              |
| `fieldView(model, name).input`         | `fieldView(model, name).maybeValue`           |
| `inputs(model)`                        | —                                             |

Overrides are values because they usually come from a record you already have, such as a saved profile. Form encodes each one into the field's default input. A saved value the Schema would reject, such as an empty name, still loads and shows its error once the field is checked.

### Typed Inputs

Validation decodes the input first. If decoding fails, the Schema's messages become the field's errors, and `rules` and `validate` don't run. Effect's default messages are written for developers, so annotate the Schema with a `message`.

Pick a Schema whose `Encoded` side is exactly what the control produces:

::Snippet{name="formFieldInputs" label="Number and optional text inputs"}

- The age input can't be empty or only spaces. `Schema.Trim` trims the text, `Schema.isNonEmpty` rejects an empty result, and `SchemaTransformation.numberFromString` parses the rest. `Schema.FiniteFromString` alone reads `''` as `0`.
- The nickname input reads `''` as `Option.none()` and any other text as `Option.some(text)`. `init({ nickname: Option.none() })` shows an empty input.

A field can hold an input its Schema rejects, such as `''` for a `Schema.NonEmptyString` field. The Schema's checks run when the field is validated.

Field Schemas must decode and encode synchronously and without services, and both sides must be plain data a Model can hold. A Schema with an optional key, such as `Schema.OptionFromOptionalKey`, can't be a field Schema.

### Compound Values

An input can be a compound value when the control produces one. The snippet below has four:

- `experienceLevel` comes from a select that holds `null` until the person chooses. `Form.RequiredFromNullOr(ExperienceLevel, message)` makes its input a level or `null` and its value a level, so `execute` gets a level. A `null` input shows `message`.
- `topics` holds the checked boxes. A required array field treats `[]` as empty.
- `favoriteTopic` comes from a select whose "none" option produces `null`, and `Schema.OptionFromNullOr` turns it into an `Option`, so its rules set `isEmpty` to `Option.isNone`. Use `Schema.OptionFromNullOr` when "none" is a valid answer, and `Form.RequiredFromNullOr` when the person must choose.
- `meetupLocation` comes from a map picker that produces `Unspecified` or `Coordinates`.

::Snippet{name="formCompoundValues" label="Array, nullable, and tagged union inputs"}

An array field has one set of errors and `meta`. To change part of it, send `changed` with the whole new array. In the example app, clicking a topic sends `ClickedProfileTopic`, and the parent adds or removes the topic before folding `profileForm.changed('topics', nextTopics)`.

## Connect the Form to Its Parent

Put the Form's Model Schema in the parent Model and wrap its Message Schema in a `Got*` Message. `lift` connects the Form to the parent. It takes:

- `parentField`, the parent field that holds the Form's Model
- `toParentMessage`, which wraps each Form Message in the parent's `Got*` Message
- `foldOutMessage`, which handles each submission result, covered in [React to Submission Results](#react-to-submission-results)

::Snippet{name="formParent" label="Submission Effect and parent wiring"}

The lifted Form has four operations:

- `fold` applies a Form Message to the parent Model. Like `Update.foldChild`, call it as `registration.fold(model, message)` or use it data-last as a Step.
- `submit()` returns a Step that starts an attempt.
- `reset` is a Step that restores the Form's defaults.
- `reinitialize(overrides)` returns a Step that loads new defaults.

`submit`, `reset`, and `reinitialize` compose with `Update.combine`. To apply one directly, call it with the Model: `registration.submit()(model)`.

The Steps from `fold` and `submit` require the services of the submission Effect and of every `validate` Effect. That's because folding a field Message can return the `Submit` Command, when the last async check of a pending attempt passes. So the parent's Step type names those services.

### React to Submission Results

When Form accepts a submission result, its update returns an OutMessage: `SucceededSubmit` with the typed `data`, or `FailedSubmit` with the typed `error`.

`foldOutMessage` handles them in the parent, for example to store the new user's id, navigate, or refresh a Query. Match every variant with `registrationForm.OutMessage.match`. Each branch returns a Step that receives the parent Model with the Form already updated.

`foldOutMessage` is required. A parent with nothing to do still names each variant and returns the Model unchanged, as `foldProfileOutMessage` does in [Pass Context to Submission](#pass-context-to-submission).

### Report Results From a Submodel

When the Form's parent is a Submodel with its own parent, pass the Submodel's OutMessage type as the third type argument to `lift`. Each `foldOutMessage` branch can then return the Submodel's OutMessage, and the lifted `fold` returns it.

::Snippet{name="formParentOutMessage" label="A Submodel that reports a successful sign-up"}

To pass a Form OutMessage up unchanged, add `toParentOutMessage`. It receives each Form OutMessage and returns the Submodel's OutMessage, or `undefined` to keep it in the Submodel.

### Optional and Nested Forms

`parentField` only accepts a parent field whose type is exactly the Form's Model. When the Form is optional, nested, or one of several, pass a lens instead: `lift({ read, write, toParentMessage, foldOutMessage })`, as with [`Update.foldChild`](/core/submodel#fold-child). When `read` returns `None`, every lifted operation leaves the parent unchanged and returns no Commands.

If the lens reads an object that holds the Form Model's fields alongside other data, such as a record id, `write` must copy that data back, because `reinitialize` passes `write` a fresh Form Model. Keeping the data in its own parent field avoids this.

Keep a Form's Model in a parent field that lives as long as the parent, even while the Form is hidden, not in a union variant the parent replaces each time a sheet or dialog opens. To load a record when it opens, call `reinitialize`, not `init()`. [Initial Values and Reset](#initial-values-and-reset) explains why.

## Submit a Form

### Configure Submission

`submit.execute` receives the field values and returns an Effect. Once every field is valid, Form returns the `Submit` Command and the Runtime runs the Effect. Each of these is optional:

- a `data` Schema, when the Effect returns a value
- an `error` Schema, when the Effect can fail
- a `context` Schema, when the Effect needs a value that isn't a field
- `toFieldErrors`, when some errors belong to one field

The `data`, `error`, and `context` Schemas must decode and encode synchronously and without services. The Effect and a field's `validate` Effect can require services, which the application provides as it does for any other Command.

To type a helper that `execute` calls, declare the fields before `Form.define` and use `Form.FieldValues<typeof fields>`. `Form.Values<typeof form>` doesn't work there, because the Form would refer to itself in its own definition.

::Snippet{name="formFieldValues" label="Values type for a helper that execute calls"}

### Pass Context to Submission

Some submissions need a value that isn't a field, such as the id of the record being edited. Add a `context` Schema, and `submit` takes that value. `execute` receives it after the field values.

::Snippet{name="formContext" label="Submission that needs the record id"}

If async field checks delay the submission, `execute` still gets the context from the `submit` call that started the attempt. Form keeps the context in its Model while async checks run, so it must be plain data. Keep it small, such as an id rather than the whole record.

### Show Submission Errors on Fields

A server can reject a submission because of one field, such as an email that's already registered. `toFieldErrors` receives the typed error and returns a message for each field it's about, and TypeScript rejects a key that isn't a field name. Return `{}` for an error that isn't about a field.

::Snippet{name="formFieldErrors" label="Typed submission errors mapped to fields"}

A mapped message shows in the field's `errors`. It stays when the field loses focus, clears when the field's input changes, and the next submit checks the field again. A field whose input changed while the submission was running doesn't get the message, so `formError` returns the error.

Whether or not a field shows the error, the submission becomes `Failed` with it. To show it above the form without repeating what a field shows, render `formError(model)`. It returns the error only when no field shows it.

### The Submission Lifecycle

Calling `submit` counts an attempt and checks every field. If a field's `validate` Effect needs to run for its current input, the submission waits in `Validating` until it finishes. Then:

- If any field is invalid, its errors show and the submission goes back to `Idle` without running the Effect.
- If every field is valid, the submission becomes `Submitting` and Form returns the `Submit` Command. The parent doesn't call `submit` again: folding the last check's result returns the Command.

When the `Submit` result arrives, the submission becomes `Succeeded` with the typed data or `Failed` with the typed error. Read it with `submission(model)`, match it with `registrationForm.Submission.match`, and type it with `Form.Submission<typeof registrationForm>`.

While the submission is `Validating` or `Submitting`, another submit does nothing. Editing a field while `Validating` cancels the attempt, and the person submits again. Editing while `Submitting` doesn't, because the values are already sent. Editing after `Succeeded` or `Failed` returns the submission to `Idle`.

### Stale Results

Form ignores results it no longer waits for: one from before a reset, from an older attempt, or from a check that a later edit replaced. They change nothing and return no OutMessage.

Fold each Form Message back through the lifted Form that started the work. Two Forms built from one definition count attempts separately, so a result folded into the wrong one can pass for one of its own.

### Initial Values and Reset

`init()` builds a Form from each field's `initial` input. Pass overrides to start from other values, such as an existing record: `init({ email: 'reader@example.com' })`. Fields you leave out use their `initial` input.

`reset` returns every field to its default and clears errors, interaction state, the submission, and the attempt count. `reinitialize(overrides)` loads a different record: it replaces the defaults, then resets. Fields the overrides leave out get their `initial` input, so `reinitialize({})` goes back to the `initial` inputs, while `reset` goes back to the defaults from the last `init` or `reinitialize`.

Use `init` only when building a new parent Model. A Form replaced with `init()` forgets the attempts and checks it started, so a late result from before could pass for a new one. `reset` and `reinitialize` remember them.

## Read Fields and Render HTML

Render from the Form's selectors, not its Model:

- `fieldView(model, name)` returns the field's `input`, `maybeValue`, `errors`, and `meta`.
- `inputs(model)` returns every field's input.
- `submission(model)` returns the submission state.
- `isSubmitPending(model)` is true while the submission is `Validating` or `Submitting`, for example to disable the submit button.
- `formError(model)` returns the submission error that no field shows.
- `submitCount(model)` returns the number of attempts since the last `init`, `reset`, or `reinitialize`.

::Snippet{name="formView" label="Form fields rendered with input and blur events"}

Put `input` in the control and send each new input with `changed`. Send `blurred(name)` when the control loses focus, which is when a `validateOn: 'Blur'` field is checked. `maybeValue` is `Some` whenever the input decodes, even if `rules` reject it.

`meta` describes how the person has used the field:

- `isEdited` turns true on the first change and stays true, even if the input goes back to its default.
- `isBlurred` turns true when the field first loses focus.
- `isTouched` is true once the field is edited or blurred.
- `isDefaultInput` is true when the input equals the default, comparing arrays and records by content.

### Change Several Fields

Some controls change more than one field. For example, turning off email updates also turns off the weekly digest. `changedFields` sends those changes in one Message. Each named field is marked edited and checked as `changed` would check it.

::Snippet{name="formChangedFields" label="Two fields changed by one click"}

### Share View Helpers Between Forms

A view helper can accept any Form that has the fields it needs, whatever the Form submits. Type the Form parameter as `Form.Fields<Schemas, Model, Message>` and leave `Model` and `Message` generic, so the Form passed in decides them.

`Schemas` maps each field name the helper reads to a Schema type. To require a kind of input, constrain that entry: `{ email: Form.FieldSchema & Readonly<{ Encoded: string }> }` accepts any email field whose input is text. For fields that several Forms share, pass `Form.FieldSchemasOf<typeof fields>` as `Schemas`.

## Test Form Commands

Story and Scene tests can match and resolve `registrationForm.Submit` and `registrationForm.ValidateField.<field>` without running their Effects:

- `Submit` takes the decoded `values` and the attempt's `generation`, plus the `context` when the Form has a `context` Schema.
- `ValidateField` has a Command for each field with a `validate` Effect. It takes the field's `value` and the check's `generation`.

Start these Commands through `submit` and field changes, not by calling them directly. A direct call skips the Form update, so Form ignores the result.

The [Experimental Form example](/example-apps/experimental-form) resolves both Commands in its Story and Scene tests.
