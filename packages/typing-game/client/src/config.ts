// @ts-nocheck
import { Effect, Option } from 'effect'

const getNullableOrThrow = <T>(
  value: T | null | undefined,
  errorMessage: string,
): T =>
  Option.fromNullishOr(value).pipe(
    Option.getOrThrowWith(() => new Error(errorMessage)),
  )

export class ViteEnvConfig extends Effect.Service<ViteEnvConfig>()(
  'ViteEnvConfig',
  {
    effect: Effect.succeed({
      VITE_SERVER_URL: getNullableOrThrow(
        import.meta.env.VITE_SERVER_URL,
        'VITE_SERVER_URL environment variable is not set',
      ),
    }),
  },
) {}
