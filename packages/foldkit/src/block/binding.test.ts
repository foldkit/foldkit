import { Context, Effect, Layer, Option, Schema } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Command from '../command/index.js'
import type { BoundBlockConfig, BoundBlockView } from '../html/block.js'
import * as ManagedResource from '../managedResource/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Subscription from '../subscription/subscription.js'
import * as Update from '../update/index.js'
import type { BindingRequirement } from './binding.js'
import { aggregateChildren, bind, inspectBinding } from './binding.js'
import { define } from './define.js'
import { LocalMountsTypeId } from './definition.js'
import type { Owner } from './owner.js'
import type { Qualify, Scoped } from './scope.js'

const ChildOwner = define('BindingChild')

const ChildModel = Schema.Struct({ count: Schema.Number })
type ChildModel = typeof ChildModel.Type

const ChildMessage = defineMessageUnion({
  ChangedCount: { amount: Schema.Number },
  ReportedCount: {},
  CompletedSave: {},
  ObservedTick: {},
  AcquiredSession: { value: Schema.String },
  ReleasedSession: {},
  FailedAcquireSession: {},
  CompletedMeasure: {},
})
type ChildMessage = typeof ChildMessage.Type

const ChildOutMessage = defineMessageUnion({
  Reported: { value: Schema.Number },
})
type ChildOutMessage = typeof ChildOutMessage.Type

const Save = ChildOwner.command('Save', {
  messages: [ChildMessage.CompletedSave],
})

const ChildChannels = ChildOwner.define({
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
})

const childSubscriptions = ChildChannels.subscriptions(entry => ({
  ticks: entry(
    'ObserveTicks',
    { count: Schema.Number },
    {
      messages: [ChildMessage.ObservedTick],
      modelToDependencies: model => ({ count: model.count }),
    },
  ),
}))

const Session = ChildOwner.resource<string>()('Session')

const childManagedResources = ChildChannels.managedResources(entry => ({
  session: entry('ManageSession', Schema.Option(Schema.String), {
    resource: Session,
    modelToMaybeRequirements: model =>
      model.count === 0 ? Option.none() : Option.some(`${model.count}`),
    onAcquired: value => ChildMessage.AcquiredSession({ value }),
    onReleased: ChildMessage.ReleasedSession,
    onAcquireError: () => ChildMessage.FailedAcquireSession(),
  }),
}))

const Measure = ChildOwner.mount('Measure', {
  messages: [ChildMessage.CompletedMeasure],
})

const childBase = ChildOwner.define({
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
})
const ChildComposition = childBase.makeComposition({ mounts: [Measure] })

const childView = ChildComposition.makeView((model, h) =>
  h.div([], [`Count ${model.count}`]),
)

const detailedChildView = ChildComposition.makeView.withInputs<
  Readonly<{ prefix: string }>
>((model, viewInputs, h) => h.div([], [`${viewInputs.prefix} ${model.count}`]))

const childUpdate = ChildComposition.makeUpdate(
  (model, message, context: Readonly<{ roomId: string }>) =>
    ChildMessage.match(message, {
      ChangedCount: ({ amount }) => ({
        model: modifyFields(model, {
          count: () => model.count + amount + context.roomId.length,
        }),
      }),
      ReportedCount: () => ({
        model,
        outMessage: ChildOutMessage.Reported({ value: model.count }),
      }),
      CompletedSave: () => ({ model }),
      ObservedTick: () => ({ model }),
      AcquiredSession: () => ({ model }),
      ReleasedSession: () => ({ model }),
      FailedAcquireSession: () => ({ model }),
      CompletedMeasure: () => ({ model }),
    }),
)

const save = childBase.step(model => ({
  model,
  commands: [Save()],
}))

const reset = childBase.step(model => ({
  model: modifyFields(model, { count: () => 0 }),
}))

const addForRoom = childBase.step(
  (model, amount: number, context: Readonly<{ roomId: string }>) => ({
    model: modifyFields(model, {
      count: () => model.count + amount + context.roomId.length,
    }),
  }),
)

const report = childBase.step(model => ({
  model,
  outMessage: ChildOutMessage.Reported({ value: model.count }),
}))

const Child = ChildComposition.makeBlock({
  view: childView,
  init: (count: number) => ({ model: ChildModel.make({ count }) }),
  update: childUpdate,
  expose: { save, reset, addForRoom, report },
  subscriptions: childSubscriptions,
  managedResources: childManagedResources,
  EffectsLayer: Layer.empty,
  hostHandlers: [
    Save,
    childSubscriptions.ticks,
    childManagedResources.session,
    Measure,
  ],
})

const ParentModel = Schema.Struct({
  maybeChild: Schema.Option(ChildModel),
  reports: Schema.Array(Schema.Number),
  isListening: Schema.Boolean,
})
type ParentModel = typeof ParentModel.Type

const ParentMessage = defineMessageUnion({
  GotChildMessage: { message: ChildMessage },
  RecordedReport: {},
})
type ParentMessage = typeof ParentMessage.Type

const ParentOutMessage = defineMessageUnion({
  ForwardedReport: { value: Schema.Number },
  DerivedReport: { value: Schema.Number },
})
type ParentOutMessage = typeof ParentOutMessage.Type

const Parent = define('BindingParent', {
  Model: ParentModel,
  Message: ParentMessage,
  OutMessage: ParentOutMessage,
})

const toParentMessage = (message: ChildMessage): ParentMessage =>
  ParentMessage.GotChildMessage({ message })

