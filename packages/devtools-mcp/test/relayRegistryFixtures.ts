import { ConfigProvider, Effect, HashSet, Option, Ref } from 'effect'

import { NodeServices } from '@effect/platform-node'

import type { RelayRegistryReader } from '../src/relayRegistry.ts'

export const RELAY_DIRECTORY_VARIABLE = 'FOLDKIT_DEVTOOLS_RELAY_DIRECTORY'
export const RUNTIME_DIRECTORY_VARIABLE = 'XDG_RUNTIME_DIR'

export const runWithNode = <A, E>(
  effect: Effect.Effect<A, E, NodeServices.NodeServices>,
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromEnv(),
      ),
      Effect.provide(NodeServices.layer),
    ),
  )

// NOTE: On Windows, every registry lookup checks the directory through a
// PowerShell probe. Tests that are not about that check read through this
// reader, which accepts every directory, so they start no probe.
export const makeUncheckedRegistryReader: Effect.Effect<RelayRegistryReader> =
  Effect.gen(function* () {
    const reportedRefusals = yield* Ref.make(HashSet.empty<string>())
    const registryReader: RelayRegistryReader = {
      trust: {
        inspect: directory =>
          Effect.succeed({ directory, maybeRefusal: Option.none() }),
      },
      reportedRefusals,
    }

    return registryReader
  })
