import { Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({ count: Schema.Number })
export type Model = typeof Model.Type
export const Message = defineMessageUnion({ CompletedTick: {} })
export type Message = typeof Message.Type
export const InMessage = defineInMessageUnion({ RequestedReset: {} })
export type InMessage = typeof InMessage.Type
export const CounterKey = Symbol('InMessagePlanOwnership')
export const CounterBlock = Block.make('InMessagePlanOwnership', {
  key: CounterKey,
  Model,
  Message,
  InMessage,
  InitArgs: Schema.Tuple([]),
})
export const FirstMount = CounterBlock.makeMount('First', {
  messages: [Message.CompletedTick],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedTick())
  },
})
export const SecondMount = CounterBlock.makeMount('Second', {
  messages: [Message.CompletedTick],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedTick())
  },
})
export const first = CounterBlock.makeComposition({ mounts: [FirstMount] })
export const second = CounterBlock.makeComposition({ mounts: [SecondMount] })
export const firstInit = first.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))
export const secondInit = second.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))
export const firstUpdate = first.makeUpdate({
  CompletedTick: CounterBlock.makeNoopStep(),
})
export const secondUpdate = second.makeUpdate({
  CompletedTick: CounterBlock.makeNoopStep(),
})
export const firstInMessageUpdate = first.makeInMessageUpdate({
  RequestedReset: CounterBlock.makeFieldsStep(() => ({ count: () => 0 })),
})
export const secondInMessageUpdate = second.makeInMessageUpdate({
  RequestedReset: CounterBlock.makeFieldsStep(() => ({ count: () => 0 })),
})
export const EffectsLayer = Layer.mergeAll(FirstMount.layer, SecondMount.layer)
export const firstBody = {
  children: [],
  init: firstInit,
  update: firstUpdate,
  inMessageUpdate: firstInMessageUpdate,
  EffectsLayer,
}
export const secondBody = {
  children: [],
  init: secondInit,
  update: secondUpdate,
  inMessageUpdate: secondInMessageUpdate,
  EffectsLayer,
}
export const alignedLayer = (isFirst: boolean) =>
  CounterBlock.makeLayer(Effect.succeed(isFirst ? firstBody : secondBody))
export const firstLayer = CounterBlock.makeLayer(Effect.succeed(firstBody))

export const ChildKey = Symbol('ConstructorUnionChild')
export const ChildBlock = Block.make('ConstructorUnionChild', {
  key: ChildKey,
  Model: Schema.Number,
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
const childComposition = ChildBlock.makeComposition()
export const childLayer = ChildBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: childComposition.makeInit(() => ({ model: 1 })),
    update: childComposition.makeUpdate({}),
  }),
)
export const ParentKey = Symbol('ConstructorUnionParent')
export const ParentModel = Schema.Struct({
  first: Schema.Number,
  second: Schema.Number,
})
export type ParentModel = typeof ParentModel.Type
export const ParentBlock = Block.make('ConstructorUnionParent', {
  key: ParentKey,
  Model: ParentModel,
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
export const FirstBinding = ParentBlock.makeRequiredFieldBinding(ChildBlock, {
  field: 'first',
  init: false,
})
export const SecondBinding = ParentBlock.makeRequiredFieldBinding(ChildBlock, {
  field: 'second',
  init: false,
})
export const firstParent = ParentBlock.makeComposition({
  bindings: [FirstBinding],
})
export const secondParent = ParentBlock.makeComposition({
  bindings: [SecondBinding],
})
export const firstParentInit = firstParent.makeInit(() => ({
  model: ParentModel.make({ first: 0, second: 0 }),
}))
export const secondParentInit = secondParent.makeInit(() => ({
  model: ParentModel.make({ first: 0, second: 0 }),
}))
export const firstParentUpdate = firstParent.makeUpdate({})
export const secondParentUpdate = secondParent.makeUpdate({})
export const alignedParentLayer = (isFirst: boolean) =>
  ParentBlock.makeLayer(
    Effect.gen(function* () {
      const firstChild = yield* FirstBinding
      const secondChild = yield* SecondBinding

      return isFirst
        ? {
            children: [firstChild],
            init: firstParentInit,
            update: firstParentUpdate,
          }
        : {
            children: [secondChild],
            init: secondParentInit,
            update: secondParentUpdate,
          }
    }),
  ).pipe(Layer.provide(childLayer))

export const EffectsMessage = defineMessageUnion({
  ClickedFirst: {},
  ClickedSecond: {},
  CompletedFirst: {},
  CompletedSecond: {},
})
export type EffectsMessage = typeof EffectsMessage.Type
export const EffectsKey = Symbol('ConstructorUnionEffects')
export const EffectsBlock = Block.make('ConstructorUnionEffects', {
  key: EffectsKey,
  Model: Schema.Number,
  Message: EffectsMessage,
  InitArgs: Schema.Tuple([]),
})
export const First = EffectsBlock.makeCommand('First', {
  messages: [EffectsMessage.CompletedFirst],
  handler: function* () {
    return () => Effect.succeed(EffectsMessage.CompletedFirst())
  },
})
export const Second = EffectsBlock.makeCommand('Second', {
  messages: [EffectsMessage.CompletedSecond],
  handler: function* () {
    return () => Effect.succeed(EffectsMessage.CompletedSecond())
  },
})
const effectsComposition = EffectsBlock.makeComposition()
export const effectsInit = effectsComposition.makeInit(() => ({ model: 0 }))
export const bothUpdate = effectsComposition.makeUpdate({
  ClickedFirst: EffectsBlock.makeCommandsStep(() => [First()]),
  ClickedSecond: EffectsBlock.makeCommandsStep(() => [Second()]),
  CompletedFirst: EffectsBlock.makeNoopStep(),
  CompletedSecond: EffectsBlock.makeNoopStep(),
})
export const firstOnlyUpdate = effectsComposition.makeUpdate({
  ClickedFirst: EffectsBlock.makeCommandsStep(() => [First()]),
  ClickedSecond: EffectsBlock.makeNoopStep(),
  CompletedFirst: EffectsBlock.makeNoopStep(),
  CompletedSecond: EffectsBlock.makeNoopStep(),
})
export const secondOnlyUpdate = effectsComposition.makeUpdate({
  ClickedFirst: EffectsBlock.makeNoopStep(),
  ClickedSecond: EffectsBlock.makeCommandsStep(() => [Second()]),
  CompletedFirst: EffectsBlock.makeNoopStep(),
  CompletedSecond: EffectsBlock.makeNoopStep(),
})
export const fullEffectsLayer = EffectsBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: effectsInit,
    update: bothUpdate,
    EffectsLayer: Layer.mergeAll(First.layer, Second.layer),
  }),
)
export const correlatedEffectsLayer = (isFirst: boolean) =>
  EffectsBlock.makeLayer(
    Effect.succeed(
      isFirst
        ? {
            children: [],
            init: effectsInit,
            update: firstOnlyUpdate,
            EffectsLayer: First.layer,
          }
        : {
            children: [],
            init: effectsInit,
            update: secondOnlyUpdate,
            EffectsLayer: Second.layer,
          },
    ),
  )

