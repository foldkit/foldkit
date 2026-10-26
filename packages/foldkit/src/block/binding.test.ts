import { Context, Effect, Layer, Option, Schema, Tuple } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Command from '../command/index.js'
import * as ManagedResource from '../managedResource/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Subscription from '../subscription/subscription.js'
import * as Update from '../update/index.js'
import type { RequirementOfBinding } from './binding.js'
import { aggregateChildren, inspectBinding } from './binding.js'
import { makeDefinition, makeNamespace } from './define.js'
import * as Block from './public.js'
import type { Qualify, Scoped } from './scope.js'

type CommandMessageOfReturn<Value> =
  Value extends Update.ResultRecipe<any, infer Message, any, any, any>
    ? Message
    : Value extends Readonly<{
          commands?: Update.Commands<infer Message, any> | undefined
        }>
      ? Message
      : never

const ChildNamespace = makeNamespace('BindingChild')

const ChildModel = Schema.Struct({ count: Schema.Number })
type ChildModel = typeof ChildModel.Type

const ChildMessage = defineMessageUnion({
  RequestedSave: {},
  RequestedReset: {},
  RequestedAddForRoom: { amount: Schema.Number },
  RequestedReport: {},
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

const Save = ChildNamespace.makeCommand('Save', {
  messages: [ChildMessage.CompletedSave],
})

const ChildChannelsDefinition = ChildNamespace.makeDefinition({
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
})

const childSubscriptions = ChildChannelsDefinition.makeSubscriptions(entry => ({
  ticks: entry(
    'ObserveTicks',
    { count: Schema.Number },
    {
      messages: [ChildMessage.ObservedTick],
      modelToDependencies: model => ({ count: model.count }),
    },
  ),
}))

const Session = ChildNamespace.makeResource<string>()('Session')

const childManagedResources = ChildChannelsDefinition.makeManagedResources(
  entry => ({
    session: entry('ManageSession', Schema.Option(Schema.String), {
      resource: Session,
      modelToMaybeRequirements: model =>
        model.count === 0 ? Option.none() : Option.some(`${model.count}`),
      onAcquired: value => ChildMessage.AcquiredSession({ value }),
      onReleased: ChildMessage.ReleasedSession,
      onAcquireError: () => ChildMessage.FailedAcquireSession(),
    }),
  }),
)

const Measure = ChildNamespace.makeMount('Measure', {
  messages: [ChildMessage.CompletedMeasure],
})

const ChildBaseDefinition = ChildNamespace.makeDefinition({
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
})
const ChildComposition = ChildBaseDefinition.makeComposition({
  mounts: [Measure],
})

const childView = ChildComposition.makeView((model, h) =>
  h.div([], [`Count ${model.count}`]),
)

const detailedChildView = ChildComposition.makeView.withInputs<
  Readonly<{ prefix: string }>
>((model, viewInputs, h) => h.div([], [`${viewInputs.prefix} ${model.count}`]))

const saveStep = ChildBaseDefinition.makeStep(model => ({
  model,
  commands: [Save()],
}))

const resetStep = ChildBaseDefinition.makeStep(model => ({
  model: modifyFields(model, { count: () => 0 }),
}))

const addForRoomStep = ChildBaseDefinition.makeStep(
  (model, amount: number, context: Readonly<{ roomId: string }>) => ({
    model: modifyFields(model, {
      count: () => model.count + amount + context.roomId.length,
    }),
  }),
)

const reportStep = ChildBaseDefinition.makeStep(model => ({
  model,
  outMessage: ChildOutMessage.Reported({ value: model.count }),
}))

const childUpdate = ChildComposition.makeUpdate.withContext(
  (
    context: Readonly<{
      roomId: string
    }>,
  ) => ({
    RequestedSave: model => saveStep(model),
    RequestedReset: model => resetStep(model),
    RequestedAddForRoom: (model, { amount }) =>
      addForRoomStep(model, amount, context),
    RequestedReport: model => reportStep(model),
    ChangedCount: (model, { amount }) => ({
      model: modifyFields(model, {
        count: () => model.count + amount + context.roomId.length,
      }),
    }),
    ReportedCount: model => ({
      model,
      outMessage: ChildOutMessage.Reported({ value: model.count }),
    }),
    CompletedSave: model => ({ model }),
    ObservedTick: model => ({ model }),
    AcquiredSession: model => ({ model }),
    ReleasedSession: model => ({ model }),
    FailedAcquireSession: model => ({ model }),
    CompletedMeasure: model => ({ model }),
  }),
)

const prepareChild = () =>
  ChildComposition.prepareBlock({
    view: childView,
    init: (count: number) => ({ model: ChildModel.make({ count }) }),
    update: childUpdate,
    operations: {
      save: () => Tuple.make(ChildMessage.RequestedSave(), { roomId: '' }),
      reset: () => Tuple.make(ChildMessage.RequestedReset(), { roomId: '' }),
      addForRoom: (amount: number, context: Readonly<{ roomId: string }>) =>
        Tuple.make(ChildMessage.RequestedAddForRoom({ amount }), context),
      report: () => Tuple.make(ChildMessage.RequestedReport(), { roomId: '' }),
    },
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
const Child: Block.FromAssemblyWithViewAndOutMessage<
  typeof ChildModel,
  typeof prepareChild
> = Block.assemble(prepareChild)

const ParentModel = Schema.Struct({
  maybeChild: Schema.Option(ChildModel),
  reports: Schema.Array(Schema.Number),
  isListening: Schema.Boolean,
})
type ParentModel = typeof ParentModel.Type

const ParentMessage = defineMessageUnion({
  RecordedReport: {},
  RequestedResetHome: {},
  RequestedAddHomeForRoom: { amount: Schema.Number, roomId: Schema.String },
  RequestedReportHome: {},
})
type ParentMessage = typeof ParentMessage.Type

const ParentOutMessage = defineMessageUnion({
  ForwardedReport: { value: Schema.Number },
  DerivedReport: { value: Schema.Number },
})
type ParentOutMessage = typeof ParentOutMessage.Type

const Parent = makeDefinition('BindingParent', {
  Model: ParentModel,
  Message: ParentMessage,
  OutMessage: ParentOutMessage,
})

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

const HomeBinding = Parent.makeBinding(Child, {
  placement: 'home',
  read: (model: ParentModel) => model.maybeChild,
  write: writeChild,
  subscriptions: {
    when: {
      ticks: (model: ParentModel) => model.isListening,
    },
  },
  delivery: {
    toUpdateContext: () => [{ roomId: 'room' }],
  },
}).withOutMessagePolicy({
  fold: foldChildOutMessage,
  forward: forwardChildOutMessage,
})
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

const CommandHomeBinding = Parent.makeBinding(Child, {
  placement: 'command-home',
  read: (model: ParentModel) => model.maybeChild,
  write: writeChild,
  delivery: {
    toUpdateContext: () => [{ roomId: 'room' }],
  },
}).withOutMessagePolicy({ fold: foldChildOutMessageWithCommand })

const PolicyMessage = defineMessageUnion({
  CompletedPolicyWork: {},
  RequestedResetHome: {},
  RequestedReportHome: {},
})
type PolicyMessage = typeof PolicyMessage.Type

const ParentPolicyNamespace = makeNamespace('BindingParentPolicy')
const RunPolicyWork = ParentPolicyNamespace.makeCommand('RunPolicyWork', {
  messages: [PolicyMessage.CompletedPolicyWork],
})
const ParentPolicyDefinition = ParentPolicyNamespace.makeDefinition({
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

const ParentCommandHomeBinding = ParentPolicyDefinition.makeBinding(Child, {
  placement: 'parent-command-home',
  read: (model: ParentModel) => model.maybeChild,
  write: writeChild,
  delivery: {
    toUpdateContext: () => [{ roomId: 'room' }],
  },
}).withOutMessagePolicy({ fold: foldChildOutMessageWithParentCommand })

const ForwardOnlyHomeBinding = Parent.makeBinding(Child, {
  placement: 'forward-only-home',
  read: (model: ParentModel) => model.maybeChild,
  write: writeChild,
  delivery: {
    toUpdateContext: () => [{ roomId: 'room' }],
  },
}).withOutMessagePolicy({ forward: forwardChildOutMessage })

const bindWithoutOutMessagePolicy = () =>
  Parent.makeBinding(Child, {
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    placement: 'missing-policy',
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    read: (model: ParentModel) => model.maybeChild,
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    write: writeChild,
  })
void bindWithoutOutMessagePolicy

const bindWithUnknownForward = () =>
  Parent.makeBinding(Child, {
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    placement: 'unknown-forward',
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    read: (model: ParentModel) => model.maybeChild,
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    write: writeChild,
    // eslint-disable-next-line foldkit/no-empty-to-parent-out-message
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    outMessage: { forward: (): unknown => undefined },
  })
void bindWithUnknownForward

const LocallyHandledWithoutForwardingBinding = Parent.makeBinding(Child, {
  placement: 'locally-handled',
  read: (model: ParentModel) => model.maybeChild,
  write: writeChild,
  delivery: {
    toUpdateContext: () => [{ roomId: 'room' }],
  },
}).withOutMessagePolicy({ fold: foldChildOutMessage })
void LocallyHandledWithoutForwardingBinding

const initialParent: ParentModel = {
  maybeChild: Option.some(ChildModel.make({ count: 2 })),
  reports: [],
  isListening: true,
}

const ParentComposition = Parent.makeComposition({
  bindings: [HomeBinding],
})
const foldHome = ParentComposition.makeUpdate({
  RecordedReport: model => ({ model }),
  RequestedResetHome: model => ({ model }),
  RequestedAddHomeForRoom: model => ({ model }),
  RequestedReportHome: model => ({ model }),
})
const foldCommandHome = Parent.makeComposition({
  bindings: [CommandHomeBinding],
}).makeUpdate({
  RecordedReport: model => ({ model }),
  RequestedResetHome: model => ({ model }),
  RequestedAddHomeForRoom: model => ({ model }),
  RequestedReportHome: model => ({ model }),
})
const ForwardOnlyComposition = Parent.makeComposition({
  bindings: [ForwardOnlyHomeBinding],
})
const foldForwardOnlyHome = ForwardOnlyComposition.makeUpdate({
  RecordedReport: model => ({
    model,
  }),
  RequestedResetHome: model => ({
    model,
  }),
  RequestedAddHomeForRoom: model => ({
    model,
  }),
  RequestedReportHome: model => ({
    model,
  }),
})
const resetHomeStep = Parent.makeStep(_model => HomeBinding.reset())
const addHomeForRoomStep = Parent.makeStep(
  (_model, amount: number, context: Readonly<{ roomId: string }>) =>
    HomeBinding.addForRoom(amount, context),
)
const reportHomeStep = Parent.makeStep(_model => HomeBinding.report())
const prepareParentRuntime = () =>
  ParentComposition.prepareBlock({
    init: () => ({ model: initialParent }),
    update: ParentComposition.makeUpdate({
      RequestedResetHome: model => resetHomeStep(model),
      RequestedAddHomeForRoom: (model, { amount, roomId }) =>
        addHomeForRoomStep(model, amount, { roomId }),
      RequestedReportHome: model => reportHomeStep(model),
      RecordedReport: model => Parent.makeNoopStep()(model),
    }),
    operations: {
      resetHome: () => Tuple.make(ParentMessage.RequestedResetHome()),
      addHomeForRoom: (amount: number, context: Readonly<{ roomId: string }>) =>
        Tuple.make(
          ParentMessage.RequestedAddHomeForRoom({
            amount,
            roomId: context.roomId,
          }),
        ),
      reportHome: () => Tuple.make(ParentMessage.RequestedReportHome()),
    },
    EffectsLayer: Layer.empty,
  })
const ParentRuntime: Block.FromAssemblyWithOutMessage<
  typeof ParentModel,
  typeof prepareParentRuntime
> = Block.assemble(prepareParentRuntime)

const ParentPolicyComposition = ParentPolicyDefinition.makeComposition({
  bindings: [ParentCommandHomeBinding],
})
const resetParentCommandHomeStep = ParentPolicyDefinition.makeStep(_model =>
  ParentCommandHomeBinding.reset(),
)
const reportParentCommandHomeStep = ParentPolicyDefinition.makeStep(_model =>
  ParentCommandHomeBinding.report(),
)
const foldParentPolicy = ParentPolicyComposition.makeUpdate({
  RequestedResetHome: model => resetParentCommandHomeStep(model),
  RequestedReportHome: model => reportParentCommandHomeStep(model),
  CompletedPolicyWork: model => ParentPolicyDefinition.makeNoopStep()(model),
})
const prepareParentPolicyRuntime = () =>
  ParentPolicyComposition.prepareBlock({
    init: () => ({ model: initialParent }),
    update: foldParentPolicy,
    operations: {
      resetParentCommandHome: () =>
        Tuple.make(PolicyMessage.RequestedResetHome()),
      reportParentCommandHome: () =>
        Tuple.make(PolicyMessage.RequestedReportHome()),
    },
    EffectsLayer: Layer.empty,
    hostHandlers: [RunPolicyWork],
  })
const ParentPolicyRuntime: Block.FromAssemblyWithOutMessage<
  typeof ParentModel,
  typeof prepareParentPolicyRuntime
> = Block.assemble(prepareParentPolicyRuntime)

const callFoldDataLastStep = () =>
  // @ts-expect-error fold executes immediately and requires the parent Model
  HomeBinding.fold(ChildMessage.ChangedCount({ amount: 3 }), { roomId: 'room' })
void callFoldDataLastStep

const ArityModel = Schema.Struct({ count: Schema.Number })
type ArityModel = typeof ArityModel.Type

const ArityMessage = defineMessageUnion({
  RequestedDefaultIncrement: { amount: Schema.optionalKey(Schema.Number) },
  RequestedAddMany: { amounts: Schema.Array(Schema.Number) },
  RequestedAddWithRequiredPrefix: {
    first: Schema.Number,
    labels: Schema.Array(Schema.String),
  },
  RequestedAddWithOptionalPrefix: {
    first: Schema.optionalKey(Schema.Number),
    labels: Schema.Array(Schema.String),
  },
  RequestedAddMixed: {
    values: Schema.Array(Schema.Union([Schema.Number, Schema.String])),
  },
  RequestedReset: {},
  IncreasedCount: {},
})
type ArityMessage = typeof ArityMessage.Type

const ArityParentMessage = defineMessageUnion({
  RequestedDefaultIncrement: { amount: Schema.optionalKey(Schema.Number) },
  RequestedAddMany: { amounts: Schema.Array(Schema.Number) },
  RequestedReset: {},
})

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
const WrappedArityNamespace = makeNamespace('BindingWrappedArity')
const WrappedArityDefinition = WrappedArityNamespace.makeDefinition({
  Model: ArityModel,
  Message: ArityMessage,
})
const WrappedArityComposition = WrappedArityDefinition.makeComposition()
const defaultIncrementStep = WrappedArityDefinition.makeStep(
  (model: ArityModel, amount: number = 1) => ({
    model: modifyFields(model, { count: count => count + amount }),
  }),
)
const addManyStep = WrappedArityDefinition.makeStep(
  (model: ArityModel, ...amounts: ReadonlyArray<number>) => ({
    model: modifyFields(model, {
      count: count =>
        count + amounts.reduce((total, amount) => total + amount, 0),
    }),
  }),
)
const resetArityStep = WrappedArityDefinition.makeStep((model: ArityModel) => ({
  model: modifyFields(model, { count: () => 0 }),
}))
const wrappedArityUpdate = WrappedArityComposition.makeUpdate.withContext(
  (context: Readonly<{ amount: number }>) => ({
    RequestedDefaultIncrement: (model, { amount }) =>
      defaultIncrementStep(model, amount),
    RequestedAddMany: (model, { amounts }) => addManyStep(model, ...amounts),
    RequestedAddWithRequiredPrefix: (model, { first, labels }) => ({
      model: modifyFields(model, {
        count: count => count + first + labels.length,
      }),
    }),
    RequestedAddWithOptionalPrefix: (model, { first = 0, labels }) => ({
      model: modifyFields(model, {
        count: count => count + first + labels.length,
      }),
    }),
    RequestedAddMixed: (model, { values }) => ({
      model: modifyFields(model, {
        count: count => count + values.length,
      }),
    }),
    RequestedReset: model => resetArityStep(model),
    IncreasedCount: model => ({
      model: modifyFields(model, {
        count: count => count + context.amount,
      }),
    }),
  }),
)
const prepareWrappedArityBlock = () =>
  WrappedArityComposition.prepareBlock({
    init: () => ({ model: ArityModel.make({ count: 0 }) }),
    update: wrappedArityUpdate,
    operations: {
      defaultIncrement: (amount?: number) =>
        Tuple.make(
          ArityMessage.RequestedDefaultIncrement(
            amount === undefined ? {} : { amount },
          ),
          { amount: 0 },
        ),
      addMany: (...amounts: ReadonlyArray<number>) =>
        Tuple.make(ArityMessage.RequestedAddMany({ amounts }), { amount: 0 }),
      addWithRequiredPrefix: (
        ...[first, ...labels]: readonly [
          first: number,
          ...labels: Array<string>,
        ]
      ) =>
        Tuple.make(
          ArityMessage.RequestedAddWithRequiredPrefix({ first, labels }),
          { amount: 0 },
        ),
      addWithOptionalPrefix: (
        ...[first, ...labels]: readonly [
          first?: number,
          ...labels: Array<string>,
        ]
      ) =>
        Tuple.make(
          ArityMessage.RequestedAddWithOptionalPrefix(
            first === undefined ? { labels } : { first, labels },
          ),
          { amount: 0 },
        ),
      addMixed: (...values: ReadonlyArray<number | string>) =>
        Tuple.make(ArityMessage.RequestedAddMixed({ values }), { amount: 0 }),
      addRefined: (...amounts: ReadonlyArray<1 | 2>) =>
        Tuple.make(ArityMessage.RequestedAddMany({ amounts }), { amount: 0 }),
      resetArity: () =>
        Tuple.make(ArityMessage.RequestedReset(), { amount: 0 }),
    },
    EffectsLayer: Layer.empty,
  })
const WrappedArityBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ArityModel,
  typeof prepareWrappedArityBlock
> = Block.assemble(prepareWrappedArityBlock)
const WrappedArityParent = makeDefinition('BindingWrappedArityParent', {
  Model: ArityParent,
  Message: ArityParentMessage,
})
const WrappedArityBinding = WrappedArityParent.makeBinding(WrappedArityBlock, {
  placement: 'wrapped-arity',
  read: readArityChild,
  write: writeArityChild,
  delivery: {
    toUpdateContext: () => [{ amount: 2 }],
  },
})

const embedViewlessBlockWithoutView = () =>
  // @ts-expect-error a viewless block requires an explicit view
  WrappedArityBinding.embedView({
    slotId: 'viewless-arity',
    model: initialArityParent.child,
  })
void embedViewlessBlockWithoutView

const arityInit = () => ({ model: ArityModel.make({ count: 0 }) })

const IgnoredMessageNamespace = makeNamespace('BindingIgnoredMessage')
const IgnoredMessageComposition = IgnoredMessageNamespace.makeDefinition({
  Model: ArityModel,
  Message: ArityMessage,
}).makeComposition()
const ignoredMessageUpdate = (model: typeof ArityModel.Type) => ({
  model: modifyFields(model, { count: count => count + 1 }),
})
const ignoredMessageHandlers = {
  RequestedReset: ignoredMessageUpdate,
  RequestedDefaultIncrement: ignoredMessageUpdate,
  RequestedAddMany: ignoredMessageUpdate,
  RequestedAddWithRequiredPrefix: ignoredMessageUpdate,
  RequestedAddWithOptionalPrefix: ignoredMessageUpdate,
  RequestedAddMixed: ignoredMessageUpdate,
  IncreasedCount: ignoredMessageUpdate,
}
const prepareIgnoredMessage = () =>
  IgnoredMessageComposition.prepareBlock({
    init: IgnoredMessageComposition.makeInit(arityInit),
    update: IgnoredMessageComposition.makeUpdate(ignoredMessageHandlers),
  })
const IgnoredMessage: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ArityModel,
  typeof prepareIgnoredMessage
> = Block.assemble(prepareIgnoredMessage)
const IgnoredMessageBinding = WrappedArityParent.makeBinding(IgnoredMessage, {
  placement: 'ignored-message',
  read: readArityChild,
  write: writeArityChild,
})

const DefaultContextNamespace = makeNamespace('BindingDefaultContext')
const DefaultContextComposition = DefaultContextNamespace.makeDefinition({
  Model: ArityModel,
  Message: ArityMessage,
}).makeComposition()
const prepareDefaultContext = () =>
  DefaultContextComposition.prepareBlock({
    init: DefaultContextComposition.makeInit(arityInit),
    update: DefaultContextComposition.makeUpdate.withContext(
      (
        context: Readonly<{
          amount: number
        }> = { amount: 2 },
      ) => ({
        RequestedReset: (model, _message) => ({
          model: modifyFields(model, {
            count: count => count + context.amount,
          }),
        }),
        RequestedDefaultIncrement: (model, _message) => ({
          model: modifyFields(model, {
            count: count => count + context.amount,
          }),
        }),
        RequestedAddMany: (model, _message) => ({
          model: modifyFields(model, {
            count: count => count + context.amount,
          }),
        }),
        RequestedAddWithRequiredPrefix: (model, _message) => ({
          model: modifyFields(model, {
            count: count => count + context.amount,
          }),
        }),
        RequestedAddWithOptionalPrefix: (model, _message) => ({
          model: modifyFields(model, {
            count: count => count + context.amount,
          }),
        }),
        RequestedAddMixed: (model, _message) => ({
          model: modifyFields(model, {
            count: count => count + context.amount,
          }),
        }),
        IncreasedCount: (model, _message) => ({
          model: modifyFields(model, {
            count: count => count + context.amount,
          }),
        }),
      }),
    ),
  })
const DefaultContext: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ArityModel,
  typeof prepareDefaultContext
> = Block.assemble(prepareDefaultContext)
const DefaultContextBinding = WrappedArityParent.makeBinding(DefaultContext, {
  placement: 'default-context',
  read: readArityChild,
  write: writeArityChild,
  delivery: { toUpdateContext: () => [{ amount: 2 }] },
})

const OptionalContextNamespace = makeNamespace('BindingOptionalContext')
const OptionalContextComposition = OptionalContextNamespace.makeDefinition({
  Model: ArityModel,
  Message: ArityMessage,
}).makeComposition()
const prepareOptionalContext = () =>
  OptionalContextComposition.prepareBlock({
    init: OptionalContextComposition.makeInit(arityInit),
    update: OptionalContextComposition.makeUpdate.withContext(
      (
        context?: Readonly<{
          amount: number
        }>,
      ) => ({
        RequestedReset: (model, _message) => ({
          model: modifyFields(model, {
            count: count => count + (context?.amount ?? 1),
          }),
        }),
        RequestedDefaultIncrement: (model, _message) => ({
          model: modifyFields(model, {
            count: count => count + (context?.amount ?? 1),
          }),
        }),
        RequestedAddMany: (model, _message) => ({
          model: modifyFields(model, {
            count: count => count + (context?.amount ?? 1),
          }),
        }),
        RequestedAddWithRequiredPrefix: (model, _message) => ({
          model: modifyFields(model, {
            count: count => count + (context?.amount ?? 1),
          }),
        }),
        RequestedAddWithOptionalPrefix: (model, _message) => ({
          model: modifyFields(model, {
            count: count => count + (context?.amount ?? 1),
          }),
        }),
        RequestedAddMixed: (model, _message) => ({
          model: modifyFields(model, {
            count: count => count + (context?.amount ?? 1),
          }),
        }),
        IncreasedCount: (model, _message) => ({
          model: modifyFields(model, {
            count: count => count + (context?.amount ?? 1),
          }),
        }),
      }),
    ),
  })
const OptionalContext: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ArityModel,
  typeof prepareOptionalContext
> = Block.assemble(prepareOptionalContext)
const OptionalContextBinding = WrappedArityParent.makeBinding(OptionalContext, {
  placement: 'optional-context',
  read: readArityChild,
  write: writeArityChild,
  delivery: { toUpdateContext: () => [{ amount: 1 }] },
})

const WrappedArityParentComposition = WrappedArityParent.makeComposition({
  bindings: [
    WrappedArityBinding,
    IgnoredMessageBinding,
    DefaultContextBinding,
    OptionalContextBinding,
  ],
})
const foldWrappedArity = WrappedArityParentComposition.makeUpdate({
  RequestedReset: model => ({
    model,
  }),
  RequestedDefaultIncrement: model => ({
    model,
  }),
  RequestedAddMany: model => ({
    model,
  }),
})
const runDefaultIncrementStep = WrappedArityParent.makeStep(
  (_model, amount?: number) => {
    if (amount === undefined) {
      return WrappedArityBinding.defaultIncrement()
    } else {
      return WrappedArityBinding.defaultIncrement(amount)
    }
  },
)
const runAddManyStep = WrappedArityParent.makeStep(
  (_model, ...amounts: ReadonlyArray<number>) =>
    WrappedArityBinding.addMany(...amounts),
)
const runResetArityStep = WrappedArityParent.makeStep(_model =>
  WrappedArityBinding.resetArity(),
)
const prepareWrappedArityRuntime = () =>
  WrappedArityParentComposition.prepareBlock({
    init: () => ({ model: initialArityParent }),
    update: WrappedArityParentComposition.makeUpdate({
      RequestedDefaultIncrement: (model, { amount }) =>
        runDefaultIncrementStep(model, amount),
      RequestedAddMany: (model, { amounts }) =>
        runAddManyStep(model, ...amounts),
      RequestedReset: model => runResetArityStep(model),
    }),
    operations: {
      runDefaultIncrement: (amount?: number) =>
        Tuple.make(
          ArityParentMessage.RequestedDefaultIncrement(
            amount === undefined ? {} : { amount },
          ),
        ),
      runAddMany: (...amounts: ReadonlyArray<number>) =>
        Tuple.make(ArityParentMessage.RequestedAddMany({ amounts })),
      runResetArity: () => Tuple.make(ArityParentMessage.RequestedReset()),
    },
    EffectsLayer: Layer.empty,
  })
const WrappedArityRuntime: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ArityParent,
  typeof prepareWrappedArityRuntime
> = Block.assemble(prepareWrappedArityRuntime)

const foldIgnoredMessage = WrappedArityParentComposition.makeUpdate({
  RequestedReset: model => ({
    model,
  }),
  RequestedDefaultIncrement: model => ({
    model,
  }),
  RequestedAddMany: model => ({
    model,
  }),
})
const foldDefaultContext = WrappedArityParentComposition.makeUpdate({
  RequestedReset: model => ({
    model,
  }),
  RequestedDefaultIncrement: model => ({
    model,
  }),
  RequestedAddMany: model => ({
    model,
  }),
})
const foldOptionalContext = WrappedArityParentComposition.makeUpdate({
  RequestedReset: model => ({
    model,
  }),
  RequestedDefaultIncrement: model => ({
    model,
  }),
  RequestedAddMany: model => ({
    model,
  }),
})

describe('Block binding', () => {
  it('preserves contextual update arguments without a deferred update member', () => {
    const result = foldHome(initialParent, {
      _tag: 'GotHomeMessage',
      placement: 'home',
      generation: 0,
      message: ChildMessage.ChangedCount({ amount: 3 }),
    })

    expect(Option.getOrThrow(result.model.maybeChild).count).toBe(9)
    expect(HomeBinding).not.toHaveProperty('step')
    expectTypeOf<
      'step' extends keyof typeof HomeBinding ? true : false
    >().toEqualTypeOf<false>()

    expectTypeOf(result).toEqualTypeOf<
      Update.WithRegistrationEvidence<
        Update.ReturnWithOutMessage<
          ParentModel,
          typeof ParentComposition.Message.Type,
          ParentOutMessage,
          Scoped<'home', Command.HandlerOf<typeof Save>>
        >,
        RequirementOfBinding<typeof HomeBinding>
      >
    >()
  })

  it('returns the parent unchanged when an optional child is absent', () => {
    const parentWithoutChild: ParentModel = {
      ...initialParent,
      maybeChild: Option.none(),
    }
    const result = foldHome(parentWithoutChild, {
      _tag: 'GotHomeMessage',
      placement: 'home',
      generation: 0,
      message: ChildMessage.ChangedCount({ amount: 3 }),
    })

    expect(result).toEqual({ model: parentWithoutChild })
  })

  it('projects exposed operations directly and preserves their argument tuples', () => {
    const resetResult = ParentRuntime.operations.resetHome(initialParent)
    const contextualResult = ParentRuntime.operations.addHomeForRoom(
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
    const result = foldHome(initialParent, {
      _tag: 'GotHomeMessage',
      placement: 'home',
      generation: 0,
      message: ChildMessage.ReportedCount(),
    })
    const stepResult = ParentRuntime.operations.reportHome(initialParent)

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
    const updateResult = foldHome(gatedParent, {
      _tag: 'GotHomeMessage',
      placement: 'home',
      generation: 0,
      message: ChildMessage.ChangedCount({ amount: 1 }),
    })

    expect(Option.isNone(dependencies.maybeDependencies)).toBe(true)
    expect(Option.getOrThrow(updateResult.model.maybeChild).count).toBe(7)
  })

  it('applies one Subscription gate across every child entry', () => {
    const GatedBinding = Parent.makeBinding(Child, {
      placement: 'gated-home',
      read: (model: ParentModel) => model.maybeChild,
      write: writeChild,
      subscriptions: {
        when: (model: ParentModel) => model.isListening,
      },
      delivery: {
        toUpdateContext: () => [{ roomId: 'room' }],
      },
    }).withOutMessagePolicy({ fold: foldChildOutMessage })
    const dependencies = inspectBinding(
      GatedBinding,
    ).subscriptions.ticks.modelToDependencies({
      ...initialParent,
      isListening: false,
    })

    expect(Option.isNone(dependencies.maybeDependencies)).toBe(true)
  })

  it('preserves FoldContext Command lifting and exact requirements', () => {
    const result = foldCommandHome(initialParent, {
      _tag: 'GotCommandHomeMessage',
      placement: 'command-home',
      generation: 0,
      message: ChildMessage.ReportedCount(),
    })

    expect(result.commands).toHaveLength(1)
    expectTypeOf<
      Update.RequirementsOf<typeof CommandHomeBinding.fold>
    >().toEqualTypeOf<Qualify<'command-home', Command.HandlerOf<typeof Save>>>()
    expectTypeOf<
      Update.RequirementsOf<ReturnType<typeof CommandHomeBinding.report>>
    >().toEqualTypeOf<never>()
  })

  it('keeps forward-only policy requirements separate from child producers', () => {
    const result = foldForwardOnlyHome(initialParent, {
      _tag: 'GotForwardOnlyHomeMessage',
      placement: 'forward-only-home',
      generation: 0,
      message: ChildMessage.ReportedCount(),
    })

    expect(result.outMessage).toEqual(
      ParentOutMessage.ForwardedReport({ value: 2 }),
    )
    expectTypeOf(result).toEqualTypeOf<
      Update.WithRegistrationEvidence<
        Update.ReturnWithOutMessage<
          ParentModel,
          typeof ForwardOnlyComposition.Message.Type,
          ParentOutMessage,
          Scoped<'forward-only-home', Command.HandlerOf<typeof Save>>
        >,
        RequirementOfBinding<typeof ForwardOnlyHomeBinding>
      >
    >()
    expectTypeOf<
      Update.RequirementsOf<typeof ForwardOnlyHomeBinding.fold>
    >().toEqualTypeOf<
      Scoped<'forward-only-home', Command.HandlerOf<typeof Save>>
    >()
    expectTypeOf<
      Update.RequirementsOf<ReturnType<typeof ForwardOnlyHomeBinding.save>>
    >().toEqualTypeOf<
      Qualify<'forward-only-home', Command.HandlerOf<typeof Save>>
    >()
  })

  it('keeps raw policy obligations opaque and resolves their exact channels in the Composition', () => {
    const reset =
      ParentPolicyRuntime.operations.resetParentCommandHome(initialParent)
    const report =
      ParentPolicyRuntime.operations.reportParentCommandHome(initialParent)

    expect(reset.commands).toEqual([])
    expect(report.commands).toHaveLength(1)
    expectTypeOf<
      Update.RequirementsOf<ReturnType<typeof ParentCommandHomeBinding.reset>>
    >().toEqualTypeOf<never>()
    expectTypeOf<
      Update.RequirementsOf<ReturnType<typeof ParentCommandHomeBinding.report>>
    >().toEqualTypeOf<never>()
    expectTypeOf<
      Update.RequirementsOf<typeof foldParentPolicy>
    >().toEqualTypeOf<
      | Scoped<'parent-command-home', Command.HandlerOf<typeof Save>>
      | Command.HandlerOf<typeof RunPolicyWork>
    >()
    expectTypeOf<
      Update.RegistrationEvidenceOf<ReturnType<typeof foldParentPolicy>>
    >().toEqualTypeOf<RequirementOfBinding<typeof ParentCommandHomeBinding>>()
    expectTypeOf<
      CommandMessageOfReturn<ReturnType<typeof foldParentPolicy>>
    >().toEqualTypeOf<typeof ParentPolicyComposition.Message.Type>()
    expectTypeOf(reset.outMessage).toEqualTypeOf<undefined>()
    expectTypeOf(report.outMessage).toEqualTypeOf<
      ParentOutMessage | undefined
    >()
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
    const preparePulseChild = () =>
      ChildComposition.prepareBlock({
        init: Child.init,
        update: Child.update,
        subscriptions: { pulses: childSubscriptions.ticks },
        EffectsLayer: Layer.empty,
        hostHandlers: [Save, childSubscriptions.ticks, Measure],
      })
    const pulseChild: Block.FromAssemblyWithOutMessage<
      typeof ChildModel,
      typeof preparePulseChild
    > = Block.assemble(preparePulseChild)
    const ParentSchema = Schema.Struct({
      maybeChild: Schema.Option(ChildModel),
      reports: Schema.Array(Schema.Number),
      isListening: Schema.Boolean,
    })
    const NamedParentMessage = Schema.Never
    type NamedParentMessage = typeof NamedParentMessage.Type
    const foldNamedChildOutMessage = ChildOutMessage.match<
      Update.StepWithOutMessage<
        ParentModel,
        NamedParentMessage,
        ParentOutMessage
      >
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
    const ParentBaseDefinition = makeNamespace(
      'BindingNamedChildren',
    ).makeDefinition({
      Model: ParentSchema,
      Message: NamedParentMessage,
      OutMessage: ParentOutMessage,
    })
    const NamedHomeBinding = ParentBaseDefinition.makeBinding(Child, {
      placement: 'home',
      read: (model: ParentModel) => model.maybeChild,
      write: writeChild,
      delivery: {
        toUpdateContext: () => [{ roomId: 'room' }],
      },
    }).withOutMessagePolicy({ fold: foldNamedChildOutMessage })
    const RoomBinding = ParentBaseDefinition.makeBinding(pulseChild, {
      placement: 'room',
      read: (model: ParentModel) => model.maybeChild,
      write: writeChild,
      delivery: {
        toUpdateContext: () => [{ roomId: 'room' }],
      },
    }).withOutMessagePolicy({ fold: foldNamedChildOutMessage })
    const namedHomeInspection = inspectBinding(NamedHomeBinding)
    const bindings = [NamedHomeBinding, RoomBinding]
    const parentContract = ParentBaseDefinition.makeComposition({
      bindings,
    })
    const prepareParent = () =>
      parentContract.prepareBlock({
        init: () => ({ model: initialParent }),
        update: parentContract.makeUpdate({}),
        EffectsLayer: Layer.empty,
      })
    const parent: Block.FromAssemblyWithOutMessage<
      typeof ParentSchema,
      typeof prepareParent
    > = Block.assemble(prepareParent)

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
      typeof namedHomeInspection.subscriptions.ticks
    >()
    expectTypeOf(parent.managedResources['home/session']).toEqualTypeOf<
      typeof namedHomeInspection.managedResources.session
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
    expect(desktop.toParentMessage(ChildMessage.ObservedTick())).toEqual({
      _tag: 'GotHomeMessage',
      placement: 'home',
      generation: 0,
      message: ChildMessage.ObservedTick(),
    })
    expectTypeOf<
      keyof RequirementOfBinding<
        typeof HomeBinding
      >['__blockBindingRequirement']['block']
    >().toEqualTypeOf<'owner' | 'mountRequirements'>()
  })
})

describe('Block binding arity', () => {
  it('executes a rest tuple wrapped update without runtime arity checks', () => {
    const message = {
      _tag: 'GotWrappedArityMessage',
      placement: 'wrapped-arity',
      generation: 0,
      message: ArityMessage.IncreasedCount(),
    } satisfies typeof WrappedArityParentComposition.Message.Type
    const folded = foldWrappedArity(initialArityParent, message)

    expect(WrappedArityBlock.update.length).toBe(2)
    expect(folded.model.child.count).toBe(2)
    expectTypeOf(folded).toEqualTypeOf<
      Update.WithRegistrationEvidence<
        Update.Return<
          ArityParent,
          typeof WrappedArityParentComposition.Message.Type
        >,
        | RequirementOfBinding<typeof WrappedArityBinding>
        | RequirementOfBinding<typeof IgnoredMessageBinding>
        | RequirementOfBinding<typeof DefaultContextBinding>
        | RequirementOfBinding<typeof OptionalContextBinding>
      >
    >()
  })

  it('supplies the declared Message when the update implementation ignores it', () => {
    const message = {
      _tag: 'GotIgnoredMessageMessage',
      placement: 'ignored-message',
      generation: 0,
      message: ArityMessage.IncreasedCount(),
    } satisfies typeof WrappedArityParentComposition.Message.Type
    const folded = foldIgnoredMessage(initialArityParent, message)

    expect(ignoredMessageUpdate.length).toBe(1)
    expect(folded.model.child.count).toBe(1)
  })

  it('preserves default and optional update context', () => {
    const defaultMessage = {
      _tag: 'GotDefaultContextMessage',
      placement: 'default-context',
      generation: 0,
      message: ArityMessage.IncreasedCount(),
    } satisfies typeof WrappedArityParentComposition.Message.Type
    const optionalMessage = {
      _tag: 'GotOptionalContextMessage',
      placement: 'optional-context',
      generation: 0,
      message: ArityMessage.IncreasedCount(),
    } satisfies typeof WrappedArityParentComposition.Message.Type
    const defaultFold = foldDefaultContext(initialArityParent, defaultMessage)
    const optionalFold = foldOptionalContext(
      initialArityParent,
      optionalMessage,
    )

    expect(defaultFold.model.child.count).toBe(2)
    expect(optionalFold.model.child.count).toBe(1)
  })

  it('returns Steps uniformly for noarg, defaulted, and rest producers', () => {
    const defaultResult =
      WrappedArityRuntime.operations.runDefaultIncrement(initialArityParent)
    const explicitDefaultResult =
      WrappedArityRuntime.operations.runDefaultIncrement(initialArityParent, 4)
    const restResult = WrappedArityRuntime.operations.runAddMany(
      initialArityParent,
      2,
      3,
    )
    const requiredPrefixResult =
      WrappedArityBlock.operations.addWithRequiredPrefix(
        initialArityParent.child,
        2,
        'first',
        'second',
      )
    const optionalPrefixResult =
      WrappedArityBlock.operations.addWithOptionalPrefix(
        initialArityParent.child,
        undefined,
        'first',
      )
    const mixedResult = WrappedArityBlock.operations.addMixed(
      initialArityParent.child,
      1,
      'first',
    )
    const refinedResult = WrappedArityBlock.operations.addRefined(
      initialArityParent.child,
      1,
      2,
    )
    const resetResult = WrappedArityRuntime.operations.runResetArity({
      child: ArityModel.make({ count: 8 }),
    })

    expect(defaultIncrementStep.length).toBe(1)
    expect(addManyStep.length).toBe(1)
    expect(defaultResult.model.child.count).toBe(1)
    expect(explicitDefaultResult.model.child.count).toBe(4)
    expect(restResult.model.child.count).toBe(5)
    expect(requiredPrefixResult.model.count).toBe(4)
    expect(optionalPrefixResult.model.count).toBe(1)
    expect(mixedResult.model.count).toBe(2)
    expect(refinedResult.model.count).toBe(3)
    expect(resetResult.model.child.count).toBe(0)
    expectTypeOf(WrappedArityBinding.defaultIncrement).parameters.toEqualTypeOf<
      [amount?: number | undefined]
    >()
    expectTypeOf(WrappedArityBlock.operations.addMany).parameters.toEqualTypeOf<
      [model: ArityModel, ...amounts: Array<number>]
    >()
    expectTypeOf(
      WrappedArityBlock.operations.addWithRequiredPrefix,
    ).parameters.toEqualTypeOf<
      [model: ArityModel, first: number, ...labels: Array<string>]
    >()
    expectTypeOf(
      WrappedArityBlock.operations.addWithOptionalPrefix,
    ).parameters.toEqualTypeOf<
      [model: ArityModel, first?: number, ...labels: Array<string>]
    >()
    expectTypeOf(
      WrappedArityBlock.operations.addMixed,
    ).parameters.toEqualTypeOf<
      [model: ArityModel, ...values: Array<number | string>]
    >()
    expectTypeOf(
      WrappedArityBlock.operations.addRefined,
    ).parameters.toEqualTypeOf<[model: ArityModel, ...amounts: Array<1 | 2>]>()
    expectTypeOf(WrappedArityBinding.addMany).parameters.toEqualTypeOf<
      [...amounts: Array<number>]
    >()
    expectTypeOf(
      WrappedArityBinding.addWithRequiredPrefix,
    ).parameters.toEqualTypeOf<[first: number, ...labels: Array<string>]>()
    expectTypeOf(
      WrappedArityBinding.addWithOptionalPrefix,
    ).parameters.toEqualTypeOf<[first?: number, ...labels: Array<string>]>()
    expectTypeOf(WrappedArityBinding.addMixed).parameters.toEqualTypeOf<
      Array<number | string>
    >()
    expectTypeOf(WrappedArityBinding.addRefined).parameters.toEqualTypeOf<
      Array<1 | 2>
    >()
    expectTypeOf(WrappedArityBinding.resetArity).parameters.toEqualTypeOf<[]>()
  })
})

if (false) {
  const addWithPrefix = WrappedArityBlock.operations.addWithRequiredPrefix
  // @ts-expect-error The required variadic prefix cannot be omitted.
  addWithPrefix(initialArityParent.child)
  // @ts-expect-error Variadic labels must be strings.
  addWithPrefix(initialArityParent.child, 1, 2)
}

describe('Block child registration composition', () => {
  it('gives repeated ManagedResources independent placement capability keys', () => {
    const SidebarBinding = Parent.makeBinding(Child, {
      placement: 'sidebar',
      read: (model: ParentModel) => model.maybeChild,
      write: writeChild,
      delivery: {
        toUpdateContext: () => [{ roomId: 'room' }],
      },
    }).withOutMessagePolicy({ fold: foldChildOutMessage })

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
      const RepeatedNamespace = makeNamespace('BindingRepeated')
      const RepeatedMessage = defineMessageUnion({ CompletedMount: {} })
      const RepeatedMount = RepeatedNamespace.makeMount('Mount', {
        messages: [RepeatedMessage.CompletedMount],
      })

      const RepeatedComposition = RepeatedNamespace.makeDefinition({
        Model: ChildModel,
        Message: RepeatedMessage,
      }).makeComposition({
        mounts: [RepeatedMount],
      })
      const EffectsLayer = Layer.sync(BuildMarker, () => {
        buildCount += 1
        return {}
      })
      const prepareRepeated = () =>
        RepeatedComposition.prepareBlock({
          init: () => ({ model: ChildModel.make({ count: 0 }) }),
          update: RepeatedComposition.makeUpdate({
            CompletedMount: model => ({ model }),
          }),
          EffectsLayer,
          hostHandlers: [RepeatedMount],
        })
      const Repeated: Block.FromAssemblyWithoutViewOrOutMessage<
        typeof ChildModel,
        typeof prepareRepeated
      > = Block.assemble(prepareRepeated)
      const RepeatedParentModel = Schema.Struct({ child: ChildModel })
      type RepeatedParentModel = typeof RepeatedParentModel.Type
      const RepeatedParentMessage = Schema.Never
      const RepeatedParent = makeDefinition('BindingRepeatedParent', {
        Model: RepeatedParentModel,
        Message: RepeatedParentMessage,
      })
      const bindRepeated = (placement: 'first' | 'second') =>
        RepeatedParent.makeBinding(Repeated, {
          placement,
          read: (model: RepeatedParentModel) => Option.some(model.child),
          write: (model, child) => ({ ...model, child }),
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
  const GenericNamespace = makeNamespace('BindingChoice')
  const CompletedChoiceWork = Schema.TaggedStruct('CompletedChoiceWork', {})
  const FinishChoice = GenericNamespace.makeCommand('FinishChoice', {
    messages: [CompletedChoiceWork],
  })

  const makeChoice = <Value extends string>(Value: Schema.Schema<Value>) => {
    const Model = Schema.Struct({ value: Value })
    const RequestedFinish = Schema.TaggedStruct('RequestedFinish', {})
    const Message = Schema.Union([
      RequestedFinish,
      Schema.TaggedStruct('SelectedValue', { value: Value }),
      CompletedChoiceWork,
    ])
    const OutMessage = Schema.TaggedStruct('SelectedValue', { value: Value })
    const ChoiceDefinition = GenericNamespace.makeDefinition({
      Model,
      Message,
      OutMessage,
    })
    const Composition = ChoiceDefinition.makeComposition()
    const finishStep = ChoiceDefinition.makeStep(model => ({
      model,
      commands: [FinishChoice()],
    }))
    const update = Composition.makeUpdate({
      RequestedFinish: model => finishStep(model),
      SelectedValue: (_model, { value }) => ({
        model: Model.make({ value }),
        outMessage: OutMessage.make({ value }),
      }),
      CompletedChoiceWork: model => ({ model }),
    })
    const prepare = () =>
      Composition.prepareBlock({
        init: (value: Value) => ({ model: Model.make({ value }) }),
        update,
        operations: {
          finish: () => Tuple.make(RequestedFinish.make({})),
        },
        EffectsLayer: Layer.empty,
        hostHandlers: [FinishChoice],
      })
    const completedBlock: Block.FromAssemblyWithOutMessage<
      typeof Model,
      typeof prepare
    > = Block.assemble(prepare)
    return completedBlock
  }

  it('preserves a refined OutMessage payload and shared handler definition', () => {
    const Choice = makeChoice(Schema.Literals(['One', 'Two']))
    type ChoiceModel = typeof Choice.Model.Type
    type ChoiceMessage = typeof Choice.Message.Type
    type ChoiceOutMessage = typeof Choice.OutMessage.Type
    const ChoiceParentModel = Schema.Struct({ choice: Choice.Model })
    type ChoiceParentModel = typeof ChoiceParentModel.Type
    const ChoiceParentMessage = Schema.Never
    type DeclaredOutMessage =
      typeof Choice extends Readonly<{
        OutMessage: Readonly<{ Type: infer OutMessage }>
      }>
        ? OutMessage
        : never
    expectTypeOf<DeclaredOutMessage>().toEqualTypeOf<ChoiceOutMessage>()
    const ChoiceParent = makeDefinition('BindingChoiceParent', {
      Model: ChoiceParentModel,
      Message: ChoiceParentMessage,
      OutMessage: Choice.OutMessage,
    })
    const directChoicePolicy = {
      fold: (outMessage: ChoiceOutMessage) => (model: ChoiceParentModel) => ({
        model,
        outMessage,
      }),
    }
    const DirectBinding = ChoiceParent.makeBinding(Choice, {
      placement: 'direct-choice',
      read: (model: ChoiceParentModel) => Option.some(model.choice),
      write: (model, choice) => ({ ...model, choice }),
    }).withOutMessagePolicy(directChoicePolicy)
    const DirectComposition = ChoiceParent.makeComposition({
      bindings: [DirectBinding],
    })
    const Binding = ChoiceParent.makeBinding(Choice, {
      placement: 'choice',
      read: (model: ChoiceParentModel) => Option.some(model.choice),
      write: (model: ChoiceParentModel, choice: ChoiceModel) => ({
        ...model,
        choice,
      }),
    }).withOutMessagePolicy({
      fold: (outMessage: ChoiceOutMessage) => (model: ChoiceParentModel) => ({
        model,
        outMessage,
      }),
    })
    const ChoiceComposition = ChoiceParent.makeComposition({
      bindings: [Binding],
    })
    const foldChoice = ChoiceComposition.makeUpdate({})

    const result = foldChoice(
      { choice: Choice.Model.make({ value: 'One' }) },
      {
        _tag: 'GotChoiceMessage',
        placement: 'choice',
        generation: 0,
        message: { _tag: 'SelectedValue', value: 'Two' },
      },
    )

    expect(result.outMessage).toEqual({ _tag: 'SelectedValue', value: 'Two' })
    expectTypeOf<
      CommandMessageOfReturn<ReturnType<typeof DirectBinding.fold>>
    >().toEqualTypeOf<typeof DirectComposition.Message.Type>()
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
