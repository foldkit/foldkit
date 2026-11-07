import { Context, Effect, Layer, Schema, Struct } from 'effect'
import { describe, expect, it } from 'vitest'

import { defineMessageUnion } from '../../message/index.js'
import {
  constructAuthoredImplementation,
  makeDefinitionFactory,
  registerDeclaredDescriptor,
  wrapExecutable,
} from './runtime.js'
import { withConstructionGraph } from './symbolic.js'

class SelectedChild extends Context.Service<SelectedChild, object>()(
  'DeclaredDescriptor/SelectedChild',
) {}

const makeDefinition = makeDefinitionFactory('Provided')

const makeFixture = () => {
  let initializedCount = 0
  const Message = defineMessageUnion({ RequestedIncrement: {} })
  const ChildDefinition = makeDefinition('DeclaredChild', {
    Model: Schema.Struct({ count: Schema.Number }),
    Message,
  })
  const ChildComposition = ChildDefinition.makeComposition()
  const childInit = ChildComposition.makeInit(() => {
    initializedCount += 1

    return { model: { count: 2 } }
  })
  const childUpdate = ChildComposition.makeUpdate({
    RequestedIncrement: ChildDefinition.makeFieldsStep(() => ({
      count: count => count + 1,
    })),
  })
  const childBody = {
    children: [],
    init: childInit,
    update: childUpdate,
    operations: { requestIncrement: Message.RequestedIncrement },
  }
  const inferred = ChildDefinition.makeBlock(Effect.succeed(childBody))
  const declaration = Object.freeze({
    ...Struct.omit(inferred, ['construct']),
    get: SelectedChild,
  })
  registerDeclaredDescriptor(declaration, () => declaration.get)

  const ParentMessage = defineMessageUnion({ ClickedIncrement: {} })
  const ParentDefinition = makeDefinition('DeclaredParent', {
    Model: Schema.Struct({ child: declaration.Model }),
    Message: ParentMessage,
  })
  const ChildBinding = ParentDefinition.makeRequiredFieldBinding(declaration, {
    field: 'child',
    init: { contextToArgs: () => [] },
  })
  if (false) {
    // @ts-expect-error Provided Bindings select an independent contract, not an implementation descriptor.
    ParentDefinition.makeRequiredFieldBinding(inferred, { field: 'child' })
    // @ts-expect-error A default graph Layer must not become the provided child contract.
    ParentDefinition.makeRequiredFieldBinding(
      { ...declaration, layer: Layer.empty },
      { field: 'child' },
    )
  }

  const CollectionDefinition = makeDefinition('DeclaredCollection', {
    Model: Schema.Struct({
      children: Schema.Record(Schema.String, declaration.Model),
    }),
    Message: ParentMessage,
  })
  const CollectionBinding = CollectionDefinition.makeRecordBinding(
    declaration,
    {
      field: 'children',
    },
  )

  if (false) {
    // @ts-expect-error Map Bindings also reject an implementation descriptor.
    CollectionDefinition.makeRecordBinding(inferred, { field: 'children' })
    // @ts-expect-error Map Bindings require a get-only independent declaration.
    CollectionDefinition.makeRecordBinding(
      { ...declaration, layer: Layer.empty },
      { field: 'children' },
    )
  }

  const ParentComposition = ParentDefinition.makeComposition({
    bindings: [ChildBinding],
  })
  const init = ParentComposition.makeInit(() => ({ model: {} }))
  const update = ParentComposition.makeUpdate({
    ClickedIncrement: ChildBinding.requestIncrement(),
  })
  const constructor = withConstructionGraph(graph =>
    Effect.gen(function* () {
      const child = yield* ChildBinding

      return constructAuthoredImplementation(
        { children: [child], init, update },
        undefined,
        graph,
      )
    }),
  )
  const childLayer = Layer.sync(SelectedChild, () =>
    wrapExecutable(
      declaration,
      constructAuthoredImplementation(childBody),
      false,
      {
        graph: Object.freeze({}),
        isCurrent: () => true,
      },
    ),
  )

  return {
    declaration,
    CollectionBinding,
    ParentMessage,
    constructor,
    childLayer,
    initializedCount: () => initializedCount,
  }
}

describe('provided constructor declarations', () => {
  it('acquires a selected implementation without a default child Layer', () => {
    const fixture = makeFixture()
    expect(Object.hasOwn(fixture.declaration, 'layer')).toBe(false)
    expect(fixture.CollectionBinding.placement).toBe('children')
    expect(fixture.initializedCount()).toBe(0)

    const block = Effect.runSync(
      fixture.constructor.pipe(Effect.provide(fixture.childLayer)),
    )
    expect(fixture.initializedCount()).toBe(0)

    const initialized = block.init()
    expect(initialized.model.child.count).toBe(2)
    expect(fixture.initializedCount()).toBe(1)

    const incremented = block.update(
      initialized.model,
      fixture.ParentMessage.ClickedIncrement(),
    )
    expect(incremented.model.child.count).toBe(3)
  })

  it('requires an original init plan before recovering its private Definition', () => {
    expect(() =>
      Reflect.apply(constructAuthoredImplementation, undefined, [
        { init: () => ({ model: {} }) },
      ]),
    ).toThrow()
  })
})
