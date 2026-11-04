import type { Schema } from 'effect'

import type { RequirementsOfBindings } from '../../block/binding.js'
import type { GeneratedEnvelopeOf } from '../../block/childEnvelope.js'
import type { ValidateDefinitionStepOutput } from '../../block/definition.js'
import type {
  AuthoredMessageArguments,
  AuthoredUpdateCases,
  AuthoredUpdateResult,
  CaseOutputChannels,
  CompositionDefinedUpdate,
  ContextualUpdateCases,
  ContextualUpdateCasesFactory,
  ContextualUpdateOutputs,
  IncomingMessageOfBinding,
  ResolvedAuthoredOutput,
  ValidateAnnotatedContext,
  ValidateAuthoredUpdate,
  ValidateMixedAuthoredOutput,
  ValidatedContextualUpdateCases,
} from '../../block/delivery.js'
import type { StepContextHint } from '../../block/focusedStep.js'
import type { OperationOutputs } from '../../block/operationOutputs.js'
import type * as Update from '../../update/index.js'
import type {
  AuthoringSource,
  MakeUpdatePlan,
  Plan,
  PlanOutput,
} from './authoring.js'

type AnyFunction = (...args: ReadonlyArray<any>) => any
type AnySchema = Schema.Codec<any, any, any, any>
type TagOf<Message> =
  Message extends Readonly<{ _tag: infer Tag extends string }> ? Tag : never

declare const InMessageAuthoringTypeId: unique symbol

/** @internal Retains the owning graph while selecting a separate input union. */
export type InMessageAuthoringSource<
  Source extends AuthoringSource,
  InputMessage,
  Message,
> = Omit<Source, 'Message'> &
  Readonly<{
    Message: Schema.Codec<InputMessage, unknown, never, never>
    [InMessageAuthoringTypeId]: Readonly<{ source: Source; message: Message }>
  }>

type SourceOf<Source extends AuthoringSource> =
  Source extends Readonly<{
    [InMessageAuthoringTypeId]: Readonly<{ source: infer Original }>
  }>
    ? Original
    : Source

type CommandMessage<Source extends AuthoringSource> =
  Source extends Readonly<{
    [InMessageAuthoringTypeId]: Readonly<{ message: infer Message }>
  }>
    ? Message
    : Source['Message']['Type']

type KindOf<Source extends AuthoringSource> =
  Source extends Readonly<{
    [InMessageAuthoringTypeId]: unknown
  }>
    ? 'InMessageUpdate'
    : 'Update'

type LocalMessage<Source extends AuthoringSource> = Exclude<
  Source['Message']['Type'],
  GeneratedEnvelopeOf<Source['bindings'][number]>['Type']
>

type OutMessage<Source extends AuthoringSource> =
  Source extends Readonly<{
    OutMessage: infer Out extends AnySchema
  }>
    ? Out['Type']
    : never

type InputModel<Source extends AuthoringSource> = Update.CompositionInput<
  Source['Model']['Type'],
  RequirementsOfBindings<Source['bindings']>
>

/** @internal Exact per-Message emission, requirement, and registration channels. */
export type ChannelRow = readonly [
  tag: string,
  outMessage: unknown,
  requirements: unknown,
  registration: unknown,
]

/** @internal Noncallable output contract for a focused update plan. */
export type RuntimeStageDescriptor = Readonly<{
  kind: 'Cases' | 'Each' | 'On' | 'Except' | 'Bundle'
}>

declare const StageTypeId: unique symbol

/** @internal Carries exact channels through nested update bundles. */
export interface CompositionMetadata<
  Source extends AuthoringSource,
  Rows extends ChannelRow,
  Covered extends string,
  Context extends ReadonlyArray<unknown>,
  Routers extends ReadonlyArray<unknown> = readonly [],
> {
  readonly [StageTypeId]: Readonly<{
    source: (source: Source) => Source
    rows: (rows: Rows) => Rows
    covered: Covered
    context: (context: Context) => Context
    routers: Routers
  }>
}

