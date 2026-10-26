import { Option, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import { runtimeBindingOf } from './composition.js'
import { makeDefinition } from './define.js'
import type { InitialEvidenceOfBinding } from './initialization.js'
import * as Block from './public.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
type ChildModel = typeof ChildModel.Type

const ChildMessage = defineMessageUnion({
  UpdatedCount: { count: Schema.Number },
})

const ChildComposition = makeDefinition('BindingInitChild', {
  Model: ChildModel,
  Message: ChildMessage,
}).makeComposition()
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit((config: Readonly<{ count: number }>) => ({
      model: ChildModel.make({ count: config.count }),
    })),
    update: ChildComposition.makeUpdate({
      UpdatedCount: (model, { count }) => ({
        model: modifyFields(model, { count: () => count }),
      }),
    }),
  })
const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const ParentModel = Schema.Struct({
  first: ChildModel,
  second: ChildModel,
  maybeChild: Schema.Option(ChildModel),
  optionalChild: Schema.optional(ChildModel),
  label: Schema.String,
})

const Parent = makeDefinition('BindingInitParent', {
  Model: ParentModel,
  Message: Schema.Never,
})

const AccessorBinding = Parent.makeBinding(ChildBlock, {
  placement: 'accessor',
  read: model => Option.some(model.first),
  write: (model, nextChild) => modifyFields(model, { first: () => nextChild }),
  init: {
    contextToArgs: () => [{ count: 2 }],
    toParentFields: childModel => {
      expectTypeOf(childModel).toEqualTypeOf<ChildModel>()
      return { second: childModel }
    },
  },
})

type AccessorInitialEvidence = InitialEvidenceOfBinding<typeof AccessorBinding>

expectTypeOf<AccessorInitialEvidence['field']>().toEqualTypeOf<'second'>()
expectTypeOf<AccessorInitialEvidence['value']>().toEqualTypeOf<ChildModel>()
expectTypeOf<
  AccessorInitialEvidence['childInitContext']
>().toEqualTypeOf<never>()

Parent.makeBinding(ChildBlock, {
  field: 'first',
  init: { contextToArgs: () => [{ count: 3 }] },
})

Parent.makeBinding(ChildBlock, {
  field: 'maybeChild',
  init: {
    contextToArgs: (context: Readonly<{ count: number }>) =>
      Option.some([{ count: context.count }]),
  },
})

Parent.makeBinding(ChildBlock, {
  // @ts-expect-error The invalid projection makes this accessor config ineligible.
  read: model => Option.some(model.first),
  // @ts-expect-error The invalid projection makes this accessor config ineligible.
  write: (model, nextChild) => modifyFields(model, { first: () => nextChild }),
  // @ts-expect-error A projected init field must have the exact child Model type.
  init: {
    contextToArgs: () => [{ count: 1 }],
    toParentFields: childModel => ({ label: childModel }),
  },
})

Parent.makeBinding(ChildBlock, {
  // @ts-expect-error The invalid projection makes this accessor config ineligible.
  read: model => Option.some(model.first),
  // @ts-expect-error The invalid projection makes this accessor config ineligible.
  write: (model, nextChild) => modifyFields(model, { first: () => nextChild }),
  // @ts-expect-error Option storage is not one exact required child Model field.
  init: {
    contextToArgs: () => [{ count: 1 }],
    toParentFields: childModel => ({ maybeChild: Option.some(childModel) }),
  },
})

Parent.makeBinding(ChildBlock, {
  // @ts-expect-error The invalid projection makes this accessor config ineligible.
  read: model => Option.some(model.first),
  // @ts-expect-error The invalid projection makes this accessor config ineligible.
  write: (model, nextChild) => modifyFields(model, { first: () => nextChild }),
  // @ts-expect-error Optional storage is not one exact required child Model field.
  init: {
    contextToArgs: () => [{ count: 1 }],
    toParentFields: childModel => ({ optionalChild: childModel }),
  },
})

