import type { Command } from '../command/index.js'
import type * as Update from '../update/index.js'
import type { AnyBinding, RequirementsOfBindings } from './binding.js'
import type {
  HasInvalidCombinedStepsRegistration,
  ResolveCompositionOutput,
} from './deferredPolicy.js'
import type {
  AnyBindingInitRecipe,
  BindingInitRecipeReturn,
} from './initRecipe.js'

/** @internal Carries one Binding's startup assembly contract. */
declare const InitialBindingEvidenceTypeId: unique symbol

/** @internal Type-level startup assembly evidence retained by an initialized Binding. */
export interface InitialBindingEvidence<
  Field extends string,
  Value,
  ChildInitContext,
  Requirements,
  Registration,
> {
  readonly [InitialBindingEvidenceTypeId]: Readonly<{
    field: Field
    value: Value
    childInitContext: ChildInitContext
    requirements: Requirements
    registration: Registration
  }>
}

/** @internal Recovers startup assembly evidence from one Binding. */
export type InitialEvidenceOfBinding<BindingValue> =
  BindingValue extends Readonly<{
    [InitialBindingEvidenceTypeId]: infer Evidence
  }>
    ? Evidence
    : never

type InitialEvidenceOfBindings<
  ChildBindings extends ReadonlyArray<AnyBinding>,
> = InitialEvidenceOfBinding<ChildBindings[number]>

type KeysOfUnion<Value> = Value extends unknown ? keyof Value : never

type HasInitialBindings<ChildBindings extends ReadonlyArray<unknown>> =
  typeof InitialBindingEvidenceTypeId extends KeysOfUnion<ChildBindings[number]>
    ? true
    : false

type InitialFieldEvidence<ChildBindings extends ReadonlyArray<AnyBinding>> =
  HasInitialBindings<ChildBindings> extends true
    ? InitialEvidenceOfBindings<ChildBindings>
    : never

type InitialFields<ChildBindings extends ReadonlyArray<AnyBinding>> = Readonly<{
  [
    Evidence in InitialFieldEvidence<ChildBindings> as Evidence extends Readonly<{
      field: infer Field extends string
    }>
      ? Field
      : never
  ]: Evidence extends Readonly<{ value: infer Value }> ? Value : never
}>

type InitialChildInitContextFunctions<
  ChildBindings extends ReadonlyArray<AnyBinding>,
> =
  InitialEvidenceOfBindings<ChildBindings> extends infer Evidence
    ? HasInitialBindings<ChildBindings> extends true
      ? Evidence extends Readonly<{ childInitContext: infer ChildInitContext }>
        ? [ChildInitContext] extends [never]
          ? never
          : (childInitContext: ChildInitContext) => void
        : never
      : never
    : never

type InitialChildInitContext<ChildBindings extends ReadonlyArray<AnyBinding>> =
  HasInitialBindings<ChildBindings> extends true
    ? [InitialChildInitContextFunctions<ChildBindings>] extends [never]
      ? never
      : InitialChildInitContextFunctions<ChildBindings> extends (
            childInitContext: infer ChildInitContext,
          ) => void
        ? ChildInitContext
        : never
    : never

/** @internal Checks shared selector inputs and an optional Definition ChildInitContext contract. */
export type ValidateChildInitContext<
  ChildBindings extends ReadonlyArray<AnyBinding>,
  ChildInitContext,
> = [InitialChildInitContextFunctions<ChildBindings>] extends [never]
  ? unknown
  : [InitialChildInitContext<ChildBindings>] extends [never]
    ? Readonly<{
        'Binding init selectors must accept one compatible ChildInitContext': never
      }>
    : [ChildInitContext] extends [never]
      ? unknown
      : [ChildInitContext, InitialChildInitContext<ChildBindings>] extends [
            InitialChildInitContext<ChildBindings>,
            ChildInitContext,
          ]
        ? unknown
        : Readonly<{
            'Binding init selectors must match the parent Definition ChildInitContext': InitialChildInitContext<ChildBindings>
          }>

type InitialRequirements<ChildBindings extends ReadonlyArray<AnyBinding>> =
  HasInitialBindings<ChildBindings> extends true
    ? InitialEvidenceOfBindings<ChildBindings> extends infer Evidence
      ? Evidence extends Readonly<{ requirements: infer Requirements }>
        ? Requirements
        : never
      : never
    : never

type InitialRegistration<ChildBindings extends ReadonlyArray<AnyBinding>> =
  HasInitialBindings<ChildBindings> extends true
    ? InitialEvidenceOfBindings<ChildBindings> extends infer Evidence
      ? Evidence extends Readonly<{ registration: infer Registration }>
        ? Registration
        : never
      : never
    : never

