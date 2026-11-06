import { Predicate, type Schema } from 'effect'

import type { AnyBinding, RequirementsOfBindings } from '../../block/binding.js'
import type { GeneratedEnvelopeOf } from '../../block/childEnvelope.js'
import type {
  AuthoredViewInputs,
  DefinedUpdate,
  OwnedAuthoredView,
  OwnedDocumentView,
} from '../../block/definition.js'
import type {
  AuthoredMessage,
  AuthoredMessageArguments,
  AuthoredMessageTag,
  AuthoredUpdateCases,
  CaseOutputChannels,
  CompositionRouteChannels,
  ContextualUpdateCases,
  ContextualUpdateCasesFactory,
  ContextualUpdateOutputs,
  OperationOutputs,
  RoutedOnlyUpdate,
  ValidateAnnotatedContext,
  ValidateCompositionDelivery,
  ValidatedContextualUpdateCases,
} from '../../block/delivery.js'
import { LocalMountsTypeId } from '../../block/identity.js'
import type { AnyBindingInitRecipe } from '../../block/initRecipe.js'
import type {
  CallableArguments,
  InitializationPlan,
  InitializationReturn,
  ValidateInit,
} from '../../block/initialization.js'
import type { Owner } from '../../block/owner.js'
import {
  type EmbeddedViewPlan,
  registerEmbeddedViewCompiler,
} from '../../block/viewScope.js'
import type { BlockView, Document, HtmlBuilder } from '../../html/index.js'
import type {
  InvalidViewInputsDiagnostic,
  ValidViewInputs,
} from '../../html/viewInputs.js'
import type * as Mount from '../../mount/index.js'
import type { VNode } from '../../vdom.js'
import { makeComposablePlanFactory } from './planComposer.js'
import type { MakeComposableUpdatePlan } from './updateComposition.js'

type AnyFunction = (...args: ReadonlyArray<any>) => any
type AnySchema = Schema.Codec<any, any, any, any>
type AnySelfContainedSchema = Schema.Codec<any, any, never, never>

/** The authored kind of a passive hybrid plan. */
export type PlanKind = 'Init' | 'Update' | 'InMessageUpdate' | 'View'

declare const PlanTypeId: unique symbol

/** A passive authoring value compiled for one constructed graph. */
export interface Plan<
  Output,
  Kind extends PlanKind = PlanKind,
  Composition = unknown,
> {
  readonly [PlanTypeId]: readonly [
    kind: Kind,
    output: () => Output,
    composition: () => Composition,
  ]
}

/** A view plan callable inside another view of the same acquired Composition. */
export type ViewPlan<View, Composition = unknown> = Plan<
  View,
  'View',
  Composition
> &
  View &
  EmbeddedViewPlan<
    Composition extends Readonly<{ owner: infer OwnerValue }>
      ? OwnerValue
      : never
  >

/** Recovers the executable function described by a passive plan. */
export type PlanOutput<Value> =
  Value extends Plan<infer Output, PlanKind, unknown> ? Output : never

/** Recovers the exact static core Composition retained by a passive plan. */
export type CompositionOfPlan<Value> =
  Value extends Plan<unknown, PlanKind, infer Composition> ? Composition : never

/** @internal Reads a constrained plan's exact source without repeating inference. */
export type PlanSource<Value extends Plan<unknown, PlanKind, unknown>> =
  ReturnType<Value[typeof PlanTypeId][2]>

/** The runtime helper surface consumed when compiling a passive plan. */
export type RuntimeComposition = Readonly<{
  makeInit: AnyFunction
  makeUpdate: AnyFunction & Readonly<{ withContext?: AnyFunction }>
  makeView: AnyFunction & Readonly<{ withInputs: AnyFunction }>
}>

type StoredPlan = Readonly<{
  composition: object
  kind: PlanKind
  compile: (actualComposition: RuntimeComposition) => unknown
}>

const plans = new WeakMap<object, StoredPlan>()
const authoringSources = new WeakMap<object, AuthoringSource>()

/** @internal Recovers the original static graph of a portable Composition facade. */
export const authoringSourceOf = (composition: object): AuthoringSource => {
  const source = authoringSources.get(composition)

  if (source === undefined) {
    throw new Error('[foldkit] Expected an original authoring Composition.')
  }

  return source
}

/** @internal Retains one complete authoring expression without evaluating it. */
export const makePlan = <
  Output,
  Kind extends PlanKind,
  const Composition extends object,
>(
  composition: Composition,
  kind: Kind,
  compile: StoredPlan['compile'],
): Plan<Output, Kind, Composition> => {
  const plan = Object.freeze({})
  plans.set(plan, { composition, kind, compile })

  // oxlint-disable-next-line typescript/consistent-type-assertions
  return plan as Plan<Output, Kind, Composition>
}

