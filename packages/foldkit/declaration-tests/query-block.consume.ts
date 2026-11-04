import { Effect, Layer, Schema } from 'effect'
import type * as AsyncData from 'foldkit/asyncData'
import type * as Block from 'foldkit/block'
import type * as Command from 'foldkit/command'
import * as Query from 'foldkit/experimental/query'
import * as Story from 'foldkit/story'
import type * as Update from 'foldkit/update'

import {
  CanonicalNoteById,
  CanonicalNoteByIdTestLayer,
  CanonicalNotes,
  CanonicalNotesTestLayer,
  DeclarationQueryParentContract,
  ForeignCanonicalNoteByIdLayer,
  ForeignCanonicalNotesLayer,
  NoteById,
  Notes,
  NotesChildBinding,
  ParentMessage,
  ProvidedNoteById,
  ProvidedNotes,
  QueryBuildFailure,
  QueryBuildService,
  QueryExecutionService,
  ReplacedCanonicalNoteById,
  ReplacedCanonicalNotes,
  defineGenericInputRequest,
} from './query-block.accepted.js'

// @ts-expect-error Emitted canonical Query declarations reject foreign Fetch Layers.
CanonicalNotes.provideHandlers(ForeignCanonicalNotesLayer)
// @ts-expect-error Emitted canonical KeyedQuery declarations reject foreign Fetch Layers.
CanonicalNoteById.provideHandlers(ForeignCanonicalNoteByIdLayer)

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

type Note = Readonly<{ id: string; body: string }>

export const genericInputRequest = defineGenericInputRequest(
  'GenericInputRequest',
  Schema.Number,
)
export type GenericReceiveKeepsFetchMessage = Expect<
  Equal<
    typeof genericInputRequest.Definition.Message.Type,
    Readonly<{ _tag: 'CompletedFetch'; value: number }>
  >
>

export type QueryFetchName = Expect<
  Equal<typeof Notes.Fetch.name, `${typeof Notes.owner.id}/Fetch`>
>
export type QueryInputsStaySeparate = Expect<
  Equal<
    (typeof Notes.InMessage.Type)['_tag'],
    | 'RequestedReset'
    | 'RequestedRevalidation'
    | 'RequestedRevalidationOrLoad'
    | 'RequestedLoadIfMissing'
    | 'RequestedCancel'
  >
>
export type QueryLocalMessagesStaySeparate = Expect<
  Equal<
    (typeof Notes.Message.Type)['_tag'],
    'CompletedFetch' | 'CompletedCancelFetch' | 'RequestedLoadIfStale'
  >
>
export type KeyedQueryInputsStaySeparate = Expect<
  Equal<(typeof NoteById.InMessage.Type)['_tag'], 'RequestedReset'>
>
export type KeyedQueryLocalMessagesStaySeparate = Expect<
  Equal<
    Extract<typeof NoteById.Message.Type, { _tag: 'RequestedReset' }>,
    never
  >
>
export type QueryBoundResetArguments = Expect<
  Equal<Parameters<typeof NotesChildBinding.requestReset>, []>
>
export type QueryBoundLoadArguments = Expect<
  Equal<Parameters<typeof NotesChildBinding.requestLoadIfMissing>, []>
>
export type QueryClockAdapterArguments = Expect<
  Equal<Parameters<typeof NotesChildBinding.requestLoadIfStale>, [number]>
>
export type QueryIsBlock = Expect<
  typeof Notes extends Block.AnyBlock ? false : true
>
export type QueryInitModel = Expect<
  Equal<
    ReturnType<Block.ExecutableOf<typeof Notes>['init']>['model'],
    typeof Notes.Model.Type
  >
>
export type QueryRead = Expect<
  Equal<
    ReturnType<typeof ProvidedNotes.read>,
    AsyncData.AsyncData<readonly Note[], string>
  >
>
export type QueryProvisionIsComplete = Expect<
  Equal<Block.FactsOf<typeof ProvidedNotes>['hostRequirements'], never>
>
export type QueryProvisionServices = Expect<
  Equal<
    Layer.Services<Block.ExecutableOf<typeof ProvidedNotes>['EffectsLayer']>,
    never
  >
>
export type QueryAcquiredProvider = Expect<
  Equal<
    Layer.Success<Block.ExecutableOf<typeof ProvidedNotes>['EffectsLayer']>,
    Block.InternalExecution<typeof Notes.owner>
  >
