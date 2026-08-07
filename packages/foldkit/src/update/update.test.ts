import { Array, Effect, HashMap, Match as M, Number, Option } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as AsyncData from '../asyncData/index.js'
import { type Command } from '../command/index.js'
import { m } from '../message/index.js'
import { evo } from '../struct/index.js'
import {
  type Commands,
  type Return,
  type ReturnWithOutMessage,
  type Step,
  combine,
  foldChild,
  refresh,
} from './update.js'

const IncrementedCount = m('IncrementedCount')
const CompletedLoad = m('CompletedLoad')

type TestMessage = typeof IncrementedCount.Type | typeof CompletedLoad.Type

type TestModel = Readonly<{ count: number }>

const makeLoad = (name: string): Command<TestMessage> => ({
  name,
  effect: Effect.succeed(CompletedLoad()),
})

const loadNotes = makeLoad('LoadNotes')
const loadTags = makeLoad('LoadTags')
const loadFolders = makeLoad('LoadFolders')

const incrementCount: Step<TestModel, TestMessage> = model => [
  evo(model, { count: Number.increment }),
  [],
]

const doubleCount: Step<TestModel, TestMessage> = model => [
  evo(model, { count: Number.multiply(2) }),
  [],
]

const emitLoadNotes: Step<TestModel, TestMessage> = model => [
  model,
  [loadNotes],
]

const emitLoadTagsAndFolders: Step<TestModel, TestMessage> = model => [
  model,
  [loadTags, loadFolders],
]

const incrementAndEmitLoadNotes: Step<TestModel, TestMessage> = model => [
  evo(model, { count: Number.increment }),
  [loadNotes],
]

describe('combine', () => {
  it('threads the model through the steps in order', () => {
    const [incrementedThenDoubled] = combine([incrementCount, doubleCount])({
      count: 1,
    })
    expect(incrementedThenDoubled).toEqual({ count: 4 })

    const [doubledThenIncremented] = combine([doubleCount, incrementCount])({
      count: 1,
    })
    expect(doubledThenIncremented).toEqual({ count: 3 })
  })

  it('concatenates the commands of every step in step order', () => {
    const [nextModel, commands] = combine([
      emitLoadNotes,
      emitLoadTagsAndFolders,
    ])({ count: 0 })
    expect(nextModel).toEqual({ count: 0 })
    expect(commands).toEqual([loadNotes, loadTags, loadFolders])
  })

  it('returns the model unchanged with no commands for an empty step list', () => {
    const model: TestModel = { count: 5 }
    const [nextModel, commands] = combine<TestModel, TestMessage>([])(model)
    expect(nextModel).toBe(model)
    expect(commands).toEqual([])
  })

  it('behaves as the single step for a one-step list', () => {
    const model: TestModel = { count: 2 }
    expect(combine([doubleCount])(model)).toEqual(doubleCount(model))
    expect(combine([emitLoadNotes])(model)).toEqual(emitLoadNotes(model))
  })

  it('lets steps with no commands contribute nothing to the batch', () => {
    const [nextModel, commands] = combine([
      incrementCount,
      emitLoadNotes,
      doubleCount,
    ])({ count: 1 })
    expect(nextModel).toEqual({ count: 4 })
    expect(commands).toEqual([loadNotes])
  })

  it('collects a step that both edits the model and emits a command, threading the edit forward', () => {
    const [nextModel, commands] = combine([
      incrementAndEmitLoadNotes,
      emitLoadTagsAndFolders,
      doubleCount,
    ])({ count: 1 })
    expect(nextModel).toEqual({ count: 4 })
    expect(commands).toEqual([loadNotes, loadTags, loadFolders])
  })

  it('runs the steps against the model when called data-first', () => {
    const steps = [
      incrementAndEmitLoadNotes,
      emitLoadTagsAndFolders,
      doubleCount,
    ]
    const model: TestModel = { count: 1 }
    expect(combine(model, steps)).toEqual(combine(steps)(model))
  })
})

type CacheModel = Readonly<{
  notes: AsyncData.AsyncData<number, string>
  notesById: HashMap.HashMap<string, AsyncData.AsyncData<number, string>>
}>

