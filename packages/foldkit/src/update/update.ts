import { Array, type Effect, Function, Option, pipe } from 'effect'

import { type AsyncData } from '../asyncData/index.js'
import { type Command, mapMessage, mapMessages } from '../command/index.js'
import {
  assertResolvedStep,
  isResultRecipe,
  makeResultRecipe,
  resolveOperationOutput,
} from './operationRecipe.js'

declare const ResultRecipeTypesTypeId: unique symbol

/**
 * An opaque result produced by a graph-connected Step.
 *
 * It preserves the exact Model, Message, OutMessage, Command requirements, and
 * Binding registration types. Return or compose it intact: `.model`,
 * `.commands`, and `.outMessage` are unavailable until checked execution.
 * A matching Composition `makeInit` or `makeUpdate` interprets it with the
 * registered graph active. A completed Block's exposed operation produces a
 * Message, invokes that completed update, and interprets any recipe returned by
 * the selected branch.
 *
 * This type provides no public executor. Ordinary {@link Return} and
 * {@link ReturnWithOutMessage} values remain readable Model-and-Commands results.
 */
export interface ResultRecipe<
  Model,
  Message,
  OutMessage = never,
  R = never,
  Evidence = never,
> extends DeferredUpdateEvidence<Model, Message, R, Evidence> {
  readonly [ResultRecipeTypesTypeId]: readonly [
    model: (model: Model) => Model,
    message: () => Message,
    outMessage: () => OutMessage,
    requirements: () => R,
    evidence: () => Evidence,
  ]
}

/** @internal Erased passive update result. */
export type AnyResultRecipe = ResultRecipe<any, any, any, any, any>

/** @internal Recovers the input Model retained by a passive result. */
export type ResultRecipeModel<Recipe> =
  Recipe extends ResultRecipe<infer Model, any, any, any, any> ? Model : never

/** @internal Recovers the update return retained by a passive result. */
export type ResultRecipeOutput<Recipe> =
  Recipe extends ResultRecipe<
    infer Model,
    infer Message,
    infer OutMessage,
    infer R,
    infer Evidence
  >
    ? 0 extends 1 & Model
      ? any
      : ResultRecipeReturn<Model, Message, OutMessage, R, Evidence>
    : never

/** @internal Recursively resolves nested passive result output. */
export type ResolvedOperationOutput<Value> = Value extends AnyResultRecipe
  ? ResolvedOperationOutput<ResultRecipeOutput<Value>>
  : Value

/**
 * The Commands collection an update return may include. The collection keeps
 *  the order in which the update returned them, but the runtime forks the
 *  Commands independently. `R` is the services the Commands need and defaults
 *  to `never` for updates without service requirements.
 *
 *  Name an alias when a module reuses the same Message and service types:
 *
 *  ```ts
 *  export type Commands = Update.Commands<Message, AppServices>
 *  ```
 */
export type Commands<Message, R = never> = ReadonlyArray<
  Command<Message, never, R>
>

declare const GraphCapabilityTypeId: unique symbol

declare const DeferredUpdateEvidenceTypeId: unique symbol

declare const DeferredResultEvidenceTypeId: unique symbol
declare const DeferredCombinedStepsPolicyTypeId: unique symbol

type ConcreteGraphRequirement<Requirement> = 0 extends 1 & Requirement
  ? never
  : unknown extends Requirement
    ? never
    : Requirement

/**
 * Carries the exact registered Binding graph available to a Composition callback.
 * Connected Steps require this capability on their Model input.
 * Apply them inside a Composition `makeUpdate` handler or `makeInit` callback.
 * To define a reusable Step before composition, return the connected Step from
 * `Definition.makeStep`, or return `Update.combineSteps(steps)` for several Steps.
 */
export interface GraphCapability<Model, Requirement> {
  readonly 'Connected Step requires its registered Composition: apply inside makeUpdate/makeInit, or defer with Definition.makeStep': never
  readonly [GraphCapabilityTypeId]: readonly [
    model: () => Model,
    requirement: (requirement: ConcreteGraphRequirement<Requirement>) => void,
  ]
}

/**
 * @internal Retains an update result's exact type channels on a passive value.
 */
export interface DeferredUpdateEvidence<Model, Message, R, Evidence> {
  readonly [DeferredUpdateEvidenceTypeId]: readonly [
    model: () => Model,
    message: () => Message,
    requirements: () => R,
    registrationEvidence: () => Evidence,
  ]
}

/** @internal Retains an obligation that a completed graph must interpret. */
export interface DeferredResultEvidence<Evidence> {
  readonly [DeferredResultEvidenceTypeId]: (evidence: Evidence) => Evidence
}

/** @internal Marks the exact deferred Binding policy evidence whose OutMessage
 * would be discarded by `combineSteps`. */
export interface DeferredCombinedStepsPolicy<Evidence> {
  readonly [DeferredCombinedStepsPolicyTypeId]: (evidence: Evidence) => Evidence
}

type AnyDeferredResultEvidence = DeferredResultEvidence<any>

/** @internal Adds a Binding graph requirement to an ordinary Model input. */
export type GraphInput<Model, Requirement> = [Requirement] extends [never]
  ? Model
  : Model & GraphCapability<Model, Requirement>

/** @internal Adds the registered Binding graph to a Composition callback. */
export type CompositionInput<Model, Requirement> = GraphInput<
  Model,
  Requirement
>

type GraphCapabilityModel<Value> =
  Value extends GraphCapability<any, any>
    ? Value[typeof GraphCapabilityTypeId][0] extends () => infer Model
      ? Model
      : never
    : Value

type GraphCapabilityRequirement<Value> =
  Value extends GraphCapability<any, any>
    ? Value[typeof GraphCapabilityTypeId][1] extends (
        requirement: infer Requirement,
      ) => void
      ? Requirement
      : never
    : never

/** @internal Reads a connected Step's required Binding graph from its input. */
export type GraphRequirementOf<FunctionValue> = FunctionValue extends (
  model: infer Model,
  ...context: ReadonlyArray<any>
) => any
  ? GraphCapabilityRequirement<Model>
  : never

/** @internal Reads the domain Model retained by a connected Step input. */
export type GraphModelOf<FunctionValue> = FunctionValue extends (
  model: infer Input,
  ...context: ReadonlyArray<any>
) => any
  ? GraphCapabilityModel<Input>
  : never

type GraphModelOfValue<Value> = GraphCapabilityModel<Value>

/** @internal Carries child registration evidence without adding Effect services. */
export declare const RegistrationEvidenceTypeId: unique symbol

type NoRegistrationEvidence = Readonly<{
  [RegistrationEvidenceTypeId]?: never
}>

/** Type-level proof that an update result uses a child Binding registered in its
 * owning Composition. It adds no Effect service requirement at runtime. */
export type RegistrationEvidence<Evidence> = Readonly<{
  [RegistrationEvidenceTypeId]?: () => Evidence
}>

type ReturnValue<Model, Message, R = never> = Readonly<{
  model: Model
  commands?: Commands<Message, R> | undefined
  outMessage?: never
}>

type ReturnWithOutMessageValue<
  Model,
  Message,
  OutMessage,
  R = never,
> = Readonly<{
  model: Model
  commands?: Commands<Message, R> | undefined
  outMessage?: OutMessage
}>

/**
 * The record an update returns when it cannot emit an OutMessage: the next
 *  Model and any Commands to run.
 *
 *  Inline the type when a matcher is its only use:
 *
 *  ```ts
 *  export const update = (model: Model, message: Message) =>
 *    Message.match<Update.Return<Model, Message>>(message, {
 *      ClickedSave: () => ({ model, commands: [Save()] }),
 *      SucceededSave: ({ note }) => ({
 *        model: modifyFields(model, { note: () => note }),
 *      }),
 *    })
 *  ```
 *
 *  Give it a local `UpdateReturn` alias when another matcher or helper in the
 *  module needs the same type. When Commands use handler Layers, wrap the
 *  update with {@link define} to infer their requirements across branches.
 *  An explicit `Return<Model, Message>` annotation fixes `R` to `never`.
 *
 *  A graph-connected Step instead retains an opaque {@link ResultRecipe}
 *  until checked composition applies it.
 */
export type Return<Model, Message, R = never> = Readonly<{
  model: Model
  commands?: (Commands<Message, R> & NoRegistrationEvidence) | undefined
  /** This result emits no OutMessage. The field may be omitted but cannot hold
   *  a value. TypeScript therefore rejects a result containing an OutMessage
   *  where a caller would keep only the Model and Commands. */
  outMessage?: never
}> &
  NoRegistrationEvidence

type AnyUpdate = (...args: ReadonlyArray<any>) => any

type AnyStep = (model: any, ...context: ReadonlyArray<any>) => any

type ConcreteRegistrationEvidence<Evidence> = 0 extends 1 & Evidence
  ? never
  : unknown extends Evidence
    ? never
    : Evidence

type DirectResultEvidenceChannelOf<Value> = Value extends unknown
  ? typeof RegistrationEvidenceTypeId extends keyof Value
    ? Value extends Readonly<{
        [RegistrationEvidenceTypeId]?: infer EvidenceFunction
      }>
      ? [NonNullable<EvidenceFunction>] extends [never]
        ? never
        : NonNullable<EvidenceFunction> extends () => infer Evidence
          ? Evidence
          : never
      : never
    : never
  : never

type ResultCommandsOf<Value> = Value extends unknown
  ? 'commands' extends keyof Value
    ? Required<Value> extends Readonly<{ commands: unknown }>
      ? NonNullable<Value['commands']>
      : Value extends Readonly<{ commands?: infer CommandValues }>
        ? NonNullable<CommandValues>
        : never
    : never
  : never

/** @internal Extracts the unfiltered graph evidence retained by an update result. */
export type ResultEvidenceChannelOf<Value> =
  Value extends DeferredUpdateEvidence<any, any, any, infer Evidence>
    ? Evidence
    :
        | DirectResultEvidenceChannelOf<Value>
        | DirectResultEvidenceChannelOf<ResultCommandsOf<Value>>

type InvalidResultEvidence<Value> =
  ResultEvidenceChannelOf<Value> extends infer Evidence
    ? 0 extends 1 & Evidence
      ? Evidence
      : unknown extends Evidence
        ? Evidence
        : never
    : never

/** @internal Rejects update results whose graph evidence was widened away. */
export type ValidateConcreteResultEvidence<Value> = [
  InvalidResultEvidence<Value>,
] extends [never]
  ? unknown
  : Readonly<{
      'Composition results must preserve concrete Binding graph evidence': InvalidResultEvidence<Value>
    }>

/** @internal Extracts graph obligations retained separately from registration. */
export type DeferredResultEvidenceOf<Value> = Extract<
  ConcreteRegistrationEvidence<ResultEvidenceChannelOf<Value>>,
  AnyDeferredResultEvidence
>

type ConcreteRegistrationPart<Evidence> =
  Evidence extends AnyDeferredResultEvidence
    ? never
    : ConcreteRegistrationEvidence<Evidence>

/** Extracts child Binding registration evidence retained by an update result or
 * its Commands. A raw Binding operation reports its direct child registration;
 * policy-produced registrations remain an opaque obligation until a completed
 * Composition resolves them against its registered graph. */
export type RegistrationEvidenceOf<Value> =
  Value extends DeferredUpdateEvidence<any, any, any, infer Evidence>
    ? ConcreteRegistrationPart<Evidence>
    :
        | ConcreteRegistrationPart<DirectResultEvidenceChannelOf<Value>>
        | ConcreteRegistrationPart<
            DirectResultEvidenceChannelOf<ResultCommandsOf<Value>>
          >

type RegistrationModelOf<Value> =
  Value extends Readonly<{ model: infer Model }> ? Model : never

type RegistrationCommandMessageOf<Value> = Value extends unknown
  ? 'commands' extends keyof Value
    ? Value extends Readonly<{ commands?: infer CommandValues }>
      ? NonNullable<CommandValues> extends ReadonlyArray<infer CommandValue>
        ? CommandValue extends Command<infer Message, any, any>
          ? Message
          : never
        : never
      : never
    : never
  : never

type RegistrationCommandRequirementsOf<Value> = Value extends unknown
  ? 'commands' extends keyof Value
    ? Value extends Readonly<{ commands?: infer CommandValues }>
      ? NonNullable<CommandValues> extends ReadonlyArray<infer CommandValue>
        ? CommandValue extends Command<any, any, infer R>
          ? R
          : never
        : never
      : never
    : never
  : never

type RegistrationOutMessageOf<Value> = Value extends unknown
  ? 'outMessage' extends keyof Value
    ? Value extends Readonly<{ outMessage?: infer OutMessage }>
      ? Exclude<OutMessage, undefined>
      : never
    : never
  : never

/** An update result that retains child Binding registration evidence alongside
 * its Model, Commands, and optional OutMessage. */
export type ReturnWithRegistrationEvidence<
  Model,
  Message,
  OutMessage,
  R,
  Evidence,
> = Readonly<{
  /** Next parent Model after the registered child operation completes. */
  model: Model
  /** Commands to run, carrying the same child registration evidence. */
  commands?: (Commands<Message, R> & RegistrationEvidence<Evidence>) | undefined
  /** Optional OutMessage surfaced by the child fold or parent policy. */
  outMessage?: OutMessage
}> &
  RegistrationEvidence<Evidence>

