import { Array, Effect, Number, Option, Result, Schema, Struct } from 'effect'
import type { Equivalence } from 'effect'
import type { Simplify } from 'effect/Types'

import * as Command from '../../command/index.js'
import * as FieldValidation from '../../fieldValidation/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { defineTaggedUnion } from '../../schema/index.js'
import { modifyFields } from '../../struct/index.js'
import * as Update from '../../update/index.js'
import * as ChildLens from '../childLens.js'

/** A Schema codec for a field's value. It must decode and encode synchronously
 * without services. Decoded values must be immutable, serializable Model data.
 * Form stores each value in a required property, so optional field keys are
 * not supported.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FieldSchema = Schema.Codec<unknown, unknown, never, never> & {
  readonly '~type.optionality': 'required'
}

/** Schemas indexed by a Form's field names. Used to describe generic Form
 * definitions and their values.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FieldSchemas = Readonly<Record<string, FieldSchema>>

const FieldStatus = defineTaggedUnion({
  NotValidated: {},
  Validating: { generation: Schema.Number },
  Valid: {},
  Invalid: { errors: Schema.NonEmptyArray(Schema.String) },
})
type FieldStatus = typeof FieldStatus.Type

const FieldState = <S extends FieldSchema>(value: S) =>
  Schema.Struct({
    input: Schema.Struct({ value }),
    validation: FieldStatus,
    validationGeneration: Schema.Number,
    defaultInput: Schema.Struct({ value }),
    isTouched: Schema.Boolean,
    isBlurred: Schema.Boolean,
    isDirty: Schema.Boolean,
  })

/** A field's decoded value in the required `value` property. Used by initial
 * values, overrides, and change Messages. An `Option` value can represent
 * an optional domain value without omitting the property.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FieldInput<S extends FieldSchema> = Schema.Struct.View<
  { readonly value: S },
  'Type',
  never,
  never
>

type Validator<S extends FieldSchema, R> = (
  value: S['Type'],
) => Effect.Effect<ReadonlyArray<string>, string, R>

type FieldState<S extends FieldSchema> = ReturnType<
  typeof FieldState<
    Schema.Codec<S['Type'], S['Encoded']> & {
      readonly '~type.optionality': 'required'
      readonly '~type.mutability': 'readonly'
    }
  >
>['Type']

type ValidationMode = 'FirstError' | 'AllErrors'

/** When a field runs its validation: after each change or after blur.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type ValidationTrigger = 'Change' | 'Blur'

type FieldConfigBase<S extends FieldSchema> = Readonly<{
  schema: S
  initial: NoInfer<FieldInput<S>>
  validateOn?: ValidationTrigger
  rules?: FieldValidation.Rules<NoInfer<S['Type']>>
}>

/** Field configuration with an optional asynchronous validator. Its services
 * become requirements of the Form's validation Commands.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FieldConfig<S extends FieldSchema, R = never> = FieldConfigBase<S> &
  Readonly<{ validate?: Validator<S, R> | undefined }>

type FieldDefinitionBase<S extends FieldSchema> = Readonly<{
  schema: S
  /** The Schema for a live field's input, validation, and interaction state. */
  State: ReturnType<typeof FieldState<S>>
  equivalence: Equivalence.Equivalence<S['Type']>
  initialize: {
    (): FieldState<S>
    (input: FieldInput<S>): FieldState<S>
  }
  /** Checks the decoded value against synchronous rules. Returns its validation status. */
  validate: (value: S['Type'], mode: ValidationMode) => FieldStatus
  /** Returns whether the status permits submission. Pending validation does not. */
  isValid: (state: FieldStatus) => boolean
  validateOn: ValidationTrigger
}>

type FieldDefinitionWithValidator<
  S extends FieldSchema,
  R,
> = FieldDefinitionBase<S> & Readonly<{ validator: Validator<S, R> }>

type FieldDefinitionWithoutValidator<S extends FieldSchema> =
  FieldDefinitionBase<S> & Readonly<{ validator?: never }>