/** A focused update plan that requires an exhaustive update before completion. */
export interface UpdateStage<
  Source extends AuthoringSource,
  Rows extends ChannelRow,
  Covered extends string,
  Context extends ReadonlyArray<unknown>,
  Routers extends ReadonlyArray<unknown> = readonly [],
>
  extends
    Plan<RuntimeStageDescriptor, KindOf<Source>, SourceOf<Source>>,
    CompositionMetadata<Source, Rows, Covered, Context, Routers> {}

type SharedOutput<
  Source extends AuthoringSource,
  Output,
> = ResolvedAuthoredOutput<
  Output extends AnyFunction ? ReturnType<Output> : Output,
  Source['bindings']
>

type SharedRows<Source extends AuthoringSource, Message, Output> = {
  [Tag in TagOf<Message>]: readonly [
    tag: Tag,
    outMessage: never,
    requirements: Update.RequirementsOfResult<SharedOutput<Source, Output>>,
    registration: Update.RegistrationEvidenceOf<SharedOutput<Source, Output>>,
  ]
}[TagOf<Message>]

/** @internal Reuses canonical result, graph, and OutMessage validation. */
export type ValidateSharedOutput<
  Source extends AuthoringSource,
  Output,
> = 0 extends 1 & Output
  ? never
  : [Output] extends [never]
    ? never
    : (Output extends AnyFunction
        ? ValidateDefinitionStepOutput<
            Source['Model']['Type'],
            CommandMessage<Source>,
            never,
            Output
          > &
            (InputModel<Source> extends Parameters<Output>[0] ? unknown : never)
        : [Output] extends [
              AuthoredUpdateResult<
                Source['Model']['Type'],
                CommandMessage<Source>,
                never,
                Output
              >,
            ]
          ? unknown
          : never) &
        ValidateAuthoredUpdate<
          Source['Model']['Type'],
          CommandMessage<Source>,
          never,
          Output extends AnyFunction ? ReturnType<Output> : Output,
          Source['bindings']
        > &
        ValidateMixedAuthoredOutput<
          Output extends AnyFunction ? ReturnType<Output> : Output
        > &
        ([ReturnOutMessage<SharedOutput<Source, Output>>] extends [never]
          ? unknown
          : never)

/** Authors additional handlers for selected local Message tags. */
export interface Cases<
  Source extends AuthoringSource,
  ContextConstraint extends ReadonlyArray<unknown>,
> {
  <
    const Outputs extends Readonly<
      Partial<Record<TagOf<LocalMessage<Source>>, unknown>>
    >,
  >(
    cases: AuthoredUpdateCases<
      Source['Model']['Type'],
      LocalMessage<Source>,
      Source['bindings'],
      Outputs,
      CommandMessage<Source>,
      OutMessage<Source>
    > &
      Readonly<
        Record<Exclude<keyof Outputs, TagOf<LocalMessage<Source>>>, never>
      >,
    ...invalidMessageContract: AuthoredMessageArguments<LocalMessage<Source>>
  ): UpdateStage<
    Source,
    Extract<CaseOutputChannels<Source['bindings'], Outputs>, ChannelRow>,
    Extract<keyof Outputs, string>,
    readonly []
  >
  readonly withContext: <
    const Context extends ContextConstraint,
    const ContextualCases,
  >(
    createCases: ContextualUpdateCasesFactory<
      Context,
      ContextualCases &
        Partial<
          ContextualUpdateCases<
            Source['Model']['Type'],
            LocalMessage<Source>,
            Source['bindings'],
            CommandMessage<Source>,
            OutMessage<Source>
          >
        > &
        ValidatedContextualUpdateCases<
          Source['Model']['Type'],
          LocalMessage<Source>,
          Source['bindings'],
          ContextualUpdateOutputs<
            Source['Model']['Type'],
            LocalMessage<Source>,
            Source['bindings'],
            NoInfer<ContextualCases>
          >,
          CommandMessage<Source>,
          OutMessage<Source>
        > &
        Readonly<
          Record<
            Exclude<
              keyof NoInfer<ContextualCases>,
              TagOf<LocalMessage<Source>>
            >,
            never
          >
        >
    > &
      ValidateAnnotatedContext<NoInfer<Context>>,
  ) => UpdateStage<
    Source,
    Extract<
      CaseOutputChannels<
        Source['bindings'],
        ContextualUpdateOutputs<
          Source['Model']['Type'],
          LocalMessage<Source>,
          Source['bindings'],
          ContextualCases
        >
      >,
      ChannelRow
    >,
    Extract<keyof ContextualCases, string>,
    Context
  >
}