/** Preserves child Binding registration evidence on an update result and its
 * Commands. */
export type WithRegistrationEvidence<Value, Evidence> = Value extends unknown
  ? [Evidence] extends [never]
    ? Value
    : ReturnWithRegistrationEvidence<
        RegistrationModelOf<Value>,
        RegistrationCommandMessageOf<Value>,
        RegistrationOutMessageOf<Value>,
        RegistrationCommandRequirementsOf<Value>,
        Evidence
      >
  : never

type ResultRecipeReturn<Model, Message, OutMessage, R, Evidence> = [
  Evidence,
] extends [never]
  ? [OutMessage] extends [never]
    ? Return<Model, Message, R>
    : ReturnWithOutMessage<Model, Message, OutMessage, R>
  : ReturnWithRegistrationEvidence<Model, Message, OutMessage, R, Evidence>

/** @internal Normalizes an update result into the semantic channels retained by
 * a passive operation recipe. */
export type ResultRecipeFor<Model, Output> = ResultRecipe<
  Model,
  RegistrationCommandMessageOf<Output>,
  RegistrationOutMessageOf<Output>,
  RegistrationCommandRequirementsOf<Output>,
  ResultEvidenceChannelOf<Output>
>

type ReturnOf<Function extends (...args: ReadonlyArray<any>) => any> =
  Function extends (...args: ReadonlyArray<never>) => infer Output
    ? Output
    : never

type CommandRequirements<Output> = Output extends unknown
  ?
      | (Output extends DeferredUpdateEvidence<any, any, infer R, any>
          ? R
          : never)
      | ('commands' extends keyof Output
          ? Output extends Readonly<{ commands?: infer Commands }>
            ? NonNullable<Commands> extends ReadonlyArray<infer CommandValue>
              ? CommandValue extends Command<any, any, infer R>
                ? R
                : never
              : never
            : never
          : never)
  : never

type CommandMessage<Output> = Output extends unknown
  ? 'commands' extends keyof Output
    ? Output extends Readonly<{ commands?: infer Commands }>
      ? NonNullable<Commands> extends ReadonlyArray<infer CommandValue>
        ? CommandValue extends Command<infer Message, any, any>
          ? Message
          : never
        : never
      : never
    : never
  : never

/**
 * The Effect services required by the Commands an update can return. This
 * reads the update's return contract, including requirements carried through
 * child folds, without including services used only by Subscriptions, Mounts,
 * or ManagedResources. A raw Binding operation reports direct child Command
 * requirements. Policy-produced requirements become visible after a completed
 * Composition resolves the operation against its registered graph.
 */
export type RequirementsOf<
  Update extends (...args: ReadonlyArray<any>) => any,
> = CommandRequirements<ReturnOf<Update>>

/** @internal Extracts Command requirements from an already resolved result. */
export type RequirementsOfResult<Output> = CommandRequirements<Output>

type OutMessageOf<Output> = Output extends unknown
  ? 'outMessage' extends keyof Output
    ? Output extends Readonly<{ outMessage?: infer OutMessage }>
      ? Exclude<OutMessage, undefined>
      : never
    : never
  : never

type ValidateUpdate<Update extends AnyUpdate> =
  Parameters<Update> extends readonly [
    model: infer Model,
    message: infer Message,
    ...context: ReadonlyArray<any>,
  ]
    ? [ReturnOf<Update>] extends [
        ReturnWithOutMessageValue<Model, Message, unknown, unknown>,
      ]
      ? unknown
      : never
    : Update extends (
          model: infer Model,
          message: infer Message,
        ) => infer Output
      ? [Output] extends [
          ReturnWithOutMessageValue<Model, Message, unknown, unknown>,
        ]
        ? unknown
        : never
      : never

/**
 * The normalized function contract returned by {@link define}. It preserves
 * the update's full parameter list while deriving its Command requirements,
 * OutMessage channel, and child registration evidence from the return type.
 */
export type DefinedUpdate<
  Arguments extends ReadonlyArray<unknown>,
  Model,
  Message,
  OutMessage,
  R,
  Evidence,
> = (
  ...args: Arguments
) => WithRegistrationEvidence<
  [OutMessage] extends [never]
    ? Return<Model, Message, R>
    : ReturnWithOutMessage<Model, Message, OutMessage, R>,
  Evidence
>

/**
 * Defines an update while inferring the union of services required by the
 * Commands returned across all Message branches. If a branch emits an
 * OutMessage, the returned function has a {@link ReturnWithOutMessage}
 * contract so a parent must handle it. Otherwise it has a {@link Return}
 * contract. Required, optional, and rest context parameters are preserved in
 * the returned function.
 *
 * Use this when Command implementations come from Layers, so application
 * completion can infer every required handler service without a hand-written
 * requirements union:
 *
 * ```ts
 * export const update = Update.define((model: Model, message: Message) =>
 *   Message.match(message, {
 *     ClickedSave: () => ({ model, commands: [Save()] }),
 *     CompletedSave: () => ({ model }),
 *   }),
 * )
 * ```
 */
export function define<const Update extends AnyUpdate>(
  update: Update & ValidateUpdate<Update>,
): DefinedUpdate<
  Parameters<Update>,
  Parameters<Update>[0],
  Parameters<Update>[1],
  OutMessageOf<ReturnOf<Update>>,
  CommandRequirements<ReturnOf<Update>>,
  RegistrationEvidenceOf<ReturnOf<Update>>
>
export function define(update: AnyUpdate): AnyUpdate {
  return update
}

type ValidateStep<Step extends AnyStep> =
  Parameters<Step> extends readonly [
    model: infer Model,
    ...context: ReadonlyArray<any>,
  ]
    ? [ReturnOf<Step>] extends [
        ReturnWithOutMessageValue<
          Model,
          CommandMessage<ReturnOf<Step>>,
          unknown,
          unknown
        >,
      ]
      ? unknown
      : never
    : never

/**
 * The normalized function contract returned by {@link defineStep}. It
 * preserves the Step's full parameter list while deriving its Message,
 * Command requirements, OutMessage channel, and child registration evidence
 * from the return type.
 */
export type DefinedStep<
  Arguments extends ReadonlyArray<unknown>,
  Model,
  Message,
  OutMessage,
  R,
  Evidence,
> = (
  ...args: Arguments
) => WithRegistrationEvidence<
  [OutMessage] extends [never]
    ? Return<Model, Message, R>
    : ReturnWithOutMessage<Model, Message, OutMessage, R>,
  Evidence
>

/**
 * Defines an update Step while inferring its Message and service
 * requirements from the Commands it returns. If a branch emits an OutMessage,
 * the returned function has a {@link StepWithOutMessage} contract. Optional
 * and rest context parameters after the Model are preserved.
 *
 * Use this for standalone Step producers, including OutMessage folds, whose
 * Commands come from handler Layers:
 *
 * ```ts
 * const foldSavedDraft = OutMessage.match({
 *   SavedDraft: () => Update.defineStep((model: Model) => ({
 *     model,
 *     commands: [RefreshDraft()],
 *   })),
 * })
 * ```
 */
export function defineStep<const Step extends AnyStep>(
  step: Step & ValidateStep<Step>,
): DefinedStep<
  Parameters<Step>,
  Parameters<Step>[0],
  CommandMessage<ReturnOf<Step>>,
  OutMessageOf<ReturnOf<Step>>,
  CommandRequirements<ReturnOf<Step>>,
  RegistrationEvidenceOf<ReturnOf<Step>>
>
export function defineStep(step: AnyStep): AnyStep {
  return step
}

/** The return shape of an update that can also surface an OutMessage to its
 *  parent. Omit `commands` when the update statically creates none. Return a
 *  computed Commands collection directly, even when it may be empty. Omit
 *  `outMessage` when the update emitted nothing. A Block that cannot emit
 *  an OutMessage returns {@link Return} instead. A graph-connected Step retains
 *  an opaque {@link ResultRecipe} until checked composition applies it. */
export type ReturnWithOutMessage<
  Model,
  Message,
  OutMessage,
  R = never,
> = Readonly<{
  model: Model
  commands?: (Commands<Message, R> & NoRegistrationEvidence) | undefined
  outMessage?: OutMessage
}> &
  NoRegistrationEvidence

type ModelOfReturn<UpdateReturn> =
  UpdateReturn extends Readonly<{ model: infer Model }> ? Model : never

type MessageOfReturn<UpdateReturn> = CommandMessage<UpdateReturn>

type RequirementsOfReturn<UpdateReturn> = CommandRequirements<UpdateReturn>

type WithOutMessageResult<UpdateReturn, OutMessage> =
  UpdateReturn extends ReturnValue<any, any, any>
    ? WithRegistrationEvidence<
        ReturnWithOutMessage<
          ModelOfReturn<UpdateReturn>,
          MessageOfReturn<UpdateReturn>,
          OutMessage,
          RequirementsOfReturn<UpdateReturn>
        >,
        RegistrationEvidenceOf<UpdateReturn>
      >
    : never

type PlainResultRecipe = ResultRecipe<any, any, never, any, any>

type WithOutMessageInput = ReturnValue<any, any, any> | PlainResultRecipe

type WithOutMessageOutput<Input, OutMessage> =
  Input extends ResultRecipe<
    infer Model,
    infer Message,
    never,
    infer R,
    infer Evidence
  >
    ? ResultRecipe<Model, Message, OutMessage, R, Evidence>
    : Input extends ReturnValue<any, any, any>
      ? WithOutMessageResult<Input, OutMessage>
      : never

/** Adds a known or optional OutMessage to a plain update return while
 *  preserving its Model and Commands. Use this helper when attaching to an
 *  existing return or when the value has the type `OutMessage | undefined`.
 *  For a reusable Model-preserving Step that only emits a known OutMessage,
 *  use the owning Definition's `makeOutMessageStep` helper.
 *  `undefined` means that the operation emitted no OutMessage, so the returned
 *  record omits the property.
 *
 *  The input must be a {@link Return}, so this helper cannot replace an
 *  OutMessage that an update already emitted.
 *
 *  ```ts
 *  const editorSave = Update.combineSteps(model, [writeDraft, clearErrors])
 *
 *  return pipe(editorSave, Update.withOutMessage(outMessage))
 *  ```
 *
 *  When the OutMessage is already known while constructing a new result,
 *  include it directly: `{ model, commands, outMessage }`. If the OutMessage
 *  may be `undefined`, pass the new result first:
 *  `Update.withOutMessage({ model, commands }, outMessage)`. */
export const withOutMessage: {
  <OutMessage>(
    outMessage: OutMessage | undefined,
  ): <const Input extends WithOutMessageInput>(
    updateReturn: Input,
  ) => WithOutMessageOutput<Input, OutMessage>
  <const Input extends WithOutMessageInput, OutMessage>(
    updateReturn: Input,
    outMessage: OutMessage | undefined,
  ): WithOutMessageOutput<Input, OutMessage>
} = Function.dual(
  2,
  <OutMessage>(
    updateReturn: ReturnValue<any, any, any> | PlainResultRecipe,
    outMessage: OutMessage | undefined,
  ) => {
    if (isResultRecipe(updateReturn)) {
      return makeResultRecipe(model => {
        const resolved = resolveOperationOutput(updateReturn, model)
        return outMessage === undefined
          ? resolved
          : {
              model: resolved.model,
              commands: resolved.commands,
              outMessage,
            }
      })
    }

    return outMessage === undefined
      ? updateReturn
      : {
          model: updateReturn.model,
          commands: updateReturn.commands,
          outMessage,
        }
  },
)

/** One self-contained edit to the Model paired with the Commands to run:
 *  the unit {@link combineSteps} composes. A step that needs arguments is a
 *  function returning a Step
 *  (`(noteId: NoteId) => Update.Step<Model, Message>`). */
export type Step<Model, Message, R = never> = (
  model: Model,
) => Return<Model, Message, R>

/** {@link Step} for an update that also surfaces an OutMessage to its
 *  parent: maps a Model to a {@link ReturnWithOutMessage} over the same
 *  Model. */
export type StepWithOutMessage<Model, Message, OutMessage, R = never> = (
  model: Model,
) => ReturnWithOutMessage<Model, Message, OutMessage, R>

type NonEmptySteps = readonly [AnyStep, ...ReadonlyArray<AnyStep>]

type ContextualLeadingSteps<Model> = readonly [
  (model: Model) => ReturnValue<Model, any, any>,
  ...ReadonlyArray<AnyStep>,
]

type FirstStepModel<Steps extends NonEmptySteps> = GraphModelOf<Steps[0]>

type ComposableReturnValue<Model> = Readonly<{
  model: Model
  commands?: ReadonlyArray<unknown> | undefined
  outMessage?: never
}>

type NonEmptyStepReturnsFor<Model> = readonly [
  ReturnValue<Model, any, any>,
  ...ReadonlyArray<ReturnValue<Model, any, any>>,
]

type StepsFromReturns<
  Model,
  StepReturns extends ReadonlyArray<unknown>,
> = Readonly<{
  [Index in keyof StepReturns]: (model: Model) => StepReturns[Index]
}>

type CombinedGraphRequirement<Steps extends ReadonlyArray<AnyStep>> =
  GraphRequirementOf<Steps[number]>

