import { Array, Effect, Layer, Predicate, Schema, Tuple } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import { registerBinding, runtimeBindingOf } from './composition.js'
import { makeDefinition } from './define.js'
import * as Block from './public.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
type ChildModel = typeof ChildModel.Type

const ChildMessage = defineMessageUnion({
  RequestedIncrement: {},
  CompletedInitialization: { count: Schema.Number },
  CompletedIncrement: {},
})
type ChildMessage = typeof ChildMessage.Type

const Child = makeDefinition('WrappedInitializationChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const FinishInitialization = Child.makeCommand('FinishInitialization', {
  args: { count: Schema.Number },
  messages: [ChildMessage.CompletedInitialization],
  handler: function* () {
    return ({ count }) =>
      Effect.succeed(ChildMessage.CompletedInitialization({ count }))
  },
})
const FinishIncrement = Child.makeCommand('FinishIncrement', {
  messages: [ChildMessage.CompletedIncrement],
  handler: function* () {
    return () => Effect.succeed(ChildMessage.CompletedIncrement())
  },
})
const incrementStep = Child.makeStep(model => ({
  model: modifyFields(model, { count: count => count + 100 }),
  commands: [FinishIncrement()],
}))
const single = (value: number): [number] => [value]

const initCalls: globalThis.Array<number> = []
const ChildComposition = Child.makeComposition()
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit((count: number) => {
      initCalls.push(count)
      return {
        model: ChildModel.make({ count }),
        commands: [FinishInitialization({ count })],
      }
    }),
    update: ChildComposition.makeUpdate({
      RequestedIncrement: model => incrementStep(model),
      CompletedInitialization: (model, { count }) => ({
        model: modifyFields(model, { count: () => count }),
      }),
      CompletedIncrement: model => ({ model }),
    }),
    operations: {
      increment: () => Tuple.make(ChildMessage.RequestedIncrement()),
    },
    EffectsLayer: Layer.merge(
      FinishInitialization.layer,
      FinishIncrement.layer,
    ),
  })
const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const Entry = Schema.Struct({
  id: Schema.String,
  child: ChildModel,
  label: Schema.String,
})
type Entry = typeof Entry.Type

const ParentModel = Schema.Struct({
  entries: Schema.Array(Entry),
  status: Schema.Literals(['Ready', 'Stepped']),
})
type ParentModel = typeof ParentModel.Type

