import type { Equivalence, Schema, Stream } from 'effect'

type DependenciesSchema<Dependencies> = Schema.Schema<Dependencies> & {
  readonly fields: Schema.Struct.Fields
}

type EntryWithoutKeepAlive<Model, Message, Dependencies, Services> = Readonly<{
  dependenciesSchema: DependenciesSchema<Dependencies>
  modelToDependencies: (model: Model) => Dependencies
  keepAliveEquivalence?: never
  dependenciesToStream: (
    dependencies: Dependencies,
  ) => Stream.Stream<Message, never, Services>
}>

type EntryWithKeepAlive<Model, Message, Dependencies, Services> = Readonly<{
  dependenciesSchema: DependenciesSchema<Dependencies>
  modelToDependencies: (model: Model) => Dependencies
  keepAliveEquivalence: Equivalence.Equivalence<Dependencies>
  dependenciesToStream: (
    dependencies: Dependencies,
    readDependencies: () => Dependencies,
  ) => Stream.Stream<Message, never, Services>
}>

/** @internal A Model-driven Stream the Runtime restarts whenever the
 *  dependencies it projects from the Model change. With
 *  `keepAliveEquivalence`, dependencies the equivalence treats as equal leave
 *  the Stream running, and the Stream reads the latest dependencies through
 *  `readDependencies`. */
export type Subscription<Model, Message, Dependencies, Services = never> =
  | EntryWithoutKeepAlive<Model, Message, Dependencies, Services>
  | EntryWithKeepAlive<Model, Message, Dependencies, Services>

/** @internal Subscriptions keyed by name. */
export type Subscriptions<Model, Message, Services = never> = Readonly<
  Record<string, Subscription<Model, Message, any, Services>>
>
