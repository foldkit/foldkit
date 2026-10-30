import { Effect, Schema } from 'effect'
import { Block, Runtime } from 'foldkit'
import { Document, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { Button } from '@foldkit/ui'

export const Model = Schema.Null
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedCrash: {},
})
export type Message = typeof Message.Type
type ClickedCrash = typeof Message.ClickedCrash.Type

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    return {
      model: null,

      update: {
        ClickedCrash: handleClickedCrash,
      },

      view: (_model, h) => ({
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
      }),
    }
  }),
)

const handleClickedCrash = (
  _model: Model,
  _message: ClickedCrash,
): { model: Model } => {
  throw new Error('This is a simulated crash!')
}

// CRASH

export const crashView = (
  { error }: Runtime.CrashContext<unknown, Message>,
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
