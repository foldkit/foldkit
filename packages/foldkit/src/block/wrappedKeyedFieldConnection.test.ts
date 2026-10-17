import { Array, Context, Effect, Layer, Option, Schema, Scope } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { makeCompositionRuntime } from '../runtime/compositionRuntime.js'
import type {
  ResolvedSlowPhaseConfig,
  SlowSubscriptionDependenciesContext,
} from '../runtime/slowPhase.js'
import { modifyFields } from '../struct/index.js'
import { inspectBinding } from './binding.js'
import { define } from './define.js'

const CounterModel = Schema.Struct({ count: Schema.Number })
const StoredCounterModel = Schema.Struct({ count: Schema.Number })
const CounterMessage = defineMessageUnion({
  UpdatedCount: { count: Schema.Number },
  CompletedFinishInitialization: { count: Schema.Number },
})
const Counter = define('WrappedKeyedFieldCounter', {
  Model: CounterModel,
  Message: CounterMessage,
})
const FinishInitialization = Counter.command('FinishInitialization', {
  args: { count: Schema.Number },
  messages: [CounterMessage.CompletedFinishInitialization],
  handler: function* () {
    return ({ count }) =>
      Effect.succeed(CounterMessage.CompletedFinishInitialization({ count }))
  },
})
const setCount = Counter.step((model, count: number) => ({
  model: modifyFields(model, { count: () => count }),
}))
const CounterComposition = Counter.makeComposition()
const counterBlock = CounterComposition.makeBlock({
  init: CounterComposition.makeInit((count: number) => ({
    model: CounterModel.make({ count }),
    commands: [FinishInitialization({ count })],
  })),
  update: CounterComposition.makeUpdate((model, message) =>
    CounterMessage.match(message, {
      UpdatedCount: ({ count }) => setCount(model, count),
      CompletedFinishInitialization: ({ count }) => setCount(model, count),
    }),
  ),
  expose: { setCount },
  EffectsLayer: FinishInitialization.layer,
})

