import { Array, Effect, Layer, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { initAndSet } from '../../block/bindingInit.js'
import { runBindingInitRecipe } from '../../block/initRecipe.js'
import { defineMessageUnion } from '../../message/index.js'
import * as Story from '../../test/story.js'
import { makeDefinition } from './public.js'

const makeFixture = () => {
  const initialized = Array.empty<number>()
  let constructionCount = 0
  let handlerConstructionCount = 0
  const ChildDefinition = makeDefinition('ResettableChild', {
    Model: Schema.Struct({ count: Schema.Number, construction: Schema.Number }),
    Message: defineMessageUnion({ CompletedRead: { count: Schema.Number } }),
  })
  const Read = ChildDefinition.makeCommand('Read', {
    args: { count: Schema.Number },
    messages: [ChildDefinition.Message.CompletedRead],
    handler: function* () {
      handlerConstructionCount += 1

      return ({ count }) =>
        Effect.succeed(ChildDefinition.Message.CompletedRead({ count }))
    },
  })
  const ChildComposition = ChildDefinition.makeComposition()
  const ChildBlock = ChildDefinition.makeBlock(
    Effect.sync(() => {
      constructionCount += 1
      const construction = constructionCount

      return {
        children: [],
        init: ChildComposition.makeInit((count: number) => {
          initialized.push(count)

          return { model: { count, construction }, commands: [Read({ count })] }
        }),
        update: ChildComposition.makeUpdate({
          CompletedRead: ChildDefinition.makeNoopStep(),
        }),
        EffectsLayer: Read.layer,
      }
    }),
  )
  const Message = defineMessageUnion({ RequestedReset: {} })
  const Definition = makeDefinition('ResettableParent', {
    Model: Schema.Struct({
      child: ChildBlock.Model,
      sibling: Schema.Struct({ label: Schema.String }),
    }),
    Message,
  })
  const ChildBinding = Definition.makeRequiredFieldBinding(ChildBlock, {
    field: 'child',
    init: { contextToArgs: () => [2] },
  })
  const Composition = Definition.makeComposition({ bindings: [ChildBinding] })
  const resetChild = Definition.makeStep(model =>
    initAndSet(ChildBinding, model, { args: [7] }),
  )
  const init = Composition.makeInit((label: string) => ({
    model: { sibling: { label } },
  }))
  const update = Composition.makeUpdate({ RequestedReset: resetChild })
  const ParentBlock = Definition.makeBlock(
    Effect.gen(function* () {
      const child = yield* ChildBinding

      return {
        children: [child],
        init,
        update,
      }
    }),
  )

  return {
    ParentBlock,
    ChildBinding,
    Message,
    Read,
    initialized,
    handlerConstructions: () => handlerConstructionCount,
  }
}

describe('Layer-owned child replacement', () => {
  it('defers a symbolic initializer until its registered graph is available', () => {
    const { ParentBlock, ChildBinding, initialized } = makeFixture()
    const model = ParentBlock.Model.make({
      child: { count: 3, construction: 0 },
      sibling: { label: 'retained' },
    })
    const recipe = initAndSet(ChildBinding, model, { args: [7] })

    expect(recipe).not.toHaveProperty('model')
    expect(recipe).not.toHaveProperty('commands')
    expect(initialized).toEqual([])
    expect(() => runBindingInitRecipe(recipe)).toThrow(
      'The Binding is not connected in this executable graph',
    )
  })

  it('resets through an extracted Step using each executable graph and retains child Commands', () => {
    const { ParentBlock, Message, Read, initialized, handlerConstructions } =
      makeFixture()
    const results = Effect.runSync(
      Effect.scoped(
        Effect.gen(function* () {
          const firstContext = yield* Layer.build(ParentBlock.layer)
          const first = yield* Effect.provide(ParentBlock.get, firstContext)
          const secondContext = yield* Layer.build(ParentBlock.layer)
          const second = yield* Effect.provide(ParentBlock.get, secondContext)
          const firstInit = first.init('first')
          const secondInit = second.init('second')

          return {
            firstInit,
            secondInit,
            firstReset: first.update(firstInit.model, Message.RequestedReset()),
            secondReset: second.update(
              secondInit.model,
              Message.RequestedReset(),
            ),
          }
        }),
      ),
    )

    expect(results.firstReset.model.child).toEqual({
      count: 7,
      construction: 1,
    })
    expect(results.secondReset.model.child).toEqual({
      count: 7,
      construction: 2,
    })
    expect(results.firstReset.model.sibling).toBe(
      results.firstInit.model.sibling,
    )
    expect(results.secondReset.model.sibling).toBe(
      results.secondInit.model.sibling,
    )
    expect(
      Array.getSomes(
        Array.map(
          results.firstReset.commands ?? [],
          Story.Command.argsOf(Read),
        ),
      ),
    ).toEqual([{ count: 7 }])
    expect(
      Array.map(results.firstReset.commands ?? [], command => command.name),
    ).toEqual(['child/Read'])
    expect(initialized).toEqual([2, 2, 7, 7])
    expect(handlerConstructions()).toBe(0)
  })
})
