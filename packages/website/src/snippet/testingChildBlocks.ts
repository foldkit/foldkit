import { Array } from 'effect'
import { Block } from 'foldkit'
import { Command, message, model, story } from 'foldkit/story'

import { expect, it } from '@effect/vitest'

import { Message, Note, NotesLive, Save } from './notes'

const toNote = (noteId: string, noteMessage: typeof Note.Message.Type) =>
  Block.deliver(Note, ['notes', noteId], noteMessage)

it.effect('saves one note and deletes the other', () =>
  story(
    NotesLive,
    message(Message.ClickedAddNote()),
    message(Message.ClickedAddNote()),

    // A Message for one child instance, addressed by collection and key.
    message(toNote('note-1', Note.Message.ClickedSave())),
    Command.expectExact(Save({ noteId: 'note-1' })),

    // The child's own result Message. Foldkit routes it back to note-1.
    Command.resolve(Save, Note.Message.SucceededSave()),

    // note-2 reports RequestedDelete, and the parent removes it.
    message(toNote('note-2', Note.Message.ClickedDelete())),

    // The test reads each child instance as its own Model.
    model(model => {
      expect(Array.map(model.notes, ({ status }) => status)).toEqual(['Saved'])
    }),
  ),
)