/** Reusable field configuration created by {@link field}. Each Form instance
 * stores its own value and validation state. The validator is present only
 * when asynchronous validation was supplied.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FieldDefinition<S extends FieldSchema, R = never> =
  | FieldDefinitionWithValidator<S, R>
  | FieldDefinitionWithoutValidator<S>

/** Defines a field's Schema, initial value, and validation. Reuse the definition
 * in multiple Forms to share field configuration.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export function field<S extends FieldSchema, R = never>(
  config: FieldConfigBase<S> & Readonly<{ validate: Validator<S, R> }>,
): FieldDefinitionWithValidator<S, R>
export function field<S extends FieldSchema>(
  config: FieldConfigBase<S> & Readonly<{ validate?: undefined }>,
): FieldDefinitionWithoutValidator<S>
export function field<S extends FieldSchema, R = never>(
  config: FieldConfig<S, R>,
): FieldDefinition<S, R>
export function field<S extends FieldSchema, R = never>(
  config: FieldConfig<S, R>,
): FieldDefinition<S, R> {
  const State = FieldState(config.schema)
  const equivalence = Schema.toEquivalence(config.schema)
  const rules = config.rules ?? FieldValidation.makeRules<S['Type']>()
  const validateRules = FieldValidation.validate(rules)
  const validateAllRules = FieldValidation.validateAll(rules)
  const toStatus = (
    validation: FieldValidation.Field<S['Type']>,
  ): FieldStatus =>
    FieldValidation.match(validation, {
      onNotValidated: () => FieldStatus.NotValidated(),
      onValidating: () => FieldStatus.NotValidated(),
      onValid: () => FieldStatus.Valid(),
      onInvalid: ({ errors }) => FieldStatus.Invalid({ errors }),
    })
  const validate = (value: S['Type'], mode: ValidationMode) =>
    toStatus((mode === 'AllErrors' ? validateAllRules : validateRules)(value))
  function initialize(input?: FieldInput<S>): FieldState<S> {
    const defaultInput = input ?? config.initial

    return {
      input: defaultInput,
      validation: FieldStatus.NotValidated(),
      validationGeneration: 0,
      defaultInput,
      isTouched: false,
      isBlurred: false,
      isDirty: false,
    }
  }

  const definition: FieldDefinitionBase<S> = {
    schema: config.schema,
    State,
    equivalence,
    initialize,
    validate,
    isValid: state =>
      state._tag === 'Valid' ||
      (state._tag === 'NotValidated' && !FieldValidation.isRequired(rules)),
    validateOn: config.validateOn ?? 'Change',
  }

  if (config.validate === undefined) {
    return definition
  } else {
    return { ...definition, validator: config.validate }
  }
}

/** The value, errors, and interaction metadata returned by a Form's field
 * selector. Used to render a control and its validation feedback.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FieldView<S extends FieldSchema> = FieldInput<S> &
  Readonly<{
    errors: ReadonlyArray<string>
    meta: Readonly<{
      isTouched: boolean
      isBlurred: boolean
      isDirty: boolean
      isDefaultValue: boolean
    }>
  }>

type FieldDefinitions<
  Schemas extends FieldSchemas,
  FieldRequirements = never,
> = Readonly<{
  [Name in keyof Schemas]: Name extends string
    ? FieldDefinition<Schemas[Name], FieldRequirements>
    : never
}>

interface FieldValueLambda extends Struct.Lambda {
  <Value>(state: Readonly<{ input: Readonly<{ value: Value }> }>): Value
  readonly '~lambda.in': Readonly<{ input: Readonly<{ value: unknown }> }>
  readonly '~lambda.out': this['~lambda.in']['input']['value']
}
const fieldValueLambda = Struct.lambda<FieldValueLambda>(
  state => state.input.value,
)

interface FieldUpdateStateLambda extends Struct.Lambda {
  <State>(step: Readonly<{ state: State }>): State
  readonly '~lambda.in': Readonly<{ state: unknown }>
  readonly '~lambda.out': this['~lambda.in']['state']
}
const fieldUpdateStateLambda = Struct.lambda<FieldUpdateStateLambda>(
  step => step.state,
)

interface StateLambda extends Struct.Lambda {
  <S extends FieldSchema, FieldRequirements>(
    definition: FieldDefinition<S, FieldRequirements>,
  ): ReturnType<typeof FieldState<S>>
  readonly '~lambda.in': Readonly<{ State: Schema.Constraint }>
  readonly '~lambda.out': this['~lambda.in']['State']
}

const State = Struct.lambda<StateLambda>(definition => definition.State)

type FieldChanges<Schemas extends FieldSchemas> = Readonly<{
  [Name in keyof Schemas & string]: Schema.Struct<{
    name: Schema.Literal<Name>
    input: Schema.Struct<{ value: Schemas[Name] }>
  }>
}>

const mapFields = <
  Schemas extends FieldSchemas,
  Output extends Readonly<{ [Name in keyof Schemas & string]: unknown }>,
  FieldRequirements = never,
>(
  fields: FieldDefinitions<Schemas, FieldRequirements>,
  build: <Name extends keyof Schemas & string>(
    name: Name,
    definition: FieldDefinition<Schemas[Name], FieldRequirements>,
  ) => Output[Name],
): Output => {
  const output: Record<string, unknown> = {}
  for (const name of Struct.keys(fields)) {
    Object.defineProperty(output, name, {
      value: build(name, fields[name]),
      enumerable: true,
    })
  }

  // NOTE: Struct.map cannot pass keys to its Lambda, so this boundary recovers the completed record.
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return output as Output
}

const FieldChange = <Name extends string, Codec extends FieldSchema>(
  name: Name,
  Value: Codec,
) =>
  Schema.Struct({
    name: Schema.Literal(name),
    input: Schema.Struct({ value: Value }),
  })

const FieldChanges = <Schemas extends FieldSchemas, FieldRequirements = never>(
  fields: FieldDefinitions<Schemas, FieldRequirements>,
): FieldChanges<Schemas> =>
  mapFields<Schemas, FieldChanges<Schemas>, FieldRequirements>(
    fields,
    <Name extends keyof Schemas & string>(
      name: Name,
      definition: FieldDefinition<Schemas[Name], FieldRequirements>,
    ) => FieldChange<Name, Schemas[Name]>(name, definition.schema),
  )

const ValidationResult = Schema.Result(
  Schema.Array(Schema.String),
  Schema.String,
)

function FormMessage<
  Schemas extends FieldSchemas,
  A,
  AI,
  E,
  EI,
  FieldRequirements = never,
>(
  fields: FieldDefinitions<Schemas, FieldRequirements>,
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
) {
  const Changes = FieldChanges(fields)
  const names = Struct.keys(fields)
  return defineMessageUnion({
    ChangedField: {
      change: Schema.Union(Struct.keys(Changes).map(name => Changes[name])),
    },
    BlurredField: { name: Schema.Literals(names) },
    CompletedSubmit: {
      token: SubmissionToken,
      result: Schema.Result(data, error),
    },
    CompletedValidateField: {
      name: Schema.Literals(names),
      generation: Schema.Number,
      result: ValidationResult,
    },
  })
}

const SubmissionToken = Schema.Struct({ generation: Schema.Number })
type SubmissionToken = typeof SubmissionToken.Type

const Submission = <A, AI, E, EI>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
) =>
  defineTaggedUnion({
    Idle: {},
    Validating: { token: SubmissionToken },
    Submitting: { token: SubmissionToken },
    Succeeded: {
      data: Schema.make<
        Schema.Codec<A, AI> & {
          readonly '~type.make.in': A
          readonly '~type.make': A
        }
      >(data.ast),
    },
    Failed: {
      error: Schema.make<
        Schema.Codec<E, EI> & {
          readonly '~type.make.in': E
          readonly '~type.make': E
        }
      >(error.ast),
    },
  })

/** The submission lifecycle with typed success data and errors.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type Submission<A, E> = ReturnType<typeof Submission<A, A, E, E>>['Type']

type FieldStates<Schemas extends FieldSchemas> = Readonly<{
  [Name in keyof Schemas & string]: FieldState<Schemas[Name]>
}>

type FormState<Schemas extends FieldSchemas, A, E> = Simplify<
  Readonly<{
    fields: FieldStates<Schemas>
    submission: Submission<A, E>
    submitCount: number
    generation: number
  }>
>

const FormModel = <
  Schemas extends FieldSchemas,
  A,
  AI,
  E,
  EI,
  FieldRequirements = never,
>(
  fields: FieldDefinitions<Schemas, FieldRequirements>,
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
) =>
  Schema.Struct({
    fields: Schema.Struct(Struct.map(fields, State)),
    submission: Submission(data, error),
    submitCount: Schema.Number,
    generation: Schema.Number,
  })

/** The values returned by one Form definition's values selector. Used to
 * annotate functions that consume submitted values.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type Values<Definition extends { values: (...args: never) => unknown }> =
  ReturnType<Definition['values']>

type ChangeArgs<Schemas extends FieldSchemas> = {
  [Name in keyof Schemas & string]: readonly [
    name: Name,
    input: FieldInput<Schemas[Name]>,
  ]
}[keyof Schemas & string]

type FormModel<Schemas extends FieldSchemas, A, AI, E, EI> = ReturnType<
  typeof FormModel<Schemas, A, AI, E, EI>
>
type FormMessage<Schemas extends FieldSchemas, A, AI, E, EI> = ReturnType<
  typeof FormMessage<Schemas, A, AI, E, EI>
>
/** Decoded field values indexed by name. Used to describe values consumed by
 * generic Form helpers and submission execution.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FormValues<Schemas extends FieldSchemas> = Schema.Struct.View<
  Pick<Schemas, keyof Schemas & string>,
  'Type',
  never,
  never
>

type FormValuesEncoded<Schemas extends FieldSchemas> = Schema.Struct.View<
  Pick<Schemas, keyof Schemas & string>,
  'Encoded',
  never,
  never
>

/** Decoded field inputs indexed by name. Partial records supply overrides to
 * init and reinitialize. Omitted fields use their configured initial inputs.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FormInputs<Schemas extends FieldSchemas> = Readonly<{
  [Name in keyof Schemas & string]: FieldInput<Schemas[Name]>
}>

/** Form operations lifted to a parent Model and Message.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type LiftedForm<
  Schemas extends FieldSchemas,
  ParentModel,
  ParentMessage,
  Requirements = never,
  A = void,
  AI = A,
  E = never,
  EI = E,
> = Readonly<{
  /** Applies a child Message and maps validation and submission Commands to parent Messages. */
  fold: Update.Fold<
    ParentModel,
    ParentMessage,
    FormMessage<Schemas, A, AI, E, EI>['Type'],
    Requirements
  >
  /** Restores defaults and clears interaction and submission state, preserving generations. */
  reset: Update.Step<ParentModel, ParentMessage>
  /** Replaces defaults and clears interaction and submission state, preserving generations. */
  reinitialize: <Overrides extends Partial<FormInputs<Schemas>>>(
    model: ParentModel,
    overrides?: Overrides &
      Record<Exclude<keyof Overrides, keyof Schemas>, never>,
  ) => Update.Return<ParentModel, ParentMessage>
  /** Checks every field and returns validation or submission Commands for a new attempt. */
  submit: (
    model: ParentModel,
  ) => Update.Return<ParentModel, ParentMessage, Requirements>
}>

