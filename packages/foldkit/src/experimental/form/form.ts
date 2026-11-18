import {
  Array,
  Effect,
  Record as EffectRecord,
  Number,
  Option,
  Result,
  Schema,
  SchemaIssue,
  SchemaParser,
  SchemaTransformation,
  String,
  Struct,
} from 'effect'
import type { Equivalence, SchemaAST } from 'effect'
import type { Simplify } from 'effect/Types'

import * as Command from '../../command/index.js'
import * as FieldValidation from '../../fieldValidation/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { defineTaggedUnion } from '../../schema/index.js'
import { modifyFields } from '../../struct/index.js'
import * as Update from '../../update/index.js'
import * as ChildLens from './lens.js'

/** A Schema codec for a field. Its `Encoded` side is the input the control
 * produces, such as the text of an `<input>`, and its `Type` side is the
 * domain value that rules, async validation, and submission receive. The codec
 * must decode and encode synchronously without services, and both sides must
 * be immutable, serializable Model data. Form stores each input in a required
 * property, so codecs with an optional key on either side are not supported.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FieldSchema = Schema.Codec<unknown, unknown, never, never> & {
  readonly '~type.optionality': 'required'
  readonly '~encoded.optionality': 'required'
}

/** Schemas indexed by a Form's field names. Used to describe generic Form
 * definitions and their values.
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

// NOTE: a field holds whatever the control produces, including input its
// Schema rejects, so the stored input keeps the encoded shape and skips the
// encoded side's checks. Decoding the input applies them.
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

const Errors = Schema.NonEmptyArray(Schema.String)

const FieldStatus = <S extends FieldSchema>(schema: S) => {
  const value = toValueSchema(schema)

  return defineTaggedUnion({
    NotValidated: {},
    Validating: { value },
    Valid: { value },
    Invalid: { errors: Errors },
    Rejected: { errors: Errors },
  })
}

type FieldStatusUnion<S extends FieldSchema> = ReturnType<typeof FieldStatus<S>>
type FieldStatus<S extends FieldSchema> = FieldStatusUnion<S>['Type']

const FieldState = <S extends FieldSchema>(schema: S) => {
  const input = toInputSchema(schema)

  return Schema.Struct({
    input,
    defaultInput: input,
    validation: FieldStatus(schema),
    validationGeneration: Schema.Number,
    isBlurred: Schema.Boolean,
    isEdited: Schema.Boolean,
  })
}

type FieldState<S extends FieldSchema> = ReturnType<
  typeof FieldState<S>
>['Type']

type Validator<S extends FieldSchema, R> = (
  value: S['Type'],
) => Effect.Effect<ReadonlyArray<string>, string, R>

type ValidationMode = 'FirstError' | 'AllErrors'

/** When a field runs its validation: after each change or after blur.
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

/** Field configuration with an optional asynchronous validator. `initial` is
 * the control's input, the Schema's `Encoded` side. Rules and the validator
 * receive the decoded value. The validator's services become requirements of
 * the Form's validation Commands.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FieldConfig<S extends FieldSchema, R = never> = FieldConfigBase<S> &
  Readonly<{ validate?: Validator<S, R> | undefined }>

type Check<S extends FieldSchema> = Readonly<{
  status: FieldStatus<S>
  isAsyncCheckDue: boolean
}>

type FieldDefinitionBase<S extends FieldSchema> = Readonly<{
  schema: S
  /** The Schema for a live field's input, validation, and interaction state. */
  State: ReturnType<typeof FieldState<S>>
  /** The Schema for a field's validation status. */
  Status: FieldStatusUnion<S>
  inputEquivalence: Equivalence.Equivalence<S['Encoded']>
  statusEquivalence: Equivalence.Equivalence<FieldStatus<S>>
  initialize: (maybeValue: Option.Option<S['Type']>) => FieldState<S>
  /** Decodes an input. Returns the value or the Schema's error messages. */
  decode: (
    input: S['Encoded'],
  ) => Result.Result<S['Type'], Array.NonEmptyReadonlyArray<string>>
  /** Decodes an input and checks the value against synchronous rules. */
  check: (input: S['Encoded'], mode: ValidationMode) => Check<S>
  validateOn: ValidationTrigger
}>

