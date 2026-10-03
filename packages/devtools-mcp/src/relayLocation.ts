import { Array, Config, Effect, Option } from 'effect'
import type { ChildProcessSpawner } from 'effect/process'

import {
  type RelayRegistryReader,
  type RelayRegistryServices,
  discoverRelays,
} from './relayRegistry.js'

const LEGACY_DEFAULT_PORT = 9988
const DEFAULT_HOST = 'localhost'

export type Settings = Readonly<{
  maybeConfiguredPort: Option.Option<string>
  maybeConfiguredHost: Option.Option<string>
  projectRoot: string
}>

export type RelayTarget = Readonly<{
  key: string
  url: string
  maybeProjectRoot: Option.Option<string>
}>

export const loadSettings: Effect.Effect<Settings> = Effect.gen(function* () {
  const maybeConfiguredPort = yield* Config.option(
    Config.String('FOLDKIT_DEVTOOLS_MCP_PORT'),
  )
  const maybeConfiguredHost = yield* Config.option(
    Config.String('FOLDKIT_DEVTOOLS_MCP_HOST'),
  )
  const maybeProjectRoot = yield* Config.option(
    Config.String('FOLDKIT_PROJECT_ROOT'),
  )
  return {
    maybeConfiguredPort,
    maybeConfiguredHost,
    projectRoot: Option.getOrElse(maybeProjectRoot, () => process.cwd()),
  }
}).pipe(Effect.orDie)

const relayUrl = (host: string, port: number | string): string =>
  `ws://${host}:${port}`

const fixedTarget = (url: string): RelayTarget => ({
  key: url,
  url,
  maybeProjectRoot: Option.none(),
})

export const configuredRelayUrl = (
  settings: Settings,
): Option.Option<string> =>
  Option.isNone(settings.maybeConfiguredHost) &&
  Option.isNone(settings.maybeConfiguredPort)
    ? Option.none()
    : Option.some(
        relayUrl(
          Option.getOrElse(settings.maybeConfiguredHost, () => DEFAULT_HOST),
          Option.getOrElse(
            settings.maybeConfiguredPort,
            () => `${LEGACY_DEFAULT_PORT}`,
          ),
        ),
      )

export const resolveRelayTargets = (
  settings: Settings,
  registryReader: RelayRegistryReader,
): Effect.Effect<
  ReadonlyArray<RelayTarget>,
  never,
  RelayRegistryServices | ChildProcessSpawner.ChildProcessSpawner
> =>
  Option.match(configuredRelayUrl(settings), {
    onSome: url => Effect.succeed([fixedTarget(url)]),
    onNone: () =>
      Effect.map(
        discoverRelays(settings.projectRoot, registryReader),
        records =>
          Array.match(records, {
            onEmpty: () => [
              fixedTarget(relayUrl(DEFAULT_HOST, LEGACY_DEFAULT_PORT)),
            ],
            onNonEmpty: Array.map((record): RelayTarget => ({
              key: record.id,
              url: record.url,
              maybeProjectRoot: Option.some(record.root),
            })),
          }),
      ),
  })
