import { Array, Number, Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

import * as Counter from './counter'

const INITIAL_COUNTER_COUNT = 3

const CounterInstance = Schema.Struct({
  id: Schema.String,
  counter: Counter.CounterBlock.Model,
})

export const Model = Schema.Struct({
  counters: Schema.Array(CounterInstance),
  nextCounterId: Schema.Number,
})

export const Message = defineMessageUnion({
  ClickedAddCounter: {},
  ClickedRemoveCounter: { id: Schema.String },
})

export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

const { makeFieldsStep } = ApplicationDefinition

export const CountersBinding = ApplicationDefinition.makeBinding(
  Counter.CounterBlock,
  {
    field: 'counters',
    key: 'id',
    childField: 'counter',
    init: {
      instances: () =>
        Array.makeBy(INITIAL_COUNTER_COUNT, counterId => ({
          key: `counter-${counterId}`,
          args: Tuple.make(),
        })),
      toItem: ({ key }, counter) => ({ id: key, counter }),
    },
  },
)

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [CountersBinding],
})
type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>

export const update = ApplicationComposition.makeUpdate({
  ClickedAddCounter: model => {
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
  ClickedRemoveCounter: makeFieldsStep.fromMessage(({ id }) => ({
    counters: Array.filter(counterInstance => counterInstance.id !== id),
  })),
})

export const init = ApplicationComposition.makeInit(() => ({
  model: { nextCounterId: INITIAL_COUNTER_COUNT },
}))

const counterInstanceView = (
  counterInstance: typeof CounterInstance.Type,
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