const foldChildOutMessage = ChildOutMessage.match<
  Update.StepWithOutMessage<ParentModel, ParentMessage, ParentOutMessage>
>({
  Reported:
    ({ value }) =>
    model => ({
      model: modifyFields(model, {
        reports: reports => [...reports, value],
      }),
      outMessage: ParentOutMessage.DerivedReport({ value }),
    }),
})

const forwardChildOutMessage = ChildOutMessage.match<
  ParentOutMessage | undefined
>({
  Reported: ({ value }) => ParentOutMessage.ForwardedReport({ value }),
})

const writeChild = (
  model: ParentModel,
  nextChildModel: ChildModel,
): ParentModel =>
  modifyFields(model, { maybeChild: () => Option.some(nextChildModel) })

const HomeBinding = Parent.bindChild(Child, {
  fromParentMessage: false,
  placement: 'home',
  read: (model: ParentModel) => model.maybeChild,
  write: writeChild,
  toParentMessage,
  outMessage: {
    fold: foldChildOutMessage,
    forward: forwardChildOutMessage,
  },
  subscriptions: {
    when: {
      ticks: (model: ParentModel) => model.isListening,
    },
  },
})
const homeInspection = inspectBinding(HomeBinding)

const foldChildOutMessageWithCommand = (
  outMessage: ChildOutMessage,
  { liftCommand }: Update.FoldContext<ChildMessage, ParentMessage>,
) =>
  ChildOutMessage.match<
    Update.StepWithOutMessage<
      ParentModel,
      ParentMessage,
      ParentOutMessage,
      Command.HandlerOf<typeof Save>
    >,
    ChildOutMessage
  >(outMessage, {
    Reported:
      ({ value }) =>
      model => ({
        model,
        commands: [liftCommand(Save())],
        outMessage: ParentOutMessage.DerivedReport({ value }),
      }),
  })

const CommandHomeBinding = Parent.bindChild(Child, {
  fromParentMessage: false,
  placement: 'command-home',
  read: (model: ParentModel) => model.maybeChild,
  write: writeChild,
  toParentMessage,
  outMessage: { fold: foldChildOutMessageWithCommand },
})

const PolicyMessage = defineMessageUnion({ CompletedPolicyWork: {} })
type PolicyMessage = typeof PolicyMessage.Type

const ParentPolicyOwner = define('BindingParentPolicy')
const RunPolicyWork = ParentPolicyOwner.command('RunPolicyWork', {
  messages: [PolicyMessage.CompletedPolicyWork],
})
const ParentPolicy = ParentPolicyOwner.define({
  Model: ParentModel,
  Message: PolicyMessage,
  OutMessage: ParentOutMessage,
})

const foldChildOutMessageWithParentCommand = ChildOutMessage.match<
  Update.StepWithOutMessage<
    ParentModel,
    PolicyMessage,
    ParentOutMessage,
    Command.HandlerOf<typeof RunPolicyWork>
  >
>({
  Reported:
    ({ value }) =>
    model => ({
      model,
      commands: [RunPolicyWork()],
      outMessage: ParentOutMessage.DerivedReport({ value }),
    }),
})

const ParentCommandHomeBinding = ParentPolicy.bindChild(Child, {
  fromParentMessage: false,
  placement: 'parent-command-home',
  read: (model: ParentModel) => model.maybeChild,
  write: writeChild,
  toParentMessage: () => PolicyMessage.CompletedPolicyWork(),
  outMessage: { fold: foldChildOutMessageWithParentCommand },
})

const ForwardOnlyHomeBinding = Parent.bindChild(Child, {
  fromParentMessage: false,
  placement: 'forward-only-home',
  read: (model: ParentModel) => model.maybeChild,
  write: writeChild,
  toParentMessage,
  outMessage: { forward: forwardChildOutMessage },
})

const bindWithoutOutMessagePolicy = () =>
  Parent.bindChild(Child, {
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    placement: 'missing-policy',
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    read: (model: ParentModel) => model.maybeChild,
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    write: writeChild,
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    toParentMessage,
  })
void bindWithoutOutMessagePolicy

const bindWithUnknownForward = () =>
  Parent.bindChild(Child, {
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    placement: 'unknown-forward',
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    read: (model: ParentModel) => model.maybeChild,
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    write: writeChild,
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    toParentMessage,
    // eslint-disable-next-line foldkit/no-empty-to-parent-out-message
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    outMessage: { forward: (): unknown => undefined },
  })
void bindWithUnknownForward

const LocallyHandledWithoutForwardingBinding = Parent.bindChild(Child, {
  fromParentMessage: false,
  placement: 'locally-handled',
  read: (model: ParentModel) => model.maybeChild,
  write: writeChild,
  toParentMessage,
  outMessage: { fold: foldChildOutMessage },
})
void LocallyHandledWithoutForwardingBinding

const initialParent: ParentModel = {
  maybeChild: Option.some(ChildModel.make({ count: 2 })),
  reports: [],
  isListening: true,
}