const viewPlanGraphs = new WeakMap<
  object,
  Readonly<{ source: object; actual: RuntimeComposition }>
>()

/** @internal Retains a completed private graph for alternate authored views. */
export const registerViewPlanGraph = (
  block: object,
  source: object,
  actual: RuntimeComposition,
): void => {
  viewPlanGraphs.set(block, { source, actual })
}

/** @internal Preserves private view compilation when checked handler selection derives a Block. */
export const copyViewPlanGraph = (source: object, target: object): void => {
  const graph = viewPlanGraphs.get(source)

  if (graph !== undefined) {
    viewPlanGraphs.set(target, graph)
  }
}

const viewBuilders = new WeakMap<
  object,
  Readonly<{ composition: object; actual: RuntimeComposition }>
>()

const makeViewPlan = (
  composition: object,
  view: unknown,
  isWithInputs: boolean,
): ViewPlan<AnyFunction, object> => {
  if (!Predicate.isFunction(view)) {
    throw new Error('[foldkit] A view plan requires a view function.')
  }

  const compiled = new WeakMap<object, AnyFunction>()
  const compile = (actual: RuntimeComposition): AnyFunction => {
    const invoke = (...args: ReadonlyArray<unknown>) => {
      const [_model, inputsOrBuilder, inputsBuilder] = args
      const builder = isWithInputs ? inputsBuilder : inputsOrBuilder

      if (Predicate.isObject(builder)) {
        viewBuilders.set(builder, { composition, actual })
      }

      return Reflect.apply(view, undefined, args)
    }

    return isWithInputs
      ? actual.makeView.withInputs(invoke)
      : actual.makeView(invoke)
  }
  const plan = Object.freeze((...args: ReadonlyArray<unknown>) => {
    const [_model, inputsOrBuilder, inputsBuilder] = args
    const builder = isWithInputs ? inputsBuilder : inputsOrBuilder
    const context = Predicate.isObject(builder)
      ? viewBuilders.get(builder)
      : undefined

    if (context === undefined) {
      throw new Error(
        '[foldkit] A view plan can only be called inside its acquired Composition view.',
      )
    }

    if (context.composition !== composition) {
      throw new Error(
        '[foldkit] A view plan belongs to another static Composition.',
      )
    }

    const selected = compiled.get(context.actual) ?? compile(context.actual)
    compiled.set(context.actual, selected)

    return Reflect.apply(selected, undefined, args)
  })
  plans.set(plan, { composition, kind: 'View', compile })
  registerEmbeddedViewCompiler(plan, block => {
    const graph = viewPlanGraphs.get(block)

    if (graph === undefined) {
      throw new Error(
        '[foldkit] A view plan requires its selected constructed Block.',
      )
    }

    if (graph.source !== composition) {
      throw new Error(
        '[foldkit] A hybrid plan belongs to another static Composition.',
      )
    }

    return compile(graph.actual)
  })

  // oxlint-disable-next-line typescript/consistent-type-assertions
  return plan as ViewPlan<AnyFunction, object>
}

const storedPlan = (plan: object): StoredPlan => {
  const stored = plans.get(plan)
  if (stored === undefined) {
    throw new Error('[foldkit] Expected a hybrid authoring plan.')
  }

  return stored
}

/** Returns the exact static Composition that supplied a plan's typing. */
export const planComposition = <Composition>(
  plan: Plan<unknown, PlanKind, Composition>,
): Composition => {
  // oxlint-disable-next-line typescript/consistent-type-assertions
  return storedPlan(plan).composition as Composition
}

/** Returns an authoring plan's runtime kind without executing its producer. */
export const planKind = (plan: Plan<unknown>): PlanKind => storedPlan(plan).kind

/** Compiles one passive plan against the constructor's connected Composition. */
export const compilePlan = <Output>(
  plan: Plan<Output>,
  actualComposition: RuntimeComposition,
  staticComposition: unknown = planComposition(plan),
): Output => {
  const stored = storedPlan(plan)
  if (stored.composition !== staticComposition) {
    throw new Error(
      '[foldkit] A hybrid plan belongs to another static Composition.',
    )
  }

  // oxlint-disable-next-line typescript/consistent-type-assertions
  return stored.compile(actualComposition) as Output
}

/** Composition-owned initialization with ordinary inference and validation. */
export interface MakeInitPlan<
  Model,
  Message,
  ChildBindings extends ReadonlyArray<AnyBinding>,
  DispatchMessage = Message,
  SourceComposition = unknown,
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
  ): Plan<
    NoInfer<
      (
        ...args: CallableArguments<Init>
      ) => InitializationReturn<
        Model,
        DispatchMessage,
        ChildBindings,
        ReturnType<Init>
      >
    >,
    'Init',
    SourceComposition
  >
}

