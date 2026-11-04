import { Effect, Layer, Schema } from 'effect'
import type { FactsOf } from 'foldkit/block'
import type * as Command from 'foldkit/command'
import type { KeyedQueryFamily } from 'foldkit/experimental/query'
import * as Query from 'foldkit/experimental/query'
import * as Story from 'foldkit/story'

import {
  DefaultAttached,
  DefaultHost,
  DefaultKeyedAttached,
  DefaultKeyedHost,
  FalseAttached,
  FalseHost,
  FalseKeyedAttached,
  FalseKeyedHost,
  ModeBuildFailure,
  ModeConstructorSource,
  ModeInvocationSource,
  NotifyingAttached,
  NotifyingHost,
  NotifyingKeyedAttached,
  NotifyingKeyedHost,
  SelectedHost,
} from './query-modes.accepted.js'

type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? true : false
type Assert<Value extends true> = Value

export type DefaultModesAreSilent = Assert<
  Equal<
    | typeof DefaultAttached.OutMessage
    | typeof DefaultHost.OutMessage
    | typeof DefaultKeyedAttached.OutMessage
    | typeof DefaultKeyedHost.OutMessage,
    undefined
  >
>
export type FalseModesAreSilent = Assert<
  Equal<
    | typeof FalseAttached.OutMessage
    | typeof FalseHost.OutMessage
    | typeof FalseKeyedAttached.OutMessage
    | typeof FalseKeyedHost.OutMessage,
    undefined
  >
>
export type NotifyingModesHaveExactTag = Assert<
  Equal<
    | typeof NotifyingAttached.OutMessage.Type._tag
    | typeof NotifyingHost.OutMessage.Type._tag
    | typeof NotifyingKeyedAttached.OutMessage.Type._tag
    | typeof NotifyingKeyedHost.OutMessage.Type._tag,
    'CompletedFetch'
  >
>
export type OriginalFetchIdentity = Assert<
  Equal<typeof DefaultHost.Fetch.name, `${typeof DefaultHost.owner.id}/Fetch`>
>
export type SelectionKeepsFetch = Assert<
  Equal<typeof SelectedHost.Fetch, typeof DefaultHost.Fetch>
>
export type SelectedDirectRunUsesOriginalFetch = Assert<
  Equal<
    Effect.Services<typeof SelectedHost.run>,
    Command.HandlerOf<typeof DefaultHost.Fetch>
  >
>
export type KeyedConstructorFailureRemains = Assert<
  Equal<
    FactsOf<typeof NotifyingKeyedAttached>['effectsLayerError'],
    ModeBuildFailure
  >
>
export type BothKeyedServicePhasesRemain = Assert<
  Equal<
    FactsOf<typeof NotifyingKeyedAttached>['programRequirements'],
    ModeConstructorSource | ModeInvocationSource
  >
>

// @ts-expect-error Keyed public APIs take decoded number arguments.
export const invalidDecodedKeyedArgs = DefaultKeyedHost.run({ revision: '1' })

Query.define({
  name: 'WrongKeyedHandlerMode',
  data: Schema.Number,
  error: Schema.String,
  args: { revision: Schema.NumberFromString },
  handler: function* () {
    return ({ revision }) => {
      // @ts-expect-error Inline keyed handler args are decoded numbers.
      revision.toUpperCase()
      return Effect.succeed(revision)
    }
  },
})

Query.define({
  name: 'PlacementBoundGeneratorMode',
  data: Schema.Number,
  error: Schema.String,
  // @ts-expect-error Generator constructors cannot acquire placement-bound handlers.
  handler: function* () {
    yield* DefaultHost.run
    return () => Effect.succeed(1)
  },
})

// @ts-expect-error Completed handler selection has no replacement compatibility alias.
SelectedHost.replaceEffectsLayer(Layer.empty)

Query.define({
  name: 'WrongFacadeOutputMode',
  data: Schema.Number,
  error: Schema.String,
  // @ts-expect-error The handler output must match the declared data Schema.
  handler: function* () {
    return () => Effect.succeed('wrong')
  },
})

export const notifyingKeyedAcquisition = Story.withBlock(
  NotifyingKeyedAttached,
  block => block.Model,
)

// @ts-expect-error The public acquisition still requires an original family provider.
Effect.runPromise(notifyingKeyedAcquisition)

export const providedNotifyingKeyedAcquisition = notifyingKeyedAcquisition.pipe(
  Effect.provide(Query.layer),
)

export type KeyedAcquisitionDoesNotBuildHandler = Assert<
  Effect.Services<typeof notifyingKeyedAcquisition> extends KeyedQueryFamily
    ? true
    : false
>
export type KeyedFamilyProviderClosesAcquisition = Assert<
  Equal<Effect.Services<typeof providedNotifyingKeyedAcquisition>, never>
>
export type KeyedFamilyProviderCannotRaiseHandlerFailure = Assert<
  Equal<Effect.Error<typeof providedNotifyingKeyedAcquisition>, never>
>
export type KeyedAcquisitionDoesNotRequireHandlerServices = Assert<
  Equal<
    Extract<
      Effect.Services<typeof notifyingKeyedAcquisition>,
      ModeConstructorSource | ModeInvocationSource
    >,
    never
  >
>
export type KeyedAcquisitionCannotRaiseHandlerConstructorFailure = Assert<
  Equal<Effect.Error<typeof notifyingKeyedAcquisition>, never>
>
