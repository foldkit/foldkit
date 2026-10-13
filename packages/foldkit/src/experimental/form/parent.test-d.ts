import { Context, Effect, Option, Result, Schema } from 'effect'
import { expectTypeOf } from 'vitest'

import { defineMessageUnion } from '../../message/index.js'
import { defineTaggedUnion } from '../../schema/index.js'
import { modifyFields } from '../../struct/index.js'
import type * as Update from '../../update/index.js'
import * as Form from './index.js'

const Destination = defineTaggedUnion({
  Nowhere: {},
  City: { name: Schema.String },
})
type Destination = typeof Destination.Type
const typed = Form.define({
  name: 'Typed',
  fields: {
    text: Form.field({ schema: Schema.String, initial: { value: '' } }),
    count: Form.field({ schema: Schema.Number, initial: { value: 0 } }),
    topics: Form.field({
      schema: Schema.Array(Schema.String),
      initial: { value: [] },
    }),
    selected: Form.field({
      schema: Schema.OptionFromNullOr(Schema.String),
      initial: { value: Option.none() },
    }),
    destination: Form.field({
      schema: Destination,
      initial: { value: Destination.Nowhere() },
    }),
    note: Form.field({
      schema: Schema.UndefinedOr(Schema.String),
      initial: { value: 'Note' },
    }),
    choice: Form.field({
      schema: Schema.Literals(['Yes', 'No']),
      initial: { value: 'Yes' },
    }),
  },
  submit: {
    data: Schema.Number,
    error: Schema.String,
    execute: snapshot => {
      expectTypeOf(snapshot.count).toEqualTypeOf<number>()
      expectTypeOf(snapshot.topics).toEqualTypeOf<ReadonlyArray<string>>()
      expectTypeOf(snapshot.selected).toEqualTypeOf<Option.Option<string>>()
      expectTypeOf(snapshot.destination).toEqualTypeOf<Destination>()
      expectTypeOf(snapshot.choice).toEqualTypeOf<'Yes' | 'No'>()
      // @ts-expect-error Submission snapshots preserve numeric field types.
      const invalidCount: string = snapshot.count
      void invalidCount
      return Effect.succeed(snapshot.count)
    },
  },
})
const Parent = Schema.Struct({ form: typed.Model })
type Parent = typeof Parent.Type
const Message = defineMessageUnion({
  GotFormMessage: { message: typed.Message },
})
type Message = typeof Message.Type
const lifted = typed.lift<Parent, Message>({
  parentField: 'form',
  toParentMessage: message => Message.GotFormMessage({ message }),
})

const typeChecks = (
  model: Parent,
  name: 'text' | 'count',
  value: string | number,
) => {
  const values: Form.Values<typeof typed> = typed.values(model.form)
  const number: number = values.count
  const literal: 'Yes' | 'No' = values.choice
  void number
  void literal
  // @ts-expect-error A number value cannot be assigned to string.
  const text: string = values.count
  void text
  const invalidValues: Form.Values<typeof typed> = {
    text: '',
    count: 0,
    topics: [],
    selected: Option.none(),
    destination: Destination.Nowhere(),
    note: undefined,
    // @ts-expect-error A literal codec rejects other strings.
    choice: 'Maybe',
  }
  void invalidValues
  // @ts-expect-error A field change must carry its value.
  typed.Message.ChangedField({ change: { name: 'count', input: {} } })
  typed.Message.ChangedField({
    // @ts-expect-error A numeric field rejects a string in the public constructor.
    change: { name: 'count', input: { value: '1' } },
  })
  // @ts-expect-error A union name cannot pair with an uncorrelated union value.
  typed.changed(name, { value })
  typed.reinitialize(model.form, { count: { value: 2 } })
  lifted.reinitialize(model, { count: { value: 2 } })
  // @ts-expect-error Live overrides preserve numeric field types.
  typed.reinitialize(model.form, { count: { value: '2' } })
  const unknownOverrides = { count: { value: 2 }, extra: { value: '' } }
  // @ts-expect-error Lifted live overrides reject unknown fields through variables.
  lifted.reinitialize(model, unknownOverrides)
  lifted.submit(model)
  const completedSubmit = typed.Message.CompletedSubmit({
    token: { generation: 1 },
    result: Result.succeed(2),
  })
  expectTypeOf(completedSubmit.result).toEqualTypeOf<
    Result.Result<number, string>
  >()
  typed.Message.CompletedSubmit({
    token: { generation: 1 },
    // @ts-expect-error Submission results preserve their configured data type.
    result: Result.succeed('2'),
  })
  const succeeded = typed.Submission.Succeeded({ data: 2 })
  expectTypeOf(succeeded.data).toEqualTypeOf<number>()
  const data = typed.Submission.match<number>(typed.submission(model.form), {
    Idle: () => 0,
    Validating: () => 0,
    Submitting: () => 0,
    Succeeded: ({ data }) => data,
    Failed: () => 0,
  })
  expectTypeOf(data).toEqualTypeOf<number>()
  typed.Submission.Succeeded({
    // @ts-expect-error Submission state preserves its configured data type.
    data: '2',
  })
}
void typeChecks