/**
 * A parent Model transformation applied after initialized child fields have
 * been assembled. Initialization Steps cannot emit an OutMessage.
 */
export type InitializationStep<
  Model,
  Message,
  GraphRequirement = never,
  DispatchMessage = Message,
> = (model: Update.GraphInput<Model, GraphRequirement>) =>
  | Readonly<{
      model: Model
      commands?: ReadonlyArray<Command<Message, never, any>> | undefined
      outMessage?: never
    }>
  | Update.ResultRecipe<Model, DispatchMessage, never, any, unknown>

type ParentOwnedModel<
  Model,
  ChildBindings extends ReadonlyArray<AnyBinding>,
> = [keyof InitialFields<ChildBindings>] extends [never]
  ? Model
  : Omit<Model, keyof InitialFields<ChildBindings>> & {
      readonly [Field in keyof InitialFields<ChildBindings>]?: never
    }

type ChildInitContextPlan<ChildBindings extends ReadonlyArray<AnyBinding>> = [
  InitialChildInitContextFunctions<ChildBindings>,
] extends [never]
  ? Readonly<{
      /**
       * Optional input shared with child Binding init policies. It is not stored
       * in the Model. Omit it when no child init policy needs shared context.
       */
      childInitContext?: unknown
    }>
  : Readonly<{
      /**
       * Input shared with every child Binding init selector. Its type must
       * satisfy all registered selectors; it is not stored in the Model.
       */
      childInitContext: InitialChildInitContext<ChildBindings>
    }>

/**
 * The declarative work returned by a Composition initializer. The parent
 * supplies only its owned Model fields; initialized Bindings supply theirs.
 * Unsupported string fields are rejected rather than silently ignored.
 */
export type InitializationPlan<
  Model,
  Message,
  ChildBindings extends ReadonlyArray<AnyBinding>,
  DispatchMessage = Message,
> = Readonly<{
  /**
   * Parent-owned initial fields. Omit fields supplied by registered Binding
   * init policies; Composition assembles them before constructing the Model.
   */
  model: ParentOwnedModel<Model, ChildBindings>
  /**
   * Parent Commands placed before retained child init Commands and Step
   * Commands. The Runtime executes them after initialization. Collection order
   * does not impose an order on asynchronous completion.
   */
  commands?: ReadonlyArray<Command<Message, never, any>> | undefined
  /**
   * Pure parent Steps applied in order after child Models are assembled.
   * Each Step receives the preceding Model, and its Commands follow retained
   * child init Commands. Steps must handle child OutMessages through their
   * Binding policies rather than return an unhandled OutMessage.
   */
  steps?:
    | ReadonlyArray<
        InitializationStep<
          Model,
          Message,
          RequirementsOfBindings<ChildBindings>,
          DispatchMessage
        >
      >
    | undefined
  /**
   * Initializers have no OutMessage receiver. Return parent transitions and
   * Commands directly, or apply Steps whose Binding policies handle them.
   */
  outMessage?: never
}> &
  ChildInitContextPlan<ChildBindings>

type CommandsOf<Output> =
  Output extends Readonly<{
    commands?: infer Commands
  }>
    ? NonNullable<Commands> extends ReadonlyArray<infer CommandValue>
      ? CommandValue
      : never
    : never

type StepsOf<Output> =
  Output extends Readonly<{ steps?: infer Steps }>
    ? NonNullable<Steps> extends ReadonlyArray<infer Step>
      ? Step
      : never
    : never

type ResolvedInitializationOutput<
  Output,
  ChildBindings extends ReadonlyArray<AnyBinding>,
> = Output extends AnyBindingInitRecipe
  ? ResolveCompositionOutput<BindingInitRecipeReturn<Output>, ChildBindings>
  : Output

type CommandRequirements<CommandValue> =
  CommandValue extends Command<any, any, infer Requirements>
    ? Requirements
    : never

type StepFunctionOf<Output> = Extract<
  StepsOf<Output>,
  (...args: ReadonlyArray<any>) => any
>

type StepReturnOf<Output, ChildBindings extends ReadonlyArray<AnyBinding>> =
  StepFunctionOf<Output> extends (
    ...args: ReadonlyArray<never>
  ) => infer StepReturn
    ? ResolveCompositionOutput<StepReturn, ChildBindings>
    : never

type InitializedModel<
  Model,
  ChildBindings extends ReadonlyArray<AnyBinding>,
  Output,
