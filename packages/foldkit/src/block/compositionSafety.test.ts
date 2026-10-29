import { Layer, Predicate, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { defineMessageUnion } from '../schema/index.js'
import { modifyFields } from '../struct/index.js'
import { makeDefinition } from './define.js'
import { assemble } from './fromAssembly.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
type ChildModel = typeof ChildModel.Type
const ChildMessage = defineMessageUnion({ Incremented: {} })
type ChildMessage = typeof ChildMessage.Type

const PlainComposition = makeDefinition('CompositionSafetyRuntimePlain', {
  Model: ChildModel,
  Message: ChildMessage,
}).makeComposition()
const preparePlain = () =>
  Reflect.apply(PlainComposition.prepareBlock, undefined, [
    {
      init: PlainComposition.makeInit(() => ({
        model: ChildModel.make({ count: 0 }),
      })),
      update: Reflect.apply(PlainComposition.makeUpdate, undefined, [
        {
          Incremented: (model: ChildModel) => ({
            model: modifyFields(model, { count: count => count + 1 }),
          }),
        },
      ]),
      EffectsLayer: Layer.empty,
    },
  ])

const OptionalContextComposition = makeDefinition(
  'CompositionSafetyRuntimeOptionalContext',
  {
    Model: ChildModel,
    Message: ChildMessage,
  },
).makeComposition()
const prepareOptionalContext = () =>
  Reflect.apply(OptionalContextComposition.prepareBlock, undefined, [
    {
      init: OptionalContextComposition.makeInit(() => ({
        model: ChildModel.make({ count: 0 }),
      })),
      update: OptionalContextComposition.makeUpdate.withContext(
        (context?: Readonly<{ amount: number }>) => ({
          Incremented: (model: ChildModel) => ({
            model: modifyFields(model, {
              count: count => count + (context?.amount ?? 1),
            }),
          }),
        }),
      ),
      EffectsLayer: Layer.empty,
    },
  ])

const PlainBlock = Reflect.apply(assemble, undefined, [preparePlain])
const OptionalContextBlock = Reflect.apply(assemble, undefined, [
  prepareOptionalContext,
])

const ParentModel = Schema.Struct({ child: ChildModel })
type ParentModel = typeof ParentModel.Type
const ParentMessage = Schema.Never
type ParentMessage = typeof ParentMessage.Type
const Parent = makeDefinition('CompositionSafetyRuntimeParent', {
  Model: ParentModel,
  Message: ParentMessage,
})

describe('Composition safety', () => {
  it('automatically routes a canonical child Message with no update context', () => {
    const binding = Reflect.apply(Parent.makeBinding, undefined, [
      PlainBlock,
      {
        field: 'child',
      },
    ])
    const composition = Reflect.apply(Parent.makeComposition, undefined, [
      { bindings: [binding] },
    ])
    const update = Reflect.apply(composition.makeUpdate, undefined, [{}])
    const initial = ParentModel.make({
      child: ChildModel.make({ count: 0 }),
    })

    if (!Predicate.isFunction(update)) {
      throw new Error('Expected a Composition update function')
    }

    const result = Reflect.apply(update, undefined, [
      initial,
      {
        _tag: 'GotChildMessage',
        placement: 'child',
        generation: 0,
        message: ChildMessage.Incremented(),
      },
    ])

    expect(result).toMatchObject({ model: { child: { count: 1 } } })
  })

  it('rejects an omitted route for an observable optional update context', () => {
    expect(() =>
      Reflect.apply(Parent.makeBinding, undefined, [
        OptionalContextBlock,
        {
          field: 'child',
        },
      ]),
    ).toThrow('A contextual child update requires delivery.toUpdateContext')
  })

  it('rejects callback update authoring at runtime', () => {
    expect(() =>
      Reflect.apply(PlainComposition.makeUpdate, undefined, [
        (model: ChildModel) => ({ model }),
      ]),
    ).toThrow('requires an exhaustive handler record')
  })
})