/** A Form's Schemas, selectors, and update functions. Submission is owned by
 * the Form and configured when the definition is created.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export interface FormDefinition<
  Schemas extends FieldSchemas,
  Requirements = never,
  A = void,
  AI = A,
  E = never,
  EI = E,
  SubmitRequirements = Requirements,
  FieldRequirements = Requirements,
> {
  /** The Schema for field state and submission state. */
  readonly Model: FormModel<Schemas, A, AI, E, EI>
  /** The Schema for field changes, blur events, and validation and submission completions. */
  readonly Message: FormMessage<Schemas, A, AI, E, EI>
  /** The submission union for this definition's success and error codecs. */
  readonly Submission: ReturnType<typeof Submission<A, AI, E, EI>>
  /** Submission Command factory for Story and Scene matching. Start attempts
   * through submit so the Model and token advance together. */
  readonly Submit: Command.CommandDefinitionWithArgs<
    string,
    {
      readonly values: Schema.Codec<
        FormValues<Schemas>,
        FormValuesEncoded<Schemas>
      >
      readonly token: typeof SubmissionToken
    },
    Effect.Effect<
      Extract<
        FormMessage<Schemas, A, AI, E, EI>['Type'],
        { _tag: 'CompletedSubmit' }
      >,
      never,
      SubmitRequirements
    >
  >
  /** Per-field validation Command factories for Story and Scene matching. */
  readonly ValidateField: ValidateFieldCommands<
    Schemas,
    Extract<
      FormMessage<Schemas, A, AI, E, EI>['Type'],
      { _tag: 'CompletedValidateField' }
    >,
    FieldRequirements
  >
  /** Creates clean state. Overrides become reset defaults. Use reset or
   * reinitialize to replace a live instance and preserve request generations. */
  readonly init: <Overrides extends Partial<FormInputs<Schemas>>>(
    overrides?: Overrides &
      Record<Exclude<keyof Overrides, keyof Schemas>, never>,
  ) => FormState<Schemas, A, E>
  /** Creates a change Message from a field's decoded input. */
  readonly changed: (
    ...args: ChangeArgs<Schemas>
  ) => FormMessage<Schemas, A, AI, E, EI>['Type']
  /** Creates a blur Message for a field. */
  readonly blurred: (
    name: keyof Schemas & string,
  ) => FormMessage<Schemas, A, AI, E, EI>['Type']
  /** Returns the decoded value of every field, indexed by name. */
  readonly values: (model: FormState<Schemas, A, E>) => FormValues<Schemas>
  /** Returns a field's value, errors, and interaction metadata. */
  readonly field: <Name extends keyof Schemas & string>(
    model: FormState<Schemas, A, E>,
    name: Name,
  ) => FieldView<Schemas[Name]>
  /** Returns the submission state, including typed success data or error. */
  readonly submission: (model: FormState<Schemas, A, E>) => Submission<A, E>
  /** Returns attempts since init, reset, or reinitialize. Pending repeated submits are ignored. */
  readonly submitCount: (model: FormState<Schemas, A, E>) => number
  /** Applies a Message and returns validation or submission Commands. */
  readonly update: (
    model: FormState<Schemas, A, E>,
    message: FormMessage<Schemas, A, AI, E, EI>['Type'],
  ) => Update.Return<
    FormState<Schemas, A, E>,
    FormMessage<Schemas, A, AI, E, EI>['Type'],
    Requirements
  >
  /** Restores defaults and clears interaction and submission state, preserving generations. */
  readonly reset: (
    model: FormState<Schemas, A, E>,
  ) => Update.Return<
    FormState<Schemas, A, E>,
    FormMessage<Schemas, A, AI, E, EI>['Type']
  >
  /** Replaces defaults and clears interaction and submission state, preserving generations. */
  readonly reinitialize: <Overrides extends Partial<FormInputs<Schemas>>>(
    model: FormState<Schemas, A, E>,
    overrides?: Overrides &
      Record<Exclude<keyof Overrides, keyof Schemas>, never>,
  ) => Update.Return<
    FormState<Schemas, A, E>,
    FormMessage<Schemas, A, AI, E, EI>['Type']
  >
  /** Checks all fields for a new attempt. Validation completions automatically
   * return the Submit Command when every field is valid. Invalid attempts
   * return to Idle after all checks finish. Repeated pending submits are ignored. */
  readonly submit: (
    model: FormState<Schemas, A, E>,
  ) => Update.Return<
    FormState<Schemas, A, E>,
    FormMessage<Schemas, A, AI, E, EI>['Type'],
    Requirements
  >
  /** Lifts Form operations through a required parent field or a child lens. */
  readonly lift: {
    <ParentModel, ParentMessage>(
      config: ParentFieldConfig<
        ParentModel,
        ParentMessage,
        FormState<Schemas, A, E>,
        FormMessage<Schemas, A, AI, E, EI>['Type']
      >,
    ): LiftedForm<
      Schemas,
      ParentModel,
      ParentMessage,
      Requirements,
      A,
      AI,
      E,
      EI
    >
    <ParentModel, ParentMessage>(
      config: FormLens<
        ParentModel,
        ParentMessage,
        FormState<Schemas, A, E>,
        FormMessage<Schemas, A, AI, E, EI>['Type']
      >,
    ): LiftedForm<
      Schemas,
      ParentModel,
      ParentMessage,
      Requirements,
      A,
      AI,
      E,
      EI
    >
  }
}

