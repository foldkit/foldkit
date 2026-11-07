import { Effect, Exit, Layer, Schema, Scope } from 'effect'
import { describe, expect, it } from 'vitest'

import * as Block from '../../block/public.js'

const makeLeaf = () => {
  const id = 'ConstructionGraphLeaf'
  const key = Symbol(id)
  const Definition = Block.makeDefinition(id, {
    key,
    Model: Schema.Number,
    Message: Schema.Never,
    isMessageFree: true,
    InitArgs: Schema.Tuple([]),
  })
  const Composition = Definition.makeComposition()
  const descriptor = Definition.makeBlock(
    Effect.succeed({
      children: [],
      init: Composition.makeInit(() => ({ model: 7 })),
      update: Composition.makeUpdate({}),
    }),
  )

  return { Definition, descriptor }
}

const makeParent = (child: ReturnType<typeof makeLeaf>) => {
  const id = 'ConstructionGraphParent'
  const key = Symbol(id)
  const Definition = Block.makeDefinition(id, {
    key,
    Model: Schema.Struct({ child: child.Definition.contract.Model }),
    Message: Schema.Never,
    isMessageFree: true,
    InitArgs: Schema.Tuple([]),
  })
  const binding = Definition.makeRequiredFieldBinding(
    child.Definition.contract,
    {
      field: 'child',
      init: { contextToArgs: () => [] },
    },
  )
  const Composition = Definition.makeComposition({ bindings: [binding] })
  const init = Composition.makeInit(() => ({ model: {} }))
  const update = Composition.makeUpdate({})
  const descriptor = Definition.makeBlock(
    Effect.gen(function* () {
      const connection = yield* binding

      return {
        children: [connection],
        init,
        update,
      }
    }),
  )

  return { Definition, descriptor, binding, init, update }
}

const initialModel = <Model, Error, Requirements, LayerError>(
  get: Effect.Effect<
    Readonly<{ init: () => Readonly<{ model: Model }> }>,
    Error,
    Requirements
  >,
  layer: Layer.Layer<Requirements, LayerError>,
) =>
  Effect.runPromise(
    Effect.scoped(
      get.pipe(
        Effect.map(executable => executable.init().model),
        Effect.provide(layer),
      ),
    ),
  )

const buildErased = (
  descriptor: object,
  memoMap: Layer.MemoMap,
  scope: Scope.Scope,
): Promise<unknown> =>
  Reflect.apply(Effect.runPromise, undefined, [
    Reflect.apply(Layer.buildWithMemoMap, undefined, [
      Reflect.get(descriptor, 'layer'),
      memoMap,
      scope,
    ]),
  ])