Parent.makeBinding(ChildBlock, {
  // @ts-expect-error The invalid projection makes this accessor config ineligible.
  read: model => Option.some(model.first),
  // @ts-expect-error The invalid projection makes this accessor config ineligible.
  write: (model, nextChild) => modifyFields(model, { first: () => nextChild }),
  // @ts-expect-error A projected init contributes exactly one parent Model field.
  init: {
    contextToArgs: () => [{ count: 1 }],
    toParentFields: childModel => ({
      first: childModel,
      second: childModel,
    }),
  },
})

Parent.makeBinding(ChildBlock, {
  // @ts-expect-error The invalid projection makes this accessor config ineligible.
  read: model => Option.some(model.first),
  // @ts-expect-error The invalid projection makes this accessor config ineligible.
  write: (model, nextChild) => modifyFields(model, { first: () => nextChild }),
  // @ts-expect-error A projected init cannot contribute an undeclared field.
  init: {
    contextToArgs: () => [{ count: 1 }],
    toParentFields: childModel => ({
      first: childModel,
      undeclared: childModel,
    }),
  },
})

const runtimeAccessorBinding = (
  toParentFields: (childModel: ChildModel) => unknown,
) =>
  Reflect.apply(Parent.makeBinding, undefined, [
    ChildBlock,
    {
      placement: 'runtimeAccessor',
      read: (parentModel: typeof ParentModel.Type) =>
        Option.some(parentModel.first),
      write: (parentModel: typeof ParentModel.Type, nextChild: ChildModel) =>
        modifyFields(parentModel, { first: () => nextChild }),
      init: { contextToArgs: () => [{ count: 1 }], toParentFields },
    },
  ])

it('registers and validates an accessor child init projection', () => {
  const policy = runtimeBindingOf(AccessorBinding).initial
  if (policy?.kind !== 'Projected') {
    throw new Error('Expected a projected Binding init policy.')
  }

  const childModel = ChildModel.make({ count: 2 })

  expect(policy.allowedFields).toEqual(['first', 'second'])
  expect(policy.resolveArguments(undefined)).toEqual([{ count: 2 }])
  expect(policy.project(childModel)).toEqual({
    field: 'second',
    value: childModel,
  })
  expect(policy.isStored({ second: childModel }, 'second')).toBe(true)
})

it('keeps the accessor read and write policy after projected initialization', () => {
  const first = ChildModel.make({ count: 1 })
  const second = ChildModel.make({ count: 2 })
  const parent = ParentModel.make({
    first,
    second,
    maybeChild: Option.none(),
    label: 'parent',
  })

  const Composition = Parent.makeComposition({
    bindings: [AccessorBinding],
  })
  const update = Composition.makeUpdate({})
  const updated = update(parent, {
    _tag: 'GotAccessorMessage',
    placement: 'accessor',
    generation: 0,
    message: ChildMessage.UpdatedCount({ count: 3 }),
  })

  expect(updated.model.first).toEqual(ChildModel.make({ count: 3 }))
  expect(updated.model.second).toEqual(second)
})

it('rejects invalid accessor child init projections at runtime', () => {
  const childModel = ChildModel.make({ count: 1 })
  const project = (model: (childModel: ChildModel) => unknown) => {
    const policy = runtimeBindingOf(runtimeAccessorBinding(model)).initial
    if (policy?.kind !== 'Projected') {
      throw new Error('Expected a projected Binding init policy.')
    }
    return () => policy.project(childModel)
  }

  expect(project(child => ({ first: child, extra: child }))).toThrow(
    'must return exactly one parent Model field',
  )
  expect(project(child => ({ maybeChild: Option.some(child) }))).toThrow(
    'must be a required parent Struct field',
  )
  expect(project(() => ({ first: ChildModel.make({ count: 2 }) }))).toThrow(
    'must contain the initialized child Model it receives',
  )
})

it('rejects the removed initial configuration field at runtime', () => {
  expect(() =>
    Reflect.apply(Parent.makeBinding, undefined, [
      ChildBlock,
      {
        field: 'first',
        initial: true,
      },
    ]),
  ).toThrow('Unknown Binding configuration field "initial"')
})
