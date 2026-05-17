import { Schema } from 'effect'
import { Command, Runtime } from 'foldkit'
import { Document, html } from 'foldkit/html'
import { m } from 'foldkit/message'

// MODEL

export const Model = Schema.Null
export type Model = typeof Model.Type

// MESSAGE

export const ClickedCrash = m('ClickedCrash')

export const Message = Schema.Union([ClickedCrash])
export type Message = typeof Message.Type

// UPDATE

export const update = (
  _model: Model,
  _message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
  throw new Error('This is a simulated crash!')
}

// INIT

export const init: Runtime.ProgramInit<Model, Message> = () => [null, []]

// VIEW

export const view = (_model: Model): Document => {
  const h = html<Message>()

  return {
    title: 'Crash View Example',
    body: h.div(
      [h.Class('min-h-screen bg-white flex items-center justify-center')],
      [
        h.button(
          [
            h.OnClick(ClickedCrash()),
            h.Class(
              'bg-red-600 text-white text-lg font-semibold hover:bg-red-700 px-6 py-3 rounded transition cursor-pointer',
            ),
          ],
          ['Crash'],
        ),
      ],
    ),
  }
}

// CRASH

export const crashView = ({
  error,
}: Runtime.CrashContext<Model, Message>): Document => {
  const h = html<never>()

  return {
    title: 'Crash View Example — crashed',
    body: h.div(
      [h.Class('min-h-screen flex items-center justify-center bg-red-50 p-8')],
      [
        h.div(
          [
            h.Class(
              'max-w-md w-full bg-white rounded-lg border border-red-200 p-8 text-center',
            ),
          ],
          [
            h.h1(
              [h.Class('text-red-600 text-2xl font-semibold mb-4')],
              ['Something went wrong'],
            ),
            h.p(
              [h.Class('text-gray-700 mb-6 leading-relaxed')],
              [error.message],
            ),
            h.button(
              [
                h.Class(
                  'bg-red-600 text-white border-none px-6 py-2.5 rounded-md text-sm font-medium cursor-pointer hover:bg-red-700 transition',
                ),
                h.Attribute('onclick', 'location.reload()'),
              ],
              ['Reload'],
            ),
          ],
        ),
      ],
    ),
  }
}