type RegisteredCompositionDiagnostic<Input, Model> = [Input] extends [Model]
  ? unknown
  : [GraphCapabilityRequirement<Model>] extends [never]
    ? unknown
    : Readonly<{
        'Connected Steps require a Composition registering their Bindings: return Update.combineSteps(steps) from Definition.makeStep instead of applying it to a plain Model': never
      }>

type ResolvedStepReturn<StepValue> = StepValue extends AnyStep
  ? ResolvedOperationOutput<ReturnOf<StepValue>>
  : never

type IsAnyValue<Value> = 0 extends 1 & Value ? true : false

type ResultRecipeOfStep<StepValue> = StepValue extends AnyStep
  ? ReturnOf<StepValue> extends infer Output
    ? IsAnyValue<Output> extends true
      ? never
      : Output extends AnyResultRecipe
        ? Output
        : never
    : never
  : never

type ResultRecipesOf<Steps extends ReadonlyArray<AnyStep>> = ResultRecipeOfStep<
  Steps[number]
>

type OperationStepModel<Steps extends ReadonlyArray<AnyStep>> =
  ResultRecipeModel<ResultRecipesOf<Steps>>

type HasOperationStep<Steps extends ReadonlyArray<AnyStep>> = [
  ResultRecipesOf<Steps>,
] extends [never]
  ? false
  : true

type RequireOperationStep<Steps extends ReadonlyArray<AnyStep>> =
  HasOperationStep<Steps> extends true ? unknown : never

type CommonOperationSteps<StepValue> = ReadonlyArray<
  Extract<StepValue, AnyStep>
>

type StepsForModel<Steps extends ReadonlyArray<AnyStep>, Model> =
  Steps extends ReadonlyArray<
    (model: GraphInput<Model, CombinedGraphRequirement<Steps>>) => any
  >
    ? [ResolvedStepReturn<Steps[number]>] extends [ComposableReturnValue<Model>]
      ? unknown
      : never
    : never

type StepsWithoutOutMessage<Steps extends ReadonlyArray<unknown>> = [
  ResolvedStepReturn<Extract<Steps[number], AnyStep>>,
] extends [ReturnValue<any, any, any>]
  ? unknown
  : never

type CombinedStepModel<Steps extends ReadonlyArray<AnyStep>> = GraphModelOf<
  Steps[number]
>

type CombinedStepMessage<Steps extends ReadonlyArray<AnyStep>> = CommandMessage<
  ResolvedStepReturn<Steps[number]>
>

type CombinedStepRequirements<Steps extends ReadonlyArray<AnyStep>> =
  CommandRequirements<ResolvedStepReturn<Steps[number]>>

type UnwrapCombinedStepDeferredPolicy<Evidence> =
  Evidence extends DeferredResultEvidence<infer Marker>
    ? Marker extends DeferredCombinedStepsPolicy<infer NestedEvidence>
      ? NestedEvidence
      : Evidence
    : never

type CombinedStepDeferredPolicyEvidence<Steps extends ReadonlyArray<AnyStep>> =
  UnwrapCombinedStepDeferredPolicy<
    Extract<
      ConcreteRegistrationEvidence<
        ResultEvidenceChannelOf<ResolvedStepReturn<Steps[number]>>
      >,
      AnyDeferredResultEvidence
    >
  >

type CombinedStepRegistrationEvidence<Steps extends ReadonlyArray<AnyStep>> =
  | ResultEvidenceChannelOf<ResolvedStepReturn<Steps[number]>>
  | CombinedGraphRequirement<Steps>
  | ([CombinedStepDeferredPolicyEvidence<Steps>] extends [never]
      ? never
      : DeferredResultEvidence<
          DeferredCombinedStepsPolicy<CombinedStepDeferredPolicyEvidence<Steps>>
        >)

type CombinedStepOutputFor<
  Model,
  Steps extends ReadonlyArray<AnyStep>,
> = WithRegistrationEvidence<
  Return<Model, CombinedStepMessage<Steps>, CombinedStepRequirements<Steps>>,
  CombinedStepRegistrationEvidence<Steps>
>

type CombinedStepRecipe<
  Model,
  Steps extends ReadonlyArray<AnyStep>,
> = ResultRecipe<
  Model,
  CombinedStepMessage<Steps>,
  never,
  CombinedStepRequirements<Steps>,
  CombinedStepRegistrationEvidence<Steps>
>

/**
 * Composes a list of update Steps into one. Each Step runs against the Model
 * the previous Step produced. Their Commands form one batch for the Runtime,
 * which runs them independently. Array order does not sequence their effects
 * or completion.
 *
 * Dual: pass the Model and Steps (`combineSteps(model, steps)`), or pass only
 * the Steps to build a composable {@link Step} that runs later
 * (`combineSteps(steps)`, for a `pipe` or a nested Step list). Ordinary Steps
 * produce a readable {@link Return}. Connected Steps preserve an opaque
 * {@link ResultRecipe} for execution by a matching registered Composition.
 * A Composition rejects a connected combination whose registered Binding
 * policy can emit an OutMessage from update or init, including combinations
 * extracted through `Definition.makeStep` and combinations returned by a
 * Binding OutMessage policy. Return an OutMessage-producing bound operation
 * directly so its caller can observe it.
 *
 * Steps only ever accumulate Commands; a Step cannot cancel or replace
 * another Step's Commands, and no Command runs during the fold. The
 * Runtime runs the batch after update returns. `combineSteps([])` returns
 * `{ model }`.
 *
 * ```ts
 * SucceededUpdateNote: ({ note }) =>
 *   combineSteps(model, [
 *     replaceNoteInCachesStep(note),
 *     refreshNoteStep(note.id),
 *     refreshAllNotesStep,
 *     refreshNotebookNotesStep(note.maybeNotebookId),
 *     ...Array.filter([refreshNotebookNotesStep(previousNotebookId)], () => hasMoved),
 *     showToastStep('Success', `Updated ${note.title}`),
 *   ])
 * ```
 */
export const combineSteps: {
  <const Steps extends NonEmptySteps>(
    steps: Steps &
      StepsForModel<Steps, OperationStepModel<Steps>> &
      RequireOperationStep<Steps> &
      StepsWithoutOutMessage<NoInfer<Steps>>,
  ): NoInfer<
    (
      model: GraphInput<
        OperationStepModel<Steps>,
        CombinedGraphRequirement<Steps>
      >,
    ) => CombinedStepRecipe<OperationStepModel<Steps>, Steps>
  >
  <ModelInput, const Steps extends NonEmptySteps>(
    model: ModelInput &
      GraphInput<
        GraphModelOfValue<ModelInput>,
        NoInfer<CombinedGraphRequirement<Steps>>
      >,
    steps: Steps &
      StepsForModel<Steps, GraphModelOfValue<ModelInput>> &
      RequireOperationStep<Steps> &
      StepsWithoutOutMessage<NoInfer<Steps>>,
  ): CombinedStepRecipe<GraphModelOfValue<ModelInput>, Steps>
  <StepValue>(
    steps: ReadonlyArray<StepValue> &
      StepsForModel<
        CommonOperationSteps<StepValue>,
        OperationStepModel<CommonOperationSteps<StepValue>>
      > &
      RequireOperationStep<CommonOperationSteps<StepValue>> &
      StepsWithoutOutMessage<ReadonlyArray<StepValue>>,
  ): NoInfer<
    (
      model: GraphInput<
        OperationStepModel<CommonOperationSteps<StepValue>>,
        CombinedGraphRequirement<CommonOperationSteps<StepValue>>
      >,
    ) =>
      | CombinedStepOutputFor<
          OperationStepModel<CommonOperationSteps<StepValue>>,
          CommonOperationSteps<StepValue>
        >
      | CombinedStepRecipe<
          OperationStepModel<CommonOperationSteps<StepValue>>,
          CommonOperationSteps<StepValue>
        >
  >
  <ModelInput, StepValue>(
    model: ModelInput &
      GraphInput<
        GraphModelOfValue<ModelInput>,
        NoInfer<CombinedGraphRequirement<CommonOperationSteps<StepValue>>>
      >,
    steps: ReadonlyArray<StepValue> &
      StepsForModel<
        CommonOperationSteps<StepValue>,
        GraphModelOfValue<ModelInput>
      > &
      RequireOperationStep<CommonOperationSteps<StepValue>> &
      StepsWithoutOutMessage<ReadonlyArray<StepValue>>,
  ):
    | CombinedStepOutputFor<
        GraphModelOfValue<ModelInput>,
        CommonOperationSteps<StepValue>
      >
    | CombinedStepRecipe<
        GraphModelOfValue<ModelInput>,
        CommonOperationSteps<StepValue>
      >
  <const Steps extends NonEmptySteps>(
    steps: Steps &
      StepsForModel<Steps, FirstStepModel<Steps>> &
      StepsWithoutOutMessage<NoInfer<Steps>>,
  ): (
    model: GraphInput<FirstStepModel<Steps>, CombinedGraphRequirement<Steps>>,
  ) => WithRegistrationEvidence<
    Return<
      FirstStepModel<Steps>,
      CombinedStepMessage<Steps>,
      CombinedStepRequirements<Steps>
    >,
    CombinedStepRegistrationEvidence<Steps>
  >
  <Model, const StepReturns extends NonEmptyStepReturnsFor<Model>>(
    model: Model,
    steps: StepsFromReturns<Model, StepReturns>,
  ): WithRegistrationEvidence<
    Return<
      Model,
      CommandMessage<StepReturns[number]>,
      CommandRequirements<StepReturns[number]>
    >,
    RegistrationEvidenceOf<StepReturns[number]>
  >
  <ModelInput, const Steps extends ReadonlyArray<AnyStep>>(
    model: ModelInput,
    steps: Steps extends readonly []
      ? Steps
      : number extends Steps['length']
        ? [CombinedGraphRequirement<Steps>] extends [never]
          ? Steps &
              StepsForModel<Steps, GraphModelOfValue<ModelInput>> &
              StepsWithoutOutMessage<NoInfer<Steps>>
          : never
        : never,
  ): WithRegistrationEvidence<
    Return<
      GraphModelOfValue<ModelInput>,
      CombinedStepMessage<Steps>,
      CombinedStepRequirements<Steps>
    >,
    CombinedStepRegistrationEvidence<Steps>
  >
  <
    ModelInput,
    const Steps extends ContextualLeadingSteps<GraphModelOfValue<ModelInput>>,
  >(
    model: ModelInput &
      GraphInput<
        GraphModelOfValue<ModelInput>,
        CombinedGraphRequirement<Steps>
      >,
    steps: Steps &
      StepsForModel<Steps, GraphModelOfValue<ModelInput>> &
      StepsWithoutOutMessage<NoInfer<Steps>>,
  ): WithRegistrationEvidence<
    Return<
      GraphModelOfValue<ModelInput>,
      CombinedStepMessage<Steps>,
      CombinedStepRequirements<Steps>
    >,
    CombinedStepRegistrationEvidence<Steps>
  >
  <const Steps extends ReadonlyArray<AnyStep>>(
    steps: Steps &
      StepsForModel<Steps, CombinedStepModel<Steps>> &
      StepsWithoutOutMessage<NoInfer<Steps>>,
  ): (
    model: GraphInput<
      CombinedStepModel<Steps>,
      CombinedGraphRequirement<Steps>
    >,
  ) => WithRegistrationEvidence<
    Return<
      CombinedStepModel<Steps>,
      CombinedStepMessage<Steps>,
      CombinedStepRequirements<Steps>
    >,
    CombinedStepRegistrationEvidence<Steps>
  >
  <Model, Message, R = never>(
    steps: ReadonlyArray<Step<Model, Message, R>>,
  ): Step<Model, Message, R>
  <Model, Message, R = never, Input = Model>(
    model: Input &
      NoInfer<RegisteredCompositionDiagnostic<Input, Model> & Model>,
    steps: ReadonlyArray<Step<Input & Model, Message, R>>,
  ): Return<Model, Message, R>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
} = ((modelOrSteps: unknown, maybeSteps?: ReadonlyArray<AnyStep>) => {
  const continueRun = <Model, Message, R>(
    current: Return<Model, Message, R>,
    steps: ReadonlyArray<AnyStep>,
    startIndex: number,
    resolvePending = false,
  ):
    | Return<Model, Message, R>
    | ResultRecipeFor<Model, Return<Model, Message, R>> => {
    let index = startIndex
    while (true) {
      const maybeStep = Array.get(steps, index)
      if (Option.isNone(maybeStep)) {
        return current
      }

      const step = maybeStep.value
      const output = step(current.model)
      if (isResultRecipe(output) && !resolvePending) {
        return makeResultRecipe<Model, Return<Model, Message, R>>(
          model =>
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            resolveOperationOutput(
              continueRun({ model }, steps, 0, true),
              model,
            ) as Return<Model, Message, R>,
        )
      }

      const next = resolvePending
        ? resolveOperationOutput(output, current.model)
        : output
      if (!resolvePending) {
        assertResolvedStep(next)
      }
      if (next.outMessage !== undefined) {
        throw new Error(
          '[foldkit] Update.combineSteps cannot combine a Step that emits an OutMessage. Return the OutMessage-producing Step directly so its caller can observe it.',
        )
      }
      current = {
        model: next.model,
        commands: [...(current.commands ?? []), ...(next.commands ?? [])],
      }
      index += 1
    }
  }

  const run = <Model, Message, R>(
    model: Model,
    steps: ReadonlyArray<AnyStep>,
  ):
    | Return<Model, Message, R>
    | ResultRecipeFor<Model, Return<Model, Message, R>> => {
    const seed: Return<Model, Message, R> = { model }
    return continueRun(seed, steps, 0)
  }

  if (maybeSteps === undefined) {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const steps = modelOrSteps as ReadonlyArray<AnyStep>
    return (model: unknown) => run(model, steps)
  }

  return run(modelOrSteps, maybeSteps)
}) as never

