import { Effect, HashMap, Option, Result, Schema } from 'effect'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as AsyncData from '../../asyncData/index.js'
import { defineMessageUnion } from '../../message/index.js'
import * as Query from './index.js'

const note = Query.define({
  name: 'LifecycleNote',
  data: Schema.String,
  error: Schema.String,
  execute: Effect.succeed('current'),
})

const noteById = Query.define({
  name: 'LifecycleNoteById',
  data: Schema.String,
  error: Schema.String,
  args: { noteId: Schema.String, preview: Schema.Boolean },
  toKey: ({ noteId }) => noteId,
  execute: ({ preview }) => Effect.succeed(globalThis.String(preview)),
})

const firstArgs = { noteId: '1', preview: true }
const secondArgs = { noteId: '2', preview: false }

const completeNote = (generation: number, data: string) =>
  note.Message.CompletedFetch({ generation, result: Result.succeed(data) })

const completeKeyedNote = (
  args: typeof firstArgs,
  generation: number,
  data: string,
) =>
  noteById.Message.CompletedFetch({
    args,
    generation,
    result: Result.succeed(data),
  })

describe('Query lifecycle', () => {
  it('replaces a pending refresh while keeping its retained data', () => {
    const loaded = note.loadIfMissing(note.init())
    const settled = note.update(
      loaded.model,
      completeNote(loaded.model.generation, 'retained'),
    )
    const refreshing = note.revalidate(settled.model)
    const replacement = note.replace(refreshing.model)
    const stale = note.update(
      replacement.model,
      completeNote(refreshing.model.generation, 'old'),
    )

    expect(replacement.commands).toHaveLength(1)
    expect(note.read(replacement.model)).toEqual(
      AsyncData.Refreshing({ data: 'retained' }),
    )
    expect(stale.model).toBe(replacement.model)
    expect(
      note.read(
        note.update(
          replacement.model,
          completeNote(replacement.model.generation, 'new'),
        ).model,
      ),
    ).toEqual(AsyncData.Success({ data: 'new' }))
  })

  it('loads an idle Query through replace', () => {
    const replacement = note.replace(note.init())
    expect(note.read(replacement.model)).toEqual(AsyncData.Loading())
    expect(replacement.commands).toHaveLength(1)
  })
})

describe('KeyedQuery lifecycle', () => {
  it('forgets one key without clearing another and rejects the old completion', () => {
    const first = noteById.loadIfMissing(noteById.init(), firstArgs)
    const sibling = noteById.loadIfMissing(first.model, secondArgs)
    const forgotten = noteById.forget(sibling.model, firstArgs)
    const reloaded = noteById.loadIfMissing(forgotten.model, firstArgs)
    const stale = noteById.update(
      reloaded.model,
      completeKeyedNote(firstArgs, first.model.generation, 'old'),
    )
    const siblingSettled = noteById.update(
      stale.model,
      completeKeyedNote(secondArgs, sibling.model.generation, 'sibling'),
    )

    expect(noteById.read(forgotten.model, firstArgs)).toEqual(AsyncData.Idle())
    expect(noteById.read(forgotten.model, secondArgs)).toEqual(
      AsyncData.Loading(),
    )
    expect(stale.model).toBe(reloaded.model)
    expect(noteById.read(siblingSettled.model, secondArgs)).toEqual(
      AsyncData.Success({ data: 'sibling' }),
    )
  })

  it('replaces pending work for a key without superseding a sibling request', () => {
    const first = noteById.loadIfMissing(noteById.init(), firstArgs)
    const sibling = noteById.loadIfMissing(first.model, secondArgs)
    const replacementArgs = { noteId: '1', preview: false }
    const replacement = noteById.replace(sibling.model, replacementArgs)
    const stale = noteById.update(
      replacement.model,
      completeKeyedNote(firstArgs, first.model.generation, 'old'),
    )
    const settled = noteById.update(
      stale.model,
      completeKeyedNote(
        replacementArgs,
        replacement.model.generation,
        'replacement',
      ),
    )

    expect(replacement.commands).toHaveLength(1)
    expect(stale.model).toBe(replacement.model)
    expect(noteById.read(settled.model, firstArgs)).toEqual(
      AsyncData.Success({ data: 'replacement' }),
    )
    expect(noteById.read(settled.model, secondArgs)).toEqual(
      AsyncData.Loading(),
    )
  })

  it('retains selected keys and rejects removed work after reloading a key', () => {
    const first = noteById.loadIfMissing(noteById.init(), firstArgs)
    const second = noteById.loadIfMissing(first.model, secondArgs)
    const selected = noteById.retainOnly(second.model, [secondArgs])
    const revisited = noteById.loadIfMissing(selected.model, firstArgs)
    const stale = noteById.update(
      revisited.model,
      completeKeyedNote(firstArgs, first.model.generation, 'old'),
    )
    const cleared = noteById.retainOnly([])(stale.model)

    expect(HashMap.size(selected.model.entries)).toBe(1)
    expect(selected.commands).toBeUndefined()
    expect(selected.model.generation).toBe(second.model.generation)
    expect(revisited.commands).toHaveLength(1)
    expect(stale.model).toBe(revisited.model)
    expect(HashMap.size(cleared.model.entries)).toBe(0)
    expect(cleared.commands).toBeUndefined()
    expect(cleared.model.generation).toBe(revisited.model.generation)
  })

  it('preserves retained entries for duplicate keys and does not load missing keys', () => {
    const loaded = noteById.loadIfMissing(noteById.init(), firstArgs)
    const settled = noteById.update(
      loaded.model,
      completeKeyedNote(firstArgs, loaded.model.generation, 'retained'),
    )
    const retained = noteById.retainOnly(settled.model, [
      firstArgs,
      { noteId: '1', preview: false },
      secondArgs,
    ])

    expect(Option.getOrThrow(HashMap.get(retained.model.entries, '1'))).toBe(
      Option.getOrThrow(HashMap.get(settled.model.entries, '1')),
    )
    expect(noteById.read(retained.model, firstArgs)).toEqual(
      AsyncData.Success({ data: 'retained' }),
    )
    expect(noteById.read(retained.model, secondArgs)).toEqual(AsyncData.Idle())
    expect(retained.model.generation).toBe(settled.model.generation)
    expect(retained.commands).toBeUndefined()
  })

  it('lifts entry retention and removal into the parent', () => {
    const ParentModel = Schema.Struct({ notes: noteById.Model })
    type ParentModel = typeof ParentModel.Type
    const ParentMessage = defineMessageUnion({
      GotNotesMessage: { message: noteById.Message },
    })
    type ParentMessage = typeof ParentMessage.Type
    const notes = noteById.lift<ParentModel, ParentMessage>({
      parentField: 'notes',
      toParentMessage: message => ParentMessage.GotNotesMessage({ message }),
    })
    const first = noteById.loadIfMissing(noteById.init(), firstArgs)
    const second = noteById.loadIfMissing(first.model, secondArgs)
    const parent = ParentModel.make({ notes: second.model })
    const retained = notes.retainOnly([secondArgs])(parent)
    const forgotten = notes.forget(retained.model, secondArgs)

    expect(noteById.read(retained.model.notes, firstArgs)).toEqual(
      AsyncData.Idle(),
    )
    expect(noteById.read(retained.model.notes, secondArgs)).toEqual(
      AsyncData.Loading(),
    )
    expect(retained.commands ?? []).toHaveLength(0)
    expect(forgotten.commands ?? []).toHaveLength(0)
    expect(forgotten.model.notes.generation).toBe(second.model.generation)
    expect(HashMap.size(forgotten.model.notes.entries)).toBe(0)
  })
})