const ParentComposition = Parent.makeComposition({
  childBindings: [HomeBinding, CommandHomeBinding, ForwardOnlyHomeBinding],
})
const foldHome = ParentComposition.makeUpdate(
  (model, message, context: Readonly<{ roomId: string }>) => {
    if (message._tag === 'GotChildMessage') {
      return HomeBinding.fold(model, message.message, context)
    } else {
      return { model }
    }
  },
)
const foldCommandHome = ParentComposition.makeUpdate(
  (model, message, context: Readonly<{ roomId: string }>) => {
    if (message._tag === 'GotChildMessage') {
      return CommandHomeBinding.fold(model, message.message, context)
    } else {
      return { model }
    }
  },
)
const foldForwardOnlyHome = ParentComposition.makeUpdate(
  (model, message, context: Readonly<{ roomId: string }>) => {
    if (message._tag === 'GotChildMessage') {
      return ForwardOnlyHomeBinding.fold(model, message.message, context)
    } else {
      return { model }
    }
  },
)
const resetHome = Parent.step(_model => HomeBinding.reset())
const addHomeForRoom = Parent.step(
  (_model, amount: number, context: Readonly<{ roomId: string }>) =>
    HomeBinding.addForRoom(amount, context),
)
const reportHome = Parent.step(_model => HomeBinding.report())
const ParentRuntime = ParentComposition.makeBlock({
  init: () => ({ model: initialParent }),
  update: ParentComposition.makeUpdate(model => ({ model })),
  expose: {
    resetHome,
    addHomeForRoom,
    reportHome,
  },
  EffectsLayer: Layer.empty,
})

const ParentPolicyComposition = ParentPolicy.makeComposition({
  childBindings: [ParentCommandHomeBinding],
})
const resetParentCommandHome = ParentPolicy.step(_model =>
  ParentCommandHomeBinding.reset(),
)
const reportParentCommandHome = ParentPolicy.step(_model =>
  ParentCommandHomeBinding.report(),
)
const ParentPolicyRuntime = ParentPolicyComposition.makeBlock({
  init: () => ({ model: initialParent }),
  update: ParentPolicyComposition.makeUpdate(model => ({ model })),
  expose: { resetParentCommandHome, reportParentCommandHome },
  EffectsLayer: Layer.empty,
  hostHandlers: [RunPolicyWork],
})

const callFoldDataLast = () =>
  // @ts-expect-error fold executes immediately and requires the parent Model
  HomeBinding.fold(ChildMessage.ChangedCount({ amount: 3 }), { roomId: 'room' })
void callFoldDataLast

const ArityModel = Schema.Struct({ count: Schema.Number })
type ArityModel = typeof ArityModel.Type

const ArityMessage = defineMessageUnion({ IncreasedCount: {} })
type ArityMessage = typeof ArityMessage.Type

const ArityParent = Schema.Struct({ child: ArityModel })
type ArityParent = typeof ArityParent.Type

const initialArityParent: ArityParent = {
  child: ArityModel.make({ count: 0 }),
}

const readArityChild = (model: ArityParent) => Option.some(model.child)
const writeArityChild = (
  model: ArityParent,
  child: ArityModel,
): ArityParent => ({ ...model, child })
const toArityParentMessage = (message: ArityMessage): ArityMessage => message

const WrappedArityOwner = define('BindingWrappedArity')
const WrappedArity = WrappedArityOwner.define({
  Model: ArityModel,
  Message: ArityMessage,
})
const WrappedArityComposition = WrappedArity.makeComposition()
const wrappedArityUpdate = WrappedArityComposition.makeUpdate(
  (
    ...[model, _message, context]: [
      model: ArityModel,
      message: ArityMessage,
      context: Readonly<{ amount: number }>,
    ]
  ) => ({
    model: modifyFields(model, {
      count: count => count + context.amount,
    }),
  }),
)
const defaultIncrement = WrappedArity.step(
  (model: ArityModel, amount: number = 1) => ({
    model: modifyFields(model, { count: count => count + amount }),
  }),
)
const addMany = WrappedArity.step(
  (model: ArityModel, ...amounts: ReadonlyArray<number>) => ({
    model: modifyFields(model, {
      count: count =>
        count + amounts.reduce((total, amount) => total + amount, 0),
    }),
  }),
)
const resetArity = WrappedArity.step((model: ArityModel) => ({
  model: modifyFields(model, { count: () => 0 }),
}))
const WrappedArityBlock = WrappedArityComposition.makeBlock({
  init: () => ({ model: ArityModel.make({ count: 0 }) }),
  update: wrappedArityUpdate,
  expose: { defaultIncrement, addMany, resetArity },
  EffectsLayer: Layer.empty,
})
const WrappedArityParent = define('BindingWrappedArityParent', {
  Model: ArityParent,
  Message: ArityMessage,
})
const WrappedArityBinding = WrappedArityParent.bindChild(WrappedArityBlock, {
  fromParentMessage: false,
  placement: 'wrapped-arity',
  read: readArityChild,
  write: writeArityChild,
  toParentMessage: toArityParentMessage,
})

const embedViewlessBlockWithoutView = () =>
  // @ts-expect-error a viewless block requires an explicit view
  WrappedArityBinding.embedView({
    slotId: 'viewless-arity',
    model: initialArityParent.child,
  })
void embedViewlessBlockWithoutView

const makeArityBlock = <
  const OwnerValue extends Owner<any>,
  const UpdateFunction extends (...args: ReadonlyArray<any>) => any,
>(
  ownerValue: OwnerValue,
  update: UpdateFunction,
) => ({
  owner: ownerValue,
  Model: ArityModel,
  Message: ArityMessage,
  mounts: [],
  [LocalMountsTypeId]: [],
  childBindings: [],
  init: (): Update.Return<ArityModel, ArityMessage> => ({
    model: ArityModel.make({ count: 0 }),
  }),
  update,
  expose: {},
  subscriptions: {},
  managedResources: {},
  EffectsLayer: Layer.empty,
  hostHandlers: [],
})

