import { Context, Effect, Layer, Option } from 'effect'

const getNullableOrThrow = <T>(
  value: T | null | undefined,
  errorMessage: string,
): T =>
  Option.fromNullishOr(value).pipe(
    Option.getOrThrowWith(() => new Error(errorMessage)),
  )

export interface ViteEnvConfigShape {
  readonly VITE_SERVER_URL: string
}

export class ViteEnvConfig extends Context.Service<
  ViteEnvConfig,
  ViteEnvConfigShape
>()('ViteEnvConfig') {}

export const ViteEnvConfigLive = Layer.effect(
  ViteEnvConfig,
  Effect.sync(() =>
    ViteEnvConfig.of({
      VITE_SERVER_URL: getNullableOrThrow(
        import.meta.env.VITE_SERVER_URL,
        'VITE_SERVER_URL environment variable is not set',
      ),
    }),
  ),
)