const makeCacheModel = (
  notes: AsyncData.AsyncData<number, string>,
): CacheModel => ({
  notes,
  notesById: HashMap.empty<string, AsyncData.AsyncData<number, string>>(),
})

const refreshNotes: Step<CacheModel, TestMessage> = refresh({
  read: (model: CacheModel) => Option.some(model.notes),
  revalidate: AsyncData.revalidate,
  write: (model, notes) => ({ ...model, notes }),
  load: loadNotes,
})

const refreshOrLoadNotes: Step<CacheModel, TestMessage> = refresh({
  read: (model: CacheModel) => Option.some(model.notes),
  revalidate: AsyncData.revalidateOrLoad,
  write: (model, notes) => ({ ...model, notes }),
  load: loadNotes,
})

const refreshNoteById = (noteId: string): Step<CacheModel, TestMessage> =>
  refresh({
    read: (model: CacheModel) => HashMap.get(model.notesById, noteId),
    revalidate: AsyncData.revalidate,
    write: (model, note) => ({
      ...model,
      notesById: HashMap.set(model.notesById, noteId, note),
    }),
    load: loadNotes,
  })

describe('refresh', () => {
  it('is a no-op when read misses the keyed cache', () => {
    const model = makeCacheModel(AsyncData.Success({ data: 1 }))
    const [nextModel, commands] = refreshNoteById('missing')(model)
    expect(nextModel).toBe(model)
    expect(commands).toEqual([])
  })

  it('is a no-op when revalidate declines the states without data', () => {
    const statesWithoutData: ReadonlyArray<
      AsyncData.AsyncData<number, string>
    > = [
      AsyncData.Idle(),
      AsyncData.Loading(),
      AsyncData.Failure({ error: 'boom' }),
    ]

    for (const state of statesWithoutData) {
      const model = makeCacheModel(state)
      const [nextModel, commands] = refreshNotes(model)
      expect(nextModel).toBe(model)
      expect(commands).toEqual([])
    }
  })

  it('writes Refreshing carrying the previous data and emits exactly the load Command for Success and Stale', () => {
    const loadedStates: ReadonlyArray<AsyncData.AsyncData<number, string>> = [
      AsyncData.Success({ data: 1 }),
      AsyncData.Stale({ error: 'boom', data: 1 }),
    ]

    for (const state of loadedStates) {
      const [nextModel, commands] = refreshNotes(makeCacheModel(state))
      expect(nextModel.notes).toEqual(AsyncData.Refreshing({ data: 1 }))
      expect(commands).toEqual([loadNotes])
    }
  })

  it('revalidates a present keyed entry in place', () => {
    const entries: ReadonlyArray<
      readonly [string, AsyncData.AsyncData<number, string>]
    > = [['note:1', AsyncData.Success({ data: 1 })]]
    const model: CacheModel = {
      notes: AsyncData.Idle(),
      notesById: HashMap.fromIterable(entries),
    }

    const [nextModel, commands] = refreshNoteById('note:1')(model)

    expect(HashMap.get(nextModel.notesById, 'note:1')).toEqual(
      Option.some(AsyncData.Refreshing({ data: 1 })),
    )
    expect(nextModel.notes).toBe(model.notes)
    expect(commands).toEqual([loadNotes])
  })

  it('loads a cold cache on entry when revalidate is revalidateOrLoad', () => {
    const model = makeCacheModel(AsyncData.Idle())
    const [nextModel, commands] = refreshOrLoadNotes(model)
    expect(nextModel.notes).toEqual(AsyncData.Loading())
    expect(commands).toEqual([loadNotes])
  })
})

type CounterModel = Readonly<{ value: number }>

const BumpedValue = m('BumpedValue')
const CompletedLoadCounter = m('CompletedLoadCounter')
type CounterMessage = typeof BumpedValue.Type | typeof CompletedLoadCounter.Type

const loadCounter: Command<CounterMessage> = {
  name: 'LoadCounter',
  effect: Effect.succeed(CompletedLoadCounter()),
}