>
export type QueryHostRetainsExactHandler = Expect<
  Equal<
    Layer.Services<Block.ExecutableOf<typeof Notes>['EffectsLayer']>,
    Command.HandlerOf<typeof Notes.Fetch>
  >
>
export const notesAcquisition = Story.withBlock(Notes, block => block.Model)

// @ts-expect-error The public acquisition still requires an original family provider.
Effect.runPromise(notesAcquisition)

export const providedNotesAcquisition = notesAcquisition.pipe(
  Effect.provide(Query.layer),
)

export type QueryConstructionRemainsLayerProvided = Expect<
  Effect.Services<typeof notesAcquisition> extends Query.QueryFamily
    ? true
    : false
>
export type QueryFamilyProviderClosesAcquisition = Expect<
  Equal<Effect.Services<typeof providedNotesAcquisition>, never>
>
export type QueryFamilyProviderCannotRaiseHandlerFailure = Expect<
  Equal<Effect.Error<typeof providedNotesAcquisition>, never>
>
export type QueryAcquisitionDoesNotRequireFetchHandler = Expect<
  Equal<
    Extract<
      Effect.Services<typeof notesAcquisition>,
      Command.HandlerOf<typeof Notes.Fetch>
    >,
    never
  >
>
export type KeyedRunArgs = Expect<
  Equal<
    Parameters<typeof ProvidedNoteById.run>,
    [args: Readonly<{ noteId: string }>]
  >
>
export type KeyedOperationArgs = Expect<
  Equal<
    Parameters<
      Block.ExecutableOf<typeof NoteById>['operations']['requestLoadIfMissing']
    >[1],
    Readonly<{ noteId: string }>
  >
>
export type CanonicalLayerError = Expect<
  Equal<Layer.Error<typeof CanonicalNotes.EffectsLayer>, QueryBuildFailure>
>
export type CanonicalLayerServices = Expect<
  Equal<
    Layer.Services<typeof CanonicalNotes.EffectsLayer>,
    QueryBuildService | QueryExecutionService
  >
>
export type CanonicalReplacementLayer = Expect<
  Equal<
    typeof ReplacedCanonicalNotes.EffectsLayer,
    typeof CanonicalNotes.EffectsLayer
  >
>
export type CanonicalReplacementFetch = Expect<
  Equal<typeof ReplacedCanonicalNotes.Fetch, typeof CanonicalNotes.Fetch>
>
export type CanonicalKeyedReplacementLayer = Expect<
  Equal<
    typeof ReplacedCanonicalNoteById.EffectsLayer,
    typeof CanonicalNoteById.EffectsLayer
  >
>
export type CanonicalKeyedReplacementFetch = Expect<
  Equal<typeof ReplacedCanonicalNoteById.Fetch, typeof CanonicalNoteById.Fetch>
>
export type ChildOperationRequirements = Expect<
  Equal<
    Update.RequirementsOf<
      ReturnType<typeof NotesChildBinding.requestLoadIfMissing>
    >,
    Block.Qualify<
      'notes',
      | Block.RuntimeCapability<typeof Notes.owner>
      | Block.InternalExecution<typeof Notes.owner>
    >
  >
>
export type QueryParentDispatch = Expect<
  Equal<
    Block.CoreContract<
      typeof DeclarationQueryParentContract
    >['Message']['Type'],
    | typeof ParentMessage.Type
    | Block.PrivateDelivery<typeof DeclarationQueryParentContract.owner>
  >
>

export type ReplacementFacadeHasNoOriginalRequirements = Expect<
  Equal<
    Layer.Services<
      Block.ExecutableOf<typeof ReplacedCanonicalNotes>['EffectsLayer']
    >,
    Layer.Services<typeof CanonicalNotesTestLayer>
  >
>
export type ReplacementFacadeHasNoOriginalError = Expect<
  Equal<
    Layer.Error<
      Block.ExecutableOf<typeof ReplacedCanonicalNotes>['EffectsLayer']
    >,
    Layer.Error<typeof CanonicalNotesTestLayer>
  >
>
export type KeyedReplacementFacadeRequirements = Expect<
  Equal<
    Layer.Services<
      Block.ExecutableOf<typeof ReplacedCanonicalNoteById>['EffectsLayer']
    >,
    Layer.Services<typeof CanonicalNoteByIdTestLayer>
  >
>
