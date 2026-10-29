import { Effect, Layer } from 'effect'
import type * as Command from 'foldkit/command'
import type * as Update from 'foldkit/update'

import {
  HostWindows,
  HostWindowsLayer,
  MissingCredentials,
  Ordinary,
  ParentComposition,
  PlainWindows,
  ProvidedWindows,
  QuoteCredentials,
  QuoteProvider,
  QuoteWindows,
  parentInit,
  parentUpdate,
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
    Layer.Success<typeof ProvidedWindows.EffectsLayer>,
    Command.HandlerOf<typeof HostWindows.Fetch>
  >
>
export type ProvidedHasNoHost = Expect<
  Equal<typeof ProvidedWindows.provideHandlers, never>
>
export type ProvisionPreservesOut = Expect<
  Equal<typeof ProvidedWindows.OutMessage, typeof HostWindows.OutMessage>
>
export type LoadDoesNotEmit = Expect<
  Equal<
    ReturnType<typeof QuoteWindows.operations.requestLoadIfStale>['outMessage'],
    undefined
  >
>
export type OrdinaryLoadDoesNotEmit = Expect<
  Equal<
    ReturnType<typeof Ordinary.operations.requestLoadIfStale>['outMessage'],
    undefined
  >
>
export type CancelRequiresNoFetch = Expect<
  Equal<
    Update.RequirementsOf<typeof QuoteWindows.operations.requestCancel>,
    never
  >
>

export const replacement = QuoteWindows.replaceEffectsLayer(
  QuoteWindows.toLayer(Effect.succeed(args => Effect.succeed([args.label]))),
)
export type ReplacementKeepsNotifications = Expect<
  Equal<typeof replacement.OutMessage, typeof QuoteWindows.OutMessage>
>
export const initResult = parentInit()
export const requested = parentUpdate(
  initResult.model,
  ParentComposition.Message.RequestedWindow({
    args: { label: 'devins', offset: 0, limit: 60 },
    nowMillis: 1,
  }),
)
export const canceled = parentUpdate(
  requested.model,
  ParentComposition.Message.CanceledWindow({
    args: { label: 'devin', offset: 0, limit: 60 },
  }),
)
export const read = QuoteWindows.read(canceled.model.quotes, {
  label: 'devins',
  offset: 0,
  limit: 60,
})
export const pending = QuoteWindows.pendingArgs(canceled.model.quotes)
export const fresh = QuoteWindows.isFresh(
  canceled.model.quotes,
  { label: 'devins', offset: 0, limit: 60 },
  2,
)

// @ts-expect-error A different Query's provider cannot implement this Fetch identity.
QuoteWindows.replaceEffectsLayer(HostWindowsLayer)
QuoteWindows.read(canceled.model.quotes, {
  label: 'devins',
  // @ts-expect-error Keyed Model arguments keep their Schema after relocation.
  offset: '0',
  limit: 60,
})
// @ts-expect-error Completion channels remain checked after declaration relocation.
QuoteWindows.OutMessage.CompletedFetch({ generation: 1 })
