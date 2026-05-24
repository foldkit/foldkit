import { Match as M, Schema as S } from 'effect'
import { Command, Submodel } from 'foldkit'
import { Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'

// MODEL

export const Model = S.Struct({ count: S.Number })
export type Model = typeof Model.Type

export const init: Model = { count: 0 }

// MESSAGE

export const ClickedDecrement = m('ClickedDecrement')
export const ClickedIncrement = m('ClickedIncrement')

export const Message = S.Union([ClickedDecrement, ClickedIncrement])
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
    }),
  )

// VIEW

export const view = Submodel.defineView<Model, Message>((model): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Class(
        'flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3',
      ),
    ],
    [
      h.button([h.OnClick(ClickedDecrement()), h.Class(buttonStyle)], ['-']),
      h.span(
        [h.Class('w-12 text-center text-2xl font-mono tabular-nums')],
        [model.count.toString()],
      ),
      h.button([h.OnClick(ClickedIncrement()), h.Class(buttonStyle)], ['+']),
    ],
  )
})

const buttonStyle =
  'h-9 w-9 rounded bg-gray-900 text-white text-lg leading-none hover:bg-gray-700 transition cursor-pointer'
