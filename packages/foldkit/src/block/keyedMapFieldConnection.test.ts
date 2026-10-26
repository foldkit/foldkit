import { HashMap, Layer, Option, Predicate, Record, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import { makeDefinition } from './define.js'
import type { IncomingMessageOfBinding } from './delivery.js'
import {
  type IsExactKeyedMapField,
  normalizeKeyedMapFieldConfig,
} from './keyedMapFieldConnection.js'
import { makeMapBinding } from './mapBinding.js'
import * as Block from './public.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
const ChildMessage = defineMessageUnion({
  UpdatedCount: { count: Schema.Number },
})

const ChildComposition = makeDefinition('KeyedMapFieldChild', {
  Model: ChildModel,
  Message: ChildMessage,
}).makeComposition()
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit(() => ({
      model: ChildModel.make({ count: 0 }),
    })),
    update: ChildComposition.makeUpdate({
      UpdatedCount: (model, { count }) => ({
        model: modifyFields(model, { count: () => count }),
      }),
    }),
    EffectsLayer: Layer.empty,
  })
const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const Wrapper = Schema.Struct({
  child: ChildModel,
  label: Schema.String,
})
const Pair = Schema.Struct({
  lower: ChildModel,
  upper: ChildModel,
})
const ParentModel = Schema.Struct({
  childrenById: Schema.Record(Schema.String, ChildModel),
  rowsById: Schema.Record(Schema.String, Wrapper),
  childrenByNumber: Schema.HashMap(Schema.Finite, ChildModel),
  hashRowsById: Schema.HashMap(Schema.String, Wrapper),
  pairsById: Schema.Record(Schema.String, Pair),
})
const ParentDefinition = makeDefinition('KeyedMapFieldParent', {
  Model: ParentModel,
  Message: Schema.Never,
})
type HashMapFieldIsExact = IsExactKeyedMapField<
  typeof ParentModel,
  'childrenByNumber',
  typeof ChildModel.Type
>
expectTypeOf<HashMapFieldIsExact>().toEqualTypeOf<true>()
type HashMapStorage = (typeof ParentModel.fields)['childrenByNumber']
type HashMapStorageDetected =
  HashMapStorage extends Schema.HashMap<infer _Key, infer _Value> ? true : false
type HashMapValue =
  HashMapStorage extends Schema.HashMap<infer _Key, infer Value>
    ? Value['Type']
    : never
type HashMapKey =
  HashMapStorage extends Schema.HashMap<infer Key, infer _Value>
    ? Key['Type']
    : never
type HashMapFieldRequired =
  {} extends Pick<typeof ParentModel.Type, 'childrenByNumber'> ? false : true
expectTypeOf<HashMapStorageDetected>().toEqualTypeOf<true>()
expectTypeOf<HashMapValue>().toEqualTypeOf<typeof ChildModel.Type>()
expectTypeOf<HashMapKey>().toExtend<string | number>()
expectTypeOf<HashMapFieldRequired>().toEqualTypeOf<true>()
const ChildrenByIdBinding = makeMapBinding(ParentDefinition, ChildBlock, {
  field: 'childrenById',
})
const RowsByIdBinding = makeMapBinding(ParentDefinition, ChildBlock, {
  field: 'rowsById',
  childField: 'child',
})
const ChildrenByNumberBinding = makeMapBinding(ParentDefinition, ChildBlock, {
  field: 'childrenByNumber',
})
const HashRowsByIdBinding = makeMapBinding(ParentDefinition, ChildBlock, {
  field: 'hashRowsById',
  childField: 'child',
})
const LowerChildrenBinding = makeMapBinding(ParentDefinition, ChildBlock, {
  field: 'pairsById',
  childField: 'lower',
  placement: 'lowerChildren',
})
const UpperChildrenBinding = makeMapBinding(ParentDefinition, ChildBlock, {
  field: 'pairsById',
  childField: 'upper',
  placement: 'upperChildren',
})
expectTypeOf<
  IncomingMessageOfBinding<typeof ChildrenByIdBinding>['_tag']
>().toEqualTypeOf<'GotChildrenByIdMessage'>()
expectTypeOf<
  IncomingMessageOfBinding<typeof RowsByIdBinding>['_tag']
>().toEqualTypeOf<'GotRowsByIdMessage'>()
expectTypeOf<
  IncomingMessageOfBinding<typeof ChildrenByNumberBinding>['_tag']
>().toEqualTypeOf<'GotChildrenByNumberMessage'>()
expectTypeOf<
  IncomingMessageOfBinding<typeof HashRowsByIdBinding>['_tag']
>().toEqualTypeOf<'GotHashRowsByIdMessage'>()
expectTypeOf<
  IncomingMessageOfBinding<typeof LowerChildrenBinding>['_tag']
