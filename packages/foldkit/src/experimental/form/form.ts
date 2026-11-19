import {
  Array,
  Effect,
  Number,
  Option,
  Predicate,
  Record,
  Result,
  Schema,
  SchemaAST,
  SchemaIssue,
  SchemaParser,
  SchemaTransformation,
  String,
  Struct,
} from 'effect'
import type { Equivalence } from 'effect'
import type { Simplify } from 'effect/Types'

import * as Command from '../../command/index.js'
import * as FieldValidation from '../../fieldValidation/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { defineTaggedUnion } from '../../schema/index.js'
import { modifyFields } from '../../struct/index.js'
import * as Update from '../../update/index.js'
import * as Lens from './lens.js'

/** The Schema for one field. It decodes the control's input, its `Encoded`
 * side, into the value the app uses, its `Type` side. It must run
 * synchronously without services, both sides must be plain immutable data, and
 * neither side can have an optional key. `init` and `reinitialize` encode
 * overrides with it and throw if one can't be encoded.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FieldSchema = Schema.Codec<unknown, unknown, never, never> & {
  readonly '~type.optionality': 'required'
  readonly '~encoded.optionality': 'required'
}

/** Field Schemas by field name.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FieldSchemas = Readonly<Record<string, FieldSchema>>

type ValueSchema<S extends FieldSchema> = Schema.Codec<
  S['Type'],
  S['Encoded']
> & {
  readonly '~type.make.in': S['Type']
  readonly '~type.make': S['Type']
  readonly '~type.optionality': 'required'
  readonly '~type.mutability': 'readonly'
}

type InputSchema<S extends FieldSchema> = Schema.Codec<
  S['Encoded'],
  S['Encoded']
> & {
  readonly '~type.make.in': S['Encoded']
  readonly '~type.make': S['Encoded']
  readonly '~type.optionality': 'required'
  readonly '~type.mutability': 'readonly'
}

const toValueSchema = <S extends FieldSchema>(schema: S) =>
  Schema.make<ValueSchema<S>>(schema.ast)

const withChecksDisabled = (
  options: SchemaAST.ParseOptions,
): SchemaAST.ParseOptions => ({ ...options, disableChecks: true })

// NOTE: a field holds whatever the control produces, even input its Schema
// rejects, so the stored input skips the Schema's checks. Decoding applies
// them.
const UncheckedInput = <S extends FieldSchema>(schema: S) =>
  Schema.declareConstructor<S['Encoded'], S['Encoded']>()(
    [Schema.toEncoded(schema)],
    ([encoded]) =>
      (input, _ast, options) =>
        SchemaParser.decodeUnknownEffect(encoded)(
          input,
          withChecksDisabled(options),
        ),
    {
      expected: 'a field input',
      toEquivalence: ([equivalence]) => equivalence,
      toCodec: ([encoded]) => {
        const json = Schema.toCodecJson(encoded)

        return Schema.link<S['Encoded']>()(
          Schema.Unknown,
          SchemaTransformation.transformEffect({
            decode: (input, options) =>
              SchemaParser.decodeUnknownEffect(json)(
                input,
                withChecksDisabled(options),
              ),
            encode: (input, options) =>
              SchemaParser.encodeUnknownEffect(json)(
                input,
                withChecksDisabled(options),
              ),
          }),
        )
      },
    },
  )

const toInputSchema = <S extends FieldSchema>(schema: S) =>
  Schema.make<InputSchema<S>>(UncheckedInput(schema).ast)

const ErrorMessages = Schema.NonEmptyArray(Schema.String)

const FieldStatus = <S extends FieldSchema>(schema: S) => {
  const value = toValueSchema(schema)

  return defineTaggedUnion({
    NotValidated: {},
    Validating: { value },
    Valid: { value },
    Invalid: { errors: ErrorMessages },
    Rejected: { errors: ErrorMessages },
  })
}

type FieldStatusUnion<S extends FieldSchema> = ReturnType<typeof FieldStatus<S>>
type FieldStatus<S extends FieldSchema> = FieldStatusUnion<S>['Type']

const FieldState = <S extends FieldSchema>(
  input: InputSchema<S>,
  status: FieldStatusUnion<S>,
) =>
  Schema.Struct({
    input,
    defaultInput: input,
    validation: status,
    validationGeneration: Schema.Number,
    isBlurred: Schema.Boolean,
    isEdited: Schema.Boolean,
  })

type FieldState<S extends FieldSchema> = ReturnType<
  typeof FieldState<S>
>['Type']

type Validator<S extends FieldSchema, R> = (
  value: S['Type'],
) => Effect.Effect<ReadonlyArray<string>, string, R>

type ValidationMode = 'FirstError' | 'AllErrors'

/** When a field is checked: after each change, or when it loses focus.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type ValidationTrigger = 'Change' | 'Blur'

type FieldConfigBase<S extends FieldSchema> = Readonly<{
  schema: S
  initial: NoInfer<S['Encoded']>
  validateOn?: ValidationTrigger
  rules?: FieldValidation.Rules<NoInfer<S['Type']>>
}>

/** Options for {@link field}. `initial` is what the control starts with.
 * `rules` and `validate` receive the decoded value. Services that `validate`
 * needs become requirements of the Form's Commands.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FieldConfig<S extends FieldSchema, R = never> = FieldConfigBase<S> &
  Readonly<{ validate?: Validator<S, R> | undefined }>

type FieldCheck<S extends FieldSchema> = Readonly<{
  status: FieldStatus<S>
  isValidatorDue: boolean
}>

type FieldDefinitionBase<S extends FieldSchema> = Readonly<{
  /** The field's Schema. */
  schema: S
  /** @internal */
  Input: InputSchema<S>
  /** @internal */
  State: ReturnType<typeof FieldState<S>>
  /** @internal */
  Status: FieldStatusUnion<S>
  /** @internal */
  inputEquivalence: Equivalence.Equivalence<S['Encoded']>
  /** @internal */
  statusEquivalence: Equivalence.Equivalence<FieldStatus<S>>
  /** @internal */
  initialize: (maybeValue: Option.Option<S['Type']>) => FieldState<S>
  /** @internal */
  decode: (
    input: S['Encoded'],
  ) => Result.Result<S['Type'], Array.NonEmptyReadonlyArray<string>>
  /** @internal */
  check: (input: S['Encoded'], mode: ValidationMode) => FieldCheck<S>
  /** @internal */
  validateOn: ValidationTrigger
}>

type FieldDefinitionWithValidator<
  S extends FieldSchema,
  R,
> = FieldDefinitionBase<S> &
  Readonly<{
    /** The field's async check. */
    validate: Validator<S, R>
  }>

type FieldDefinitionWithoutValidator<S extends FieldSchema> =
  FieldDefinitionBase<S> & Readonly<{ validate?: never }>

