import { Array, Effect, Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

import { Counter } from './counter'

const INITIAL_COUNTER_COUNT = 3

export const Model = Schema.Struct({
  counters: Schema.Array(Counter),
  nextCounterId: Schema.Number,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedAddCounter: {},
  ClickedRemoveCounter: { id: Schema.String },
})
export type Message = typeof Message.Type

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
}) {}

const counterInstanceView = (counter: Counter, h: HtmlBuilder<Message>): Html =>
  h.keyed('div')(
    counter.id,
    [h.Class('flex items-center gap-2')],
    [
      h.div([h.Class('flex-1')], [counter.view()]),
      Button.view(
        {
          onClick: Message.ClickedRemoveCounter({ id: counter.id }),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-red-300 hover:text-red-600 transition cursor-pointer',
                ),
              ],
              ['Remove'],
            ),
        },
        h,
      ),
    ],
  )

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const counter = yield* Counter.each('counters')

    return {
      model: {
        counters: Array.makeBy(INITIAL_COUNTER_COUNT, counterId =>
          counter(`counter-${counterId}`),
        ),
        nextCounterId: INITIAL_COUNTER_COUNT,
      },

      update: {
        ClickedAddCounter: model => ({
          model: modifyFields(model, {
            counters: Array.append(counter(`counter-${model.nextCounterId}`)),
            nextCounterId: Number.increment,
          }),
        }),
        ClickedRemoveCounter: (model, { id }) => ({
          model: modifyFields(model, {
            counters: Array.filter(
              counterInstance => counterInstance.id !== id,
            ),
          }),
        }),
      },

      view: (model, h) => ({
        title: `Counters (${model.counters.length})`,
        body: h.div(
          [
            h.Class(
              'min-h-screen bg-white flex flex-col items-center py-12 px-6 gap-6',
            ),
          ],
          [
            h.h1(
              [h.Class('text-2xl font-semibold text-gray-900')],
              ['Counters'],
            ),
            h.p(
              [h.Class('text-sm text-gray-500 max-w-md text-center')],
              [
                'Each instance is a Counter Block. The parent renders each instance and Foldkit routes its Messages to the matching instance.',
              ],
            ),
            h.div(
              [h.Class('flex flex-col gap-3 w-full max-w-md')],
              Array.map(model.counters, counterInstance =>
                counterInstanceView(counterInstance, h),
              ),
            ),
            Button.view(
              {
                onClick: Message.ClickedAddCounter(),
                toView: attributes =>
                  h.button(
                    [
                      ...attributes.button,
                      h.Class(
                        'rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition cursor-pointer',
                      ),
                    ],
                    ['+ Add Counter'],
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