const IgnoredMessageOwner = define('BindingIgnoredMessage')
const IgnoredMessage = makeArityBlock(
  IgnoredMessageOwner.define({ Model: ArityModel, Message: ArityMessage })
    .owner,
  (model: ArityModel): Update.Return<ArityModel, ArityMessage> => ({
    model: modifyFields(model, { count: count => count + 1 }),
  }),
)
const IgnoredMessageBinding = bind(IgnoredMessage, {
  placement: 'ignored-message',
  read: readArityChild,
  write: writeArityChild,
  toParentMessage: toArityParentMessage,
})

const DefaultContextOwner = define('BindingDefaultContext')
const DefaultContext = makeArityBlock(
  DefaultContextOwner.define({ Model: ArityModel, Message: ArityMessage })
    .owner,
  (
    model: ArityModel,
    _message: ArityMessage,
    context: Readonly<{ amount: number }> = { amount: 2 },
  ): Update.Return<ArityModel, ArityMessage> => ({
    model: modifyFields(model, {
      count: count => count + context.amount,
    }),
  }),
)
const DefaultContextBinding = bind(DefaultContext, {
  placement: 'default-context',
  read: readArityChild,
  write: writeArityChild,
  toParentMessage: toArityParentMessage,
})

const OptionalContextOwner = define('BindingOptionalContext')
const OptionalContext = makeArityBlock(
  OptionalContextOwner.define({ Model: ArityModel, Message: ArityMessage })
    .owner,
  (
    model: ArityModel,
    _message: ArityMessage,
    context?: Readonly<{ amount: number }>,
  ): Update.Return<ArityModel, ArityMessage> => ({
    model: modifyFields(model, {
      count: count => count + (context?.amount ?? 1),
    }),
  }),
)
const OptionalContextBinding = bind(OptionalContext, {
  placement: 'optional-context',
  read: readArityChild,
  write: writeArityChild,
  toParentMessage: toArityParentMessage,
})

const WrappedArityParentComposition = WrappedArityParent.makeComposition({
  childBindings: [WrappedArityBinding],
})
const foldWrappedArity = WrappedArityParentComposition.makeUpdate(
  (model, message, context: Readonly<{ amount: number }>) =>
    WrappedArityBinding.fold(model, message, context),
)
const runDefaultIncrement = WrappedArityParent.step(
  (_model, amount?: number) => {
    if (amount === undefined) {
      return WrappedArityBinding.defaultIncrement()
    } else {
      return WrappedArityBinding.defaultIncrement(amount)
    }
  },
)
const runAddMany = WrappedArityParent.step(
  (_model, ...amounts: ReadonlyArray<number>) =>
    WrappedArityBinding.addMany(...amounts),
)
const runResetArity = WrappedArityParent.step(_model =>
  WrappedArityBinding.resetArity(),
)
const WrappedArityRuntime = WrappedArityParentComposition.makeBlock({
  init: () => ({ model: initialArityParent }),
  update: WrappedArityParentComposition.makeUpdate(model => ({ model })),
  expose: {
    runDefaultIncrement,
    runAddMany,
    runResetArity,
  },
  EffectsLayer: Layer.empty,
})

const IgnoredMessageComposition = WrappedArityParent.makeComposition({
  childBindings: [IgnoredMessageBinding],
})
const foldIgnoredMessage = IgnoredMessageComposition.makeUpdate(
  (model, message) => IgnoredMessageBinding.fold(model, message),
)

const DefaultContextComposition = WrappedArityParent.makeComposition({
  childBindings: [DefaultContextBinding],
})
const foldDefaultContext = DefaultContextComposition.makeUpdate(
  (model, message) => DefaultContextBinding.fold(model, message),
)

const OptionalContextComposition = WrappedArityParent.makeComposition({
  childBindings: [OptionalContextBinding],
})
const foldOptionalContext = OptionalContextComposition.makeUpdate(
  (model, message) => OptionalContextBinding.fold(model, message),
)

