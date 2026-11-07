import { Context, Effect, Layer, Schema } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { makeDefinition } from '../layered/runtime.js'
import type { FactsOf, Graph } from './contract.js'

class ConstructorValue extends Context.Service<
  ConstructorValue,
  { value: number }
>()('foldkit/test/DirectLayerConstructorValue') {}

type FactsFromLayer<LayerValue extends Layer.Any> =
  Layer.Success<LayerValue> extends Graph<any, any, any, any, infer Facts>
    ? Facts
    : never

const makeLeaf = () => {
  let releases = 0

  const Model = Schema.Struct({ value: Schema.Number })
  const Message = Schema.Never
  const Definition = makeDefinition('DirectLayerLeaf', { Model, Message })
  const Composition = Definition.makeComposition()
  const init = Composition.makeInit(() => ({ model: { value: 7 } }))
  const update = Composition.makeUpdate({})
  const Block = Definition.makeBlock(
    Effect.gen(function* () {
      yield* Effect.acquireRelease(Effect.void, () =>
        Effect.sync(() => {
          releases += 1
        }),
      )

      return { children: [], init, update }
    }),
  )

  return { Block, releases: () => releases }
}

describe('ordinary Layer prototype', () => {
  it('builds a selected root Layer, resolves its Block from the Layer Context, and keeps construction passive', async () => {
    const leaf = makeLeaf()
    const Model = Schema.Struct({ child: leaf.Block.Model })
    const Message = Schema.Never
    const Definition = makeDefinition('DirectLayerRoot', { Model, Message })
    let initArgumentReads = 0
    const Child = Definition.makeRequiredFieldBinding(leaf.Block, {
      field: 'child',
      init: {
        contextToArgs: () => {
          initArgumentReads += 1

          return []
        },
      },
    })
    const Composition = Definition.makeComposition({ bindings: [Child] })
    const init = Composition.makeInit(() => ({ model: {} }))
    const update = Composition.makeUpdate({})
    const Block = Definition.makeBlock(
      Effect.gen(function* () {
        const child = yield* Child

        return { children: [child], init, update }
      }),
    )
    const selectedLayer = Layer.provide(Block.layer, leaf.Block.layer)
    const application = { block: Block, layer: selectedLayer }

    expect(leaf.releases()).toBe(0)
    expect(initArgumentReads).toBe(0)

    const root = await Effect.runPromise(
      Effect.scoped(
        Layer.build(application.layer).pipe(
          Effect.flatMap(context =>
            Effect.provide(application.block.get, context).pipe(
              Effect.flatMap(executable =>
                Effect.sync(() => executable.init().model),
              ),
            ),
          ),
        ),
      ),
    )

    expect(root).toEqual({ child: { value: 7 } })
    expect(initArgumentReads).toBe(1)
    expect(leaf.releases()).toBe(1)
  })

  it('retains exact checked Facts on the ordinary implementation Layer', () => {
    const Model = Schema.Struct({ value: Schema.Number })
    const Message = Schema.Never
    const Definition = makeDefinition('DirectLayerFacts', { Model, Message })
    const Composition = Definition.makeComposition()
    const Block = Definition.makeBlock(
      Effect.gen(function* () {
        const constructorValue = yield* ConstructorValue

        return {
          children: [],
          init: Composition.makeInit(() => ({
            model: { value: constructorValue.value },
          })),
          update: Composition.makeUpdate({}),
        }
      }),
    )
    const selectedLayer = Layer.provide(
      Block.layer,
      Layer.succeed(ConstructorValue, { value: 1 }),
    )

    expectTypeOf<FactsFromLayer<typeof Block.layer>>().toEqualTypeOf<
      FactsOf<typeof Block>
    >()
    expectTypeOf<
      Layer.Services<typeof Block.layer>
    >().toEqualTypeOf<ConstructorValue>()
    expectTypeOf<Layer.Services<typeof selectedLayer>>().toEqualTypeOf<never>()
  })
})
