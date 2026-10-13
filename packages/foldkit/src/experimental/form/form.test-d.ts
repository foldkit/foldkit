import { Context, Effect, Option, Result, Schema, SchemaGetter } from 'effect'
import { expectTypeOf } from 'vitest'

import * as Form from './index.js'

const fieldNameChecks = () => {
  const text = Form.field({ schema: Schema.String, initial: { value: '' } })
  const symbolName = Symbol('field')
  const symbolFields = { text, [symbolName]: text }
  const numericFields = { text, 0: text }

  const symbolFieldsConfig = {
    name: 'SymbolFields',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: symbolFields,
  }
  // @ts-expect-error Field names must be strings, including through variables.
  Form.define(symbolFieldsConfig)
  const numericFieldsConfig = {
    name: 'NumericFields',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: numericFields,
  }
  // @ts-expect-error Numeric field names cannot be addressed by string-keyed operations.
  Form.define(numericFieldsConfig)
  Form.define({
    name: 'StringFields',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: { '0': text, text },
  })
}
void fieldNameChecks

class ValidateUsername extends Context.Service<
  ValidateUsername,
  { check: (value: string) => ReadonlyArray<string> }
>()('ValidateUsername') {}

class SaveRegistration extends Context.Service<
  SaveRegistration,
  { save: () => void }
>()('SaveRegistration') {}

const validatorPresenceChecks = () => {
  const text = Form.field({ schema: Schema.String, initial: { value: '' } })
  const username = Form.field({
    schema: Schema.String,
    initial: { value: '' },
    validate: value =>
      Effect.map(ValidateUsername, service => service.check(value)),
  })

  // @ts-expect-error A field without asynchronous validation has no callable validator.
  text.validator('hello')
  // @ts-expect-error A supplied validator retains its required services.
  Effect.runSync(username.validator('hello'))
  Form.field({
    schema: Schema.NumberFromString,
    initial: { value: 1 },
    // @ts-expect-error A transformed field's validator receives the decoded value.
    validate: (value: string) => Effect.succeed([value]),
  })

  const registration = Form.define({
    name: 'ValidatorRequirements',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: { text, username },
  })
  const formChange = registration.update(
    registration.init(),
    registration.changed('username', { value: 'next' }),
  )
  for (const validateField of formChange.commands ?? []) {
    // @ts-expect-error Synchronous fields do not erase another field's service requirements.
    Effect.runSync(validateField.effect)
  }

  const validateUsername = registration.ValidateField.username({
    value: 'next',
    generation: 1,
  })
  expectTypeOf(validateUsername.args.value).toEqualTypeOf<string>()
  // @ts-expect-error A field's validation Command retains its validator's services.
  Effect.runSync(validateUsername.effect)
  // @ts-expect-error A validation Command takes the field's decoded value.
  registration.ValidateField.username({ value: 1, generation: 1 })

  const savingRegistration = Form.define({
    name: 'SavingRegistration',
    submit: {
      execute: () => Effect.asVoid(SaveRegistration),
    },
    fields: { username },
  })
  expectTypeOf<
    Effect.Services<
      ReturnType<typeof savingRegistration.ValidateField.username>['effect']
    >
  >().toEqualTypeOf<ValidateUsername>()

  Form.field({
    schema: Schema.String,
    initial: { value: '' },
    // @ts-expect-error Validation triggers are capitalized literals.
    validateOn: 'blur',
  })
}
void validatorPresenceChecks

const inferredFieldTypes = () => {
  const registration = Form.define({
    name: 'InferredFields',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: {
      email: Form.field({ schema: Schema.String, initial: { value: '' } }),
      age: Form.field({ schema: Schema.Number, initial: { value: 18 } }),
      accepted: Form.field({
        schema: Schema.Boolean,
        initial: { value: false },
      }),
    },
  })
  expectTypeOf<Form.Values<typeof registration>>().toEqualTypeOf<{
    readonly email: string
    readonly age: number
    readonly accepted: boolean
  }>()

  const withoutValidator = Form.field({
    schema: Schema.String,
    initial: { value: '' },
  })
  const undefinedValidator = Form.field({
    schema: Schema.String,
    initial: { value: '' },
    validate: undefined,
  })
  const age = Form.field({
    schema: Schema.NumberFromString,
    initial: { value: 18 },
    validate: value => Effect.succeed(value > 0 ? [] : ['Positive only']),
  })
  expectTypeOf(withoutValidator.validator).toEqualTypeOf<undefined>()
  expectTypeOf(undefinedValidator.validator).toEqualTypeOf<undefined>()
  expectTypeOf(age.validator).parameter(0).toEqualTypeOf<number>()
  expectTypeOf<
    Effect.Services<ReturnType<typeof age.validator>>
  >().toEqualTypeOf<never>()
}
void inferredFieldTypes