/** The four capabilities that make one cache field revalidatable.
 *
 *  - `read`: gets the field's AsyncData out of the Model. Returns an
 *    `Option` because keyed caches miss (`HashMap.get`); single fields
 *    wrap in `Option.some`.
 *  - `revalidate`: decides whether and how the entry transitions.
 *    Usually exactly `AsyncData.revalidate` (refresh after a mutation:
 *    only `Success` and `Stale` move to `Refreshing`). Pass
 *    `AsyncData.revalidateOrLoad` instead for load-on-entry semantics.
 *  - `write`: puts the transitioned entry back into the Model.
 *  - `load`: the Command that refetches the data. */
export type Refreshable<Model, Message, A, E, R = never> = Readonly<{
  read: (model: Model) => Option.Option<AsyncData<A, E>>
  revalidate: (current: AsyncData<A, E>) => Option.Option<AsyncData<A, E>>
  write: (model: Model, next: AsyncData<A, E>) => Model
  load: Command<Message, never, R>
}>

/** Turns a {@link Refreshable} into an update step that revalidates one
 *  cache: read the entry, ask `revalidate` whether it should transition,
 *  and only when it says yes write the transitioned state and emit the
 *  load Command. When `revalidate` returns `None` (a missing entry, or a
 *  state with nothing to revalidate) the step returns `{ model }`: same
 *  Model, no Command. A handler can list every affected cache, and only the
 *  caches that currently hold data reload.
 *
 *  ```ts
 *  const refreshAllNotesStep = refresh({
 *    read: model => Option.some(model.allNotes),
 *    revalidate: AsyncData.revalidate,
 *    write: (model, nextAllNotes) => modifyFields(model, { allNotes: () => nextAllNotes }),
 *    load: LoadAllNotes(),
 *  })
 *  ``` */
export const refresh =
  <Model, Message, A, E, R = never>(
    refreshable: Refreshable<Model, Message, A, E, R>,
  ): Step<Model, Message, R> =>
  model =>
    pipe(
      refreshable.read(model),
      Option.flatMap(refreshable.revalidate),
      Option.match({
        onNone: () => ({ model }),
        onSome: next => ({
          model: refreshable.write(model, next),
          commands: [refreshable.load],
        }),
      }),
    )

/** The four capabilities that fold one child Block's update into the
 *  parent, for a child whose update cannot emit an OutMessage.
 *
 *  - `update`: the child update function to run.
 *  - `read`: the getter half of the lens onto the child: reads the child
 *    Model from the parent Model. Returns an `Option` because a child
 *    may not be mounted (for example a page behind a route or a keyed
 *    collection miss); a single always-present field wraps in
 *    `Option.some`.
 *  - `write`: the setter half of the lens: writes the updated child
 *    Model back into the parent Model.
 *  - `toParentMessage`: lifts a child Message into the parent's Message,
 *    the same contract `h.block` takes for the view half. Always the
 *    child's `Got*` wrapper: `message => GotSearchMessage({ message })`. */
export type ChildFold<
  ParentModel,
  ParentMessage,
  ChildModel,
  Input,
  ChildMessage,
  R = never,
> = Readonly<{
  update: (
    childModel: ChildModel,
    input: Input,
  ) => Return<ChildModel, ChildMessage, R>
  read: (model: ParentModel) => Option.Option<ChildModel>
  write: (model: ParentModel, nextChildModel: ChildModel) => ParentModel
  toParentMessage: (message: ChildMessage) => ParentMessage
}>

/** The lifters a `foldOutMessage` receives as its second parameter,
 *  already bound to the fold config's `toParentMessage`.
 *
 *  The fold already lifts the Commands returned by the child's `update`.
 *  Use these lifters for a Command returned by the parent's OutMessage Step
 *  when that Command still produces the child's Message. For example, the
 *  parent may handle a child's `Requested*` fact by returning a child Command
 *  built with routing context only the parent holds.
 *
 *  The lifters apply the same lift the fold gives the child's own
 *  Commands, so the Step writes no `Command.mapMessage` call and keeps
 *  no second copy of the wrapper, and the mapping stays recorded on the
 *  Command for `Story.Command.resolve` and `Scene.Command.resolve`.
 *
 *  The annotated standalone const takes both parameters, so pass the
 *  OutMessage value to its union matcher:
 *
 *  ```ts
 *  const foldLoginOutMessage = (
 *    outMessage: Login.OutMessage,
 *    { liftCommand }: Update.FoldContext<Login.Message, Message>,
 *  ) =>
 *    Login.OutMessage.match<Update.Step<Model, Message>>(outMessage, {
 *      RequestedMagicLink:
 *        ({ email }) =>
 *        model => ({
 *          model,
 *          commands: [
 *            liftCommand(
 *              Login.SendMagicLink({ email, redirectRoute: model.route }),
 *            ),
 *          ],
 *        }),
 *    })
 *  ``` */
export type FoldContext<
  ChildMessage,
  ParentMessage,
  ParentModel = never,
> = Readonly<{
  liftCommand: <E = never, R = never>(
    command: Command<ChildMessage, E, R>,
  ) => Command<ParentMessage, E, R>
  liftCommands: <E = never, R = never>(
    commands: ReadonlyArray<Command<ChildMessage, E, R>>,
  ) => ReadonlyArray<Command<ParentMessage, E, R>>
}> &
  ([ParentModel] extends [never]
    ? unknown
    : Readonly<{
        /** The parent Model before this dispatch wrote the child's next Model. */
        modelBeforeUpdate: ParentModel
      }>)

/** {@link ChildFold} for a child whose update returns
 *  {@link ReturnWithOutMessage}, adding the fifth capability:
 *
 *  - `foldOutMessage`: folds the child's OutMessage into the parent as a
 *    {@link Step}. The Step receives the parent Model with the child
 *    already written back, and its Commands follow the child's in the
 *    returned batch. Match on the OutMessage tag through its union matcher,
 *    and build a multi-step fold with {@link combineSteps}. Takes an optional
 *    second parameter, a
 *    {@link FoldContext} of lifters bound to `toParentMessage`, for a
 *    Command the Step returns whose result is the child's Message. Parent Model
 *    inference comes from `read` and `write`; the child wrapper and OutMessage
 *    Step infer their Message and service requirements independently, and the
 *    resulting Fold requires their unions. */
export type ChildFoldWithOutMessage<
  ParentModel,
  ParentMessage,
  ChildModel,
  Input,
  ChildMessage,
  ChildOutMessage,
  ChildRequirements = never,
  OutMessageStepRequirements = ChildRequirements,
  OutMessageStepMessage = ParentMessage,
> = Readonly<{
  update: (
    childModel: ChildModel,
    input: Input,
  ) => ReturnWithOutMessage<
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ChildRequirements
  >
  read: (model: ParentModel) => Option.Option<ChildModel>
  write: (model: ParentModel, nextChildModel: ChildModel) => ParentModel
  toParentMessage: (message: ChildMessage) => ParentMessage
  foldOutMessage: (
    outMessage: ChildOutMessage,
    context: FoldContext<ChildMessage, ParentMessage>,
  ) => Step<
    NoInfer<ParentModel>,
    OutMessageStepMessage,
    OutMessageStepRequirements
  >
}>

/** {@link ChildFoldWithOutMessage} for a parent that derives its own
 *  OutMessage while folding the child's. The returned
 *  {@link StepWithOutMessage} receives the parent Model with the child already
 *  written back. Use this shape when no child OutMessage is forwarded one to
 *  one, so the fold needs no `toParentOutMessage` adapter. */
export type ChildFoldWithDerivedParentOutMessage<
  ParentModel,
  ParentMessage,
  ChildModel,
  Input,
  ChildMessage,
  ChildOutMessage,
  ParentOutMessage,
  ChildRequirements = never,
  OutMessageStepRequirements = ChildRequirements,
  OutMessageStepMessage = ParentMessage,
> = Readonly<{
  update: (
    childModel: ChildModel,
    input: Input,
  ) => ReturnWithOutMessage<
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ChildRequirements
  >
  read: (model: ParentModel) => Option.Option<ChildModel>
  write: (model: ParentModel, nextChildModel: ChildModel) => ParentModel
  toParentMessage: (message: ChildMessage) => ParentMessage
  toParentOutMessage?: never
  foldOutMessage: (
    outMessage: ChildOutMessage,
    context: FoldContext<ChildMessage, ParentMessage>,
  ) => StepWithOutMessage<
    NoInfer<ParentModel>,
    OutMessageStepMessage,
    ParentOutMessage,
    OutMessageStepRequirements
  >
}>

/** {@link ChildFoldWithOutMessage} for a parent that is itself a
 *  Block, so the fold can return the parent's own OutMessage. Adds:
 *
 *  - `toParentOutMessage`: lifts the child's OutMessage into the
 *    parent's own OutMessage. Return `undefined` for a named child variant
 *    that stops at this parent. When the child returns no OutMessage, the fold
 *    omits `outMessage`.
 *  - `foldOutMessage` stays available for a parent that also updates
 *    its own state from the child's OutMessage, and is optional here.
 *    It may emit a derived parent OutMessage. That OutMessage replaces the
 *    one-to-one lift for the dispatch. When the Step emits nothing, the lift
 *    runs as usual.
 *
 *  Use this shape only when at least one child OutMessage should continue to
 *  the current Block's parent. If every child OutMessage stops here, use
 *  {@link ChildFoldWithDerivedParentOutMessage} when the fold derives its own
 *  OutMessage, or {@link ChildFoldWithOutMessage} when it does not. When
 *  provided, `foldOutMessage` still handles each variant locally, including
 *  variants that continue upward. */
export type ChildFoldWithParentOutMessage<
  ParentModel,
  ParentMessage,
  ChildModel,
  Input,
  ChildMessage,
  ChildOutMessage,
  ParentOutMessage,
  ChildRequirements = never,
  OutMessageStepRequirements = ChildRequirements,
  OutMessageStepMessage = ParentMessage,
  DerivedParentOutMessage = ParentOutMessage,
> = Readonly<{
  update: (
    childModel: ChildModel,
    input: Input,
  ) => ReturnWithOutMessage<
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ChildRequirements
  >
  read: (model: ParentModel) => Option.Option<ChildModel>
  write: (model: ParentModel, nextChildModel: ChildModel) => ParentModel
  toParentMessage: (message: ChildMessage) => ParentMessage
  toParentOutMessage: (
    outMessage: ChildOutMessage,
  ) => ParentOutMessage | undefined
  foldOutMessage?: (
    outMessage: ChildOutMessage,
    context: FoldContext<ChildMessage, ParentMessage>,
  ) => StepWithOutMessage<
    NoInfer<ParentModel>,
    OutMessageStepMessage,
    DerivedParentOutMessage,
    OutMessageStepRequirements
  >
}>

type AnyUpdateReturn = Readonly<{
  model: any
  commands?: Commands<any, any> | undefined
  outMessage?: any
}>

/** @internal Implementation-facing view of every {@link ChildFold}
 *  shape: the child update's `outMessage`, `foldOutMessage`, and
 *  `toParentOutMessage` are optional, and every type parameter is erased.
 *  The overloads on {@link foldChild} carry the public contract. */
type AnyChildFold = Readonly<{
  update: (childModel: any, input: any) => AnyUpdateReturn
  read: (model: any) => Option.Option<any>
  write: (model: any, nextChildModel: any) => any
  toParentMessage: (message: any) => any
  toParentOutMessage?: (outMessage: any) => any | undefined
  foldOutMessage?: (
    outMessage: any,
    context: FoldContext<any, any>,
  ) => (model: any) => AnyUpdateReturn
}>

/** The dual function {@link foldChild} returns. Data-first runs the
 *  fold now (`fold(model, input)` returns a {@link Return}); data-last
 *  builds a composable {@link Step} (`fold(input)`, for
 *  {@link combineSteps}). */
export type Fold<ParentModel, ParentMessage, Input, R = never> = {
  (model: ParentModel, input: Input): Return<ParentModel, ParentMessage, R>
  (input: Input): Step<ParentModel, ParentMessage, R>
}

/** {@link Fold} for a {@link ChildFoldWithParentOutMessage}: the
 *  data-first form returns a {@link ReturnWithOutMessage} and the
 *  data-last form builds a {@link StepWithOutMessage}, so the fold slots
 *  directly into a parent that is itself a Block. */
export type FoldWithOutMessage<
  ParentModel,
  ParentMessage,
  Input,
  ParentOutMessage,
  R = never,
> = {
  (
    model: ParentModel,
    input: Input,
  ): ReturnWithOutMessage<ParentModel, ParentMessage, ParentOutMessage, R>
  (
    input: Input,
  ): StepWithOutMessage<ParentModel, ParentMessage, ParentOutMessage, R>
}

