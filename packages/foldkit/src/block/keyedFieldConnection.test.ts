import { Layer, Predicate, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { taggedStruct } from '../schema/index.js'
import { modifyFields } from '../struct/index.js'
import { hasSameDecodedSchemaShape } from './decodedSchemaShape.js'
import { makeDefinition } from './define.js'
import {
  type RequiredKeyField,
  type RequiredKeyedField,
  normalizeKeyedFieldConfig,
} from './keyedFieldConnection.js'
import * as Block from './public.js'

const ChildModel = Schema.Struct({ id: Schema.String, count: Schema.Number })
type ChildModel = typeof ChildModel.Type
const EquivalentChildModel = Schema.Struct({
  count: Schema.Number,
  id: Schema.String,
})
type EquivalentChildModel = typeof EquivalentChildModel.Type
const EquivalentParentModel = Schema.Struct({
  entries: Schema.Array(EquivalentChildModel),
})
type EquivalentParentModel = typeof EquivalentParentModel.Type
const SuspendedParentModel = Schema.Struct({
  entries: Schema.suspend(() => Schema.Array(ChildModel)),
})
type SuspendedParentModel = typeof SuspendedParentModel.Type
const BooleanKeyChildModel = Schema.Struct({
  id: Schema.Boolean,
  count: Schema.Number,
})
type BooleanKeyChildModel = typeof BooleanKeyChildModel.Type
const BooleanKeyParentModel = Schema.Struct({
  entries: Schema.Array(BooleanKeyChildModel),
})
type BooleanKeyParentModel = typeof BooleanKeyParentModel.Type
const OptionalKeyChildModel = Schema.Struct({
  id: Schema.optionalKey(Schema.String),
  count: Schema.Number,
})
type OptionalKeyChildModel = typeof OptionalKeyChildModel.Type
const OptionalKeyParentModel = Schema.Struct({
  entries: Schema.Array(OptionalKeyChildModel),
})
type OptionalKeyParentModel = typeof OptionalKeyParentModel.Type
const OtherModel = Schema.Struct({ id: Schema.String, label: Schema.String })
type OtherModel = typeof OtherModel.Type
const ArrayChildModel = Schema.Array(Schema.String)
type ArrayChildModel = typeof ArrayChildModel.Type
const ParentModel = Schema.Struct({
  entries: Schema.Array(ChildModel),
  otherEntries: Schema.Array(OtherModel),
  child: ChildModel,
  arrayChild: ArrayChildModel,
})
type ParentModel = typeof ParentModel.Type
const ChildMessage = defineMessageUnion({
  UpdatedCount: { count: Schema.Number },
  UpdatedId: { id: Schema.String },
})
type ChildMessage = typeof ChildMessage.Type

const ChildComposition = makeDefinition('KeyedFieldConnectionChild', {
  Model: ChildModel,
  Message: ChildMessage,
}).makeComposition()
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit(() => ({
      model: ChildModel.make({ id: 'initial', count: 0 }),
    })),
    update: ChildComposition.makeUpdate({
      UpdatedCount: (model, { count }) => ({
        model: modifyFields(model, { count: () => count }),
      }),
      UpdatedId: (model, { id }) => ({
        model: modifyFields(model, { id: () => id }),
      }),
    }),
    EffectsLayer: Layer.empty,
  })
const childBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)
const ArrayChildMessage = defineMessageUnion({ IgnoredValue: {} })
type ArrayChildMessage = typeof ArrayChildMessage.Type

const ArrayChildComposition = makeDefinition('KeyedFieldConnectionArrayChild', {
  Model: ArrayChildModel,
  Message: ArrayChildMessage,
}).makeComposition()
const prepareArrayChildBlock = () =>
  ArrayChildComposition.prepareBlock({
    init: ArrayChildComposition.makeInit(() => ({
      model: ArrayChildModel.make(['initial']),
    })),
    update: ArrayChildComposition.makeUpdate({
      IgnoredValue: model => ({ model }),
    }),
    EffectsLayer: Layer.empty,
  })
const arrayChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ArrayChildModel,
  typeof prepareArrayChildBlock
> = Block.assemble(prepareArrayChildBlock)
const keyedFieldCandidate: RequiredKeyedField<
  ParentModel,
  typeof childBlock.Model.Type
> = 'entries'
const keyFieldCandidate: RequiredKeyField<typeof childBlock.Model.Type> = 'id'
void keyedFieldCandidate
void keyFieldCandidate
const Parent = makeDefinition('KeyedFieldConnectionParent', {
  Model: ParentModel,
  Message: Schema.Never,
})
const ChildrenBinding = Parent.makeBinding(childBlock, {
  field: 'entries',
  key: 'id',
})
const ArrayChildBinding = Parent.makeBinding(arrayChildBlock, {
  field: 'arrayChild',
  init: false,
})
const ParentComposition = Parent.makeComposition({
  bindings: [ChildrenBinding, ArrayChildBinding],
})

