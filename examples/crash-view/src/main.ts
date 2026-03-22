import { Schema } from 'effect'
import { Command, Runtime } from 'foldkit'
import { Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'

// MODEL

const Model = Schema.Null
type Model = typeof Model.Type

// MESSAGE

const ClickedCrash = m('ClickedCrash')

const Message = Schema.Union(ClickedCrash)
export type Message = typeof Message.Type

// UPDATE

const update = (
  _model: Model,
  _message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
  throw new Error('This is a simulated crash!')
}

// INIT

const init: Runtime.ElementInit<Model, Message> = () => [null, []]

// VIEW

const { div, button, Class, OnClick } = html<Message>()

const view = (_model: Model): Html =>
  div(
    [Class('min-h-screen bg-white flex items-center justify-center')],
    [
      button(
        [
          OnClick(ClickedCrash()),
          Class(
            'bg-red-600 text-white text-lg font-semibold hover:bg-red-700 px-6 py-3 rounded transition cursor-pointer',
          ),
        ],
        ['Crash'],
      ),
    ],
  )

// CRASH

const crashView = ({ error }: Runtime.CrashContext<Model, Message>): Html => {
  const { div, h1, p, button, Class, Attribute } = html<never>()

  return div(
    [Class('min-h-screen flex items-center justify-center bg-red-50 p-8')],
    [
      div(
        [
          Class(
            'max-w-md w-full bg-white rounded-lg border border-red-200 p-8 text-center',
          ),
        ],
        [
          h1(
            [Class('text-red-600 text-2xl font-semibold mb-4')],
            ['Something went wrong'],
          ),
          p([Class('text-gray-700 mb-6 leading-relaxed')], [error.message]),
          button(
            [
              Class(
                'bg-red-600 text-white border-none px-6 py-2.5 rounded-md text-sm font-medium cursor-pointer hover:bg-red-700 transition',
              ),
              Attribute('onclick', 'location.reload()'),
            ],
            ['Reload'],
          ),
        ],
      ),
    ],
  )
}

// RUN

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  // Remove me to see the default crash view
  crash: {
    view: crashView,
    report: ({ error, model, message }) => {
      console.log('Crash report:', { error, model, message })
    },
  },
  container: document.getElementById('root')!,
})

Runtime.run(element)