> = [keyof InitialFields<ChildBindings>] extends [never]
  ? [StepsOf<ResolvedInitializationOutput<Output, ChildBindings>>] extends [
      never,
    ]
    ? ResolvedInitializationOutput<Output, ChildBindings> extends Readonly<{
        model: infer ParentModel
      }>
      ? ParentModel
      : never
    : Model
  : Model

/**
 * The fully assembled return of a Composition initializer, including exact
 * Command requirements and child registration evidence.
 */
export type InitializationReturn<
  Model,
  Message,
  ChildBindings extends ReadonlyArray<AnyBinding>,
  Output,
> = Update.WithRegistrationEvidence<
  Update.Return<
    InitializedModel<Model, ChildBindings, Output>,
    Message,
    | InitialRequirements<ChildBindings>
    | CommandRequirements<
        CommandsOf<ResolvedInitializationOutput<Output, ChildBindings>>
      >
    | Update.RequirementsOf<
        () => StepReturnOf<
          ResolvedInitializationOutput<Output, ChildBindings>,
          ChildBindings
        >
      >
  >,
  | InitialRegistration<ChildBindings>
  | Update.RegistrationEvidenceOf<
      ResolvedInitializationOutput<Output, ChildBindings>
    >
  | Update.RegistrationEvidenceOf<
      StepReturnOf<
        ResolvedInitializationOutput<Output, ChildBindings>,
        ChildBindings
      >
    >
>

type FunctionArguments<FunctionValue> = FunctionValue extends (
  ...args: infer Arguments extends ReadonlyArray<any>
) => any
  ? Arguments
  : never

type CallableArguments<FunctionValue> = [...FunctionArguments<FunctionValue>]

type NormalizedFunction<Init extends (...args: ReadonlyArray<any>) => any> = (
  ...args: CallableArguments<Init>
) => ReturnType<Init>

type InvalidInitSignature<Init> = readonly [
  error: Readonly<{
    'Composition initializers require a plain function with one concrete call signature': Init
  }>,
]

type ValidateSingleInitSignature<Init> = Init extends (
  ...args: ReadonlyArray<any>
) => any
  ? [keyof Init] extends [never]
    ? [FunctionArguments<Init>] extends [never]
      ? InvalidInitSignature<Init>
      : [NormalizedFunction<Init>] extends [Init]
        ? readonly []
        : InvalidInitSignature<Init>
    : InvalidInitSignature<Init>
  : never

type ReturnOutMessage<Output> = Output extends unknown
  ? 'outMessage' extends keyof Output
    ? Output extends Readonly<{ outMessage?: infer OutMessage }>
      ? Exclude<OutMessage, undefined>
      : never
    : never
  : never

type ValidateInitializationOutMessage<
  Init,
  ChildBindings extends ReadonlyArray<AnyBinding>,
> = Init extends (...args: ReadonlyArray<any>) => infer Output
  ? [
      ReturnOutMessage<
        StepReturnOf<
          ResolvedInitializationOutput<Output, ChildBindings>,
          ChildBindings
        >
      >,
    ] extends [never]
    ? readonly []
    : readonly [
        error: Readonly<{
          'Composition initializers cannot apply a Step whose registered Binding policy may emit an OutMessage': ReturnOutMessage<
            StepReturnOf<
              ResolvedInitializationOutput<Output, ChildBindings>,
              ChildBindings
            >
          >
        }>,
      ]
  : readonly []

type ResolvedInitializationRegistration<
  Output,
  ChildBindings extends ReadonlyArray<AnyBinding>,
> =
  | Update.RegistrationEvidenceOf<
      ResolvedInitializationOutput<Output, ChildBindings>
    >
  | Update.RegistrationEvidenceOf<
      StepReturnOf<
        ResolvedInitializationOutput<Output, ChildBindings>,
        ChildBindings
      >
    >

type ValidateInitializationCombinedSteps<
  Init,
  ChildBindings extends ReadonlyArray<AnyBinding>,
> = Init extends (...args: ReadonlyArray<any>) => infer Output
  ? HasInvalidCombinedStepsRegistration<
      ResolvedInitializationRegistration<Output, ChildBindings>
    > extends true
    ? readonly [
        error: Readonly<{
          'Update.combineSteps cannot discard an OutMessage produced by a registered child Binding policy; return that bound operation directly': never
        }>,
      ]
    : readonly []
  : readonly []

type InitializationRecipeValues<Output> =
  | ResolvedInitializationOutput<Output, readonly []>
  | (StepsOf<
      ResolvedInitializationOutput<Output, readonly []>
    > extends infer Step
      ? Step extends (...args: ReadonlyArray<any>) => infer StepOutput
        ? StepOutput
        : never
      : never)

