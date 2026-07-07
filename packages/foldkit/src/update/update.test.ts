import { Effect, HashMap, Match as M, Option } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as AsyncData from '../asyncData/index.js'
import { type Command } from '../command/index.js'
import { m } from '../message/index.js'
import {
  type Commands,
  type Return,
  type ReturnWithOutMessage,
  type Step,
  combine,
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
  { count: model.count + 1 },
  [],
]

const doubleCount: Step<TestModel, TestMessage> = model => [
  { count: model.count * 2 },
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
  { count: model.count + 1 },
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
          IncrementedCount: () => [{ count: model.count + 1 }, []],
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
