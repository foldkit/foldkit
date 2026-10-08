import { ConfigProvider, Effect, HashSet, Ref } from 'effect'

import * as NodeServices from '@effect/platform-node/NodeServices'

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

// NOTE: On Windows, each new reader checks the registry directory through a
// PowerShell probe. Tests that are not about that check read through this
// reader, which accepts every directory, so they start no probe.
export const makeUncheckedRegistryReader: Effect.Effect<RelayRegistryReader> =
  Effect.gen(function* () {
    const reportedRefusals = yield* Ref.make(HashSet.empty<string>())
    const registryReader: RelayRegistryReader = {
      trust: { refusal: () => Effect.succeedNone },
      reportedRefusals,
    }
    return registryReader
  })
