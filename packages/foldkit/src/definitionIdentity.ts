import type { Context } from 'effect'

import type { Handler as CommandHandler } from './command/public.js'
import type { Handler as MountHandler } from './mount/public.js'

/** @internal The exact runtime contract of a Layer-backed Command or Mount. */
export type DefinitionIdentity = Readonly<{
  kind: 'Command' | 'Mount'
  name: string
  token: symbol
  service: Context.Service<any, any>
}>

const definitionIdentities = new WeakMap<object, DefinitionIdentity>()

/** @internal Preserves a definition's identity through Message lifts. */
export const InvocationIdentityTypeId = Symbol('foldkit/Operation/Identity')

/** @internal Preserves a definition's name separately from its displayed name. */
export const InvocationNameTypeId = Symbol('foldkit/Operation/Name')

/** @internal Reads the originating definition identity from an invocation. */
export const invocationIdentity = (
  invocation: object,
): DefinitionIdentity | undefined =>
  Reflect.get(invocation, InvocationIdentityTypeId)

/** @internal Reads the definition name an invocation was created with. */
export const invocationName = (invocation: object): string | undefined =>
  Reflect.get(invocation, InvocationNameTypeId)

/** @internal Records the identity supplied by a definition's handler Layer. */
export const registerIdentity = (
  definition: object,
  identity: DefinitionIdentity,
): void => {
  definitionIdentities.set(definition, identity)
}

/** @internal Reads the handler identity of a definition. */
export const identityOf = (
  definition: object,
): DefinitionIdentity | undefined => definitionIdentities.get(definition)

/** @internal Gives a derived definition its source's identity. */
export const copyIdentity = (source: object, target: object): void => {
  const identity = definitionIdentities.get(source)
  if (identity !== undefined) {
    definitionIdentities.set(target, identity)
  }
}

type HandlerCapability<Requirements> =
  Requirements extends CommandHandler<infer Name, infer Args, infer Message>
    ? CommandHandler<Name, Args, Message>
    : Requirements extends MountHandler<infer Name, infer Input, infer Message>
      ? MountHandler<Name, Input, Message>
      : never

/** @internal Rejects Command and Mount handlers as requirements of handler construction. */
export type ValidateConstructionRequirements<Requirements> = [
  HandlerCapability<Requirements>,
] extends [never]
  ? unknown
  : Readonly<{
      'Foldkit operation handlers are unavailable during handler construction': HandlerCapability<Requirements>
    }>
