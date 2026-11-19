import { Array, Option, Schema, String, pipe } from 'effect'

import { InputSelection } from '../../html/index.js'
import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import type * as Update from '../../update/index.js'

// MODEL

export const Model = Schema.Struct({
  note: Schema.String,
  maybeMentionQuery: Schema.Option(Schema.String),
  quantity: Schema.String,
  maybeQuantityCaret: Schema.Option(Schema.Number),
})

export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  UpdatedNote: {
    value: Schema.String,
    maybeSelection: Schema.Option(InputSelection),
  },
  UpdatedQuantity: {
    value: Schema.String,
    maybeSelection: Schema.Option(InputSelection),
  },
})

export type Message = typeof Message.Type

// INIT

export const initialModel: Model = {
  note: '',
  maybeMentionQuery: Option.none(),
  quantity: '',
  maybeQuantityCaret: Option.none(),
}

// UPDATE

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

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedNote: ({ value, maybeSelection }) => ({
      model: modifyFields(model, {
        note: () => value,
        maybeMentionQuery: () => mentionQueryBeforeCaret(value, maybeSelection),
      }),
    }),
    UpdatedQuantity: ({ value, maybeSelection }) => ({
      model: modifyFields(model, {
        quantity: () => value,
        maybeQuantityCaret: () =>
          Option.map(maybeSelection, ({ selectionEnd }) => selectionEnd),
      }),
    }),
  })

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      h.textarea([
        h.AriaLabel('Note'),
        h.Value(model.note),
        h.OnInput((value, maybeSelection) =>
          Message.UpdatedNote({ value, maybeSelection }),
        ),
      ]),
      h.span(
        [h.AriaLabel('Mention query')],
        [Option.getOrElse(model.maybeMentionQuery, () => 'None')],
      ),
      h.input([
        h.Type('number'),
        h.AriaLabel('Quantity'),
        h.Value(model.quantity),
        h.OnInput((value, maybeSelection) =>
          Message.UpdatedQuantity({ value, maybeSelection }),
        ),
      ]),
      h.span(
        [h.AriaLabel('Quantity caret')],
        [
          Option.match(model.maybeQuantityCaret, {
            onNone: () => 'None',
            onSome: caret => globalThis.String(caret),
          }),
        ],
      ),
    ],
  )