class SaveService extends Context.Service<
  SaveService,
  { readonly endpoint: string }
>()('SaveService') {}

const compoundTypeChecks = (
  model: Parent,
  name: 'topics' | 'selected',
  value: ReadonlyArray<string> | Option.Option<string>,
) => {
  const codecs: Form.FieldSchemas = {
    topics: Schema.Array(Schema.String),
    selected: Schema.OptionFromNullOr(Schema.String),
    destination: Destination,
  }
  const codec: Form.FieldSchema = Schema.Array(Schema.String)
  void codecs
  void codec
  expectTypeOf(typed.field(model.form, 'topics').value).toEqualTypeOf<
    ReadonlyArray<string>
  >()
  expectTypeOf(typed.values(model.form).selected).toEqualTypeOf<
    Option.Option<string>
  >()
  expectTypeOf(
    typed.values(model.form).destination,
  ).toEqualTypeOf<Destination>()
  typed.changed('topics', { value: ['Effect'] })
  typed.changed('selected', { value: Option.some('Effect') })
  typed.changed('destination', { value: Destination.City({ name: 'Paris' }) })
  typed.Message.ChangedField({
    change: { name: 'topics', input: { value: ['Effect'] } },
  })
  typed.Message.ChangedField({
    change: { name: 'selected', input: { value: Option.none() } },
  })
  typed.Message.ChangedField({
    change: { name: 'destination', input: { value: Destination.Nowhere() } },
  })
  typed.Message.ChangedField({
    change: { name: 'note', input: { value: undefined } },
  })
  typed.init({
    topics: { value: ['Effect'] },
    selected: { value: Option.none() },
    destination: { value: Destination.Nowhere() },
    note: { value: undefined },
  })
  typed.reinitialize(model.form, {
    topics: { value: ['Effect'] },
    selected: { value: Option.some('Effect') },
    destination: { value: Destination.City({ name: 'Paris' }) },
  })
  lifted.reinitialize(model, {
    topics: { value: [] },
    selected: { value: Option.none() },
    destination: { value: Destination.Nowhere() },
  })
  lifted.fold(model, typed.changed('topics', { value: ['Effect'] }))
  const submit = typed.submit(model.form)
  expectTypeOf(submit).toEqualTypeOf<
    Update.Return<typeof typed.Model.Type, typeof typed.Message.Type>
  >()
  expectTypeOf(lifted.submit(model)).toEqualTypeOf<
    Update.Return<Parent, Message>
  >()
  // @ts-expect-error Array members follow the decoded codec.
  typed.changed('topics', { value: [1] })
  // @ts-expect-error An Option cannot change the array field.
  typed.changed('topics', { value: Option.none() })
  // @ts-expect-error A tagged value cannot change the Option field.
  typed.changed('selected', { value: Destination.Nowhere() })
  // @ts-expect-error A union name cannot pair with an uncorrelated compound value.
  typed.changed(name, { value })
  typed.Message.ChangedField({
    // @ts-expect-error Compound Message payloads preserve field/value correlation.
    change: { name: 'destination', input: { value: ['Paris'] } },
  })
  // @ts-expect-error A field whose type includes undefined still requires a value property.
  typed.Message.ChangedField({ change: { name: 'note', input: {} } })
  // @ts-expect-error Array initial values preserve member types.
  Form.field({ schema: Schema.Array(Schema.String), initial: { value: [1] } })
  Form.field({
    schema: Schema.Option(Schema.String),
    // @ts-expect-error Option initial values preserve the wrapped type.
    initial: { value: Option.some(1) },
  })
  Form.field({
    schema: Destination,
    // @ts-expect-error Tagged initial values preserve their payload type.
    initial: { value: { _tag: 'City', name: 1 } },
  })
  // @ts-expect-error Compound override types preserve array members.
  typed.init({ topics: { value: [1] } })
  // @ts-expect-error Compound live overrides preserve Option payloads.
  typed.reinitialize(model.form, { selected: { value: Option.some(1) } })
  lifted.reinitialize(model, {
    // @ts-expect-error Lifted overrides preserve tagged payloads.
    destination: { value: { _tag: 'City', name: 1 } },
  })
  const unknownOverrides = {
    topics: { value: ['Effect'] },
    extra: { value: [] },
  }
  // @ts-expect-error Compound override variables reject unknown fields.
  typed.init(unknownOverrides)
  // @ts-expect-error Lifted compound override variables reject unknown fields.
  lifted.reinitialize(model, unknownOverrides)
  const invalidValues: Form.Values<typeof typed> = {
    text: '',
    count: 0,
    choice: 'Yes',
    selected: Option.none(),
    destination: Destination.Nowhere(),
    note: undefined,
    // @ts-expect-error Values preserve array member types.
    topics: [1],
  }
  void invalidValues
}
void compoundTypeChecks