>().toEqualTypeOf<'GotLowerChildrenMessage'>()
expectTypeOf<
  IncomingMessageOfBinding<typeof UpperChildrenBinding>['_tag']
>().toEqualTypeOf<'GotUpperChildrenMessage'>()
const ParentComposition = ParentDefinition.makeComposition({
  bindings: [
    ChildrenByIdBinding,
    RowsByIdBinding,
    ChildrenByNumberBinding,
    HashRowsByIdBinding,
    LowerChildrenBinding,
    UpperChildrenBinding,
  ],
})
const update = ParentComposition.makeUpdate({})
const initializeRecordChild = ParentComposition.makeInit(() =>
  ChildrenByIdBinding.init({
    key: 'created',
    args: [],
    toParentModel: child =>
      ParentModel.make({
        childrenById: { created: child },
        rowsById: {},
        childrenByNumber: HashMap.empty(),
        hashRowsById: HashMap.empty(),
        pairsById: {},
      }),
  }),
)

const first = ChildModel.make({ count: 1 })
const second = ChildModel.make({ count: 2 })
const parent = ParentModel.make({
  childrenById: { first, second },
  rowsById: {
    row: Wrapper.make({ child: first, label: 'preserved' }),
  },
  childrenByNumber: HashMap.make([1, first], [2, second]),
  hashRowsById: HashMap.make([
    'row',
    Wrapper.make({ child: first, label: 'preserved' }),
  ]),
  pairsById: {
    pair: Pair.make({ lower: first, upper: second }),
  },
})

const operationOf = (
  adapter: Readonly<globalThis.Record<string, unknown>>,
  name: string,
): ((...args: ReadonlyArray<unknown>) => unknown) => {
  const operation = Reflect.get(adapter, name)
  if (!Predicate.isFunction(operation)) {
    throw new Error(`Expected ${name} to be a normalized operation`)
  }

  return (...args) => Reflect.apply(operation, undefined, args)
}

it('keeps a whole Record child Model in an ordinary direct Binding', () => {
  const FlagsModel = Schema.Record(Schema.String, Schema.Boolean)
  const FlagsMessage = defineMessageUnion({
    InformedOfFlagChange: { name: Schema.String, isEnabled: Schema.Boolean },
  })
  const FlagsComposition = makeDefinition('RecordFlags', {
    Model: FlagsModel,
    Message: FlagsMessage,
  }).makeComposition()
  const prepare = () =>
    FlagsComposition.prepareBlock({
      init: FlagsComposition.makeInit(() => ({ model: { ready: false } })),
      update: FlagsComposition.makeUpdate({
        InformedOfFlagChange: (model, { name, isEnabled }) => ({
          model: Record.set(model, name, isEnabled),
        }),
      }),
      operations: { informFlagChanged: FlagsMessage.InformedOfFlagChange },
    })
  const FlagsBlock: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof FlagsModel,
    typeof prepare
  > = Block.assemble(prepare)
  const ParentMessage = defineMessageUnion({ UpdatedFlags: {} })
  const ParentDefinition = makeDefinition('DirectRecordFlagsParent', {
    Model: Schema.Struct({ flags: FlagsBlock.Model }),
    Message: ParentMessage,
  })
  const FlagsBinding = ParentDefinition.makeBinding(FlagsBlock, {
    field: 'flags',
  })
  const Composition = ParentDefinition.makeComposition({
    bindings: [FlagsBinding],
  })
  const initial = Composition.makeInit(() => ({ model: {} }))()
  const update = Composition.makeUpdate({
    UpdatedFlags: FlagsBinding.informFlagChanged({
      name: 'ready',
      isEnabled: true,
    }),
  })

  expect(initial.model.flags).toEqual({ ready: false })
  expect(
    update(initial.model, ParentMessage.UpdatedFlags()).model.flags,
  ).toEqual({
    ready: true,
  })
  expect(() =>
    Reflect.apply(makeMapBinding, undefined, [
      ParentDefinition,
      FlagsBlock,
      { field: 'flags' },
    ]),
  ).toThrow('value Schema must have exactly the same decoded shape')
})

