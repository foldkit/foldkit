import { Context, Effect, Schema } from 'effect'
import * as Query from 'foldkit/experimental/query'

export const DefaultHost = Query.define({
  name: 'DefaultHostMode',
  data: Schema.Number,
  error: Schema.String,
})

export const FalseHost = Query.define({
  name: 'FalseHostMode',
  data: Schema.Number,
  error: Schema.String,
  notifyOnCompletion: false,
})

export const NotifyingHost = Query.define({
  name: 'NotifyingHostMode',
  data: Schema.Number,
  error: Schema.String,
  notifyOnCompletion: true,
})

export const DefaultAttached = Query.define({
  name: 'DefaultAttachedMode',
  data: Schema.Number,
  error: Schema.String,
  handler: function* () {
    return () => Effect.succeed(11)
  },
})

export const FalseAttached = Query.define({
  name: 'FalseAttachedMode',
  data: Schema.Number,
  error: Schema.String,
  notifyOnCompletion: false,
  handler: function* () {
    return () => Effect.succeed(12)
  },
})

export const NotifyingAttached = Query.define({
  name: 'NotifyingAttachedMode',
  data: Schema.Number,
  error: Schema.String,
  notifyOnCompletion: true,
  handler: function* () {
    return () => Effect.succeed(13)
  },
})

export const WindowArgs = Schema.Struct({ revision: Schema.NumberFromString })
export type WindowArgs = typeof WindowArgs.Type

export const modeKey = ({ revision }: WindowArgs) => globalThis.String(revision)

export const DefaultKeyedHost = Query.define({
  name: 'DefaultKeyedHostMode',
  data: Schema.Number,
  error: Schema.String,
  args: WindowArgs.fields,
  toKey: modeKey,
})

export const FalseKeyedHost = Query.define({
  name: 'FalseKeyedHostMode',
  data: Schema.Number,
  error: Schema.String,
  args: WindowArgs.fields,
  toKey: modeKey,
  notifyOnCompletion: false,
})

export const NotifyingKeyedHost = Query.define({
  name: 'NotifyingKeyedHostMode',
  data: Schema.Number,
  error: Schema.String,
  args: WindowArgs.fields,
  toKey: modeKey,
  notifyOnCompletion: true,
})

export const DefaultKeyedAttached = Query.define({
  name: 'DefaultKeyedAttachedMode',
  data: Schema.Number,
  error: Schema.String,
  args: WindowArgs.fields,
  toKey: modeKey,
  handler: function* () {
    return ({ revision }) => Effect.succeed(revision + 1)
  },
})

export const FalseKeyedAttached = Query.define({
  name: 'FalseKeyedAttachedMode',
  data: Schema.Number,
  error: Schema.String,
  args: WindowArgs.fields,
  toKey: modeKey,
  notifyOnCompletion: false,
  handler: function* () {
    return ({ revision }) => Effect.succeed(revision + 2)
  },
})

export class ModeConstructorSource extends Context.Service<
  ModeConstructorSource,
  Readonly<{ isFailure: boolean; increment: number }>
>()('DeclarationQueryModes/ConstructorSource') {}

export class ModeInvocationSource extends Context.Service<
  ModeInvocationSource,
  Readonly<{ multiplier: number }>
>()('DeclarationQueryModes/InvocationSource') {}

export class ModeBuildFailure extends Error {}

export const NotifyingKeyedAttached = Query.define({
  name: 'NotifyingKeyedAttachedMode',
  data: Schema.Number,
  error: Schema.String,
  args: WindowArgs.fields,
  toKey: modeKey,
  notifyOnCompletion: true,
  handler: function* () {
    const source = yield* ModeConstructorSource

    if (source.isFailure) {
      return yield* Effect.fail(new ModeBuildFailure())
    }

    return ({ revision }) =>
      Effect.map(
        ModeInvocationSource,
        invocation => revision * invocation.multiplier + source.increment,
      )
  },
})

const buildExtractedFetch = function* () {
  return ({ revision }: WindowArgs) => Effect.succeed(revision)
}

export const ExtractedKeyedAttached = Query.define({
  name: 'ExtractedKeyedAttachedMode',
  data: Schema.Number,
  error: Schema.String,
  args: WindowArgs.fields,
  toKey: modeKey,
  handler: buildExtractedFetch,
})

export const SelectedHost = DefaultHost.provideHandlers(
  DefaultHost.toLayer(Effect.succeed(() => Effect.succeed(14))),
)

export const SelectedKeyedHost = DefaultKeyedHost.provideHandlers(
  DefaultKeyedHost.toLayer(
    Effect.succeed(({ revision }) => Effect.succeed(revision + 4)),
  ),
)