/** Folds a child Block's update into the parent: the update half of
 *  embedding a child, complementing `h.block` on the view half. Give
 *  it the facts that vary per child (a {@link ChildFold}, or a
 *  {@link ChildFoldWithOutMessage} when the child's update returns
 *  OutMessages) and it returns a dual {@link Fold}:
 *
 *  ```ts
 *  const foldSearch = Update.foldChild({
 *    update: Search.update,
 *    read: (model: Model) => Option.some(model.search),
 *    write: (model, nextSearch) => modifyFields(model, { search: () => nextSearch }),
 *    toParentMessage: message => GotSearchMessage({ message }),
 *  })
 *
 *  // in the parent update
 *  GotSearchMessage: ({ message }) => foldSearch(model, message),
 *  ```
 *
 *  The fold runs `update` against the child Model `read` returns, writes
 *  the child back, and lifts the child's Commands through
 *  `toParentMessage`. When `read` returns `None` the fold returns
 *  `{ model }`: a Message for an unmounted child is a no-op. When the
 *  child's update returns an OutMessage, `foldOutMessage` runs against
 *  the Model with the child already written back, and its Commands
 *  follow the child's in the returned batch.
 *
 *  `foldOutMessage` takes an optional second parameter, a
 *  {@link FoldContext} carrying `liftCommand` and `liftCommands` bound to
 *  this config's `toParentMessage`. Reach for it when the Step returns a
 *  Command that produces the child's Message, such as an animating
 *  component's overridable leave Command.
 *
 *  A parent that is itself a Block receives a
 *  {@link FoldWithOutMessage} when `foldOutMessage` emits a derived parent
 *  OutMessage. Add `toParentOutMessage` only when at least one child OutMessage
 *  should continue to the current Block's parent. When provided,
 *  `foldOutMessage` still handles forwarded variants locally. A derived
 *  OutMessage replaces the one-to-one lift for the dispatch. When the Step
 *  emits nothing, the lift runs as usual.
 *
 *  An entry point that takes nothing but the child Model, such as
 *  `Dialog.close`, has no input to pass: fold it with
 *  {@link foldChildStep}, which returns the {@link Step} directly.
 *
 *  `update` closes over per-dispatch context, and the data-last form
 *  composes with {@link combineSteps}, here to put a navigation Command ahead
 *  of the child's:
 *
 *  ```ts
 *  const enterJoinedRoom = (roomId: string, player: Player): UpdateStep =>
 *    Update.combineSteps([
 *      model => ({ model, commands: [NavigateToRoom({ roomId })] }),
 *      Update.foldChild({
 *        update: (room: Room.Model, joinedPlayer: Player) =>
 *          Room.informJoined(room, joinedPlayer, { roomId }),
 *        read: readRoom,
 *        write: writeRoom,
 *        toParentMessage: toGotRoomMessage,
 *      })(player),
 *    ])
 *  ``` */
export const foldChild: {
  <
    ParentModel,
    ParentMessage,
    ChildModel,
    Input,
    ChildMessage,
    ChildOutMessage,
    ParentOutMessage,
    ChildRequirements = never,
    OutMessageStepRequirements = ChildRequirements,
    OutMessageStepMessage = ParentMessage,
    DerivedParentOutMessage = ParentOutMessage,
  >(
    childFold: ChildFoldWithParentOutMessage<
      ParentModel,
      ParentMessage,
      ChildModel,
      Input,
      ChildMessage,
      ChildOutMessage,
      ParentOutMessage,
      ChildRequirements,
      OutMessageStepRequirements,
      OutMessageStepMessage,
      DerivedParentOutMessage
    >,
  ): FoldWithOutMessage<
    ParentModel,
    ParentMessage | OutMessageStepMessage,
    Input,
    ParentOutMessage | DerivedParentOutMessage,
    ChildRequirements | OutMessageStepRequirements
  >
  <
    ParentModel,
    ParentMessage,
    ChildModel,
    Input,
    ChildMessage,
    ChildOutMessage,
    ChildRequirements = never,
    OutMessageStepRequirements = ChildRequirements,
    OutMessageStepMessage = ParentMessage,
  >(
    childFold: ChildFoldWithOutMessage<
      ParentModel,
      ParentMessage,
      ChildModel,
      Input,
      ChildMessage,
      ChildOutMessage,
      ChildRequirements,
      OutMessageStepRequirements,
      OutMessageStepMessage
    >,
  ): Fold<
    ParentModel,
    ParentMessage | OutMessageStepMessage,
    Input,
    ChildRequirements | OutMessageStepRequirements
  >
  <
    ParentModel,
    ParentMessage,
    ChildModel,
    Input,
    ChildMessage,
    ChildOutMessage,
    ParentOutMessage,
    ChildRequirements = never,
    OutMessageStepRequirements = ChildRequirements,
    OutMessageStepMessage = ParentMessage,
  >(
    childFold: ChildFoldWithDerivedParentOutMessage<
      ParentModel,
      ParentMessage,
      ChildModel,
      Input,
      ChildMessage,
      ChildOutMessage,
      ParentOutMessage,
      ChildRequirements,
      OutMessageStepRequirements,
      OutMessageStepMessage
    >,
  ): FoldWithOutMessage<
    ParentModel,
    ParentMessage | OutMessageStepMessage,
    Input,
    ParentOutMessage,
    ChildRequirements | OutMessageStepRequirements
  >
  <ParentModel, ParentMessage, ChildModel, Input, ChildMessage, R = never>(
    childFold: ChildFold<
      ParentModel,
      ParentMessage,
      ChildModel,
      Input,
      ChildMessage,
      R
    >,
  ): Fold<ParentModel, ParentMessage, Input, R>
} = (childFold: AnyChildFold) => {
  const context = makeFoldContext(childFold.toParentMessage)

  return Function.dual(2, (model: any, input: any) =>
    runChildFold(childFold, context, model, input),
  )
}

/** {@link Fold} for one child addressed by key. Data-first runs the fold
 * now (`fold(model, key, input)`). Data-last builds a composable
 * {@link Step} (`fold(key, input)`, for {@link combineSteps}). */
export type FoldAt<ParentModel, ParentMessage, Key, Input, R = never> = {
  (
    model: ParentModel,
    key: Key,
    input: Input,
  ): Return<ParentModel, ParentMessage, R>
  (key: Key, input: Input): Step<ParentModel, ParentMessage, R>
}

/** {@link FoldAt} whose result can carry the parent OutMessage. */
export type FoldAtWithOutMessage<
  ParentModel,
  ParentMessage,
  Key,
  Input,
  ParentOutMessage,
  R = never,
> = {
  (
    model: ParentModel,
    key: Key,
    input: Input,
  ): ReturnWithOutMessage<ParentModel, ParentMessage, ParentOutMessage, R>
  (
    key: Key,
    input: Input,
  ): StepWithOutMessage<ParentModel, ParentMessage, ParentOutMessage, R>
}

/** Configuration for {@link foldChildAt} when the child emits no
 * OutMessage. The key selects the child Model for `readAt` and `writeAt`.
 * `toParentMessage` receives the same key when wrapping child Messages. */
export type ChildFoldAt<
  ParentModel,
  ParentMessage,
  ChildModel,
  Key,
  Input,
  ChildMessage,
  R = never,
> = Readonly<{
  update: (
    childModel: ChildModel,
    input: Input,
  ) => Return<ChildModel, ChildMessage, R>
  readAt: (model: ParentModel, key: Key) => Option.Option<ChildModel>
  writeAt: (
    model: ParentModel,
    key: Key,
    nextChildModel: ChildModel,
  ) => ParentModel
  toParentMessage: (key: Key, message: ChildMessage) => ParentMessage
}>

/** {@link ChildFoldAt} for a child that emits OutMessages handled locally.
 * `foldOutMessage` takes the key and a {@link FoldContext} for lifting child
 * Commands. It returns a matcher whose handlers produce parent Steps. */
export type ChildFoldAtWithOutMessage<
  ParentModel,
  ParentMessage,
  ChildModel,
  Key,
  Input,
  ChildMessage,
  ChildOutMessage,
  ChildRequirements = never,
  OutMessageStepRequirements = ChildRequirements,
  OutMessageStepMessage = ParentMessage,
> = Readonly<{
  update: (
    childModel: ChildModel,
    input: Input,
  ) => ReturnWithOutMessage<
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ChildRequirements
  >
  readAt: (model: ParentModel, key: Key) => Option.Option<ChildModel>
  writeAt: (
    model: ParentModel,
    key: Key,
    nextChildModel: ChildModel,
  ) => ParentModel
  toParentMessage: (key: Key, message: ChildMessage) => ParentMessage
  foldOutMessage: (
    key: Key,
    context: FoldContext<ChildMessage, ParentMessage>,
  ) => (
    outMessage: ChildOutMessage,
  ) => Step<
    NoInfer<ParentModel>,
    OutMessageStepMessage,
    OutMessageStepRequirements
  >
}>

/** {@link ChildFoldAtWithOutMessage} for a parent that derives its own
 * OutMessage while handling the child's OutMessage. */
export type ChildFoldAtWithDerivedParentOutMessage<
  ParentModel,
  ParentMessage,
  ChildModel,
  Key,
  Input,
  ChildMessage,
  ChildOutMessage,
  ParentOutMessage,
  ChildRequirements = never,
  OutMessageStepRequirements = ChildRequirements,
  OutMessageStepMessage = ParentMessage,
> = Readonly<{
  update: (
    childModel: ChildModel,
    input: Input,
  ) => ReturnWithOutMessage<
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ChildRequirements
  >
  readAt: (model: ParentModel, key: Key) => Option.Option<ChildModel>
  writeAt: (
    model: ParentModel,
    key: Key,
    nextChildModel: ChildModel,
  ) => ParentModel
  toParentMessage: (key: Key, message: ChildMessage) => ParentMessage
  toParentOutMessage?: never
  foldOutMessage: (
    key: Key,
    context: FoldContext<ChildMessage, ParentMessage>,
  ) => (
    outMessage: ChildOutMessage,
  ) => StepWithOutMessage<
    NoInfer<ParentModel>,
    OutMessageStepMessage,
    ParentOutMessage,
    OutMessageStepRequirements
  >
}>

/** {@link ChildFoldAtWithOutMessage} for a parent that forwards at least one
 * child OutMessage to its own parent. `toParentOutMessage` takes the key and
 * returns a matcher that produces parent OutMessages. Return `undefined` for
 * named child variants that should not reach the current Block's parent.
 * If `foldOutMessage` derives a parent OutMessage, it takes precedence over
 * forwarding. */
export type ChildFoldAtWithParentOutMessage<
  ParentModel,
  ParentMessage,
  ChildModel,
  Key,
  Input,
  ChildMessage,
  ChildOutMessage,
  ParentOutMessage,
  ChildRequirements = never,
  OutMessageStepRequirements = ChildRequirements,
  OutMessageStepMessage = ParentMessage,
  DerivedParentOutMessage = ParentOutMessage,
> = Readonly<{
  update: (
    childModel: ChildModel,
    input: Input,
  ) => ReturnWithOutMessage<
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ChildRequirements
  >
  readAt: (model: ParentModel, key: Key) => Option.Option<ChildModel>
  writeAt: (
    model: ParentModel,
    key: Key,
    nextChildModel: ChildModel,
  ) => ParentModel
  toParentMessage: (key: Key, message: ChildMessage) => ParentMessage
  toParentOutMessage: (
    key: Key,
  ) => (outMessage: ChildOutMessage) => ParentOutMessage | undefined
  foldOutMessage?: (
    key: Key,
    context: FoldContext<ChildMessage, ParentMessage>,
  ) => (
    outMessage: ChildOutMessage,
  ) => StepWithOutMessage<
    NoInfer<ParentModel>,
    OutMessageStepMessage,
    DerivedParentOutMessage,
    OutMessageStepRequirements
  >
}>

type AnyKeyedChildFold = Readonly<{
  update: (childModel: any, input: any) => AnyUpdateReturn
  readAt: (model: any, key: any) => Option.Option<any>
  writeAt: (model: any, key: any, nextChildModel: any) => any
  toParentMessage: (key: any, message: any) => any
  toParentOutMessage?: (key: any) => (outMessage: any) => any | undefined
  foldOutMessage?: (
    key: any,
    context: FoldContext<any, any>,
  ) => (outMessage: any) => (model: any) => AnyUpdateReturn
}>

/** Folds one Block selected by key into the parent update. `readAt` and
 * `writeAt` use the key to find and replace the child Model.
 * `toParentMessage` receives the key when wrapping child Messages. The returned
 * {@link FoldAt} runs data-first as `fold(model, key, input)` and data-last
 * as `fold(key, input)` for {@link combineSteps}.
 *
 * When `readAt` returns `None` for the key, the fold returns `{ model }`.
 *
 * `foldOutMessage` takes the key and a {@link FoldContext} of lifters bound
 * to `toParentMessage`, then returns a matcher that produces a parent Step.
 * Callbacks that do not need the lifters can omit the context parameter.
 * To forward a child OutMessage, `toParentOutMessage` takes the key and
 * returns a matcher that produces a parent OutMessage. Both factories are
 * skipped when the child emits no OutMessage. If the local Step derives a
 * parent OutMessage, that result takes precedence over forwarding.
 *
 * For example, the parent stores Applicant Blocks in an array and uses each
 * entry's stable id as its key:
 *
 * ```ts
 * const foldApplicant = Update.foldChildAt({
 *   update: Applicant.update,
 *   readAt: (model: Model, entryId: string) =>
 *     Option.map(
 *       Array.findFirst(
 *         model.applicants,
 *         applicant => applicant.id === entryId,
 *       ),
 *       applicant => applicant.entry,
 *     ),
 *   writeAt: (model, entryId, nextEntry) =>
 *     modifyFields(model, {
 *       applicants: Array.map(applicant =>
 *         applicant.id === entryId
 *           ? modifyFields(applicant, { entry: () => nextEntry })
 *           : applicant,
 *       ),
 *     }),
 *   toParentMessage: (entryId, message) =>
 *     Message.GotApplicantMessage({ entryId, message }),
 * })
 *
 * GotApplicantMessage: ({ entryId, message }) =>
 *   foldApplicant(model, entryId, message)
 * ```
 *
 * When only one child is active at a time, store that one Model and an
 * `Option` of its key instead of a collection. */
