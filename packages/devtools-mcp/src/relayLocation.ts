import { Array, Config, Effect, Option } from 'effect'
import type { ChildProcessSpawner } from 'effect/process'
import { isIPv6 } from 'node:net'

import {
  type RelayRegistryReader,
  type RelayRegistryServices,
  discoverRelays,
} from './relayRegistry.js'

const LEGACY_DEFAULT_PORT = 9988
const DEFAULT_HOST = 'localhost'
const AUTOMATIC_RELAY_HOST = '127.0.0.1'
const AUTOMATIC_RELAY_PATH = '/__foldkit/devtools-mcp'
const RELAY_TOKEN_PARAMETER = 'token'
const RELAY_TOKEN_PATTERN = /^[0-9a-f]{64}$/

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

const urlHost = (host: string): string => (isIPv6(host) ? `[${host}]` : host)

const relayUrl = (host: string, port: number | string): string =>
  `ws://${urlHost(host)}:${port}`

const fixedTarget = (url: string): RelayTarget => ({
  key: url,
  url,
  maybeProjectRoot: Option.none(),
})

const parseUrl = Option.liftThrowable((url: string) => new URL(url))

const hasValidPort = (url: URL): boolean => {
  const port = globalThis.Number(url.port)

  return (
    url.port !== '' &&
    globalThis.Number.isInteger(port) &&
    port > 0 &&
    port <= 65_535
  )
}

const isPublishedRelayUrl = (value: string): boolean =>
  Option.exists(parseUrl(value), url => {
    if (
      url.protocol !== 'ws:' ||
      url.username !== '' ||
      url.password !== '' ||
      url.hash !== '' ||
      !hasValidPort(url)
    ) {
      return false
    }

    const parameters = Array.fromIterable(url.searchParams)
    return (
      url.hostname === AUTOMATIC_RELAY_HOST &&
      url.pathname === AUTOMATIC_RELAY_PATH &&
      Array.length(parameters) === 1 &&
      Option.exists(
        Array.head(parameters),
        ([name, token]) =>
          name === RELAY_TOKEN_PARAMETER && RELAY_TOKEN_PATTERN.test(token),
      )
    )
  })

export const configuredRelayUrl = (
  settings: Settings,
): Option.Option<string> => {
  const { maybeConfiguredHost, maybeConfiguredPort } = settings

  if (
    Option.isSome(maybeConfiguredHost) ||
    Option.isSome(maybeConfiguredPort)
  ) {
    const host = Option.getOrElse(maybeConfiguredHost, () => DEFAULT_HOST)
    const port = Option.getOrElse(
      maybeConfiguredPort,
      () => LEGACY_DEFAULT_PORT,
    )

    return Option.some(relayUrl(host, port))
  } else {
    return Option.none()
  }
}

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
        records => {
          const trustedRecords = Array.filter(records, record =>
            isPublishedRelayUrl(record.url),
          )

          return Array.map(trustedRecords, (record): RelayTarget => ({
            key: record.id,
            url: record.url,
            maybeProjectRoot: Option.some(record.root),
          }))
        },
      ),
  })