const update = ParentComposition.makeUpdate({})

const CallableChildModel = taggedStruct('CallableChild', {
  id: Schema.String,
  count: Schema.Number,
})
type CallableChildModel = typeof CallableChildModel.Type

const CallableChildComposition = makeDefinition(
  'KeyedFieldConnectionCallableChild',
  {
    Model: CallableChildModel,
    Message: ChildMessage,
  },
).makeComposition()
const prepareCallableChildBlock = () =>
  CallableChildComposition.prepareBlock({
    init: CallableChildComposition.makeInit(() => ({
      model: CallableChildModel({ id: 'initial', count: 0 }),
    })),
    update: CallableChildComposition.makeUpdate({
      UpdatedCount: (model, { count }) => ({
        model: modifyFields(model, { count: () => count }),
      }),
      UpdatedId: (model, { id }) => ({
        model: modifyFields(model, { id: () => id }),
      }),
    }),
    EffectsLayer: Layer.empty,
  })
const callableChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof CallableChildModel,
  typeof prepareCallableChildBlock
> = Block.assemble(prepareCallableChildBlock)
const CallableParentModel = taggedStruct('CallableParent', {
  entries: Schema.Array(CallableChildModel),
})
type CallableParentModel = typeof CallableParentModel.Type
const CallableParent = makeDefinition('KeyedFieldConnectionCallableParent', {
  Model: CallableParentModel,
  Message: Schema.Never,
})
const CallableChildrenBinding = CallableParent.makeBinding(callableChildBlock, {
  field: 'entries',
  key: 'id',
})
const CallableComposition = CallableParent.makeComposition({
  bindings: [CallableChildrenBinding],
})
const updateCallable = CallableComposition.makeUpdate({})

const normalize = (overrides: globalThis.Record<string, unknown> = {}) =>
  normalizeKeyedFieldConfig({
    Model: ParentModel,
    ChildModel,
    field: 'entries',
    key: 'id',
    toParentMessage: () => undefined,
    ...overrides,
  })

const adapterOf = (normalized: unknown): globalThis.Record<string, unknown> => {
  if (!Predicate.isObject(normalized)) {
    throw new Error('Expected a normalized keyed field adapter')
  }

  return normalized
}

const operationOf = (
  adapter: globalThis.Record<string, unknown>,
  name: string,
): ((...args: ReadonlyArray<unknown>) => unknown) => {
  const operation = Reflect.get(adapter, name)
  if (!Predicate.isFunction(operation)) {
    throw new Error(`Expected ${name} to be a normalized operation`)
  }

  return (...args) => Reflect.apply(operation, undefined, args)
}

it('derives identity access and immutable replacement from exact Struct fields', () => {
  const normalized = adapterOf(normalize())
  const first = ChildModel.make({ id: 'first', count: 1 })
  const second = ChildModel.make({ id: 'second', count: 2 })
  const parent = ParentModel.make({
    entries: [first, second],
    otherEntries: [],
    child: first,
    arrayChild: ['initial'],
  })
  const nextFirst = ChildModel.make({ id: 'first', count: 3 })
  const readAll = operationOf(normalized, 'readAll')
  const read = operationOf(normalized, 'read')
  const key = operationOf(normalized, 'key')
  const writeAt = operationOf(normalized, 'writeAt')

  expect(Reflect.get(normalized, 'placement')).toBe('entries')
  expect(readAll(parent)).toEqual(parent.entries)
  expect(read(first)).toBe(first)
  expect(key(first)).toBe('first')
  expect(writeAt(parent, 'first', nextFirst)).toEqual(
    ParentModel.make({
      entries: [nextFirst, second],
      otherEntries: [],
      child: first,
      arrayChild: ['initial'],
    }),
  )
  expect(parent.entries).toEqual([first, second])
})

it('accepts callable tagged Struct schemas for parent and child Models', () => {
  const first = CallableChildModel({ id: 'first', count: 1 })
  const parent = CallableParentModel({ entries: [first] })

  expect(
    updateCallable(parent, {
      _tag: 'GotKeyedFieldConnectionCallableChildMessage',
      placement: 'KeyedFieldConnectionCallableChild',
      generation: 0,
      key: 'first',
      message: ChildMessage.UpdatedCount({ count: 2 }),
    }).model,
  ).toEqual(
    CallableParentModel({
      entries: [CallableChildModel({ id: 'first', count: 2 })],
    }),
  )
})