export const foldChildAt: {
  <
    ParentModel,
    ParentMessage,
    ChildModel,
    Input,
    ChildMessage,
    ChildOutMessage,
    ParentOutMessage,
    Key,
    ChildRequirements = never,
    OutMessageStepRequirements = ChildRequirements,
    OutMessageStepMessage = ParentMessage,
    DerivedParentOutMessage = ParentOutMessage,
  >(
    childFold: ChildFoldAtWithParentOutMessage<
      ParentModel,
      ParentMessage,
      ChildModel,
      Key,
      Input,
      ChildMessage,
      ChildOutMessage,
      ParentOutMessage,
      ChildRequirements,
      OutMessageStepRequirements,
      OutMessageStepMessage,
      DerivedParentOutMessage
    >,
  ): FoldAtWithOutMessage<
    ParentModel,
    ParentMessage | OutMessageStepMessage,
    Key,
    Input,
    ParentOutMessage | DerivedParentOutMessage,
    ChildRequirements | OutMessageStepRequirements
  >
  <
    ParentModel,
    ParentMessage,
    ChildModel,
    Input,
    ChildMessage,
    ChildOutMessage,
    Key,
    ChildRequirements = never,
    OutMessageStepRequirements = ChildRequirements,
    OutMessageStepMessage = ParentMessage,
  >(
    childFold: ChildFoldAtWithOutMessage<
      ParentModel,
      ParentMessage,
      ChildModel,
      Key,
      Input,
      ChildMessage,
      ChildOutMessage,
      ChildRequirements,
      OutMessageStepRequirements,
      OutMessageStepMessage
    >,
  ): FoldAt<
    ParentModel,
    ParentMessage | OutMessageStepMessage,
    Key,
    Input,
    ChildRequirements | OutMessageStepRequirements
  >
  <
    ParentModel,
    ParentMessage,
    ChildModel,
    Input,
    ChildMessage,
    ChildOutMessage,
    ParentOutMessage,
    Key,
    ChildRequirements = never,
    OutMessageStepRequirements = ChildRequirements,
    OutMessageStepMessage = ParentMessage,
  >(
    childFold: ChildFoldAtWithDerivedParentOutMessage<
      ParentModel,
      ParentMessage,
      ChildModel,
      Key,
      Input,
      ChildMessage,
      ChildOutMessage,
      ParentOutMessage,
      ChildRequirements,
      OutMessageStepRequirements,
      OutMessageStepMessage
    >,
  ): FoldAtWithOutMessage<
    ParentModel,
    ParentMessage | OutMessageStepMessage,
    Key,
    Input,
    ParentOutMessage,
    ChildRequirements | OutMessageStepRequirements
  >
  <ParentModel, ParentMessage, ChildModel, Input, ChildMessage, Key, R = never>(
    childFold: ChildFoldAt<
      ParentModel,
      ParentMessage,
      ChildModel,
      Key,
      Input,
      ChildMessage,
      R
    >,
  ): FoldAt<ParentModel, ParentMessage, Key, Input, R>
} = (keyedFold: AnyKeyedChildFold): any =>
  Function.dual(3, (model: any, key: any, input: any) => {
    const toParentMessage = (message: any) =>
      keyedFold.toParentMessage(key, message)
    const toParentOutMessage = keyedFold.toParentOutMessage
    const foldOutMessage = keyedFold.foldOutMessage
    const childFold: AnyChildFold = {
      update: keyedFold.update,
      read: parentModel => keyedFold.readAt(parentModel, key),
      write: (parentModel, nextChildModel) =>
        keyedFold.writeAt(parentModel, key, nextChildModel),
      toParentMessage,
      ...(toParentOutMessage === undefined
        ? {}
        : {
            toParentOutMessage: (outMessage: any) =>
              toParentOutMessage(key)(outMessage),
          }),
      ...(foldOutMessage === undefined
        ? {}
        : {
            foldOutMessage: (outMessage: any, context: FoldContext<any, any>) =>
              foldOutMessage(key, context)(outMessage),
          }),
    }

    return runChildFold(
      childFold,
      makeFoldContext(toParentMessage),
      model,
      input,
    )
  })

const makeFoldContext = (
  toParentMessage: (message: any) => any,
): FoldContext<any, any> => ({
  liftCommand: command => mapMessage(command, toParentMessage),
  liftCommands: commands => mapMessages(commands, toParentMessage),
})

const runChildFold = (
  childFold: AnyChildFold,
  context: FoldContext<any, any>,
  model: any,
  input: any,
): any =>
  pipe(
    model,
    childFold.read,
    Option.match({
      onNone: () => ({ model }),
      onSome: childModel => {
        const childUpdate = childFold.update(childModel, input)
        const modelWithChild = childFold.write(model, childUpdate.model)

        return finalizeChildFold(
          childUpdate,
          modelWithChild,
          childFold,
          context,
        )
      },
    }),
  )

const finalizeChildFold = (
  childReturn: AnyUpdateReturn,
  modelWithChild: any,
  childFold: Pick<
    AnyChildFold,
    'toParentMessage' | 'foldOutMessage' | 'toParentOutMessage'
  >,
  context: FoldContext<any, any>,
): AnyUpdateReturn => {
  const mappedCommands = mapMessages(
    childReturn.commands,
    childFold.toParentMessage,
  )
  const update =
    childFold.foldOutMessage === undefined ||
    childReturn.outMessage === undefined
      ? { model: modelWithChild, commands: mappedCommands }
      : appendOutMessageStep(
          childFold.foldOutMessage,
          childReturn.outMessage,
          context,
          modelWithChild,
          mappedCommands,
        )

  if (update.outMessage !== undefined) {
    return update
  }

  if (
    childFold.toParentOutMessage === undefined ||
    childReturn.outMessage === undefined
  ) {
    return update
  }

  const parentOutMessage = childFold.toParentOutMessage(childReturn.outMessage)

  return parentOutMessage === undefined
    ? update
    : {
        model: update.model,
        commands: update.commands,
        outMessage: parentOutMessage,
      }
}

/** {@link ChildFold} for an entry point that takes nothing but the child
 *  Model, such as `Dialog.close` or a Block's `informRouteChanged` that
 *  derives everything it needs from its own state. There is no `input`, so
 *  {@link foldChildStep} returns the {@link Step} itself rather than a dual
 *  {@link Fold}. */
export type ChildStepFold<
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage,
  R = never,
> = Readonly<{
  update: (childModel: ChildModel) => Return<ChildModel, ChildMessage, R>
  read: (model: ParentModel) => Option.Option<ChildModel>
  write: (model: ParentModel, nextChildModel: ChildModel) => ParentModel
  toParentMessage: (message: ChildMessage) => ParentMessage
}>

/** {@link ChildStepFold} for an entry point whose return carries the child's
 *  OutMessage channel, adding `foldOutMessage`. It behaves exactly as it does
 *  in {@link ChildFoldWithOutMessage}, down to the optional second parameter,
 *  a {@link FoldContext} of lifters bound to `toParentMessage`, and combines
 *  the child update and OutMessage Step Message and service requirements. */
export type ChildStepFoldWithOutMessage<
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage,
  ChildOutMessage,
  ChildRequirements = never,
  OutMessageStepRequirements = ChildRequirements,
  OutMessageStepMessage = ParentMessage,
> = Readonly<{
  update: (
    childModel: ChildModel,
  ) => ReturnWithOutMessage<
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ChildRequirements
  >
  read: (model: ParentModel) => Option.Option<ChildModel>
  write: (model: ParentModel, nextChildModel: ChildModel) => ParentModel
  toParentMessage: (message: ChildMessage) => ParentMessage
  foldOutMessage: (
    outMessage: ChildOutMessage,
    context: FoldContext<ChildMessage, ParentMessage>,
  ) => Step<
    NoInfer<ParentModel>,
    OutMessageStepMessage,
    OutMessageStepRequirements
  >
}>

/** {@link ChildStepFoldWithOutMessage} for a parent that derives its own
 *  OutMessage while folding the child's. This is the no-argument counterpart
 *  to {@link ChildFoldWithDerivedParentOutMessage}. */
export type ChildStepFoldWithDerivedParentOutMessage<
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage,
  ChildOutMessage,
  ParentOutMessage,
  ChildRequirements = never,
  OutMessageStepRequirements = ChildRequirements,
  OutMessageStepMessage = ParentMessage,
> = Readonly<{
  update: (
    childModel: ChildModel,
  ) => ReturnWithOutMessage<
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ChildRequirements
  >
  read: (model: ParentModel) => Option.Option<ChildModel>
  write: (model: ParentModel, nextChildModel: ChildModel) => ParentModel
  toParentMessage: (message: ChildMessage) => ParentMessage
  toParentOutMessage?: never
  foldOutMessage: (
    outMessage: ChildOutMessage,
    context: FoldContext<ChildMessage, ParentMessage>,
  ) => StepWithOutMessage<
    NoInfer<ParentModel>,
    OutMessageStepMessage,
    ParentOutMessage,
    OutMessageStepRequirements
  >
}>

/** {@link ChildStepFoldWithOutMessage} for a parent that is itself a
 *  Block. `toParentOutMessage` turns the child's OutMessage into the
 *  parent's OutMessage. Return `undefined` for a named child variant that
 *  stops at this parent. `foldOutMessage` remains available when the parent
 *  also updates its own state from the child's OutMessage. A derived
 *  OutMessage from that Step replaces the one-to-one lift for the dispatch.
 *  When the Step emits nothing, the lift runs as usual.
 *
 *  Use this shape only when at least one child OutMessage should continue to
 *  the current Block's parent. If every child OutMessage stops here, use
 *  {@link ChildStepFoldWithDerivedParentOutMessage} when the fold derives its
 *  own OutMessage, or {@link ChildStepFoldWithOutMessage} when it does not.
 *  When provided, `foldOutMessage` still handles each variant locally,
 *  including variants that continue upward. */
export type ChildStepFoldWithParentOutMessage<
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage,
  ChildOutMessage,
  ParentOutMessage,
  ChildRequirements = never,
  OutMessageStepRequirements = ChildRequirements,
  OutMessageStepMessage = ParentMessage,
  DerivedParentOutMessage = ParentOutMessage,
> = Readonly<{
  update: (
    childModel: ChildModel,
  ) => ReturnWithOutMessage<
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ChildRequirements
  >
  read: (model: ParentModel) => Option.Option<ChildModel>
  write: (model: ParentModel, nextChildModel: ChildModel) => ParentModel
  toParentMessage: (message: ChildMessage) => ParentMessage
  toParentOutMessage: (
    outMessage: ChildOutMessage,
  ) => ParentOutMessage | undefined
  foldOutMessage?: (
    outMessage: ChildOutMessage,
    context: FoldContext<ChildMessage, ParentMessage>,
  ) => StepWithOutMessage<
    NoInfer<ParentModel>,
    OutMessageStepMessage,
    DerivedParentOutMessage,
    OutMessageStepRequirements
  >
}>

/** @internal Implementation-facing view of both {@link ChildStepFold}
 *  shapes. The overloads on {@link foldChildStep} carry the public
 *  contract. */
type AnyChildStepFold = Readonly<{
  update: (childModel: any) => AnyUpdateReturn
  read: (model: any) => Option.Option<any>
  write: (model: any, nextChildModel: any) => any
  toParentMessage: (message: any) => any
  toParentOutMessage?: (outMessage: any) => any | undefined
  foldOutMessage?: (
    outMessage: any,
    context: FoldContext<any, any>,
  ) => (model: any) => AnyUpdateReturn
}>

/** Folds a child entry point that takes nothing but the child Model, and
 *  returns the {@link Step} directly. Everything else matches
 *  {@link foldChild}: the child is read, updated, and written back, its
 *  Commands are lifted through `toParentMessage`, a `None` from `read` makes
 *  the Step a no-op, and `foldOutMessage` runs against the Model with the
 *  child already written back.
 *
 *  Reach for it wherever a Block exposes a no-argument entry point, so the
 *  call site composes with {@link combineSteps} as a plain Step and never invents
 *  an input the child does not take:
 *
 *  ```ts
 *  const foldMobileMenuDialogCloseStep = Update.foldChildStep({
 *    update: Dialog.close,
 *    read: readMobileMenuDialog,
 *    write: writeMobileMenuDialog,
 *    toParentMessage: toGotMobileMenuDialogMessage,
 *    foldOutMessage: foldMobileMenuDialogOutMessage,
 *  })
 *
 *  // in the parent update
 *  Update.combineSteps(model, [writeRouteFieldsStep, foldMobileMenuDialogCloseStep])
 *  ```
 *
 *  `foldOutMessage` takes the same optional second parameter as
 *  {@link foldChild}: a {@link FoldContext} carrying `liftCommand` and
 *  `liftCommands` bound to this config's `toParentMessage`, for a Command the
 *  Step returns whose result is the child's Message.
 *
 *  A parent that is itself a Block receives a
 *  {@link StepWithOutMessage} when `foldOutMessage` emits a derived parent
 *  OutMessage. Add `toParentOutMessage` only when at least one child OutMessage
 *  should continue to the current Block's parent. When provided,
 *  `foldOutMessage` still handles forwarded variants locally. A derived
 *  OutMessage replaces the one-to-one lift for the dispatch. When the Step
 *  emits nothing, the lift runs as usual. */