type ValidateInitializationEvidence<Init> = Init extends (
  ...args: ReadonlyArray<any>
) => infer Output
  ? unknown extends Update.ValidateConcreteResultEvidence<
      InitializationRecipeValues<Output>
    >
    ? readonly []
    : readonly [
        error: Update.ValidateConcreteResultEvidence<
          InitializationRecipeValues<Output>
        >,
      ]
  : readonly []

type InitializationPlanFields =
  | 'model'
  | 'commands'
  | 'steps'
  | 'childInitContext'
  | 'outMessage'

type UnknownInitializationFields<
  Output,
  ChildBindings extends ReadonlyArray<AnyBinding>,
> = Exclude<
  Extract<
    KeysOfUnion<ResolvedInitializationOutput<Output, ChildBindings>>,
    string
  >,
  InitializationPlanFields
>

type ValidateInitializationFields<
  Init,
  ChildBindings extends ReadonlyArray<AnyBinding>,
> = Init extends (...args: ReadonlyArray<any>) => infer Output
  ? [UnknownInitializationFields<Output, ChildBindings>] extends [never]
    ? readonly []
    : readonly [
        error: Readonly<{
          'Composition initializer returned unknown fields': UnknownInitializationFields<
            Output,
            ChildBindings
          >
        }>,
      ]
  : readonly []

type ValidateInit<
  Init,
  ChildBindings extends ReadonlyArray<AnyBinding>,
> = readonly [
  ...ValidateSingleInitSignature<Init>,
  ...ValidateInitializationFields<Init, ChildBindings>,
  ...ValidateInitializationEvidence<Init>,
  ...ValidateInitializationOutMessage<Init, ChildBindings>,
  ...ValidateInitializationCombinedSteps<Init, ChildBindings>,
]

/**
 * Authors a Composition-owned initializer. Authoring is passive: the supplied
 * function and child initialization policies run only when the returned
 * initializer is invoked. Its exact default, optional, and rest parameters are
 * preserved.
 */
export interface CompositionInit<
  Model,
  Message,
  ChildBindings extends ReadonlyArray<AnyBinding>,
  DispatchMessage = Message,
> {
  <
    const Init extends (
      ...args: ReadonlyArray<never>
    ) =>
      | InitializationPlan<Model, Message, ChildBindings, DispatchMessage>
      | AnyBindingInitRecipe,
    const Validation extends ValidateInit<NoInfer<Init>, ChildBindings> =
      ValidateInit<NoInfer<Init>, ChildBindings>,
  >(
    create: Init,
    ...validation: Validation
  ): NoInfer<
    (
      ...args: CallableArguments<Init>
    ) => InitializationReturn<
      Model,
      DispatchMessage,
      ChildBindings,
      ReturnType<Init>
    >
  >
}

type PreciseInitialField<BindingValue> =
  InitialEvidenceOfBinding<BindingValue> extends Readonly<{
    field: infer Field extends string
  }>
    ? string extends Field
      ? never
      : Field
    : never

type PreciseInitialFields<ChildBindings extends ReadonlyArray<unknown>> = {
  [Index in keyof ChildBindings]: PreciseInitialField<ChildBindings[Index]>
}

type FieldIndexes<Fields extends ReadonlyArray<string>> = {
  [
    Index in keyof Fields as Index extends `${number}` ? Fields[Index] : never
  ]: Index
}

type IsUnion<Value, Whole = Value> = Value extends unknown
  ? [Whole] extends [Value]
    ? false
    : true
  : never

type DuplicateFieldKeys<Indexes> = {
  [Field in keyof Indexes]: true extends IsUnion<Indexes[Field]> ? Field : never
}[keyof Indexes]

type DuplicatePreciseInitialFields<Fields extends ReadonlyArray<string>> =
  Extract<DuplicateFieldKeys<FieldIndexes<Fields>>, string>

/** @internal Rejects startup policies that assemble the same parent field. */
export type ValidateUniqueInitialFields<
  ChildBindings extends ReadonlyArray<unknown>,
> =
  HasInitialBindings<ChildBindings> extends true
    ? number extends ChildBindings['length']
      ? unknown
      : [
            DuplicatePreciseInitialFields<PreciseInitialFields<ChildBindings>>,
          ] extends [infer Duplicate extends string]
        ? [Duplicate] extends [never]
          ? unknown
          : Readonly<{
              'Block child initialization fields must be unique': Duplicate
            }>
        : never
    : unknown
