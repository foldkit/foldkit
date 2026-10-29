import { Number, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Update from '../update/public.js'
import { makeDefinition } from './define.js'
import * as Block from './public.js'

const Model = Schema.Struct({
  count: Schema.Number,
  label: Schema.String,
  status: Schema.Literals(['Idle', 'Ready']),
})
type Model = typeof Model.Type
const FieldStepsDefinition = makeDefinition('FieldSteps', {
  Model,
  Message: Schema.Never,
})
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message: Schema.Never,
})

it('contextually types fields and preserves valid result refinements', () => {
  let evaluations = 0
  const readyStep = FieldStepsDefinition.makeFieldsStep(model => {
    evaluations += 1
    expectTypeOf(model).toEqualTypeOf<typeof Model.Type>()

    return {
      count: count => {
        expectTypeOf(count).toEqualTypeOf<number>()
        return Number.increment(count)
      },
      label: () => `${model.label}: ready`,
      status: () => 'Ready',
    }
  })
  const initialModel = Model.make({
    count: 1,
    label: 'Example',
    status: 'Idle',
  })

  expect(evaluations).toBe(0)

  const next = readyStep(initialModel)

  expect(next).toEqual({
    model: { count: 2, label: 'Example: ready', status: 'Ready' },
  })
  expect(initialModel.status).toBe('Idle')
  expect(evaluations).toBe(1)
  expectTypeOf<typeof next.model.status>().toEqualTypeOf<'Ready'>()
  expectTypeOf<Update.RequirementsOf<typeof readyStep>>().toEqualTypeOf<never>()
  expectTypeOf<typeof next.commands>().toEqualTypeOf<undefined>()
  expectTypeOf<typeof next.outMessage>().toEqualTypeOf<undefined>()
  expect(Object.keys(next)).toEqual(['model'])
})

it('preserves Model identity for a deferred empty field Step', () => {
  let evaluations = 0
  let fieldEvaluations = 0
  const updateWhenReadyStep = FieldStepsDefinition.makeFieldsStep(model => {
    evaluations += 1
    return model.status === 'Ready'
      ? {
          count: count => {
            fieldEvaluations += 1
            return count + 1
          },
        }
      : {}
  })
  const idle = Model.make({ count: 1, label: 'Draft', status: 'Idle' })
  const ready = Model.make({ count: 1, label: 'Draft', status: 'Ready' })

  expect(evaluations).toBe(0)
  expect(updateWhenReadyStep(idle).model).toBe(idle)
  expect(evaluations).toBe(1)
  expect(fieldEvaluations).toBe(0)
  expect(updateWhenReadyStep(ready).model.count).toBe(2)
  expect(evaluations).toBe(2)
  expect(fieldEvaluations).toBe(1)
})

it('applies symbol field transformations rather than treating them as empty', () => {
  const count = Symbol('count')
  const SymbolModel = Schema.Struct({ [count]: Schema.Number })
  type SymbolModel = typeof SymbolModel.Type
  const SymbolDefinition = makeDefinition('SymbolFields', {
    Model: SymbolModel,
    Message: Schema.Never,
  })
  const initial = SymbolModel.make({ [count]: 1 })
  const incrementStep = SymbolDefinition.makeFieldsStep(() => ({
    [count]: Number.increment,
  }))

  expect(incrementStep(initial).model[count]).toBe(2)
  expect(initial[count]).toBe(1)
})

it('combines ordinary field Steps sequentially for Blocks and Applications', () => {
  const initialModel = Model.make({
    count: 1,
    label: 'Example',
    status: 'Idle',
  })
  const updateStep = Update.combineSteps([
    FieldStepsDefinition.makeFieldsStep(() => ({ count: Number.increment })),
    ApplicationDefinition.makeFieldsStep(model => ({
      label: () => `${model.count}`,
    })),
  ])

  const combined = updateStep(initialModel)

  expect(combined.model).toEqual({ count: 2, label: '2', status: 'Idle' })
  expect(combined.commands).toEqual([])
  expectTypeOf<
    Update.RequirementsOf<typeof updateStep>
  >().toEqualTypeOf<never>()
})

it('returns the identical refined Model with no other result channels', () => {
  const RefinedModel = Schema.Struct({ ...Model.fields, extra: Schema.Boolean })
  type RefinedModel = typeof RefinedModel.Type
  const model = RefinedModel.make({
    count: 1,
    label: 'Example',
    status: 'Ready',
    extra: true,
  })
  const result = FieldStepsDefinition.makeNoopStep()(model)

  expect(result).toEqual({ model })
  expect(result.model).toBe(model)
  expectTypeOf<typeof result.model>().toEqualTypeOf<typeof RefinedModel.Type>()
  expectTypeOf<
    Update.RequirementsOf<ReturnType<typeof FieldStepsDefinition.makeNoopStep>>
  >().toEqualTypeOf<never>()
  expect(ApplicationDefinition.makeNoopStep()(model).model).toBe(model)
})