const ExtendedForm = Schema.Struct({
  ...typed.Model.fields,
  recordId: Schema.String,
})
const ExtendedParent = Schema.Struct({ form: ExtendedForm })
const OptionalParent = Schema.Struct({ form: Schema.optionalKey(typed.Model) })
const WiderParent = Schema.Struct({ form: Schema.Unknown })
const UnionParent = Schema.Struct({
  form: Schema.Union([typed.Model, Schema.String]),
})
const PristineForm = Schema.Struct({
  ...typed.Model.fields,
  submission: typed.Submission.Idle,
})
const NarrowerParent = Schema.Struct({ form: PristineForm })
const EquivalentParent = Schema.Struct({
  form: Schema.Union([typed.Model, PristineForm]),
})
const ExtendedParentUnion = defineTaggedUnion({
  Draft: { form: typed.Model },
  Saved: { form: ExtendedForm },
})
const NarrowerParentUnion = defineTaggedUnion({
  Editable: { form: typed.Model },
  Pristine: { form: PristineForm },
})
const CompleteParentUnion = defineTaggedUnion({
  Draft: { form: typed.Model },
  Saved: { form: typed.Model, recordId: Schema.String },
})
const parentFieldTypeChecks = (model: typeof ExtendedParent.Type) => {
  typed.lift<typeof OptionalParent.Type, Message>({
    // @ts-expect-error A direct reader requires an always-present child.
    parentField: 'form',
    toParentMessage: message => Message.GotFormMessage({ message }),
  })
  typed.lift<typeof WiderParent.Type, Message>({
    // @ts-expect-error A direct reader requires the complete child Model.
    parentField: 'form',
    toParentMessage: message => Message.GotFormMessage({ message }),
  })
  typed.lift<typeof UnionParent.Type, Message>({
    // @ts-expect-error Every union member must be readable as the child Model.
    parentField: 'form',
    toParentMessage: message => Message.GotFormMessage({ message }),
  })
  typed.lift<typeof NarrowerParent.Type, Message>({
    // @ts-expect-error A direct writer must accept every submission state.
    parentField: 'form',
    toParentMessage: message => Message.GotFormMessage({ message }),
  })
  typed.lift<typeof ExtendedParent.Type, Message>({
    // @ts-expect-error A base child replacement does not contain required parent data.
    parentField: 'form',
    toParentMessage: message => Message.GotFormMessage({ message }),
  })
  typed.lift<typeof EquivalentParent.Type, Message>({
    parentField: 'form',
    toParentMessage: message => Message.GotFormMessage({ message }),
  })
  typed.lift<typeof ExtendedParentUnion.Type, Message>({
    // @ts-expect-error Every parent variant must accept a base child replacement.
    parentField: 'form',
    toParentMessage: message => Message.GotFormMessage({ message }),
  })
  typed.lift<typeof NarrowerParentUnion.Type, Message>({
    // @ts-expect-error Every parent variant must accept every submission state.
    parentField: 'form',
    toParentMessage: message => Message.GotFormMessage({ message }),
  })
  typed.lift<typeof CompleteParentUnion.Type, Message>({
    parentField: 'form',
    toParentMessage: message => Message.GotFormMessage({ message }),
  })
  const extended = typed.lift<typeof ExtendedParent.Type, Message>({
    parentField: undefined,
    read: model => Option.some(model.form),
    write: (model, nextForm) =>
      modifyFields(model, {
        form: () =>
          ExtendedForm.make({ ...nextForm, recordId: model.form.recordId }),
      }),
    toParentMessage: message => Message.GotFormMessage({ message }),
  })
  expectTypeOf(
    extended.reinitialize(model).model.form.recordId,
  ).toEqualTypeOf<string>()
  const mixedExtendedConfig = {
    parentField: 'form',
    read: (model: typeof ExtendedParent.Type) => Option.some(model.form),
    write: (
      model: typeof ExtendedParent.Type,
      nextForm: ReturnType<typeof typed.init>,
    ) =>
      modifyFields(model, {
        form: () =>
          ExtendedForm.make({ ...nextForm, recordId: model.form.recordId }),
      }),
    toParentMessage: (message: typeof typed.Message.Type) =>
      Message.GotFormMessage({ message }),
  }
  // @ts-expect-error A full lens cannot also select a direct parent field.
  typed.lift<typeof ExtendedParent.Type, Message>(mixedExtendedConfig)
  const parentField: 'form' = 'form'
  const mixedExactConfig = {
    parentField,
    read: (model: Parent) => Option.some(model.form),
    write: (model: Parent, nextForm: ReturnType<typeof typed.init>) =>
      modifyFields(model, { form: () => nextForm }),
    toParentMessage: (message: typeof typed.Message.Type) =>
      Message.GotFormMessage({ message }),
  }
  // @ts-expect-error A direct parent field cannot also supply a lens writer.
  typed.lift<Parent, Message>(mixedExactConfig)
  typed.lift<Parent, Message>({
    parentField: 'form',
    read: undefined,
    write: undefined,
    toParentMessage: message => Message.GotFormMessage({ message }),
  })
  const toExtendedLens = (
    config: Pick<
      Form.FormLens<
        typeof ExtendedParent.Type,
        Message,
        ReturnType<typeof typed.init>,
        typeof typed.Message.Type
      >,
      'read' | 'write' | 'toParentMessage'
    >,
  ): Form.FormLens<
    typeof ExtendedParent.Type,
    Message,
    ReturnType<typeof typed.init>,
    typeof typed.Message.Type
  > => config
  const erased = typed.lift<typeof ExtendedParent.Type, Message>(
    toExtendedLens(mixedExtendedConfig),
  )
  expectTypeOf(
    erased.reinitialize(model).model.form.recordId,
  ).toEqualTypeOf<string>()
}
void parentFieldTypeChecks

