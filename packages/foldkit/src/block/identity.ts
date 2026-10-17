import type { Context } from 'effect'

import type { InstanceKey } from './instanceContext.js'

/** @internal The local identity shared by one Block's declarations. */
export type NamedIdentity = Readonly<{ id: string }>

/** @internal The exact runtime contract of a Layer-backed Foldkit operation. */
export type DefinitionIdentity = Readonly<{
  kind: 'Command' | 'Subscription' | 'Mount' | 'ManagedResource'
  name: string
  token: symbol
  service: Context.Service<any, any>
}>

/** @internal An owned operation's definition identity and local readable name. */
export type OwnedDefinition = Readonly<{
  owner: NamedIdentity
  localName: string
  identity: DefinitionIdentity
}>

const definitionIdentities = new WeakMap<object, DefinitionIdentity>()
const ownedDefinitions = new WeakMap<object, OwnedDefinition>()
const invocationOwners = new Map<symbol, OwnedDefinition>()
const declarations = new WeakMap<NamedIdentity, Map<string, object>>()
const blockHostIdentities = new WeakMap<
  object,
  ReadonlyArray<DefinitionIdentity>
>()
const handlerKeys = new Set<string>()
const resourceKeys = new Set<string>()

/** Property key retaining the Mount definitions owned directly by a Block.
 * Composition uses it to distinguish local registrations from descendant
 * Mounts collected through child Bindings. */
export const LocalMountsTypeId = Symbol('foldkit/Block/LocalMounts')

/** @internal Preserves an operation's definition identity through Message lifts. */
export const InvocationIdentityTypeId = Symbol('foldkit/Operation/Identity')

/** @internal Preserves a local definition name separately from its displayed path. */
export const InvocationNameTypeId = Symbol('foldkit/Operation/Name')

/** @internal Carries the local placement from a binding into its view boundary. */
export const ViewScopeTypeId = Symbol('foldkit/Block/ViewScope')

/** @internal Connects a rendered occurrence to its registered child binding. */
export type ViewScope = Readonly<{
  placement: string
  binding: object
  key?: InstanceKey
  identity: ViewIdentity
}>

/** @internal The graph declared by the Block authoring a view. */
export type ViewIdentity = Readonly<{
  owner: NamedIdentity
  mounts: ReadonlyArray<object>
  childBindings: ReadonlyArray<object>
}>

/** @internal Reads the exact originating declaration from an operation value. */
export const invocationIdentity = (
  invocation: object,
): DefinitionIdentity | undefined =>
  Reflect.get(invocation, InvocationIdentityTypeId)

/** @internal Reads the original operation name before binding prefixes. */
export const invocationName = (invocation: object): string | undefined =>
  Reflect.get(invocation, InvocationNameTypeId)

/** @internal Records the identity supplied by a primitive's handler Layer. */
export const registerIdentity = (
  definition: object,
  identity: DefinitionIdentity,
): void => {
  definitionIdentities.set(definition, identity)
  handlerKeys.add(identity.service.key)
}

/** @internal Associates an operation declaration with its named Block. */
export const registerDefinition = (
  owner: NamedIdentity,
  definition: object,
  localName: string,
): void => {
  const identity = definitionIdentities.get(definition)

  if (identity === undefined) {
    throw new Error(
      `[foldkit] ${owner.id}/${localName} has no handler identity.`,
    )
  }

  const definitions = declarations.get(owner) ?? new Map<string, object>()
  const key = `${identity.kind}/${localName}`
  const existing = definitions.get(key)

  if (existing !== undefined && existing !== definition) {
    throw new Error(
      `[foldkit] Block "${owner.id}" declares ${identity.kind} "${localName}" more than once.`,
    )
  }

  definitions.set(key, definition)
  declarations.set(owner, definitions)
  const owned = { owner, localName, identity }
  ownedDefinitions.set(definition, owned)
  invocationOwners.set(identity.token, owned)
}

/** @internal Registers a ManagedResource accessor's Context key. */
export const registerResource = (key: string): void => {
  resourceKeys.add(key)
}

/** @internal Reads the exact handler identity for a declaration. */
export const identityOf = (
  definition: object,
): DefinitionIdentity | undefined => definitionIdentities.get(definition)

/** @internal Reads an operation's local Block identity. */
export const ownerOf = (definition: object): OwnedDefinition | undefined =>
  ownedDefinitions.get(definition)

/** @internal Reads an operation's owner after Message and effect mapping. */
export const ownerOfInvocation = (
  invocation: object,
): OwnedDefinition | undefined => {
  const identity = invocationIdentity(invocation)
  return identity === undefined
    ? undefined
    : invocationOwners.get(identity.token)
}

/** @internal Reads an operation owner from the identity stored by its handler. */
export const ownerOfIdentityToken = (
  token: symbol,
): OwnedDefinition | undefined => invocationOwners.get(token)

/** @internal Retains the host contracts declared by one completed block. */
export const registerBlockHostIdentities = (
  block: object,
  identities: ReadonlyArray<DefinitionIdentity>,
): void => {
  blockHostIdentities.set(block, identities)
}

/** @internal Reads the host contracts retained by one completed block. */
export const hostIdentitiesOf = (
  block: object,
): ReadonlyArray<DefinitionIdentity> => blockHostIdentities.get(block) ?? []

/** @internal Preserves source evidence when an entry is lifted or scoped. */
export const copyIdentity = (source: object, target: object): void => {
  const identity = definitionIdentities.get(source)
  if (identity !== undefined) {
    definitionIdentities.set(target, identity)
  }
  const owned = ownedDefinitions.get(source)
  if (owned !== undefined) {
    ownedDefinitions.set(target, owned)
  }
}

/** @internal Reads the operations declared by a named Block. */
export const definitionsOf = (
  owner: NamedIdentity,
): ReadonlyArray<OwnedDefinition> =>
  globalThis.Array.from(declarations.get(owner)?.values() ?? []).flatMap(
    definition => {
      const owned = ownedDefinitions.get(definition)

      return owned === undefined ? [] : [owned]
    },
  )

/** @internal Identifies Context keys belonging to handler declarations. */
export const isHandlerKey = (key: string): boolean => handlerKeys.has(key)

/** @internal Identifies Context keys belonging to ManagedResource accessors. */
export const isResourceKey = (key: string): boolean => resourceKeys.has(key)