describe('Block binding', () => {
  it('preserves contextual update arguments without a deferred update member', () => {
    const result = foldHome(
      initialParent,
      ParentMessage.GotChildMessage({
        message: ChildMessage.ChangedCount({ amount: 3 }),
      }),
      { roomId: 'room' },
    )

    expect(Option.getOrThrow(result.model.maybeChild).count).toBe(9)
    expect(HomeBinding).not.toHaveProperty('step')
    expectTypeOf<
      'step' extends keyof typeof HomeBinding ? true : false
    >().toEqualTypeOf<false>()

    expectTypeOf(result).toEqualTypeOf<
      Update.WithRegistrationEvidence<
        Update.ReturnWithOutMessage<
          ParentModel,
          ParentMessage,
          ParentOutMessage,
          never
        >,
        BindingRequirement<'home', typeof Child>
      >
    >()
  })

  it('returns the parent unchanged when an optional child is absent', () => {
    const parentWithoutChild: ParentModel = {
      ...initialParent,
      maybeChild: Option.none(),
    }
    const result = foldHome(
      parentWithoutChild,
      ParentMessage.GotChildMessage({
        message: ChildMessage.ChangedCount({ amount: 3 }),
      }),
      { roomId: 'room' },
    )

    expect(result).toEqual({ model: parentWithoutChild })
  })

  it('projects exposed operations directly and preserves their argument tuples', () => {
    const resetResult = ParentRuntime.expose.resetHome(initialParent)
    const contextualResult = ParentRuntime.expose.addHomeForRoom(
      initialParent,
      3,
      {
        roomId: 'room',
      },
    )

    expect(Option.getOrThrow(resetResult.model.maybeChild).count).toBe(0)
    expect(Option.getOrThrow(contextualResult.model.maybeChild).count).toBe(9)
    expectTypeOf(HomeBinding.addForRoom).parameters.toEqualTypeOf<
      [amount: number, context: Readonly<{ roomId: string }>]
    >()
    expectTypeOf<
      Update.RequirementsOf<ReturnType<typeof HomeBinding.save>>
    >().toEqualTypeOf<Qualify<'home', Command.HandlerOf<typeof Save>>>()
  })

  it('handles OutMessages locally and gives a derived result precedence over forwarding', () => {
    const result = foldHome(
      initialParent,
      ParentMessage.GotChildMessage({ message: ChildMessage.ReportedCount() }),
      {
        roomId: 'room',
      },
    )
    const stepResult = ParentRuntime.expose.reportHome(initialParent)

    expect(result.model.reports).toEqual([2])
    expect(result.outMessage).toEqual(
      ParentOutMessage.DerivedReport({ value: 2 }),
    )
    expect(stepResult.outMessage).toEqual(
      ParentOutMessage.DerivedReport({ value: 2 }),
    )
  })

  it('keeps Subscription gates separate from update placement', () => {
    const gatedParent: ParentModel = { ...initialParent, isListening: false }
    const dependencies =
      inspectBinding(HomeBinding).subscriptions.ticks.modelToDependencies(
        gatedParent,
      )
    const updateResult = foldHome(
      gatedParent,
      ParentMessage.GotChildMessage({
        message: ChildMessage.ChangedCount({ amount: 1 }),
      }),
      { roomId: 'x' },
    )

    expect(Option.isNone(dependencies.maybeDependencies)).toBe(true)
    expect(Option.getOrThrow(updateResult.model.maybeChild).count).toBe(4)
  })

  it('applies one Subscription gate across every child entry', () => {
    const GatedBinding = Parent.bindChild(Child, {
      fromParentMessage: false,
      placement: 'gated-home',
      read: (model: ParentModel) => model.maybeChild,
      write: writeChild,
      toParentMessage,
      outMessage: { fold: foldChildOutMessage },
      subscriptions: {
        when: (model: ParentModel) => model.isListening,
      },
    })
    const dependencies = inspectBinding(
      GatedBinding,
    ).subscriptions.ticks.modelToDependencies({
      ...initialParent,
      isListening: false,
    })

    expect(Option.isNone(dependencies.maybeDependencies)).toBe(true)
  })

  it('preserves FoldContext Command lifting and exact requirements', () => {
    const result = foldCommandHome(
      initialParent,
      ParentMessage.GotChildMessage({ message: ChildMessage.ReportedCount() }),
      { roomId: 'room' },
    )

    expect(result.commands).toHaveLength(1)
    expectTypeOf<
      Update.RequirementsOf<typeof CommandHomeBinding.fold>
    >().toEqualTypeOf<Qualify<'command-home', Command.HandlerOf<typeof Save>>>()
    expectTypeOf<
      Update.RequirementsOf<ReturnType<typeof CommandHomeBinding.report>>
    >().toEqualTypeOf<Qualify<'command-home', Command.HandlerOf<typeof Save>>>()
  })

  it('keeps forward-only policy requirements separate from child producers', () => {
    const result = foldForwardOnlyHome(
      initialParent,
      ParentMessage.GotChildMessage({ message: ChildMessage.ReportedCount() }),
      { roomId: 'room' },
    )

    expect(result.outMessage).toEqual(
      ParentOutMessage.ForwardedReport({ value: 2 }),
    )
    expectTypeOf(result).toEqualTypeOf<
      Update.WithRegistrationEvidence<
        Update.ReturnWithOutMessage<
          ParentModel,
          ParentMessage,
          ParentOutMessage,
          never
        >,
        BindingRequirement<'forward-only-home', typeof Child>
      >
    >()
    expectTypeOf<
      Update.RequirementsOf<typeof ForwardOnlyHomeBinding.fold>
    >().toEqualTypeOf<never>()
    expectTypeOf<
      Update.RequirementsOf<ReturnType<typeof ForwardOnlyHomeBinding.save>>
    >().toEqualTypeOf<
      Qualify<'forward-only-home', Command.HandlerOf<typeof Save>>
    >()
  })

  it('applies policy Command types only to producers that can emit an OutMessage', () => {
    const reset =
      ParentPolicyRuntime.expose.resetParentCommandHome(initialParent)
    const report =
      ParentPolicyRuntime.expose.reportParentCommandHome(initialParent)

    expect(reset.commands).toEqual([])
    expect(report.commands).toHaveLength(1)
    expectTypeOf<
      ReturnType<ReturnType<typeof ParentCommandHomeBinding.reset>>
    >().toEqualTypeOf<
      Update.ResultRecipe<
        ParentModel,
        PolicyMessage,
        never,
        never,
        BindingRequirement<'parent-command-home', typeof Child>
      >
    >()
    expectTypeOf<
      ReturnType<ReturnType<typeof ParentCommandHomeBinding.report>>
    >().toEqualTypeOf<
      Update.ResultRecipe<
        ParentModel,
        PolicyMessage,
        ParentOutMessage,
        Command.HandlerOf<typeof RunPolicyWork>,
        BindingRequirement<'parent-command-home', typeof Child>
      >
    >()
    expectTypeOf<
      Update.RequirementsOf<ReturnType<typeof ParentCommandHomeBinding.reset>>
    >().toEqualTypeOf<never>()
    expectTypeOf<
      Update.RequirementsOf<ReturnType<typeof ParentCommandHomeBinding.report>>
    >().toEqualTypeOf<Command.HandlerOf<typeof RunPolicyWork>>()
  })

  it('keeps source handles readable and qualifies collected registrations', () => {
    const aggregated = aggregateChildren([HomeBinding])
    const declarations = Subscription.__messageDeclarations(
      aggregated.subscriptions,
    )

    expect(childSubscriptions.ticks.name).toBe('BindingChild/ObserveTicks')
    expect(inspectBinding(HomeBinding).subscriptions.ticks.name).toBe(
      'home/ObserveTicks',
    )
    expect(inspectBinding(HomeBinding).managedResources.session.name).toBe(
      'home/ManageSession',
    )
    expect(
      inspectBinding(HomeBinding).managedResources.session.resource._tag.key,
    ).not.toBe(Session._tag.key)
    expect(aggregated.subscriptions['home/ticks']).toBe(
      inspectBinding(HomeBinding).subscriptions.ticks,
    )
    expect(aggregated.managedResources['home/session']).toBe(
      inspectBinding(HomeBinding).managedResources.session,
    )
    expect(declarations).toHaveLength(1)
    expect(declarations[0]).toMatchObject({
      entry: inspectBinding(HomeBinding).subscriptions.ticks,
      entryKey: 'home/ticks',
    })
    expect(declarations[0]?.messageMappers).toHaveLength(1)
  })

  it('preserves lifecycle contracts from a named child array', () => {
    const pulseChild = ChildComposition.makeBlock({
      init: Child.init,
      update: Child.update,
      subscriptions: { pulses: childSubscriptions.ticks },
      EffectsLayer: Layer.empty,
      hostHandlers: [childSubscriptions.ticks, Measure],
    })
    const ParentSchema = Schema.Struct({
      maybeChild: Schema.Option(ChildModel),
      reports: Schema.Array(Schema.Number),
      isListening: Schema.Boolean,
    })
    const parentBase = define('BindingNamedChildren').define({
      Model: ParentSchema,
      Message: ParentMessage,
      OutMessage: ParentOutMessage,
    })
    const NamedHomeBinding = parentBase.bindChild(Child, {
      fromParentMessage: false,
      placement: 'home',
      read: (model: ParentModel) => model.maybeChild,
      write: writeChild,
      toParentMessage,
      outMessage: { fold: foldChildOutMessage },
    })
    const RoomBinding = parentBase.bindChild(pulseChild, {
      fromParentMessage: false,
      placement: 'room',
      read: (model: ParentModel) => model.maybeChild,
      write: writeChild,
      toParentMessage,
      outMessage: { fold: foldChildOutMessage },
    })
    const childBindings = [NamedHomeBinding, RoomBinding]
    const parentContract = parentBase.makeComposition({
      childBindings,
    })
    const parent = parentContract.makeBlock({
      init: () => ({ model: initialParent }),
      update: (model, _message) => ({ model }),
      EffectsLayer: Layer.empty,
    })

    const inline = aggregateChildren([NamedHomeBinding, RoomBinding])

    expectTypeOf<keyof typeof parent.subscriptions>().toEqualTypeOf<
      'home/ticks' | 'room/pulses'
    >()
    expectTypeOf(parent.subscriptions).toExtend<typeof inline.subscriptions>()
    expectTypeOf(inline.subscriptions).toExtend<typeof parent.subscriptions>()
    expectTypeOf(parent.managedResources).toExtend<
      typeof inline.managedResources
    >()
    expectTypeOf(inline.managedResources).toExtend<
      typeof parent.managedResources
    >()
    expectTypeOf<
      ManagedResource.ServicesOf<typeof parent.managedResources>
    >().toEqualTypeOf<
      ManagedResource.ServicesOf<typeof inline.managedResources>
    >()
    expectTypeOf(parent.subscriptions['home/ticks']).toEqualTypeOf<
      typeof homeInspection.subscriptions.ticks
    >()
    expectTypeOf(parent.managedResources['home/session']).toEqualTypeOf<
      typeof homeInspection.managedResources.session
    >()
    expect(parent.subscriptions['home/ticks']).toBe(
      inspectBinding(NamedHomeBinding).subscriptions.ticks,
    )
    expect(parent.subscriptions['room/pulses']).toBe(
      inspectBinding(RoomBinding).subscriptions.pulses,
    )
    expect(parent.managedResources['home/session']).toBe(
      inspectBinding(NamedHomeBinding).managedResources.session,
    )
  })

  it('uses the canonical view across explicit slots and accepts a typed override', () => {
    const childModel = Option.getOrThrow(initialParent.maybeChild)
    const desktop = HomeBinding.embedView({
      slotId: 'desktop-home',
      model: childModel,
    })
    const mobile = HomeBinding.embedView({
      slotId: 'mobile-home',
      model: childModel,
    })
    const detailed = HomeBinding.embedView({
      slotId: 'detailed-home',
      model: childModel,
      view: detailedChildView,
      viewInputs: { prefix: 'Detailed count' },
    })

    expect(desktop.slotId).toBe('desktop-home')
    expect(mobile.slotId).toBe('mobile-home')
    expect(desktop.view).toBe(childView)
    expect(mobile.view).toBe(childView)
    expect(detailed.view).toBe(detailedChildView)
    expect(detailed.viewInputs).toEqual({ prefix: 'Detailed count' })
    expect(desktop.toParentMessage(ChildMessage.ObservedTick())).toEqual(
      toParentMessage(ChildMessage.ObservedTick()),
    )
    expectTypeOf(desktop).toEqualTypeOf<
      BoundBlockConfig<
        BoundBlockView<
          typeof childView,
          BindingRequirement<'home', typeof Child>
        >,
        ParentMessage
      >
    >()
    expectTypeOf(detailed).toEqualTypeOf<
      BoundBlockConfig<
        BoundBlockView<
          typeof detailedChildView,
          BindingRequirement<'home', typeof Child>
        >,
        ParentMessage
      >
    >()
    expectTypeOf<
      keyof BindingRequirement<
        'home',
        typeof Child
      >['__blockBindingRequirement']['block']
    >().toEqualTypeOf<'owner' | 'mountRequirements'>()
  })
})

