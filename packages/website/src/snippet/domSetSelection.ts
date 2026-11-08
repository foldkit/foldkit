import { Effect, Option, Schema } from 'effect'
import { Command, Dom, type Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Mention = Schema.Struct({
  mentionStart: Schema.Int,
  caret: Schema.Int,
})

const Model = Schema.Struct({
  note: Schema.String,
  maybeMention: Schema.Option(Mention),
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedMentionOption: { name: Schema.String },
  CompletedFocusNoteAtCaret: {},
})
type Message = typeof Message.Type

const FocusNoteAtCaret = Command.define('FocusNoteAtCaret', {
  args: { caret: Schema.Int },
  messages: [Message.CompletedFocusNoteAtCaret],
  execute: ({ caret }) =>
    Effect.gen(function* () {
      yield* Dom.focus('#note')
      yield* Dom.setSelection('#note', {
        selectionStart: caret,
        selectionEnd: caret,
      })
    }).pipe(Effect.ignore, Effect.as(Message.CompletedFocusNoteAtCaret())),
})

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedMentionOption: ({ name }) =>
      Option.match(model.maybeMention, {
        onNone: () => ({ model }),
        onSome: ({ mentionStart, caret }) => {
          const completion = `@${name} `
          const nextNote =
            model.note.slice(0, mentionStart) +
            completion +
            model.note.slice(caret)

          return {
            model: modifyFields(model, {
              note: () => nextNote,
              maybeMention: () => Option.none(),
            }),
            commands: [
              FocusNoteAtCaret({ caret: mentionStart + completion.length }),
            ],
          }
        },
      }),
    CompletedFocusNoteAtCaret: () => ({ model }),
  })