const counterUpdate = (
  model: CounterModel,
  message: CounterMessage,
): Return<CounterModel, CounterMessage> =>
  M.value(message).pipe(
    M.withReturnType<Return<CounterModel, CounterMessage>>(),
    M.tagsExhaustive({
      BumpedValue: () => [evo(model, { value: Number.increment }), []],
      CompletedLoadCounter: () => [model, [loadCounter]],
    }),
  )

type ClosedCounter = Readonly<{ _tag: 'ClosedCounter' }>
const ClosedCounter = (): ClosedCounter => ({ _tag: 'ClosedCounter' })

const counterUpdateWithOutMessage = (
  model: CounterModel,
  message: CounterMessage,
): ReturnWithOutMessage<CounterModel, CounterMessage, ClosedCounter> =>
  M.value(message).pipe(
    M.withReturnType<
      ReturnWithOutMessage<CounterModel, CounterMessage, ClosedCounter>
    >(),
    M.tagsExhaustive({
      BumpedValue: () => [
        evo(model, { value: Number.increment }),
        [],
        Option.none(),
      ],
      CompletedLoadCounter: () => [
        evo(model, { value: Number.multiply(2) }),
        [loadCounter],
        Option.some(ClosedCounter()),
      ],
    }),
  )

type GotCounterMessage = Readonly<{
  _tag: 'GotCounterMessage'
  message: CounterMessage
}>
const GotCounterMessage = (message: CounterMessage): GotCounterMessage => ({
  _tag: 'GotCounterMessage',
  message,
})

type NotifiedCounterClosed = Readonly<{ _tag: 'NotifiedCounterClosed' }>
const NotifiedCounterClosed = (): NotifiedCounterClosed => ({
  _tag: 'NotifiedCounterClosed',
})

type ParentMessage = GotCounterMessage | NotifiedCounterClosed

type ParentModel = Readonly<{
  counter: CounterModel
  isCounterClosed: boolean
  closedAtValue: number
}>

const parentModel: ParentModel = {
  counter: { value: 3 },
  isCounterClosed: false,
  closedAtValue: 0,
}

const notifyCounterClosed: Command<ParentMessage> = {
  name: 'NotifyCounterClosed',
  effect: Effect.succeed(NotifiedCounterClosed()),
}

const foldCounter = foldChild({
  update: counterUpdate,
  read: (model: ParentModel) => Option.some(model.counter),
  write: (model, nextCounter) => ({ ...model, counter: nextCounter }),
  toParentMessage: GotCounterMessage,
})

const foldClosableCounter = foldChild({
  update: counterUpdateWithOutMessage,
  read: (model: ParentModel) => Option.some(model.counter),
  write: (model, nextCounter) => ({ ...model, counter: nextCounter }),
  toParentMessage: GotCounterMessage,
  foldOutMessage: () => model => [
    {
      ...model,
      isCounterClosed: true,
      closedAtValue: model.counter.value,
    },
    [notifyCounterClosed],
  ],
})

type GatedParentModel = Readonly<{
  maybeCounter: Option.Option<CounterModel>
}>

const foldGatedCounter = foldChild({
  update: counterUpdate,
  read: (model: GatedParentModel) => model.maybeCounter,
  write: (model, nextCounter) => ({
    ...model,
    maybeCounter: Option.some(nextCounter),
  }),
  toParentMessage: GotCounterMessage,
})

