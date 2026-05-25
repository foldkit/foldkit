import { Array, Match as M, Option, Schema as S } from 'effect'
import { Command, Runtime } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import * as Counter from './counter'

// MODEL

const Row = S.Struct({
  id: S.String,
  counter: Counter.Model,
})
type Row = typeof Row.Type

export const Model = S.Struct({
  rows: S.Array(Row),
  nextRowId: S.Number,
})
export type Model = typeof Model.Type

// MESSAGE

export const ClickedAddRow = m('ClickedAddRow')
export const ClickedRemoveRow = m('ClickedRemoveRow', { id: S.String })

export const GotCounterMessage = m('GotCounterMessage', {
  id: S.String,
  message: Counter.Message,
})

export const Message = S.Union([
  ClickedAddRow,
  ClickedRemoveRow,
  GotCounterMessage,
])
export type Message = typeof Message.Type

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      ClickedAddRow: () => [
        evo(model, {
          rows: Array.append({
            id: `counter-${model.nextRowId}`,
            counter: Counter.init,
          }),
          nextRowId: nextRowId => nextRowId + 1,
        }),
        [],
      ],
      ClickedRemoveRow: ({ id }) => [
        evo(model, {
          rows: Array.filter(row => row.id !== id),
        }),
        [],
      ],
      GotCounterMessage: ({ id, message }) =>
        Option.match(
          Array.findFirst(model.rows, row => row.id === id),
          {
            onNone: () => [model, []],
            onSome: row => {
              const [nextCounter, commands] = Counter.update(
                row.counter,
                message,
              )
              return [
                evo(model, {
                  rows: Array.map(existingRow =>
                    existingRow.id === id
                      ? evo(existingRow, { counter: () => nextCounter })
                      : existingRow,
                  ),
                }),
                Command.mapMessages(commands, childMessage =>
                  GotCounterMessage({ id, message: childMessage }),
                ),
              ]
            },
          },
        ),
    }),
  )

// INIT

export const init: Runtime.ProgramInit<Model, Message> = () => [
  {
    rows: [
      { id: 'counter-0', counter: Counter.init },
      { id: 'counter-1', counter: Counter.init },
      { id: 'counter-2', counter: Counter.init },
    ],
    nextRowId: 3,
  },
  [],
]

// VIEW

const rowView = (row: Row): Html => {
  const h = html<Message>()

  return h.keyed('div')(
    row.id,
    [h.Class('flex items-center gap-2')],
    [
      h.div(
        [h.Class('flex-1')],
        [
          h.submodel({
            slotId: row.id,
            model: row.counter,
            view: Counter.view,
            toParentMessage: message =>
              GotCounterMessage({ id: row.id, message }),
          }),
        ],
      ),
      h.button(
        [
          h.OnClick(ClickedRemoveRow({ id: row.id })),
          h.Class(
            'rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-red-300 hover:text-red-600 transition cursor-pointer',
          ),
        ],
        ['Remove'],
      ),
    ],
  )
}

export const view = (model: Model): Document => {
  const h = html<Message>()

  return {
    title: `Counters (${model.rows.length})`,
    body: h.div(
      [
        h.Class(
          'min-h-screen bg-white flex flex-col items-center py-12 px-6 gap-6',
        ),
      ],
      [
        h.h1([h.Class('text-2xl font-semibold text-gray-900')], ['Counters']),
        h.p(
          [h.Class('text-sm text-gray-500 max-w-md text-center')],
          [
            'Each row is a Counter Submodel. The parent has no awareness of Counter internals; it just embeds the Submodel via h.submodel and routes dispatched messages back to the right row via the GotCounterMessage wrapper.',
          ],
        ),
        h.div(
          [h.Class('flex flex-col gap-3 w-full max-w-md')],
          model.rows.map(rowView),
        ),
        h.button(
          [
            h.OnClick(ClickedAddRow()),
            h.Class(
              'rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition cursor-pointer',
            ),
          ],
          ['+ Add Counter'],
        ),
      ],
    ),
  }
}