const ParentMessage = defineMessageUnion({
  CompletedParentInitialization: {},
})
type ParentMessage = typeof ParentMessage.Type
const Parent = makeDefinition('WrappedInitializationParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
const FinishParentInitialization = Parent.makeCommand('FinishInitialization', {
  messages: [ParentMessage.CompletedParentInitialization],
  handler: function* () {
    return () => Effect.succeed(ParentMessage.CompletedParentInitialization())
  },
})

type ChildInitContext = Readonly<{
  firstCount: number
  secondCount: number
}>

const EntriesBinding = Parent.makeBinding(ChildBlock, {
  field: 'entries',
  key: 'id',
  childField: 'child',
  init: {
    instances: (childInitContext: ChildInitContext) => [
      { key: 'first', args: single(childInitContext.firstCount) },
      { key: 'second', args: single(childInitContext.secondCount) },
    ],
    toItem: ({ key }, child) => ({
      id: key,
      child,
      label: `Entry ${key}`,
    }),
  },
})
const ParentComposition = Parent.makeComposition({
  bindings: [EntriesBinding],
})

it('initializes occurrences in order and orders own, child, then Step Commands', () => {
  const markSteppedStep = Parent.makeStep(model => ({
    model: modifyFields(model, { status: () => 'Stepped' }),
  }))
  const init = ParentComposition.makeInit(
    (childInitContext: ChildInitContext) => ({
      childInitContext,
      model: { status: 'Ready' },
      commands: [FinishParentInitialization()],
      steps: [EntriesBinding.increment('first'), markSteppedStep],
    }),
  )

  initCalls.splice(0)
  const initialized = init({ firstCount: 1, secondCount: 2 })

  expectTypeOf(initialized.model).toEqualTypeOf<ParentModel>()
  expect(initCalls).toEqual([1, 2])
  expect(initialized.model).toEqual({
    entries: [
      { id: 'first', child: { count: 101 }, label: 'Entry first' },
      { id: 'second', child: { count: 2 }, label: 'Entry second' },
    ],
    status: 'Stepped',
  })
  expect(initialized.commands?.map(command => command.name)).toEqual([
    'WrappedInitializationParent/FinishInitialization',
    'WrappedInitializationChild["first"]/FinishInitialization',
    'WrappedInitializationChild["second"]/FinishInitialization',
    'WrappedInitializationChild["first"]/FinishIncrement',
  ])
})

const KeyedChildModel = Schema.Struct({
  id: Schema.String,
  count: Schema.Number,
})
type KeyedChildModel = typeof KeyedChildModel.Type

const KeyedChildComposition = makeDefinition('KeyedInitializationChild', {
  Model: KeyedChildModel,
  Message: ChildMessage,
}).makeComposition()
const prepareKeyedChildBlock = () =>
  KeyedChildComposition.prepareBlock({
    init: KeyedChildComposition.makeInit((id: string, count: number) => ({
      model: KeyedChildModel.make({ id, count }),
    })),
    update: KeyedChildComposition.makeUpdate({
      RequestedIncrement: model => ({ model }),
      CompletedInitialization: model => ({ model }),
      CompletedIncrement: model => ({ model }),
    }),
  })
const KeyedChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof KeyedChildModel,
  typeof prepareKeyedChildBlock
> = Block.assemble(prepareKeyedChildBlock)
const KeyedParentModel = Schema.Struct({
  entries: Schema.Array(KeyedChildModel),
  status: Schema.Literal('Ready'),
})
type KeyedParentModel = typeof KeyedParentModel.Type
const KeyedParent = makeDefinition('KeyedInitializationParent', {
  Model: KeyedParentModel,
  Message: ParentMessage,
})

const initKeyedParent = (
  toItem: (
    occurrence: Readonly<{ key: string; args: readonly [string, number] }>,
    child: KeyedChildModel,
  ) => KeyedChildModel,
) => {
  const binding = KeyedParent.makeBinding(KeyedChildBlock, {
    field: 'entries',
    key: 'id',
    init: {
      instances: (count: number) => [{ key: 'first', args: ['first', count] }],
      toItem,
    },
  })
  const composition = KeyedParent.makeComposition({ bindings: [binding] })
  const init = composition.makeInit((count: number) => ({
    childInitContext: count,
    model: { status: 'Ready' },
  }))

  return init(3)
}

it('initializes an unwrapped keyed child array', () => {
  const initialized = initKeyedParent((_occurrence, child) => child)

  expect(initialized.model).toEqual({
    entries: [{ id: 'first', count: 3 }],
    status: 'Ready',
  })
})

it('rejects an unwrapped keyed child that changes the planned key', () => {
  expect(() =>
    initKeyedParent((_occurrence, child) =>
      KeyedChildModel.make({ id: 'changed', count: child.count }),
    ),
  ).toThrow('init.toItem must preserve planned key "first"')
})

it('rejects an unwrapped keyed child that replaces the initialized Model', () => {
  expect(() =>
    initKeyedParent(({ key }, child) =>
      KeyedChildModel.make({ id: key, count: child.count }),
    ),
  ).toThrow(
    'must select the exact initialized child before constructing the parent Model',
  )
})

it('drops an original init Command when a Step removes its key before another Step readds it', () => {
  const removeFirstStep = Parent.makeStep(model => ({
    model: modifyFields(model, {
      entries: Array.filter(({ id }) => id !== 'first'),
    }),
  }))
  const readdFirstStep = Parent.makeStep(model => ({
    model: modifyFields(model, {
      entries: entries => [
        ...entries,
        Entry.make({
          id: 'first',
          child: ChildModel.make({ count: 999 }),
          label: 'Replacement',
        }),
      ],
    }),
  }))
  const init = ParentComposition.makeInit(() => ({
    childInitContext: { firstCount: 1, secondCount: 2 },
    model: { status: 'Ready' },
    steps: [removeFirstStep, readdFirstStep],
  }))

  const initialized = init()

  expect(initialized.model.entries).toEqual([
    { id: 'second', child: { count: 2 }, label: 'Entry second' },
    { id: 'first', child: { count: 999 }, label: 'Replacement' },
  ])
  expect(initialized.commands?.map(command => command.name)).toEqual([
    'WrappedInitializationChild["second"]/FinishInitialization',
  ])
})

const makeRuntimeComposition = (init: object) => {
  const RuntimeParent = makeDefinition('WrappedInitializationRuntimeParent', {
    Model: ParentModel,
    Message: ParentMessage,
  })
  const binding = Reflect.apply(RuntimeParent.makeBinding, undefined, [
    ChildBlock,
    {
      field: 'entries',
      key: 'id',
      childField: 'child',
      init,
    },
  ])

  return Reflect.apply(RuntimeParent.makeComposition, undefined, [
    { bindings: [binding] },
  ])
}

const runRuntimeComposition = (composition: object): unknown => {
  const initAuthor = Reflect.get(composition, 'makeInit')
  if (!Predicate.isFunction(initAuthor)) {
    throw new Error('Expected a Composition.makeInit function.')
  }

  const init = Reflect.apply(initAuthor, undefined, [
    () => ({ model: { status: 'Ready' } }),
  ])
  if (!Predicate.isFunction(init)) {
    throw new Error('Expected Composition.makeInit to return an initializer.')
  }

  return Reflect.apply(init, undefined, [])
}

it('preflights every occurrence before calling child init', () => {
  for (const occurrences of [
    () => [
      { key: 'first', args: single(1) },
      { key: 'second', args: 'invalid' },
    ],
    () => [
      { key: 'duplicate', args: single(1) },
      { key: 'duplicate', args: single(2) },
    ],
    () => [{ key: Number.POSITIVE_INFINITY, args: single(1) }],
  ]) {
    initCalls.splice(0)
    const composition = makeRuntimeComposition({
      instances: occurrences,
      toItem: ({ key }: { key: string }, child: ChildModel) =>
        Entry.make({ id: key, child, label: key }),
    })

    expect(() => runRuntimeComposition(composition)).toThrow(
      /argument tuple|duplicate key|string or finite number key/,
    )
    expect(initCalls).toEqual([])
  }
})

it('preflights every Binding selector before calling any child init', () => {
  const AllPlansModel = Schema.Struct({
    direct: ChildModel,
    entries: Schema.Array(Entry),
    status: Schema.Literal('Ready'),
  })
  type AllPlansModel = typeof AllPlansModel.Type
  const AllPlansParent = makeDefinition('WrappedInitializationAllPlansParent', {
    Model: AllPlansModel,
    Message: Schema.Never,
  })
  const directBinding = Reflect.apply(AllPlansParent.makeBinding, undefined, [
    ChildBlock,
    {
      field: 'direct',
      init: { contextToArgs: () => single(9) },
    },
  ])
  const keyedBinding = Reflect.apply(AllPlansParent.makeBinding, undefined, [
    ChildBlock,
    {
      field: 'entries',
      key: 'id',
      childField: 'child',
      init: {
        instances: () => [{ key: 'invalid' }],
        toItem: ({ key }: { key: string }, child: ChildModel) =>
          Entry.make({ id: key, child, label: key }),
      },
    },
  ])
  const composition = Reflect.apply(AllPlansParent.makeComposition, undefined, [
    { bindings: [directBinding, keyedBinding] },
  ])
  const initAuthor = Reflect.get(composition, 'makeInit')
  if (!Predicate.isFunction(initAuthor)) {
    throw new Error('Expected a Composition.makeInit function.')
  }
  const init = Reflect.apply(initAuthor, undefined, [
    () => ({ model: { status: 'Ready' } }),
  ])
  if (!Predicate.isFunction(init)) {
    throw new Error('Expected Composition.makeInit to return an initializer.')
  }

  initCalls.splice(0)
  expect(() => Reflect.apply(init, undefined, [])).toThrow(
    'must contain its own key and args fields',
  )
  expect(initCalls).toEqual([])
})

it('rejects wrappers that change a planned key', () => {
  const composition = makeRuntimeComposition({
    instances: () => [{ key: 'planned', args: single(1) }],
    toItem: (_occurrence: unknown, child: ChildModel) =>
      Entry.make({ id: 'changed', child, label: 'Changed' }),
  })

  initCalls.splice(0)
  expect(() => runRuntimeComposition(composition)).toThrow(
    'init.toItem must preserve planned key "planned"',
  )
  expect(initCalls).toEqual([1])
})

it('rejects wrappers that replace the initialized child', () => {
  const composition = makeRuntimeComposition({
    instances: () => [{ key: 'planned', args: single(1) }],
    toItem: ({ key }: { key: string }) =>
      Entry.make({
        id: key,
        child: ChildModel.make({ count: 999 }),
        label: 'Replacement',
      }),
  })

  initCalls.splice(0)
  expect(() => runRuntimeComposition(composition)).toThrow(
    'must select the exact initialized child before constructing the parent Model',
  )
  expect(initCalls).toEqual([1])
})

it('remains passive and creates fresh wrappers on every invocation', () => {
  const occurrenceCalls = { count: 0 }
  const FreshBinding = Parent.makeBinding(ChildBlock, {
    field: 'entries',
    key: 'id',
    childField: 'child',
    placement: 'freshEntries',
    init: {
      instances: () => {
        occurrenceCalls.count += 1
        return Array.makeBy(2, index => ({
          key: `entry-${index}`,
          args: single(index),
        }))
      },
      toItem: ({ key }, child) => ({ id: key, child, label: key }),
    },
  })
  const FreshComposition = Parent.makeComposition({
    bindings: [FreshBinding],
  })
  const init = FreshComposition.makeInit(() => ({
    model: { status: 'Ready' },
  }))

  expect(occurrenceCalls.count).toBe(0)
  const first = init()
  const second = init()

  expect(occurrenceCalls.count).toBe(2)
  expect(first.model).toEqual(second.model)
  expect(first.model.entries).not.toBe(second.model.entries)
})

it('selects one large wrapped keyed field once in each validation and survival phase', () => {
  const occurrenceCount = 100
  const ScalingBinding = Parent.makeBinding(ChildBlock, {
    field: 'entries',
    key: 'id',
    childField: 'child',
    placement: 'scalingEntries',
    init: {
      instances: () =>
        Array.makeBy(occurrenceCount, index => ({
          key: `entry-${index}`,
          args: single(index),
        })),
      toItem: ({ key }, child) => ({ id: key, child, label: key }),
    },
  })
  const runtime = runtimeBindingOf(ScalingBinding)
  const selectionCalls = { count: 0 }
  registerBinding(ScalingBinding, {
    ...runtime,
    select: model => {
      selectionCalls.count += 1
      return runtime.select(model)
    },
  })
  const ScalingComposition = Parent.makeComposition({
    bindings: [ScalingBinding],
  })
  const retainEntriesStep = Parent.makeStep(model => ({ model }))
  const init = ScalingComposition.makeInit(() => ({
    model: { status: 'Ready' },
    steps: [retainEntriesStep],
  }))

  const initialized = (() => {
    try {
      return init()
    } finally {
      registerBinding(ScalingBinding, runtime)
    }
  })()

  expect(initialized.model.entries).toHaveLength(occurrenceCount)
  expect(selectionCalls.count).toBe(4)
})

if (false) {
  // @ts-expect-error Contextful occurrence selectors require shared startup.
  ParentComposition.makeInit(() => ({ model: { status: 'Ready' } }))

  Parent.makeBinding(ChildBlock, {
    // @ts-expect-error Wrapped occurrence args must match child init exactly.
    field: 'entries',
    // @ts-expect-error Wrapped occurrence args must match child init exactly.
    key: 'id',
    // @ts-expect-error Wrapped occurrence args must match child init exactly.
    childField: 'child',
    // @ts-expect-error Wrapped occurrence args must match child init exactly.
    init: {
      instances: () => [{ key: 'invalid', args: ['invalid'] }],
      toItem: ({ key }: { key: string }, child: ChildModel) =>
        Entry.make({ id: key, child, label: key }),
    },
  })
}