describe('foldChild', () => {
  it('writes the updated child back into the parent Model', () => {
    const [nextModel, commands] = foldCounter(BumpedValue())(parentModel)
    expect(nextModel.counter).toEqual({ value: 4 })
    expect(nextModel.isCounterClosed).toBe(false)
    expect(commands).toEqual([])
  })

  it('lifts the child Commands through toParentMessage, preserving name', () => {
    const [nextModel, commands] = foldCounter(CompletedLoadCounter())(
      parentModel,
    )
    expect(nextModel.counter).toBe(parentModel.counter)

    const maybeCommand = Array.head(commands)
    expect(Option.isSome(maybeCommand)).toBe(true)
    if (Option.isSome(maybeCommand)) {
      expect(maybeCommand.value.name).toBe('LoadCounter')
      expect(Effect.runSync(maybeCommand.value.effect)).toEqual(
        GotCounterMessage(CompletedLoadCounter()),
      )
    }
  })

  it('is a no-op when read finds no mounted child', () => {
    const model: GatedParentModel = { maybeCounter: Option.none() }
    const [nextModel, commands] = foldGatedCounter(BumpedValue())(model)
    expect(nextModel).toBe(model)
    expect(commands).toEqual([])
  })

  it('folds a mounted gated child and writes it back as Some', () => {
    const model: GatedParentModel = {
      maybeCounter: Option.some({ value: 7 }),
    }
    const [nextModel] = foldGatedCounter(BumpedValue())(model)
    expect(nextModel.maybeCounter).toEqual(Option.some({ value: 8 }))
  })

  it('skips foldOutMessage when the child raises no OutMessage', () => {
    const [nextModel, commands] =
      foldClosableCounter(BumpedValue())(parentModel)
    expect(nextModel.counter).toEqual({ value: 4 })
    expect(nextModel.isCounterClosed).toBe(false)
    expect(commands).toEqual([])
  })

  it('runs foldOutMessage against the Model with the child already written', () => {
    const [nextModel] = foldClosableCounter(CompletedLoadCounter())(parentModel)
    expect(nextModel.counter).toEqual({ value: 6 })
    expect(nextModel.isCounterClosed).toBe(true)
    expect(nextModel.closedAtValue).toBe(6)
  })

  it('appends the OutMessage Step Commands after the mapped child Commands', () => {
    const [, commands] = foldClosableCounter(CompletedLoadCounter())(
      parentModel,
    )
    expect(commands.map(command => command.name)).toEqual([
      'LoadCounter',
      'NotifyCounterClosed',
    ])
  })

  it('folds an inform-style entry point whose input is not the child Message', () => {
    const informPressedKey = (
      counter: CounterModel,
      key: string,
    ): Return<CounterModel, CounterMessage> =>
      key === 'ArrowUp' ? counterUpdate(counter, BumpedValue()) : [counter, []]

    const foldCounterKeyPress = foldChild({
      update: informPressedKey,
      read: (model: ParentModel) => Option.some(model.counter),
      write: (model, nextCounter) => ({ ...model, counter: nextCounter }),
      toParentMessage: GotCounterMessage,
    })

    expectTypeOf(foldCounterKeyPress).toEqualTypeOf<
      (input: string) => Step<ParentModel, GotCounterMessage>
    >()

    const [bumpedModel] = foldCounterKeyPress('ArrowUp')(parentModel)
    expect(bumpedModel.counter).toEqual({ value: 4 })

    const [unchangedModel] = foldCounterKeyPress('Escape')(parentModel)
    expect(unchangedModel.counter).toBe(parentModel.counter)
  })

  it('composes with combine as an ordinary Step', () => {
    const closeThenBump = combine([
      foldClosableCounter(CompletedLoadCounter()),
      foldCounter(BumpedValue()),
    ])

    const [nextModel, commands] = closeThenBump(parentModel)
    expect(nextModel.counter).toEqual({ value: 7 })
    expect(nextModel.isCounterClosed).toBe(true)
    expect(commands.map(command => command.name)).toEqual([
      'LoadCounter',
      'NotifyCounterClosed',
    ])
  })
})

