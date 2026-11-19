import { Context, Effect, Option, Result, Schema, SchemaGetter } from 'effect'
import { expectTypeOf } from 'vitest'

import { defineTaggedUnion } from '../../schema/index.js'
import type * as Update from '../../update/index.js'
import * as Form from './index.js'

const fieldNameChecks = () => {
  const textField = Form.field({ schema: Schema.String, initial: '' })
  const symbolName = Symbol('field')
  const symbolFields = { text: textField, [symbolName]: textField }
  const numericFields = { text: textField, 0: textField }

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
  // @ts-expect-error Operations take field names as strings, so numeric names can't be used.
  Form.define(numericFieldsConfig)
  Form.define({
    name: 'StringFields',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: { '0': textField, text: textField },
  })
}
void fieldNameChecks

class UsernameValidator extends Context.Service<
  UsernameValidator,
  { check: (value: string) => ReadonlyArray<string> }
>()('UsernameValidator') {}

class RegistrationStore extends Context.Service<
  RegistrationStore,
  { save: () => void }
>()('RegistrationStore') {}

const validatorPresenceChecks = () => {
  const textField = Form.field({ schema: Schema.String, initial: '' })
  const usernameField = Form.field({
    schema: Schema.String,
    initial: '',
    validate: value =>
      Effect.map(UsernameValidator, service => service.check(value)),
  })

  // @ts-expect-error A validator keeps the services it needs.
  Effect.runSync(usernameField.validate('hello'))
  Form.field({
    schema: Schema.NumberFromString,
    initial: '1',
    // @ts-expect-error A transformed field's validator receives the decoded value.
    validate: (value: string) => Effect.succeed([value]),
  })

  const validatorRequirementsForm = Form.define({
    name: 'ValidatorRequirements',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: { text: textField, username: usernameField },
  })
  const formChange = validatorRequirementsForm.update(
    validatorRequirementsForm.init(),
    validatorRequirementsForm.changed('username', 'next'),
  )
  for (const validateField of formChange.commands ?? []) {
    // @ts-expect-error A field without a validator doesn't drop another field's services.
    Effect.runSync(validateField.effect)
  }

  const validateUsername = validatorRequirementsForm.ValidateField.username({
    value: 'next',
    generation: 1,
  })
  expectTypeOf(validateUsername.args.value).toEqualTypeOf<string>()
  expectTypeOf(
    validateUsername.name,
  ).toEqualTypeOf<'ValidateValidatorRequirementsUsername'>()
  // @ts-expect-error A field's check Command keeps its validator's services.
  Effect.runSync(validateUsername.effect)
  // @ts-expect-error A check Command takes the field's decoded value.
  validatorRequirementsForm.ValidateField.username({ value: 1, generation: 1 })

  const savingRegistrationForm = Form.define({
    name: 'SavingRegistration',
    submit: {
      execute: () => Effect.asVoid(RegistrationStore),
    },
    fields: { username: usernameField },
  })
  expectTypeOf<
    Effect.Services<
      ReturnType<typeof savingRegistrationForm.ValidateField.username>['effect']
    >
  >().toEqualTypeOf<UsernameValidator>()

  Form.field({
    schema: Schema.String,
    initial: '',
    // @ts-expect-error Validation triggers are capitalized literals.
    validateOn: 'blur',
  })
}
void validatorPresenceChecks