/** A field made by {@link field}. Several Forms can use it, each with its own
 * state for it.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FieldDefinition<S extends FieldSchema, R = never> =
  | FieldDefinitionWithValidator<S, R>
  | FieldDefinitionWithoutValidator<S>

const issueFormatter = SchemaIssue.makeFormatterStandardSchemaV1()

const toIssueMessages = (
  error: Schema.SchemaError,
): Array.NonEmptyReadonlyArray<string> =>
  Array.match(issueFormatter(error.issue).issues, {
    onEmpty: () => Array.of(error.message),
    onNonEmpty: issues => Array.map(issues, ({ message }) => message),
  })

/** Defines a field: its Schema, initial input, and validation. One field can
 * be used in several Forms.
 *
 * Validation decodes the input, runs `rules` on the value, then runs
 * `validate` if both pass. A decode failure shows the Schema's messages. An
 * empty value skips `validate` when the field has no `required` rule.
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
  const Input = toInputSchema(config.schema)
  const Status = FieldStatus(config.schema)
  const State = FieldState(Input, Status)
  const inputEquivalence = Schema.toEquivalence(Input)
  const statusEquivalence = Schema.toEquivalence(Status)
  const decodeResult = Schema.decodeResult(config.schema)
  const encodeSync = Schema.encodeSync(config.schema, { disableChecks: true })
  const rules = config.rules ?? FieldValidation.makeRules<S['Type']>()
  const validateRules = FieldValidation.validate(rules)
  const validateAllRules = FieldValidation.validateAll(rules)

  const decode = (input: S['Encoded']) =>
    Result.mapError(decodeResult(input), toIssueMessages)

  const toCheck = (
    validation: FieldValidation.Field<S['Type']>,
  ): FieldCheck<S> =>
    FieldValidation.match(validation, {
      onNotValidated: value => ({
        status: Status.Valid({ value }),
        isValidatorDue: false,
      }),
      onValidating: value => ({
        status: Status.Valid({ value }),
        isValidatorDue: true,
      }),
      onValid: value => ({
        status: Status.Valid({ value }),
        isValidatorDue: true,
      }),
      onInvalid: ({ errors }) => ({
        status: Status.Invalid({ errors }),
        isValidatorDue: false,
      }),
    })

  const check = (input: S['Encoded'], mode: ValidationMode): FieldCheck<S> =>
    Result.match(decode(input), {
      onFailure: errors => ({
        status: Status.Invalid({ errors }),
        isValidatorDue: false,
      }),
      onSuccess: value =>
        toCheck(
          mode === 'AllErrors' ? validateAllRules(value) : validateRules(value),
        ),
    })

  const initialize = (maybeValue: Option.Option<S['Type']>): FieldState<S> => {
    const defaultInput = Option.match(maybeValue, {
      onNone: () => config.initial,
      onSome: encodeSync,
    })

    return {
      input: defaultInput,
      defaultInput,
      validation: Status.NotValidated(),
      validationGeneration: 0,
      isBlurred: false,
      isEdited: false,
    }
  }

  const definition: FieldDefinitionBase<S> = {
    schema: config.schema,
    Input,
    State,
    Status,
    inputEquivalence,
    statusEquivalence,
    initialize,
    decode,
    check,
    validateOn: config.validateOn ?? 'Change',
  }

  if (config.validate === undefined) {
    return definition
  } else {
    return { ...definition, validate: config.validate }
  }
}

/** A field Schema for a required value from a control that holds `null` until
 * the person chooses, such as a select with an empty option. The input is
 * `schema`'s input or `null`, and the value is `schema`'s value. A `null`
 * input fails with `message`. For a choice the person may leave empty, use
 * `Schema.OptionFromNullOr` instead.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export const RequiredFromNullOr = <S extends FieldSchema>(
  schema: S,
  message: string,
) =>
  Schema.NullOr(schema).pipe(
    Schema.decodeTo(
      Schema.toType(schema),
      SchemaTransformation.transformEffect({
        decode: (input: S['Type'] | null, options) =>
          Predicate.isNull(input)
            ? Effect.fail(
                new SchemaIssue.InvalidValue({ message }, input, options),
              )
            : Effect.succeed(input),
        encode: (value: S['Type']) => Effect.succeed(value),
      }),
    ),
  )

/** What a view needs to render a field. Put `input` in the control.
 * `maybeValue` is the decoded value whenever the input decodes, even if a rule
 * fails.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FieldView<S extends FieldSchema> = Readonly<{
  input: S['Encoded']
  maybeValue: Option.Option<S['Type']>
  errors: ReadonlyArray<string>
  meta: Readonly<{
    isTouched: boolean
    isBlurred: boolean
    isEdited: boolean
    isDefaultInput: boolean
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

interface FieldInputLambda extends Struct.Lambda {
  <Input>(state: Readonly<{ input: Input }>): Input
  readonly '~lambda.in': Readonly<{ input: unknown }>
  readonly '~lambda.out': this['~lambda.in']['input']
}
const toFieldInput = Struct.lambda<FieldInputLambda>(state => state.input)

interface FieldUpdateStateLambda extends Struct.Lambda {
  <State>(step: Readonly<{ state: State }>): State
  readonly '~lambda.in': Readonly<{ state: unknown }>
  readonly '~lambda.out': this['~lambda.in']['state']
}
const toFieldUpdateState = Struct.lambda<FieldUpdateStateLambda>(
  step => step.state,
)

interface FieldStateSchemaLambda extends Struct.Lambda {
  <S extends FieldSchema, FieldRequirements>(
    definition: FieldDefinition<S, FieldRequirements>,
  ): ReturnType<typeof FieldState<S>>
  readonly '~lambda.in': Readonly<{ State: Schema.Constraint }>
  readonly '~lambda.out': this['~lambda.in']['State']
}

const toFieldStateSchema = Struct.lambda<FieldStateSchemaLambda>(
  definition => definition.State,
)

const mapFields = <
  Schemas extends FieldSchemas,
  Output extends Readonly<{ [Name in keyof Schemas & string]: unknown }>,
  FieldRequirements = never,
>(
  fields: FieldDefinitions<Schemas, FieldRequirements>,
  mapField: <FieldName extends keyof Schemas & string>(
    name: FieldName,
    definition: FieldDefinition<Schemas[FieldName], FieldRequirements>,
  ) => Output[FieldName],
): Output =>
  // NOTE: Record.map loses the per-key types; each entry is mapField's result
  // for that field name.
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  Record.map(fields, (definition, name) =>
    mapField(name, definition),
  ) as unknown as Output

/** Decoded field values by name. `execute` receives them, and `init` and
 * `reinitialize` take some of them as overrides.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FormValues<Schemas extends FieldSchemas> = Schema.Struct.View<
  Pick<Schemas, keyof Schemas & string>,
  'Type',
  never,
  never
>

type AnyFieldDefinitions = Readonly<
  Record<string, Readonly<{ schema: FieldSchema }>>
>

/** The Schemas of a fields object, by field name:
 * `Form.FieldSchemasOf<typeof fields>`. Use it with {@link Fields} for fields
 * that several Forms share.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FieldSchemasOf<Definitions extends AnyFieldDefinitions> = {
  readonly [Name in keyof Definitions & string]: Definitions[Name]['schema']
}

/** The decoded values of a fields object, by field name:
 * `Form.FieldValues<typeof fields>`. Declare the fields before `Form.define`
 * and use it to type a helper that `execute` calls, where
 * `Form.Values<typeof form>` would make the Form refer to itself in its own
 * definition.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FieldValues<Definitions extends AnyFieldDefinitions> = FormValues<
  FieldSchemasOf<Definitions>
>

/** Field inputs by name: what each control holds.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FormInputs<Schemas extends FieldSchemas> = Schema.Struct.View<
  Pick<Schemas, keyof Schemas & string>,
  'Encoded',
  never,
  never
>

const makeValuesSchema = <Schemas extends FieldSchemas, FieldRequirements>(
  fields: FieldDefinitions<Schemas, FieldRequirements>,
) =>
  Schema.make<Schema.Codec<FormValues<Schemas>, FormInputs<Schemas>>>(
    Schema.Struct(
      mapFields<
        Schemas,
        Pick<Schemas, keyof Schemas & string>,
        FieldRequirements
      >(fields, (_name, definition) => definition.schema),
    ).ast,
  )

const makeInputsSchema = <Schemas extends FieldSchemas, FieldRequirements>(
  fields: FieldDefinitions<Schemas, FieldRequirements>,
) =>
  Schema.make<
    Schema.Codec<FormInputs<Schemas>, FormInputs<Schemas>> & {
      readonly '~type.make.in': FormInputs<Schemas>
      readonly '~type.make': FormInputs<Schemas>
    }
  >(
    Schema.Struct(
      mapFields<
        Schemas,
        Readonly<{
          [Name in keyof Schemas & string]: InputSchema<Schemas[Name]>
        }>,
        FieldRequirements
      >(fields, (_name, definition) => definition.Input),
    ).ast,
  )

type FieldChanges<Schemas extends FieldSchemas> = Readonly<{
  [Name in keyof Schemas & string]: Schema.Struct<{
    name: Schema.Literal<Name>
    input: InputSchema<Schemas[Name]>
  }>
}>

const FieldChange = <Name extends string, S extends FieldSchema>(
  name: Name,
  input: InputSchema<S>,
) =>
  Schema.Struct({
    name: Schema.Literal(name),
    input,
  })

const FieldChanges = <Schemas extends FieldSchemas, FieldRequirements = never>(
  fields: FieldDefinitions<Schemas, FieldRequirements>,
): FieldChanges<Schemas> =>
  mapFields<Schemas, FieldChanges<Schemas>, FieldRequirements>(
    fields,
    <Name extends keyof Schemas & string>(
      name: Name,
      definition: FieldDefinition<Schemas[Name], FieldRequirements>,
    ) => FieldChange<Name, Schemas[Name]>(name, definition.Input),
  )

const ValidationResult = Schema.Result(
  Schema.Array(Schema.String),
  Schema.String,
)

type TypedMakeCodec<T, E> = Schema.Codec<T, E> & {
  readonly '~type.make.in': T
  readonly '~type.make': T
}

// NOTE: a generic Codec types its constructor input as unknown, so union
// constructors built from it would accept any payload. This restates the input
// as the decoded type.
const toTypedMake = <T, E>(codec: Schema.Codec<T, E>) =>
  Schema.make<TypedMakeCodec<T, E>>(codec.ast)

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
  const AnyFieldChange = Schema.Union(
    Array.map(Struct.keys(Changes), name => Changes[name]),
  )
  const fieldNames = Struct.keys(fields)
  return defineMessageUnion({
    ChangedField: { change: AnyFieldChange },
    ChangedFields: { changes: Schema.Array(AnyFieldChange) },
    BlurredField: { name: Schema.Literals(fieldNames) },
    CompletedSubmit: {
      generation: Schema.Number,
      result: Schema.Result(data, error),
    },
    CompletedValidateField: {
      name: Schema.Literals(fieldNames),
      generation: Schema.Number,
      result: ValidationResult,
    },
  })
}

function FormOutMessage<A, AI, E, EI>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
) {
  return defineMessageUnion({
    SucceededSubmit: { data: toTypedMake(data) },
    FailedSubmit: { error: toTypedMake(error) },
  })
}

const Submission = <A, AI, E, EI, Context, ContextEncoded, Inputs>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
  context: Schema.Codec<Context, ContextEncoded>,
  inputs: TypedMakeCodec<Inputs, Inputs>,
) =>
  defineTaggedUnion({
    Idle: {},
    Validating: { generation: Schema.Number, context: toTypedMake(context) },
    Submitting: { generation: Schema.Number, inputs },
    Succeeded: { data: toTypedMake(data) },
    Failed: { error: toTypedMake(error), isShownOnFields: Schema.Boolean },
  })

type SubmissionUnion<Schemas extends FieldSchemas, A, E, Context> = ReturnType<
  typeof Submission<A, A, E, E, Context, Context, FormInputs<Schemas>>
>

/** A Form's submission state, with its typed success data and error:
 * `Form.Submission<typeof contactForm>`.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type Submission<
  Definition extends Readonly<{ Submission: Readonly<{ Type: unknown }> }>,
> = Definition['Submission']['Type']

/** The decoded values a Form submits: `Form.Values<typeof contactForm>`.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type Values<
  Definition extends Readonly<{ Values: Readonly<{ Type: unknown }> }>,
> = Definition['Values']['Type']

/** The OutMessage a Form's update returns for each submission result it
 * accepts: `Form.OutMessage<typeof contactForm>`.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type OutMessage<
  Definition extends Readonly<{ OutMessage: Readonly<{ Type: unknown }> }>,
> = Definition['OutMessage']['Type']

/** Error messages for some fields, by field name. `submit.toFieldErrors`
 * returns them to show a submission error on the fields it's about.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FieldErrors<Name extends string> = Readonly<
  Partial<Record<Name, string>>
>

type KeysOfUnion<T> = T extends unknown ? keyof T : never

type ExactFieldErrors<Returned, Name extends string> = Returned &
  Readonly<Partial<Record<Exclude<KeysOfUnion<Returned>, Name>, never>>>

type FieldStates<Schemas extends FieldSchemas> = Readonly<{
  [Name in keyof Schemas & string]: FieldState<Schemas[Name]>
}>

type FormModel<Schemas extends FieldSchemas, A, E, Context> = Simplify<
  Readonly<{
    fields: FieldStates<Schemas>
    submission: SubmissionUnion<Schemas, A, E, Context>['Type']
    submitCount: number
    submissionGeneration: number
  }>
>

const FormModel = <
  Schemas extends FieldSchemas,
  A,
  AI,
  E,
  EI,
  Context,
  ContextEncoded,
  FieldRequirements = never,
>(
  fields: FieldDefinitions<Schemas, FieldRequirements>,
  submission: ReturnType<
    typeof Submission<
      A,
      AI,
      E,
      EI,
      Context,
      ContextEncoded,
      FormInputs<Schemas>
    >
  >,
) =>
  Schema.Struct({
    fields: Schema.Struct(Struct.map(fields, toFieldStateSchema)),
    submission,
    submitCount: Schema.Number,
    submissionGeneration: Schema.Number,
  })

type ChangeArgs<Schemas extends FieldSchemas> = {
  [Name in keyof Schemas & string]: readonly [
    name: Name,
    input: Schemas[Name]['Encoded'],
  ]
}[keyof Schemas & string]

/** What `submit` takes after the Model: nothing, or the context value when the
 * Form has a `submit.context` Schema.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type SubmitArgs<Context> = [Context] extends [void]
  ? ReadonlyArray<never>
  : readonly [Context]

type FormModelSchema<
  Schemas extends FieldSchemas,
  A,
  AI,
  E,
  EI,
  Context,
  ContextEncoded,
> = ReturnType<typeof FormModel<Schemas, A, AI, E, EI, Context, ContextEncoded>>
type FormMessage<Schemas extends FieldSchemas, A, AI, E, EI> = ReturnType<
  typeof FormMessage<Schemas, A, AI, E, EI>
>
type FormOutMessage<A, AI, E, EI> = ReturnType<
  typeof FormOutMessage<A, AI, E, EI>
>

type ExactFields<Schemas extends FieldSchemas, Provided> = Provided &
  Record<Exclude<keyof Provided, keyof Schemas>, never>

type SubmitCommandArgs<
  Schemas extends FieldSchemas,
  Context,
  ContextEncoded,
> = [Context] extends [void]
  ? {
      readonly values: Schema.Codec<FormValues<Schemas>, FormInputs<Schemas>>
      readonly generation: typeof Schema.Number
    }
  : {
      readonly values: Schema.Codec<FormValues<Schemas>, FormInputs<Schemas>>
      readonly context: Schema.Codec<Context, ContextEncoded>
      readonly generation: typeof Schema.Number
    }

/** Folds a Form's OutMessage into the parent. The Step receives the parent
 * Model with the Form already updated. A parent that is itself a Submodel can
 * return its own OutMessage from the Step.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FoldOutMessage<
  ParentModel,
  ParentMessage,
  ChildMessage,
  ChildOutMessage,
  ParentOutMessage = never,
> = (
  outMessage: ChildOutMessage,
  context: Update.FoldContext<ChildMessage, ParentMessage>,
) => Update.StepWithOutMessage<
  NoInfer<ParentModel>,
  ParentMessage,
  ParentOutMessage
>

type FoldOutMessageConfig<
  ParentModel,
  ParentMessage,
  ChildMessage,
  ChildOutMessage,
  ParentOutMessage,
> = Readonly<{
  foldOutMessage: FoldOutMessage<
    ParentModel,
    ParentMessage,
    ChildMessage,
    ChildOutMessage,
    ParentOutMessage
  >
  toParentOutMessage?:
    | ((outMessage: ChildOutMessage) => ParentOutMessage | undefined)
    | undefined
}>

/** A Form's operations on the parent Model and Message. `fold` works like
 * {@link Update.Fold}. `reset`, `reinitialize`, and `submit` return Steps,
 * so they compose with `Update.combine`.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type LiftedForm<
  Schemas extends FieldSchemas,
  ParentModel,
  ParentMessage,
  Requirements = never,
  DataSchema extends Schema.Top = typeof Schema.Void,
  ErrorSchema extends Schema.Top = typeof Schema.Never,
  ContextSchema extends Schema.Top = typeof Schema.Void,
  ParentOutMessage = never,
> = LiftedFormOf<
  Schemas,
  ParentModel,
  ParentMessage,
  Requirements,
  DataSchema['Type'],
  DataSchema['Encoded'],
  ErrorSchema['Type'],
  ErrorSchema['Encoded'],
  ContextSchema['Type'],
  ParentOutMessage
>

type LiftedFormOf<
  Schemas extends FieldSchemas,
  ParentModel,
  ParentMessage,
  Requirements,
  A,
  AI,
  E,
  EI,
  Context,
  ParentOutMessage,
> = Readonly<{
  /** Applies a Form Message, wraps its Commands for the parent, and runs
   * `foldOutMessage` for each submission result the Form accepts. Returns the
   * parent's OutMessage when `foldOutMessage` or `toParentOutMessage` gives
   * one. */
  fold: Update.FoldWithOutMessage<
    ParentModel,
    ParentMessage,
    FormMessage<Schemas, A, AI, E, EI>['Type'],
    ParentOutMessage,
    Requirements
  >
  /** Restores the defaults and clears errors, interaction, and submission state. */
  reset: Update.Step<ParentModel, ParentMessage>
  /** Replaces the defaults with each field's `initial` input updated by
   * `overrides`, then resets. Pass `{}` to return to the `initial` inputs. */
  reinitialize: <Provided extends Partial<FormValues<Schemas>>>(
    overrides: ExactFields<Schemas, Provided>,
  ) => Update.Step<ParentModel, ParentMessage>
  /** Returns a Step for a new attempt. Its Commands are the field checks, or
   * the submission when every field passes without an async check. */
  submit: (
    ...args: SubmitArgs<Context>
  ) => Update.Step<ParentModel, ParentMessage, Requirements>
}>