describe('types', () => {
  type TestServices = Readonly<{ baseUrl: string }>
  type TestOutMessage = Readonly<{ _tag: 'ClosedEditor' }>

  const baseModel: TestModel = { count: 0 }

  it('Return pairs the Model with the Commands to run', () => {
    expectTypeOf<Return<TestModel, TestMessage>>().toEqualTypeOf<
      readonly [TestModel, Commands<TestMessage>]
    >()
  })

  it('R defaults to never and threads through to the Commands', () => {
    expectTypeOf<Return<TestModel, TestMessage>>().toEqualTypeOf<
      Return<TestModel, TestMessage, never>
    >()

    const toReturnWithServices = (
      command: Command<TestMessage, never, TestServices>,
    ): Return<TestModel, TestMessage, TestServices> => [baseModel, [command]]

    expectTypeOf(toReturnWithServices)
      .parameter(0)
      .toEqualTypeOf<Command<TestMessage, never, TestServices>>()
  })

  it('ReturnWithOutMessage carries an Option of the OutMessage as the third element', () => {
    expectTypeOf<
      ReturnWithOutMessage<TestModel, TestMessage, TestOutMessage>
    >().toEqualTypeOf<
      readonly [TestModel, Commands<TestMessage>, Option.Option<TestOutMessage>]
    >()
  })

  it('Step maps a Model to a Return over the same Model', () => {
    expectTypeOf<Step<TestModel, TestMessage>>().toEqualTypeOf<
      (model: TestModel) => Return<TestModel, TestMessage>
    >()
  })

  it('combine infers Model and Message from the steps array', () => {
    const combined = combine([incrementCount, emitLoadNotes])
    expectTypeOf(combined).toEqualTypeOf<Step<TestModel, TestMessage>>()
  })

  it('combine data-first returns a Return of the steps Model and Message', () => {
    expectTypeOf(
      combine(baseModel, [incrementCount, emitLoadNotes]),
    ).toEqualTypeOf<Return<TestModel, TestMessage>>()
  })

  it('foldChild returns a message-to-Step function whose Return slots into the parent update', () => {
    expectTypeOf(foldCounter).toEqualTypeOf<
      (message: CounterMessage) => Step<ParentModel, GotCounterMessage>
    >()

    const handleGotCounterMessage = (
      model: ParentModel,
      message: CounterMessage,
    ): Return<ParentModel, ParentMessage> => foldCounter(message)(model)
    const handleGotClosableCounterMessage = (
      model: ParentModel,
      message: CounterMessage,
    ): Return<ParentModel, ParentMessage> => foldClosableCounter(message)(model)

    expectTypeOf(handleGotCounterMessage).returns.toEqualTypeOf<
      Return<ParentModel, ParentMessage>
    >()
    expectTypeOf(handleGotClosableCounterMessage).returns.toEqualTypeOf<
      Return<ParentModel, ParentMessage>
    >()
  })

  it('foldChild rejects an OutMessage child without foldOutMessage', () => {
    // @ts-expect-error a ReturnWithOutMessage child update requires foldOutMessage
    foldChild({
      update: counterUpdateWithOutMessage,
      read: (model: ParentModel) => Option.some(model.counter),
      write: (model: ParentModel, nextCounter: CounterModel) => ({
        ...model,
        counter: nextCounter,
      }),
      toParentMessage: GotCounterMessage,
    })
  })

  it('compiles the app-local withReturnType idiom over a two-variant message union', () => {
    // NOTE: This test is the factory-cut compile proof. Foldkit does not
    // export a Match factory for update returns; applications pin the alias
    // themselves with the two lines below. If M.tagsExhaustive ever stops
    // reducing its Unify return type to UpdateReturn under the pinned
    // effect version, this test is the canary.
    type UpdateReturn = Return<TestModel, TestMessage>
    const withUpdateReturn = M.withReturnType<UpdateReturn>()

    const update = (model: TestModel, message: TestMessage): UpdateReturn =>
      M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
          IncrementedCount: () => [evo(model, { count: Number.increment }), []],
          CompletedLoad: () => [model, []],
        }),
      )

    expectTypeOf(update).returns.toEqualTypeOf<UpdateReturn>()

    const [incrementedModel, incrementedCommands] = update(
      { count: 1 },
      IncrementedCount(),
    )
    expect(incrementedModel).toEqual({ count: 2 })
    expect(incrementedCommands).toEqual([])

    const acknowledgedModel: TestModel = { count: 4 }
    const [unchangedModel, unchangedCommands] = update(
      acknowledgedModel,
      CompletedLoad(),
    )
    expect(unchangedModel).toBe(acknowledgedModel)
    expect(unchangedCommands).toEqual([])
  })
})