it('accepts separately constructed Struct schemas with the same decoded shape', () => {
  const normalized = adapterOf(normalize({ Model: EquivalentParentModel }))
  const child = EquivalentChildModel.make({ id: 'equivalent', count: 1 })
  const parent = EquivalentParentModel.make({ entries: [child] })
  const readAll = operationOf(normalized, 'readAll')

  expect(readAll(parent)).toEqual([child])
})

it('accepts an exact child array behind a suspended Schema', () => {
  const normalized = adapterOf(normalize({ Model: SuspendedParentModel }))
  const child = ChildModel.make({ id: 'suspended', count: 1 })
  const parent = SuspendedParentModel.make({ entries: [child] })
  const readAll = operationOf(normalized, 'readAll')

  expect(readAll(parent)).toEqual([child])
})

it('compares decoded Union alternatives without depending on declaration order', () => {
  const left = Schema.Union([
    Schema.Struct({ _tag: Schema.Literal('First'), value: Schema.String }),
    Schema.Struct({ _tag: Schema.Literal('Second'), value: Schema.Number }),
  ])
  type left = typeof left.Type
  const right = Schema.Union([
    Schema.Struct({ value: Schema.Number, _tag: Schema.Literal('Second') }),
    Schema.Struct({ value: Schema.String, _tag: Schema.Literal('First') }),
  ])
  type right = typeof right.Type

  expect(hasSameDecodedSchemaShape(left, right)).toBe(true)
})

it('uses the direct field shorthand through the shared keyed Binding', () => {
  const first = ChildModel.make({ id: 'first', count: 1 })
  const second = ChildModel.make({ id: 'second', count: 2 })
  const parent = ParentModel.make({
    entries: [first, second],
    otherEntries: [],
    child: first,
    arrayChild: ['initial'],
  })
  const updated = update(parent, {
    _tag: 'GotKeyedFieldConnectionChildMessage',
    placement: 'KeyedFieldConnectionChild',
    generation: 0,
    key: 'first',
    message: ChildMessage.UpdatedCount({ count: 4 }),
  })
  const absent = update(parent, {
    _tag: 'GotKeyedFieldConnectionChildMessage',
    placement: 'KeyedFieldConnectionChild',
    generation: 0,
    key: 'absent',
    message: ChildMessage.UpdatedCount({ count: 5 }),
  })

  expectTypeOf(
    ChildrenBinding.placement,
  ).toEqualTypeOf<'KeyedFieldConnectionChild'>()
  expectTypeOf<
    Parameters<typeof ChildrenBinding.fold>[1]
  >().toEqualTypeOf<string>()
  expect(updated.model.entries).toEqual([
    ChildModel.make({ id: 'first', count: 4 }),
    second,
  ])
  expect(absent.model).toBe(parent)
})

it('keeps an Array child Model in the static direct Binding path', () => {
  const child = ChildModel.make({ id: 'first', count: 1 })
  const parent = ParentModel.make({
    entries: [child],
    otherEntries: [],
    child,
    arrayChild: ['initial'],
  })
  const updated = update(parent, {
    _tag: 'GotArrayChildMessage',
    placement: 'arrayChild',
    generation: 0,
    message: ArrayChildMessage.IgnoredValue(),
  })

  expect(updated.model).toEqual(parent)
})

it('preserves an explicit placement and keyed policy fields', () => {
  const subscriptions = { when: () => true }
  const normalized = adapterOf(
    normalize({
      placement: 'rows',
      subscriptions,
      outMessage: { fold: () => {} },
    }),
  )

  expect(Reflect.get(normalized, 'placement')).toBe('rows')
  expect(Reflect.get(normalized, 'subscriptions')).toBe(subscriptions)
  expect(Reflect.get(normalized, 'outMessage')).toEqual({
    fold: expect.any(Function),
  })
  expect(normalized).not.toHaveProperty('Model')
  expect(normalized).not.toHaveProperty('ChildModel')
  expect(normalized).not.toHaveProperty('field')
})