type FieldDefinitionWithValidator<
  S extends FieldSchema,
  R,
> = FieldDefinitionBase<S> & Readonly<{ validator: Validator<S, R> }>

type FieldDefinitionWithoutValidator<S extends FieldSchema> =
  FieldDefinitionBase<S> & Readonly<{ validator?: never }>

/** Reusable field configuration created by {@link field}. Each Form instance
 * stores its own input and validation state. The validator is present only
 * when asynchronous validation was supplied.
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

/** Defines a field's Schema, initial input, and validation. Reuse the
 * definition in multiple Forms to share field configuration.
 *
 * Validation decodes the input with the Schema first. A decode failure shows
 * the Schema's messages as the field's errors. A decoded value then runs
 * through `rules`, and `validate` runs only after both pass.
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
  const Status = FieldStatus(config.schema)
  const inputEquivalence = Schema.toEquivalence(toInputSchema(config.schema))
  const statusEquivalence = Schema.toEquivalence(Status)
  const decodeResult = Schema.decodeResult(config.schema)
  const encodeSync = Schema.encodeSync(config.schema, { disableChecks: true })
  const rules = config.rules ?? FieldValidation.makeRules<S['Type']>()
  const validateRules = FieldValidation.validate(rules)
  const validateAllRules = FieldValidation.validateAll(rules)

  const decode = (input: S['Encoded']) =>
    Result.mapError(decodeResult(input), toIssueMessages)

  const toCheck = (validation: FieldValidation.Field<S['Type']>): Check<S> =>
    FieldValidation.match(validation, {
      onNotValidated: value => ({
        status: Status.Valid({ value }),
        isAsyncCheckDue: false,
      }),
      onValidating: value => ({
        status: Status.Valid({ value }),
        isAsyncCheckDue: true,
      }),
      onValid: value => ({
        status: Status.Valid({ value }),
        isAsyncCheckDue: true,
      }),
      onInvalid: ({ errors }) => ({
        status: Status.Invalid({ errors }),
        isAsyncCheckDue: false,
      }),
    })

  const check = (input: S['Encoded'], mode: ValidationMode): Check<S> =>
    Result.match(decode(input), {
      onFailure: errors => ({
        status: Status.Invalid({ errors }),
        isAsyncCheckDue: false,
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
    return { ...definition, validator: config.validate }
  }
}

/** The input, decoded value, errors, and interaction metadata returned by a
 * Form's field selector. Render `input` in the control. `maybeValue` holds
 * the decoded value when the input decodes, whether or not rules pass.
 * `meta.isTouched` is true once the field was edited or blurred.
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

interface FieldInputLambda extends Struct.Lambda {
  <Input>(state: Readonly<{ input: Input }>): Input
  readonly '~lambda.in': Readonly<{ input: unknown }>
  readonly '~lambda.out': this['~lambda.in']['input']
}
const fieldInputLambda = Struct.lambda<FieldInputLambda>(state => state.input)

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

const toFieldStateSchema = Struct.lambda<StateLambda>(
  definition => definition.State,
)

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
): Output =>
  // NOTE: Record.map loses the per-key value types, so this boundary recovers
  // the record that build fills with one Output[Name] per field name.
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  EffectRecord.map(fields, (definition, name) =>
    build(name, definition),
  ) as unknown as Output

/** Decoded field values indexed by name. Submission execution receives them,
 * and `init` and `reinitialize` take a partial record of them as overrides.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FormValues<Schemas extends FieldSchemas> = Schema.Struct.View<
  Pick<Schemas, keyof Schemas & string>,
  'Type',
  never,
  never
>

/** Field inputs indexed by name: what each control holds, the `Encoded` side
 * of each field's Schema.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FormInputs<Schemas extends FieldSchemas> = Schema.Struct.View<
  Pick<Schemas, keyof Schemas & string>,
  'Encoded',
  never,
  never
>

const ValuesSchema = <Schemas extends FieldSchemas, FieldRequirements>(
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

const InputsSchema = <Schemas extends FieldSchemas, FieldRequirements>(
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
      >(fields, (_name, definition) => toInputSchema(definition.schema)),
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
  schema: S,
) =>
  Schema.Struct({
    name: Schema.Literal(name),
    input: toInputSchema(schema),
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

type MakeableCodec<T, E> = Schema.Codec<T, E> & {
  readonly '~type.make.in': T
  readonly '~type.make': T
}

const toMakeable = <T, E>(codec: Schema.Codec<T, E>) =>
  Schema.make<MakeableCodec<T, E>>(codec.ast)

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
      change: Schema.Union(
        Array.map(Struct.keys(Changes), name => Changes[name]),
      ),
    },
    BlurredField: { name: Schema.Literals(names) },
    CompletedSubmit: {
      generation: Schema.Number,
      result: Schema.Result(data, error),
    },
    CompletedValidateField: {
      name: Schema.Literals(names),
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
    SucceededSubmit: { data: toMakeable(data) },
    FailedSubmit: { error: toMakeable(error) },
  })
}

const Submission = <A, AI, E, EI, Context, ContextEncoded, Inputs>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
  context: Schema.Codec<Context, ContextEncoded>,
  inputs: MakeableCodec<Inputs, Inputs>,
) =>
  defineTaggedUnion({
    Idle: {},
    Validating: { generation: Schema.Number, context: toMakeable(context) },
    Submitting: { generation: Schema.Number, inputs },
    Succeeded: { data: toMakeable(data) },
    Failed: { error: toMakeable(error) },
  })

type SubmissionUnion<Schemas extends FieldSchemas, A, E, Context> = ReturnType<
  typeof Submission<A, A, E, E, Context, Context, FormInputs<Schemas>>
>

/** The submission lifecycle of one Form definition, with its typed success
 * data and errors: `Form.Submission<typeof contactForm>`.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type Submission<
  Definition extends Readonly<{ Submission: Readonly<{ Type: unknown }> }>,
> = Definition['Submission']['Type']

/** The decoded values one Form definition's submission receives:
 * `Form.Values<typeof contactForm>`.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type Values<
  Definition extends Readonly<{ Values: Readonly<{ Type: unknown }> }>,
> = Definition['Values']['Type']

/** The OutMessage one Form definition's update returns when it accepts a
 * submission result: `Form.OutMessage<typeof contactForm>`.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type OutMessage<
  Definition extends Readonly<{ OutMessage: Readonly<{ Type: unknown }> }>,
> = Definition['OutMessage']['Type']

/** Error messages for some of a Form's fields, indexed by field name. Returned
 * by `submit.toFieldErrors` to show a submission error on the fields it
 * concerns.
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

type FormState<Schemas extends FieldSchemas, A, E, Context> = Simplify<
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

/** The arguments `submit` takes after the Form Model: none when the Form has
 * no `submit.context` Schema, or the context value when it has one.
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

type Overrides<Schemas extends FieldSchemas, Given> = Given &
  Record<Exclude<keyof Given, keyof Schemas>, never>

/** Folds a Form's OutMessage into the parent as a Step. The Step receives the
 * parent Model with the Form already written back.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export type FoldOutMessage<
  ParentModel,
  ParentMessage,
  ChildMessage,
  ChildOutMessage,
> = (
  outMessage: ChildOutMessage,
  context: Update.FoldContext<ChildMessage, ParentMessage>,
) => Update.Step<NoInfer<ParentModel>, ParentMessage>

type FoldOutMessageConfig<
  ParentModel,
  ParentMessage,
  ChildMessage,
  ChildOutMessage,
> = Readonly<{
  foldOutMessage: FoldOutMessage<
    ParentModel,
    ParentMessage,
    ChildMessage,
    ChildOutMessage
  >
}>

/** Form operations lifted to a parent Model and Message. `fold` is a dual
 * {@link Update.Fold}; `reset`, `reinitialize`, and `submit` return Steps, so
 * they compose with `Update.combine`.
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
  Context = void,
> = Readonly<{
  /** Applies a child Message, maps validation and submission Commands to
   * parent Messages, and runs `foldOutMessage` when the Form accepts a
   * submission result. */
  fold: Update.Fold<
    ParentModel,
    ParentMessage,
    FormMessage<Schemas, A, AI, E, EI>['Type'],
    Requirements
  >
  /** Restores defaults and clears interaction and submission state, preserving generations. */
  reset: Update.Step<ParentModel, ParentMessage>
  /** Replaces defaults and clears interaction and submission state, preserving generations. */
  reinitialize: <Given extends Partial<FormValues<Schemas>>>(
    overrides?: Overrides<Schemas, Given>,
  ) => Update.Step<ParentModel, ParentMessage>
  /** Checks every field and returns validation or submission Commands for a new attempt. */
  submit: (
    ...args: SubmitArgs<Context>
  ) => Update.Step<ParentModel, ParentMessage, Requirements>
}>