/** Authors a silent transition with the current Model and original dispatch snapshot. */
export type Shared<
  Source extends AuthoringSource,
  Message,
  Context extends ReadonlyArray<unknown>,
> =
  true extends IsUnion<TagOf<Message>>
    ? SharedTuple<Source, Message, Context>
    : SharedSingle<Source, Message, Context>

type IsUnion<Value, Whole = Value> = Value extends unknown
  ? [Whole] extends [Value]
    ? false
    : true
  : never

interface SharedSingle<
  Source extends AuthoringSource,
  Message,
  Context extends ReadonlyArray<unknown>,
> extends SharedTuple<Source, Message, Context> {
  <const Output>(
    producer: SharedCallback<Source, Message, Context, Output> &
      SharedCallback<
        Source,
        Message,
        Context,
        NoInfer<Output> & ValidateSharedOutput<Source, NoInfer<Output>>
      > &
      StepContextHint<readonly [message: Message]> &
      ValidateKnownOutput<NoInfer<Output>>,
  ): UpdateStage<Source, SharedRows<Source, Message, Output>, never, Context>
}

interface SharedTuple<
  Source extends AuthoringSource,
  Message,
  Context extends ReadonlyArray<unknown>,
> {
  <const Outputs extends readonly [unknown]>(
    ...producer: SharedArguments<Source, Message, Context, Outputs> &
      readonly [SharedCallback<Source, Message, Context, unknown>]
  ): UpdateStage<
    Source,
    SharedRows<Source, Message, Outputs[0]>,
    never,
    Context
  >
}

type ValidateKnownOutput<Output> = 0 extends 1 & Output
  ? Readonly<{ 'A shared callback cannot return any': never }>
  : [Output] extends [never]
    ? Readonly<{ 'A shared callback cannot return never': never }>
    : unknown

type SharedArguments<
  Source extends AuthoringSource,
  Message,
  Context extends ReadonlyArray<unknown>,
  Outputs extends readonly [unknown],
> = {
  readonly [Index in keyof Outputs]: SharedCallback<
    Source,
    Message,
    Context,
    Outputs[Index]
  > &
    StepContextHint<readonly [message: Message]>
} & {
  readonly [Index in keyof Outputs]: 0 extends 1 & NoInfer<Outputs>[Index]
    ? Readonly<{ 'A shared callback cannot return any': never }>
    : [NoInfer<Outputs>[Index]] extends [never]
      ? Readonly<{ 'A shared callback cannot return never': never }>
      : SharedCallback<
          Source,
          Message,
          Context,
          NoInfer<Outputs>[Index] &
            ValidateSharedOutput<Source, NoInfer<Outputs>[Index]>
        >
}

type SharedCallback<
  Source extends AuthoringSource,
  Message,
  Context extends ReadonlyArray<unknown>,
  Output,
> = (
  model: InputModel<Source>,
  message: Message,
  snapshot: Readonly<{ before: Source['Model']['Type'] }>,
  ...context: Context
) => Output

/** Composes focused transitions around one exhaustive Composition update. */
export interface ComposableUpdates<
  Source extends AuthoringSource,
  Context extends ReadonlyArray<unknown> = readonly [],
