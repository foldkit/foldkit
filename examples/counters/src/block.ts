import { Array, Effect, Layer, Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { Button } from '@foldkit/ui'

import { Counter } from './blocks'

const INITIAL_COUNTER_COUNT = 3

type CounterInstance = typeof Counter.CounterBlock.Instance.Type

export const Model = Schema.Struct({
  counters: Schema.Array(Counter.CounterBlock.Instance),
  nextCounterId: Schema.Number,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedAddCounter: {},
  ClickedRemoveCounter: { id: Schema.String },
})
export type Message = typeof Message.Type

const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  Model,
  Message,
})

const { makeKeyedArrayBinding, makeComposition, makeFieldsStep } =
  ApplicationBlock

export const CountersBinding = makeKeyedArrayBinding(Counter.CounterBlock, {
  field: 'counters',
  key: 'key',
  childField: 'model',
})

export const ApplicationComposition = makeComposition({
  bindings: [CountersBinding],
})
type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>

const addCounter = makeFieldsStep(model => ({
  counters: Array.append(
    CountersBinding.create({
      key: `counter-${model.nextCounterId}`,
      args: [],
    }),
  ),
  nextCounterId: Number.increment,
}))

export const update = ApplicationComposition.makeUpdate({
  ClickedAddCounter: addCounter,
  ClickedRemoveCounter: makeFieldsStep.fromMessage(({ id }) => ({
    counters: Array.filter(counterInstance => counterInstance.key !== id),
  })),
})

export const init = ApplicationComposition.makeInit(() => ({
  model: { counters: [], nextCounterId: 0 },
  steps: Array.makeBy(INITIAL_COUNTER_COUNT, () => addCounter),
}))

const counterInstanceView = (
  counterInstance: CounterInstance,
  h: ApplicationViewBuilder,
): Html =>
  h.keyed('div')(
    counterInstance.key,
    [h.Class('flex items-center gap-2')],
    [
      h.div(
        [h.Class('flex-1')],
        [
          h.block(
            CountersBinding.embedView({
              key: counterInstance.key,
              slotId: counterInstance.key,
              model: counterInstance.model,
            }),
          ),
        ],
      ),
      Button.view(
        {
          onClick: Message.ClickedRemoveCounter({ id: counterInstance.key }),
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
          'Each instance is a Counter Block. The parent embeds the completed Block and Foldkit routes its Messages to the matching instance.',
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

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* ApplicationComposition.acquireChildren()

    return {
      children,
      init,
      update,
      view,
    }
  }),
).pipe(Layer.provide(Counter.layer))
