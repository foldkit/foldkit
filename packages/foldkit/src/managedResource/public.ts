declare const HandlerTypeId: unique symbol
declare const ManagedResourceBrand: unique symbol

type Invariant<Value> = (value: Value) => Value

/**
 * The service required by a ManagedResource whose lifecycle is supplied by a
 * Layer. Its name, decoded acquire params, and resource value identify the
 * handler contract.
 */
export interface Handler<Name extends string, Params, Value> {
  readonly [HandlerTypeId]: Readonly<{
    name: Invariant<Name>
    params: Invariant<Params>
    value: Invariant<Value>
  }>
}

/** Branded identity type for a managed resource, used in the Effect R channel. */
export interface ManagedResourceService<Key extends string> {
  readonly [ManagedResourceBrand]: Key
}

export { tag, ResourceNotAvailable, make } from './managedResource.js'

export { lift, aggregate } from './managedResource.js'

export type {
  ManagedResource,
  Value,
  ServiceOf,
  HandlerOf,
  Entry,
  LayeredEntry,
  ManagedResources,
  ManagedResourceConfig,
  ServicesOf,
  ToLayer,
} from './managedResource.js'
