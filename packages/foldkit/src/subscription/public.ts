declare const HandlerTypeId: unique symbol

type Invariant<Value> = (value: Value) => Value

/**
 * The service required by a Subscription whose implementation is supplied by
 * a Layer. Its name, decoded dependencies, and declared Message identify the
 * handler contract.
 */
export interface Handler<Name extends string, Dependencies, Message> {
  readonly [HandlerTypeId]: Readonly<{
    name: Invariant<Name>
    dependencies: Invariant<Dependencies>
    message: Invariant<Message>
  }>
}

export { RegistryEntriesTypeId, aggregate, lift, make } from './subscription.js'

/** @internal Names keyed inspection templates and selected occurrences in downstream declarations. */
export type { KeyedTemplate, KeyedSelection } from './subscription.js'

export type {
  EntryGates,
  EntryWithoutKeepAlive,
  GatedDependencies,
  HandlerOf,
  LayeredEntryWithKeepAlive,
  LayeredEntryWithoutKeepAlive,
  Registrations,
  Registry,
  RegistryEntries,
  Subscription,
  Subscriptions,
  ToLayerWithKeepAlive,
  ToLayerWithoutKeepAlive,
} from './subscription.js'
