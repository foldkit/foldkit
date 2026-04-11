import { Effect, Option } from 'effect'

const getNullableOrThrow = <T>(
  value: T | null | undefined,
  errorMessage: string,
): T =>
  Option.fromNullable(value).pipe(
    Option.getOrThrowWith(() => new Error(errorMessage)),
  )

export class NowEnvConfig extends Effect.Service<NowEnvConfig>()(
  'NowEnvConfig',
  {
    effect: Effect.succeed({
      VITE_NOW_SERVER_URL: getNullableOrThrow(
        import.meta.env.VITE_NOW_SERVER_URL,
        'VITE_NOW_SERVER_URL environment variable is not set',
      ),
    }),
  },
) {}
