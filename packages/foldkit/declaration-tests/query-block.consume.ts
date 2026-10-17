import { Layer } from 'effect'
import type * as AsyncData from 'foldkit/asyncData'
import type * as Block from 'foldkit/block'
import type * as Command from 'foldkit/command'
import type * as Update from 'foldkit/update'

import {
  CanonicalNoteById,
  CanonicalNoteByIdTestLayer,
  CanonicalNotes,
  CanonicalNotesTestLayer,
  ForeignCanonicalNoteByIdLayer,
  ForeignCanonicalNotesLayer,
  NoteById,
  Notes,
  NotesChildBinding,
  ProvidedNoteById,
  ProvidedNotes,
  QueryBuildFailure,
  QueryBuildService,
  QueryExecutionService,
  ReplacedCanonicalNoteById,
  ReplacedCanonicalNotes,
} from './query-block.accepted.js'

// @ts-expect-error Emitted canonical Query declarations reject foreign Fetch Layers.
CanonicalNotes.replaceEffectsLayer(ForeignCanonicalNotesLayer)
// @ts-expect-error Emitted canonical KeyedQuery declarations reject foreign Fetch Layers.
CanonicalNoteById.replaceEffectsLayer(ForeignCanonicalNoteByIdLayer)

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

type Note = Readonly<{ id: string; body: string }>

export type QueryFetchName = Expect<
  Equal<typeof Notes.Fetch.name, 'DeclarationNotes/Fetch'>
>
export type QueryIsBlock = Expect<
  typeof Notes extends Block.AnyBlock ? true : false
>
export type QueryInitModel = Expect<
  Equal<ReturnType<typeof Notes.init>['model'], typeof Notes.Model.Type>
>
export type QueryRead = Expect<
  Equal<
    ReturnType<typeof ProvidedNotes.read>,
    AsyncData.AsyncData<readonly Note[], string>
  >
>
export type QueryProvisionIsComplete = Expect<
  Equal<typeof ProvidedNotes.provideHandlers, never>
>
export type QueryProvisionServices = Expect<
  Equal<
    Layer.Success<typeof ProvidedNotes.EffectsLayer>,
    Command.HandlerOf<typeof Notes.Fetch>
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
    Parameters<typeof NoteById.expose.loadIfMissing>[1],
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
    typeof CanonicalNotesTestLayer
  >
>
export type CanonicalReplacementFetch = Expect<
  Equal<typeof ReplacedCanonicalNotes.Fetch, typeof CanonicalNotes.Fetch>
>
export type CanonicalKeyedReplacementLayer = Expect<
  Equal<
    typeof ReplacedCanonicalNoteById.EffectsLayer,
    typeof CanonicalNoteByIdTestLayer
  >
>
export type CanonicalKeyedReplacementFetch = Expect<
  Equal<typeof ReplacedCanonicalNoteById.Fetch, typeof CanonicalNoteById.Fetch>
>
export type ChildOperationRequirements = Expect<
  Equal<
    Update.RequirementsOf<ReturnType<typeof NotesChildBinding.loadIfMissing>>,
    Block.Scoped<'notes', Command.HandlerOf<typeof Notes.Fetch>>
  >
>