describe('Block binding arity', () => {
  it('executes a rest tuple wrapped update without runtime arity checks', () => {
    const message = ArityMessage.IncreasedCount()
    const folded = foldWrappedArity(initialArityParent, message, {
      amount: 2,
    })

    expect(WrappedArityBlock.update.length).toBe(2)
    expect(folded.model.child.count).toBe(2)
    expectTypeOf(folded).toEqualTypeOf<
      Update.WithRegistrationEvidence<
        Update.Return<ArityParent, ArityMessage>,
        BindingRequirement<'wrapped-arity', typeof WrappedArityBlock>
      >
    >()
  })

  it('supplies the declared Message when the update implementation ignores it', () => {
    const message = ArityMessage.IncreasedCount()
    const folded = foldIgnoredMessage(initialArityParent, message)

    expect(IgnoredMessage.update.length).toBe(1)
    expect(folded.model.child.count).toBe(1)
  })

  it('preserves default and optional update context', () => {
    const message = ArityMessage.IncreasedCount()
    const defaultFold = foldDefaultContext(initialArityParent, message)
    const optionalFold = foldOptionalContext(initialArityParent, message)

    expect(defaultFold.model.child.count).toBe(2)
    expect(optionalFold.model.child.count).toBe(1)
  })

  it('returns Steps uniformly for noarg, defaulted, and rest producers', () => {
    const defaultResult =
      WrappedArityRuntime.expose.runDefaultIncrement(initialArityParent)
    const explicitDefaultResult =
      WrappedArityRuntime.expose.runDefaultIncrement(initialArityParent, 4)
    const restResult = WrappedArityRuntime.expose.runAddMany(
      initialArityParent,
      2,
      3,
    )
    const resetResult = WrappedArityRuntime.expose.runResetArity({
      child: ArityModel.make({ count: 8 }),
    })

    expect(defaultIncrement.length).toBe(1)
    expect(addMany.length).toBe(1)
    expect(defaultResult.model.child.count).toBe(1)
    expect(explicitDefaultResult.model.child.count).toBe(4)
    expect(restResult.model.child.count).toBe(5)
    expect(resetResult.model.child.count).toBe(0)
    expectTypeOf(WrappedArityBinding.defaultIncrement).parameters.toEqualTypeOf<
      [amount?: number | undefined]
    >()
    expectTypeOf(WrappedArityBinding.addMany).parameters.toEqualTypeOf<
      [...amounts: Array<number>]
    >()
    expectTypeOf(WrappedArityBinding.resetArity).parameters.toEqualTypeOf<[]>()
  })
})

