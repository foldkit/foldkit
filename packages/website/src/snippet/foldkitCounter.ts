import { Match as M, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { Document, html } from 'foldkit/html'
import { m } from 'foldkit/message'

// MODEL - Your entire application state

const Model = S.Number
type Model = typeof Model.Type

// MESSAGE - Events that can happen in your app

const ClickedIncrement = m('ClickedIncrement')

const Message = S.Union([ClickedIncrement])
type Message = typeof Message.Type

// UPDATE - How Messages change the Model

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      ClickedIncrement: () => [model + 1, []],
    }),
  )

// VIEW - A pure function from Model to a Document

const { div, button, p, OnClick } = html<Message>()

const view = (model: Model): Document => ({
  title: `Count: ${model}`,
  body: div(
    [],
    [
      p([], [`Count: ${model}`]),
      button([OnClick(ClickedIncrement())], ['Increment']),
    ],
  ),
})
