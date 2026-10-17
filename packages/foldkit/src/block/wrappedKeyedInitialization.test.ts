import { Array, Effect, Layer, Predicate, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import { registerBinding, runtimeBindingOf } from './composition.js'
import { define } from './define.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
type ChildModel = typeof ChildModel.Type

const ChildMessage = defineMessageUnion({
  CompletedInitialization: { count: Schema.Number },
  CompletedIncrement: {},
})

const Child = define('WrappedInitializationChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const FinishInitialization = Child.command('FinishInitialization', {
  args: { count: Schema.Number },
  messages: [ChildMessage.CompletedInitialization],
  handler: function* () {
    return ({ count }) =>
      Effect.succeed(ChildMessage.CompletedInitialization({ count }))
  },
})
const FinishIncrement = Child.command('FinishIncrement', {
  messages: [ChildMessage.CompletedIncrement],
  handler: function* () {
    return () => Effect.succeed(ChildMessage.CompletedIncrement())
  },
})
const increment = Child.step(model => ({
  model: modifyFields(model, { count: count => count + 100 }),
  commands: [FinishIncrement()],
}))
const single = (value: number): [number] => [value]

const initCalls: globalThis.Array<number> = []
const ChildComposition = Child.makeComposition()
const ChildBlock = ChildComposition.makeBlock({
  init: ChildComposition.makeInit((count: number) => {
    initCalls.push(count)
    return {
      model: ChildModel.make({ count }),
      commands: [FinishInitialization({ count })],
    }
  }),
  update: ChildComposition.makeUpdate((model, message) =>
    ChildMessage.match(message, {
      CompletedInitialization: ({ count }) => ({
        model: modifyFields(model, { count: () => count }),
      }),
      CompletedIncrement: () => ({ model }),
    }),
  ),
  expose: { increment },
  EffectsLayer: Layer.merge(FinishInitialization.layer, FinishIncrement.layer),
})

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
  GotChildMessage: { id: Schema.String, message: ChildMessage },
  GotDirectMessage: { message: ChildMessage },
  CompletedParentInitialization: {},
})
const Parent = define('WrappedInitializationParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
const FinishParentInitialization = Parent.command('FinishInitialization', {
  messages: [ParentMessage.CompletedParentInitialization],
  handler: function* () {
    return () => Effect.succeed(ParentMessage.CompletedParentInitialization())
  },
})

type Startup = Readonly<{
  firstCount: number
  secondCount: number
}>

const EntriesBinding = Parent.bindChild(ChildBlock, {
  field: 'entries',
  key: 'id',
  childField: 'child',
  toParentMessage: (id, message) =>
    ParentMessage.GotChildMessage({ id, message }),
  fromParentMessage: false,
  init: {
    occurrences: (startup: Startup) => [
      { key: 'first', args: single(startup.firstCount) },
      { key: 'second', args: single(startup.secondCount) },
    ],
    toItem: ({ key }, child) => ({
      id: key,
      child,
      label: `Entry ${key}`,
    }),
  },
})
const ParentComposition = Parent.makeComposition({
  childBindings: [EntriesBinding],
})

it('initializes occurrences in order and orders own, child, then Step Commands', () => {
  const markStepped = Parent.step(model => ({
    model: modifyFields(model, { status: () => 'Stepped' }),
  }))
  const initialize = ParentComposition.makeInit((startup: Startup) => ({
    startup,
    model: { status: 'Ready' },
    commands: [FinishParentInitialization()],
    steps: [EntriesBinding.increment('first'), markStepped],
  }))

  initCalls.splice(0)
  const initialized = initialize({ firstCount: 1, secondCount: 2 })

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
    'entries["first"]/FinishInitialization',
    'entries["second"]/FinishInitialization',
    'entries["first"]/FinishIncrement',
  ])
})

const KeyedChildModel = Schema.Struct({
  id: Schema.String,
  count: Schema.Number,
})
type KeyedChildModel = typeof KeyedChildModel.Type

const KeyedChild = define('KeyedInitializationChild', {
  Model: KeyedChildModel,
  Message: ChildMessage,
})
const KeyedChildComposition = KeyedChild.makeComposition()
const KeyedChildBlock = KeyedChildComposition.makeBlock({
  init: KeyedChildComposition.makeInit((id: string, count: number) => ({
    model: KeyedChildModel.make({ id, count }),
  })),
  update: KeyedChildComposition.makeUpdate(model => ({ model })),
})
const KeyedParentModel = Schema.Struct({
  entries: Schema.Array(KeyedChildModel),
  status: Schema.Literal('Ready'),
})
const KeyedParent = define('KeyedInitializationParent', {
  Model: KeyedParentModel,
  Message: ParentMessage,
})

const initializeKeyedParent = (
  toItem: (
    occurrence: Readonly<{ key: string; args: readonly [string, number] }>,
    child: KeyedChildModel,
  ) => KeyedChildModel,
) => {
  const binding = KeyedParent.bindChild(KeyedChildBlock, {
    fromParentMessage: false,
    field: 'entries',
    key: 'id',
    toParentMessage: (id, message) =>
      ParentMessage.GotChildMessage({ id, message }),
    init: {
      occurrences: (count: number) => [
        { key: 'first', args: ['first', count] },
      ],
      toItem,
    },
  })
  const composition = KeyedParent.makeComposition({ childBindings: [binding] })
  const initialize = composition.makeInit((count: number) => ({
    startup: count,
    model: { status: 'Ready' },
  }))

  return initialize(3)
}

it('initializes an unwrapped keyed child array', () => {
  const initialized = initializeKeyedParent((_occurrence, child) => child)

  expect(initialized.model).toEqual({
    entries: [{ id: 'first', count: 3 }],
    status: 'Ready',
  })
})

