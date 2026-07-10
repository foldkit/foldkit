import { Schema } from 'effect'
import { Command, Runtime } from 'foldkit'
import { Document, html } from 'foldkit/html'
import { m } from 'foldkit/message'

import { Button } from '@foldkit/ui'

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

export const init: Runtime.ApplicationInit<Model, Message> = () => [null, []]

// VIEW

export const view = (_model: Model): Document => {
  const h = html<Message>()

  return {
    title: 'Crash View Example',
    body: h.div(
      [h.Class('min-h-screen bg-gray-50 flex items-center justify-center p-6')],
      [
        Button.view<Message>({
          onClick: ClickedCrash(),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'bg-red-600 text-white text-lg font-semibold hover:bg-red-700 px-8 py-4 rounded-2xl shadow-lg cursor-pointer',
                ),
              ],
              ['Crash'],
            ),
        }),
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
    title: 'Crash View Example | crashed',
    body: h.div(
      [h.Class('min-h-screen flex items-center justify-center bg-red-50 p-6')],
      [
        h.div(
          [
            h.Class(
              'max-w-md w-full bg-white rounded-3xl border border-red-200 p-8 text-center shadow-xl',
            ),
          ],
          [
            h.h1(
              [
                h.Class(
                  'text-red-700 text-3xl font-semibold tracking-tight mb-4',
                ),
              ],
              ['Something went wrong'],
            ),
            h.p(
              [h.Class('text-gray-700 mb-6 leading-relaxed')],
              [error.message],
            ),
            Button.view<never>({
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      'bg-red-600 text-white border-none px-6 py-3 rounded-xl text-sm font-medium cursor-pointer hover:bg-red-700 shadow-sm',
                    ),
                    // oxlint-disable-next-line foldkit/no-raw-dom-event-attributes -- the crash view renders outside the dispatch loop, so there is no runtime to route a Message
                    h.Attribute('onclick', 'location.reload()'),
                  ],
                  ['Reload'],
                ),
            }),
          ],
        ),
      ],
    ),
  }
}