type LocalUpdateChannels = readonly [
  tag: PropertyKey,
  outMessage: unknown,
  requirements: unknown,
  registration: unknown,
]

type RoutingUpdateChannels = readonly [
  outMessage: unknown,
  requirements: unknown,
  registration: unknown,
]

/** @internal Names a complete validated update plan through its exact result channels. */
export interface CanonicalUpdatePlan<
  Model,
  Message,
  Context extends ReadonlyArray<unknown>,
  LocalRows extends LocalUpdateChannels,
  Routing extends RoutingUpdateChannels,
  SourceComposition,
> extends Plan<
  DefinedUpdate<
    Model,
    Message,
    Context,
    LocalRows[1] | Routing[0],
    LocalRows[2] | Routing[1],
    LocalRows[3] | Routing[2]
  > &
    OperationOutputs<LocalRows>,
  'Update',
  SourceComposition
> {}

type SourceOutMessage<Source extends AuthoringSource> =
  Source extends Readonly<{ OutMessage: infer Out extends AnySchema }>
    ? Out['Type']
    : never

/** @internal Derives dispatch and child-routing channels from one validated authoring Source. */
export interface AuthoredUpdatePlan<
  Source extends AuthoringSource,
  Context extends ReadonlyArray<unknown>,
  LocalRows extends LocalUpdateChannels,
> extends CanonicalUpdatePlan<
  Source['Model']['Type'],
  Source['Message']['Type'],
  Context,
  LocalRows,
  CompositionRouteChannels<Source['bindings']>,
  Source
> {}

type ValidMakeUpdatePlan<
  Source extends AuthoringSource,
  ContextConstraint extends ReadonlyArray<unknown>,
> = [AuthoredMessage<LocalMessage<Source>, Source['bindings']>] extends [never]
  ? (
      cases: Readonly<Record<string, never>>,
    ) => Plan<
      RoutedOnlyUpdate<
        Source['Model']['Type'],
        Source['Message']['Type'],
        Source['bindings'],
        false
      >,
      'Update',
      Source
    >
  : {
      <
        const Outputs extends Readonly<
          Record<
            AuthoredMessageTag<
              AuthoredMessage<LocalMessage<Source>, Source['bindings']>
            >,
            unknown
          >
        >,
      >(
        cases: AuthoredUpdateCases<
          Source['Model']['Type'],
          LocalMessage<Source>,
          Source['bindings'],
          Outputs,
          Source['Message']['Type'],
          SourceOutMessage<Source>
        > &
          Readonly<
            Record<
              Exclude<
                keyof Outputs,
                AuthoredMessageTag<
                  AuthoredMessage<LocalMessage<Source>, Source['bindings']>
                >
              >,
              never
            >
          >,
        ...invalidMessageContract: AuthoredMessageArguments<
          AuthoredMessage<LocalMessage<Source>, Source['bindings']>
        >
      ): AuthoredUpdatePlan<
        Source,
        readonly [],
        CaseOutputChannels<Source['bindings'], Outputs>
      >
      readonly withContext: <
        const Context extends ContextConstraint,
        const Cases,
      >(
        createCases: ContextualUpdateCasesFactory<
          Context,
          Cases &
            ContextualUpdateCases<
              Source['Model']['Type'],
              LocalMessage<Source>,
              Source['bindings'],
              Source['Message']['Type'],
              SourceOutMessage<Source>
            > &
            ValidatedContextualUpdateCases<
              Source['Model']['Type'],
              LocalMessage<Source>,
              Source['bindings'],
              ContextualUpdateOutputs<
                Source['Model']['Type'],
                LocalMessage<Source>,
                Source['bindings'],
                NoInfer<Cases>
              >,
              Source['Message']['Type'],
              SourceOutMessage<Source>
            > &
            Readonly<
              Record<
                Exclude<
                  keyof NoInfer<Cases>,
                  AuthoredMessageTag<
                    AuthoredMessage<LocalMessage<Source>, Source['bindings']>
                  >
                >,
                never
              >
            >
        > &
          ValidateAnnotatedContext<NoInfer<Context>>,
        ...invalidMessageContract: AuthoredMessageArguments<
          AuthoredMessage<LocalMessage<Source>, Source['bindings']>
        >
      ) => AuthoredUpdatePlan<
        Source,
        Context,
        CaseOutputChannels<
          Source['bindings'],
          ContextualUpdateOutputs<
            Source['Model']['Type'],
            LocalMessage<Source>,
            Source['bindings'],
            Cases
          >
        >
      >
    }

/** Composition-owned exhaustive Message handlers retained as a passive plan. */
export type MakeUpdatePlan<
  Source extends AuthoringSource,
  ContextConstraint extends ReadonlyArray<unknown> = ReadonlyArray<unknown>,