/** A Form: its Schemas, Message constructors, selectors, and update operations.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export interface FormDefinition<
  Schemas extends FieldSchemas,
  DataSchema extends Schema.Top = typeof Schema.Void,
  ErrorSchema extends Schema.Top = typeof Schema.Never,
  ContextSchema extends Schema.Top = typeof Schema.Void,
  SubmitRequirements = never,
  FieldRequirements = never,
  FormName extends string = string,
  ValidatedFieldName extends keyof Schemas & string = never,
> extends FormDefinitionOf<
  Schemas,
  DataSchema['Type'],
  DataSchema['Encoded'],
  ErrorSchema['Type'],
  ErrorSchema['Encoded'],
  ContextSchema['Type'],
  ContextSchema['Encoded'],
  SubmitRequirements,
  FieldRequirements,
  FormName,
  ValidatedFieldName
> {}

/** A Form's field operations, without what it submits. Type a view helper's
 * Form parameter with it and keep `Model` and `Message` generic. Any Form whose
 * fields include `Schemas` fits, and its Model and Message fill those
 * parameters.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export interface Fields<Schemas extends FieldSchemas, Model, Message> {
  /** The Form's Message Schema. Its `Type` decides the helper's `Message`. */
  readonly Message: Readonly<{ Type: Message }>
  /** Returns what a view needs to render a field. */
  readonly fieldView: <Name extends keyof Schemas & string>(
    model: Model,
    name: Name,
  ) => FieldView<Schemas[Name]>
  /** Creates the Message for a field's new input. */
  readonly changed: (...args: ChangeArgs<Schemas>) => Message
  /** Creates the Message for a field losing focus. */
  readonly blurred: (name: keyof Schemas & string) => Message
  /** Returns every field's input. */
  readonly inputs: (model: Model) => FormInputs<Schemas>
}

