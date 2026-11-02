import { Effect, Layer } from 'effect'
import type * as Block from 'foldkit/block'
import type * as Command from 'foldkit/command'
import * as Query from 'foldkit/experimental/query'
import type * as Update from 'foldkit/update'

import {
  HostWindows,
  HostWindowsLayer,
  MissingCredentials,
  Ordinary,
  ParentBlock,
  ParentMessage,
  PlainWindows,
  ProvidedWindows,
  QuoteCredentials,
  QuoteProvider,
  QuoteWindows,
} from './query-policy.accepted.js'

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false
type Expect<T extends true> = T
export type PlainHasNoOutMessage = Expect<
  Equal<typeof PlainWindows.OutMessage, undefined>
>
export type ExactNotification = Expect<
  Equal<
    typeof QuoteWindows.OutMessage.CompletedFetch.Type.args,
    Readonly<{ label: string; offset: number; limit: number }>
  >
>
export type ExactProviderError = Expect<
  Equal<Layer.Error<typeof QuoteWindows.EffectsLayer>, MissingCredentials>
>
export type ExactProviderRequirements = Expect<
  Equal<
    Layer.Services<typeof QuoteWindows.EffectsLayer>,
    QuoteCredentials | QuoteProvider
  >
>
export type ProvidedHandler = Expect<
  Equal<
    Layer.Services<Block.ExecutableOf<typeof ProvidedWindows>['EffectsLayer']>,
    never
  >
>
export type ProvidedHasNoHost = Expect<
  Equal<Block.FactsOf<typeof ProvidedWindows>['hostRequirements'], never>
>
export type UnselectedHostRequirement = Expect<
  Equal<
    Layer.Services<Block.ExecutableOf<typeof HostWindows>['EffectsLayer']>,
    Command.HandlerOf<typeof HostWindows.Fetch>
  >
>
export type ProvisionPreservesOut = Expect<
  Equal<typeof ProvidedWindows.OutMessage, typeof HostWindows.OutMessage>
>
export type LoadDoesNotEmit = Expect<
  Equal<
    ReturnType<
      Block.ExecutableOf<
        typeof QuoteWindows
      >['operations']['requestLoadIfStale']
    >['outMessage'],
    undefined
  >
>
export type OrdinaryLoadDoesNotEmit = Expect<
  Equal<
    ReturnType<
      Block.ExecutableOf<typeof Ordinary>['operations']['requestLoadIfStale']
    >['outMessage'],
    undefined
  >
>
export type CancelRequiresNoFetch = Expect<
  Equal<
    Update.RequirementsOf<
      Block.ExecutableOf<typeof QuoteWindows>['operations']['requestCancel']
    >,
    | Block.RuntimeCapability<typeof QuoteWindows.owner>
    | Block.InternalExecution<typeof QuoteWindows.owner>
  >
>

export const replacement = QuoteWindows.provideHandlers(
  QuoteWindows.toLayer(Effect.succeed(args => Effect.succeed([args.label]))),
)
export type ReplacementKeepsNotifications = Expect<
  Equal<typeof replacement.OutMessage, typeof QuoteWindows.OutMessage>
>
export const completedParentTransitions = Effect.scoped(
  Effect.gen(function* () {
    const parent = yield* ParentBlock.get
    const parentInit = parent.init()
    const requested = parent.update(
      parentInit.model,
      ParentMessage.RequestedWindow({
        args: { label: 'devins', offset: 0, limit: 60 },
        nowMillis: 1,
      }),
    )
    const canceled = parent.update(
      requested.model,
      ParentMessage.CanceledWindow({
        args: { label: 'devin', offset: 0, limit: 60 },
      }),
    )
    const read = QuoteWindows.read(canceled.model.quotes, {
      label: 'devins',
      offset: 0,
      limit: 60,
    })
    const pending = QuoteWindows.pendingArgs(canceled.model.quotes)
    const fresh = QuoteWindows.isFresh(
      canceled.model.quotes,
      { label: 'devins', offset: 0, limit: 60 },
      2,
    )

    return { parentInit, requested, canceled, read, pending, fresh }
  }).pipe(Effect.provide(Layer.provideMerge(ParentBlock.layer, Query.layer))),
)

// @ts-expect-error A different Query's provider cannot implement this Fetch identity.
QuoteWindows.provideHandlers(HostWindowsLayer)
declare const existingModel: typeof QuoteWindows.Model.Type
QuoteWindows.read(existingModel, {
  label: 'devins',
  // @ts-expect-error Keyed Model arguments keep their Schema after relocation.
  offset: '0',
  limit: 60,
})
// @ts-expect-error Completion channels remain checked after declaration relocation.
QuoteWindows.OutMessage.CompletedFetch({ generation: 1 })