describe('Block child registration composition', () => {
  it('gives repeated ManagedResources independent placement capability keys', () => {
    const SidebarBinding = Parent.bindChild(Child, {
      fromParentMessage: false,
      placement: 'sidebar',
      read: (model: ParentModel) => model.maybeChild,
      write: writeChild,
      toParentMessage,
      outMessage: { fold: foldChildOutMessage },
    })

    const aggregated = aggregateChildren([HomeBinding, SidebarBinding])
    expect(Object.keys(aggregated.managedResources)).toEqual([
      'home/session',
      'sidebar/session',
    ])
    expect(
      inspectBinding(HomeBinding).managedResources.session.resource._tag.key,
    ).not.toBe(
      inspectBinding(SidebarBinding).managedResources.session.resource._tag.key,
    )
  })

  it.effect('shares repeated Mount definitions and block Layer recipes', () =>
    Effect.gen(function* () {
      class BuildMarker extends Context.Service<BuildMarker, object>()(
        'BindingBuildMarker',
      ) {}

      let buildCount = 0
      const RepeatedOwner = define('BindingRepeated')
      const RepeatedMessage = defineMessageUnion({ CompletedMount: {} })
      type RepeatedMessage = typeof RepeatedMessage.Type
      const RepeatedMount = RepeatedOwner.mount('Mount', {
        messages: [RepeatedMessage.CompletedMount],
      })
      const repeatedBase = RepeatedOwner.define({
        Model: ChildModel,
        Message: RepeatedMessage,
      })
      const RepeatedComposition = repeatedBase.makeComposition({
        mounts: [RepeatedMount],
      })
      const EffectsLayer = Layer.sync(BuildMarker, () => {
        buildCount += 1
        return {}
      })
      const Repeated = RepeatedComposition.makeBlock({
        init: () => ({ model: ChildModel.make({ count: 0 }) }),
        update: model => ({ model }),
        EffectsLayer,
        hostHandlers: [RepeatedMount],
      })
      const RepeatedParentModel = Schema.Struct({ child: ChildModel })
      type RepeatedParentModel = typeof RepeatedParentModel.Type
      const toRepeatedParentMessage = (
        message: RepeatedMessage,
      ): RepeatedMessage => message
      const RepeatedParent = define('BindingRepeatedParent', {
        Model: RepeatedParentModel,
        Message: RepeatedMessage,
      })
      const bindRepeated = (placement: 'first' | 'second') =>
        RepeatedParent.bindChild(Repeated, {
          fromParentMessage: false,
          placement,
          read: (model: RepeatedParentModel) => Option.some(model.child),
          write: (model, child) => ({ ...model, child }),
          toParentMessage: toRepeatedParentMessage,
        })
      const aggregated = aggregateChildren([
        bindRepeated('first'),
        bindRepeated('second'),
      ])

      expect(aggregated.mounts).toEqual([RepeatedMount])

      yield* Effect.void.pipe(Effect.provide(aggregated.EffectsLayer))
      expect(buildCount).toBe(1)
    }),
  )
})

