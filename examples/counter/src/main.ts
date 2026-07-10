import { Match as M, Schema as S } from 'effect'
import { Command, Runtime } from 'foldkit'
import { Document, html } from 'foldkit/html'
import { m } from 'foldkit/message'

import { Button } from '@foldkit/ui'

// MODEL

export const Model = S.Struct({ count: S.Number })
export type Model = typeof Model.Type

// MESSAGE

export const ClickedDecrement = m('ClickedDecrement')
export const ClickedIncrement = m('ClickedIncrement')
export const ClickedReset = m('ClickedReset')

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
      [h.Class('min-h-screen bg-gray-50 flex items-center justify-center p-6')],
      [
        h.div(
          [
            h.Class(
              'w-full max-w-sm rounded-3xl border border-gray-200/80 bg-white p-8 shadow-xl flex flex-col items-center gap-8',
            ),
          ],
          [
            h.div(
              [
                h.Class(
                  'text-7xl font-semibold tracking-tight tabular-nums text-gray-900',
                ),
              ],
              [model.count.toString()],
            ),
            h.div(
              [h.Class('grid w-full grid-cols-3 gap-3')],
              [
                Button.view<Message>({
                  onClick: ClickedDecrement(),
                  toView: attributes =>
                    h.button(
                      [...attributes.button, h.Class(buttonStyle)],
                      ['-'],
                    ),
                }),
                Button.view<Message>({
                  onClick: ClickedReset(),
                  toView: attributes =>
                    h.button(
                      [...attributes.button, h.Class(buttonStyle)],
                      ['Reset'],
                    ),
                }),
                Button.view<Message>({
                  onClick: ClickedIncrement(),
                  toView: attributes =>
                    h.button(
                      [...attributes.button, h.Class(buttonStyle)],
                      ['+'],
                    ),
                }),
              ],
            ),
          ],
        ),
      ],
    ),
  }
}

// STYLE

const buttonStyle =
  'rounded-xl bg-gray-900 px-4 py-3 font-medium text-white shadow-sm hover:bg-gray-700 cursor-pointer'