> {
  /** Adds exact local handlers without replacing the exhaustive record. */
  readonly cases: Cases<Source, Context>
  /** Applies to every accepted local or child update dispatch. */
  readonly each: Shared<Source, Source['Message']['Type'], Context>
  /** Selects local Message tags before authoring an exact shared handler. */
  readonly on: <const Tags extends ReadonlyArray<TagOf<LocalMessage<Source>>>>(
    tags: Tags,
  ) => Shared<
    Source,
    Extract<LocalMessage<Source>, Readonly<{ _tag: Tags[number] }>>,
    Context
  >
  /** Applies to local and child dispatches except the selected local tags. */
  readonly except: <
    const Tags extends ReadonlyArray<TagOf<LocalMessage<Source>>>,
  >(
    tags: Tags,
  ) => Shared<
    Source,
    Exclude<Source['Message']['Type'], Readonly<{ _tag: Tags[number] }>>,
    Context
  >
  /**
   * Applies updates in order, passing each transition the preceding Model.
   * Snapshot-aware callbacks receive the original Message and `{ before }`,
   * followed by declared dispatch context. Nested grouping preserves `before`.
   *
   * Focused-only bundles need one exhaustive update before Block completion.
   * Shared callbacks cannot emit OutMessages; record handlers retain exact
   * per-Message channels and cannot compete for the same emission.
   * Command intents accumulate without sequencing their execution.
   */
  readonly compose: <
    const Parts extends readonly [
      CompositionPart<Source>,
      ...ReadonlyArray<CompositionPart<Source>>,
    ],
  >(
    ...parts: Parts & ComposeValidation<Source, Context, Parts>
  ) => ComposedUpdate<Source, Context, Parts>
}

/** The exact focused bundle or complete plan produced by composing update plans. */
export type ComposedUpdate<
  Source extends AuthoringSource,
  Context extends ReadonlyArray<unknown>,
  Parts extends ReadonlyArray<CompositionPart<Source>>,
> =
  RoutersOf<Parts> extends readonly []
    ? UpdateStage<
        Source,
        MergedRows<Source, Parts[number]>,
        PartCovered<Source, Parts[number]>,
        Context
      >
    : RoutersOf<Parts> extends readonly [unknown]
      ? Plan<
          ComposedDispatcher<
            Source,
            Context,
            MergedRows<Source, Parts[number]>
          > &
            OperationOutputs<MergedRows<Source, Parts[number]>>,
          KindOf<Source>,
          SourceOf<Source>
        > &
          CompositionMetadata<
            Source,
            MergedRows<Source, Parts[number]>,
            PartCovered<Source, Parts[number]>,
            Context,
            readonly [unknown]
          >
      : never

/** Portable update authoring with exhaustive handlers and focused composition. */
export type MakeComposableUpdatePlan<
  Source extends AuthoringSource,
  Context extends ReadonlyArray<unknown> = ReadonlyArray<unknown>,
> = MakeUpdatePlan<Source, Context> & ComposableUpdates<Source, Context>

/** @internal Reads the per-Message channels of a focused plan. */
export type RowsOf<Stage> = StageRows<Stage>

/** @internal Reads the per-Message channels of a completed update. */
export type ChannelsOf<UpdateFunction> =
  UpdateFunction extends OperationOutputs<infer Channels> ? Channels : never

type RouteRows<Source extends AuthoringSource> =
  KindOf<Source> extends 'InMessageUpdate'
    ? never
    : Source['bindings'][number] extends infer Binding
      ? Binding extends Readonly<{ fold: infer Fold extends AnyFunction }>
        ? TagOf<IncomingMessageOfBinding<Binding>> extends infer Tag extends
            string
          ? ResolvedAuthoredOutput<
              ReturnType<Fold>,
              Source['bindings']
            > extends infer Output
            ? readonly [
                Tag,
                ReturnOutMessage<Output>,
                Update.RequirementsOfResult<Output>,
                Update.RegistrationEvidenceOf<Output>,
              ]
            : never
          : never
        : never
      : never

