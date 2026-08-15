import { Array, Effect, HashMap, Match as M, Number, Option } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as AsyncData from '../asyncData/index.js'
import { type Command } from '../command/index.js'
import { m } from '../message/index.js'
import { evo } from '../struct/index.js'
import * as Story from '../test/story.js'
import {
  type Commands,
  type Fold,
  type FoldContext,
  type FoldWithOutMessage,
  type Return,
  type ReturnWithOutMessage,
  type Step,
  combine,
  foldChild,
  foldChildStep,
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
const CompletedSaveCount = m('CompletedSaveCount')
type CounterMessage = typeof BumpedValue.Type | typeof CompletedSaveCount.Type

const saveCount: Command<CounterMessage> = {
  name: 'SaveCount',
  effect: Effect.succeed(CompletedSaveCount()),
}

const counterUpdate = (
  model: CounterModel,
  message: CounterMessage,
): Return<CounterModel, CounterMessage> =>
  M.value(message).pipe(
    M.withReturnType<Return<CounterModel, CounterMessage>>(),
    M.tagsExhaustive({
      BumpedValue: () => [evo(model, { value: Number.increment }), [saveCount]],
      CompletedSaveCount: () => [model, []],
    }),
  )

type ChangedValue = Readonly<{ _tag: 'ChangedValue' }>
const ChangedValue = (): ChangedValue => ({ _tag: 'ChangedValue' })

const counterUpdateWithOutMessage = (
  model: CounterModel,
  message: CounterMessage,
): ReturnWithOutMessage<CounterModel, CounterMessage, ChangedValue> =>
  M.value(message).pipe(
    M.withReturnType<
      ReturnWithOutMessage<CounterModel, CounterMessage, ChangedValue>
    >(),
    M.tagsExhaustive({
      BumpedValue: () => [
        evo(model, { value: Number.increment }),
        [saveCount],
        Option.some(ChangedValue()),
      ],
      CompletedSaveCount: () => [model, [], Option.none()],
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

type NotifiedValueChanged = Readonly<{ _tag: 'NotifiedValueChanged' }>
const NotifiedValueChanged = (): NotifiedValueChanged => ({
  _tag: 'NotifiedValueChanged',
})

type DashboardMessage = GotCounterMessage | NotifiedValueChanged

type DashboardModel = Readonly<{
  counter: CounterModel
  lastReportedValue: number
}>

const dashboardModel: DashboardModel = {
  counter: { value: 3 },
  lastReportedValue: 0,
}

const notifyValueChanged: Command<DashboardMessage> = {
  name: 'NotifyValueChanged',
  effect: Effect.succeed(NotifiedValueChanged()),
}

const foldCounter = foldChild({
  update: counterUpdate,
  read: (model: DashboardModel) => Option.some(model.counter),
  write: (model, nextCounter) => ({ ...model, counter: nextCounter }),
  toParentMessage: GotCounterMessage,
})

const foldReportingCounter = foldChild({
  update: counterUpdateWithOutMessage,
  read: (model: DashboardModel) => Option.some(model.counter),
  write: (model, nextCounter) => ({ ...model, counter: nextCounter }),
  toParentMessage: GotCounterMessage,
  foldOutMessage: () => model => [
    { ...model, lastReportedValue: model.counter.value },
    [notifyValueChanged],
  ],
})

type GatedDashboardModel = Readonly<{
  maybeCounter: Option.Option<CounterModel>
}>

const foldGatedCounter = foldChild({
  update: counterUpdate,
  read: (model: GatedDashboardModel) => model.maybeCounter,
  write: (model, nextCounter) => ({
    ...model,
    maybeCounter: Option.some(nextCounter),
  }),
  toParentMessage: GotCounterMessage,
})

describe('foldChild', () => {
  it('writes the updated child back into the parent Model', () => {
    const [nextModel, commands] = foldCounter(dashboardModel, BumpedValue())
    expect(nextModel.counter).toEqual({ value: 4 })
    expect(nextModel.lastReportedValue).toBe(0)
    expect(commands.map(command => command.name)).toEqual(['SaveCount'])
  })

  it('lifts the child Commands through toParentMessage, preserving name', () => {
    const [, commands] = foldCounter(dashboardModel, BumpedValue())

    const maybeCommand = Array.head(commands)
    expect(Option.isSome(maybeCommand)).toBe(true)
    if (Option.isSome(maybeCommand)) {
      expect(maybeCommand.value.name).toBe('SaveCount')
      expect(Effect.runSync(maybeCommand.value.effect)).toEqual(
        GotCounterMessage(CompletedSaveCount()),
      )
    }
  })

  it('is a no-op when read finds no mounted child', () => {
    const model: GatedDashboardModel = { maybeCounter: Option.none() }
    const [nextModel, commands] = foldGatedCounter(model, BumpedValue())
    expect(nextModel).toBe(model)
    expect(commands).toEqual([])
  })

  it('folds a mounted gated child and writes it back as Some', () => {
    const model: GatedDashboardModel = {
      maybeCounter: Option.some({ value: 7 }),
    }
    const [nextModel] = foldGatedCounter(model, BumpedValue())
    expect(nextModel.maybeCounter).toEqual(Option.some({ value: 8 }))
  })

  it('skips foldOutMessage when the child emits no OutMessage', () => {
    const [nextModel, commands] = foldReportingCounter(
      dashboardModel,
      CompletedSaveCount(),
    )
    expect(nextModel.counter).toBe(dashboardModel.counter)
    expect(nextModel.lastReportedValue).toBe(0)
    expect(commands).toEqual([])
  })

  it('runs foldOutMessage against the Model with the child already written', () => {
    const [nextModel] = foldReportingCounter(dashboardModel, BumpedValue())
    expect(nextModel.counter).toEqual({ value: 4 })
    expect(nextModel.lastReportedValue).toBe(4)
  })

  it('appends the OutMessage Step Commands after the mapped child Commands', () => {
    const [, commands] = foldReportingCounter(dashboardModel, BumpedValue())
    expect(commands.map(command => command.name)).toEqual([
      'SaveCount',
      'NotifyValueChanged',
    ])
  })

  it('folds an entry point whose input is not the child Message', () => {
    const informPressedKey = (
      counter: CounterModel,
      key: string,
    ): Return<CounterModel, CounterMessage> =>
      key === 'ArrowUp' ? counterUpdate(counter, BumpedValue()) : [counter, []]

    const foldCounterKeyPress = foldChild({
      update: informPressedKey,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => ({ ...model, counter: nextCounter }),
      toParentMessage: GotCounterMessage,
    })

    expectTypeOf(foldCounterKeyPress).toEqualTypeOf<
      Fold<DashboardModel, GotCounterMessage, string>
    >()

    const [bumpedModel] = foldCounterKeyPress(dashboardModel, 'ArrowUp')
    expect(bumpedModel.counter).toEqual({ value: 4 })

    const [unchangedModel] = foldCounterKeyPress(dashboardModel, 'Escape')
    expect(unchangedModel.counter).toBe(dashboardModel.counter)
  })

  it('lifts the child OutMessage into a Submodel parent through toParentOutMessage', () => {
    type ReportedValue = Readonly<{ _tag: 'ReportedValue' }>
    const ReportedValue = (): ReportedValue => ({ _tag: 'ReportedValue' })

    const foldCounterInSubmodel = foldChild({
      update: counterUpdateWithOutMessage,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => ({ ...model, counter: nextCounter }),
      toParentMessage: GotCounterMessage,
      toParentOutMessage: () => Option.some(ReportedValue()),
    })

    expectTypeOf(foldCounterInSubmodel).toEqualTypeOf<
      FoldWithOutMessage<
        DashboardModel,
        GotCounterMessage,
        CounterMessage,
        ReportedValue
      >
    >()

    const [bumpedModel, bumpedCommands, maybeBumpedOutMessage] =
      foldCounterInSubmodel(dashboardModel, BumpedValue())
    expect(bumpedModel.counter).toEqual({ value: 4 })
    expect(bumpedCommands.map(command => command.name)).toEqual(['SaveCount'])
    expect(maybeBumpedOutMessage).toEqual(Option.some(ReportedValue()))

    const [, , maybeSavedOutMessage] = foldCounterInSubmodel(
      dashboardModel,
      CompletedSaveCount(),
    )
    expect(maybeSavedOutMessage).toEqual(Option.none())
  })

  it('pairs toParentOutMessage with foldOutMessage for a Submodel parent that also updates state', () => {
    const foldReportingCounterInSubmodel = foldChild({
      update: counterUpdateWithOutMessage,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => ({ ...model, counter: nextCounter }),
      toParentMessage: GotCounterMessage,
      toParentOutMessage: () => Option.none(),
      foldOutMessage: () => model => [
        { ...model, lastReportedValue: model.counter.value },
        [notifyValueChanged],
      ],
    })

    const [nextModel, commands, maybeOutMessage] =
      foldReportingCounterInSubmodel(dashboardModel, BumpedValue())
    expect(nextModel.lastReportedValue).toBe(4)
    expect(commands.map(command => command.name)).toEqual([
      'SaveCount',
      'NotifyValueChanged',
    ])
    expect(maybeOutMessage).toEqual(Option.none())
  })

  it('runs the same fold data-first and data-last', () => {
    const [dataFirstModel, dataFirstCommands] = foldReportingCounter(
      dashboardModel,
      BumpedValue(),
    )
    const [dataLastModel, dataLastCommands] =
      foldReportingCounter(BumpedValue())(dashboardModel)

    expect(dataFirstModel).toEqual(dataLastModel)
    expect(dataFirstCommands.map(command => command.name)).toEqual(
      dataLastCommands.map(command => command.name),
    )
  })

  it('composes data-last with combine as an ordinary Step', () => {
    const reportThenBump = combine([
      foldReportingCounter(BumpedValue()),
      foldCounter(BumpedValue()),
    ])

    const [nextModel, commands] = reportThenBump(dashboardModel)
    expect(nextModel.counter).toEqual({ value: 5 })
    expect(nextModel.lastReportedValue).toBe(4)
    expect(commands.map(command => command.name)).toEqual([
      'SaveCount',
      'NotifyValueChanged',
      'SaveCount',
    ])
  })
})

const settleCounter: Command<CounterMessage> = {
  name: 'SettleCounter',
  effect: Effect.succeed(BumpedValue()),
}

const trimCounter: Command<CounterMessage> = {
  name: 'TrimCounter',
  effect: Effect.succeed(CompletedSaveCount()),
}

const foldSettlingCounterOutMessage: (
  outMessage: ChangedValue,
  context: FoldContext<CounterMessage, DashboardMessage>,
) => Step<DashboardModel, DashboardMessage> = (outMessage, { liftCommand }) =>
  M.value(outMessage).pipe(
    M.withReturnType<Step<DashboardModel, DashboardMessage>>(),
    M.tagsExhaustive({
      ChangedValue: () => model => [model, [liftCommand(settleCounter)]],
    }),
  )

const foldSettlingCounter = foldChild({
  update: counterUpdateWithOutMessage,
  read: (model: DashboardModel) => Option.some(model.counter),
  write: (model, nextCounter) => ({ ...model, counter: nextCounter }),
  toParentMessage: GotCounterMessage,
  foldOutMessage: foldSettlingCounterOutMessage,
})

const dashboardUpdate = (
  model: DashboardModel,
  message: DashboardMessage,
): Return<DashboardModel, DashboardMessage> =>
  M.value(message).pipe(
    M.withReturnType<Return<DashboardModel, DashboardMessage>>(),
    M.tagsExhaustive({
      GotCounterMessage: ({ message: counterMessage }) =>
        foldSettlingCounter(model, counterMessage),
      NotifiedValueChanged: () => [model, []],
    }),
  )

describe('foldChild fold context', () => {
  it('lifts a Command the OutMessage Step returns through toParentMessage', () => {
    const [, commands] = foldSettlingCounter(dashboardModel, BumpedValue())

    expect(commands.map(command => command.name)).toEqual([
      'SaveCount',
      'SettleCounter',
    ])

    const maybeSettle = Array.last(commands)
    expect(Option.isSome(maybeSettle)).toBe(true)
    if (Option.isSome(maybeSettle)) {
      expect(Effect.runSync(maybeSettle.value.effect)).toEqual(
        GotCounterMessage(BumpedValue()),
      )
    }
  })

  it('lifts a list of Commands through liftCommands', () => {
    const foldTrimmingCounter = foldChild({
      update: counterUpdateWithOutMessage,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => ({ ...model, counter: nextCounter }),
      toParentMessage: GotCounterMessage,
      foldOutMessage:
        (_outMessage, { liftCommands }) =>
        model => [model, liftCommands([settleCounter, trimCounter])],
    })

    const [, commands] = foldTrimmingCounter(dashboardModel, BumpedValue())

    expect(commands.map(command => command.name)).toEqual([
      'SaveCount',
      'SettleCounter',
      'TrimCounter',
    ])
    expect(commands.map(command => Effect.runSync(command.effect))).toEqual([
      GotCounterMessage(CompletedSaveCount()),
      GotCounterMessage(BumpedValue()),
      GotCounterMessage(CompletedSaveCount()),
    ])
  })

  it('records the mapping chain so a Story resolves with the child result', () => {
    Story.story(
      dashboardUpdate,
      Story.given(dashboardModel),
      Story.message(GotCounterMessage(BumpedValue())),
      Story.model(model => {
        expect(model.counter.value).toBe(4)
      }),
      Story.Command.resolve(settleCounter, BumpedValue()),
      Story.model(model => {
        expect(model.counter.value).toBe(5)
      }),
      Story.Command.resolveAll(
        [saveCount, CompletedSaveCount()],
        [saveCount, CompletedSaveCount()],
        [settleCounter, CompletedSaveCount()],
      ),
    )
  })

  it('keeps a one-parameter foldOutMessage assignable', () => {
    const foldReportedValueOutMessage: (
      outMessage: ChangedValue,
    ) => Step<DashboardModel, DashboardMessage> = M.type<ChangedValue>().pipe(
      M.withReturnType<Step<DashboardModel, DashboardMessage>>(),
      M.tagsExhaustive({
        ChangedValue: () => model => [
          { ...model, lastReportedValue: model.counter.value },
          [],
        ],
      }),
    )

    const foldReportedValue = foldChild({
      update: counterUpdateWithOutMessage,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => ({ ...model, counter: nextCounter }),
      toParentMessage: GotCounterMessage,
      foldOutMessage: foldReportedValueOutMessage,
    })

    expectTypeOf(foldReportedValue).toEqualTypeOf<
      Fold<DashboardModel, DashboardMessage, CounterMessage>
    >()

    const [nextModel, commands] = foldReportedValue(
      dashboardModel,
      BumpedValue(),
    )
    expect(nextModel.lastReportedValue).toBe(4)
    expect(commands.map(command => command.name)).toEqual(['SaveCount'])
  })
})

const resetCounter = (
  model: CounterModel,
): Return<CounterModel, CounterMessage> => [{ ...model, value: 0 }, [saveCount]]

const resetCounterWithOutMessage = (
  model: CounterModel,
): ReturnWithOutMessage<CounterModel, CounterMessage, ChangedValue> => [
  { ...model, value: 0 },
  [saveCount],
  Option.some(ChangedValue()),
]

describe('foldChildStep', () => {
  const foldCounterReset = foldChildStep({
    update: resetCounter,
    read: (model: DashboardModel) => Option.some(model.counter),
    write: (model, nextCounter) => ({ ...model, counter: nextCounter }),
    toParentMessage: GotCounterMessage,
  })

  it('folds an entry point that takes nothing but the child Model', () => {
    const [nextModel, commands] = foldCounterReset(dashboardModel)

    expect(nextModel.counter).toEqual({ value: 0 })
    expect(commands.map(command => command.name)).toEqual(['SaveCount'])
  })

  it('is an ordinary Step that composes with combine', () => {
    expectTypeOf(foldCounterReset).toEqualTypeOf<
      Step<DashboardModel, GotCounterMessage>
    >()

    const [nextModel, commands] = combine(dashboardModel, [
      foldCounter(BumpedValue()),
      foldCounterReset,
    ])

    expect(nextModel.counter).toEqual({ value: 0 })
    expect(commands.map(command => command.name)).toEqual([
      'SaveCount',
      'SaveCount',
    ])
  })

  it('is a no-op when read finds no mounted child', () => {
    const foldGatedCounterReset = foldChildStep({
      update: resetCounter,
      read: (model: GatedDashboardModel) => model.maybeCounter,
      write: (model, nextCounter) => ({
        ...model,
        maybeCounter: Option.some(nextCounter),
      }),
      toParentMessage: GotCounterMessage,
    })

    const model: GatedDashboardModel = { maybeCounter: Option.none() }
    const [nextModel, commands] = foldGatedCounterReset(model)

    expect(nextModel).toBe(model)
    expect(commands).toEqual([])
  })

  it('runs foldOutMessage against the Model with the child already written', () => {
    const foldReportingCounterReset = foldChildStep({
      update: (model: CounterModel) => [
        { ...model, value: 0 },
        [saveCount],
        Option.some(ChangedValue()),
      ],
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => ({ ...model, counter: nextCounter }),
      toParentMessage: GotCounterMessage,
      foldOutMessage: () => model => [
        { ...model, lastReportedValue: model.counter.value },
        [notifyValueChanged],
      ],
    })

    const [nextModel, commands] = foldReportingCounterReset(dashboardModel)

    expect(nextModel.counter).toEqual({ value: 0 })
    expect(nextModel.lastReportedValue).toBe(0)
    expect(commands.map(command => command.name)).toEqual([
      'SaveCount',
      'NotifyValueChanged',
    ])
  })

  it('lifts a Command the OutMessage Step returns through toParentMessage', () => {
    const foldSettlingCounterReset = foldChildStep({
      update: resetCounterWithOutMessage,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => ({ ...model, counter: nextCounter }),
      toParentMessage: GotCounterMessage,
      foldOutMessage: foldSettlingCounterOutMessage,
    })

    const [, commands] = foldSettlingCounterReset(dashboardModel)

    expect(commands.map(command => command.name)).toEqual([
      'SaveCount',
      'SettleCounter',
    ])

    const maybeSettle = Array.last(commands)
    expect(Option.isSome(maybeSettle)).toBe(true)
    if (Option.isSome(maybeSettle)) {
      expect(Effect.runSync(maybeSettle.value.effect)).toEqual(
        GotCounterMessage(BumpedValue()),
      )
    }
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

  it('foldChild returns a dual Fold whose Return slots into the parent update', () => {
    expectTypeOf(foldCounter).toEqualTypeOf<
      Fold<DashboardModel, GotCounterMessage, CounterMessage>
    >()

    const handleGotCounterMessage = (
      model: DashboardModel,
      message: CounterMessage,
    ): Return<DashboardModel, DashboardMessage> => foldCounter(model, message)
    const handleGotReportingCounterMessage = (
      model: DashboardModel,
      message: CounterMessage,
    ): Return<DashboardModel, DashboardMessage> =>
      foldReportingCounter(model, message)

    expectTypeOf(handleGotCounterMessage).returns.toEqualTypeOf<
      Return<DashboardModel, DashboardMessage>
    >()
    expectTypeOf(handleGotReportingCounterMessage).returns.toEqualTypeOf<
      Return<DashboardModel, DashboardMessage>
    >()
  })

  it('foldChild rejects an OutMessage child without foldOutMessage', () => {
    // @ts-expect-error a ReturnWithOutMessage child update requires foldOutMessage
    foldChild({
      update: counterUpdateWithOutMessage,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model: DashboardModel, nextCounter: CounterModel) => ({
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