const genericOperations = <C extends Form.FieldSchemas>(
  form: Form.FormDefinition<C>,
  model: ReturnType<Form.FormDefinition<C>['init']>,
  message: Form.FormDefinition<C>['Message']['Type'],
  name: keyof C & string,
) => {
  const formUpdate = form.update(model, message)
  const values: Form.FormValues<C> = form.values(formUpdate.model)
  const view: Form.FieldView<C[typeof name]> = form.field(model, name)
  const formReset = form.reset(formUpdate.model)
  const formReinitialize = form.reinitialize(formReset.model)
  const formSubmit = form.submit(formReinitialize.model)
  form.submission(formSubmit.model)
  form.submitCount(formSubmit.model)
  return { values, view }
}
void genericOperations

const concreteModelTypeChecks = (model: typeof typed.Model.Type) => {
  expectTypeOf(typed.init()).toEqualTypeOf<typeof typed.Model.Type>()
  const formUpdate = typed.update(
    model,
    typed.changed('text', { value: 'Next' }),
  )
  expectTypeOf(formUpdate.model).toEqualTypeOf<typeof typed.Model.Type>()
  typed.values(typed.Model.make(formUpdate.model))
  typed.values(Schema.decodeUnknownSync(typed.Model)(model))
}
void concreteModelTypeChecks

class UsernameValidation extends Context.Service<
  UsernameValidation,
  { readonly errors: ReadonlyArray<string> }
>()('UsernameValidation') {}
class AgeValidation extends Context.Service<
  AgeValidation,
  { readonly errors: ReadonlyArray<string> }
>()('AgeValidation') {}

