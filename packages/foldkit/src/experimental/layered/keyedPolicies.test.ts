import { Effect, HashMap, Schema } from 'effect'
import { expect, it } from 'vitest'

import { makeInitIfMissingStep } from '../../block/mapInitialization.js'
import { defineMessageUnion } from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import { makeDefinition } from './public.js'

it('resolves a keyed OutMessage policy against the same acquired graph when it invokes a sibling operation', async () => {
  const ChildModel = Schema.Struct({ count: Schema.Number })
  const ChildMessage = defineMessageUnion({ ClickedIncrement: {} })
  const ChildOutMessage = defineMessageUnion({
    Changed: { value: Schema.Number },
  })
  const ChildDefinition = makeDefinition('KeyedPolicyCounter', {
    Model: ChildModel,
    Message: ChildMessage,
    OutMessage: ChildOutMessage,
  })
  const ChildComposition = ChildDefinition.makeComposition()
  const ChildBlock = ChildDefinition.makeBlock(
    Effect.succeed({
      children: [],
      init: ChildComposition.makeInit(() => ({ model: { count: 0 } })),
      update: ChildComposition.makeUpdate({
        ClickedIncrement: model => {
          const count = model.count + 1

          return {
            model: modifyFields(model, { count: () => count }),
            outMessage: ChildOutMessage.Changed({ value: count }),
          }
        },
      }),
      operations: { increment: ChildMessage.ClickedIncrement },
    }),
  )

  const TotalModel = Schema.Struct({ value: Schema.Number })
  const TotalMessage = defineMessageUnion({
    UpdatedTotal: { value: Schema.Number },
  })
  const TotalDefinition = makeDefinition('KeyedPolicyTotal', {
    Model: TotalModel,
    Message: TotalMessage,
  })
  const TotalComposition = TotalDefinition.makeComposition()
  const TotalBlock = TotalDefinition.makeBlock(
    Effect.succeed({
      children: [],
      init: TotalComposition.makeInit(() => ({ model: { value: 0 } })),
      update: TotalComposition.makeUpdate({
        UpdatedTotal: TotalDefinition.makeFieldsStep.fromMessage(
          ({ value }) => ({ value: () => value }),
        ),
      }),
      operations: { setValue: TotalMessage.UpdatedTotal },
    }),
  )

  const Model = Schema.Struct({
    counters: Schema.HashMap(Schema.String, ChildBlock.Model),
    total: TotalBlock.Model,
    label: Schema.String,
  })
  const Message = defineMessageUnion({
    RequestedCounter: { key: Schema.String },
    ClickedIncrement: { key: Schema.String },
  })
  const Definition = makeDefinition('KeyedPolicyParent', { Model, Message })
  const TotalBinding = Definition.makeRequiredFieldBinding(TotalBlock, {
    field: 'total',
  })
  const CountersBinding = Definition.makeHashMapBinding(ChildBlock, {
    field: 'counters',
  }).withOutMessagePolicy({
    fold: (_key, outMessage) =>
      Definition.makeOutMessageFold(ChildBlock, {
        Changed: ({ value }) => TotalBinding.setValue({ value }),
      })(outMessage),
  })
  const Composition = Definition.makeComposition({
    bindings: [CountersBinding, TotalBinding],
  })
  const ParentBlock = Definition.makeBlock(
    Effect.gen(function* () {
      const counters = yield* CountersBinding
      const total = yield* TotalBinding

      return {
        children: [counters, total],
        init: Composition.makeInit(() => ({
          model: { counters: HashMap.empty(), label: 'initial' },
        })),
        update: Composition.makeUpdate({
          RequestedCounter: (model, { key }) =>
            makeInitIfMissingStep(CountersBinding, { key, args: [] })(
              modifyFields(model, { label: () => key }),
            ),
          ClickedIncrement: Definition.makeStep.fromMessage(({ key }) =>
            CountersBinding.increment(key),
          ),
        }),
      }
    }),
  )

  await Effect.runPromise(
    Effect.gen(function* () {
      const block = yield* ParentBlock.get
      const opened = block.update(
        block.init().model,
        Message.RequestedCounter({ key: 'one' }),
      )
      const incremented = block.update(
        opened.model,
        Message.ClickedIncrement({ key: 'one' }),
      )

      expect(opened.model.label).toBe('one')
      expect(incremented.model.total.value).toBe(1)
    }).pipe(Effect.provide(ParentBlock.layer)),
  )
})