const dynamicValidatorTypes = (
  config: Form.FieldConfig<typeof Schema.String, ValidateUsername>,
) => {
  const definition = Form.field(config)
  expectTypeOf(definition).toEqualTypeOf<
    Form.FieldDefinition<typeof Schema.String, ValidateUsername>
  >()
  if (definition.validator !== undefined) {
    expectTypeOf<
      Effect.Services<ReturnType<typeof definition.validator>>
    >().toEqualTypeOf<ValidateUsername>()
  }
  const form = Form.define({
    name: 'DynamicValidator',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: { username: definition },
  })
  const change = form.update(
    form.init(),
    form.changed('username', { value: 'next' }),
  )
  for (const validateField of change.commands ?? []) {
    expectTypeOf<
      Effect.Services<typeof validateField.effect>
    >().toEqualTypeOf<ValidateUsername>()
  }
}
void dynamicValidatorTypes

const registration = Form.define({
  name: 'RegistrationTypes',
  submit: { error: Schema.String, execute: () => Effect.void },
  fields: {
    email: Form.field({ schema: Schema.String, initial: { value: '' } }),
    age: Form.field({ schema: Schema.Number, initial: { value: 18 } }),
    accepted: Form.field({ schema: Schema.Boolean, initial: { value: false } }),
  },
})

const scalarFieldTypeChecks = (
  name: 'email' | 'age',
  value: string | number,
) => {
  // @ts-expect-error A number field rejects a string.
  registration.changed('age', { value: '21' })
  // @ts-expect-error A union name cannot be paired with an uncorrelated value.
  registration.changed(name, { value })
  // @ts-expect-error Unknown names are rejected.
  registration.changed('other', { value: 'x' })
  // @ts-expect-error Initial follows the codec rather than widening it.
  Form.field({ schema: Schema.Number, initial: { value: '18' } })
}
void scalarFieldTypeChecks

class TestService extends Context.Service<
  TestService,
  { readonly token: string }
>()('TestService') {}
const serviceful = Schema.String.pipe(
  Schema.decodeTo(Schema.String, {
    decode: SchemaGetter.transformEffect(value =>
      Effect.gen(function* () {
        yield* TestService
        return value
      }),
    ),
    encode: SchemaGetter.transform(value => value),
  }),
)
const literalForm = Form.define({
  name: 'Literal',
  submit: { error: Schema.String, execute: () => Effect.void },
  fields: {
    choice: Form.field({
      schema: Schema.Literals(['Yes', 'No']),
      initial: { value: 'Yes' },
    }),
  },
})
const schemaAndOverrideTypeChecks = () => {
  // @ts-expect-error Values preserve literal codecs.
  const literalValues: Form.Values<typeof literalForm> = { choice: 'Maybe' }
  void literalValues
  const selectedValues: Form.Values<typeof registration> = {
    email: '',
    // @ts-expect-error Selected values preserve per-field number types.
    age: '1',
    accepted: false,
  }
  void selectedValues
  registration.Message.ChangedField({
    // @ts-expect-error The public Message constructor preserves the field/value pairing.
    change: { name: 'age', input: { value: '21' } },
  })
  // @ts-expect-error Decoding services cannot run in synchronous Form transitions.
  Form.field({ schema: serviceful, initial: { value: '' } })
  // @ts-expect-error Encoding services cannot run in synchronous Form schemas.
  Form.field({ schema: Schema.flip(serviceful), initial: { value: '' } })
  Form.field({
    // @ts-expect-error An optional key is not a field codec.
    schema: Schema.optionalKey(Schema.String),
    initial: { value: '' },
  })
  // @ts-expect-error Override types follow each field's decoded codec type.
  registration.init({ age: { value: '21' } })
  // @ts-expect-error Unknown overrides are rejected even through a variable.
  registration.init({ email: { value: '' }, extra: { value: '' } })
  const overrides = { email: { value: '' }, extra: { value: '' } }
  // @ts-expect-error Unknown overrides are rejected even through a variable.
  registration.init(overrides)
}
void schemaAndOverrideTypeChecks

const optionalInputTypeChecks = () => {
  const form = Form.define({
    name: 'PresenceTypes',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: {
      count: Form.field({ schema: Schema.Number, initial: { value: 0 } }),
      selected: Form.field({
        schema: Schema.OptionFromOptionalKey(Schema.String),
        initial: { value: Option.none() },
      }),
    },
  })
  form.changed('selected', { value: Option.none() })
  form.Message.ChangedField({
    change: { name: 'selected', input: { value: Option.some('Ada') } },
  })
  // @ts-expect-error Required decoded keys cannot be cleared.
  form.changed('count', {})
  // @ts-expect-error Optional encoded keys do not imply optional decoded keys.
  form.changed('selected', {})
  // @ts-expect-error Option values preserve their payload type.
  form.changed('selected', { value: 1 })
  // @ts-expect-error Initial inputs preserve required decoded keys.
  Form.field({ schema: Schema.Number, initial: {} })
  // @ts-expect-error Public constructors preserve required decoded keys.
  form.Message.ChangedField({ change: { name: 'count', input: {} } })
  const overrides = { selected: { value: Option.none() }, extra: {} }
  // @ts-expect-error Unknown override keys are rejected through variables.
  form.init(overrides)
}
void optionalInputTypeChecks