const CounterEntry = Schema.Struct({
  id: Schema.String,
  counter: StoredCounterModel,
  label: Schema.String,
  rank: Schema.Number,
})
const TextMessage = defineMessageUnion({
  ReplacedText: { value: Schema.String },
})
const Text = define('WrappedKeyedFieldText', {
  Model: Schema.String,
  Message: TextMessage,
})
const TextComposition = Text.makeComposition()
const textBlock = TextComposition.makeBlock({
  init: TextComposition.makeInit((value: string) => ({ model: value })),
  update: TextComposition.makeUpdate((_model, { value }) => ({ model: value })),
})
const TextEntry = Schema.Struct({
  id: Schema.String,
  text: Schema.String,
  label: Schema.String,
})
const ParentModel = Schema.Struct({
  counters: Schema.Array(CounterEntry),
  textEntries: Schema.Array(TextEntry),
})
type ParentModel = typeof ParentModel.Type
const ParentMessage = defineMessageUnion({
  GotCounterMessage: { id: Schema.String, message: CounterMessage },
  GotTextMessage: { id: Schema.String, message: TextMessage },
})
const Parent = define('WrappedKeyedFieldParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
const CountersBinding = Parent.bindChild(counterBlock, {
  field: 'counters',
  key: 'id',
  childField: 'counter',
  fromParentMessage: false,
  toParentMessage: (id, message) =>
    ParentMessage.GotCounterMessage({ id, message }),
})
const AlternateCountersBinding = Parent.bindChild(counterBlock, {
  field: 'counters',
  key: 'id',
  childField: 'counter',
  placement: 'alternateCounters',
  fromParentMessage: false,
  toParentMessage: (id, message) =>
    ParentMessage.GotCounterMessage({ id, message }),
})
const TextEntriesBinding = Parent.bindChild(textBlock, {
  field: 'textEntries',
  key: 'id',
  childField: 'text',
  fromParentMessage: false,
  toParentMessage: (id, message) =>
    ParentMessage.GotTextMessage({ id, message }),
})
const ParentComposition = Parent.makeComposition({
  childBindings: [
    CountersBinding,
    AlternateCountersBinding,
    TextEntriesBinding,
  ],
})
const ParentBlock = ParentComposition.makeBlock({
  init: ParentComposition.makeInit(() => ({
    model: ParentModel.make({ counters: [], textEntries: [] }),
  })),
  update: ParentComposition.makeUpdate((model, message) =>
    ParentMessage.match(message, {
      GotCounterMessage: ({ id, message }) =>
        CountersBinding.fold(model, id, message),
      GotTextMessage: ({ id, message }) =>
        TextEntriesBinding.fold(model, id, message),
    }),
  ),
  expose: {
    setCount: Parent.step((_model, id: string, count: number) =>
      CountersBinding.setCount(id, count),
    ),
  },
})
const noSlowSubscriptionDependencies: Option.Option<
  ResolvedSlowPhaseConfig<SlowSubscriptionDependenciesContext<ParentModel>>
> = Option.none()

const firstEntry = CounterEntry.make({
  id: 'first',
  counter: StoredCounterModel.make({ count: 1 }),
  label: 'First counter',
  rank: 10,
})
const secondEntry = CounterEntry.make({
  id: 'second',
  counter: StoredCounterModel.make({ count: 2 }),
  label: 'Second counter',
  rank: 20,
})
const initial = ParentModel.make({
  counters: [firstEntry, secondEntry],
  textEntries: [
    TextEntry.make({ id: 'text', text: 'before', label: 'Text entry' }),
  ],
})

it('updates only the child field of the targeted wrapper', () => {
  const previousFirst = Option.getOrThrow(Array.get(initial.counters, 0))
  const previousSecond = Option.getOrThrow(Array.get(initial.counters, 1))
  const result = ParentBlock.update(
    initial,
    ParentMessage.GotCounterMessage({
      id: 'first',
      message: CounterMessage.UpdatedCount({ count: 7 }),
    }),
  )
  const nextFirst = Option.getOrThrow(Array.get(result.model.counters, 0))
  const nextSecond = Option.getOrThrow(Array.get(result.model.counters, 1))

  expect(nextFirst).toEqual(
    CounterEntry.make({
      id: 'first',
      counter: StoredCounterModel.make({ count: 7 }),
      label: 'First counter',
      rank: 10,
    }),
  )
  expect(nextFirst).not.toBe(previousFirst)
  expect(nextSecond).toBe(previousSecond)
  expect(Array.map(result.model.counters, ({ id }) => id)).toEqual([
    'first',
    'second',
  ])
  expect(initial.counters).toEqual([firstEntry, secondEntry])
})

it('leaves the exact parent unchanged when a wrapper key is absent', () => {
  expect(
    ParentBlock.update(
      initial,
      ParentMessage.GotCounterMessage({
        id: 'missing',
        message: CounterMessage.UpdatedCount({ count: 9 }),
      }),
    ).model,
  ).toBe(initial)
  expect(ParentBlock.expose.setCount(initial, 'missing', 9).model).toBe(initial)
})

it('keeps literal default and overridden placements', () => {
  expectTypeOf(CountersBinding.placement).toEqualTypeOf<'counters'>()
  expectTypeOf(
    AlternateCountersBinding.placement,
  ).toEqualTypeOf<'alternateCounters'>()
  expect(CountersBinding.placement).toBe('counters')
  expect(AlternateCountersBinding.placement).toBe('alternateCounters')
})

it('initializes the parent Model and lifts Commands with the wrapper key', async () => {
  const initializeCounter = ParentComposition.makeInit(() =>
    CountersBinding.init({
      key: 'created',
      args: [4],
      toParentModel: counter =>
        ParentModel.make({
          counters: [
            CounterEntry.make({
              id: 'created',
              counter,
              label: 'Created counter',
              rank: 0,
            }),
          ],
          textEntries: [],
        }),
    }),
  )
  const counterInit = initializeCounter()
  const command = Option.getOrThrow(Array.head(counterInit.commands!))
  const completed = await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const context = yield* Layer.build(
          inspectBinding(CountersBinding).EffectsLayer,
        )
        return yield* Effect.provideContext(command.effect, context)
      }),
    ),
  )

  expect(counterInit.model).toEqual(
    ParentModel.make({
      counters: [
        CounterEntry.make({
          id: 'created',
          counter: StoredCounterModel.make({ count: 4 }),
          label: 'Created counter',
          rank: 0,
        }),
      ],
      textEntries: [],
    }),
  )
  expect(command.name).toBe('counters["created"]/FinishInitialization')
  expect(completed).toEqual(
    ParentMessage.GotCounterMessage({
      id: 'created',
      message: CounterMessage.CompletedFinishInitialization({ count: 4 }),
    }),
  )
})