interface FormDefinitionOf<
  Schemas extends FieldSchemas,
  A,
  AI,
  E,
  EI,
  Context,
  ContextEncoded,
  SubmitRequirements,
  FieldRequirements,
  FormName extends string,
  ValidatedFieldName extends keyof Schemas & string,
> extends Fields<
  Schemas,
  FormModel<Schemas, A, E, Context>,
  FormMessage<Schemas, A, AI, E, EI>['Type']
> {
  /** Schema of the Form Model. */
  readonly Model: FormModelSchema<
    Schemas,
    A,
    AI,
    E,
    EI,
    Context,
    ContextEncoded
  >
  /** Schema of the Form's Messages. */
  readonly Message: FormMessage<Schemas, A, AI, E, EI>
  /** Schema of the submission results the Form reports to its parent. */
  readonly OutMessage: FormOutMessage<A, AI, E, EI>
  /** The submission state union, with `match` and `isAnyOf`. */
  readonly Submission: ReturnType<
    typeof Submission<
      A,
      AI,
      E,
      EI,
      Context,
      ContextEncoded,
      FormInputs<Schemas>
    >
  >
  /** Schema that decodes field inputs into the submitted values. */
  readonly Values: Schema.Codec<FormValues<Schemas>, FormInputs<Schemas>>
  /** The submission Command, for matching in Story and Scene tests. It takes
   * `values` and `generation`, plus `context` when the Form has a
   * `submit.context` Schema. Start attempts with `submit`, which keeps the
   * Model in step with the Command. */
  readonly Submit: Command.CommandDefinitionWithArgs<
    `Submit${FormName}`,
    SubmitCommandArgs<Schemas, Context, ContextEncoded>,
    Effect.Effect<
      FormMessage<Schemas, A, AI, E, EI>['CompletedSubmit']['Type'],
      never,
      SubmitRequirements
    >
  >
  /** The check Command of each field that has a `validate` Effect, for
   * matching in Story and Scene tests. */
  readonly ValidateField: ValidateFieldCommands<
    Schemas,
    FormMessage<Schemas, A, AI, E, EI>['CompletedValidateField']['Type'],
    FieldRequirements,
    FormName,
    ValidatedFieldName
  >
  /** Creates a Form Model. Overrides are decoded values and become the
   * defaults. To replace a live Form, use `reset` or `reinitialize`, so a late
   * result from before can't pass for a new one. */
  readonly init: <Provided extends Partial<FormValues<Schemas>>>(
    overrides?: ExactFields<Schemas, Provided>,
  ) => FormModel<Schemas, A, E, Context>
  /** Creates the Message for a field's new input. */
  readonly changed: (
    ...args: ChangeArgs<Schemas>
  ) => FormMessage<Schemas, A, AI, E, EI>['ChangedField']['Type']
  /** Creates one Message that changes several fields' inputs. Each changed
   * field is marked edited and checked as `changed` would check it. */
  readonly changedFields: <Provided extends Partial<FormInputs<Schemas>>>(
    changes: ExactFields<Schemas, Provided>,
  ) => FormMessage<Schemas, A, AI, E, EI>['ChangedFields']['Type']
  /** Creates the Message for a field losing focus. */
  readonly blurred: (
    name: keyof Schemas & string,
  ) => FormMessage<Schemas, A, AI, E, EI>['BlurredField']['Type']
  /** Returns every field's input. */
  readonly inputs: (
    model: FormModel<Schemas, A, E, Context>,
  ) => FormInputs<Schemas>
  /** Returns what a view needs to render a field. */
  readonly fieldView: <FieldName extends keyof Schemas & string>(
    model: FormModel<Schemas, A, E, Context>,
    name: FieldName,
  ) => FieldView<Schemas[FieldName]>
  /** Returns the submission state. */
  readonly submission: (
    model: FormModel<Schemas, A, E, Context>,
  ) => SubmissionUnion<Schemas, A, E, Context>['Type']
  /** Returns true while the submission is `Validating` or `Submitting`. */
  readonly isSubmitPending: (
    model: FormModel<Schemas, A, E, Context>,
  ) => boolean
  /** Returns a `Failed` submission's error when no field shows it. A field
   * shows it when `toFieldErrors` returns a message for that field and the
   * field's input still matches what was sent. */
  readonly formError: (
    model: FormModel<Schemas, A, E, Context>,
  ) => Option.Option<E>
  /** Returns the number of submit attempts since the last `init`, `reset`, or
   * `reinitialize`. A submit while one is pending doesn't count. */
  readonly submitCount: (model: FormModel<Schemas, A, E, Context>) => number
  /** Applies a Form Message. Returns an OutMessage for each submission result
   * it accepts. */
  readonly update: (
    model: FormModel<Schemas, A, E, Context>,
    message: FormMessage<Schemas, A, AI, E, EI>['Type'],
  ) => Update.ReturnWithOutMessage<
    FormModel<Schemas, A, E, Context>,
    FormMessage<Schemas, A, AI, E, EI>['Type'],
    FormOutMessage<A, AI, E, EI>['Type'],
    SubmitRequirements | FieldRequirements
  >
  /** Restores the defaults and clears errors, interaction, and submission state. */
  readonly reset: (
    model: FormModel<Schemas, A, E, Context>,
  ) => Update.Return<
    FormModel<Schemas, A, E, Context>,
    FormMessage<Schemas, A, AI, E, EI>['Type']
  >
  /** Replaces the defaults with each field's `initial` input updated by
   * `overrides`, then resets. Pass `{}` to return to the `initial` inputs. */
  readonly reinitialize: <Provided extends Partial<FormValues<Schemas>>>(
    model: FormModel<Schemas, A, E, Context>,
    overrides: ExactFields<Schemas, Provided>,
  ) => Update.Return<
    FormModel<Schemas, A, E, Context>,
    FormMessage<Schemas, A, AI, E, EI>['Type']
  >
  /** Starts an attempt by checking every field. Once every check passes, Form
   * returns the Submit Command, from `submit` itself or from the update that
   * folds the last async check. A failed check, or an edit while async checks
   * are pending, returns the attempt to Idle. A submit while one is pending
   * does nothing. When the Form has a `submit.context` Schema, pass the
   * context after the Model. */
  readonly submit: (
    model: FormModel<Schemas, A, E, Context>,
    ...args: SubmitArgs<Context>
  ) => Update.Return<
    FormModel<Schemas, A, E, Context>,
    FormMessage<Schemas, A, AI, E, EI>['Type'],
    SubmitRequirements | FieldRequirements
  >
  /** Connects the Form to a parent, through a parent field or a lens.
   * `foldOutMessage` handles each submission result. A parent that is a
   * Submodel passes its OutMessage type as the third type argument, and can
   * forward Form OutMessages with `toParentOutMessage`. */
  readonly lift: {
    <ParentModel, ParentMessage, ParentOutMessage = never>(
      config: ParentFieldConfig<
        ParentModel,
        ParentMessage,
        FormModel<Schemas, A, E, Context>,
        FormMessage<Schemas, A, AI, E, EI>['Type']
      > &
        FoldOutMessageConfig<
          ParentModel,
          ParentMessage,
          FormMessage<Schemas, A, AI, E, EI>['Type'],
          FormOutMessage<A, AI, E, EI>['Type'],
          ParentOutMessage
        >,
    ): LiftedFormOf<
      Schemas,
      ParentModel,
      ParentMessage,
      SubmitRequirements | FieldRequirements,
      A,
      AI,
      E,
      EI,
      Context,
      ParentOutMessage
    >
    <ParentModel, ParentMessage, ParentOutMessage = never>(
      config: FormLens<
        ParentModel,
        ParentMessage,
        FormModel<Schemas, A, E, Context>,
        FormMessage<Schemas, A, AI, E, EI>['Type']
      > &
        FoldOutMessageConfig<
          ParentModel,
          ParentMessage,
          FormMessage<Schemas, A, AI, E, EI>['Type'],
          FormOutMessage<A, AI, E, EI>['Type'],
          ParentOutMessage
        >,
    ): LiftedFormOf<
      Schemas,
      ParentModel,
      ParentMessage,
      SubmitRequirements | FieldRequirements,
      A,
      AI,
      E,
      EI,
      Context,
      ParentOutMessage
    >
  }
}

