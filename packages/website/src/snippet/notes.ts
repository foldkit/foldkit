import { Array, Effect, Layer, Number, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const NoteMessage = defineMessageUnion({
  ClickedSave: {},
  SucceededSave: {},
  FailedSave: { reason: Schema.String },
  ClickedDelete: {},
})

export const Save = Command.define('Save', {
  args: { noteId: Schema.String },
  messages: [NoteMessage.SucceededSave, NoteMessage.FailedSave],
})

export class Note extends Block<Note>()('Note', {
  Model: Schema.Struct({ status: Schema.String }),
  Message: NoteMessage,
  OutMessage: defineMessageUnion({ RequestedDelete: {} }),
  Command: [Save],
}) {}

export const NoteLive = Note.make(
  Effect.fn(function* (id) {
    return {
      model: { status: 'Draft' },

      update: {
        ClickedSave: model => ({
          model: modifyFields(model, { status: () => 'Saving' }),
          commands: [Save({ noteId: id })],
        }),
        SucceededSave: model => ({
          model: modifyFields(model, { status: () => 'Saved' }),
        }),
        FailedSave: (model, { reason }) => ({
          model: modifyFields(model, { status: () => reason }),
        }),
        ClickedDelete: model => ({
          model,
          outMessage: Note.OutMessage.RequestedDelete(),
        }),
      },

      commands: {
        Save: () => Effect.succeed(Note.Message.SucceededSave()),
      },

      view: (model, h) =>
        h.section(
          [h.AriaLabel(id)],
          [
            h.p([h.Role('status')], [model.status]),
            h.button([h.OnClick(Note.Message.ClickedSave())], ['Save']),
            h.button([h.OnClick(Note.Message.ClickedDelete())], ['Delete']),
          ],
        ),
    }
  }),
)

export const Message = defineMessageUnion({ ClickedAddNote: {} })

export class Notes extends Block<Notes>()('Notes', {
  Model: Schema.Struct({
    notes: Schema.Array(Note),
    nextNoteNumber: Schema.Number,
  }),
  Message,
}) {}

export const NotesLive = Notes.make(
  Effect.fn(function* () {
    const note = yield* Note.each('notes')

    return {
      model: { notes: [], nextNoteNumber: 1 },

      update: {
        ClickedAddNote: model => ({
          model: modifyFields(model, {
            notes: Array.append(note(`note-${model.nextNoteNumber}`)),
            nextNoteNumber: Number.increment,
          }),
        }),
        ...note.on({
          RequestedDelete: (model, _outMessage, deletedNote) => ({
            model: modifyFields(model, {
              notes: Array.filter(({ id }) => id !== deletedNote.id),
            }),
          }),
        }),
      },

      view: (model, h) =>
        h.main(
          [],
          [
            h.button([h.OnClick(Message.ClickedAddNote())], ['Add note']),
            ...Array.map(model.notes, note =>
              h.keyed('div')(note.id, [], [note.view()]),
            ),
          ],
        ),
    }
  }),
).pipe(Layer.provide(NoteLive))
