import { Match as M, Schema as S } from 'effect'
import { Runtime } from 'foldkit'
import { Command } from 'foldkit/command'
import { m } from 'foldkit/message'

import { Class, Html, OnClick, button, div } from '../html'

// MODEL

const Model = S.Struct({
  count: S.Number,
})
type Model = typeof Model.Type

// MESSAGE

const ClickedDecrement = m('ClickedDecrement')
const ClickedIncrement = m('ClickedIncrement')
const ClickedReset = m('ClickedReset')

const Message = S.Union(
  ClickedDecrement,
  ClickedIncrement,
  ClickedReset,
)
type Message = typeof Message.Type

// UPDATE

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      ClickedDecrement: () => [Model({ count: model.count - 1 }), []],
      ClickedIncrement: () => [Model({ count: model.count + 1 }), []],
      ClickedReset: () => [Model({ count: 0 }), []],
    }),
  )

// INIT

const init: Runtime.ElementInit<Model, Message> = () => [
  Model({ count: 0 }),
  [],
]

// VIEW

const view = (model: Model): Html =>
  div(
    [Class(containerStyle)],
    [
      div(
        [Class('text-6xl font-bold text-gray-800')],
        [model.count.toString()],
      ),
      div(
        [Class('flex flex-wrap justify-center gap-4')],
        [
          button(
            [OnClick(ClickedDecrement()), Class(buttonStyle)],
            ['-'],
          ),
          button(
            [OnClick(ClickedReset()), Class(buttonStyle)],
            ['Reset'],
          ),
          button(
            [OnClick(ClickedIncrement()), Class(buttonStyle)],
            ['+'],
          ),
        ],
      ),
    ],
  )

// STYLE

const containerStyle =
  'min-h-screen bg-cream flex flex-col items-center justify-center gap-6 p-6'

const buttonStyle =
  'bg-black text-white hover:bg-gray-700 px-4 py-2 transition'

// RUN

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
})

Runtime.run(element)
