import { Config, Effect, Option } from 'effect'

import { discoverRelay } from './relayRegistry.js'

const LEGACY_DEFAULT_PORT = 9988
const DEFAULT_HOST = 'localhost'

/** Where the server looks for its relay, read from the environment. */
export type Settings = Readonly<{
  maybeConfiguredPort: Option.Option<string>
  maybeConfiguredHost: Option.Option<string>
  projectRoot: string
}>

/**
 * The settings the server starts with: `FOLDKIT_DEVTOOLS_MCP_PORT`,
 * `FOLDKIT_DEVTOOLS_MCP_HOST`, and `FOLDKIT_PROJECT_ROOT`, which falls back to
 * the working directory.
 */
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

const withConfiguredHost = (settings: Settings, url: string): string =>
  Option.match(settings.maybeConfiguredHost, {
    onNone: () => url,
    onSome: host => {
      const parsed = new URL(url)
      parsed.hostname = host
      return parsed.toString()
    },
  })

/**
 * The relay of the dev server most recently started for the project, found
 * through the registry the Vite plugin publishes to. A configured port wins
 * over discovery, and the port relays used before discovery existed remains
 * the fallback so a dev server on an older plugin is still reached.
 */
export const resolveRelayUrl = (settings: Settings) =>
  Option.match(settings.maybeConfiguredPort, {
    onSome: port =>
      Effect.succeed(
        relayUrl(
          Option.getOrElse(settings.maybeConfiguredHost, () => DEFAULT_HOST),
          port,
        ),
      ),
    onNone: () =>
      discoverRelay(settings.projectRoot).pipe(
        Effect.map(maybeRecord =>
          Option.match(maybeRecord, {
            onSome: record => withConfiguredHost(settings, record.url),
            onNone: () =>
              relayUrl(
                Option.getOrElse(
                  settings.maybeConfiguredHost,
                  () => DEFAULT_HOST,
                ),
                LEGACY_DEFAULT_PORT,
              ),
          }),
        ),
      ),
  })
