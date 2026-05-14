import { type Equivalence, Record, type Schema, type Stream } from 'effect'

type ResolveMessage<T> = T extends Schema.Top ? Schema.Schema.Type<T> : T

/** A reactive binding between Model state and a long-running stream of Messages. */
export type Subscription<Model, Message, StreamDeps, Resources = never> = {
  readonly modelToDependencies: (model: Model) => StreamDeps
  readonly equivalence?: Equivalence.Equivalence<StreamDeps>
  readonly dependenciesToStream: (
    deps: StreamDeps,
    readDependencies: () => StreamDeps,
  ) => Stream.Stream<ResolveMessage<Message>, never, Resources>
}

type SubscriptionConfig<Model, Message, StreamDeps, Resources = never> = {
  readonly schema: Schema.Schema<StreamDeps>
} & Subscription<Model, Message, StreamDeps, Resources>

/** A record of named subscription configurations, keyed by dependency field name. */
export type Subscriptions<
  Model,
  Message,
  SubscriptionDependencies extends Schema.Struct<any>,
  Resources = never,
> = {
  readonly [K in keyof Schema.Schema.Type<SubscriptionDependencies>]: SubscriptionConfig<
    Model,
    Message,
    Schema.Schema.Type<SubscriptionDependencies>[K],
    Resources
  >
}

/** Creates type-safe subscription configurations from a dependency schema. */
export const makeSubscriptions =
  <SubscriptionDependencies extends Schema.Struct<any>>(
    SubscriptionDependencies: SubscriptionDependencies,
  ) =>
  <Model, Message, Resources = never>(configs: {
    readonly [K in keyof Schema.Schema.Type<SubscriptionDependencies>]: {
      readonly modelToDependencies: (
        model: Model,
      ) => Schema.Schema.Type<SubscriptionDependencies>[K]
      readonly equivalence?:
        | Equivalence.Equivalence<
            Schema.Schema.Type<SubscriptionDependencies>[K]
          >
        | undefined
      readonly dependenciesToStream: (
        deps: Schema.Schema.Type<SubscriptionDependencies>[K],
        readDependencies: () => Schema.Schema.Type<SubscriptionDependencies>[K],
      ) => Stream.Stream<ResolveMessage<Message>, never, Resources>
    }
  }): Subscriptions<Model, Message, SubscriptionDependencies, Resources> =>
    /* eslint-disable @typescript-eslint/consistent-type-assertions */
    Record.map(
      configs,
      ({ modelToDependencies, equivalence, dependenciesToStream }, key) => ({
        schema: SubscriptionDependencies.fields[key],
        modelToDependencies,
        equivalence,
        dependenciesToStream,
      }),
    ) as unknown as Subscriptions<
      Model,
      Message,
      SubscriptionDependencies,
      Resources
    >
/* eslint-enable @typescript-eslint/consistent-type-assertions */