const servicefulForm = Form.define({
  name: 'Serviceful',
  fields: {
    username: Form.field({
      schema: Schema.String,
      initial: { value: 'initial' },
      validate: () => Effect.map(UsernameValidation, service => service.errors),
    }),
    age: Form.field({
      schema: Schema.NumberFromString,
      initial: { value: 18 },
      validate: () => Effect.map(AgeValidation, service => service.errors),
    }),
    choice: Form.field({
      schema: Schema.Literals(['Yes', 'No']),
      initial: { value: 'Yes' },
    }),
  },
  submit: {
    data: Schema.Struct({ id: Schema.String }),
    error: Schema.String,
    execute: snapshot => {
      expectTypeOf(snapshot.age).toEqualTypeOf<number>()
      return Effect.map(SaveService, service => ({ id: service.endpoint }))
    },
  },
})
const ServicefulParent = Schema.Struct({ form: servicefulForm.Model })
type ServicefulParent = typeof ServicefulParent.Type
const ServicefulMessage = defineMessageUnion({
  GotFormMessage: { message: servicefulForm.Message },
})
type ServicefulMessage = typeof ServicefulMessage.Type
const toServicefulMessage = (
  message: typeof servicefulForm.Message.Type,
): ServicefulMessage => ServicefulMessage.GotFormMessage({ message })
const serviceful = servicefulForm.lift<ServicefulParent, ServicefulMessage>({
  parentField: 'form',
  toParentMessage: toServicefulMessage,
})

const validatorRequirementChecks = (model: ServicefulParent) => {
  const formUpdate = servicefulForm.update(
    model.form,
    servicefulForm.changed('username', { value: 'next' }),
  )
  expectTypeOf(formUpdate).toEqualTypeOf<
    Update.Return<
      typeof servicefulForm.Model.Type,
      typeof servicefulForm.Message.Type,
      UsernameValidation | AgeValidation | SaveService
    >
  >()
  expectTypeOf(servicefulForm.values(model.form)).toEqualTypeOf<{
    readonly username: string
    readonly age: number
    readonly choice: 'Yes' | 'No'
  }>()
  expectTypeOf(servicefulForm.init()).toEqualTypeOf<
    typeof servicefulForm.Model.Type
  >()
  for (const command of formUpdate.commands ?? []) {
    // @ts-expect-error Transitions require validation and submission services.
    Effect.runPromise(command.effect)
    Effect.runPromise(
      // @ts-expect-error Providing one validator leaves other services required.
      command.effect.pipe(
        Effect.provideService(UsernameValidation, { errors: [] }),
      ),
    )
    Effect.runPromise(
      command.effect.pipe(
        Effect.provideService(UsernameValidation, { errors: [] }),
        Effect.provideService(AgeValidation, { errors: [] }),
        Effect.provideService(SaveService, { endpoint: '/save' }),
      ),
    )
  }
  const directSubmit = servicefulForm.submit(model.form)
  const liftedSubmit = serviceful.submit(model)
  expectTypeOf(directSubmit).toEqualTypeOf<
    Update.Return<
      typeof servicefulForm.Model.Type,
      typeof servicefulForm.Message.Type,
      UsernameValidation | AgeValidation | SaveService
    >
  >()
  expectTypeOf(liftedSubmit).toEqualTypeOf<
    Update.Return<
      ServicefulParent,
      ServicefulMessage,
      UsernameValidation | AgeValidation | SaveService
    >
  >()
  expectTypeOf(
    serviceful.fold(model, servicefulForm.blurred('username')),
  ).toEqualTypeOf<
    Update.Return<
      ServicefulParent,
      ServicefulMessage,
      UsernameValidation | AgeValidation | SaveService
    >
  >()
  expectTypeOf(servicefulForm.reset(model.form)).toEqualTypeOf<
    Update.Return<
      typeof servicefulForm.Model.Type,
      typeof servicefulForm.Message.Type
    >
  >()
  const submit = servicefulForm.Submit({
    values: servicefulForm.values(model.form),
    token: { generation: 1 },
  })
  expectTypeOf(submit.effect).toEqualTypeOf<
    Effect.Effect<
      typeof servicefulForm.Message.CompletedSubmit.Type,
      never,
      SaveService
    >
  >()
  Effect.runPromise(
    submit.effect.pipe(
      Effect.provideService(SaveService, { endpoint: '/save' }),
    ),
  )
  const succeeded = servicefulForm.Submission.Succeeded({
    data: { id: 'record' },
  })
  expectTypeOf(succeeded.data).toEqualTypeOf<{ readonly id: string }>()
  // @ts-expect-error The transformed field accepts decoded numeric input.
  servicefulForm.changed('age', { value: '18' })
  // @ts-expect-error The literal field preserves its allowed values.
  servicefulForm.changed('choice', { value: 'Maybe' })
}
void validatorRequirementChecks