type ValidateFieldCommand<
  S extends FieldSchema,
  CompletedMessage,
  FieldRequirements,
  CommandName extends string,
> = Command.CommandDefinitionWithArgs<
  CommandName,
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
  FormName extends string,
  ValidatedFieldName extends keyof Schemas & string,
> = Readonly<{
  [FieldName in ValidatedFieldName]: ValidateFieldCommand<
    Schemas[FieldName],
    CompletedMessage,
    FieldRequirements,
    `Validate${FormName}${Capitalize<FieldName>}`
  >
}>

type ValidatorRequirements<Definition> = Definition extends {
  readonly validate: (
    ...args: never
  ) => Effect.Effect<ReadonlyArray<string>, string, unknown>
}
  ? Effect.Services<ReturnType<Definition['validate']>>
  : never

type ValidatorRequirementsOf<Fields> = ValidatorRequirements<
  Fields[keyof Fields]
>

type ValidatedFieldNameOf<Fields> = {
  [FieldName in keyof Fields]: Fields[FieldName] extends {
    readonly validate: (...args: never) => unknown
  }
    ? FieldName
    : never
}[keyof Fields] &
  string

type CheckedSubmitEffect<SubmitEffect, A, E> = SubmitEffect &
  ([Effect.Success<NoInfer<SubmitEffect>>] extends [NoInfer<A>]
    ? unknown
    : never) &
  ([Effect.Error<NoInfer<SubmitEffect>>] extends [NoInfer<E>] ? unknown : never)

