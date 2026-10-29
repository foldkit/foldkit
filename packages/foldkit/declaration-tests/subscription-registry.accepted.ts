import { Context, Effect, Layer, Option, Schema, Stream } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import * as Subscription from 'foldkit/subscription'

export class Clock extends Context.Service<Clock, Readonly<{ now: number }>>()(
  'DeclarationSubscriptionClock',
) {}
export class Logger extends Context.Service<
  Logger,
  Readonly<{ write: () => void }>
>()('DeclarationSubscriptionLogger') {}

export const Model = Schema.Struct({ count: Schema.Number })
export const Message = defineMessageUnion({ Ticked: {}, Logged: {} })
export const DeclarationSubscriptionRegistryDefinition = Block.makeDefinition(
  'DeclarationSubscriptionRegistry',
  {
    Model,
    Message,
  },
)
export const subscriptions =
  DeclarationSubscriptionRegistryDefinition.makeSubscriptions(entry => ({
    clock: entry('Clock', {
      messages: [Message.Ticked],
      when: model => model.count > 0,
      handler: function* () {
        yield* Clock
        yield* Effect.fail<'ClockUnavailable'>('ClockUnavailable')
        return () => Stream.empty
      },
    }),
    logger: entry('Logger', {
      messages: [Message.Logged],
      when: () => false,
      handler: function* () {
        yield* Logger
        yield* Effect.fail<'LoggerUnavailable'>('LoggerUnavailable')
        return () => Stream.empty
      },
    }),
  }))

export const DeclarationSubscriptionRegistryComposition =
  DeclarationSubscriptionRegistryDefinition.makeComposition()
const prepareRegistryBlock = () =>
  DeclarationSubscriptionRegistryComposition.prepareBlock({
    init: DeclarationSubscriptionRegistryComposition.makeInit(() => ({
      model: Model.make({ count: 0 }),
    })),
    update: DeclarationSubscriptionRegistryComposition.makeUpdate({
      Ticked: model => ({
        model,
      }),
      Logged: model => ({
        model,
      }),
    }),
    subscriptions,
    EffectsLayer: subscriptions.layer,
  })
export const registryBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareRegistryBlock
> = Block.assemble(prepareRegistryBlock)

export const aggregated = Subscription.aggregate(subscriptions)
export const lifted = Subscription.lift(subscriptions)<
  Readonly<{ child: typeof Model.Type }>,
  typeof Message.Type
>({
  read: model => Option.some(model.child),
  toParentMessage: message => message,
})

export const emptySubscriptions =
  DeclarationSubscriptionRegistryDefinition.makeSubscriptions(() => ({}))
export const mixedSubscriptions =
  DeclarationSubscriptionRegistryDefinition.makeSubscriptions(entry => ({
    attached: entry('Attached', {
      messages: [Message.Ticked],
      handler: function* () {
        return () => Stream.empty
      },
    }),
    hosted: entry('Hosted', {
      messages: [Message.Logged],
      when: model => model.count > 0,
    }),
  }))

export const gatedDependencies =
  DeclarationSubscriptionRegistryDefinition.makeSubscriptions(entry => ({
    count: entry(
      'Count',
      { count: Schema.Number },
      {
        messages: [Message.Ticked],
        when: model => model.count > 0,
        modelToDependencies: model => ({ count: model.count }),
        handler: function* () {
          return () => Stream.empty
        },
      },
    ),
    retainedCount: entry(
      'RetainedCount',
      { count: Schema.Number },
      {
        messages: [Message.Ticked],
        when: model => model.count > 0,
        modelToDependencies: model => ({ count: model.count }),
        keepAliveEquivalence: () => true,
        handler: function* () {
          return (_dependencies, readDependencies) =>
            Stream.succeed(Message.Ticked()).pipe(
              Stream.filter(() => readDependencies().count > 0),
            )
        },
      },
    ),
  }))

export const lowLevelGated = Subscription.make<
  typeof Model.Type,
  typeof Message.Type
>()(entry => ({
  clock: entry('LowLevelGatedClock', {
    messages: [Message.Ticked],
    when: model => model.count > 0,
  }),
}))

export type RegistryLayer = typeof subscriptions.layer
export type EmptyRegistryLayer = typeof emptySubscriptions.layer
export type ExpectedHandlers =
  | Subscription.HandlerOf<typeof subscriptions.clock>
  | Subscription.HandlerOf<typeof subscriptions.logger>
export type ExactLayerProof = Layer.Layer<
  ExpectedHandlers,
  'ClockUnavailable' | 'LoggerUnavailable',
  Clock | Logger
>