export const foldChildStep: {
  <
    ParentModel,
    ParentMessage,
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ParentOutMessage,
    ChildRequirements = never,
    OutMessageStepRequirements = ChildRequirements,
    OutMessageStepMessage = ParentMessage,
    DerivedParentOutMessage = ParentOutMessage,
  >(
    childFold: ChildStepFoldWithParentOutMessage<
      ParentModel,
      ParentMessage,
      ChildModel,
      ChildMessage,
      ChildOutMessage,
      ParentOutMessage,
      ChildRequirements,
      OutMessageStepRequirements,
      OutMessageStepMessage,
      DerivedParentOutMessage
    >,
  ): StepWithOutMessage<
    ParentModel,
    ParentMessage | OutMessageStepMessage,
    ParentOutMessage | DerivedParentOutMessage,
    ChildRequirements | OutMessageStepRequirements
  >
  <
    ParentModel,
    ParentMessage,
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ChildRequirements = never,
    OutMessageStepRequirements = ChildRequirements,
    OutMessageStepMessage = ParentMessage,
  >(
    childFold: ChildStepFoldWithOutMessage<
      ParentModel,
      ParentMessage,
      ChildModel,
      ChildMessage,
      ChildOutMessage,
      ChildRequirements,
      OutMessageStepRequirements,
      OutMessageStepMessage
    >,
  ): Step<
    ParentModel,
    ParentMessage | OutMessageStepMessage,
    ChildRequirements | OutMessageStepRequirements
  >
  <
    ParentModel,
    ParentMessage,
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ParentOutMessage,
    ChildRequirements = never,
    OutMessageStepRequirements = ChildRequirements,
    OutMessageStepMessage = ParentMessage,
  >(
    childFold: ChildStepFoldWithDerivedParentOutMessage<
      ParentModel,
      ParentMessage,
      ChildModel,
      ChildMessage,
      ChildOutMessage,
      ParentOutMessage,
      ChildRequirements,
      OutMessageStepRequirements,
      OutMessageStepMessage
    >,
  ): StepWithOutMessage<
    ParentModel,
    ParentMessage | OutMessageStepMessage,
    ParentOutMessage,
    ChildRequirements | OutMessageStepRequirements
  >
  <ParentModel, ParentMessage, ChildModel, ChildMessage, R = never>(
    childFold: ChildStepFold<
      ParentModel,
      ParentMessage,
      ChildModel,
      ChildMessage,
      R
    >,
  ): Step<ParentModel, ParentMessage, R>
} = (childFold: AnyChildStepFold) => {
  const context = makeFoldContext(childFold.toParentMessage)

  return (model: any) => runChildFold(childFold, context, model, undefined)
}

const appendOutMessageStep = (
  foldOutMessage: (
    outMessage: any,
    context: FoldContext<any, any>,
  ) => (model: any) => AnyUpdateReturn,
  outMessage: any,
  context: FoldContext<any, any>,
  modelWithChild: any,
  mappedCommands: Commands<any, any>,
): AnyUpdateReturn => {
  const outMessageFold = foldOutMessage(outMessage, context)(modelWithChild)
  const commands = [...mappedCommands, ...(outMessageFold.commands ?? [])]

  return withOutMessage(
    { model: outMessageFold.model, commands },
    outMessageFold.outMessage,
  )
}

type InitFoldRegistrationEvidence<Fold> =
  Fold extends Readonly<{
    foldOutMessage?: infer FoldOutMessage
  }>
    ? NonNullable<FoldOutMessage> extends (
        ...args: ReadonlyArray<any>
      ) => infer OutMessageStep
      ? OutMessageStep extends (...args: ReadonlyArray<any>) => infer StepReturn
        ? RegistrationEvidenceOf<StepReturn>
        : never
      : never
    : never

/** Builds a parent Model from a completed child initialization result and lifts
 *  its Commands through `toParentMessage`. Call it data-first with the child
 *  result and parent adapters.
 *
 *  For connected Blocks, prefer the Binding's `init` and exposed operations.
 *  Construct the parent Model from init results, then apply any startup Steps
 *  to that Model. A boot Step takes an existing Model; it does not construct
 *  a child initialization result for this helper.
 *
 *  `toParentModel` constructs the complete parent Model before `foldOutMessage`
 *  runs. The fold receives the same {@link FoldContext} as {@link foldChild},
 *  and its Commands follow the mapped child Commands. The returned Message
 *  and service requirements include both the child's mapped Commands and the
 *  OutMessage Step's Commands.
 *
 *  ```ts
 *  const init = () =>
 *    Update.foldChildInit(Search.init(), {
 *      toParentModel: search => Model.make({ search }),
 *      toParentMessage: message => Message.GotSearchMessage({ message }),
 *    })
 *  ```
 *
 *  A child result that can emit an OutMessage requires `foldOutMessage` or
 *  `toParentOutMessage`. A local fold returning {@link Step} produces a plain
 *  {@link Return}; a fold returning {@link StepWithOutMessage} produces a
 *  {@link ReturnWithOutMessage}. Add `toParentOutMessage` to forward child
 *  OutMessages, optionally alongside local handling. A derived OutMessage
 *  replaces the forwarded one. When the child emits nothing, neither adapter
 *  runs and the result omits `outMessage`.
 */
export const foldChildInit: {
  <
    ParentModel,
    ParentMessage,
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ParentOutMessage,
    ChildRequirements = never,
    OutMessageStepRequirements = ChildRequirements,
    OutMessageStepMessage = ParentMessage,
    DerivedParentOutMessage = ParentOutMessage,
    const ChildInit extends ReturnWithOutMessageValue<
      ChildModel,
      ChildMessage,
      ChildOutMessage,
      ChildRequirements
    > = ReturnWithOutMessage<
      ChildModel,
      ChildMessage,
      ChildOutMessage,
      ChildRequirements
    >,
    const ChildFold extends Readonly<{
      toParentModel: (childModel: ChildModel) => ParentModel
      toParentMessage: (message: ChildMessage) => ParentMessage
      toParentOutMessage: (
        outMessage: ChildOutMessage,
      ) => ParentOutMessage | undefined
      foldOutMessage?: (
        outMessage: ChildOutMessage,
        context: FoldContext<ChildMessage, ParentMessage>,
      ) => (
        model: ParentModel,
      ) => ReturnWithOutMessageValue<
        ParentModel,
        OutMessageStepMessage,
        DerivedParentOutMessage,
        OutMessageStepRequirements
      >
    }> = Readonly<{
      toParentModel: (childModel: ChildModel) => ParentModel
      toParentMessage: (message: ChildMessage) => ParentMessage
      toParentOutMessage: (
        outMessage: ChildOutMessage,
      ) => ParentOutMessage | undefined
      foldOutMessage?: (
        outMessage: ChildOutMessage,
        context: FoldContext<ChildMessage, ParentMessage>,
      ) => (
        model: ParentModel,
      ) => ReturnWithOutMessageValue<
        ParentModel,
        OutMessageStepMessage,
        DerivedParentOutMessage,
        OutMessageStepRequirements
      >
    }>,
  >(
    childInit: ChildInit &
      ReturnWithOutMessageValue<
        ChildModel,
        ChildMessage,
        ChildOutMessage,
        ChildRequirements
      >,
    childFold: ChildFold &
      Readonly<{
        toParentModel: (childModel: ChildModel) => ParentModel
        toParentMessage: (message: ChildMessage) => ParentMessage
        toParentOutMessage: (
          outMessage: ChildOutMessage,
        ) => ParentOutMessage | undefined
        foldOutMessage?: (
          outMessage: ChildOutMessage,
          context: FoldContext<ChildMessage, ParentMessage>,
        ) => (
          model: ParentModel,
        ) => ReturnWithOutMessageValue<
          ParentModel,
          OutMessageStepMessage,
          DerivedParentOutMessage,
          OutMessageStepRequirements
        >
      }>,
  ): WithRegistrationEvidence<
    ReturnWithOutMessage<
      ParentModel,
      ParentMessage | OutMessageStepMessage,
      ParentOutMessage | DerivedParentOutMessage,
      ChildRequirements | OutMessageStepRequirements
    >,
    RegistrationEvidenceOf<ChildInit> | InitFoldRegistrationEvidence<ChildFold>
  >
  <
    ParentModel,
    ParentMessage,
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ChildRequirements = never,
    OutMessageStepRequirements = ChildRequirements,
    OutMessageStepMessage = ParentMessage,
    const ChildInit extends ReturnWithOutMessageValue<
      ChildModel,
      ChildMessage,
      ChildOutMessage,
      ChildRequirements
    > = ReturnWithOutMessage<
      ChildModel,
      ChildMessage,
      ChildOutMessage,
      ChildRequirements
    >,
    const ChildFold extends Readonly<{
      toParentModel: (childModel: ChildModel) => ParentModel
      toParentMessage: (message: ChildMessage) => ParentMessage
      foldOutMessage: (
        outMessage: ChildOutMessage,
        context: FoldContext<ChildMessage, ParentMessage>,
      ) => (
        model: ParentModel,
      ) => ReturnValue<
        ParentModel,
        OutMessageStepMessage,
        OutMessageStepRequirements
      >
    }> = Readonly<{
      toParentModel: (childModel: ChildModel) => ParentModel
      toParentMessage: (message: ChildMessage) => ParentMessage
      foldOutMessage: (
        outMessage: ChildOutMessage,
        context: FoldContext<ChildMessage, ParentMessage>,
      ) => (
        model: ParentModel,
      ) => ReturnValue<
        ParentModel,
        OutMessageStepMessage,
        OutMessageStepRequirements
      >
    }>,
  >(
    childInit: ChildInit &
      ReturnWithOutMessageValue<
        ChildModel,
        ChildMessage,
        ChildOutMessage,
        ChildRequirements
      >,
    childFold: ChildFold &
      Readonly<{
        toParentModel: (childModel: ChildModel) => ParentModel
        toParentMessage: (message: ChildMessage) => ParentMessage
        foldOutMessage: (
          outMessage: ChildOutMessage,
          context: FoldContext<ChildMessage, ParentMessage>,
        ) => (
          model: ParentModel,
        ) => ReturnValue<
          ParentModel,
          OutMessageStepMessage,
          OutMessageStepRequirements
        >
      }>,
  ): WithRegistrationEvidence<
    Return<
      ParentModel,
      ParentMessage | OutMessageStepMessage,
      ChildRequirements | OutMessageStepRequirements
    >,
    RegistrationEvidenceOf<ChildInit> | InitFoldRegistrationEvidence<ChildFold>
  >
  <
    ParentModel,
    ParentMessage,
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ParentOutMessage,
    ChildRequirements = never,
    OutMessageStepRequirements = ChildRequirements,
    OutMessageStepMessage = ParentMessage,
    const ChildInit extends ReturnWithOutMessageValue<
      ChildModel,
      ChildMessage,
      ChildOutMessage,
      ChildRequirements
    > = ReturnWithOutMessage<
      ChildModel,
      ChildMessage,
      ChildOutMessage,
      ChildRequirements
    >,
    const ChildFold extends Readonly<{
      toParentModel: (childModel: ChildModel) => ParentModel
      toParentMessage: (message: ChildMessage) => ParentMessage
      toParentOutMessage?: never
      foldOutMessage: (
        outMessage: ChildOutMessage,
        context: FoldContext<ChildMessage, ParentMessage>,
      ) => (
        model: ParentModel,
      ) => ReturnWithOutMessageValue<
        ParentModel,
        OutMessageStepMessage,
        ParentOutMessage,
        OutMessageStepRequirements
      >
    }> = Readonly<{
      toParentModel: (childModel: ChildModel) => ParentModel
      toParentMessage: (message: ChildMessage) => ParentMessage
      toParentOutMessage?: never
      foldOutMessage: (
        outMessage: ChildOutMessage,
        context: FoldContext<ChildMessage, ParentMessage>,
      ) => (
        model: ParentModel,
      ) => ReturnWithOutMessageValue<
        ParentModel,
        OutMessageStepMessage,
        ParentOutMessage,
        OutMessageStepRequirements
      >
    }>,
  >(
    childInit: ChildInit &
      ReturnWithOutMessageValue<
        ChildModel,
        ChildMessage,
        ChildOutMessage,
        ChildRequirements
      >,
    childFold: ChildFold &
      Readonly<{
        toParentModel: (childModel: ChildModel) => ParentModel
        toParentMessage: (message: ChildMessage) => ParentMessage
        toParentOutMessage?: never
        foldOutMessage: (
          outMessage: ChildOutMessage,
          context: FoldContext<ChildMessage, ParentMessage>,
        ) => (
          model: ParentModel,
        ) => ReturnWithOutMessageValue<
          ParentModel,
          OutMessageStepMessage,
          ParentOutMessage,
          OutMessageStepRequirements
        >
      }>,
  ): WithRegistrationEvidence<
    ReturnWithOutMessage<
      ParentModel,
      ParentMessage | OutMessageStepMessage,
      ParentOutMessage,
      ChildRequirements | OutMessageStepRequirements
    >,
    RegistrationEvidenceOf<ChildInit> | InitFoldRegistrationEvidence<ChildFold>
  >
  <
    ParentModel,
    ParentMessage,
    ChildModel,
    ChildMessage,
    R = never,
    const ChildInit extends ReturnValue<ChildModel, ChildMessage, R> = Return<
      ChildModel,
      ChildMessage,
      R
    >,
  >(
    childInit: ChildInit & ReturnValue<ChildModel, ChildMessage, R>,
    childFold: Readonly<{
      toParentModel: (childModel: ChildModel) => ParentModel
      toParentMessage: (message: ChildMessage) => ParentMessage
    }>,
  ): WithRegistrationEvidence<
    Return<ParentModel, ParentMessage, R>,
    RegistrationEvidenceOf<ChildInit>
  >
} = (
  childInit: AnyUpdateReturn,
  childFold: Readonly<{
    toParentModel: (childModel: any) => any
  }> &
    Pick<
      AnyChildFold,
      'toParentMessage' | 'foldOutMessage' | 'toParentOutMessage'
    >,
): any => {
  const model = childFold.toParentModel(childInit.model)
  const context = makeFoldContext(childFold.toParentMessage)

  return finalizeChildFold(childInit, model, childFold, context)
}