type ReturnOutMessage<Output> =
  Output extends Readonly<{
    outMessage?: infer Out
  }>
    ? Exclude<Out, undefined>
    : never

type CompositionPart<Source extends AuthoringSource> = Plan<
  RuntimeStageDescriptor | AnyFunction,
  KindOf<Source>,
  SourceOf<Source>
>

type InvalidPartMetadata<
  Source extends AuthoringSource,
  Part,
> = Part extends unknown ? InvalidPartAlternative<Source, Part> : never

type InvalidPartAlternative<
  Source extends AuthoringSource,
  Part,
  Output = PlanOutput<Part>,
> = 0 extends 1 & Part
  ? 'Any update plan'
  : 0 extends 1 & Output
    ? 'Any plan output'
    : [Output] extends [never]
      ? 'Never plan output'
      : Output extends (...args: ReadonlyArray<never>) => infer Result
        ? 0 extends 1 & Result
          ? 'Any update result'
          : [Result] extends [never]
            ? 'Never update result'
            : Output extends OperationOutputs<any>
              ? 0 extends 1 & ChannelsOf<Output>
                ? 'Any update channels'
                : never
              : [LocalMessage<Source>] extends [never]
                ? never
                : 'Missing per-Message update channels'
        : [MetadataOf<Part>] extends [never]
          ? 'Missing focused update metadata'
          : 0 extends 1 & StageRows<Part>
            ? 'Any focused update channels'
            : never

type MetadataOf<Part> =
  Part extends Readonly<{
    [StageTypeId]: infer Metadata
  }>
    ? Metadata
    : never

type StageRows<Part> =
  MetadataOf<Part> extends Readonly<{
    rows: (rows: infer Rows extends ChannelRow) => unknown
  }>
    ? Rows
    : never

type PartRows<Source extends AuthoringSource, Part> = Part extends unknown
  ? [MetadataOf<Part>] extends [never]
    ? ChannelsOf<PlanOutput<Part>> | RouteRows<Source>
    : StageRows<Part>
  : never

type PartCovered<Source extends AuthoringSource, Part> = Part extends unknown
  ? [MetadataOf<Part>] extends [never]
    ? TagOf<LocalMessage<Source>>
    : MetadataOf<Part> extends Readonly<{ covered: infer Tags extends string }>
      ? Tags
      : never
  : never

type PartRouters<Part> = Part extends unknown
  ? [MetadataOf<Part>] extends [never]
    ? readonly [unknown]
    : MetadataOf<Part> extends Readonly<{
          routers: infer Routers extends ReadonlyArray<unknown>
        }>
      ? Routers
      : never
  : never

type RoutersOf<Parts extends ReadonlyArray<unknown>> = Parts extends readonly [
  infer Part,
  ...infer Rest,
]
  ? readonly [...PartRouters<Part>, ...RoutersOf<Rest>]
  : [PartRouters<Parts[number]>] extends [readonly []]
    ? readonly []
    : ReadonlyArray<unknown>

type PartContext<Part> = Part extends unknown
  ? [MetadataOf<Part>] extends [never]
    ? PlanOutput<Part> extends AnyFunction
      ? Parameters<PlanOutput<Part>> extends readonly [
          unknown,
          unknown,
          ...infer Context,
        ]
        ? Readonly<Context>
        : never
      : never
    : MetadataOf<Part> extends Readonly<{
          context: (
            context: infer Context extends ReadonlyArray<unknown>,
          ) => unknown
        }>
      ? Context
      : never
  : never

type InvalidPartContext<
  Context extends ReadonlyArray<unknown>,
  Part,
> = Part extends unknown
  ? ((...context: PartContext<Part>) => void) extends (
      ...context: Context
    ) => void
    ? never
    : Part
  : never

type BadContext<
  Context extends ReadonlyArray<unknown>,
  Parts extends ReadonlyArray<unknown>,
> = {
  [Index in keyof Parts]: [InvalidPartContext<Context, Parts[Index]>] extends [
    never,
  ]
    ? never
    : Index
}[number]