it('accepts equivalent child Schemas and scalar child Models', () => {
  const counterResult = ParentBlock.update(
    initial,
    ParentMessage.GotCounterMessage({
      id: 'second',
      message: CounterMessage.UpdatedCount({ count: 8 }),
    }),
  )
  const textResult = ParentBlock.update(
    initial,
    ParentMessage.GotTextMessage({
      id: 'text',
      message: TextMessage.ReplacedText({ value: 'after' }),
    }),
  )
  const nextText = Option.getOrThrow(Array.head(textResult.model.textEntries))

  expect(
    Option.getOrThrow(Array.get(counterResult.model.counters, 1)).counter,
  ).toEqual(StoredCounterModel.make({ count: 8 }))
  expect(nextText).toEqual(
    TextEntry.make({ id: 'text', text: 'after', label: 'Text entry' }),
  )
})

const OpaqueCounterEntry = Schema.declare(
  (_input): _input is typeof CounterEntry.Type => true,
  { expected: 'opaque counter entry' },
)
const PrimaryCounterEntry = Schema.Struct({
  _tag: Schema.Literal('Primary'),
  id: Schema.String,
  counter: CounterModel,
})
const SecondaryCounterEntry = Schema.Struct({
  _tag: Schema.Literal('Secondary'),
  id: Schema.String,
  counter: CounterModel,
})
const OptionalKeyEntry = Schema.Struct({
  id: Schema.optionalKey(Schema.String),
  counter: CounterModel,
})
const MissingKeyEntry = Schema.Struct({ counter: CounterModel })
const BooleanKeyEntry = Schema.Struct({
  id: Schema.Boolean,
  counter: CounterModel,
})
const OptionalChildEntry = Schema.Struct({
  id: Schema.String,
  counter: Schema.optionalKey(CounterModel),
})
const MissingChildEntry = Schema.Struct({ id: Schema.String })
const WrongChildEntry = Schema.Struct({
  id: Schema.String,
  counter: Schema.String,
})
const InvalidParentModel = Schema.Struct({
  opaqueEntries: Schema.Array(OpaqueCounterEntry),
  unionEntries: Schema.Array(
    Schema.Union([PrimaryCounterEntry, SecondaryCounterEntry]),
  ),
  optionalEntries: Schema.optionalKey(Schema.Array(CounterEntry)),
  tupleEntries: Schema.Tuple([CounterEntry]),
  mapEntries: Schema.HashMap(Schema.String, CounterEntry),
  optionalKeyEntries: Schema.Array(OptionalKeyEntry),
  missingKeyEntries: Schema.Array(MissingKeyEntry),
  booleanKeyEntries: Schema.Array(BooleanKeyEntry),
  optionalChildEntries: Schema.Array(OptionalChildEntry),
  missingChildEntries: Schema.Array(MissingChildEntry),
  wrongChildEntries: Schema.Array(WrongChildEntry),
})
const InvalidParent = define('WrappedKeyedFieldInvalidParent', {
  Model: InvalidParentModel,
  Message: ParentMessage,
})
const invalidConfig = (
  field: string,
  key: string = 'id',
  childField: string = 'counter',
) => ({
  field,
  key,
  childField,
  fromParentMessage: false,
  toParentMessage: (_id: unknown, message: typeof CounterMessage.Type) =>
    ParentMessage.GotCounterMessage({ id: 'invalid', message }),
})
const bindInvalid = (field: string, key?: string, childField?: string) =>
  Reflect.apply(InvalidParent.bindChild, undefined, [
    counterBlock,
    invalidConfig(field, key, childField),
  ])

it('rejects unsupported wrapper storage Schemas at runtime', () => {
  expect(() => bindInvalid('missingEntries')).toThrow(
    'declared parent Struct Model field',
  )
  for (const field of [
    'opaqueEntries',
    'unionEntries',
    'optionalEntries',
    'tupleEntries',
    'mapEntries',
  ]) {
    expect(() => bindInvalid(field)).toThrow(
      /required Schema\.Array of declared Struct wrappers|unambiguous declared Struct wrapper fields/,
    )
  }
})