type InitCommandEffects<Init> = Init extends { commands?: infer ChildCommands }
  ? NonNullable<ChildCommands> extends ReadonlyArray<infer ChildCommand>
    ? ChildCommand extends { effect: infer CommandEffect }
      ? CommandEffect
      : never
    : never
  : never

type InitOutMessage<Init> = Init extends { outMessage?: infer OutMessage }
  ? Exclude<OutMessage, undefined>
  : never

type InitFoldReturn<Fold> = Fold extends {
  foldOutMessage?: (...args: any) => (...args: any) => infer FoldReturn
}
  ? FoldReturn
  : never

type InitMappedMessage<Fold> = Fold extends {
  toParentMessage: (...args: any) => infer ParentMessage
}
  ? ParentMessage
  : never

type InitForwardedOutMessage<Fold> = Fold extends {
  toParentOutMessage?: (...args: any) => infer ParentOutMessage
}
  ? Exclude<ParentOutMessage, undefined>
  : never

type InitParentOutMessage<Fold> =
  | InitForwardedOutMessage<Fold>
  | InitOutMessage<InitFoldReturn<Fold>>

type InitMessages<Folds> =
  | InitMappedMessage<Folds[keyof Folds]>
  | Effect.Success<InitCommandEffects<InitFoldReturn<Folds[keyof Folds]>>>

type InitRequirements<ChildInits, Folds> =
  | Effect.Services<InitCommandEffects<ChildInits[keyof ChildInits]>>
  | Effect.Services<InitCommandEffects<InitFoldReturn<Folds[keyof Folds]>>>

type InitRegistrationEvidence<ChildInits, Folds> =
  | RegistrationEvidenceOf<ChildInits[keyof ChildInits]>
  | RegistrationEvidenceOf<InitFoldReturn<Folds[keyof Folds]>>

type InitOutMessages<Folds> = {
  readonly [Key in keyof Folds]?: InitParentOutMessage<Folds[Key]>
}

// NOTE: The method permits annotated contexts during inference. InitFoldValidation
// rechecks the captured handler against this entry's actual Message mapper.
type InitFold<ChildInit, ParentModel> = Readonly<{
  toParentMessage: (
    message: Effect.Success<InitCommandEffects<ChildInit>>,
  ) => unknown
  foldOutMessage?(
    outMessage: InitOutMessage<ChildInit>,
    context: FoldContext<
      Effect.Success<InitCommandEffects<ChildInit>>,
      unknown
    >,
  ): (
    model: ParentModel,
  ) => ReturnWithOutMessageValue<ParentModel, any, any, any>
  toParentOutMessage?: (outMessage: InitOutMessage<ChildInit>) => any
}>

type InitFoldValidation<ChildInit, ParentModel, Fold> = unknown extends Fold
  ? unknown
  : ([InitOutMessage<ChildInit>] extends [never]
      ? unknown
      : Fold extends
            | { foldOutMessage: (...args: any) => any }
            | { toParentOutMessage: (...args: any) => any }
        ? unknown
        : never) &
      (Fold extends { foldOutMessage?: infer OutMessageFold }
        ? NonNullable<OutMessageFold> extends (
            outMessage: InitOutMessage<ChildInit>,
            context: FoldContext<
              Effect.Success<InitCommandEffects<ChildInit>>,
              InitMappedMessage<Fold>
            >,
          ) => (
            model: ParentModel,
          ) => ReturnWithOutMessageValue<ParentModel, any, any, any>
          ? unknown
          : never
        : unknown)

type InitResolution<Folds> = unknown extends Folds[keyof Folds]
  ? unknown
  : [InitParentOutMessage<Folds[keyof Folds]>] extends [never]
    ? { resolveOutMessage?: never }
    : { resolveOutMessage: unknown }

/** Builds a complete parent Model from named child initialization results before
 *  handling any of their OutMessages. Call this function data-first.
 *
 *  `toParentModel` receives the record of child Models and runs exactly once.
 *  The `folds` record has the same keys as `childInits`. Each fold receives the
 *  Model produced by the preceding fold, so a change to another child is kept.
 *  Folds follow the record's own-key order: array-index keys first in numeric
 *  order, then other string keys in insertion order, then Symbols in insertion
 *  order.
 *  Prefer descriptive string keys to make that order visible at the call site.
 *
 *  For example, a Workspace Block contains Search and Editor Blocks:
 *
 *  ```ts
 *  const init = (): Update.Return<Model, Message> =>
 *    Update.foldChildInits(
 *      { search: Search.init(), editor: Editor.init() },
 *      {
 *        toParentModel: ({ search, editor }) => Model.make({ search, editor }),
 *        folds: {
 *          search: {
 *            toParentMessage: message => Message.GotSearchMessage({ message }),
 *          },
 *          editor: {
 *            toParentMessage: message => Message.GotEditorMessage({ message }),
 *          },
 *        },
 *      },
 *    )
 *  ```
 *
 *  Add `foldOutMessage` to handle a child's OutMessage against the completed
 *  parent Model. The Editor fold also sees changes made by the Search fold.
 *  For each child, mapped child Commands precede Commands from its OutMessage
 *  fold. All Commands for that child precede the next child's Commands. Array
 *  order does not guarantee execution or completion order. Each fold receives
 *  its own {@link FoldContext}; Message and service requirement unions include
 *  every child and OutMessage Step. When using the context, annotate both
 *  handler parameters, for example `(outMessage: Search.OutMessage,
 *  context: Update.FoldContext<Search.Message, Message>)`. An unannotated
 *  context has an `unknown` parent Message. The annotated context is checked
 *  against the same entry's `toParentMessage`.
 *
 *  Each entry supports the same local handling and forwarding as
 *  {@link foldChildInit}. A child that can emit an OutMessage requires
 *  `foldOutMessage` or `toParentOutMessage`. A derived parent OutMessage takes
 *  precedence over forwarding within that entry.
 *
 *  TypeScript can leave an inline generic `match` adapter unresolved. Name the
 *  adapter or pass its output type explicitly to keep the exact Message,
 *  OutMessage, and service types. If an entry remains unresolved, the return
 *  keeps the parent Model type and widens those other types to `unknown` rather
 *  than incorrectly reporting `never`.
 *
 *  If any entry can emit a parent OutMessage, supply `resolveOutMessage` to
 *  construct the single final OutMessage. It receives optional parent
 *  OutMessages under their child keys, followed by the final parent Model.
 *  For example, combine a restored query and a restored draft into one
 *  `RestoredWorkspace` OutMessage that preserves both results. Choosing one
 *  child's OutMessage discards the other and needs an application-specific
 *  reason. The resolver runs after all folds, only when at least one entry
 *  emitted an OutMessage. If the final Model alone contains everything needed,
 *  local folds followed by {@link withOutMessage} can report the parent result.
 *  Return `undefined` to emit nothing. Local-only folds return {@link Return};
 *  outward-capable folds return {@link ReturnWithOutMessage}. Absent child
 *  OutMessages skip their handlers, and absent final OutMessages omit the
 *  `outMessage` property.
 */
export const foldChildInits: <
  ChildInits extends Readonly<Record<PropertyKey, AnyUpdateReturn>>,
  ToParentModel extends (models: {
    readonly [Key in keyof ChildInits]: ChildInits[Key]['model']
  }) => any,
  Folds extends {
    readonly [Key in keyof ChildInits]: unknown
  },
  ParentOutMessage = never,
>(
  childInits: ChildInits,
  configuration: Readonly<{
    toParentModel: ToParentModel
    folds: Folds & {
      readonly [Key in keyof ChildInits]: InitFold<
        ChildInits[Key],
        ReturnType<ToParentModel>
      >
    } & Record<Exclude<keyof Folds, keyof ChildInits>, never> &
      NoInfer<{
        readonly [Key in keyof ChildInits]: InitFoldValidation<
          ChildInits[Key],
          ReturnType<ToParentModel>,
          Folds[Key]
        >
      }>
  }> & {
    resolveOutMessage?: (
      outMessages: InitOutMessages<Folds>,
      model: ReturnType<ToParentModel>,
    ) => ParentOutMessage | undefined
  } & NoInfer<InitResolution<Folds>>,
) => WithRegistrationEvidence<
  unknown extends Folds[keyof Folds]
    ? ReturnWithOutMessage<ReturnType<ToParentModel>, unknown, unknown, unknown>
    : [InitParentOutMessage<Folds[keyof Folds]>] extends [never]
      ? Return<
          ReturnType<ToParentModel>,
          InitMessages<Folds>,
          InitRequirements<ChildInits, Folds>
        >
      : ReturnWithOutMessage<
          ReturnType<ToParentModel>,
          InitMessages<Folds>,
          ParentOutMessage,
          InitRequirements<ChildInits, Folds>
        >,
  InitRegistrationEvidence<ChildInits, Folds>
> = (
  childInits: Readonly<Record<PropertyKey, AnyUpdateReturn>>,
  configuration: Readonly<{
    toParentModel: (models: any) => any
    folds: Readonly<
      Record<
        PropertyKey,
        Pick<
          AnyChildFold,
          'toParentMessage' | 'foldOutMessage' | 'toParentOutMessage'
        >
      >
    >
    resolveOutMessage?: (outMessages: any, model: any) => any
  }>,
): any => {
  const childKeys = Reflect.ownKeys(childInits)
  const foldKeys = Reflect.ownKeys(configuration.folds)

  if (
    childKeys.length !== foldKeys.length ||
    foldKeys.some(key => !Object.hasOwn(childInits, key))
  ) {
    throw new Error(
      'foldChildInits requires one fold for each child init and no extra folds',
    )
  }

  const models = Object.fromEntries(
    childKeys.map(key => {
      const childInit = childInits[key]

      if (childInit === undefined) {
        throw new Error('foldChildInits requires a result for each child init')
      }

      return [key, childInit.model]
    }),
  )
  const initialModel = configuration.toParentModel(models)
  const completed = foldKeys.reduce<
    Readonly<{
      model: any
      commands: Commands<any, any>
      outMessages: ReadonlyArray<readonly [PropertyKey, any]>
    }>
  >(
    (current, key) => {
      const childInit = childInits[key]
      const childFold = configuration.folds[key]

      if (childInit === undefined || childFold === undefined) {
        throw new Error(
          'foldChildInits requires a result and fold for each child',
        )
      }

      if (
        childInit.outMessage !== undefined &&
        childFold.foldOutMessage === undefined &&
        childFold.toParentOutMessage === undefined
      ) {
        throw new Error(
          'foldChildInits requires a handler for each child OutMessage',
        )
      }

      const childInitFold = finalizeChildFold(
        childInit,
        current.model,
        childFold,
        makeFoldContext(childFold.toParentMessage),
      )

      return {
        model: childInitFold.model,
        commands: [...current.commands, ...(childInitFold.commands ?? [])],
        outMessages:
          childInitFold.outMessage === undefined
            ? current.outMessages
            : [...current.outMessages, [key, childInitFold.outMessage]],
      }
    },
    {
      model: initialModel,
      commands: Array.empty(),
      outMessages: Array.empty(),
    },
  )
  const parentInit = { model: completed.model, commands: completed.commands }

  if (Array.isReadonlyArrayEmpty(completed.outMessages)) {
    return parentInit
  }

  if (configuration.resolveOutMessage === undefined) {
    throw new Error(
      'foldChildInits requires resolveOutMessage when a fold emits a parent OutMessage',
    )
  }

  const outMessage = configuration.resolveOutMessage(
    Object.fromEntries(completed.outMessages),
    completed.model,
  )

  return withOutMessage(parentInit, outMessage)
}
