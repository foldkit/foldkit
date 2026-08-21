import { Schema } from 'effect'
import { Command, Runtime } from 'foldkit'
import { Document, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { Button } from '@foldkit/ui'

// MODEL

export const Model = Schema.Null
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedCrash: {},
})

export type Message = typeof Message.Type

// UPDATE

export const update = (
  _model: Model,
  _message: Message,
): Readonly<{
  model: Model
  commands?: ReadonlyArray<Command.Command<Message>>
  outMessage?: never
}> => {
  throw new Error('This is a simulated crash!')
}

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: null,
})

// VIEW

export const view = (_model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Crash View Example',
  body: h.div(
    [h.Class('min-h-screen bg-white flex items-center justify-center')],
    [
      Button.view(
        {
          onClick: Message.ClickedCrash(),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'bg-red-600 text-white text-lg font-semibold hover:bg-red-700 px-6 py-3 rounded transition cursor-pointer',
                ),
              ],
              ['Crash'],
            ),
        },
        h,
      ),
    ],
  ),
})

// CRASH

export const crashView = (
  { error }: Runtime.CrashContext<Model, Message>,
  h: HtmlBuilder<never>,
): Document => ({
  title: 'Crash View Example | crashed',
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
          h.p([h.Class('text-gray-700 mb-6 leading-relaxed')], [error.message]),
          Button.view(
            {
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      'bg-red-600 text-white border-none px-6 py-2.5 rounded-md text-sm font-medium cursor-pointer hover:bg-red-700 transition',
                    ),
                    // oxlint-disable-next-line foldkit/no-raw-dom-event-attributes -- the crash view renders outside the dispatch loop, so there is no runtime to route a Message
                    h.Attribute('onclick', 'location.reload()'),
                  ],
                  ['Reload'],
                ),
            },
            h,
          ),
        ],
      ),
    ],
  ),
})
