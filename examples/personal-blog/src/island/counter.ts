import { Match as M, Schema as S } from 'effect'
import { Command, Submodel } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'

import { Button } from '@foldkit/ui'

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

const buttonStyle =
  'h-9 w-9 rounded-full border border-stone-300 text-lg leading-none text-stone-700 hover:bg-stone-100 transition cursor-pointer'

export const view = Submodel.defineView<Model, Message>(model => {
  const h = html<Message>()

  return h.div(
    [h.Class('flex items-center gap-4')],
    [
      Button.view<Message>({
        onClick: ClickedDecrement(),
        toView: attributes =>
          h.button([...attributes.button, h.Class(buttonStyle)], ['-']),
      }),
      h.span(
        [h.Class('w-12 text-center font-mono text-2xl tabular-nums')],
        [model.count.toString()],
      ),
      Button.view<Message>({
        onClick: ClickedIncrement(),
        toView: attributes =>
          h.button([...attributes.button, h.Class(buttonStyle)], ['+']),
      }),
    ],
  )
})