describe('generic block refinement', () => {
  const GenericOwner = define('BindingChoice')
  const CompletedChoiceWork = Schema.TaggedStruct('CompletedChoiceWork', {})
  const FinishChoice = GenericOwner.command('FinishChoice', {
    messages: [CompletedChoiceWork],
  })

  const makeChoice = <Value extends string>(Value: Schema.Schema<Value>) => {
    const Model = Schema.Struct({ value: Value })
    type Model = typeof Model.Type
    const Message = Schema.Union([
      Schema.TaggedStruct('SelectedValue', { value: Value }),
      CompletedChoiceWork,
    ])
    type Message = typeof Message.Type
    const OutMessage = Schema.TaggedStruct('SelectedValue', { value: Value })
    type OutMessage = typeof OutMessage.Type
    const Definition = GenericOwner.define({ Model, Message, OutMessage })
    const Composition = Definition.makeComposition()
    const update = Composition.makeUpdate((model, message) => {
      if (message._tag === 'SelectedValue') {
        return {
          model: Model.make({ value: message.value }),
          outMessage: OutMessage.make({ value: message.value }),
        }
      } else {
        return { model }
      }
    })
    const finish = Definition.step(model => ({
      model,
      commands: [FinishChoice()],
    }))

    return Composition.makeBlock({
      init: (value: Value) => ({ model: Model.make({ value }) }),
      update,
      expose: { finish },
      EffectsLayer: Layer.empty,
      hostHandlers: [FinishChoice],
    })
  }

  it('preserves a refined OutMessage payload and shared handler definition', () => {
    const Choice = makeChoice(Schema.Literals(['One', 'Two']))
    type ChoiceModel = typeof Choice.Model.Type
    type ChoiceMessage = typeof Choice.Message.Type
    type ChoiceOutMessage = typeof Choice.OutMessage.Type
    const ChoiceParentModel = Schema.Struct({ choice: Choice.Model })
    type ChoiceParentModel = typeof ChoiceParentModel.Type
    type DeclaredOutMessage =
      typeof Choice extends Readonly<{
        OutMessage: Readonly<{ Type: infer OutMessage }>
      }>
        ? OutMessage
        : never
    expectTypeOf<DeclaredOutMessage>().toEqualTypeOf<ChoiceOutMessage>()
    const DirectBinding = bind(Choice, {
      placement: 'direct-choice',
      read: (model: ChoiceParentModel) => Option.some(model.choice),
      write: (model, choice) => ({ ...model, choice }),
      toParentMessage: (message: ChoiceMessage) => message,
      outMessage: {
        fold: outMessage => model => ({ model, outMessage }),
      },
    })
    const ChoiceParent = define('BindingChoiceParent', {
      Model: ChoiceParentModel,
      Message: Choice.Message,
      OutMessage: Choice.OutMessage,
    })
    const Binding = ChoiceParent.bindChild(Choice, {
      fromParentMessage: false,
      placement: 'choice',
      read: (model: ChoiceParentModel) => Option.some(model.choice),
      write: (model: ChoiceParentModel, choice: ChoiceModel) => ({
        ...model,
        choice,
      }),
      toParentMessage: (message: ChoiceMessage) => message,
      outMessage: {
        fold: (outMessage: ChoiceOutMessage) => (model: ChoiceParentModel) => ({
          model,
          outMessage,
        }),
      },
    })
    const foldChoice = ChoiceParent.makeComposition({
      childBindings: [Binding],
    }).makeUpdate((model, message) => Binding.fold(model, message))

    const result = foldChoice(
      { choice: Choice.Model.make({ value: 'One' }) },
      { _tag: 'SelectedValue', value: 'Two' },
    )

    expect(result.outMessage).toEqual({ _tag: 'SelectedValue', value: 'Two' })
    expectTypeOf<ReturnType<typeof DirectBinding.fold>>().toEqualTypeOf<
      Update.ResultRecipe<
        ChoiceParentModel,
        ChoiceMessage,
        ChoiceOutMessage,
        never,
        BindingRequirement<'direct-choice', typeof Choice>
      >
    >()
    expectTypeOf(result.outMessage).toEqualTypeOf<
      ChoiceOutMessage | undefined
    >()
    expectTypeOf<
      Update.RequirementsOf<ReturnType<typeof Binding.finish>>
    >().toEqualTypeOf<
      Scoped<'choice', Command.HandlerOf<typeof FinishChoice>>
    >()

    const invalidChoiceMessage: ChoiceMessage = {
      _tag: 'SelectedValue',
      // @ts-expect-error the concrete block accepts only refined values
      value: 'Three',
    }
    void invalidChoiceMessage
  })
})