const inferredFieldTypes = () => {
  const inferredFieldsForm = Form.define({
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
  expectTypeOf<Form.Values<typeof inferredFieldsForm>>().toEqualTypeOf<{
    readonly email: string
    readonly age: number
    readonly accepted: boolean
  }>()

  const fieldWithoutValidator = Form.field({
    schema: Schema.String,
    initial: '',
  })
  const fieldWithUndefinedValidator = Form.field({
    schema: Schema.String,
    initial: '',
    validate: undefined,
  })
  const ageField = Form.field({
    schema: Schema.NumberFromString,
    initial: '18',
    validate: value => Effect.succeed(value > 0 ? [] : ['Positive only']),
  })
  expectTypeOf(fieldWithoutValidator.validate).toEqualTypeOf<undefined>()
  expectTypeOf(fieldWithUndefinedValidator.validate).toEqualTypeOf<undefined>()
  expectTypeOf(ageField.validate).parameter(0).toEqualTypeOf<number>()
  expectTypeOf<
    Effect.Services<ReturnType<typeof ageField.validate>>
  >().toEqualTypeOf<never>()
}
void inferredFieldTypes

const dynamicValidatorTypes = (
  config: Form.FieldConfig<typeof Schema.String, UsernameValidator>,
) => {
  const definition = Form.field(config)
  expectTypeOf(definition).toEqualTypeOf<
    Form.FieldDefinition<typeof Schema.String, UsernameValidator>
  >()
  if (definition.validate !== undefined) {
    expectTypeOf<
      Effect.Services<ReturnType<typeof definition.validate>>
    >().toEqualTypeOf<UsernameValidator>()
  }
  const dynamicValidatorForm = Form.define({
    name: 'DynamicValidator',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: { username: definition },
  })
  const change = dynamicValidatorForm.update(
    dynamicValidatorForm.init(),
    dynamicValidatorForm.changed('username', 'next'),
  )
  for (const validateField of change.commands ?? []) {
    expectTypeOf<
      Effect.Services<typeof validateField.effect>
    >().toEqualTypeOf<UsernameValidator>()
  }
}
void dynamicValidatorTypes

const registrationForm = Form.define({
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
  registrationForm.changed('age', '21')
  // @ts-expect-error A field name must be paired with that field's input.
  registrationForm.changed(name, value)
  // @ts-expect-error Unknown names are rejected.
  registrationForm.changed('other', 'x')
  // @ts-expect-error initial must match the Schema's encoded side.
  Form.field({ schema: Schema.Number, initial: '18' })
}
void scalarFieldTypeChecks

const encodedInputTypeChecks = () => {
  const ageField = Form.field({ schema: Schema.NumberFromString, initial: '' })
  const encodedInputsForm = Form.define({
    name: 'EncodedInputs',
    submit: { execute: () => Effect.void },
    fields: { age: ageField },
  })
  encodedInputsForm.changed('age', '12a')
  // @ts-expect-error A transformed field changes with its encoded input.
  encodedInputsForm.changed('age', 12)
  // @ts-expect-error A transformed field's initial input is encoded.
  Form.field({ schema: Schema.NumberFromString, initial: 18 })
  encodedInputsForm.init({ age: 12 })
  // @ts-expect-error Overrides are decoded values, not inputs.
  encodedInputsForm.init({ age: '12' })
  expectTypeOf(
    encodedInputsForm.inputs(encodedInputsForm.init()),
  ).toEqualTypeOf<{
    readonly age: string
  }>()
  expectTypeOf<Form.Values<typeof encodedInputsForm>>().toEqualTypeOf<{
    readonly age: number
  }>()
  const ageFieldView = encodedInputsForm.fieldView(
    encodedInputsForm.init(),
    'age',
  )
  expectTypeOf(ageFieldView.input).toEqualTypeOf<string>()
  expectTypeOf(ageFieldView.maybeValue).toEqualTypeOf<Option.Option<number>>()
  expectTypeOf(ageFieldView.meta).toEqualTypeOf<
    Readonly<{
      isTouched: boolean
      isBlurred: boolean
      isEdited: boolean
      isDefaultInput: boolean
    }>
  >()
  encodedInputsForm.Message.ChangedField({
    change: { name: 'age', input: '12a' },
  })
  // @ts-expect-error The change Message carries the encoded input.
  encodedInputsForm.Message.ChangedField({ change: { name: 'age', input: 12 } })
}
void encodedInputTypeChecks

class AuthToken extends Context.Service<
  AuthToken,
  { readonly token: string }
>()('AuthToken') {}
const ServicefulString = Schema.String.pipe(
  Schema.decodeTo(Schema.String, {
    decode: SchemaGetter.transformEffect(value =>
      Effect.gen(function* () {
        yield* AuthToken
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
  // @ts-expect-error Values keep literal types.
  const literalValues: Form.Values<typeof literalForm> = { choice: 'Maybe' }
  void literalValues
  const selectedValues: Form.Values<typeof registrationForm> = {
    email: '',
    // @ts-expect-error Each field keeps its own value type.
    age: '1',
    accepted: false,
  }
  void selectedValues
  registrationForm.Message.ChangedField({
    // @ts-expect-error The change Message keeps each field paired with its input.
    change: { name: 'age', input: '21' },
  })
  // @ts-expect-error A field Schema can't need services to decode.
  Form.field({ schema: ServicefulString, initial: '' })
  // @ts-expect-error A field Schema can't need services to encode.
  Form.field({ schema: Schema.flip(ServicefulString), initial: '' })
  Form.field({
    // @ts-expect-error An optional key is not a field codec.
    schema: Schema.optionalKey(Schema.String),
    initial: '',
  })
  Form.field({
    // @ts-expect-error A Schema whose encoded side is an optional key has no input to store.
    schema: Schema.OptionFromOptionalKey(Schema.String),
    initial: '',
  })
  // @ts-expect-error Each override has its field's decoded type.
  registrationForm.init({ age: '21' })
  // @ts-expect-error Unknown overrides are rejected.
  registrationForm.init({ email: '', extra: '' })
  const overrides = { email: '', extra: '' }
  // @ts-expect-error Unknown overrides are rejected even through a variable.
  registrationForm.init(overrides)
}
void schemaAndOverrideTypeChecks

const optionalInputTypeChecks = () => {
  const presenceForm = Form.define({
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
  presenceForm.changed('selected', null)
  presenceForm.changed('selected', 'Ada')
  presenceForm.Message.ChangedField({
    change: { name: 'selected', input: 'Ada' },
  })
  presenceForm.init({ selected: Option.some('Ada') })
  expectTypeOf<Form.Values<typeof presenceForm>['selected']>().toEqualTypeOf<
    Option.Option<string>
  >()
  // @ts-expect-error The input is the encoded side, not an Option.
  presenceForm.changed('selected', Option.none())
  // @ts-expect-error An input keeps its payload type.
  presenceForm.changed('selected', 1)
  // @ts-expect-error Overrides of an Option field take an Option.
  presenceForm.init({ selected: null })
  // @ts-expect-error A change Message requires an input.
  presenceForm.Message.ChangedField({ change: { name: 'count' } })
  const overrides = { selected: Option.none(), extra: 1 }
  // @ts-expect-error Unknown override keys are rejected through variables.
  presenceForm.init(overrides)
}
void optionalInputTypeChecks

class ProfileStore extends Context.Service<
  ProfileStore,
  { readonly save: (username: string) => Effect.Effect<number, string> }
>()('ProfileStore') {}

const submissionTypes = () => {
  const fields = {
    username: Form.field({
      schema: Schema.String,
      initial: '',
      validate: value =>
        Effect.map(UsernameValidator, service => service.check(value)),
    }),
  }
  const typedForm = Form.define({
    name: 'TypedSubmission',
    fields,
    submit: {
      data: Schema.NumberFromString,
      error: Schema.String,
      execute: values => {
        expectTypeOf(values).toEqualTypeOf<{ readonly username: string }>()
        return Effect.flatMap(ProfileStore, service =>
          service.save(values.username),
        )
      },
    },
  })
  const dataOnlyForm = Form.define({
    name: 'DataOnlySubmission',
    fields,
    submit: {
      data: Schema.Number,
      execute: () => Effect.map(ProfileStore, () => 1),
    },
  })
  const errorOnlyForm = Form.define({
    name: 'ErrorOnlySubmission',
    fields,
    submit: {
      error: Schema.String,
      execute: values =>
        Effect.flatMap(ProfileStore, service =>
          service.save(values.username),
        ).pipe(Effect.asVoid),
    },
  })
  const omittedForm = Form.define({
    name: 'OmittedSubmissionCodecs',
    fields,
    submit: { execute: () => Effect.map(ProfileStore, () => undefined) },
  })
  expectTypeOf(typedForm.Submission.Succeeded({ data: 2 })).toEqualTypeOf<
    Readonly<{ _tag: 'Succeeded'; data: number }>
  >()
  expectTypeOf(
    typedForm.Submission.Failed({
      error: 'Unavailable',
      isShownOnFields: false,
    }),
  ).toEqualTypeOf<
    Readonly<{ _tag: 'Failed'; error: string; isShownOnFields: boolean }>
  >()
  expectTypeOf<
    Extract<Form.Submission<typeof dataOnlyForm>, { _tag: 'Succeeded' }>['data']
  >().toEqualTypeOf<number>()
  expectTypeOf<
    Extract<Form.Submission<typeof dataOnlyForm>, { _tag: 'Failed' }>['error']
  >().toEqualTypeOf<never>()
  expectTypeOf<
    Extract<
      Form.Submission<typeof errorOnlyForm>,
      { _tag: 'Succeeded' }
    >['data']
  >().toEqualTypeOf<void>()
  expectTypeOf<
    Extract<Form.Submission<typeof errorOnlyForm>, { _tag: 'Failed' }>['error']
  >().toEqualTypeOf<string>()
  expectTypeOf<
    Extract<Form.Submission<typeof omittedForm>, { _tag: 'Succeeded' }>['data']
  >().toEqualTypeOf<void>()
  expectTypeOf<
    Extract<Form.Submission<typeof omittedForm>, { _tag: 'Failed' }>['error']
  >().toEqualTypeOf<never>()
  expectTypeOf<Form.OutMessage<typeof typedForm>>().toEqualTypeOf<
    | Readonly<{ _tag: 'SucceededSubmit'; data: number }>
    | Readonly<{ _tag: 'FailedSubmit'; error: string }>
  >()
  expectTypeOf(
    typedForm.update(typedForm.init(), typedForm.blurred('username'))
      .outMessage,
  ).toEqualTypeOf<Form.OutMessage<typeof typedForm> | undefined>()
  const submitTyped = typedForm.Submit({
    values: { username: 'Ada' },
    generation: 1,
  })
  expectTypeOf<
    Effect.Services<typeof submitTyped.effect>
  >().toEqualTypeOf<ProfileStore>()
  for (const formSubmit of [
    typedForm.submit(typedForm.init()),
    dataOnlyForm.submit(dataOnlyForm.init()),
    errorOnlyForm.submit(errorOnlyForm.init()),
    omittedForm.submit(omittedForm.init()),
  ]) {
    for (const command of formSubmit.commands ?? []) {
      expectTypeOf<Effect.Services<typeof command.effect>>().toEqualTypeOf<
        UsernameValidator | ProfileStore
      >()
    }
  }
  // @ts-expect-error Failed requires the decoded error type.
  typedForm.Submission.Failed({ error: 2 })
  // @ts-expect-error Succeeded requires data.
  typedForm.Submission.Succeeded({})
  typedForm.Submit({
    // @ts-expect-error Submit values keep each field's decoded type.
    values: { username: 2 },
    generation: 1,
  })
  typedForm.Message.CompletedSubmit({
    generation: 1,
    // @ts-expect-error CompletedSubmit requires the decoded data type.
    result: Result.succeed('2'),
  })
  typedForm.Message.CompletedSubmit({
    generation: 1,
    // @ts-expect-error CompletedSubmit requires the decoded error type.
    result: Result.fail(2),
  })
  // @ts-expect-error Without an error codec, a submission can't fail with an error.
  dataOnlyForm.Submission.Failed({ error: 'Unavailable' })
  // @ts-expect-error Without a data codec, a submission succeeds with void.
  errorOnlyForm.Submission.Succeeded({ data: 2 })
  // @ts-expect-error The Submit Command needs the services execute uses.
  Effect.runSync(submitTyped.effect)
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
  // @ts-expect-error With both codecs, data must match the data codec.
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
  // @ts-expect-error With both codecs, errors must match the error codec.
  Form.define(wrongErrorWithDataConfig)
  const servicefulDataConfig = {
    name: 'ServicefulData',
    fields,
    submit: { data: ServicefulString, execute: () => Effect.succeed('Ada') },
  }
  // @ts-expect-error Submission data codecs must decode without services.
  Form.define(servicefulDataConfig)
  const servicefulDataEncodingConfig = {
    name: 'ServicefulDataEncoding',
    fields,
    submit: {
      data: Schema.flip(ServicefulString),
      execute: () => Effect.succeed('Ada'),
    },
  }
  // @ts-expect-error Submission data codecs must encode without services.
  Form.define(servicefulDataEncodingConfig)
  const servicefulErrorConfig = {
    name: 'ServicefulError',
    fields,
    submit: {
      error: ServicefulString,
      execute: () => Effect.fail('Unavailable'),
    },
  }
  // @ts-expect-error Submission error codecs must decode without services.
  Form.define(servicefulErrorConfig)
  const servicefulErrorEncodingConfig = {
    name: 'ServicefulErrorEncoding',
    fields,
    submit: {
      error: Schema.flip(ServicefulString),
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
  const editingForm = Form.define({
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
  const model = editingForm.init()
  editingForm.submit(model, { recordId: 'record-1' })
  // @ts-expect-error A Form with a context codec requires the context.
  editingForm.submit(model)
  expectTypeOf(editingForm.Submit.name).toEqualTypeOf<'SubmitEditRecord'>()
  // @ts-expect-error The context follows its codec.
  editingForm.submit(model, { recordId: 1 })
  const submitEditRecord = editingForm.Submit({
    values: { title: '' },
    context: { recordId: 'record-1' },
    generation: 1,
  })
  expectTypeOf<
    Effect.Services<typeof submitEditRecord.effect>
  >().toEqualTypeOf<CurrentUser>()

  const plainForm = Form.define({
    name: 'NoContext',
    fields,
    submit: {
      execute: (_values, context) => {
        expectTypeOf(context).toEqualTypeOf<void>()
        return Effect.void
      },
    },
  })
  plainForm.submit(plainForm.init())
  // @ts-expect-error A Form without a context codec takes no context.
  plainForm.submit(plainForm.init(), { recordId: 'record-1' })

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
    submit: { context: ServicefulString, execute: () => Effect.void },
  }
  // @ts-expect-error Context codecs must decode without services.
  Form.define(servicefulContextConfig)
}
void contextTypes

const Destination = defineTaggedUnion({
  Nowhere: {},
  City: { name: Schema.String },
})
type Destination = typeof Destination.Type
const compoundForm = Form.define({
  name: 'Compound',
  submit: { execute: () => Effect.void },
  fields: {
    topics: Form.field({ schema: Schema.Array(Schema.String), initial: [] }),
    destination: Form.field({
      schema: Destination,
      initial: Destination.Nowhere(),
    }),
  },
})

const compoundInputTypeChecks = (model: typeof compoundForm.Model.Type) => {
  expectTypeOf(compoundForm.fieldView(model, 'topics').input).toEqualTypeOf<
    ReadonlyArray<string>
  >()
  expectTypeOf(
    compoundForm.fieldView(model, 'destination').maybeValue,
  ).toEqualTypeOf<Option.Option<Destination>>()
  compoundForm.changed('destination', Destination.City({ name: 'Paris' }))
  // @ts-expect-error Array members follow the encoded Schema.
  compoundForm.changed('topics', [1])
  compoundForm.Message.ChangedField({
    // @ts-expect-error A tagged input keeps its payload type.
    change: { name: 'destination', input: { _tag: 'City', name: 1 } },
  })
  // @ts-expect-error An array initial input keeps its member types.
  Form.field({ schema: Schema.Array(Schema.String), initial: [1] })
  // @ts-expect-error An array override keeps its member types.
  compoundForm.init({ topics: [1] })
}
void compoundInputTypeChecks

const genericOperations = <Schemas extends Form.FieldSchemas>(
  form: Form.FormDefinition<Schemas>,
  model: ReturnType<Form.FormDefinition<Schemas>['init']>,
  message: Form.FormDefinition<Schemas>['Message']['Type'],
  name: keyof Schemas & string,
) => {
  const formUpdate = form.update(model, message)
  const inputs: Form.FormInputs<Schemas> = form.inputs(formUpdate.model)
  const fieldView: Form.FieldView<Schemas[typeof name]> = form.fieldView(
    model,
    name,
  )
  const formReset = form.reset(formUpdate.model)
  const formReinitialize = form.reinitialize(formReset.model, {})
  const formSubmit = form.submit(formReinitialize.model)
  form.submission(formSubmit.model)
  form.submitCount(formSubmit.model)
  return { inputs, fieldView }
}
void genericOperations

const mixedValidationForm = Form.define({
  name: 'MixedValidation',
  fields: {
    username: Form.field({
      schema: Schema.String,
      initial: '',
      validate: () => Effect.succeed([]),
    }),
    nickname: Form.field({ schema: Schema.String, initial: '' }),
  },
  submit: { execute: () => Effect.void },
})
const genericOperationsOnConcreteForm = () =>
  genericOperations(
    mixedValidationForm,
    mixedValidationForm.init(),
    mixedValidationForm.blurred('nickname'),
    'nickname',
  )
void genericOperationsOnConcreteForm

const concreteModelTypeChecks = (model: typeof compoundForm.Model.Type) => {
  expectTypeOf(compoundForm.init()).toEqualTypeOf<
    typeof compoundForm.Model.Type
  >()
  expectTypeOf(
    compoundForm.update(model, compoundForm.changed('topics', [])),
  ).toEqualTypeOf<
    Update.ReturnWithOutMessage<
      typeof compoundForm.Model.Type,
      typeof compoundForm.Message.Type,
      Form.OutMessage<typeof compoundForm>
    >
  >()
  compoundForm.inputs(compoundForm.Model.make(model))
}
void concreteModelTypeChecks

const schemaParameterChecks = () => {
  const SavedId = Schema.NumberFromString
  const fields = { title: Form.field({ schema: Schema.String, initial: '' }) }
  const savingForm = Form.define({
    name: 'Saving',
    fields,
    submit: {
      data: SavedId,
      error: Schema.String,
      context: Schema.Struct({ recordId: Schema.String }),
      execute: () => Effect.succeed(1),
    },
  })

  expectTypeOf(savingForm).toExtend<
    Form.FormDefinition<
      { readonly title: typeof Schema.String },
      typeof SavedId,
      typeof Schema.String,
      Schema.Struct<{ readonly recordId: typeof Schema.String }>,
      never,
      never,
      'Saving',
      never
    >
  >()
  savingForm.Submission.Succeeded({ data: 1 })
  // @ts-expect-error Succeeded takes the decoded data, a number.
  savingForm.Submission.Succeeded({ data: '1' })
}
void schemaParameterChecks

const messageConstructorChecks = () => {
  const titledForm = Form.define({
    name: 'Titled',
    fields: { title: Form.field({ schema: Schema.String, initial: '' }) },
    submit: { execute: () => Effect.void },
  })

  expectTypeOf(titledForm.changed('title', 'Draft')).toEqualTypeOf<
    typeof titledForm.Message.ChangedField.Type
  >()
  expectTypeOf(titledForm.blurred('title')).toEqualTypeOf<
    typeof titledForm.Message.BlurredField.Type
  >()
}
void messageConstructorChecks

const validateFieldChecks = () => {
  const checkedForm = Form.define({
    name: 'Checked',
    fields: {
      username: Form.field({
        schema: Schema.String,
        initial: '',
        validate: () => Effect.succeed([]),
      }),
      nickname: Form.field({ schema: Schema.String, initial: '' }),
    },
    submit: { execute: () => Effect.void },
  })

  expectTypeOf(
    checkedForm.ValidateField.username.name,
  ).toEqualTypeOf<'ValidateCheckedUsername'>()
  // @ts-expect-error A field without `validate` has no check Command.
  void checkedForm.ValidateField.nickname
}
void validateFieldChecks

const fieldValuesChecks = () => {
  const accountFields = {
    username: Form.field({ schema: Schema.String, initial: '' }),
    age: Form.field({ schema: Schema.NumberFromString, initial: '' }),
  }
  const toAccountChanges = (
    recordId: string,
    values: Form.FieldValues<typeof accountFields>,
  ) => Effect.succeed(`${recordId}:${values.username}:${values.age}`)
  const accountForm = Form.define({
    name: 'Account',
    fields: accountFields,
    submit: {
      data: Schema.String,
      context: Schema.String,
      execute: (values, recordId) => toAccountChanges(recordId, values),
    },
  })

  expectTypeOf<Form.FieldValues<typeof accountFields>>().toEqualTypeOf<
    Form.Values<typeof accountForm>
  >()
  expectTypeOf<Form.FieldValues<typeof accountFields>>().toEqualTypeOf<{
    readonly username: string
    readonly age: number
  }>()
}
void fieldValuesChecks

const changedFieldsChecks = () => {
  const grantsForm = Form.define({
    name: 'Grants',
    fields: {
      canUse: Form.field({ schema: Schema.Boolean, initial: true }),
      age: Form.field({ schema: Schema.NumberFromString, initial: '' }),
    },
    submit: { execute: () => Effect.void },
  })

  expectTypeOf(
    grantsForm.changedFields({ canUse: false, age: '12a' }),
  ).toEqualTypeOf<(typeof grantsForm.Message)['ChangedFields']['Type']>()
  // @ts-expect-error Changes are inputs, not decoded values.
  grantsForm.changedFields({ age: 12 })
  // @ts-expect-error Changes name fields of the Form.
  grantsForm.changedFields({ canUse: false, canDelete: false })
}
void changedFieldsChecks

const requiredFromNullOrChecks = () => {
  const Role = Schema.Literals(['Admin', 'Member'])
  const roleSchema = Form.RequiredFromNullOr(Role, 'Choose a role')

  expectTypeOf<typeof roleSchema.Encoded>().toEqualTypeOf<
    'Admin' | 'Member' | null
  >()
  expectTypeOf<typeof roleSchema.Type>().toEqualTypeOf<'Admin' | 'Member'>()

  const roleForm = Form.define({
    name: 'RoleChoice',
    fields: { role: Form.field({ schema: roleSchema, initial: null }) },
    submit: { execute: () => Effect.void },
  })

  expectTypeOf<Form.Values<typeof roleForm>>().toEqualTypeOf<{
    readonly role: 'Admin' | 'Member'
  }>()
  roleForm.init({ role: 'Admin' })
  // @ts-expect-error Overrides are values, so they can't be null.
  roleForm.init({ role: null })
}
void requiredFromNullOrChecks

const submissionSelectorChecks = () => {
  const noteForm = Form.define({
    name: 'Note',
    fields: { note: Form.field({ schema: Schema.String, initial: '' }) },
    submit: { error: Schema.String, execute: () => Effect.void },
  })
  const recordForm = Form.define({
    name: 'Record',
    fields: { note: Form.field({ schema: Schema.String, initial: '' }) },
    submit: {
      context: Schema.Struct({ recordId: Schema.String }),
      execute: () => Effect.void,
    },
  })
  const model = noteForm.init()

  expectTypeOf(noteForm.formError(model)).toEqualTypeOf<Option.Option<string>>()
  expectTypeOf(noteForm.isSubmitPending(model)).toEqualTypeOf<boolean>()
  noteForm.reinitialize(model, {})
  // @ts-expect-error reinitialize takes overrides; pass {} for the initial inputs.
  noteForm.reinitialize(model)

  noteForm.Submit({ values: { note: '' }, generation: 1 })
  // @ts-expect-error A Form without a context Schema has no Submit context.
  noteForm.Submit({ values: { note: '' }, context: undefined, generation: 1 })
  recordForm.Submit({
    values: { note: '' },
    context: { recordId: 'record-1' },
    generation: 1,
  })
  // @ts-expect-error A Form with a context Schema needs the Submit context.
  recordForm.Submit({ values: { note: '' }, generation: 1 })
}
void submissionSelectorChecks

const fieldsChecks = () => {
  type TextSchema = Form.FieldSchema & Readonly<{ Encoded: string }>

  const textFieldMessages = <Name extends string, Model, Message>(
    form: Form.Fields<Record<Name, TextSchema>, Model, Message>,
    model: Model,
    name: Name,
  ) => {
    const input: string = form.fieldView(model, name).input

    return {
      change: form.changed(name, `${input}!`),
      blur: form.blurred(name),
    }
  }

  const sharedFields = {
    email: Form.field({
      schema: Schema.String,
      initial: '',
      validate: () => Effect.succeed([]),
    }),
  }
  type SharedSchemas = Form.FieldSchemasOf<typeof sharedFields>

  const sharedEmail = <Model, Message>(
    form: Form.Fields<SharedSchemas, Model, Message>,
    model: Model,
  ) => form.inputs(model).email

  const signupForm = Form.define({
    name: 'Signup',
    fields: {
      ...sharedFields,
      age: Form.field({ schema: Schema.NumberFromString, initial: '' }),
      isAgreed: Form.field({ schema: Schema.Boolean, initial: false }),
    },
    submit: {
      data: Schema.String,
      error: Schema.String,
      execute: () => Effect.succeed('saved'),
    },
  })
  const profileForm = Form.define({
    name: 'Profile',
    fields: {
      ...sharedFields,
      bio: Form.field({ schema: Schema.String, initial: '' }),
    },
    submit: {
      context: Schema.Struct({ profileId: Schema.String }),
      execute: () => Effect.void,
    },
  })
  type SignupModel = typeof signupForm.Model.Type
  type SignupMessage = typeof signupForm.Message.Type
  type ProfileModel = typeof profileForm.Model.Type
  type ProfileMessage = typeof profileForm.Message.Type
  type EmailAndAgeSchemas = Readonly<{
    email: typeof Schema.String
    age: typeof Schema.NumberFromString
  }>

  expectTypeOf<SharedSchemas>().toEqualTypeOf<{
    readonly email: typeof Schema.String
  }>()
  expectTypeOf(signupForm).toExtend<
    Form.Fields<SharedSchemas, SignupModel, SignupMessage>
  >()
  expectTypeOf(signupForm).toExtend<
    Form.Fields<EmailAndAgeSchemas, SignupModel, SignupMessage>
  >()
  expectTypeOf(profileForm).not.toExtend<
    Form.Fields<EmailAndAgeSchemas, ProfileModel, ProfileMessage>
  >()

  expectTypeOf(
    textFieldMessages(signupForm, signupForm.init(), 'email'),
  ).toEqualTypeOf<{ change: SignupMessage; blur: SignupMessage }>()
  expectTypeOf(
    textFieldMessages(profileForm, profileForm.init(), 'bio'),
  ).toEqualTypeOf<{ change: ProfileMessage; blur: ProfileMessage }>()
  textFieldMessages(signupForm, signupForm.init(), 'age')
  expectTypeOf(
    sharedEmail(signupForm, signupForm.init()),
  ).toEqualTypeOf<string>()
  expectTypeOf(
    sharedEmail(profileForm, profileForm.init()),
  ).toEqualTypeOf<string>()

  // @ts-expect-error A text field helper rejects a field whose input is a boolean.
  textFieldMessages(signupForm, signupForm.init(), 'isAgreed')
  // @ts-expect-error A text field helper rejects a name that isn't a field.
  textFieldMessages(signupForm, signupForm.init(), 'nickname')
  // @ts-expect-error The Model must belong to the Form passed in.
  textFieldMessages(signupForm, profileForm.init(), 'email')
}
void fieldsChecks

const defineFieldsChecks = () => {
  const usernameField = Form.field({
    schema: Schema.String,
    initial: '',
    validate: value =>
      Effect.map(UsernameValidator, service => service.check(value)),
  })
  const ageField = Form.field({
    schema: Schema.NumberFromString,
    initial: '',
  })
  const accountFields = Form.defineFields({
    username: usernameField,
    age: ageField,
  })
  const declaredForm = Form.define({
    name: 'Declared',
    fields: accountFields,
    submit: { execute: () => Effect.void },
  })
  const inlineForm = Form.define({
    name: 'Inline',
    fields: { username: usernameField, age: ageField },
    submit: { execute: () => Effect.void },
  })
  const validateUsername = declaredForm.ValidateField.username({
    value: 'ada',
    generation: 1,
  })

  expectTypeOf<Form.Values<typeof declaredForm>>().toEqualTypeOf<
    Form.Values<typeof inlineForm>
  >()
  expectTypeOf<
    Effect.Services<typeof validateUsername.effect>
  >().toEqualTypeOf<UsernameValidator>()
  // @ts-expect-error Only a field with `validate` has a check Command.
  void declaredForm.ValidateField.age

  // @ts-expect-error Every value must be a field.
  Form.defineFields({ age: ageField, note: 'Not a field' })
  const symbolName = Symbol('field')
  // @ts-expect-error Field names must be strings.
  Form.defineFields({ [symbolName]: usernameField })
}
void defineFieldsChecks
