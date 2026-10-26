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
const CounterDefinition = makeDefinition('OperationOutputCounter', {
  Model,
  Message,
})
const incrementStep = Update.defineStep((model: Model) => ({
  model: modifyFields(model, { count: Number.increment }),
}))
const keepModelStep = (model: Model) => ({ model })
const invalidNestedStep = () => incrementStep
const nestedStepError = 'returned another Step instead of its result'

describe('Step output validation', () => {
  it('rejects an unchecked nested Step in data-first composition', () => {
    expect(() =>
      Reflect.apply(Update.combineSteps, undefined, [
        Model.make({ count: 0 }),
        [invalidNestedStep, keepModelStep],
      ]),
    ).toThrow(nestedStepError)
  })

  it('rejects an unchecked nested Step in data-last composition', () => {
    const combined = Reflect.apply(Update.combineSteps, undefined, [
      [invalidNestedStep, keepModelStep],
    ])

    expect(() =>
      Reflect.apply(combined, undefined, [Model.make({ count: 0 })]),
    ).toThrow(nestedStepError)
  })

  it('rejects a nested Step after resolving a passive operation', () => {
    const nested = makeResultRecipe<Model, typeof incrementStep>(
      () => incrementStep,
    )

    expect(() =>
      resolveOperationOutput(nested, Model.make({ count: 0 })),
    ).toThrow(nestedStepError)
  })

  it('executes an intentionally deferred Definition Step once', () => {
    const deferredStep = CounterDefinition.makeStep(() => incrementStep)
    const combinedStep = CounterDefinition.makeStep(() =>
      Update.combineSteps([incrementStep, incrementStep]),
    )

    expect(
      Update.combineSteps(Model.make({ count: 0 }), [
        deferredStep,
        combinedStep,
      ]).model.count,
    ).toBe(3)
  })
})

if (false) {
  // @ts-expect-error Standalone Steps return results, not another Step.
  Update.defineStep((_model: Model) => incrementStep)

  // @ts-expect-error Standalone Steps cannot return a curried composition.
  Update.defineStep((_model: Model) =>
    Update.combineSteps([incrementStep, incrementStep]),
  )

  Update.combineSteps(Model.make({ count: 0 }), [
    // @ts-expect-error Raw callbacks returning Steps cannot enter composition.
    invalidNestedStep,
    keepModelStep,
  ])
}
