import { Array, Option, Schema, String, pipe } from 'effect'
import type { Update } from 'foldkit'
import { InputSelection, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Model = Schema.Struct({
  note: Schema.String,
  maybeMentionQuery: Schema.Option(Schema.String),
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  UpdatedNote: {
    value: Schema.String,
    maybeSelection: Schema.Option(InputSelection),
  },
})
type Message = typeof Message.Type

const MENTION_BEFORE_CARET = /@(\w*)$/

const mentionQueryBeforeCaret = (
  value: string,
  maybeSelection: Option.Option<InputSelection>,
): Option.Option<string> =>
  pipe(
    maybeSelection,
    Option.filter(
      ({ selectionStart, selectionEnd }) => selectionStart === selectionEnd,
    ),
    Option.map(({ selectionEnd }) => value.slice(0, selectionEnd)),
    Option.flatMap(String.match(MENTION_BEFORE_CARET)),
    Option.flatMap(Array.get(1)),
  )

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedNote: ({ value, maybeSelection }) => ({
      model: modifyFields(model, {
        note: () => value,
        maybeMentionQuery: () => mentionQueryBeforeCaret(value, maybeSelection),
      }),
    }),
  })

const noteView = (model: Model, h: HtmlBuilder<Message>) =>
  h.textarea([
    h.Value(model.note),
    h.OnInput((value, maybeSelection) =>
      Message.UpdatedNote({ value, maybeSelection }),
    ),
  ])