export const HostKey = Symbol('ConstructorUnionHost')
export const HostBlock = Block.make('ConstructorUnionHost', {
  key: HostKey,
  Model: Schema.Number,
  Message: EffectsMessage,
  InitArgs: Schema.Tuple([]),
})
export const HostFirst = HostBlock.makeCommand('First', {
  messages: [EffectsMessage.CompletedFirst],
})
export const HostSecond = HostBlock.makeCommand('Second', {
  messages: [EffectsMessage.CompletedSecond],
})
export const firstHandlers = HostFirst.toLayer(
  Effect.succeed(() => Effect.succeed(EffectsMessage.CompletedFirst())),
)
export const secondHandlers = HostSecond.toLayer(
  Effect.succeed(() => Effect.succeed(EffectsMessage.CompletedSecond())),
)
const hostComposition = HostBlock.makeComposition()
const hostInit = hostComposition.makeInit(() => ({ model: 0 }))
const hostFirstUpdate = hostComposition.makeUpdate({
  ClickedFirst: HostBlock.makeCommandsStep(() => [HostFirst()]),
  ClickedSecond: HostBlock.makeNoopStep(),
  CompletedFirst: HostBlock.makeNoopStep(),
  CompletedSecond: HostBlock.makeNoopStep(),
})
const hostSecondUpdate = hostComposition.makeUpdate({
  ClickedFirst: HostBlock.makeNoopStep(),
  ClickedSecond: HostBlock.makeCommandsStep(() => [HostSecond()]),
  CompletedFirst: HostBlock.makeNoopStep(),
  CompletedSecond: HostBlock.makeNoopStep(),
})
export const firstHostLayer = HostBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: hostInit,
    update: hostFirstUpdate,
    hostHandlers: [HostFirst],
  }),
)
export const secondHostLayer = HostBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: hostInit,
    update: hostSecondUpdate,
    hostHandlers: [HostSecond],
  }),
)
export const selectedFirstHostLayer =
  HostBlock.provideHandlers(firstHandlers)(firstHostLayer)
export const selectedSecondHostLayer =
  HostBlock.provideHandlers(secondHandlers)(secondHostLayer)

export const InputKey = Symbol('ConstructorUnionInputs')
export const InputMessage = defineInMessageUnion({ RequestedRead: {} })
export type InputMessage = typeof InputMessage.Type
export const InputBlock = Block.make('ConstructorUnionInputs', {
  key: InputKey,
  Model: Schema.Number,
  Message: EffectsMessage,
  InMessage: InputMessage,
  InitArgs: Schema.Tuple([]),
})
export const InputFirst = InputBlock.makeCommand('First', {
  messages: [EffectsMessage.CompletedFirst],
  handler: function* () {
    return () => Effect.succeed(EffectsMessage.CompletedFirst())
  },
})
export const InputSecond = InputBlock.makeCommand('Second', {
  messages: [EffectsMessage.CompletedSecond],
  handler: function* () {
    return () => Effect.succeed(EffectsMessage.CompletedSecond())
  },
})
const inputComposition = InputBlock.makeComposition()
const inputInit = inputComposition.makeInit(() => ({ model: 0 }))
const inputUpdate = inputComposition.makeUpdate({
  ClickedFirst: InputBlock.makeNoopStep(),
  ClickedSecond: InputBlock.makeNoopStep(),
  CompletedFirst: InputBlock.makeNoopStep(),
  CompletedSecond: InputBlock.makeNoopStep(),
})
export const firstInputBody = {
  children: [],
  init: inputInit,
  update: inputUpdate,
  inMessageUpdate: inputComposition.makeInMessageUpdate({
    RequestedRead: InputBlock.makeCommandsStep(() => [InputFirst()]),
  }),
  EffectsLayer: InputFirst.layer,
}
export const secondInputBody = {
  children: [],
  init: inputInit,
  update: inputUpdate,
  inMessageUpdate: inputComposition.makeInMessageUpdate({
    RequestedRead: InputBlock.makeCommandsStep(() => [InputSecond()]),
  }),
  EffectsLayer: InputSecond.layer,
}
export const correlatedInputLayer = (isFirst: boolean) =>
  InputBlock.makeLayer(
    Effect.succeed(isFirst ? firstInputBody : secondInputBody),
  )