it('preserves a child transition when an OutMessage policy has no parent transition', () => {
  const ChildModel = Schema.Struct({ count: Schema.Number })
  type ChildModel = typeof ChildModel.Type
  const ChildMessage = defineMessageUnion({ ClickedIncrement: {} })
  type ChildMessage = typeof ChildMessage.Type
  const ChildOutMessage = defineMessageUnion({ Incremented: {} })
  type ChildOutMessage = typeof ChildOutMessage.Type
  const ChildDefinition = makeDefinition('FieldStepsChild', {
    Model: ChildModel,
    Message: ChildMessage,
    OutMessage: ChildOutMessage,
  })
  const ChildComposition = ChildDefinition.makeComposition()
  const prepareChildBlock = () =>
    ChildComposition.prepareBlock({
      init: ChildComposition.makeInit(() => ({ model: { count: 0 } })),
      update: ChildComposition.makeUpdate({
        ClickedIncrement: model => ({
          model: modifyFields(model, { count: Number.increment }),
          outMessage: ChildOutMessage.Incremented(),
        }),
      }),
    })
  const ChildBlock: Block.FromAssemblyWithOutMessage<
    typeof ChildModel,
    typeof prepareChildBlock
  > = Block.assemble(prepareChildBlock)
  const ParentModel = Schema.Struct({ child: ChildModel, label: Schema.String })
  type ParentModel = typeof ParentModel.Type
  type ParentMessage = never
  const ParentDefinition = makeDefinition('FieldStepsParent', {
    Model: ParentModel,
    Message: Schema.Never,
  })
  const foldChildOutMessage = (outMessage: ChildOutMessage) =>
    ChildOutMessage.match<Update.Step<ParentModel, ParentMessage>>(outMessage, {
      Incremented: () => ParentDefinition.makeNoopStep(),
    })
  const ChildBinding = ParentDefinition.makeBinding(ChildBlock, {
    field: 'child',
  }).withOutMessagePolicy({ fold: foldChildOutMessage })
  const ParentComposition = ParentDefinition.makeComposition({
    bindings: [ChildBinding],
  })
  const update = ParentComposition.makeUpdate({})
  const initialModel = ParentModel.make({
    child: { count: 1 },
    label: 'Parent',
  })

  const childIncrement = update(initialModel, {
    _tag: 'GotChildMessage',
    placement: 'child',
    generation: 0,
    message: ChildMessage.ClickedIncrement(),
  })

  expect(childIncrement.model).toEqual({ child: { count: 2 }, label: 'Parent' })
  expect(childIncrement.commands).toEqual([])
  expect(childIncrement).not.toHaveProperty('outMessage')
  expectTypeOf<Update.RequirementsOf<typeof update>>().toEqualTypeOf<never>()
})

const VariantModel = Schema.Union([
  Schema.Struct({
    _tag: Schema.Literal('Number'),
    id: Schema.String,
    value: Schema.Number,
  }),
  Schema.Struct({
    _tag: Schema.Literal('Flag'),
    id: Schema.String,
    isEnabled: Schema.Boolean,
  }),
])
type VariantModel = typeof VariantModel.Type
const VariantDefinition = makeDefinition('VariantFieldSteps', {
  Model: VariantModel,
  Message: Schema.Never,
})
const TextDefinition = makeDefinition('TextFieldSteps', {
  Model: Schema.String,
  Message: Schema.Never,
})

if (false) {
  FieldStepsDefinition.makeFieldsStep(() => ({ count: Number.increment }))
  VariantDefinition.makeFieldsStep(() => ({ id: () => 'next' }))
  TextDefinition.makeNoopStep()('unchanged')

  // @ts-expect-error Unknown fields cannot be silently ignored.
  FieldStepsDefinition.makeFieldsStep(() => ({ extra: () => 1 }))
  // @ts-expect-error Unknown fields remain invalid alongside known fields.
  FieldStepsDefinition.makeFieldsStep(() => ({
    count: Number.increment,
    extra: () => 1,
  }))
  FieldStepsDefinition.makeFieldsStep(() => ({
    // @ts-expect-error Field transformers must receive the declared field type.
    count: (value: string) => value.length,
  }))
  // @ts-expect-error Field transformers must preserve the declared field type.
  FieldStepsDefinition.makeFieldsStep(() => ({ count: () => 'invalid' }))
  // @ts-expect-error A transformation cannot invalidate a tagged Model variant.
  VariantDefinition.makeFieldsStep(() => ({ _tag: () => 'Flag' }))
  // @ts-expect-error Primitive Models do not have struct field transformations.
  TextDefinition.makeFieldsStep(() => ({}))
  // @ts-expect-error The no-op accepts no callback or configuration.
  FieldStepsDefinition.makeNoopStep(() => undefined)
  // @ts-expect-error A no-op still checks its owner's Model.
  FieldStepsDefinition.makeNoopStep()({ count: 'invalid' })
}
