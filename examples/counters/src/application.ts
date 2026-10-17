import { Array, Number, Option, Schema, Tuple } from 'effect'
import { defineApplication } from 'foldkit'
import type { Block } from 'foldkit'
import { Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

import * as Counter from './counter'

const INITIAL_COUNTER_COUNT = 3

const CounterInstance = Schema.Struct({
  id: Schema.String,
  counter: Counter.Model,
})
type CounterInstance = typeof CounterInstance.Type

export const Model = Schema.Struct({
  counters: Schema.Array(CounterInstance),
  nextCounterId: Schema.Number,
})

export const Message = defineMessageUnion({
  ClickedAddCounter: {},
  ClickedRemoveCounter: { id: Schema.String },
  GotCounterMessage: {
    id: Schema.String,
    message: Counter.Message,
  },
})

export const Application = defineApplication({ Model, Message })

const CountersBinding = Application.bindChild(Counter.block, {
  field: 'counters',
  key: 'id',
  childField: 'counter',
  toParentMessage: (id, message) => Message.GotCounterMessage({ id, message }),
  fromParentMessage: {
    parentMessage: Message.GotCounterMessage,
    args: (_model, { id, message }) => Option.some([id, message]),
  },
  init: {
    occurrences: () =>
      Array.makeBy(INITIAL_COUNTER_COUNT, counterId => ({
        key: `counter-${counterId}`,
        args: Tuple.make(),
      })),
    toItem: ({ key }, counter) => ({ id: key, counter }),
  },
})

export const ApplicationComposition = Application.makeComposition({
  childBindings: [CountersBinding],
})
type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedAddCounter: () => {
      const id = `counter-${model.nextCounterId}`
      return CountersBinding.init({
        key: id,
        args: [],
        toParentModel: counter =>
          modifyFields(model, {
            counters: Array.append({ id, counter }),
            nextCounterId: Number.increment,
          }),
      })
    },
    ClickedRemoveCounter: ({ id }) => ({
      model: modifyFields(model, {
        counters: Array.filter(counterInstance => counterInstance.id !== id),
      }),
    }),
  }),
)

export const init = ApplicationComposition.makeInit(() => ({
  model: { nextCounterId: INITIAL_COUNTER_COUNT },
}))

const counterInstanceView = (
  counterInstance: CounterInstance,
  h: ApplicationViewBuilder,
): Html =>
  h.keyed('div')(
    counterInstance.id,
    [h.Class('flex items-center gap-2')],
    [
      h.div(
        [h.Class('flex-1')],
        [
          h.block(
            CountersBinding.embedView({
              key: counterInstance.id,
              slotId: counterInstance.id,
              model: counterInstance.counter,
            }),
          ),
        ],
      ),
      Button.view(
        {
          onClick: Message.ClickedRemoveCounter({ id: counterInstance.id }),
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

export const view = ApplicationComposition.makeView((model, h) => ({
  title: `Counters (${model.counters.length})`,
  body: h.div(
    [
      h.Class(
        'min-h-screen bg-white flex flex-col items-center py-12 px-6 gap-6',
      ),
    ],
    [
      h.h1([h.Class('text-2xl font-semibold text-gray-900')], ['Counters']),
      h.p(
        [h.Class('text-sm text-gray-500 max-w-md text-center')],
        [
          'Each instance is a Counter Block. The parent has no awareness of Counter internals; it just embeds the Block via h.block and routes dispatched messages back to the corresponding instance via the GotCounterMessage wrapper.',
        ],
      ),
      h.div(
        [h.Class('flex flex-col gap-3 w-full max-w-md')],
        model.counters.map(counterInstance =>
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
}))
