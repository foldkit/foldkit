import { Context, Effect, Option, Result, Schema, SchemaGetter } from 'effect'
import { expectTypeOf } from 'vitest'

import * as Form from './index.js'

const fieldNameChecks = () => {
  const text = Form.field({ schema: Schema.String, initial: '' })
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
  const text = Form.field({ schema: Schema.String, initial: '' })
  const username = Form.field({
    schema: Schema.String,
    initial: '',
    validate: value =>
      Effect.map(ValidateUsername, service => service.check(value)),
  })

  // @ts-expect-error A field without asynchronous validation has no callable validator.
  text.validator('hello')
  // @ts-expect-error A supplied validator retains its required services.
  Effect.runSync(username.validator('hello'))
  Form.field({
    schema: Schema.NumberFromString,
    initial: '1',
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
    registration.changed('username', 'next'),
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
    initial: '',
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
      email: Form.field({ schema: Schema.String, initial: '' }),
      age: Form.field({ schema: Schema.Number, initial: 18 }),
      accepted: Form.field({
        schema: Schema.Boolean,
        initial: false,
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
    initial: '',
  })
  const undefinedValidator = Form.field({
    schema: Schema.String,
    initial: '',
    validate: undefined,
  })
  const age = Form.field({
    schema: Schema.NumberFromString,
    initial: '18',
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
  const change = form.update(form.init(), form.changed('username', 'next'))
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
    email: Form.field({ schema: Schema.String, initial: '' }),
    age: Form.field({ schema: Schema.Number, initial: 18 }),
    accepted: Form.field({ schema: Schema.Boolean, initial: false }),
  },
})

const scalarFieldTypeChecks = (
  name: 'email' | 'age',
  value: string | number,
) => {
  // @ts-expect-error A number field rejects a string input.
  registration.changed('age', '21')
  // @ts-expect-error A union name cannot be paired with an uncorrelated input.
  registration.changed(name, value)
  // @ts-expect-error Unknown names are rejected.
  registration.changed('other', 'x')
  // @ts-expect-error Initial follows the codec's encoded side rather than widening it.
  Form.field({ schema: Schema.Number, initial: '18' })
  // @ts-expect-error Initial is the input, not a wrapper around it.
  Form.field({ schema: Schema.String, initial: { value: '' } })
}
void scalarFieldTypeChecks

const encodedInputTypeChecks = () => {
  const age = Form.field({ schema: Schema.NumberFromString, initial: '' })
  const ages = Form.define({
    name: 'EncodedInputs',
    submit: { execute: () => Effect.void },
    fields: { age },
  })
  ages.changed('age', '12a')
  // @ts-expect-error A transformed field changes with its encoded input.
  ages.changed('age', 12)
  // @ts-expect-error A transformed field's initial input is encoded.
  Form.field({ schema: Schema.NumberFromString, initial: 18 })
  ages.init({ age: 12 })
  // @ts-expect-error Overrides are decoded values, not inputs.
  ages.init({ age: '12' })
  expectTypeOf(ages.inputs(ages.init())).toEqualTypeOf<{
    readonly age: string
  }>()
  expectTypeOf<Form.Values<typeof ages>>().toEqualTypeOf<{
    readonly age: number
  }>()
  expectTypeOf<
    Form.FormInputs<{ age: typeof Schema.NumberFromString }>
  >().toEqualTypeOf<{ readonly age: string }>()
  const view = ages.field(ages.init(), 'age')
  expectTypeOf(view.input).toEqualTypeOf<string>()
  expectTypeOf(view.maybeValue).toEqualTypeOf<Option.Option<number>>()
  expectTypeOf(view.meta).toEqualTypeOf<
    Readonly<{
      isTouched: boolean
      isBlurred: boolean
      isEdited: boolean
      isDefaultValue: boolean
    }>
  >()
  ages.Message.ChangedField({ change: { name: 'age', input: '12a' } })
  // @ts-expect-error The public Message constructor carries the encoded input.
  ages.Message.ChangedField({ change: { name: 'age', input: 12 } })
}
void encodedInputTypeChecks

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
      initial: 'Yes',
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
    // @ts-expect-error The public Message constructor preserves the field/input pairing.
    change: { name: 'age', input: '21' },
  })
  // @ts-expect-error Decoding services cannot run in synchronous Form transitions.
  Form.field({ schema: serviceful, initial: '' })
  // @ts-expect-error Encoding services cannot run in synchronous Form schemas.
  Form.field({ schema: Schema.flip(serviceful), initial: '' })
  Form.field({
    // @ts-expect-error An optional key is not a field codec.
    schema: Schema.optionalKey(Schema.String),
    initial: '',
  })
  Form.field({
    // @ts-expect-error A codec whose encoded side is an optional key has no input to store.
    schema: Schema.OptionFromOptionalKey(Schema.String),
    initial: '',
  })
  // @ts-expect-error Override types follow each field's decoded codec type.
  registration.init({ age: '21' })
  // @ts-expect-error Unknown overrides are rejected.
  registration.init({ email: '', extra: '' })
  const overrides = { email: '', extra: '' }
  // @ts-expect-error Unknown overrides are rejected even through a variable.
  registration.init(overrides)
}
void schemaAndOverrideTypeChecks

