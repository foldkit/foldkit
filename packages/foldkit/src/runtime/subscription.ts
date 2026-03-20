import { Record, type Schema, type Stream } from 'effect'

type ResolveMessage<T> = [T] extends [Schema.Schema.Any]
  ? Schema.Schema.Type<T>
  : T

/** A reactive binding between Model state and a long-running stream of Messages. */
export type Subscription<Model, Message, StreamDeps, Resources = never> = {
  readonly modelToDependencies: (model: Model) => StreamDeps
  readonly depsToStream: (
    deps: StreamDeps,
  ) => Stream.Stream<ResolveMessage<Message>, never, Resources>
}

type SubscriptionConfig<Model, Message, StreamDeps, Resources = never> = {
  readonly schema: Schema.Schema<StreamDeps>
} & Subscription<Model, Message, StreamDeps, Resources>

/** A record of named subscription configurations, keyed by dependency field name. */
export type Subscriptions<
  Model,
  Message,
  SubscriptionDeps extends Schema.Struct<any>,
  Resources = never,
> = {
  readonly [K in keyof Schema.Schema.Type<SubscriptionDeps>]: SubscriptionConfig<
    Model,
    Message,
    Schema.Schema.Type<SubscriptionDeps>[K],
    Resources
  >
}

/** Creates type-safe subscription configurations from a dependency schema. */
export const makeSubscriptions =
  <SubscriptionDeps extends Schema.Struct<any>>(
    SubscriptionDeps: SubscriptionDeps,
  ) =>
  <Model, Message, Resources = never>(configs: {
    [K in keyof Schema.Schema.Type<SubscriptionDeps>]: {
      modelToDependencies: (
        model: Model,
      ) => Schema.Schema.Type<SubscriptionDeps>[K]
      depsToStream: (
        deps: Schema.Schema.Type<SubscriptionDeps>[K],
      ) => Stream.Stream<ResolveMessage<Message>, never, Resources>
    }
  }) =>
    Record.map(configs, ({ modelToDependencies, depsToStream }, key) => ({
      schema: SubscriptionDeps.fields[key],
      modelToDependencies,
      depsToStream,
    }))
