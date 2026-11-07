import { Effect, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { defineMessageUnion } from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import * as Update from '../../update/index.js'
import { makeDefinition } from './public.js'

const makeFixture = () => {
  const ChildMessage = defineMessageUnion({ RequestedIncrement: {} })
  const ChildDefinition = makeDefinition('NativeMethods', {
    Model: Schema.Struct({ count: Schema.Number }),
    Message: ChildMessage,
  })
  const ChildComposition = ChildDefinition.makeComposition()
  const childInit = ChildComposition.makeInit((count = 0) => ({
    model: { count },
  }))
  const childUpdate = ChildComposition.makeUpdate({
    RequestedIncrement: ChildDefinition.makeFieldsStep(() => ({
      count: count => count + 1,
    })),
  })
  const ChildBlock = ChildDefinition.makeBlock(
    Effect.succeed({
      children: [],
      init: childInit,
      update: childUpdate,
      operations: { toString: ChildMessage.RequestedIncrement },
    }),
  )
  const Message = defineMessageUnion({
    ClickedIncrement: {},
    ChangedParentThenOperation: {},
    ChangedParentThenFold: {},
    ClickedCombined: {},
  })
  const Definition = makeDefinition('NativeParentMethods', {
    Model: Schema.Struct({ child: ChildBlock.Model, count: Schema.Number }),
    Message,
  })
  const initPolicy: { contextToArgs: () => [count: number] } = {
    contextToArgs: () => [2],
  }
  const ChildBinding = Definition.makeRequiredFieldBinding(ChildBlock, {
    field: 'child',
    init: initPolicy,
  })
  const bindings = [ChildBinding]
  const Composition = Definition.makeComposition({ bindings })
  const init = Composition.makeInit(() => ({ model: { count: 0 } }))
  const update = Composition.makeUpdate({
    ClickedIncrement: ChildBinding.toString(),
    ChangedParentThenOperation: model =>
      ChildBinding.toString()(modifyFields(model, { count: () => 4 })),
    ChangedParentThenFold: model =>
      ChildBinding.fold(
        modifyFields(model, { count: () => 7 }),
        ChildMessage.RequestedIncrement(),
      ),
    ClickedCombined: Definition.makeStep(() =>
      Update.combineSteps([
        Definition.makeFieldsStep(() => ({ count: () => 9 })),
        ChildBinding.toString(),
        Definition.makeFieldsStep(() => ({ count: count => count + 1 })),
      ]),
    ),
  })
  const ParentBlock = Definition.makeBlock(
    Effect.gen(function* () {
      const child = yield* ChildBlock.construct()

      return {
        children: [ChildBinding.connect(child)],
        init,
        update,
      }
    }),
  )

  return { ParentBlock, Message, bindings, initPolicy }
}

describe('native constructor declaration snapshots', () => {
  it('keeps a valid operation whose name exists on Object.prototype', () => {
    const { ParentBlock, Message } = makeFixture()
    const parent = Effect.runSync(ParentBlock.construct())
    const initialized = parent.init()
    const increment = parent.update(
      initialized.model,
      Message.ClickedIncrement(),
    )

    expect(increment.model.child.count).toBe(3)
  })

  it('snapshots the caller-owned Binding inventory', () => {
    const { ParentBlock, bindings } = makeFixture()
    bindings.pop()
    const parent = Effect.runSync(ParentBlock.construct())

    expect(parent.init().model.child.count).toBe(2)
  })

  it('snapshots deferred init recipes without evaluating them during construction', () => {
    const { ParentBlock, initPolicy } = makeFixture()
    initPolicy.contextToArgs = () => [9]
    const parent = Effect.runSync(ParentBlock.construct())

    expect(parent.init().model.child.count).toBe(2)
  })

  it('applies a child operation to the parent Model supplied by its handler', () => {
    const { ParentBlock, Message } = makeFixture()
    const parent = Effect.runSync(ParentBlock.construct())
    const changed = parent.update(
      parent.init().model,
      Message.ChangedParentThenOperation(),
    )

    expect(changed.model.count).toBe(4)
    expect(changed.model.child.count).toBe(3)
  })

  it('folds a child Message against the parent Model supplied by its handler', () => {
    const { ParentBlock, Message } = makeFixture()
    const parent = Effect.runSync(ParentBlock.construct())
    const changed = parent.update(
      parent.init().model,
      Message.ChangedParentThenFold(),
    )

    expect(changed.model.count).toBe(7)
    expect(changed.model.child.count).toBe(3)
  })

  it('preserves intermediate Models when combining symbolic child operations', () => {
    const { ParentBlock, Message } = makeFixture()
    const parent = Effect.runSync(ParentBlock.construct())
    const changed = parent.update(
      parent.init().model,
      Message.ClickedCombined(),
    )

    expect(changed.model.count).toBe(10)
    expect(changed.model.child.count).toBe(3)
  })
})