const optionalInputTypeChecks = () => {
  const form = Form.define({
    name: 'PresenceTypes',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: {
      count: Form.field({ schema: Schema.Number, initial: 0 }),
      selected: Form.field({
        schema: Schema.OptionFromNullOr(Schema.String),
        initial: null,
      }),
    },
  })
  form.changed('selected', null)
  form.changed('selected', 'Ada')
  form.Message.ChangedField({ change: { name: 'selected', input: 'Ada' } })
  form.init({ selected: Option.some('Ada') })
  expectTypeOf<Form.Values<typeof form>['selected']>().toEqualTypeOf<
    Option.Option<string>
  >()
  // @ts-expect-error Required inputs cannot be cleared.
  form.changed('count', undefined)
  // @ts-expect-error The input is the encoded side, not an Option.
  form.changed('selected', Option.none())
  // @ts-expect-error Encoded inputs preserve their payload type.
  form.changed('selected', 1)
  // @ts-expect-error Overrides of an Option field take an Option.
  form.init({ selected: null })
  // @ts-expect-error Public constructors preserve required inputs.
  form.Message.ChangedField({ change: { name: 'count' } })
  const overrides = { selected: Option.none(), extra: 1 }
  // @ts-expect-error Unknown override keys are rejected through variables.
  form.init(overrides)
}
void optionalInputTypeChecks

const decodedUndefinedTypeChecks = () => {
  const text = Form.field({ schema: Schema.String, initial: 'Default' })
  // @ts-expect-error A string field requires a string value.
  text.initialize(undefined)
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
      initial: '',
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
  expectTypeOf<Form.Submission<typeof dataOnly>>().toEqualTypeOf<
    typeof dataOnly.Submission.Type
  >()
  expectTypeOf<
    Extract<Form.Submission<typeof dataOnly>, { _tag: 'Succeeded' }>['data']
  >().toEqualTypeOf<number>()
  expectTypeOf<
    Extract<Form.Submission<typeof dataOnly>, { _tag: 'Failed' }>['error']
  >().toEqualTypeOf<never>()
  expectTypeOf<
    Extract<Form.Submission<typeof errorOnly>, { _tag: 'Succeeded' }>['data']
  >().toEqualTypeOf<void>()
  expectTypeOf<
    Extract<Form.Submission<typeof errorOnly>, { _tag: 'Failed' }>['error']
  >().toEqualTypeOf<string>()
  expectTypeOf<
    Extract<Form.Submission<typeof omitted>, { _tag: 'Succeeded' }>['data']
  >().toEqualTypeOf<void>()
  expectTypeOf<
    Extract<Form.Submission<typeof omitted>, { _tag: 'Failed' }>['error']
  >().toEqualTypeOf<never>()
  expectTypeOf<Form.OutMessage<typeof typed>>().toEqualTypeOf<
    | Readonly<{ _tag: 'SucceededSubmit'; data: number }>
    | Readonly<{ _tag: 'FailedSubmit'; error: string }>
  >()
  expectTypeOf(
    typed.update(typed.init(), typed.blurred('username')).outMessage,
  ).toEqualTypeOf<Form.OutMessage<typeof typed> | undefined>()
  const submit = typed.Submit({
    values: { username: 'Ada' },
    context: undefined,
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
  for (const command of lifted.fold(parent, typed.changed('username', 'Ada'))
    .commands ?? []) {
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
  typed.Submit({
    // @ts-expect-error Submit values retain each field's decoded type.
    values: { username: 2 },
    context: undefined,
    token: { generation: 1 },
  })
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
    username: Form.field({ schema: Schema.String, initial: '' }),
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

class CurrentUser extends Context.Service<
  CurrentUser,
  { readonly id: string }
>()('CurrentUser') {}

const contextTypes = () => {
  const fields = {
    title: Form.field({ schema: Schema.String, initial: '' }),
  }
  const RecordContext = Schema.Struct({ recordId: Schema.String })
  const editing = Form.define({
    name: 'EditRecord',
    fields,
    submit: {
      context: RecordContext,
      execute: (values, context) => {
        expectTypeOf(values).toEqualTypeOf<{ readonly title: string }>()
        expectTypeOf(context).toEqualTypeOf<{ readonly recordId: string }>()
        return Effect.asVoid(CurrentUser)
      },
    },
  })
  const model = editing.init()
  editing.submit(model, { recordId: 'record-1' })
  // @ts-expect-error A Form with a context codec requires the context.
  editing.submit(model)
  // @ts-expect-error The context follows its codec.
  editing.submit(model, { recordId: 1 })
  const submit = editing.Submit({
    values: { title: '' },
    context: { recordId: 'record-1' },
    token: { generation: 1 },
  })
  expectTypeOf<
    Effect.Services<typeof submit.effect>
  >().toEqualTypeOf<CurrentUser>()

  const Parent = Schema.Struct({ form: editing.Model })
  const lifted = editing.lift({
    parentField: 'form',
    toParentMessage: (message: typeof editing.Message.Type) => ({ message }),
  })
  const parent = Parent.make({ form: model })
  lifted.submit(parent, { recordId: 'record-1' })
  // @ts-expect-error The lifted submit requires the context too.
  lifted.submit(parent)

  const plain = Form.define({
    name: 'NoContext',
    fields,
    submit: {
      execute: (_values, context) => {
        expectTypeOf(context).toEqualTypeOf<void>()
        return Effect.void
      },
    },
  })
  plain.submit(plain.init())
  // @ts-expect-error A Form without a context codec takes no context.
  plain.submit(plain.init(), { recordId: 'record-1' })

  Form.define({
    name: 'WrongContext',
    fields,
    submit: {
      context: RecordContext,
      // @ts-expect-error Execution receives the decoded context type.
      execute: (_values, context: { readonly recordId: number }) =>
        Effect.succeed(context).pipe(Effect.asVoid),
    },
  })
  const servicefulContextConfig = {
    name: 'ServicefulContext',
    fields,
    submit: { context: serviceful, execute: () => Effect.void },
  }
  // @ts-expect-error Context codecs must decode without services.
  Form.define(servicefulContextConfig)
}
void contextTypes
