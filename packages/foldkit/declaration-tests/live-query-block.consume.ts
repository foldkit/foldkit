import type { Layer, Option } from 'effect'
import { Program } from 'foldkit'
import type * as AsyncData from 'foldkit/asyncData'
import type * as Block from 'foldkit/block'
import type * as LiveQuery from 'foldkit/experimental/liveQuery'
import type * as Subscription from 'foldkit/subscription'
import type * as Update from 'foldkit/update'

import {
  ApplicationBlock,
  BoardBinding,
  BoardEvents,
  BoardEventsLayer,
  BoardFeed,
  CanonicalBoardFeed,
  DocumentFeed,
  ProvidedBoardFeed,
} from './live-query-block.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

type Board = Readonly<{ cards: readonly string[] }>

export type LiveQueryIsBlock = Expect<
  typeof BoardFeed extends Block.AnyBlock ? true : false
>
export type LiveQueryFeedsName = Expect<
  Equal<typeof BoardFeed.Feeds.name, 'DeclarationBoardFeed/Feeds'>
>
export type LiveQueryRead = Expect<
  Equal<
    ReturnType<typeof ProvidedBoardFeed.read>,
    AsyncData.AsyncData<Board, string>
  >
>
export type LiveQueryReadConnection = Expect<
  Equal<
    ReturnType<typeof BoardFeed.readConnection>,
    Option.Option<LiveQuery.Connection>
  >
>
export type LiveQueryProvisionIsComplete = Expect<
  Equal<typeof ProvidedBoardFeed.provideHandlers, never>
>
export type CanonicalLayerHandler = Expect<
  Equal<
    Layer.Success<typeof CanonicalBoardFeed.EffectsLayer>,
    Subscription.HandlerOf<typeof CanonicalBoardFeed.Feeds>
  >
>
export type CanonicalLayerServices = Expect<
  Equal<Layer.Services<typeof CanonicalBoardFeed.EffectsLayer>, BoardEvents>
>
export type MetaFreeLayerServices = Expect<
  Equal<Layer.Services<typeof DocumentFeed.EffectsLayer>, never>
>
export type AppliedEntryMeta = Expect<
  Equal<
    (typeof CanonicalBoardFeed.OutMessage.Type)['meta'],
    Readonly<{ intentId: string }>
  >
>
export type ChildOperationRequirements = Expect<
  Equal<
    Update.RequirementsOf<ReturnType<typeof BoardBinding.requestPause>>,
    never
  >
>

export const startWithBoardEvents = () =>
  Program.makeElement({ block: ApplicationBlock, container: null }).provide(
    BoardEventsLayer,
  ).start