it('rejects invalid fields and adapter conflicts before binding', () => {
  expect(() => normalize({ field: 'missing' })).toThrow(
    'declared parent Struct Model field',
  )
  expect(() => normalize({ field: 'child' })).toThrow(
    'exact array of the child Model',
  )
  expect(() => normalize({ field: 'otherEntries' })).toThrow(
    'exact array of the child Model',
  )
  expect(() => normalize({ key: 'missing' })).toThrow(
    'declared child Model key field',
  )
  expect(() =>
    normalize({
      Model: OptionalKeyParentModel,
      ChildModel: OptionalKeyChildModel,
    }),
  ).toThrow('key field must be required')
  expect(() =>
    normalize({
      Model: BooleanKeyParentModel,
      ChildModel: BooleanKeyChildModel,
    }),
  ).toThrow('key field Schema must decode to a string or number')

  for (const conflict of [
    'readAll',
    'read',
    'write',
    'writeAt',
    'presentWhen',
    'parentMessage',
  ]) {
    expect(() => normalize({ [conflict]: () => undefined })).toThrow(
      'cannot also supply custom accessors, presentWhen, or a parentMessage mapping',
    )
  }

  expect(() => normalize({ toParentMessage: undefined })).toThrow(
    'explicit key-aware toParentMessage mapper',
  )
})

it('rejects missing, nonprimitive, and nonfinite runtime keys', () => {
  const normalized = adapterOf(normalize())
  const key = operationOf(normalized, 'key')

  expect(() => key({ count: 1 })).toThrow('string or finite number keys')
  expect(() => key({ id: {}, count: 1 })).toThrow(
    'string or finite number keys',
  )
  expect(() => key({ id: Number.NaN, count: 1 })).toThrow(
    'string or finite number keys',
  )
})

it('rejects invalid runtime storage and child key replacement', () => {
  const normalized = adapterOf(normalize())
  const readAll = operationOf(normalized, 'readAll')
  const writeAt = operationOf(normalized, 'writeAt')
  const first = ChildModel.make({ id: 'first', count: 1 })
  const parent = ParentModel.make({
    entries: [first],
    otherEntries: [],
    child: first,
    arrayChild: ['initial'],
  })

  expect(() => readAll({ entries: 'invalid' })).toThrow(
    'field "entries" must contain an array of child Models',
  )
  expect(() =>
    writeAt(parent, 'first', ChildModel.make({ id: 'changed', count: 2 })),
  ).toThrow('cannot initialize or replace a child with a different key')
  expect(parent.entries).toEqual([first])
})

it('rejects an initialized child whose stable key differs from its occurrence', () => {
  const initMismatchedChild = ParentComposition.makeInit(() =>
    ChildrenBinding.init({
      key: 'requested',
      args: [],
      toParentModel: child =>
        ParentModel.make({
          entries: [child],
          otherEntries: [],
          child,
          arrayChild: ['initial'],
        }),
    }),
  )

  expect(() => initMismatchedChild()).toThrow(
    'cannot initialize or replace a child with a different key',
  )
})

it('rejects a child update that changes its stable key', () => {
  const first = ChildModel.make({ id: 'first', count: 1 })
  const parent = ParentModel.make({
    entries: [first],
    otherEntries: [],
    child: first,
    arrayChild: ['initial'],
  })

  expect(() =>
    update(parent, {
      _tag: 'GotKeyedFieldConnectionChildMessage',
      placement: 'KeyedFieldConnectionChild',
      generation: 0,
      key: 'first',
      message: ChildMessage.UpdatedId({ id: 'changed' }),
    }),
  ).toThrow('cannot initialize or replace a child with a different key')
  expect(parent.entries).toEqual([first])
})

it('rejects ambiguous shorthand and incomplete general keyed adapters', () => {
  expect(() => normalize({ subscriptons: {} })).toThrow(
    'does not support the config field "subscriptons"',
  )

  expect(() =>
    Reflect.apply(Parent.makeBinding, undefined, [
      childBlock,
      {
        field: 'entries',
      },
    ]),
  ).toThrow('requires a derivable key Schema')

  expect(() =>
    Reflect.apply(Parent.makeBinding, undefined, [
      childBlock,
      {
        field: 'entries',
        readAll: (model: ParentModel) => model.entries,
        key: (child: ChildModel) => child.id,
        read: (child: ChildModel) => child,
        writeAt: (model: ParentModel) => model,
      },
    ]),
  ).toThrow('cannot supply field or presentWhen')

  expect(() =>
    Reflect.apply(Parent.makeBinding, undefined, [
      childBlock,
      {
        readAll: (model: ParentModel) => model.entries,
        key: (child: ChildModel) => child.id,
        writeAt: (model: ParentModel) => model,
      },
    ]),
  ).toThrow('requires a read function')

  expect(() =>
    Reflect.apply(Parent.makeBinding, undefined, [
      childBlock,
      {
        readAll: (model: ParentModel) => model.entries,
        key: (child: ChildModel) => child.id,
        read: (child: ChildModel) => child,
        writeAt: (model: ParentModel) => model,
        subscriptons: {},
      },
    ]),
  ).toThrow('does not support the config field "subscriptons"')
})