> =
  unknown extends ValidateCompositionDelivery<
    LocalMessage<Source>,
    Source['bindings']
  >
    ? ValidMakeUpdatePlan<Source, ContextConstraint>
    : ValidateCompositionDelivery<LocalMessage<Source>, Source['bindings']>

type IsAny<Value> = 0 extends 1 & Value ? true : false

/** @internal Preserves native input validation with a selected contextual builder. */
export type ViewWithInputs<
  Model,
  Message,
  ViewInputs,
  Requirements,
  Builder = HtmlBuilder<Message, Requirements>,
> =
  IsAny<ViewInputs> extends true
    ? never
    : [ViewInputs] extends [never]
      ? never
      : [ViewInputs] extends [void]
        ? never
        : [ViewInputs] extends [ValidViewInputs<ViewInputs>]
          ? (
              model: Model,
              inputs: NoInfer<ViewInputs>,
              h: Builder,
            ) => VNode | null
          : ((
              model: Model,
              inputs: NoInfer<ViewInputs>,
              h: Builder,
            ) => VNode | null) &
              InvalidViewInputsDiagnostic<ViewInputs>

/** Composition-owned view authoring preserving its contextual builder. */
export interface MakeViewPlan<
  OwnerValue,
  Model,
  Message,
  Requirements,
  SourceComposition = unknown,
> {
  (
    view: (model: Model, h: HtmlBuilder<Message, Requirements>) => Document,
  ): ViewPlan<
    OwnedDocumentView<OwnerValue, Model, Message, Requirements>,
    SourceComposition
  >
  (
    view: (model: Model, h: HtmlBuilder<Message, Requirements>) => VNode | null,
  ): ViewPlan<
    OwnedAuthoredView<
      BlockView<Model, Message, void, Requirements>,
      OwnerValue,
      Model,
      Message,
      Requirements
    >,
    SourceComposition
  >
  readonly withInputs: <ViewInputs = never>(
    view: ViewWithInputs<Model, Message, ViewInputs, Requirements>,
  ) => ViewPlan<
    OwnedAuthoredView<
      BlockView<Model, Message, AuthoredViewInputs<ViewInputs>, Requirements>,
      OwnerValue,
      Model,
      Message,
      Requirements
    >,
    SourceComposition
  >
}

/** The static core Composition metadata used by hybrid authoring. */
export type AuthoringSource = Readonly<{
  owner: Owner<string>
  Model: AnySelfContainedSchema
  Message: AnySelfContainedSchema
  bindings: ReadonlyArray<AnyBinding>
  [LocalMountsTypeId]: ReadonlyArray<Mount.LayeredMountDefinition>
  prepareBlock?: unknown
}>

type LocalMessage<Source extends AuthoringSource> = Exclude<
  Source['Message']['Type'],
  GeneratedEnvelopeOf<Source['bindings'][number]>['Type']
>
type ViewRequirements<Source extends AuthoringSource> =
  | Mount.RequirementsOf<Source[typeof LocalMountsTypeId]>
  | RequirementsOfBindings<Source['bindings']>

/** A static Composition whose complete builders produce passive plans. */
export type AuthoringComposition<Source extends AuthoringSource> = Omit<
  Source,
  'makeInit' | 'makeUpdate' | 'makeView' | 'prepareBlock'
> &
  Readonly<{
    makeInit: MakeInitPlan<
      Source['Model']['Type'],
      LocalMessage<Source>,
      Source['bindings'],
      Source['Message']['Type'],
      Source
    >
    makeUpdate: MakeComposableUpdatePlan<Source>
    makeView: MakeViewPlan<
      Source['owner'],
      Source['Model']['Type'],
      Source['Message']['Type'],
      ViewRequirements<Source>,
      Source
    >
  }>

/** Maps a core Composition to the same statically typed passive builder surface. */
export type AuthoringCompositionOf<Source extends AuthoringSource> =
  AuthoringComposition<Source>

/** Retains static Composition inference while deferring executable graph capture. */
export const makeAuthoringComposition = <const Source extends AuthoringSource>(
  composition: Source,
): AuthoringComposition<Source> => {
  const makeInit = (...args: ReadonlyArray<unknown>) =>
    makePlan(composition, 'Init', actual => actual.makeInit(...args))
  const makeUpdate = makeComposablePlanFactory(
    composition,
    'Update',
    'makeUpdate',
  )
  const makeView = Object.assign(
    (view: unknown) => makeViewPlan(composition, view, false),
    {
      withInputs: (view: unknown) => makeViewPlan(composition, view, true),
    },
  )
  const { prepareBlock: _prepareBlock, ...authoring } = composition

  const result = {
    ...authoring,
    makeInit,
    makeUpdate,
    makeView,
  }
  authoringSources.set(result, composition)

  // oxlint-disable-next-line typescript/consistent-type-assertions
  return result as unknown as AuthoringComposition<Source>
}