/** Declares fields outside `Form.define`, to share them between Forms or to
 * type them with `Form.FieldValues` and `Form.FieldSchemasOf`. Returns the
 * fields unchanged, with the types `Form.define` would infer for them, and
 * reports a value that isn't a field where the fields are declared.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export const defineFields = <
  const Schemas extends FieldSchemas,
  const Definitions extends FieldDefinitions<Schemas, unknown>,
>(
  fields: Definitions & FieldDefinitions<Schemas, unknown>,
): Definitions => fields

/** Defines a Form from its fields and its submission.
 *
 * - `name` names its Commands: `Submit<Name>`, and `Validate<Name><Field>`
 *   for each field. Pick a name whose Commands can't match another Form's.
 *   Field names that differ only in the case of their first letter throw.
 * - `submit.execute` receives the decoded values and returns an Effect.
 * - Add `data` when it succeeds with a value, `error` when it can fail, and
 *   `context` when it needs a value the Form doesn't hold, such as the id of
 *   the record being edited. `submit` then takes that value.
 * - Add `toFieldErrors` to show a typed error on the fields it's about.
 *
 * Every codec must run without services.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export function define<
  const FormName extends string,
  const Schemas extends FieldSchemas,
  const Fields extends FieldDefinitions<Schemas, unknown>,
  SubmitEffect extends Effect.Effect<
    NoInfer<DataSchema['Type']>,
    NoInfer<ErrorSchema['Type']>,
    unknown
  >,
  DataSchema extends Schema.Codec<unknown, unknown> = typeof Schema.Void,
  ErrorSchema extends Schema.Codec<unknown, unknown> = typeof Schema.Never,
  ContextSchema extends Schema.Codec<unknown, unknown> = typeof Schema.Void,
  Returned extends FieldErrors<string> = {},
>(
  config: Readonly<{
    name: FormName
    fields: Fields &
      FieldDefinitions<Schemas, unknown> &
      Record<Exclude<keyof Fields, string>, never>
    submit: Readonly<{
      data?: DataSchema | undefined
      error?: ErrorSchema | undefined
      context?: ContextSchema | undefined
      execute: (
        values: NoInfer<FormValues<Schemas>>,
        context: NoInfer<ContextSchema['Type']>,
      ) => CheckedSubmitEffect<
        SubmitEffect,
        DataSchema['Type'],
        ErrorSchema['Type']
      >
      toFieldErrors?: [ErrorSchema['Type']] extends [never]
        ? undefined
        :
            | ((
                error: NoInfer<ErrorSchema['Type']>,
              ) => ExactFieldErrors<Returned, NoInfer<keyof Schemas & string>>)
            | undefined
    }>
  }>,
): FormDefinition<
  Schemas,
  DataSchema,
  ErrorSchema,
  ContextSchema,
  Effect.Services<SubmitEffect>,
  ValidatorRequirementsOf<Fields>,
  FormName,
  ValidatedFieldNameOf<Fields> & keyof Schemas
>
export function define<
  FormName extends string,
  Schemas extends FieldSchemas,
  A,
  AI,
  E,
  EI,
  Context,
  ContextEncoded,
  FieldRequirements = never,
  SubmitRequirements = never,
>(
  config: Readonly<{
    name: FormName
    fields: FieldDefinitions<Schemas, FieldRequirements>
    submit: Readonly<{
      data?: Schema.Codec<A, AI, never, never> | undefined
      error?: Schema.Codec<E, EI, never, never> | undefined
      context?: Schema.Codec<Context, ContextEncoded, never, never> | undefined
      execute: (
        values: NoInfer<FormValues<Schemas>>,
        context: Context,
      ) => Effect.Effect<A, E, SubmitRequirements>
      toFieldErrors?:
        | ((error: E) => FieldErrors<keyof Schemas & string>)
        | undefined
    }>
  }>,
): unknown {
  const fieldDefinitions = config.fields
  const fieldNames = Struct.keys(fieldDefinitions)
  const collidingFieldNames = Array.filter(fieldNames, fieldName =>
    Array.some(
      fieldNames,
      otherFieldName =>
        otherFieldName !== fieldName &&
        String.capitalize(otherFieldName) === String.capitalize(fieldName),
    ),
  )

  if (Array.isArrayNonEmpty(collidingFieldNames)) {
    throw new Error(
      `Form "${config.name}" has field names that differ only in the case of their first letter, so their validation Commands would share a name: ${collidingFieldNames.join(', ')}`,
    )
  }

  // NOTE: without a data codec execution returns void, and without a context
  // codec submit takes none. The public signature defaults the data and
  // context codecs to `Schema.Void` to match.
  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  const data = (config.submit.data ?? Schema.Void) as Schema.Codec<A, AI>
  const error: Schema.Codec<E, EI> = config.submit.error ?? Schema.Never
  const context = (config.submit.context ?? Schema.Void) as Schema.Codec<
    Context,
    ContextEncoded
  >
  /* eslint-enable @typescript-eslint/consistent-type-assertions */

  const Values = makeValuesSchema(fieldDefinitions)
  const Inputs = makeInputsSchema(fieldDefinitions)
  const SubmissionSchema = Submission(data, error, context, Inputs)

  const Model = FormModel(fieldDefinitions, SubmissionSchema).annotate({
    identifier: `${config.name}FormModel`,
  })

  const Message = FormMessage(fieldDefinitions, data, error)
  const OutMessage = FormOutMessage(data, error)

  const executeSubmit = (
    values: FormValues<Schemas>,
    submitContext: Context,
    generation: number,
  ) =>
    config.submit.execute(values, submitContext).pipe(
      Effect.result,
      Effect.map(result => Message.CompletedSubmit({ generation, result })),
    )

  const submitCommandName = `Submit${config.name}`

  type PublicSubmit = FormDefinitionOf<
    Schemas,
    A,
    AI,
    E,
    EI,
    Context,
    ContextEncoded,
    SubmitRequirements,
    FieldRequirements,
    string,
    never
  >['Submit']

  // NOTE: the public type reads whether Submit takes a context from Context,
  // which is void for a missing, `Schema.Void`, or `Schema.Undefined` context
  // Schema. The runtime checks the same three cases.
  const isContextDeclared =
    config.submit.context !== undefined &&
    !SchemaAST.isVoid(context.ast) &&
    !SchemaAST.isUndefined(context.ast)

  const makeSubmitCommand = (): Readonly<{
    Submit: PublicSubmit
    toSubmitCommand: (
      values: FormValues<Schemas>,
      submitContext: Context,
      generation: number,
    ) => Command.Command<Message, never, SubmitRequirements>
  }> => {
    if (!isContextDeclared) {
      const SubmitWithoutContext = Command.define(submitCommandName, {
        args: { values: Values, generation: Schema.Number },
        messages: [Message.CompletedSubmit],
        // NOTE: a Form without a context Schema has a void context.
        execute: ({ values, generation }) =>
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          executeSubmit(values, undefined as Context, generation),
      })

      return {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        Submit: SubmitWithoutContext as unknown as PublicSubmit,
        toSubmitCommand: (values, _submitContext, generation) =>
          SubmitWithoutContext({ values, generation }),
      }
    } else {
      const SubmitWithContext = Command.define(submitCommandName, {
        args: { values: Values, context, generation: Schema.Number },
        messages: [Message.CompletedSubmit],
        execute: ({ values, context, generation }) =>
          executeSubmit(values, context, generation),
      })

      return {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        Submit: SubmitWithContext as PublicSubmit,
        toSubmitCommand: (values, submitContext, generation) =>
          SubmitWithContext({ values, context: submitContext, generation }),
      }
    }
  }

  const { Submit, toSubmitCommand } = makeSubmitCommand()

  type Model = FormModel<Schemas, A, E, Context>
  type Message = typeof Message.Type
  type OutMessage = typeof OutMessage.Type
  type States = FieldStates<Schemas>
  type UpdateReturn = Update.ReturnWithOutMessage<
    Model,
    Message,
    OutMessage,
    FieldRequirements | SubmitRequirements
  >
  type SubmitReturn = Update.Return<
    Model,
    Message,
    FieldRequirements | SubmitRequirements
  >
  type ResetReturn = Update.Return<Model, Message>

  type FieldUpdate<S extends FieldSchema> = Readonly<{
    state: FieldState<S>
    maybeCommand: Option.Option<
      Command.Command<Message, never, FieldRequirements>
    >
  }>

  type FieldUpdates = Readonly<{
    [FieldName in keyof Schemas & string]: FieldUpdate<Schemas[FieldName]>
  }>

  type CompletedValidateField = typeof Message.CompletedValidateField.Type

  const defineValidateField = <FieldName extends keyof Schemas & string>(
    name: FieldName,
    definition: FieldDefinition<Schemas[FieldName], FieldRequirements>,
    validate: Validator<Schemas[FieldName], FieldRequirements>,
  ): ValidateFieldCommand<
    Schemas[FieldName],
    CompletedValidateField,
    FieldRequirements,
    `Validate${FormName}${Capitalize<FieldName>}`
  > =>
    Command.define(`Validate${config.name}${String.capitalize(name)}`, {
      args: {
        value: toValueSchema(definition.schema),
        generation: Schema.Number,
      },
      messages: [Message.CompletedValidateField],
      execute: ({ value, generation }) =>
        validate(value).pipe(
          Effect.result,
          Effect.map(result =>
            Message.CompletedValidateField({ name, generation, result }),
          ),
        ),
    })

  type MaybeValidateFieldCommands = Readonly<{
    [FieldName in keyof Schemas & string]: Option.Option<
      ValidateFieldCommand<
        Schemas[FieldName],
        CompletedValidateField,
        FieldRequirements,
        `Validate${FormName}${Capitalize<FieldName>}`
      >
    >
  }>

  const maybeValidateFieldCommands = mapFields<
    Schemas,
    MaybeValidateFieldCommands,
    FieldRequirements
  >(fieldDefinitions, (name, definition) =>
    Option.map(Option.fromNullishOr(definition.validate), validate =>
      defineValidateField(name, definition, validate),
    ),
  )

  // NOTE: Record.getSomes loses the per-key types; each entry is the check
  // Command of a field that has a `validate` Effect.
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const ValidateField = Record.getSomes<string, unknown>(
    maybeValidateFieldCommands,
  ) as unknown as ValidateFieldCommands<
    Schemas,
    CompletedValidateField,
    FieldRequirements,
    FormName,
    keyof Schemas & string
  >

  function validateField<FieldName extends keyof Schemas & string>(
    name: FieldName,
    state: FieldState<Schemas[FieldName]>,
    options: Readonly<{ mode: ValidationMode; isSameInput: boolean }>,
  ): FieldUpdate<Schemas[FieldName]> {
    const definition = fieldDefinitions[name]

    if (
      options.isSameInput &&
      definition.Status.isAnyOf(['Valid', 'Validating'])(state.validation)
    ) {
      return { state, maybeCommand: Option.none() }
    }

    const { status, isValidatorDue } = definition.check(
      state.input,
      options.mode,
    )
    const maybeValidateCommand = maybeValidateFieldCommands[name]

    if (
      status._tag !== 'Valid' ||
      !isValidatorDue ||
      Option.isNone(maybeValidateCommand)
    ) {
      return {
        state: definition.statusEquivalence(status, state.validation)
          ? state
          : { ...state, validation: status },
        maybeCommand: Option.none(),
      }
    }

    const validationGeneration = Number.increment(state.validationGeneration)

    return {
      state: {
        ...state,
        validationGeneration,
        validation: definition.Status.Validating({ value: status.value }),
      },
      maybeCommand: Option.some(
        maybeValidateCommand.value({
          value: status.value,
          generation: validationGeneration,
        }),
      ),
    }
  }

  const isCheckDueOnBlur = <FieldName extends keyof Schemas & string>(
    name: FieldName,
    state: FieldState<Schemas[FieldName]>,
  ): boolean =>
    fieldDefinitions[name].Status.match(state.validation, {
      NotValidated: () => true,
      Validating: () => false,
      Valid: () => false,
      Invalid: () =>
        fieldDefinitions[name].check(state.input, 'FirstError').status._tag ===
        'Valid',
      Rejected: () => false,
    })

  const replaceField = <FieldName extends keyof Schemas & string>(
    fields: States,
    name: FieldName,
    state: FieldState<Schemas[FieldName]>,
  ): States => ({ ...fields, [name]: state })

  const combineFieldUpdates = (fieldUpdates: FieldUpdates) => ({
    fields: Struct.map(fieldUpdates, toFieldUpdateState),
    commands: Array.getSomes(
      Array.map(fieldNames, name => fieldUpdates[name].maybeCommand),
    ),
  })

  function init<Provided extends Partial<FormValues<Schemas>>>(
    overrides?: ExactFields<Schemas, Provided>,
  ): Model {
    const fields = mapFields<Schemas, States, FieldRequirements>(
      fieldDefinitions,
      (name, definition) =>
        definition.initialize(
          overrides === undefined ? Option.none() : Record.get(overrides, name),
        ),
    )
    return {
      fields,
      submission: SubmissionSchema.Idle(),
      submitCount: 0,
      submissionGeneration: 0,
    }
  }

  const changed = (
    ...[name, input]: ChangeArgs<Schemas>
  ): typeof Message.ChangedField.Type =>
    Message.ChangedField({ change: { name, input } })

  type FieldChange = (typeof Message.ChangedField.Type)['change']

  const changedFields = <Provided extends Partial<FormInputs<Schemas>>>(
    changes: ExactFields<Schemas, Provided>,
  ): typeof Message.ChangedFields.Type =>
    Message.ChangedFields({
      changes: Array.getSomes(
        Array.map(fieldNames, name =>
          Option.map(
            Record.get(changes, name),
            // NOTE: Record.get loses the per-key type; the input under each
            // field name is that field's input.
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            input => ({ name, input }) as FieldChange,
          ),
        ),
      ),
    })

  const blurred = (
    name: keyof Schemas & string,
  ): typeof Message.BlurredField.Type => Message.BlurredField({ name })

  const inputs = (model: Model): FormInputs<Schemas> =>
    Struct.map(model.fields, toFieldInput)

  function fieldView<FieldName extends keyof Schemas & string>(
    model: Model,
    name: FieldName,
  ): FieldView<Schemas[FieldName]> {
    const state: FieldState<Schemas[FieldName]> = model.fields[name]
    const definition = fieldDefinitions[name]
    const validation: FieldStatus<Schemas[FieldName]> = state.validation

    return {
      input: state.input,
      maybeValue:
        validation._tag === 'Valid'
          ? Option.some(validation.value)
          : Result.getSuccess(definition.decode(state.input)),
      errors: definition.Status.isAnyOf(['Invalid', 'Rejected'])(validation)
        ? validation.errors
        : [],
      meta: {
        isTouched: state.isEdited || state.isBlurred,
        isBlurred: state.isBlurred,
        isEdited: state.isEdited,
        isDefaultInput: definition.inputEquivalence(
          state.input,
          state.defaultInput,
        ),
      },
    }
  }

  const submission = (model: Model) => model.submission

  const isSubmitPending = (model: Model): boolean =>
    SubmissionSchema.isAnyOf(['Validating', 'Submitting'])(model.submission)

  const formError = (model: Model): Option.Option<E> =>
    SubmissionSchema.matchOrElse(
      model.submission,
      {
        Failed: ({ error, isShownOnFields }) =>
          isShownOnFields ? Option.none() : Option.some(error),
      },
      () => Option.none(),
    )

  function rejectFields(
    fields: States,
    rejection: E,
    submittedInputs: FormInputs<Schemas>,
  ): States {
    if (config.submit.toFieldErrors === undefined) {
      return fields
    }

    const fieldErrors: Readonly<Record<string, string | undefined>> =
      config.submit.toFieldErrors(rejection)

    return mapFields<Schemas, States, FieldRequirements>(
      fieldDefinitions,
      (name, definition) => {
        const state: FieldState<Schemas[typeof name]> = fields[name]
        const maybeMessage = Option.flatMap(
          Record.get(fieldErrors, name),
          Option.fromNullishOr,
        )

        if (
          Option.isNone(maybeMessage) ||
          !definition.inputEquivalence(submittedInputs[name], state.input)
        ) {
          return state
        } else {
          return {
            ...state,
            validation: definition.Status.Rejected({
              errors: [maybeMessage.value],
            }),
          }
        }
      },
    )
  }

  const editField = (fields: States, change: FieldChange): States => {
    const { name } = change
    const state: FieldState<Schemas[typeof name]> = {
      ...fields[name],
      input: change.input,
      validation: fieldDefinitions[name].Status.NotValidated(),
      isEdited: true,
    }

    return replaceField(fields, name, state)
  }

  const checkChangedField = <FieldName extends keyof Schemas & string>(
    fields: States,
    name: FieldName,
  ): FieldUpdate<Schemas[FieldName]> => {
    const state: FieldState<Schemas[FieldName]> = fields[name]

    if (fieldDefinitions[name].validateOn === 'Change') {
      return validateField(name, state, {
        mode: 'FirstError',
        isSameInput: false,
      })
    } else {
      return { state, maybeCommand: Option.none() }
    }
  }

  function changeFields(
    model: Model,
    changes: ReadonlyArray<FieldChange>,
  ): UpdateReturn {
    if (Array.isReadonlyArrayEmpty(changes)) {
      return { model }
    }

    const editedFields = Array.reduce(changes, model.fields, editField)
    const changedNames = Array.dedupe(Array.map(changes, ({ name }) => name))
    const fieldChecks = Array.map(changedNames, name =>
      checkChangedField(editedFields, name),
    )
    const nextFields = Array.reduce(
      Array.zip(changedNames, fieldChecks),
      editedFields,
      (fields, [name, fieldCheck]) =>
        replaceField(fields, name, fieldCheck.state),
    )
    const nextSubmission =
      model.submission._tag === 'Submitting'
        ? model.submission
        : SubmissionSchema.Idle()

    return {
      model: modifyFields(model, {
        fields: () => nextFields,
        submission: () => nextSubmission,
      }),
      commands: Array.getSomes(
        Array.map(fieldChecks, ({ maybeCommand }) => maybeCommand),
      ),
    }
  }

  const update = (model: Model, message: Message): UpdateReturn =>
    Message.match<UpdateReturn>(message, {
      ChangedField: ({ change }) => changeFields(model, [change]),
      ChangedFields: ({ changes }) => changeFields(model, changes),
      BlurredField({ name }) {
        const state: FieldState<Schemas[typeof name]> = model.fields[name]
        const fieldBlur =
          fieldDefinitions[name].validateOn === 'Blur' &&
          isCheckDueOnBlur(name, state)
            ? validateField(name, state, {
                mode: 'FirstError',
                isSameInput: true,
              })
            : { state, maybeCommand: Option.none() }

        if (state.isBlurred && fieldBlur.state === state) {
          return { model }
        }

        const nextState = { ...fieldBlur.state, isBlurred: true }

        return {
          model: modifyFields(model, {
            fields: fields => replaceField(fields, name, nextState),
          }),
          commands: Option.toArray(fieldBlur.maybeCommand),
        }
      },
      CompletedValidateField({ name, generation, result }) {
        const definition = fieldDefinitions[name]
        const state: FieldState<Schemas[typeof name]> = model.fields[name]
        const validation: FieldStatus<Schemas[typeof name]> = state.validation

        if (
          validation._tag !== 'Validating' ||
          state.validationGeneration !== generation
        ) {
          return { model }
        }

        const nextValidation = Result.match(result, {
          onFailure: error => definition.Status.Invalid({ errors: [error] }),
          onSuccess: errors =>
            Array.match(errors, {
              onEmpty: () =>
                definition.Status.Valid({ value: validation.value }),
              onNonEmpty: errors => definition.Status.Invalid({ errors }),
            }),
        })

        const nextModel = modifyFields(model, {
          fields: fields =>
            replaceField(fields, name, {
              ...state,
              validation: nextValidation,
            }),
        })

        return continueSubmit(nextModel)
      },
      CompletedSubmit({ generation, result }) {
        if (
          model.submission._tag !== 'Submitting' ||
          model.submission.generation !== generation
        ) {
          return { model }
        }

        const submittedInputs = model.submission.inputs

        return Result.match(result, {
          onFailure: rejection => {
            const nextFields = rejectFields(
              model.fields,
              rejection,
              submittedInputs,
            )
            const isShownOnFields = Array.some(
              fieldNames,
              name => nextFields[name] !== model.fields[name],
            )

            return {
              model: modifyFields(model, {
                fields: () => nextFields,
                submission: () =>
                  SubmissionSchema.Failed({
                    error: rejection,
                    isShownOnFields,
                  }),
              }),
              outMessage: OutMessage.FailedSubmit({ error: rejection }),
            }
          },
          onSuccess: submittedData => ({
            model: modifyFields(model, {
              submission: () =>
                SubmissionSchema.Succeeded({ data: submittedData }),
            }),
            outMessage: OutMessage.SucceededSubmit({ data: submittedData }),
          }),
        })
      },
    })

  const reset = (model: Model): ResetReturn => ({
    model: modifyFields(model, {
      fields: () =>
        mapFields<Schemas, States, FieldRequirements>(
          fieldDefinitions,
          (name, definition) => {
            const state: FieldState<Schemas[typeof name]> = model.fields[name]

            return {
              ...state,
              input: state.defaultInput,
              validation: definition.Status.NotValidated(),
              isBlurred: false,
              isEdited: false,
            }
          },
        ),
      submission: () => SubmissionSchema.Idle(),
      submitCount: () => 0,
    }),
  })

  function reinitialize<Provided extends Partial<FormValues<Schemas>>>(
    model: Model,
    overrides: ExactFields<Schemas, Provided>,
  ): ResetReturn {
    const freshModel = init(overrides)

    return {
      model: modifyFields(freshModel, {
        fields: () =>
          mapFields<Schemas, States, FieldRequirements>(
            fieldDefinitions,
            name => {
              const state: FieldState<Schemas[typeof name]> =
                freshModel.fields[name]

              return {
                ...state,
                validationGeneration: model.fields[name].validationGeneration,
              }
            },
          ),
        submissionGeneration: () => model.submissionGeneration,
      }),
    }
  }

  const toMaybeValues = (model: Model): Option.Option<FormValues<Schemas>> =>
    // NOTE: Option.all over Record.map loses the per-key types; each entry is
    // that field's decoded value.
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    Option.all(
      Record.map(model.fields, ({ validation }) =>
        validation._tag === 'Valid'
          ? Option.some(validation.value)
          : Option.none(),
      ),
    ) as Option.Option<FormValues<Schemas>>

  function continueSubmit(model: Model): UpdateReturn {
    if (
      model.submission._tag !== 'Validating' ||
      Array.some(
        fieldNames,
        name => model.fields[name].validation._tag === 'Validating',
      )
    ) {
      return { model }
    }

    const { generation, context: submitContext } = model.submission

    return Option.match(toMaybeValues(model), {
      onNone: () => ({
        model: modifyFields(model, {
          submission: () => SubmissionSchema.Idle(),
        }),
      }),
      onSome: values => ({
        model: modifyFields(model, {
          submission: () =>
            SubmissionSchema.Submitting({ generation, inputs: inputs(model) }),
        }),
        commands: [toSubmitCommand(values, submitContext, generation)],
      }),
    })
  }

  function submit(model: Model, ...args: SubmitArgs<Context>): SubmitReturn {
    if (isSubmitPending(model)) {
      return { model }
    }

    // NOTE: SubmitArgs<Context> is empty only when Context is void, so a
    // missing argument is the void context.
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const submitContext = Array.head(args).pipe(
      Option.getOrUndefined,
    ) as Context

    const fieldUpdates = mapFields<Schemas, FieldUpdates, FieldRequirements>(
      fieldDefinitions,
      name =>
        validateField(name, model.fields[name], {
          mode: 'AllErrors',
          isSameInput: true,
        }),
    )
    const fieldChecks = combineFieldUpdates(fieldUpdates)
    const generation = Number.increment(model.submissionGeneration)
    const nextModel = modifyFields(model, {
      fields: () => fieldChecks.fields,
      submissionGeneration: () => generation,
      submitCount: Number.increment,
      submission: () =>
        SubmissionSchema.Validating({ generation, context: submitContext }),
    })
    const submitContinuation = continueSubmit(nextModel)

    return {
      model: submitContinuation.model,
      commands: [
        ...fieldChecks.commands,
        ...(submitContinuation.commands ?? []),
      ],
    }
  }

  function liftFromLens<ParentModel, ParentMessage, ParentOutMessage>(
    lens: FormLens<ParentModel, ParentMessage, Model, Message>,
    outMessageConfig: FoldOutMessageConfig<
      ParentModel,
      ParentMessage,
      Message,
      OutMessage,
      ParentOutMessage
    >,
  ) {
    const boundLens = Lens.bindReceiver(lens)
    const { foldOutMessage, toParentOutMessage } = outMessageConfig

    return {
      fold:
        toParentOutMessage === undefined
          ? Update.foldChild({ update, ...boundLens, foldOutMessage })
          : Update.foldChild({
              update,
              ...boundLens,
              foldOutMessage,
              toParentOutMessage,
            }),
      reset: Update.foldChildStep({ update: reset, ...boundLens }),
      reinitialize: <Provided extends Partial<FormValues<Schemas>>>(
        overrides: ExactFields<Schemas, Provided>,
      ): Update.Step<ParentModel, ParentMessage> =>
        Update.foldChildStep({
          update: (childModel: Model) => reinitialize(childModel, overrides),
          ...boundLens,
        }),
      submit: (
        ...args: SubmitArgs<Context>
      ): Update.Step<
        ParentModel,
        ParentMessage,
        FieldRequirements | SubmitRequirements
      > =>
        Update.foldChildStep({
          update: (childModel: Model) => submit(childModel, ...args),
          ...boundLens,
        }),
    }
  }

  type LiftConfig<ParentModel, ParentMessage, ParentOutMessage> =
    Lens.LiftConfig<ParentModel, ParentMessage, Model, Message> &
      FoldOutMessageConfig<
        ParentModel,
        ParentMessage,
        Message,
        OutMessage,
        ParentOutMessage
      >

  function lift<ParentModel, ParentMessage, ParentOutMessage = never>(
    config: LiftConfig<ParentModel, ParentMessage, ParentOutMessage>,
  ) {
    if (Lens.isParentFieldConfig(config)) {
      return liftFromLens(Lens.fromParentField(config), config)
    }

    return liftFromLens(config, config)
  }

  const submitCount = (model: Model) => model.submitCount

  const form: FormDefinition<
    Schemas,
    Schema.Codec<A, AI>,
    Schema.Codec<E, EI>,
    Schema.Codec<Context, ContextEncoded>,
    SubmitRequirements,
    FieldRequirements
  > = {
    Model,
    Message,
    OutMessage,
    Submission: SubmissionSchema,
    Values,
    Submit,
    ValidateField,
    init,
    changed,
    changedFields,
    blurred,
    inputs,
    submitCount,
    fieldView,
    submission,
    isSubmitPending,
    formError,
    update,
    reset,
    reinitialize,
    submit,
    lift,
  }

  return form
}

/** Functions that read the Form from the parent Model, write it back, and wrap
 * its Messages. Use a lens when the Form is optional, nested, or one of many.
 * Don't combine it with `parentField`.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FormLens<ParentModel, ParentMessage, ChildModel, ChildMessage> =
  Lens.FoldLens<ParentModel, ParentMessage, ChildModel, ChildMessage>

/** Lifts a Form stored in one parent field. The field must always hold a
 * whole Form Model. For an optional or nested Form, use {@link FormLens}.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type ParentFieldConfig<
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage,
> = Lens.ParentFieldConfig<ParentModel, ParentMessage, ChildModel, ChildMessage>