it('rejects invalid wrapper key and child fields at runtime', () => {
  expect(() => bindInvalid('missingKeyEntries')).toThrow(
    /declared (item|wrapper) key field/,
  )
  expect(() => bindInvalid('optionalKeyEntries')).toThrow(
    'key field must be required',
  )
  expect(() => bindInvalid('booleanKeyEntries')).toThrow(
    /key field Schema must decode to a string or number/,
  )
  expect(() => bindInvalid('missingChildEntries')).toThrow(
    'declared childField',
  )
  expect(() => bindInvalid('optionalChildEntries')).toThrow(
    'childField must be required and have exactly the same decoded shape as the child Model',
  )
  expect(() => bindInvalid('wrongChildEntries')).toThrow(
    'childField must be required and have exactly the same decoded shape as the child Model',
  )

  const SameFieldEntry = Schema.Struct({ value: Schema.String })
  const SameFieldParentModel = Schema.Struct({
    values: Schema.Array(SameFieldEntry),
  })
  const SameFieldParent = define('WrappedKeyedFieldSameFieldParent', {
    Model: SameFieldParentModel,
    Message: ParentMessage,
  })

  expect(() =>
    Reflect.apply(SameFieldParent.bindChild, undefined, [
      textBlock,
      {
        field: 'values',
        key: 'value',
        childField: 'value',
        fromParentMessage: false,
        toParentMessage: (id: string, message: typeof TextMessage.Type) =>
          ParentMessage.GotTextMessage({ id, message }),
      },
    ]),
  ).toThrow('key and childField must be distinct')
})

it('rejects Schema and custom adapter conflicts at runtime', () => {
  for (const schemaField of ['Model', 'ChildModel']) {
    expect(() =>
      Reflect.apply(Parent.bindChild, undefined, [
        counterBlock,
        { ...invalidConfig('counters'), [schemaField]: CounterModel },
      ]),
    ).toThrow(`cannot supply ${schemaField}`)
  }

  for (const conflict of [
    'readAll',
    'read',
    'write',
    'writeAt',
    'presentWhen',
    'parentMessage',
  ]) {
    expect(() =>
      Reflect.apply(Parent.bindChild, undefined, [
        counterBlock,
        { ...invalidConfig('counters'), [conflict]: () => undefined },
      ]),
    ).toThrow(
      /cannot supply (field|childField)|cannot also supply custom accessors/,
    )
  }
})

const constructRuntime = (model: ParentModel): void => {
  Effect.runSync(
    Effect.scoped(
      Effect.gen(function* () {
        const runtimeScope = yield* Scope.Scope
        yield* makeCompositionRuntime<ParentModel, typeof ParentMessage.Type>({
          block: ParentBlock,
          initModel: model,
          context: Context.empty(),
          runtimeScope,
          enqueueMessage: () => {},
          crashWith: cause => Effect.failCause(cause),
          maybeSlowSubscriptionDependencies: noSlowSubscriptionDependencies,
        })
      }),
    ),
  )
}

it('rejects nonfinite and duplicate wrapper keys before runtime construction', () => {
  for (const invalidKey of [Number.NaN, Number.POSITIVE_INFINITY]) {
    const model = ParentModel.make({
      counters: [
        CounterEntry.make({
          id: 'invalid',
          counter: StoredCounterModel.make({ count: 0 }),
          label: 'Invalid',
          rank: 0,
        }),
      ],
      textEntries: [],
    })
    const entry = Option.getOrThrow(Array.head(model.counters))
    Reflect.set(entry, 'id', invalidKey)

    expect(() => constructRuntime(model)).toThrow(
      /string or finite number keys/,
    )
  }

  const duplicateModel = ParentModel.make({
    counters: [
      CounterEntry.make({
        id: 'duplicate',
        counter: StoredCounterModel.make({ count: 1 }),
        label: 'First',
        rank: 1,
      }),
      CounterEntry.make({
        id: 'duplicate',
        counter: StoredCounterModel.make({ count: 2 }),
        label: 'Second',
        rank: 2,
      }),
    ],
    textEntries: [],
  })

  expect(() => constructRuntime(duplicateModel)).toThrow('duplicate key')
})