type ValidateFieldCommand<
  S extends FieldSchema,
  CompletedMessage,
  FieldRequirements,
> = Command.CommandDefinitionWithArgs<
  string,
  {
    readonly value: Schema.Codec<S['Type'], S['Encoded']>
    readonly generation: typeof Schema.Number
  },
  Effect.Effect<CompletedMessage, never, FieldRequirements>
>

type ValidateFieldCommands<
  Schemas extends FieldSchemas,
  CompletedMessage,
  FieldRequirements,
> = Readonly<{
  [Name in keyof Schemas & string]: ValidateFieldCommand<
    Schemas[Name],
    CompletedMessage,
    FieldRequirements
  >
}>

type ValidatorRequirements<Definition> = Definition extends {
  readonly validator: (
    ...args: never
  ) => Effect.Effect<ReadonlyArray<string>, string, unknown>
}
  ? Effect.Services<ReturnType<Definition['validator']>>
  : never

type RequirementsOf<Fields> = ValidatorRequirements<Fields[keyof Fields]>

type SubmitEffectFor<SubmitEffect, A, E> = SubmitEffect &
  ([Effect.Success<NoInfer<SubmitEffect>>] extends [NoInfer<A>]
    ? unknown
    : never) &
  ([Effect.Error<NoInfer<SubmitEffect>>] extends [NoInfer<E>] ? unknown : never)