const decodedUndefinedTypeChecks = () => {
  const text = Form.field({
    schema: Schema.String,
    initial: { value: 'Default' },
  })
  // @ts-expect-error A string field requires a string value.
  text.initialize({ value: undefined })
}
void decodedUndefinedTypeChecks

class SaveProfile extends Context.Service<
  SaveProfile,
  { readonly save: (username: string) => Effect.Effect<number, string> }
>()('SaveProfile') {}

const submissionTypes = () => {
  const fields = {
    username: Form.field({
      schema: Schema.String,
      initial: { value: '' },
      validate: value =>
        Effect.map(ValidateUsername, service => service.check(value)),
    }),
  }
  const typed = Form.define({
    name: 'TypedSubmission',
    fields,
    submit: {
      data: Schema.NumberFromString,
      error: Schema.String,
      execute: values => {
        expectTypeOf(values).toEqualTypeOf<{ readonly username: string }>()
        return Effect.flatMap(SaveProfile, service =>
          service.save(values.username),
        )
      },
    },
  })
  const dataOnly = Form.define({
    name: 'DataOnlySubmission',
    fields,
    submit: {
      data: Schema.Number,
      execute: () => Effect.map(SaveProfile, () => 1),
    },
  })
  const errorOnly = Form.define({
    name: 'ErrorOnlySubmission',
    fields,
    submit: {
      error: Schema.String,
      execute: values =>
        Effect.flatMap(SaveProfile, service =>
          service.save(values.username),
        ).pipe(Effect.asVoid),
    },
  })
  const omitted = Form.define({
    name: 'OmittedSubmissionCodecs',
    fields,
    submit: { execute: () => Effect.map(SaveProfile, () => undefined) },
  })
  expectTypeOf(typed.Submission.Succeeded({ data: 2 })).toEqualTypeOf<
    Readonly<{ _tag: 'Succeeded'; data: number }>
  >()
  expectTypeOf(typed.Submission.Failed({ error: 'Unavailable' })).toEqualTypeOf<
    Readonly<{ _tag: 'Failed'; error: string }>
  >()
  expectTypeOf(dataOnly.Submission.Type).toEqualTypeOf<
    Form.Submission<number, never>
  >()
  expectTypeOf(errorOnly.Submission.Type).toEqualTypeOf<
    Form.Submission<void, string>
  >()
  expectTypeOf(omitted.Submission.Type).toEqualTypeOf<
    Form.Submission<void, never>
  >()
  const submit = typed.Submit({
    values: { username: 'Ada' },
    token: { generation: 1 },
  })
  expectTypeOf<
    Effect.Services<typeof submit.effect>
  >().toEqualTypeOf<SaveProfile>()
  for (const formSubmit of [
    typed.submit(typed.init()),
    dataOnly.submit(dataOnly.init()),
    errorOnly.submit(errorOnly.init()),
    omitted.submit(omitted.init()),
  ]) {
    for (const command of formSubmit.commands ?? []) {
      expectTypeOf<Effect.Services<typeof command.effect>>().toEqualTypeOf<
        ValidateUsername | SaveProfile
      >()
    }
  }
  const Parent = Schema.Struct({ form: typed.Model })
  const parentMessage = (message: typeof typed.Message.Type) => ({ message })
  const lifted = typed.lift({
    parentField: 'form',
    toParentMessage: parentMessage,
  })
  const parent = Parent.make({ form: typed.init() })
  for (const command of lifted.submit(parent).commands ?? []) {
    expectTypeOf<Effect.Services<typeof command.effect>>().toEqualTypeOf<
      ValidateUsername | SaveProfile
    >()
  }
  for (const command of lifted.fold(
    parent,
    typed.changed('username', { value: 'Ada' }),
  ).commands ?? []) {
    expectTypeOf<Effect.Services<typeof command.effect>>().toEqualTypeOf<
      ValidateUsername | SaveProfile
    >()
  }
  // @ts-expect-error Success constructors require the decoded data type.
  typed.Submission.Succeeded({ data: '2' })
  // @ts-expect-error Failure constructors require the decoded error type.
  typed.Submission.Failed({ error: 2 })
  // @ts-expect-error Success data is required by its constructor.
  typed.Submission.Succeeded({})
  // @ts-expect-error Submit values retain each field's decoded type.
  typed.Submit({ values: { username: 2 }, token: { generation: 1 } })
  typed.Message.CompletedSubmit({
    token: { generation: 1 },
    // @ts-expect-error Completion Messages require the decoded success type.
    result: Result.succeed('2'),
  })
  typed.Message.CompletedSubmit({
    token: { generation: 1 },
    // @ts-expect-error Completion Messages require the decoded error type.
    result: Result.fail(2),
  })
  // @ts-expect-error Omitted error codecs expose no error payload.
  dataOnly.Submission.Failed({ error: 'Unavailable' })
  // @ts-expect-error Omitted data codecs accept only void success.
  errorOnly.Submission.Succeeded({ data: 2 })
  // @ts-expect-error Submit services cannot run without the required service.
  Effect.runSync(submit.effect)
}
void submissionTypes

