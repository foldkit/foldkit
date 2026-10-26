import { Schema } from 'effect'
import { Block, Runtime } from 'foldkit'
import { Document, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { Button } from '@foldkit/ui'

export const Model = Schema.Null

export const Message = defineMessageUnion({
  ClickedCrash: {},
})

export const ApplicationComposition = Block.makeDefinition('Application', {
  Model,
  Message,
}).makeComposition()

const handleClickedCrash = (
  _model: typeof Model.Type,
  _message: typeof Message.ClickedCrash.Type,
): { model: typeof Model.Type } => {
  throw new Error('This is a simulated crash!')
}

export const update = ApplicationComposition.makeUpdate({
  ClickedCrash: handleClickedCrash,
})

export const init = ApplicationComposition.makeInit(() => ({
  model: null,
}))

export const view = ApplicationComposition.makeView((_model, h) => ({
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
}))

// CRASH

export const crashView = (
  { error }: Runtime.CrashContext<typeof Model.Type, typeof Message.Type>,
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

const prepare = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