/** Creates a Form definition from named fields and submission execution.
 * Supply a data codec when execution returns success data and an error codec
 * when execution can fail. Both codecs must decode and encode without services.
 * Its init operation creates an instance. Its lift operation adapts Form
 * Messages to a parent update handler.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export function define<
  const Schemas extends FieldSchemas,
  const Fields extends FieldDefinitions<Schemas, unknown>,
  A,
  AI,
  E,
  EI,
  SubmitEffect extends Effect.Effect<NoInfer<A>, NoInfer<E>, unknown>,
>(
  config: Readonly<{
    name: string
    fields: Fields &
      FieldDefinitions<Schemas, unknown> &
      Record<Exclude<keyof Fields, string>, never>
    submit: Readonly<{
      data: Schema.Codec<A, AI, never, never>
      error: Schema.Codec<E, EI, never, never>
      execute: (
        values: NoInfer<FormValues<Schemas>>,
      ) => SubmitEffectFor<SubmitEffect, A, E>
    }>
  }>,
): FormDefinition<
  Schemas,
  RequirementsOf<Fields> | Effect.Services<SubmitEffect>,
  A,
  AI,
  E,
  EI,
  Effect.Services<SubmitEffect>,
  RequirementsOf<Fields>
>
export function define<
  const Schemas extends FieldSchemas,
  const Fields extends FieldDefinitions<Schemas, unknown>,
  A,
  AI,
  SubmitEffect extends Effect.Effect<NoInfer<A>, never, unknown>,
>(
  config: Readonly<{
    name: string
    fields: Fields &
      FieldDefinitions<Schemas, unknown> &
      Record<Exclude<keyof Fields, string>, never>
    submit: Readonly<{
      data: Schema.Codec<A, AI, never, never>
      error?: undefined
      execute: (
        values: NoInfer<FormValues<Schemas>>,
      ) => SubmitEffectFor<SubmitEffect, A, never>
    }>
  }>,
): FormDefinition<
  Schemas,
  RequirementsOf<Fields> | Effect.Services<SubmitEffect>,
  A,
  AI,
  never,
  never,
  Effect.Services<SubmitEffect>,
  RequirementsOf<Fields>
>
export function define<
  const Schemas extends FieldSchemas,
  const Fields extends FieldDefinitions<Schemas, unknown>,
  E,
  EI,
  SubmitEffect extends Effect.Effect<void, NoInfer<E>, unknown>,
>(
  config: Readonly<{
    name: string
    fields: Fields &
      FieldDefinitions<Schemas, unknown> &
      Record<Exclude<keyof Fields, string>, never>
    submit: Readonly<{
      data?: undefined
      error: Schema.Codec<E, EI, never, never>
      execute: (
        values: NoInfer<FormValues<Schemas>>,
      ) => SubmitEffectFor<SubmitEffect, void, E>
    }>
  }>,
): FormDefinition<
  Schemas,
  RequirementsOf<Fields> | Effect.Services<SubmitEffect>,
  void,
  void,
  E,
  EI,
  Effect.Services<SubmitEffect>,
  RequirementsOf<Fields>
>
export function define<
  const Schemas extends FieldSchemas,
  const Fields extends FieldDefinitions<Schemas, unknown>,
  SubmitEffect extends Effect.Effect<void, never, unknown>,
>(
  config: Readonly<{
    name: string
    fields: Fields &
      FieldDefinitions<Schemas, unknown> &
      Record<Exclude<keyof Fields, string>, never>
    submit: Readonly<{
      data?: undefined
      error?: undefined
      execute: (
        values: NoInfer<FormValues<Schemas>>,
      ) => SubmitEffectFor<SubmitEffect, void, never>
    }>
  }>,
): FormDefinition<
  Schemas,
  RequirementsOf<Fields> | Effect.Services<SubmitEffect>,
  void,
  void,
  never,
  never,
  Effect.Services<SubmitEffect>,
  RequirementsOf<Fields>
>
export function define<
  Schemas extends FieldSchemas,
  A,
  AI,
  E,
  EI,
  FieldRequirements = never,
  SubmitRequirements = never,
>(
  config: Readonly<{
    name: string
    fields: FieldDefinitions<Schemas, FieldRequirements>
    submit: Readonly<{
      data?: Schema.Codec<A, AI, never, never> | undefined
      error?: Schema.Codec<E, EI, never, never> | undefined
      execute: (
        values: NoInfer<FormValues<Schemas>>,
      ) => Effect.Effect<A | void, E, SubmitRequirements>
    }>
  }>,
): unknown {
  const definitions = config.fields
  const names = Struct.keys(definitions)

  const data: Schema.Codec<A | void, AI | void> =
    config.submit.data ?? Schema.Void
  const error: Schema.Codec<E, EI> = config.submit.error ?? Schema.Never

  const SubmissionState = Submission(data, error)

  const Model = FormModel(definitions, data, error).annotate({
    identifier: `${config.name}FormModel`,
  })

  const Message = FormMessage(definitions, data, error)

  const valueSchemas = mapFields<
    Schemas,
    Pick<Schemas, keyof Schemas & string>,
    FieldRequirements
  >(definitions, (_name, definition) => definition.schema)

  const Values = Schema.make<
    Schema.Codec<FormValues<Schemas>, FormValuesEncoded<Schemas>>
  >(Schema.Struct(valueSchemas).ast)

  const Submit = Command.define(`Submit${config.name}`, {
    args: { values: Values, token: SubmissionToken },
    messages: [Message.CompletedSubmit],
    execute: ({ values, token }) =>
      config.submit.execute(values).pipe(
        Effect.result,
        Effect.map(result => Message.CompletedSubmit({ token, result })),
      ),
  })

  const statusEquivalence = Schema.toEquivalence(FieldStatus)

  type Model = FormState<Schemas, A | void, E>
  type Message = typeof Message.Type
  type States = FieldStates<Schemas>
  type UpdateReturn = Update.Return<
    Model,
    Message,
    FieldRequirements | SubmitRequirements
  >
  type PureUpdateReturn = Update.Return<Model, Message>

  type FieldUpdate<S extends FieldSchema> = Readonly<{
    state: FieldState<S>
    maybeCommand: Option.Option<
      Command.Command<Message, never, FieldRequirements>
    >
  }>

  type FieldUpdates = Readonly<{
    [Name in keyof Schemas & string]: FieldUpdate<Schemas[Name]>
  }>

  type CompletedValidateField = Extract<
    Message,
    { _tag: 'CompletedValidateField' }
  >

  const defineValidateField = <Name extends keyof Schemas & string>(
    name: Name,
    definition: FieldDefinition<Schemas[Name], FieldRequirements>,
  ): ValidateFieldCommand<
    Schemas[Name],
    CompletedValidateField,
    FieldRequirements
  > =>
    Command.define(`Validate${config.name}:${name}`, {
      args: {
        value: Schema.make<
          Schema.Codec<Schemas[Name]['Type'], Schemas[Name]['Encoded']>
        >(definition.schema.ast),
        generation: Schema.Number,
      },
      messages: [Message.CompletedValidateField],
      execute: ({ value, generation }) =>
        (definition.validator === undefined
          ? Effect.succeed(Array.empty<string>())
          : definition.validator(value)
        ).pipe(
          Effect.result,
          Effect.map(result =>
            Message.CompletedValidateField({ name, generation, result }),
          ),
        ),
    })

  const ValidateField = mapFields<
    Schemas,
    ValidateFieldCommands<Schemas, CompletedValidateField, FieldRequirements>,
    FieldRequirements
  >(definitions, defineValidateField)

  function validateField<Name extends keyof Schemas & string>(
    name: Name,
    state: FieldState<Schemas[Name]>,
    options: Readonly<{ mode: ValidationMode; isSameValue: boolean }>,
  ): FieldUpdate<Schemas[Name]> {
    const definition = definitions[name]
    const validation = definition.validate(state.input.value, options.mode)

    if (validation._tag !== 'Valid' || definition.validator === undefined) {
      return {
        state: statusEquivalence(validation, state.validation)
          ? state
          : { ...state, validation },
        maybeCommand: Option.none(),
      }
    }

    if (
      options.isSameValue &&
      (state.validation._tag === 'Valid' ||
        state.validation._tag === 'Validating')
    ) {
      return { state, maybeCommand: Option.none() }
    }

    const validationGeneration = Number.increment(state.validationGeneration)

    return {
      state: {
        ...state,
        validationGeneration,
        validation: FieldStatus.Validating({
          generation: validationGeneration,
        }),
      },
      maybeCommand: Option.some(
        ValidateField[name]({
          value: state.input.value,
          generation: validationGeneration,
        }),
      ),
    }
  }

  const replaceField = <Name extends keyof Schemas & string>(
    fields: States,
    name: Name,
    state: FieldState<Schemas[Name]>,
  ): States => ({ ...fields, [name]: state })

  const assembleFieldUpdates = (steps: FieldUpdates) => ({
    fields: Struct.map(steps, fieldUpdateStateLambda),
    commands: Array.getSomes(
      Array.map(names, name => steps[name].maybeCommand),
    ),
  })

  function init<Overrides extends Partial<FormInputs<Schemas>>>(
    overrides?: Overrides &
      Record<Exclude<keyof Overrides, keyof Schemas>, never>,
  ): Model {
    const fields = mapFields<Schemas, States, FieldRequirements>(
      definitions,
      (name, definition) =>
        overrides !== undefined && Object.hasOwn(overrides, name)
          ? definition.initialize(overrides[name])
          : definition.initialize(),
    )
    return {
      fields,
      submission: SubmissionState.Idle(),
      submitCount: 0,
      generation: 0,
    }
  }

  const changed = (...[name, input]: ChangeArgs<Schemas>): Message =>
    Message.ChangedField({ change: { name, input } })

  const blurred = (name: keyof Schemas & string): Message =>
    Message.BlurredField({ name })

  const values = (model: Model): FormValues<Schemas> =>
    Struct.map(model.fields, fieldValueLambda)

  function selectField<Name extends keyof Schemas & string>(
    model: Model,
    name: Name,
  ): FieldView<Schemas[Name]> {
    const state = model.fields[name]

    return {
      value: state.input.value,
      errors:
        state.validation._tag === 'Invalid' ? state.validation.errors : [],
      meta: {
        isTouched: state.isTouched,
        isBlurred: state.isBlurred,
        isDirty: state.isDirty,
        isDefaultValue: definitions[name].equivalence(
          state.input.value,
          state.defaultInput.value,
        ),
      },
    }
  }

  const submission = (model: Model): Submission<A | void, E> => model.submission

  const update = (model: Model, message: Message): UpdateReturn =>
    Message.match<UpdateReturn>(message, {
      ChangedField({ change }) {
        const { name } = change

        if (!Object.hasOwn(definitions, name)) {
          return { model }
        }

        const state: FieldState<Schemas[typeof name]> = {
          ...model.fields[name],
          input: change.input,
          validation: FieldStatus.NotValidated(),
          isTouched: true,
          isDirty: true,
        }

        const fieldChange: FieldUpdate<Schemas[typeof name]> =
          definitions[name].validateOn === 'Change'
            ? validateField(name, state, {
                mode: 'FirstError',
                isSameValue: false,
              })
            : { state, maybeCommand: Option.none() }
        const nextSubmission =
          model.submission._tag === 'Submitting'
            ? model.submission
            : SubmissionState.Idle()

        return {
          model: modifyFields(model, {
            fields: fields => replaceField(fields, name, fieldChange.state),
            submission: () => nextSubmission,
          }),
          commands: Option.toArray(fieldChange.maybeCommand),
        }
      },
      BlurredField({ name }) {
        if (!Object.hasOwn(definitions, name)) {
          return { model }
        }

        const state: FieldState<Schemas[typeof name]> = model.fields[name]
        const fieldBlur =
          definitions[name].validateOn === 'Blur'
            ? validateField(name, state, {
                mode: 'FirstError',
                isSameValue: true,
              })
            : { state, maybeCommand: Option.none() }

        if (state.isBlurred && fieldBlur.state === state) {
          return { model }
        }

        const nextState = {
          ...fieldBlur.state,
          isTouched: true,
          isBlurred: true,
        }

        return {
          model: modifyFields(model, {
            fields: fields => replaceField(fields, name, nextState),
          }),
          commands: Option.toArray(fieldBlur.maybeCommand),
        }
      },
      CompletedValidateField({ name, generation, result }) {
        if (!Object.hasOwn(definitions, name)) {
          return { model }
        }

        const state: FieldState<Schemas[typeof name]> = model.fields[name]
        if (
          state.validation._tag !== 'Validating' ||
          state.validation.generation !== generation
        ) {
          return { model }
        }

        const validation = Result.match(result, {
          onFailure: error => FieldStatus.Invalid({ errors: [error] }),
          onSuccess: errors =>
            Array.match(errors, {
              onEmpty: () => FieldStatus.Valid(),
              onNonEmpty: errors => FieldStatus.Invalid({ errors }),
            }),
        })

        const nextModel = modifyFields(model, {
          fields: fields =>
            replaceField(fields, name, { ...state, validation }),
        })

        return continueSubmit(nextModel)
      },
      CompletedSubmit({ token, result }) {
        if (
          model.submission._tag !== 'Submitting' ||
          model.submission.token.generation !== token.generation
        ) {
          return { model }
        }

        const nextSubmission = Result.match(result, {
          onFailure: error => SubmissionState.Failed({ error }),
          onSuccess: data => SubmissionState.Succeeded({ data }),
        })

        return {
          model: modifyFields(model, { submission: () => nextSubmission }),
        }
      },
    })

  const reset = (model: Model): PureUpdateReturn => ({
    model: modifyFields(model, {
      fields: () =>
        mapFields<Schemas, States, FieldRequirements>(
          definitions,
          function (name) {
            const state: FieldState<Schemas[typeof name]> = model.fields[name]

            return {
              ...state,
              input: state.defaultInput,
              validation: FieldStatus.NotValidated(),
              isTouched: false,
              isBlurred: false,
              isDirty: false,
            }
          },
        ),
      submission: () => SubmissionState.Idle(),
      submitCount: () => 0,
    }),
  })

  function reinitialize<Overrides extends Partial<FormInputs<Schemas>>>(
    model: Model,
    overrides?: Overrides &
      Record<Exclude<keyof Overrides, keyof Schemas>, never>,
  ): PureUpdateReturn {
    const pristine = init(overrides)

    return {
      model: modifyFields(pristine, {
        fields: () =>
          mapFields<Schemas, States, FieldRequirements>(definitions, name => {
            const state: FieldState<Schemas[typeof name]> =
              pristine.fields[name]

            return {
              ...state,
              validationGeneration: model.fields[name].validationGeneration,
            }
          }),
        generation: () => model.generation,
      }),
    }
  }

  function continueSubmit(model: Model): UpdateReturn {
    if (
      model.submission._tag !== 'Validating' ||
      Array.some(
        names,
        name => model.fields[name].validation._tag === 'Validating',
      )
    ) {
      return { model }
    }

    if (
      !Array.every(names, name =>
        definitions[name].isValid(model.fields[name].validation),
      )
    ) {
      return {
        model: modifyFields(model, {
          submission: () => SubmissionState.Idle(),
        }),
      }
    }

    const { token } = model.submission
    const nextModel = modifyFields(model, {
      submission: () => SubmissionState.Submitting({ token }),
    })

    return {
      model: nextModel,
      commands: [Submit({ values: values(nextModel), token })],
    }
  }

  function submit(model: Model): UpdateReturn {
    if (
      model.submission._tag === 'Submitting' ||
      model.submission._tag === 'Validating'
    ) {
      return { model }
    }

    const steps = mapFields<Schemas, FieldUpdates, FieldRequirements>(
      definitions,
      name =>
        validateField(name, model.fields[name], {
          mode: 'AllErrors',
          isSameValue: true,
        }),
    )
    const formValidation = assembleFieldUpdates(steps)
    const token = SubmissionToken.make({
      generation: Number.increment(model.generation),
    })
    const nextModel = modifyFields(model, {
      fields: () => formValidation.fields,
      generation: () => token.generation,
      submitCount: Number.increment,
      submission: () => SubmissionState.Validating({ token }),
    })
    const formContinuation = continueSubmit(nextModel)

    return {
      model: formContinuation.model,
      commands: [
        ...formValidation.commands,
        ...(formContinuation.commands ?? []),
      ],
    }
  }

  function liftFromLens<ParentModel, ParentMessage>(
    lens: FormLens<ParentModel, ParentMessage, Model, Message>,
  ) {
    const receiverLens = ChildLens.preserveLensReceiver(lens)
    const callbacks: FormLens<ParentModel, ParentMessage, Model, Message> = {
      ...receiverLens,
      write: (model, nextChild) => {
        const maybeChild = receiverLens.read(model)

        return Option.isSome(maybeChild) && maybeChild.value === nextChild
          ? model
          : receiverLens.write(model, nextChild)
      },
    }

    return {
      fold: Update.foldChild({ update, ...callbacks }),
      reset: Update.foldChildStep({ update: reset, ...callbacks }),
      reinitialize: <Overrides extends Partial<FormInputs<Schemas>>>(
        model: ParentModel,
        overrides?: Overrides &
          Record<Exclude<keyof Overrides, keyof Schemas>, never>,
      ): Update.Return<ParentModel, ParentMessage> =>
        Update.foldChildStep({
          update: (childModel: Model) => reinitialize(childModel, overrides),
          ...callbacks,
        })(model),
      submit: Update.foldChildStep({ update: submit, ...callbacks }),
    }
  }

  function lift<ParentModel, ParentMessage>(
    config: ParentFieldConfig<ParentModel, ParentMessage, Model, Message>,
  ): ReturnType<typeof liftFromLens<ParentModel, ParentMessage>>
  function lift<ParentModel, ParentMessage>(
    config: FormLens<ParentModel, ParentMessage, Model, Message>,
  ): ReturnType<typeof liftFromLens<ParentModel, ParentMessage>>
  function lift<ParentModel, ParentMessage>(
    config: ChildLens.LiftConfig<ParentModel, ParentMessage, Model, Message>,
  ) {
    if (ChildLens.isParentFieldConfig(config)) {
      return liftFromLens(ChildLens.parentFieldToLens(config))
    }

    return liftFromLens(config)
  }

  const definition: FormDefinition<
    Schemas,
    FieldRequirements | SubmitRequirements,
    A | void,
    AI | void,
    E,
    EI,
    SubmitRequirements,
    FieldRequirements
  > = {
    Model,
    Message,
    Submission: SubmissionState,
    Submit,
    ValidateField,
    init,
    changed,
    blurred,
    values,
    submitCount: (model: Model) => model.submitCount,
    field: selectField,
    submission,
    update,
    reset,
    reinitialize,
    submit,
    lift,
  }

  return definition
}

/** Callbacks that read and replace a child Form in a parent Model and wrap its
 * Messages. Used by lift when the child is optional, nested, or selected from
 * a collection. Cannot be combined with parentField.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FormLens<ParentModel, ParentMessage, ChildModel, ChildMessage> =
  ChildLens.FoldLens<ParentModel, ParentMessage, ChildModel, ChildMessage>

/** A parent field and Message wrapper supplied to lift. The field must always
 * contain a complete Form Model and accept its replacement. For optional or
 * nested Forms, use {@link FormLens} instead.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type ParentFieldConfig<
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage,
> = ChildLens.ParentFieldConfig<
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage
>