describe('construction graph Layer topology', () => {
  it('shares a graph across ordinary Layer.provide', async () => {
    const child = makeLeaf()
    const parent = makeParent(child)

    await expect(
      initialModel(
        parent.Definition.contract.get,
        Layer.provide(parent.descriptor.layer, child.descriptor.layer),
      ),
    ).resolves.toEqual({ child: 7 })
  })

  it('shares a graph across one Definition.provide boundary', async () => {
    const child = makeLeaf()
    const parent = makeParent(child)

    await expect(
      initialModel(
        parent.Definition.contract.get,
        parent.descriptor.provide(child.descriptor.layer).layer,
      ),
    ).resolves.toEqual({ child: 7 })
  })

  it('reuses the inherited graph across nested Definition.provide boundaries', async () => {
    const grandchild = makeLeaf()
    const child = makeParent(grandchild)
    const key = Symbol('ConstructionGraphParent')
    const Definition = Block.makeDefinition('ConstructionGraphParent', {
      key,
      Model: Schema.Struct({ child: child.Definition.contract.Model }),
      Message: Schema.Never,
      isMessageFree: true,
      InitArgs: Schema.Tuple([]),
    })
    const ChildBinding = Definition.makeRequiredFieldBinding(
      child.Definition.contract,
      {
        field: 'child',
        init: { contextToArgs: () => [] },
      },
    )
    const Composition = Definition.makeComposition({ bindings: [ChildBinding] })
    const descriptor = Definition.makeBlock(
      Effect.gen(function* () {
        const connection = yield* ChildBinding

        return {
          children: [connection],
          init: Composition.makeInit(() => ({ model: {} })),
          update: Composition.makeUpdate({}),
        }
      }),
    )
    const childImplementation = child.descriptor.provide(
      grandchild.descriptor.layer,
    )

    await expect(
      initialModel(
        Definition.contract.get,
        descriptor.provide(childImplementation.layer).layer,
      ),
    ).resolves.toEqual({ child: { child: 7 } })
  })

  it('rejects an explicitly grafted child from another Scope with a shared memo map', async () => {
    const child = makeLeaf()
    const parent = makeParent(child)
    const memoMap = await Effect.runPromise(Layer.makeMemoMap)
    const childScope = await Effect.runPromise(Scope.make())
    const parentScope = await Effect.runPromise(Scope.make())

    try {
      const childLayer = child.descriptor.layer
      const childContext = await Effect.runPromise(
        Layer.buildWithMemoMap(childLayer, memoMap, childScope),
      )
      const executable = await Effect.runPromise(
        child.Definition.contract.get.pipe(Effect.provideContext(childContext)),
      )
      const graft = parent.Definition.makeBlock(
        Effect.succeed({
          children: [parent.binding.connect(executable)],
          init: parent.init,
          update: parent.update,
        }),
      )
      const graftLayer = graft.layer

      await expect(
        Effect.runPromise(
          Layer.buildWithMemoMap(graftLayer, memoMap, parentScope),
        ),
      ).rejects.toThrow(
        /only an executable acquired in this construction graph/i,
      )
    } finally {
      await Effect.runPromise(Scope.close(childScope, Exit.void))
      await Effect.runPromise(Scope.close(parentScope, Exit.void))
    }
  })

  it('rejects an explicitly grafted cached child after its Scope closes', async () => {
    const child = makeLeaf()
    const parent = makeParent(child)
    const memoMap = await Effect.runPromise(Layer.makeMemoMap)
    const childScope = await Effect.runPromise(Scope.make())
    const parentScope = await Effect.runPromise(Scope.make())

    try {
      const childLayer = child.descriptor.layer
      const childContext = await Effect.runPromise(
        Layer.buildWithMemoMap(childLayer, memoMap, childScope),
      )
      const executable = await Effect.runPromise(
        child.Definition.contract.get.pipe(Effect.provideContext(childContext)),
      )
      const connection = parent.binding.connect(executable)

      await Effect.runPromise(Scope.close(childScope, Exit.void))

      const graft = parent.Definition.makeBlock(
        Effect.succeed({
          children: [connection],
          init: parent.init,
          update: parent.update,
        }),
      )
      const graftLayer = graft.layer

      await expect(
        Effect.runPromise(
          Layer.buildWithMemoMap(graftLayer, memoMap, parentScope),
        ),
      ).rejects.toThrow(/after its acquisition Scope has closed/i)
    } finally {
      await Effect.runPromise(Scope.close(parentScope, Exit.void))
    }
  })

  it('rejects a canonical connection acquired outside its parent construction', async () => {
    const child = makeLeaf()
    const parent = makeParent(child)
    const memoMap = await Effect.runPromise(Layer.makeMemoMap)
    const childScope = await Effect.runPromise(Scope.make())
    const parentScope = await Effect.runPromise(Scope.make())

    try {
      const childLayer = child.descriptor.layer
      const childContext = await Effect.runPromise(
        Layer.buildWithMemoMap(childLayer, memoMap, childScope),
      )
      const connection = await Effect.runPromise(
        Effect.gen(function* () {
          return yield* parent.binding
        }).pipe(Effect.provideContext(childContext)),
      )
      const graft = parent.Definition.makeBlock(
        Effect.succeed({
          children: [connection],
          init: parent.init,
          update: parent.update,
        }),
      )
      const graftLayer = graft.layer

      await expect(
        Effect.runPromise(
          Layer.buildWithMemoMap(graftLayer, memoMap, parentScope),
        ),
      ).rejects.toThrow(
        /only an executable acquired in this construction graph/i,
      )
    } finally {
      await Effect.runPromise(Scope.close(childScope, Exit.void))
      await Effect.runPromise(Scope.close(parentScope, Exit.void))
    }
  })

  it('rejects a canonical connection retained from another live parent construction', async () => {
    const child = makeLeaf()
    const parent = makeParent(child)
    const memoMap = await Effect.runPromise(Layer.makeMemoMap)
    const ownerScope = await Effect.runPromise(Scope.make())
    const parentScope = await Effect.runPromise(Scope.make())
    const captured: { connection?: object } = {}
    const owner = parent.Definition.makeBlock(
      Effect.gen(function* () {
        const connection = yield* parent.binding
        captured.connection = connection

        return {
          children: [connection],
          init: parent.init,
          update: parent.update,
        }
      }),
    )

    try {
      const ownerLayer = Layer.provide(owner.layer, child.descriptor.layer)
      await Effect.runPromise(
        Layer.buildWithMemoMap(ownerLayer, memoMap, ownerScope),
      )

      if (captured.connection === undefined) {
        throw new Error('Expected an acquired canonical connection.')
      }

      const graft = Reflect.apply(parent.Definition.makeBlock, undefined, [
        Effect.succeed({
          children: [captured.connection],
          init: parent.init,
          update: parent.update,
        }),
      ])

      await expect(buildErased(graft, memoMap, parentScope)).rejects.toThrow(
        /only an executable acquired in this construction graph/i,
      )
    } finally {
      await Effect.runPromise(Scope.close(ownerScope, Exit.void))
      await Effect.runPromise(Scope.close(parentScope, Exit.void))
    }
  })
})