const submissionConfigChecks = () => {
  const fields = {
    username: Form.field({ schema: Schema.String, initial: { value: '' } }),
  }
  // @ts-expect-error Every Form requires a submission configuration.
  Form.define({ name: 'MissingSubmission', fields })
  const missingExecuteConfig = {
    name: 'MissingExecute',
    fields,
    submit: { data: Schema.Number },
  }
  // @ts-expect-error Submission execution is required.
  Form.define(missingExecuteConfig)
  const missingDataConfig = {
    name: 'MissingData',
    fields,
    submit: { execute: () => Effect.succeed(2) },
  }
  // @ts-expect-error A success value requires a data codec.
  Form.define(missingDataConfig)
  const missingDataWithErrorConfig = {
    name: 'MissingDataWithError',
    fields,
    submit: { error: Schema.String, execute: () => Effect.succeed(2) },
  }
  // @ts-expect-error A success value requires a data codec when error is supplied.
  Form.define(missingDataWithErrorConfig)
  const missingErrorConfig = {
    name: 'MissingError',
    fields,
    submit: { execute: () => Effect.fail('Unavailable') },
  }
  // @ts-expect-error A typed failure requires an error codec.
  Form.define(missingErrorConfig)
  const missingErrorWithDataConfig = {
    name: 'MissingErrorWithData',
    fields,
    submit: { data: Schema.Number, execute: () => Effect.fail('Unavailable') },
  }
  // @ts-expect-error A typed failure requires an error codec when data is supplied.
  Form.define(missingErrorWithDataConfig)
  const wrongDataConfig = {
    name: 'WrongData',
    fields,
    submit: { data: Schema.Number, execute: () => Effect.succeed('2') },
  }
  // @ts-expect-error The data codec determines the Effect's success type.
  Form.define(wrongDataConfig)
  const wrongErrorConfig = {
    name: 'WrongError',
    fields,
    submit: { error: Schema.String, execute: () => Effect.fail(2) },
  }
  // @ts-expect-error The error codec determines the Effect's error type.
  Form.define(wrongErrorConfig)
  const wrongDataWithErrorConfig = {
    name: 'WrongDataWithError',
    fields,
    submit: {
      data: Schema.Number,
      error: Schema.String,
      execute: () => Effect.succeed('2'),
    },
  }
  // @ts-expect-error Supplying both codecs preserves the success type.
  Form.define(wrongDataWithErrorConfig)
  const wrongErrorWithDataConfig = {
    name: 'WrongErrorWithData',
    fields,
    submit: {
      data: Schema.Number,
      error: Schema.String,
      execute: () => Effect.fail(2),
    },
  }
  // @ts-expect-error Supplying both codecs preserves the error type.
  Form.define(wrongErrorWithDataConfig)
  const servicefulDataConfig = {
    name: 'ServicefulData',
    fields,
    submit: { data: serviceful, execute: () => Effect.succeed('Ada') },
  }
  // @ts-expect-error Submission data codecs must decode without services.
  Form.define(servicefulDataConfig)
  const servicefulDataEncodingConfig = {
    name: 'ServicefulDataEncoding',
    fields,
    submit: {
      data: Schema.flip(serviceful),
      execute: () => Effect.succeed('Ada'),
    },
  }
  // @ts-expect-error Submission data codecs must encode without services.
  Form.define(servicefulDataEncodingConfig)
  const servicefulErrorConfig = {
    name: 'ServicefulError',
    fields,
    submit: { error: serviceful, execute: () => Effect.fail('Unavailable') },
  }
  // @ts-expect-error Submission error codecs must decode without services.
  Form.define(servicefulErrorConfig)
  const servicefulErrorEncodingConfig = {
    name: 'ServicefulErrorEncoding',
    fields,
    submit: {
      error: Schema.flip(serviceful),
      execute: () => Effect.fail('Unavailable'),
    },
  }
  // @ts-expect-error Submission error codecs must encode without services.
  Form.define(servicefulErrorEncodingConfig)
}
void submissionConfigChecks
