import { Context, Effect, Scope } from 'effect'

import { registerResource } from './identity.js'
import { type ActiveInstance, CurrentInstance } from './instanceContext.js'

declare const RuntimeCapabilityTypeId: unique symbol

/** @internal Identifies an opaque Runtime capability without inspecting its owner. */
export interface RuntimeCapabilityIdentity {
  readonly [RuntimeCapabilityTypeId]: unknown
}

/** Authority installed by the matching Runtime occurrence, never by graph construction. */
export interface RuntimeCapability<Owner> extends RuntimeCapabilityIdentity {
  readonly [RuntimeCapabilityTypeId]: (owner: Owner) => Owner
}

/** @internal The existing occurrence state needed by the capability bridge. */
export interface RuntimeCapabilityOccurrence extends ActiveInstance {
  readonly context: Context.Context<never>
  readonly scope: Scope.Closeable
}

/** @internal A private, authenticated view of one active occurrence's real refs. */
export interface RuntimeAuthority {
  readonly implementation: object
  readonly node: RuntimeCapabilityOccurrence
  readonly isActive: () => boolean
}

const authorities = new WeakSet<object>()
const declarations = new WeakMap<
  object,
  Context.Service<any, RuntimeAuthority>
>()
const ownerKeys = new WeakMap<object, string>()
let nextOwnerKey = 0

/** @internal Registers only one fresh implementation acquisition. */
export const declareRuntimeCapability = <
  Owner extends Readonly<{ id: string }>,
>(
  implementation: object,
  owner: Owner,
): Context.Service<RuntimeCapability<Owner>, RuntimeAuthority> => {
  if (declarations.has(implementation)) {
    throw new Error(
      '[foldkit] Opaque execution requires a fresh implementation acquisition.',
    )
  }

  const key =
    ownerKeys.get(owner) ??
    `foldkit/RuntimeCapability/${owner.id}/${nextOwnerKey++}`
  ownerKeys.set(owner, key)

  const service = Context.Service<RuntimeCapability<Owner>, RuntimeAuthority>(
    key,
  )
  declarations.set(implementation, service)
  registerResource(service.key)

  return service
}

/** @internal The Runtime installs this beside the occurrence's allocated resource refs. */
export const installRuntimeCapability = (
  implementation: object,
  node: RuntimeCapabilityOccurrence,
  isAcquisitionActive: () => boolean,
): Context.Context<never> => {
  const service = declarations.get(implementation)

  if (service === undefined) {
    return Context.empty()
  }

  const authority: RuntimeAuthority = Object.freeze({
    implementation,
    node,
    isActive: () => isAcquisitionActive() && node.isActive,
  })
  authorities.add(authority)

  return Context.makeUnsafe(Context.make(service, authority).mapUnsafe)
}

/** @internal Checks both acquisition identity and the active occurrence cursor. */
export const assertRuntimeAuthority = (
  authority: RuntimeAuthority,
  implementation: object,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const cursor = yield* CurrentInstance

    if (
      !authorities.has(authority) ||
      authority.implementation !== implementation ||
      !authority.isActive() ||
      (cursor !== undefined && cursor.node !== authority.node)
    ) {
      return yield* Effect.die(
        new Error(
          '[foldkit] Opaque execution requires its matching active Runtime occurrence.',
        ),
      )
    }
  })

const lifetimes = new WeakMap<object, () => boolean>()

/** @internal Ties an acquired implementation to its constructor Scope. */
export const registerRuntimeAcquisition = (
  implementation: object,
  isActive: () => boolean,
): void => {
  lifetimes.set(implementation, isActive)
}

/** @internal Looks up the acquisition selected by the private native graph. */
export const runtimeAcquisitionIsActive = (
  implementation: object,
): (() => boolean) => lifetimes.get(implementation) ?? (() => true)