it('keeps a whole HashMap child Model in an ordinary direct Binding', () => {
  const FlagsModel = Schema.HashMap(Schema.String, Schema.Boolean)
  const FlagsMessage = defineMessageUnion({
    InformedOfFlagChange: { name: Schema.String, isEnabled: Schema.Boolean },
  })
  const FlagsComposition = makeDefinition('HashMapFlags', {
    Model: FlagsModel,
    Message: FlagsMessage,
  }).makeComposition()
  const prepare = () =>
    FlagsComposition.prepareBlock({
      init: FlagsComposition.makeInit(() => ({
        model: HashMap.make(['ready', false]),
      })),
      update: FlagsComposition.makeUpdate({
        InformedOfFlagChange: (model, { name, isEnabled }) => ({
          model: HashMap.set(model, name, isEnabled),
        }),
      }),
      operations: { informFlagChanged: FlagsMessage.InformedOfFlagChange },
    })
  const FlagsBlock: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof FlagsModel,
    typeof prepare
  > = Block.assemble(prepare)
  const ParentMessage = defineMessageUnion({ UpdatedFlags: {} })
  const ParentDefinition = makeDefinition('DirectHashMapFlagsParent', {
    Model: Schema.Struct({ flags: FlagsBlock.Model }),
    Message: ParentMessage,
  })
  const FlagsBinding = ParentDefinition.makeBinding(FlagsBlock, {
    field: 'flags',
  })
  const Composition = ParentDefinition.makeComposition({
    bindings: [FlagsBinding],
  })
  const initial = Composition.makeInit(() => ({ model: {} }))()
  const update = Composition.makeUpdate({
    UpdatedFlags: FlagsBinding.informFlagChanged({
      name: 'ready',
      isEnabled: true,
    }),
  })

  expect(HashMap.get(initial.model.flags, 'ready')).toEqual(Option.some(false))
  expect(
    HashMap.get(
      update(initial.model, ParentMessage.UpdatedFlags()).model.flags,
      'ready',
    ),
  ).toEqual(Option.some(true))
  expect(() =>
    Reflect.apply(makeMapBinding, undefined, [
      ParentDefinition,
      FlagsBlock,
      { field: 'flags' },
    ]),
  ).toThrow('value Schema must have exactly the same decoded shape')
})

it('derives Record keys and replaces only existing exact children', () => {
  const updated = update(parent, {
    _tag: 'GotChildrenByIdMessage',
    placement: 'childrenById',
    generation: 0,
    key: 'first',
    message: ChildMessage.UpdatedCount({ count: 3 }),
  })
  const absent = update(parent, {
    _tag: 'GotChildrenByIdMessage',
    placement: 'childrenById',
    generation: 0,
    key: 'absent',
    message: ChildMessage.UpdatedCount({ count: 4 }),
  })

  expectTypeOf<
    Parameters<typeof ChildrenByIdBinding.fold>[1]
  >().toEqualTypeOf<string>()
  expect(updated.model.childrenById).toEqual({
    first: ChildModel.make({ count: 3 }),
    second,
  })
  expect(absent.model).toBe(parent)
  expect(Object.hasOwn(absent.model.childrenById, 'absent')).toBe(false)
})

it('allows explicit Binding initialization to insert one declared occurrence', () => {
  const initialized = initializeRecordChild()

  expect(Reflect.get(initialized.model.childrenById, 'created')).toEqual(
    ChildModel.make({ count: 0 }),
  )
})

it('keeps collection presence separate from Subscription gating', () => {
  const subscriptions = { when: () => false }
  const adapter = normalizeKeyedMapFieldConfig({
    Model: ParentModel,
    ChildModel,
    field: 'childrenById',
    subscriptions,
    toParentMessage: () => undefined,
  })
  const readAll = operationOf(adapter, 'readAll')

  expect(readAll(parent)).toHaveLength(2)
  expect(Reflect.get(adapter, 'subscriptions')).toBe(subscriptions)
})

it('enumerates only own Record properties in JavaScript key order', () => {
  const adapter = normalizeKeyedMapFieldConfig({
    Model: ParentModel,
    ChildModel,
    field: 'childrenById',
    toParentMessage: () => undefined,
  })
  const readAll = operationOf(adapter, 'readAll')
  const inherited = Object.create({ inherited: ChildModel.make({ count: 9 }) })
  Object.defineProperty(inherited, 'hidden', {
    enumerable: false,
    value: ChildModel.make({ count: 8 }),
  })
  Reflect.set(inherited, '10', ChildModel.make({ count: 10 }))
  Reflect.set(inherited, '2', ChildModel.make({ count: 2 }))
  Reflect.set(inherited, 'named', ChildModel.make({ count: 1 }))
  const model = { ...parent, childrenById: inherited }
  const entries = readAll(model)

  expect(entries).toEqual([
    { key: '2', value: ChildModel.make({ count: 2 }) },
    { key: '10', value: ChildModel.make({ count: 10 }) },
    { key: 'named', value: ChildModel.make({ count: 1 }) },
  ])
})

it('preserves Record wrapper fields owned by the parent', () => {
  const updated = update(parent, {
    _tag: 'GotRowsByIdMessage',
    placement: 'rowsById',
    generation: 0,
    key: 'row',
    message: ChildMessage.UpdatedCount({ count: 3 }),
  })

  expect(Reflect.get(updated.model.rowsById, 'row')).toEqual(
    Wrapper.make({
      child: ChildModel.make({ count: 3 }),
      label: 'preserved',
    }),
  )
})