it('rejects an unwrapped keyed child that changes the planned key', () => {
  expect(() =>
    initializeKeyedParent((_occurrence, child) =>
      KeyedChildModel.make({ id: 'changed', count: child.count }),
    ),
  ).toThrow('init.toItem must preserve planned key "first"')
})

it('rejects an unwrapped keyed child that replaces the initialized Model', () => {
  expect(() =>
    initializeKeyedParent(({ key }, child) =>
      KeyedChildModel.make({ id: key, count: child.count }),
    ),
  ).toThrow(
    'must select the exact initialized child before constructing the parent Model',
  )
})

it('drops an original init Command when a Step removes its key before another Step readds it', () => {
  const removeFirst = Parent.step(model => ({
    model: modifyFields(model, {
      entries: Array.filter(({ id }) => id !== 'first'),
    }),
  }))
  const readdFirst = Parent.step(model => ({
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
  const initialize = ParentComposition.makeInit(() => ({
    startup: { firstCount: 1, secondCount: 2 },
    model: { status: 'Ready' },
    steps: [removeFirst, readdFirst],
  }))

  const initialized = initialize()

  expect(initialized.model.entries).toEqual([
    { id: 'second', child: { count: 2 }, label: 'Entry second' },
    { id: 'first', child: { count: 999 }, label: 'Replacement' },
  ])
  expect(initialized.commands?.map(command => command.name)).toEqual([
    'entries["second"]/FinishInitialization',
  ])
})

const makeRuntimeComposition = (init: object) => {
  const RuntimeParent = define('WrappedInitializationRuntimeParent', {
    Model: ParentModel,
    Message: ParentMessage,
  })
  const binding = Reflect.apply(RuntimeParent.bindChild, undefined, [
    ChildBlock,
    {
      field: 'entries',
      key: 'id',
      childField: 'child',
      toParentMessage: (id: string, message: typeof ChildMessage.Type) =>
        ParentMessage.GotChildMessage({ id, message }),
      fromParentMessage: false,
      init,
    },
  ])

  return Reflect.apply(RuntimeParent.makeComposition, undefined, [
    { childBindings: [binding] },
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
      occurrences,
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
  const AllPlansParent = define('WrappedInitializationAllPlansParent', {
    Model: AllPlansModel,
    Message: ParentMessage,
  })
  const directBinding = Reflect.apply(AllPlansParent.bindChild, undefined, [
    ChildBlock,
    {
      field: 'direct',
      parentMessage: ParentMessage.GotDirectMessage,
      init: { args: () => single(9) },
    },
  ])
  const keyedBinding = Reflect.apply(AllPlansParent.bindChild, undefined, [
    ChildBlock,
    {
      field: 'entries',
      key: 'id',
      childField: 'child',
      toParentMessage: (id: string, message: typeof ChildMessage.Type) =>
        ParentMessage.GotChildMessage({ id, message }),
      fromParentMessage: false,
      init: {
        occurrences: () => [{ key: 'invalid' }],
        toItem: ({ key }: { key: string }, child: ChildModel) =>
          Entry.make({ id: key, child, label: key }),
      },
    },
  ])
  const composition = Reflect.apply(AllPlansParent.makeComposition, undefined, [
    { childBindings: [directBinding, keyedBinding] },
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
    occurrences: () => [{ key: 'planned', args: single(1) }],
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
    occurrences: () => [{ key: 'planned', args: single(1) }],
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
  const FreshBinding = Parent.bindChild(ChildBlock, {
    fromParentMessage: false,
    field: 'entries',
    key: 'id',
    childField: 'child',
    placement: 'freshEntries',
    toParentMessage: (id, message) =>
      ParentMessage.GotChildMessage({ id, message }),
    init: {
      occurrences: () => {
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
    childBindings: [FreshBinding],
  })
  const initialize = FreshComposition.makeInit(() => ({
    model: { status: 'Ready' },
  }))

  expect(occurrenceCalls.count).toBe(0)
  const first = initialize()
  const second = initialize()

  expect(occurrenceCalls.count).toBe(2)
  expect(first.model).toEqual(second.model)
  expect(first.model.entries).not.toBe(second.model.entries)
})

it('selects one large wrapped keyed field once in each validation and survival phase', () => {
  const occurrenceCount = 100
  const ScalingBinding = Parent.bindChild(ChildBlock, {
    fromParentMessage: false,
    field: 'entries',
    key: 'id',
    childField: 'child',
    placement: 'scalingEntries',
    toParentMessage: (id, message) =>
      ParentMessage.GotChildMessage({ id, message }),
    init: {
      occurrences: () =>
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
    childBindings: [ScalingBinding],
  })
  const retainEntries = Parent.step(model => ({ model }))
  const initialize = ScalingComposition.makeInit(() => ({
    model: { status: 'Ready' },
    steps: [retainEntries],
  }))

  const initialized = (() => {
    try {
      return initialize()
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

  Parent.bindChild(ChildBlock, {
    // @ts-expect-error Wrapped occurrence args must match child init exactly.
    field: 'entries',
    // @ts-expect-error Wrapped occurrence args must match child init exactly.
    key: 'id',
    // @ts-expect-error Wrapped occurrence args must match child init exactly.
    childField: 'child',
    // @ts-expect-error Wrapped occurrence args must match child init exactly.
    toParentMessage: (id: string, message: typeof ChildMessage.Type) =>
      ParentMessage.GotChildMessage({ id, message }),
    // @ts-expect-error Wrapped occurrence args must match child init exactly.
    init: {
      occurrences: () => [{ key: 'invalid', args: ['invalid'] }],
      toItem: ({ key }: { key: string }, child: ChildModel) =>
        Entry.make({ id: key, child, label: key }),
    },
  })
}
