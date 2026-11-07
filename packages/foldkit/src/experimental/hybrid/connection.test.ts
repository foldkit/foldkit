import { Effect, Schema } from 'effect'
import { expect, it } from 'vitest'

import * as Block from '../../block/public.js'
import { defineMessageUnion } from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import * as Hybrid from './public.js'

const Model = Schema.Struct({ count: Schema.Number })
const Message = defineMessageUnion({ ClickedIncrement: {} })
const OutMessage = defineMessageUnion({ Changed: { count: Schema.Number } })
const Definition = Block.makeDefinition('ConnectionExtensionChild', {
  Model,
  Message,
  OutMessage,
})
const Composition = Definition.makeComposition()
const prepare = () =>
  Composition.prepareBlock({
    init: Composition.makeInit(() => ({ model: { count: 0 } })),
    update: Composition.makeUpdate({
      ClickedIncrement: model => {
        const count = model.count + 1

        return {
          model: modifyFields(model, { count: () => count }),
          outMessage: OutMessage.Changed({ count }),
        }
      },
    }),
    operations: { increment: Message.ClickedIncrement },
  })
const ChildBlock: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)

it('authors direct keyed initialization without an identity adapter', () => {
  const ParentDefinition = Hybrid.makeDefinition(
    'DirectKeyedConnectionParent',
    {
      Model: Schema.Struct({ children: Schema.Array(ChildBlock.Model) }),
      Message: Schema.Never,
    },
  )
  const Binding = ParentDefinition.makeKeyedArrayBinding(ChildBlock, {
    field: 'children',
    key: 'count',
    init: { instances: () => [{ key: 0, args: [] }] },
  })

  expect(Object.hasOwn(Binding, 'connect')).toBe(true)
})

it('retains the selected and reselected policy on an experimental connection alias', async () => {
  const ParentDefinition = Hybrid.makeDefinition('ConnectionExtensionParent', {
    Model: Schema.Struct({ child: ChildBlock.Model, observed: Schema.Number }),
    Message: defineMessageUnion({ ClickedIncrement: {} }),
  })
  const Binding = ParentDefinition.makeRequiredFieldBinding(ChildBlock, {
    field: 'child',
    init: false,
  })
    .withOutMessagePolicy({
      fold: ParentDefinition.makeOutMessageFold(ChildBlock, {
        Changed: ({ count }) =>
          ParentDefinition.makeFieldsStep(() => ({ observed: () => count })),
      }),
    })
    .withOutMessagePolicy({
      fold: ParentDefinition.makeOutMessageFold(ChildBlock, {
        Changed: ({ count }) =>
          ParentDefinition.makeFieldsStep(() => ({
            observed: () => count * 2,
          })),
      }),
    })
  const ParentComposition = ParentDefinition.makeComposition({
    bindings: [Binding],
  })
  const init = ParentComposition.makeInit(() => ({
    model: { child: { count: 0 }, observed: 0 },
  }))
  const update = ParentComposition.makeUpdate({
    ClickedIncrement: Binding.increment(),
  })
  const ConstructedChild = Hybrid.fromBlock(
    'ConnectionExtensionConstructor',
    ChildBlock,
  )
  const ParentBlock = ParentDefinition.makeBlock(
    Effect.gen(function* () {
      const child = yield* ConstructedChild('child')

      return {
        bindings: [Binding.connect(child)],
        init,
        update,
      }
    }),
  )
  const block = await Effect.runPromise(
    ParentBlock.build.pipe(Effect.provide(ConstructedChild.layer)),
  )
  const updated = block.update(
    block.init().model,
    ParentDefinition.Message.ClickedIncrement(),
  )

  expect(Object.hasOwn(Binding, 'connect')).toBe(true)
  expect(updated.model.child.count).toBe(1)
  expect(updated.model.observed).toBe(2)
})

it('keeps connect available as an ordinary child operation and reserves it only in experimental connections', () => {
  const NativeDefinition = Block.makeDefinition('NativeConnectOperation', {
    Model,
    Message,
  })
  const NativeComposition = NativeDefinition.makeComposition()
  const prepareNative = () =>
    NativeComposition.prepareBlock({
      init: NativeComposition.makeInit(() => ({ model: { count: 0 } })),
      update: NativeComposition.makeUpdate({
        ClickedIncrement: NativeDefinition.makeFieldsStep(() => ({
          count: count => count + 1,
        })),
      }),
      operations: { connect: Message.ClickedIncrement },
    })
  const NativeBlock: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof Model,
    typeof prepareNative
  > = Block.assemble(prepareNative)
  const Parent = Block.makeDefinition('NativeConnectParent', {
    Model: Schema.Struct({ child: NativeBlock.Model }),
    Message,
  })
  const NativeBinding = Parent.makeRequiredFieldBinding(NativeBlock, {
    field: 'child',
  })
  const ParentComposition = Parent.makeComposition({
    bindings: [NativeBinding],
  })
  const update = ParentComposition.makeUpdate({
    ClickedIncrement: NativeBinding.connect(),
  })
  const updated = update({ child: { count: 0 } }, Message.ClickedIncrement())
  const Experimental = Hybrid.makeDefinition('ReservedConnectParent', {
    Model: Parent.Model,
    Message,
  })

  expect(updated.model.child.count).toBe(1)
  expect(() =>
    Reflect.apply(Experimental.makeRequiredFieldBinding, undefined, [
      NativeBlock,
      { field: 'child' },
    ]),
  ).toThrow('cannot be named "connect"')

  if (false) {
    // @ts-expect-error Only experimental connection methods reserve the operation name.
    Experimental.makeRequiredFieldBinding(NativeBlock, { field: 'child' })
  }
})

it('connects keyed storage through the internal native protocol and preserves its selected policy', async () => {
  const ParentDefinition = Hybrid.makeDefinition('KeyedConnectionParent', {
    Model: Schema.Struct({
      children: Schema.Record(Schema.String, ChildBlock.Model),
      observed: Schema.Number,
    }),
    Message: defineMessageUnion({ ClickedIncrement: {} }),
  })
  const Binding = ParentDefinition.makeRecordBinding(ChildBlock, {
    field: 'children',
  }).withOutMessagePolicy({
    fold: (key, outMessage) =>
      ParentDefinition.makeOutMessageFold(ChildBlock, {
        Changed: ({ count }) =>
          ParentDefinition.makeFieldsStep(() => ({
            observed: () => (key === 'primary' ? count : 0),
          })),
      })(outMessage),
  })
  const ParentComposition = ParentDefinition.makeComposition({
    bindings: [Binding],
  })
  const init = ParentComposition.makeInit(() => ({
    model: {
      children: { primary: { count: 0 }, secondary: { count: 0 } },
      observed: 0,
    },
  }))
  const update = ParentComposition.makeUpdate({
    ClickedIncrement: Binding.increment('primary'),
  })
  const ConstructedChild = Hybrid.fromBlock('KeyedConnectionChild', ChildBlock)
  const ParentBlock = ParentDefinition.makeBlock(
    Effect.gen(function* () {
      const child = yield* ConstructedChild('children')

      return {
        bindings: [Binding.connect(child)],
        init,
        update,
      }
    }),
  )
  const block = await Effect.runPromise(
    ParentBlock.build.pipe(Effect.provide(ConstructedChild.layer)),
  )
  const updated = block.update(
    block.init().model,
    ParentDefinition.Message.ClickedIncrement(),
  )

  expect(updated.model.children).toEqual({
    primary: { count: 1 },
    secondary: { count: 0 },
  })
  expect(updated.model.observed).toBe(1)
})
