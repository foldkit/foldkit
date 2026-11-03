import { Number, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { makeDefinition } from '../block/define.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import { makeResultRecipe, resolveOperationOutput } from './operationRecipe.js'
import * as Update from './update.js'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type
const Message = defineMessageUnion({ RequestedIncrement: {} })
type Message = typeof Message.Type
const CounterDefinition = makeDefinition('OperationOutputCounter', {
  Model,
  Message,
})
const increment = Update.defineStep((model: Model) => ({
  model: modifyFields(model, { count: Number.increment }),
}))
const keepModel = (model: Model) => ({ model })
const invalidNested = () => increment
const nestedStepError = 'returned another Step instead of its result'

describe('Step output validation', () => {
  it('rejects an unchecked nested Step in data-first composition', () => {
    expect(() =>
      Reflect.apply(Update.combineSteps, undefined, [
        Model.make({ count: 0 }),
        [invalidNested, keepModel],
      ]),
    ).toThrow(nestedStepError)
  })

  it('rejects an unchecked nested Step in data-last composition', () => {
    const combined = Reflect.apply(Update.combineSteps, undefined, [
      [invalidNested, keepModel],
    ])

    expect(() =>
      Reflect.apply(combined, undefined, [Model.make({ count: 0 })]),
    ).toThrow(nestedStepError)
  })

  it('rejects a nested Step after resolving a passive operation', () => {
    const nested = makeResultRecipe<Model, typeof increment>(() => increment)

    expect(() =>
      resolveOperationOutput(nested, Model.make({ count: 0 })),
    ).toThrow(nestedStepError)
  })

  it('executes an intentionally deferred Definition Step once', () => {
    const deferred = CounterDefinition.makeStep(() => increment)
    const applyCombinedChanges = CounterDefinition.makeStep(() =>
      Update.combineSteps([increment, increment]),
    )

    expect(
      Update.combineSteps(Model.make({ count: 0 }), [
        deferred,
        applyCombinedChanges,
      ]).model.count,
    ).toBe(3)
  })
})

if (false) {
  // @ts-expect-error Standalone Steps return results, not another Step.
  Update.defineStep((_model: Model) => increment)

  // @ts-expect-error Standalone Steps cannot return a curried composition.
  Update.defineStep((_model: Model) =>
    Update.combineSteps([increment, increment]),
  )

  Update.combineSteps(Model.make({ count: 0 }), [
    // @ts-expect-error Raw callbacks returning Steps cannot enter composition.
    invalidNested,
    keepModel,
  ])
}