/** A Form's Schemas, selectors, and update functions. Submission is owned by
 * the Form and configured when the definition is created.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export interface FormDefinition<
  Schemas extends FieldSchemas,
  A = void,
  AI = A,
  E = never,
  EI = E,
  Context = void,
  ContextEncoded = Context,
  SubmitRequirements = never,
  FieldRequirements = never,
  Name extends string = string,
> {
  /** The Schema for field state and submission state. */
  readonly Model: FormModelSchema<
    Schemas,
    A,
    AI,
    E,
    EI,
    Context,
    ContextEncoded
  >
  /** The Schema for field changes, blur events, and validation and submission completions. */
  readonly Message: FormMessage<Schemas, A, AI, E, EI>
  /** The Schema for the submission results the Form reports to its parent. */
  readonly OutMessage: FormOutMessage<A, AI, E, EI>
  /** The submission union for this definition. */
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
  /** The Schema that decodes field inputs into the values submission receives. */
  readonly Values: Schema.Codec<FormValues<Schemas>, FormInputs<Schemas>>
  /** Submission Command factory for Story and Scene matching. Start attempts
   * through submit so the Model and generation advance together. */
  readonly Submit: Command.CommandDefinitionWithArgs<
    `Submit${Name}`,
    {
      readonly values: Schema.Codec<FormValues<Schemas>, FormInputs<Schemas>>
      readonly context: Schema.Codec<Context, ContextEncoded>
      readonly generation: typeof Schema.Number
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
    FieldRequirements,
    Name
  >
  /** Creates clean state. Overrides are decoded values. Form encodes them into
   * inputs, and they become reset defaults. Use reset or reinitialize to
   * replace a live instance and preserve request generations. */
  readonly init: <Given extends Partial<FormValues<Schemas>>>(
    overrides?: Overrides<Schemas, Given>,
  ) => FormState<Schemas, A, E, Context>
  /** Creates a change Message from a field's input. */
  readonly changed: (
    ...args: ChangeArgs<Schemas>
  ) => FormMessage<Schemas, A, AI, E, EI>['Type']
  /** Creates a blur Message for a field. */
  readonly blurred: (
    name: keyof Schemas & string,
  ) => FormMessage<Schemas, A, AI, E, EI>['Type']
  /** Returns the input of every field, indexed by name. */
  readonly inputs: (
    model: FormState<Schemas, A, E, Context>,
  ) => FormInputs<Schemas>
  /** Returns a field's input, decoded value, errors, and interaction metadata. */
  readonly fieldView: <FieldName extends keyof Schemas & string>(
    model: FormState<Schemas, A, E, Context>,
    name: FieldName,
  ) => FieldView<Schemas[FieldName]>
  /** Returns the submission state, including typed success data or error. */
  readonly submission: (
    model: FormState<Schemas, A, E, Context>,
  ) => SubmissionUnion<Schemas, A, E, Context>['Type']
  /** Returns attempts since init, reset, or reinitialize. Pending repeated submits are ignored. */
  readonly submitCount: (model: FormState<Schemas, A, E, Context>) => number
  /** Applies a Message and returns validation or submission Commands. Returns
   * an OutMessage when it accepts a submission result. */
  readonly update: (
    model: FormState<Schemas, A, E, Context>,
    message: FormMessage<Schemas, A, AI, E, EI>['Type'],
  ) => Update.ReturnWithOutMessage<
    FormState<Schemas, A, E, Context>,
    FormMessage<Schemas, A, AI, E, EI>['Type'],
    FormOutMessage<A, AI, E, EI>['Type'],
    SubmitRequirements | FieldRequirements
  >
  /** Restores defaults and clears interaction and submission state, preserving generations. */
  readonly reset: (
    model: FormState<Schemas, A, E, Context>,
  ) => Update.Return<
    FormState<Schemas, A, E, Context>,
    FormMessage<Schemas, A, AI, E, EI>['Type']
  >
  /** Replaces defaults and clears interaction and submission state, preserving generations. */
  readonly reinitialize: <Given extends Partial<FormValues<Schemas>>>(
    model: FormState<Schemas, A, E, Context>,
    overrides?: Overrides<Schemas, Given>,
  ) => Update.Return<
    FormState<Schemas, A, E, Context>,
    FormMessage<Schemas, A, AI, E, EI>['Type']
  >
  /** Checks all fields for a new attempt. Validation completions automatically
   * return the Submit Command when every field is valid. Invalid attempts
   * return to Idle after all checks finish. Repeated pending submits are
   * ignored. When the Form has a `submit.context` Schema, pass the context
   * value after the Model. */
  readonly submit: (
    model: FormState<Schemas, A, E, Context>,
    ...args: SubmitArgs<Context>
  ) => Update.Return<
    FormState<Schemas, A, E, Context>,
    FormMessage<Schemas, A, AI, E, EI>['Type'],
    SubmitRequirements | FieldRequirements
  >
  /** Lifts Form operations through a required parent field or a child lens.
   * `foldOutMessage` folds each accepted submission result into the parent. */
  readonly lift: {
    <ParentModel, ParentMessage>(
      config: ParentFieldConfig<
        ParentModel,
        ParentMessage,
        FormState<Schemas, A, E, Context>,
        FormMessage<Schemas, A, AI, E, EI>['Type']
      > &
        FoldOutMessageConfig<
          ParentModel,
          ParentMessage,
          FormMessage<Schemas, A, AI, E, EI>['Type'],
          FormOutMessage<A, AI, E, EI>['Type']
        >,
    ): LiftedForm<
      Schemas,
      ParentModel,
      ParentMessage,
      SubmitRequirements | FieldRequirements,
      A,
      AI,
      E,
      EI,
      Context
    >
    <ParentModel, ParentMessage>(
      config: FormLens<
        ParentModel,
        ParentMessage,
        FormState<Schemas, A, E, Context>,
        FormMessage<Schemas, A, AI, E, EI>['Type']
      > &
        FoldOutMessageConfig<
          ParentModel,
          ParentMessage,
          FormMessage<Schemas, A, AI, E, EI>['Type'],
          FormOutMessage<A, AI, E, EI>['Type']
        >,
    ): LiftedForm<
      Schemas,
      ParentModel,
      ParentMessage,
      SubmitRequirements | FieldRequirements,
      A,
      AI,
      E,
      EI,
      Context
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
  Name extends string,
> = Readonly<{
  [FieldName in keyof Schemas & string]: ValidateFieldCommand<
    Schemas[FieldName],
    CompletedMessage,
    FieldRequirements,
    `Validate${Name}${Capitalize<FieldName>}`
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
 *
 * - Supply a `data` codec when execution returns success data, and an `error`
 *   codec when execution can fail.
 * - Supply a `context` codec when execution needs a value the Form doesn't
 *   hold, such as the id of the record being edited. `submit` then takes that
 *   value after the Model, and execution receives it after the values.
 * - Supply `toFieldErrors` to show a typed submission error on the fields it
 *   concerns.
 *
 * `name` names the Form's Commands: `Submit<Name>` and, for each field,
 * `Validate<Name><Field>` with the field name's first letter capitalized. Give
 * each Form a name that doesn't run into another Form's name and field. Field
 * names that differ only in the case of their first letter throw.
 *
 * Every codec must decode and encode without services. Its init operation
 * creates an instance. Its lift operation adapts Form Messages to a parent
 * update handler.
 *
 * @experimental Ships from `foldkit/experimental/form`; expect breaking changes while the API settles.
 */
export function define<
  const Name extends string,
  const Schemas extends FieldSchemas,
  const Fields extends FieldDefinitions<Schemas, unknown>,
  SubmitEffect extends Effect.Effect<NoInfer<A>, NoInfer<E>, unknown>,
  A = void,
  AI = A,
  E = never,
  EI = E,
  Context = void,
  ContextEncoded = Context,
  Returned extends FieldErrors<string> = {},
>(
  config: Readonly<{
    name: Name
    fields: Fields &
      FieldDefinitions<Schemas, unknown> &
      Record<Exclude<keyof Fields, string>, never>
    submit: Readonly<{
      data?: Schema.Codec<A, AI, never, never> | undefined
      error?: Schema.Codec<E, EI, never, never> | undefined
      context?: Schema.Codec<Context, ContextEncoded, never, never> | undefined
      execute: (
        values: NoInfer<FormValues<Schemas>>,
        context: NoInfer<Context>,
      ) => SubmitEffectFor<SubmitEffect, A, E>
      toFieldErrors?: [E] extends [never]
        ? undefined
        :
            | ((
                error: NoInfer<E>,
              ) => ExactFieldErrors<Returned, NoInfer<keyof Schemas & string>>)
            | undefined
    }>
  }>,
): FormDefinition<
  Schemas,
  A,
  AI,
  E,
  EI,
  Context,
  ContextEncoded,
  Effect.Services<SubmitEffect>,
  RequirementsOf<Fields>,
  Name
>
export function define<
  Name extends string,
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
    name: Name
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
  const definitions = config.fields
  const names = Struct.keys(definitions)
  const commandFieldNames = Array.map(names, String.capitalize)

  if (Array.dedupe(commandFieldNames).length !== commandFieldNames.length) {
    throw new Error(
      `Form "${config.name}" has field names that differ only in the case of their first letter, so their validation Commands would share a name: ${names.join(', ')}`,
    )
  }

  // NOTE: an omitted data codec means execution succeeds with void, and an
  // omitted context codec means submit takes no context. The public signature
  // defaults A and Context to void in those cases.
  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  const data = (config.submit.data ?? Schema.Void) as Schema.Codec<A, AI>
  const error: Schema.Codec<E, EI> = config.submit.error ?? Schema.Never
  const context = (config.submit.context ?? Schema.Void) as Schema.Codec<
    Context,
    ContextEncoded
  >
  /* eslint-enable @typescript-eslint/consistent-type-assertions */

  const Values = ValuesSchema(definitions)
  const Inputs = InputsSchema(definitions)
  const SubmissionState = Submission(data, error, context, Inputs)

  const Model = FormModel(definitions, SubmissionState).annotate({
    identifier: `${config.name}FormModel`,
  })

  const Message = FormMessage(definitions, data, error)
  const OutMessage = FormOutMessage(data, error)

  const Submit = Command.define(`Submit${config.name}`, {
    args: { values: Values, context, generation: Schema.Number },
    messages: [Message.CompletedSubmit],
    execute: ({ values, context, generation }) =>
      config.submit.execute(values, context).pipe(
        Effect.result,
        Effect.map(result => Message.CompletedSubmit({ generation, result })),
      ),
  })

  type Model = FormState<Schemas, A, E, Context>
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

  const defineValidateField = <FieldName extends keyof Schemas & string>(
    name: FieldName,
    definition: FieldDefinition<Schemas[FieldName], FieldRequirements>,
  ): ValidateFieldCommand<
    Schemas[FieldName],
    CompletedValidateField,
    FieldRequirements,
    `Validate${Name}${Capitalize<FieldName>}`
  > =>
    Command.define(`Validate${config.name}${String.capitalize(name)}`, {
      args: {
        value: Schema.make<
          Schema.Codec<
            Schemas[FieldName]['Type'],
            Schemas[FieldName]['Encoded']
          >
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
    ValidateFieldCommands<
      Schemas,
      CompletedValidateField,
      FieldRequirements,
      Name
    >,
    FieldRequirements
  >(definitions, defineValidateField)

  function validateField<Name extends keyof Schemas & string>(
    name: Name,
    state: FieldState<Schemas[Name]>,
    options: Readonly<{ mode: ValidationMode; isSameInput: boolean }>,
  ): FieldUpdate<Schemas[Name]> {
    const definition = definitions[name]

    if (
      options.isSameInput &&
      (state.validation._tag === 'Valid' ||
        state.validation._tag === 'Validating')
    ) {
      return { state, maybeCommand: Option.none() }
    }

    const { status, isAsyncCheckDue } = definition.check(
      state.input,
      options.mode,
    )

    if (
      status._tag !== 'Valid' ||
      !isAsyncCheckDue ||
      definition.validator === undefined
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
        ValidateField[name]({
          value: status.value,
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

  function init<Given extends Partial<FormValues<Schemas>>>(
    overrides?: Overrides<Schemas, Given>,
  ): Model {
    const fields = mapFields<Schemas, States, FieldRequirements>(
      definitions,
      (name, definition) =>
        definition.initialize(
          overrides === undefined
            ? Option.none()
            : EffectRecord.get(overrides, name),
        ),
    )
    return {
      fields,
      submission: SubmissionState.Idle(),
      submitCount: 0,
      submissionGeneration: 0,
    }
  }

  const changed = (...[name, input]: ChangeArgs<Schemas>): Message =>
    Message.ChangedField({ change: { name, input } })

  const blurred = (name: keyof Schemas & string): Message =>
    Message.BlurredField({ name })

  const inputs = (model: Model): FormInputs<Schemas> =>
    Struct.map(model.fields, fieldInputLambda)

  function fieldView<FieldName extends keyof Schemas & string>(
    model: Model,
    name: FieldName,
  ): FieldView<Schemas[FieldName]> {
    const state: FieldState<Schemas[FieldName]> = model.fields[name]
    const definition = definitions[name]
    const validation: FieldStatus<Schemas[FieldName]> = state.validation

    return {
      input: state.input,
      maybeValue: Result.getSuccess(definition.decode(state.input)),
      errors:
        validation._tag === 'Invalid' || validation._tag === 'Rejected'
          ? validation.errors
          : [],
      meta: {
        isTouched: state.isEdited || state.isBlurred,
        isBlurred: state.isBlurred,
        isEdited: state.isEdited,
        isDefaultValue: definition.inputEquivalence(
          state.input,
          state.defaultInput,
        ),
      },
    }
  }

  const submission = (model: Model) => model.submission

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
      definitions,
      (name, definition) => {
        const state: FieldState<Schemas[typeof name]> = fields[name]
        const maybeMessage = Option.flatMap(
          EffectRecord.get(fieldErrors, name),
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

  const update = (model: Model, message: Message): UpdateReturn =>
    Message.match<UpdateReturn>(message, {
      ChangedField({ change }) {
        const { name } = change
        const definition = definitions[name]
        const state: FieldState<Schemas[typeof name]> = {
          ...model.fields[name],
          input: change.input,
          validation: definition.Status.NotValidated(),
          isEdited: true,
        }

        const fieldChange: FieldUpdate<Schemas[typeof name]> =
          definition.validateOn === 'Change'
            ? validateField(name, state, {
                mode: 'FirstError',
                isSameInput: false,
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
        const state: FieldState<Schemas[typeof name]> = model.fields[name]
        const fieldBlur =
          definitions[name].validateOn === 'Blur' &&
          state.validation._tag !== 'Rejected'
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
        const definition = definitions[name]
        const state: FieldState<Schemas[typeof name]> = model.fields[name]
        const pending: FieldStatus<Schemas[typeof name]> = state.validation

        if (
          pending._tag !== 'Validating' ||
          state.validationGeneration !== generation
        ) {
          return { model }
        }

        const validation = Result.match(result, {
          onFailure: error => definition.Status.Invalid({ errors: [error] }),
          onSuccess: errors =>
            Array.match(errors, {
              onEmpty: () => definition.Status.Valid({ value: pending.value }),
              onNonEmpty: errors => definition.Status.Invalid({ errors }),
            }),
        })

        const nextModel = modifyFields(model, {
          fields: fields =>
            replaceField(fields, name, { ...state, validation }),
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
          onFailure: rejection => ({
            model: modifyFields(model, {
              fields: fields =>
                rejectFields(fields, rejection, submittedInputs),
              submission: () => SubmissionState.Failed({ error: rejection }),
            }),
            outMessage: OutMessage.FailedSubmit({ error: rejection }),
          }),
          onSuccess: submittedData => ({
            model: modifyFields(model, {
              submission: () =>
                SubmissionState.Succeeded({ data: submittedData }),
            }),
            outMessage: OutMessage.SucceededSubmit({ data: submittedData }),
          }),
        })
      },
    })

  const reset = (model: Model): PureUpdateReturn => ({
    model: modifyFields(model, {
      fields: () =>
        mapFields<Schemas, States, FieldRequirements>(
          definitions,
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
      submission: () => SubmissionState.Idle(),
      submitCount: () => 0,
    }),
  })

  function reinitialize<Given extends Partial<FormValues<Schemas>>>(
    model: Model,
    overrides?: Overrides<Schemas, Given>,
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
        submissionGeneration: () => model.submissionGeneration,
      }),
    }
  }

  const collectValidValues = (
    model: Model,
  ): Option.Option<FormValues<Schemas>> =>
    // NOTE: Option.all over Record.map loses the per-key value types; each
    // entry is the decoded value of the field with that name.
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    Option.all(
      EffectRecord.map(model.fields, ({ validation }) =>
        validation._tag === 'Valid'
          ? Option.some(validation.value)
          : Option.none(),
      ),
    ) as Option.Option<FormValues<Schemas>>

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

    const { generation, context: submitContext } = model.submission

    return Option.match(collectValidValues(model), {
      onNone: () => ({
        model: modifyFields(model, {
          submission: () => SubmissionState.Idle(),
        }),
      }),
      onSome: values => ({
        model: modifyFields(model, {
          submission: () =>
            SubmissionState.Submitting({ generation, inputs: inputs(model) }),
        }),
        commands: [Submit({ values, context: submitContext, generation })],
      }),
    })
  }

  function submit(model: Model, ...args: SubmitArgs<Context>): SubmitReturn {
    if (
      model.submission._tag === 'Submitting' ||
      model.submission._tag === 'Validating'
    ) {
      return { model }
    }

    // NOTE: SubmitArgs<Context> is empty exactly when Context is void, so an absent
    // argument stands for the void context.
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const submitContext = Array.head(args).pipe(
      Option.getOrUndefined,
    ) as Context

    const steps = mapFields<Schemas, FieldUpdates, FieldRequirements>(
      definitions,
      name =>
        validateField(name, model.fields[name], {
          mode: 'AllErrors',
          isSameInput: true,
        }),
    )
    const formValidation = assembleFieldUpdates(steps)
    const generation = Number.increment(model.submissionGeneration)
    const nextModel = modifyFields(model, {
      fields: () => formValidation.fields,
      submissionGeneration: () => generation,
      submitCount: Number.increment,
      submission: () =>
        SubmissionState.Validating({ generation, context: submitContext }),
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
    foldOutMessage: FoldOutMessage<
      ParentModel,
      ParentMessage,
      Message,
      OutMessage
    >,
  ) {
    const callbacks = ChildLens.preserveLensReceiver(lens)

    return {
      fold: Update.foldChild({ update, ...callbacks, foldOutMessage }),
      reset: Update.foldChildStep({ update: reset, ...callbacks }),
      reinitialize: <Given extends Partial<FormValues<Schemas>>>(
        overrides?: Overrides<Schemas, Given>,
      ): Update.Step<ParentModel, ParentMessage> =>
        Update.foldChildStep({
          update: (childModel: Model) => reinitialize(childModel, overrides),
          ...callbacks,
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
          ...callbacks,
        }),
    }
  }

  type LiftConfig<ParentModel, ParentMessage> = ChildLens.LiftConfig<
    ParentModel,
    ParentMessage,
    Model,
    Message
  > &
    FoldOutMessageConfig<ParentModel, ParentMessage, Message, OutMessage>

  function lift<ParentModel, ParentMessage>(
    config: LiftConfig<ParentModel, ParentMessage>,
  ) {
    if (ChildLens.isParentFieldConfig(config)) {
      return liftFromLens(
        ChildLens.parentFieldToLens(config),
        config.foldOutMessage,
      )
    }

    return liftFromLens(config, config.foldOutMessage)
  }

  const definition: FormDefinition<
    Schemas,
    A,
    AI,
    E,
    EI,
    Context,
    ContextEncoded,
    SubmitRequirements,
    FieldRequirements
  > = {
    Model,
    Message,
    OutMessage,
    Submission: SubmissionState,
    Values,
    Submit,
    ValidateField,
    init,
    changed,
    blurred,
    inputs,
    submitCount: (model: Model) => model.submitCount,
    fieldView,
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
