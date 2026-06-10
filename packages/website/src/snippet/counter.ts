import { Match as M, Schema as S } from 'effect'
import { Command, Runtime } from 'foldkit'
import { Document, html } from 'foldkit/html'
import { m } from 'foldkit/message'

// MODEL

export const Model = S.Struct({
  count: S.Number,
})
export type Model = typeof Model.Type

// MESSAGE

const ClickedDecrement = m('ClickedDecrement')
const ClickedIncrement = m('ClickedIncrement')
const ClickedReset = m('ClickedReset')

export const Message = S.Union([
  ClickedDecrement,
  ClickedIncrement,
  ClickedReset,
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
      ClickedDecrement: () => [{ count: model.count - 1 }, []],
      ClickedIncrement: () => [{ count: model.count + 1 }, []],
      ClickedReset: () => [{ count: 0 }, []],
    }),
  )

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => [
  { count: 0 },
  [],
]

// VIEW

export const view = (model: Model): Document => {
  const h = html<Message>()

  return {
    title: `Counter: ${model.count}`,
    body: h.div(
      [
        h.Class(
          'min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-6',
        ),
      ],
      [
        h.div(
          [h.Class('text-6xl font-bold text-gray-800')],
          [model.count.toString()],
        ),
        h.div(
          [h.Class('flex flex-wrap justify-center gap-4')],
          [
            h.button(
              [h.OnClick(ClickedDecrement()), h.Class(buttonStyle)],
              ['-'],
            ),
            h.button(
              [h.OnClick(ClickedReset()), h.Class(buttonStyle)],
              ['Reset'],
            ),
            h.button(
              [h.OnClick(ClickedIncrement()), h.Class(buttonStyle)],
              ['+'],
            ),
          ],
        ),
      ],
    ),
  }
}

// STYLE

const buttonStyle = 'bg-black text-white hover:bg-gray-700 px-4 py-2 transition'