type EmittingTags<Rows> = Rows extends readonly [
  infer Tag extends string,
  infer Out,
  unknown,
  unknown,
]
  ? [Out] extends [never]
    ? never
    : Tag
  : never

type CompetingEmitters<
  Source extends AuthoringSource,
  Parts extends ReadonlyArray<unknown>,
  Seen extends string = never,
> = Parts extends readonly [infer Part, ...infer Rest]
  ?
      | Extract<Seen, EmittingTags<PartRows<Source, Part>>>
      | CompetingEmitters<
          Source,
          Rest,
          Seen | EmittingTags<PartRows<Source, Part>>
        >
  : EmittingTags<PartRows<Source, Parts[number]>>

type ComposeValidation<
  Source extends AuthoringSource,
  Context extends ReadonlyArray<unknown>,
  Parts extends ReadonlyArray<unknown>,
> = ([InvalidPartMetadata<Source, Parts[number]>] extends [never]
  ? unknown
  : Readonly<{
      'Composition parts must preserve checked update metadata': InvalidPartMetadata<
        Source,
        Parts[number]
      >
    }>) &
  (RoutersOf<Parts> extends readonly []
    ? unknown
    : RoutersOf<Parts> extends readonly [unknown]
      ? unknown
      : Readonly<{
          'Composition must consistently contain zero or one complete update': never
        }>) &
  (RoutersOf<Parts> extends readonly []
    ? unknown
    : [
          Exclude<
            TagOf<LocalMessage<Source>>,
            PartCovered<Source, Parts[number]>
          >,
        ] extends [never]
      ? unknown
      : Readonly<{
          'Composition must handle every local Message': Exclude<
            TagOf<LocalMessage<Source>>,
            PartCovered<Source, Parts[number]>
          >
        }>) &
  ([CompetingEmitters<Source, Parts>] extends [never]
    ? unknown
    : Readonly<{
        'Composition cannot overwrite competing OutMessages': CompetingEmitters<
          Source,
          Parts
        >
      }>) &
  ([BadContext<Context, Parts>] extends [never]
    ? unknown
    : Readonly<{
        'Composition stages must accept its Context': BadContext<Context, Parts>
      }>)

type MergedRows<Source extends AuthoringSource, Part> =
  PartRows<Source, Part> extends infer Rows extends ChannelRow
    ? {
        [Tag in Rows[0]]: readonly [
          Tag,
          Extract<Rows, readonly [Tag, unknown, unknown, unknown]>[1],
          Extract<Rows, readonly [Tag, unknown, unknown, unknown]>[2],
          Extract<Rows, readonly [Tag, unknown, unknown, unknown]>[3],
        ]
      }[Rows[0]]
    : never

type OutputForRows<
  Source extends AuthoringSource,
  Rows extends ChannelRow,
> = Update.WithRegistrationEvidence<
  [Rows[1]] extends [never]
    ? Update.Return<Source['Model']['Type'], CommandMessage<Source>, Rows[2]>
    : Update.ReturnWithOutMessage<
        Source['Model']['Type'],
        CommandMessage<Source>,
        Rows[1],
        Rows[2]
      >,
  Rows[3]
>

type ComposedDispatcher<
  Source extends AuthoringSource,
  Context extends ReadonlyArray<unknown>,
  Rows extends ChannelRow,
> =
  KindOf<Source> extends 'InMessageUpdate'
    ? {
        (
          input: Source['Message']['Type'],
        ): (
          model: Source['Model']['Type'],
          ...context: Context
        ) => OutputForRows<Source, Rows>
        (
          model: Source['Model']['Type'],
          input: Source['Message']['Type'],
          ...context: Context
        ): OutputForRows<Source, Rows>
      }
    : CompositionDefinedUpdate<
        Source['Model']['Type'],
        Source['Message']['Type'],
        Context,
        OutputForRows<Source, Rows>,
        Source['bindings'],
        false
      >
