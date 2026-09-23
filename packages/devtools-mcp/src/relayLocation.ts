import { Config, Effect, Option } from 'effect'

import { discoverRelay } from './relayRegistry.js'

const LEGACY_DEFAULT_PORT = 9988
const DEFAULT_HOST = 'localhost'

export type Settings = Readonly<{
  maybeConfiguredPort: Option.Option<string>
  maybeConfiguredHost: Option.Option<string>
  projectRoot: string
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

const withConfiguredHost = (
  maybeConfiguredHost: Option.Option<string>,
  url: string,
): string =>
  Option.match(maybeConfiguredHost, {
    onNone: () => url,
    onSome: host => {
      const parsed = new URL(url)
      parsed.hostname = host
      return parsed.toString()
    },
  })

export const resolveRelayUrl = (settings: Settings) => {
  const configuredHost = Option.getOrElse(
    settings.maybeConfiguredHost,
    () => DEFAULT_HOST,
  )

  return Option.match(settings.maybeConfiguredPort, {
    onSome: port => Effect.succeed(relayUrl(configuredHost, port)),
    onNone: () =>
      discoverRelay(settings.projectRoot).pipe(
        Effect.map(maybeRecord =>
          Option.match(maybeRecord, {
            onSome: record =>
              withConfiguredHost(settings.maybeConfiguredHost, record.url),
            onNone: () => relayUrl(configuredHost, LEGACY_DEFAULT_PORT),
          }),
        ),
      ),
  })
}
