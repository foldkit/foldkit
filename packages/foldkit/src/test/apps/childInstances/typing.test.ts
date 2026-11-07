import { Array, Effect, Schema } from 'effect'
import { expectTypeOf, it } from 'vitest'

import type { CreationSlot } from '../../../block/occurrence.js'
import { makeDefinition } from '../../../block/public.js'
import { modifyFields } from '../../../struct/index.js'
import * as Update from '../../../update/index.js'
import { ApplicationComposition, CountersBinding } from './composition.js'
import { CounterBlock } from './counter.js'
import {
  ApplicationDefinition,
  Message,
  Model,
  makeFieldsStep,
} from './definition.js'
import { addCounter } from './transitions.js'

const checkRejectedInputs = (model: Model) => {
  const creation = CountersBinding.create({ key: 'first', args: [3] })

  // @ts-expect-error The exact child initializer requires a number.
  CountersBinding.create({ key: 'first', args: ['three'] })
  // @ts-expect-error The standard Instance key is a string.
  CountersBinding.create({ key: 3, args: [3] })
  // @ts-expect-error Pending creation is not a ready child Model.
  creation.model.count
  // @ts-expect-error Ordinary Model construction cannot contain creation requests.
  Model.make({ ...model, counters: [creation] })
  // @ts-expect-error Ordinary field modification must produce ready Model fields.
  modifyFields(model, { counters: Array.append(creation) })
  // @ts-expect-error A creation request cannot be stored in an unrelated scalar field.
  makeFieldsStep(() => ({ summary: () => creation }))

  const pending = addCounter('first', 3)(model)
  // @ts-expect-error An unexecuted connected result has no readable Model.
  pending.model.counters

  const OtherKey = Symbol('OtherOccurrenceApplication')
  const OtherDefinition = makeDefinition('OtherOccurrenceApplication', {
    key: OtherKey,
    Model,
    Message,
    InitArgs: Schema.Tuple([]),
  })
  const OtherCountersBinding = OtherDefinition.makeKeyedArrayBinding(
    CounterBlock,
    {
      field: 'counters',
      key: 'key',
      childField: 'model',
    },
  ).withOutMessagePolicy({ fold: () => OtherDefinition.makeNoopStep() })

  makeFieldsStep(() => ({
    // @ts-expect-error Matching structural Models do not authorize another parent's creation requests.
    counters: Array.append(
      OtherCountersBinding.create({ key: 'other', args: [3] }),
    ),
  }))

  const stripped: CreationSlot<
    typeof CounterBlock.owner,
    typeof ApplicationDefinition.owner,
    'counters'
  > = creation

  // @ts-expect-error Widening a request cannot erase child Commands, Services or registration.
  makeFieldsStep(() => ({ counters: Array.append(stripped) }))

  const WrongCounterKey = Symbol('WrongOccurrenceCounter')
  const WrongCounterDefinition = makeDefinition('WrongOccurrenceCounter', {
    key: WrongCounterKey,
    Model: CounterBlock.Model,
    Message: Schema.Never,
    isMessageFree: true,
    InitArgs: Schema.Tuple([]),
  })

  // @ts-expect-error Identical child Models do not authorize another child contract's Instance field.
  ApplicationDefinition.makeKeyedArrayBinding(WrongCounterDefinition.contract, {
    field: 'counters',
    key: 'key',
    childField: 'model',
  })

  const UnregisteredComposition = ApplicationDefinition.makeComposition()
  const unregisteredUpdate = UnregisteredComposition.makeUpdate({
    ClickedAddCounter: addCounter('first', 3),
    ClickedAddAndIncrement: model => ({ model }),
    ClickedRemoveCounter: model => ({ model }),
  })
  // @ts-expect-error Checked completion must reject creation through an unregistered Binding.
  ApplicationDefinition.makeBlock(
    Effect.succeed({
      children: [],
      init: UnregisteredComposition.makeInit(_counts => ({
        model: { counters: [], summary: 0, lastChangedCount: 0 },
      })),
      update: unregisteredUpdate,
      view: UnregisteredComposition.makeView((_model, h) => h.div([])),
    }),
  )
}
void checkRejectedInputs

it('retains exact initialization requirements, ready Models and inline Message payloads', () => {
  expectTypeOf<
    Update.RequirementsOf<ReturnType<typeof addCounter>>
  >().not.toEqualTypeOf<never>()

  ApplicationComposition.makeUpdate({
    ClickedAddCounter: makeFieldsStep((model, message) => {
      expectTypeOf(model).toEqualTypeOf<Model>()
      expectTypeOf(message).toEqualTypeOf<
        typeof Message.ClickedAddCounter.Type
      >()
      expectTypeOf(model.counters).toEqualTypeOf<
        ReadonlyArray<typeof CounterBlock.Instance.Type>
      >()
      // @ts-expect-error Exact Message payload inference cannot invent fields.
      message.nonexistent

      return {
        counters: Array.append(
          CountersBinding.create({ key: message.key, args: [message.count] }),
        ),
      }
    }),
    ClickedAddAndIncrement: model => ({ model }),
    ClickedRemoveCounter: model => ({ model }),
  })
})