it('uses Effect HashMap lookup and replacement without inserting absent keys', () => {
  const updated = update(parent, {
    _tag: 'GotChildrenByNumberMessage',
    placement: 'childrenByNumber',
    generation: 0,
    key: 1,
    message: ChildMessage.UpdatedCount({ count: 3 }),
  })
  const absent = update(parent, {
    _tag: 'GotChildrenByNumberMessage',
    placement: 'childrenByNumber',
    generation: 0,
    key: 9,
    message: ChildMessage.UpdatedCount({ count: 4 }),
  })

  expectTypeOf<
    Parameters<typeof ChildrenByNumberBinding.fold>[1]
  >().toEqualTypeOf<number>()
  expect(
    Option.getOrThrow(HashMap.get(updated.model.childrenByNumber, 1)),
  ).toEqual(ChildModel.make({ count: 3 }))
  expect(absent.model).toBe(parent)
  expect(HashMap.has(absent.model.childrenByNumber, 9)).toBe(false)
})

it('rejects non-finite numeric HashMap occurrence keys at runtime', () => {
  const BroadNumberParentModel = Schema.Struct({
    children: Schema.HashMap(Schema.Number, ChildModel),
  })
  const adapter = normalizeKeyedMapFieldConfig({
    Model: BroadNumberParentModel,
    ChildModel,
    field: 'children',
    toParentMessage: () => undefined,
  })
  const readAll = operationOf(adapter, 'readAll')

  for (const key of [
    globalThis.Number.POSITIVE_INFINITY,
    globalThis.Number.NaN,
  ]) {
    expect(() =>
      readAll({
        children: HashMap.make([key, first]),
      }),
    ).toThrow('requires string or finite number occurrence keys')
  }
})

it('preserves HashMap wrapper fields owned by the parent', () => {
  const updated = update(parent, {
    _tag: 'GotHashRowsByIdMessage',
    placement: 'hashRowsById',
    generation: 0,
    key: 'row',
    message: ChildMessage.UpdatedCount({ count: 3 }),
  })

  expect(
    Option.getOrThrow(HashMap.get(updated.model.hashRowsById, 'row')),
  ).toEqual(
    Wrapper.make({
      child: ChildModel.make({ count: 3 }),
      label: 'preserved',
    }),
  )
})

it('uses distinct placements for two child fields in the same wrapper map', () => {
  const updatedLower = update(parent, {
    _tag: 'GotLowerChildrenMessage',
    placement: 'lowerChildren',
    generation: 0,
    key: 'pair',
    message: ChildMessage.UpdatedCount({ count: 3 }),
  })
  const updatedUpper = update(updatedLower.model, {
    _tag: 'GotUpperChildrenMessage',
    placement: 'upperChildren',
    generation: 0,
    key: 'pair',
    message: ChildMessage.UpdatedCount({ count: 4 }),
  })

  expect(Reflect.get(updatedLower.model.pairsById, 'pair')).toEqual(
    Pair.make({ lower: ChildModel.make({ count: 3 }), upper: second }),
  )
  expect(Reflect.get(updatedUpper.model.pairsById, 'pair')).toEqual(
    Pair.make({
      lower: ChildModel.make({ count: 3 }),
      upper: ChildModel.make({ count: 4 }),
    }),
  )
})

it('rejects conflicting adapters and unsupported key and value Schemas at runtime', () => {
  const InvalidParentModel = Schema.Struct({
    numericRecord: Schema.Record(Schema.Number, ChildModel),
    compositeMap: Schema.HashMap(
      Schema.Struct({ bound: Schema.String, column: Schema.String }),
      ChildModel,
    ),
    neverRecord: Schema.Record(Schema.Never, ChildModel),
    neverMap: Schema.HashMap(Schema.Never, ChildModel),
    wrongValues: Schema.Record(Schema.String, Schema.String),
  })
  const InvalidParentDefinition = makeDefinition('InvalidKeyedMapFieldParent', {
    Model: InvalidParentModel,
    Message: Schema.Never,
  })

  for (const field of [
    'numericRecord',
    'compositeMap',
    'neverRecord',
    'neverMap',
    'wrongValues',
  ]) {
    expect(() =>
      Reflect.apply(makeMapBinding, undefined, [
        InvalidParentDefinition,
        ChildBlock,
        { field },
      ]),
    ).toThrow()
  }
  expect(() =>
    Reflect.apply(makeMapBinding, undefined, [
      ParentDefinition,
      ChildBlock,
      {
        field: 'childrenById',
        readAll: () => [],
      },
    ]),
  ).toThrow('cannot supply field or presentWhen')
  expect(() =>
    Reflect.apply(makeMapBinding, undefined, [
      {
        Model: ParentModel,
        Message: Schema.Never,
        makeBinding: () => ({}),
      },
      ChildBlock,
      { field: 'childrenById' },
    ]),
  ).toThrow('returns a native child Binding')
})
