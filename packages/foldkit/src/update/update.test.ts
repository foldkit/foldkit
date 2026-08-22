import { Array, Effect, HashMap, Match as M, Number, Option } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as AsyncData from '../asyncData/index.js'
import { type Command } from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
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
  type StepWithOutMessage,
  combine,
  foldChild,
  foldChildStep,
  refresh,
} from './update.js'

const Message = defineMessageUnion({
  IncrementedCount: {},
  CompletedLoad: {},
  BumpedValue: {},
  CompletedSaveCount: {},
})

type TestMessage =
  | typeof Message.IncrementedCount.Type
  | typeof Message.CompletedLoad.Type

type TestModel = Readonly<{ count: number }>

const makeLoad = (name: string): Command<TestMessage> => ({
  name,
  effect: Effect.succeed(Message.CompletedLoad()),
})

const loadNotes = makeLoad('LoadNotes')
const loadTags = makeLoad('LoadTags')
const loadFolders = makeLoad('LoadFolders')

const incrementCount: Step<TestModel, TestMessage> = model => ({
  model: evo(model, { count: Number.increment }),
})

const doubleCount: Step<TestModel, TestMessage> = model => ({
  model: evo(model, { count: Number.multiply(2) }),
})

const emitLoadNotes: Step<TestModel, TestMessage> = model => ({
  model,
  commands: [loadNotes],
})

const emitLoadTagsAndFolders: Step<TestModel, TestMessage> = model => ({
  model,
  commands: [loadTags, loadFolders],
})

const incrementAndEmitLoadNotes: Step<TestModel, TestMessage> = model => ({
  model: evo(model, { count: Number.increment }),
  commands: [loadNotes],
})

describe('combine', () => {
  it('threads the model through the steps in order', () => {
    const updateResult = combine([incrementCount, doubleCount])({
      count: 1,
    })
    expect(updateResult.model).toEqual({ count: 4 })

    const doubleThenIncrement = combine([doubleCount, incrementCount])({
      count: 1,
    })
    expect(doubleThenIncrement.model).toEqual({ count: 3 })
  })

  it('concatenates the commands of every step in step order', () => {
    const combinedCommands = combine([emitLoadNotes, emitLoadTagsAndFolders])({
      count: 0,
    })
    expect(combinedCommands.model).toEqual({ count: 0 })
    expect(combinedCommands.commands ?? []).toEqual([
      loadNotes,
      loadTags,
      loadFolders,
    ])
  })

  it('returns the model unchanged with no commands for an empty step list', () => {
    const model: TestModel = { count: 5 }
    const emptyCombination = combine<TestModel, TestMessage>([])(model)
    expect(emptyCombination.model).toBe(model)
    expect(emptyCombination.commands ?? []).toEqual([])
  })

  it('behaves as the single step for a one-step list', () => {
    const model: TestModel = { count: 2 }
    expect(combine([doubleCount])(model)).toEqual(doubleCount(model))
    expect(combine([emitLoadNotes])(model)).toEqual(emitLoadNotes(model))
  })

  it('lets steps with no commands contribute nothing to the batch', () => {
    const mixedCommands = combine([incrementCount, emitLoadNotes, doubleCount])(
      { count: 1 },
    )
    expect(mixedCommands.model).toEqual({ count: 4 })
    expect(mixedCommands.commands ?? []).toEqual([loadNotes])
  })

  it('collects a step that both edits the model and emits a command, threading the edit forward', () => {
    const multiCommandUpdate = combine([
      incrementAndEmitLoadNotes,
      emitLoadTagsAndFolders,
      doubleCount,
    ])({ count: 1 })
    expect(multiCommandUpdate.model).toEqual({ count: 4 })
    expect(multiCommandUpdate.commands ?? []).toEqual([
      loadNotes,
      loadTags,
      loadFolders,
    ])
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
    const missingRefresh = refreshNoteById('missing')(model)
    expect(missingRefresh.model).toBe(model)
    expect(missingRefresh.commands ?? []).toEqual([])
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
      const refreshNotesResult = refreshNotes(model)
      expect(refreshNotesResult.model).toBe(model)
      expect(refreshNotesResult.commands ?? []).toEqual([])
    }
  })

  it('writes Refreshing carrying the previous data and emits exactly the load Command for Success and Stale', () => {
    const loadedStates: ReadonlyArray<AsyncData.AsyncData<number, string>> = [
      AsyncData.Success({ data: 1 }),
      AsyncData.Stale({ error: 'boom', data: 1 }),
    ]

    for (const state of loadedStates) {
      const loadedRefresh = refreshNotes(makeCacheModel(state))
      expect(loadedRefresh.model.notes).toEqual(
        AsyncData.Refreshing({ data: 1 }),
      )
      expect(loadedRefresh.commands ?? []).toEqual([loadNotes])
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

    const keyedRefresh = refreshNoteById('note:1')(model)

    expect(HashMap.get(keyedRefresh.model.notesById, 'note:1')).toEqual(
      Option.some(AsyncData.Refreshing({ data: 1 })),
    )
    expect(keyedRefresh.model.notes).toBe(model.notes)
    expect(keyedRefresh.commands ?? []).toEqual([loadNotes])
  })

  it('loads a cold cache on entry when revalidate is revalidateOrLoad', () => {
    const model = makeCacheModel(AsyncData.Idle())
    const refreshOrLoadNotesResult = refreshOrLoadNotes(model)
    expect(refreshOrLoadNotesResult.model.notes).toEqual(AsyncData.Loading())
    expect(refreshOrLoadNotesResult.commands ?? []).toEqual([loadNotes])
  })
})

type CounterModel = Readonly<{ value: number }>

type CounterMessage =
  | typeof Message.BumpedValue.Type
  | typeof Message.CompletedSaveCount.Type

const saveCount: Command<CounterMessage> = {
  name: 'SaveCount',
  effect: Effect.succeed(Message.CompletedSaveCount()),
}

const counterUpdate = (
  model: CounterModel,
  message: CounterMessage,
): Return<CounterModel, CounterMessage> =>
  M.value(message).pipe(
    M.withReturnType<Return<CounterModel, CounterMessage>>(),
    M.tagsExhaustive({
      BumpedValue: () => ({
        model: evo(model, { value: Number.increment }),
        commands: [saveCount],
      }),
      CompletedSaveCount: () => ({ model }),
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
      BumpedValue: () => ({
        model: evo(model, { value: Number.increment }),
        commands: [saveCount],
        outMessage: ChangedValue(),
      }),
      CompletedSaveCount: () => ({ model }),
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
  foldOutMessage: () => model => ({
    model: { ...model, lastReportedValue: model.counter.value },
    commands: [notifyValueChanged],
  }),
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
    const foldCounterResult = foldCounter(dashboardModel, Message.BumpedValue())
    expect(foldCounterResult.model.counter).toEqual({ value: 4 })
    expect(foldCounterResult.model.lastReportedValue).toBe(0)
    expect(
      (foldCounterResult.commands ?? []).map(command => command.name),
    ).toEqual(['SaveCount'])
  })

  it('lifts the child Commands through toParentMessage, preserving name', () => {
    const counterFoldWithCommand = foldCounter(
      dashboardModel,
      Message.BumpedValue(),
    )

    const maybeCommand = Array.head(counterFoldWithCommand.commands ?? [])
    expect(Option.isSome(maybeCommand)).toBe(true)
    if (Option.isSome(maybeCommand)) {
      expect(maybeCommand.value.name).toBe('SaveCount')
      expect(Effect.runSync(maybeCommand.value.effect)).toEqual(
        GotCounterMessage(Message.CompletedSaveCount()),
      )
    }
  })

  it('is a no-op when read finds no mounted child', () => {
    const model: GatedDashboardModel = { maybeCounter: Option.none() }
    const foldGatedCounterResult = foldGatedCounter(
      model,
      Message.BumpedValue(),
    )
    expect(foldGatedCounterResult.model).toBe(model)
    expect(foldGatedCounterResult.commands ?? []).toEqual([])
  })

  it('folds a mounted gated child and writes it back as Some', () => {
    const model: GatedDashboardModel = {
      maybeCounter: Option.some({ value: 7 }),
    }
    const mountedCounterFold = foldGatedCounter(model, Message.BumpedValue())
    expect(mountedCounterFold.model.maybeCounter).toEqual(
      Option.some({ value: 8 }),
    )
  })

  it('skips foldOutMessage when the child emits no OutMessage', () => {
    const foldReportingCounterResult = foldReportingCounter(
      dashboardModel,
      Message.CompletedSaveCount(),
    )
    expect(foldReportingCounterResult.model.counter).toBe(
      dashboardModel.counter,
    )
    expect(foldReportingCounterResult.model.lastReportedValue).toBe(0)
    expect(foldReportingCounterResult.commands ?? []).toEqual([])
  })

  it('runs foldOutMessage against the Model with the child already written', () => {
    const reportingFoldState = foldReportingCounter(
      dashboardModel,
      Message.BumpedValue(),
    )
    expect(reportingFoldState.model.counter).toEqual({ value: 4 })
    expect(reportingFoldState.model.lastReportedValue).toBe(4)
  })

  it('appends the OutMessage Step Commands after the mapped child Commands', () => {
    const reportingFoldCommands = foldReportingCounter(
      dashboardModel,
      Message.BumpedValue(),
    )
    expect(
      (reportingFoldCommands.commands ?? []).map(command => command.name),
    ).toEqual(['SaveCount', 'NotifyValueChanged'])
  })

  it('folds an entry point whose input is not the child Message', () => {
    const informPressedKey = (
      counter: CounterModel,
      key: string,
    ): Return<CounterModel, CounterMessage> =>
      key === 'ArrowUp'
        ? counterUpdate(counter, Message.BumpedValue())
        : { model: counter }

    const foldCounterKeyPress = foldChild({
      update: informPressedKey,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => ({ ...model, counter: nextCounter }),
      toParentMessage: GotCounterMessage,
    })

    expectTypeOf(foldCounterKeyPress).toEqualTypeOf<
      Fold<DashboardModel, GotCounterMessage, string>
    >()

    const foldCounterKeyPressResult = foldCounterKeyPress(
      dashboardModel,
      'ArrowUp',
    )
    expect(foldCounterKeyPressResult.model.counter).toEqual({ value: 4 })

    const ignoredKeyFold = foldCounterKeyPress(dashboardModel, 'Escape')
    expect(ignoredKeyFold.model.counter).toBe(dashboardModel.counter)
  })

  it('lifts the child OutMessage into a Submodel parent through toParentOutMessage', () => {
    type ReportedValue = Readonly<{ _tag: 'ReportedValue' }>
    const ReportedValue = (): ReportedValue => ({ _tag: 'ReportedValue' })

    const foldCounterInSubmodel = foldChild({
      update: counterUpdateWithOutMessage,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => ({ ...model, counter: nextCounter }),
      toParentMessage: GotCounterMessage,
      toParentOutMessage: () => ReportedValue(),
    })

    expectTypeOf(foldCounterInSubmodel).toEqualTypeOf<
      FoldWithOutMessage<
        DashboardModel,
        GotCounterMessage,
        CounterMessage,
        ReportedValue
      >
    >()

    const foldCounterInSubmodelResult = foldCounterInSubmodel(
      dashboardModel,
      Message.BumpedValue(),
    )
    expect(foldCounterInSubmodelResult.model.counter).toEqual({ value: 4 })
    expect(
      (foldCounterInSubmodelResult.commands ?? []).map(command => command.name),
    ).toEqual(['SaveCount'])
    expect(foldCounterInSubmodelResult.outMessage).toEqual(ReportedValue())

    const noOutMessageFold = foldCounterInSubmodel(
      dashboardModel,
      Message.CompletedSaveCount(),
    )
    expect(noOutMessageFold.outMessage).toBeUndefined()
  })

  it('pairs toParentOutMessage with foldOutMessage for a Submodel parent that also updates state', () => {
    const foldReportingCounterInSubmodel = foldChild({
      update: counterUpdateWithOutMessage,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => ({ ...model, counter: nextCounter }),
      toParentMessage: GotCounterMessage,
      toParentOutMessage: () => undefined,
      foldOutMessage: () => model => ({
        model: { ...model, lastReportedValue: model.counter.value },
        commands: [notifyValueChanged],
      }),
    })

    const foldReportingCounterInSubmodelResult = foldReportingCounterInSubmodel(
      dashboardModel,
      Message.BumpedValue(),
    )
    expect(foldReportingCounterInSubmodelResult.model.lastReportedValue).toBe(4)
    expect(
      (foldReportingCounterInSubmodelResult.commands ?? []).map(
        command => command.name,
      ),
    ).toEqual(['SaveCount', 'NotifyValueChanged'])
    expect(foldReportingCounterInSubmodelResult.outMessage).toBeUndefined()
  })

  it('runs the same fold data-first and data-last', () => {
    const dataFirstResult = foldReportingCounter(
      dashboardModel,
      Message.BumpedValue(),
    )
    const dataLastResult = foldReportingCounter(Message.BumpedValue())(
      dashboardModel,
    )

    expect(dataFirstResult.model).toEqual(dataLastResult.model)
    expect(
      (dataFirstResult.commands ?? []).map(command => command.name),
    ).toEqual((dataLastResult.commands ?? []).map(command => command.name))
  })

  it('composes data-last with combine as an ordinary Step', () => {
    const reportThenBump = combine([
      foldReportingCounter(Message.BumpedValue()),
      foldCounter(Message.BumpedValue()),
    ])

    const reportThenBumpResult = reportThenBump(dashboardModel)
    expect(reportThenBumpResult.model.counter).toEqual({ value: 5 })
    expect(reportThenBumpResult.model.lastReportedValue).toBe(4)
    expect(
      (reportThenBumpResult.commands ?? []).map(command => command.name),
    ).toEqual(['SaveCount', 'NotifyValueChanged', 'SaveCount'])
  })
})

const settleCounter: Command<CounterMessage> = {
  name: 'SettleCounter',
  effect: Effect.succeed(Message.BumpedValue()),
}

const trimCounter: Command<CounterMessage> = {
  name: 'TrimCounter',
  effect: Effect.succeed(Message.CompletedSaveCount()),
}

const foldSettlingCounterOutMessage: (
  outMessage: ChangedValue,
  context: FoldContext<CounterMessage, DashboardMessage>,
) => Step<DashboardModel, DashboardMessage> = (outMessage, { liftCommand }) =>
  M.value(outMessage).pipe(
    M.withReturnType<Step<DashboardModel, DashboardMessage>>(),
    M.tagsExhaustive({
      ChangedValue: () => model => ({
        model,
        commands: [liftCommand(settleCounter)],
      }),
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
      NotifiedValueChanged: () => ({ model }),
    }),
  )

describe('foldChild fold context', () => {
  it('lifts a Command the OutMessage Step returns through toParentMessage', () => {
    const foldSettlingCounterResult = foldSettlingCounter(
      dashboardModel,
      Message.BumpedValue(),
    )

    expect(
      (foldSettlingCounterResult.commands ?? []).map(command => command.name),
    ).toEqual(['SaveCount', 'SettleCounter'])

    const maybeSettle = Array.last(foldSettlingCounterResult.commands ?? [])
    expect(Option.isSome(maybeSettle)).toBe(true)
    if (Option.isSome(maybeSettle)) {
      expect(Effect.runSync(maybeSettle.value.effect)).toEqual(
        GotCounterMessage(Message.BumpedValue()),
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
        model => ({
          model,
          commands: liftCommands([settleCounter, trimCounter]),
        }),
    })

    const foldTrimmingCounterResult = foldTrimmingCounter(
      dashboardModel,
      Message.BumpedValue(),
    )

    expect(
      (foldTrimmingCounterResult.commands ?? []).map(command => command.name),
    ).toEqual(['SaveCount', 'SettleCounter', 'TrimCounter'])
    expect(
      (foldTrimmingCounterResult.commands ?? []).map(command =>
        Effect.runSync(command.effect),
      ),
    ).toEqual([
      GotCounterMessage(Message.CompletedSaveCount()),
      GotCounterMessage(Message.BumpedValue()),
      GotCounterMessage(Message.CompletedSaveCount()),
    ])
  })

  it('records the mapping chain so a Story resolves with the child result', () => {
    Story.story(
      dashboardUpdate,
      Story.given(dashboardModel),
      Story.message(GotCounterMessage(Message.BumpedValue())),
      Story.model(model => {
        expect(model.counter.value).toBe(4)
      }),
      Story.Command.resolve(settleCounter, Message.BumpedValue()),
      Story.model(model => {
        expect(model.counter.value).toBe(5)
      }),
      Story.Command.resolveAll(
        [saveCount, Message.CompletedSaveCount()],
        [saveCount, Message.CompletedSaveCount()],
        [settleCounter, Message.CompletedSaveCount()],
      ),
    )
  })

  it('keeps a one-parameter foldOutMessage assignable', () => {
    const foldReportedValueOutMessage: (
      outMessage: ChangedValue,
    ) => Step<DashboardModel, DashboardMessage> = M.type<ChangedValue>().pipe(
      M.withReturnType<Step<DashboardModel, DashboardMessage>>(),
      M.tagsExhaustive({
        ChangedValue: () => model => ({
          model: { ...model, lastReportedValue: model.counter.value },
        }),
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

    const foldReportedValueResult = foldReportedValue(
      dashboardModel,
      Message.BumpedValue(),
    )
    expect(foldReportedValueResult.model.lastReportedValue).toBe(4)
    expect(
      (foldReportedValueResult.commands ?? []).map(command => command.name),
    ).toEqual(['SaveCount'])
  })
})

const resetCounter = (
  model: CounterModel,
): Return<CounterModel, CounterMessage> => ({
  model: { ...model, value: 0 },
  commands: [saveCount],
})

const resetCounterWithOutMessage = (
  model: CounterModel,
): ReturnWithOutMessage<CounterModel, CounterMessage, ChangedValue> => ({
  model: { ...model, value: 0 },
  commands: [saveCount],
  outMessage: ChangedValue(),
})

describe('foldChildStep', () => {
  const foldCounterReset = foldChildStep({
    update: resetCounter,
    read: (model: DashboardModel) => Option.some(model.counter),
    write: (model, nextCounter) => ({ ...model, counter: nextCounter }),
    toParentMessage: GotCounterMessage,
  })

  it('folds an entry point that takes nothing but the child Model', () => {
    const foldCounterResetResult = foldCounterReset(dashboardModel)

    expect(foldCounterResetResult.model.counter).toEqual({ value: 0 })
    expect(
      (foldCounterResetResult.commands ?? []).map(command => command.name),
    ).toEqual(['SaveCount'])
  })

  it('lifts the child OutMessage into a Submodel parent through toParentOutMessage', () => {
    type ReportedValue = Readonly<{ _tag: 'ReportedValue' }>
    const ReportedValue = (): ReportedValue => ({ _tag: 'ReportedValue' })

    const foldCounterResetInSubmodel = foldChildStep({
      update: resetCounterWithOutMessage,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => ({ ...model, counter: nextCounter }),
      toParentMessage: GotCounterMessage,
      toParentOutMessage: () => ReportedValue(),
    })

    expectTypeOf(foldCounterResetInSubmodel).toEqualTypeOf<
      StepWithOutMessage<DashboardModel, GotCounterMessage, ReportedValue>
    >()

    const foldCounterResetInSubmodelResult =
      foldCounterResetInSubmodel(dashboardModel)

    expect(foldCounterResetInSubmodelResult.model.counter).toEqual({ value: 0 })
    expect(
      (foldCounterResetInSubmodelResult.commands ?? []).map(
        command => command.name,
      ),
    ).toEqual(['SaveCount'])
    expect(foldCounterResetInSubmodelResult.outMessage).toEqual(ReportedValue())
  })

  it('keeps an undefined parent lift as a plain Step while folding locally', () => {
    const foldReportingCounterResetInSubmodel = foldChildStep({
      update: resetCounterWithOutMessage,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => ({ ...model, counter: nextCounter }),
      toParentMessage: GotCounterMessage,
      toParentOutMessage: () => undefined,
      foldOutMessage: () => model => ({
        model: { ...model, lastReportedValue: model.counter.value },
      }),
    })

    const plainStep: Step<DashboardModel, GotCounterMessage> =
      foldReportingCounterResetInSubmodel

    const foldReportingCounterResetResult = plainStep({
      ...dashboardModel,
      lastReportedValue: 9,
    })

    expect(foldReportingCounterResetResult.model.lastReportedValue).toBe(0)
    expect(foldReportingCounterResetResult.outMessage).toBeUndefined()
  })

  it('is an ordinary Step that composes with combine', () => {
    expectTypeOf(foldCounterReset).toEqualTypeOf<
      Step<DashboardModel, GotCounterMessage>
    >()

    const combineResult = combine(dashboardModel, [
      foldCounter(Message.BumpedValue()),
      foldCounterReset,
    ])

    expect(combineResult.model.counter).toEqual({ value: 0 })
    expect((combineResult.commands ?? []).map(command => command.name)).toEqual(
      ['SaveCount', 'SaveCount'],
    )
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
    const foldGatedCounterResetResult = foldGatedCounterReset(model)

    expect(foldGatedCounterResetResult.model).toBe(model)
    expect(foldGatedCounterResetResult.commands ?? []).toEqual([])
  })

  it('runs foldOutMessage against the Model with the child already written', () => {
    const foldReportingCounterReset = foldChildStep({
      update: (model: CounterModel) => ({
        model: { ...model, value: 0 },
        commands: [saveCount],
        outMessage: ChangedValue(),
      }),
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => ({ ...model, counter: nextCounter }),
      toParentMessage: GotCounterMessage,
      foldOutMessage: () => model => ({
        model: { ...model, lastReportedValue: model.counter.value },
        commands: [notifyValueChanged],
      }),
    })

    const foldReportingCounterResetResult =
      foldReportingCounterReset(dashboardModel)

    expect(foldReportingCounterResetResult.model.counter).toEqual({ value: 0 })
    expect(foldReportingCounterResetResult.model.lastReportedValue).toBe(0)
    expect(
      (foldReportingCounterResetResult.commands ?? []).map(
        command => command.name,
      ),
    ).toEqual(['SaveCount', 'NotifyValueChanged'])
  })

  it('lifts a Command the OutMessage Step returns through toParentMessage', () => {
    const foldSettlingCounterReset = foldChildStep({
      update: resetCounterWithOutMessage,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => ({ ...model, counter: nextCounter }),
      toParentMessage: GotCounterMessage,
      foldOutMessage: foldSettlingCounterOutMessage,
    })

    const foldSettlingCounterResetResult =
      foldSettlingCounterReset(dashboardModel)

    expect(
      (foldSettlingCounterResetResult.commands ?? []).map(
        command => command.name,
      ),
    ).toEqual(['SaveCount', 'SettleCounter'])

    const maybeSettle = Array.last(
      foldSettlingCounterResetResult.commands ?? [],
    )
    expect(Option.isSome(maybeSettle)).toBe(true)
    if (Option.isSome(maybeSettle)) {
      expect(Effect.runSync(maybeSettle.value.effect)).toEqual(
        GotCounterMessage(Message.BumpedValue()),
      )
    }
  })
})

describe('types', () => {
  type TestServices = Readonly<{ baseUrl: string }>
  type TestOutMessage = Readonly<{ _tag: 'ClosedEditor' }>

  const baseModel: TestModel = { count: 0 }

  it('Return carries the Model and optional Commands', () => {
    expectTypeOf<Return<TestModel, TestMessage>>().toEqualTypeOf<
      Readonly<{
        model: TestModel
        commands?: Commands<TestMessage>
        outMessage?: never
      }>
    >()
  })

  it('R defaults to never and threads through to the Commands', () => {
    expectTypeOf<Return<TestModel, TestMessage>>().toEqualTypeOf<
      Return<TestModel, TestMessage, never>
    >()

    const toReturnWithServices = (
      command: Command<TestMessage, never, TestServices>,
    ): Return<TestModel, TestMessage, TestServices> => ({
      model: baseModel,
      commands: [command],
    })

    expectTypeOf(toReturnWithServices)
      .parameter(0)
      .toEqualTypeOf<Command<TestMessage, never, TestServices>>()
  })

  it('ReturnWithOutMessage carries optional Commands and OutMessage fields', () => {
    expectTypeOf<
      ReturnWithOutMessage<TestModel, TestMessage, TestOutMessage>
    >().toEqualTypeOf<
      Readonly<{
        model: TestModel
        commands?: Commands<TestMessage>
        outMessage?: TestOutMessage
      }>
    >()
  })

  it('prevents an OutMessage return from flowing into a Return-only API', () => {
    const withOutMessage: ReturnWithOutMessage<
      TestModel,
      TestMessage,
      TestOutMessage
    > = {
      model: baseModel,
      outMessage: { _tag: 'ClosedEditor' },
    }

    // @ts-expect-error Return must not silently discard the OutMessage channel.
    const withoutOutMessage: Return<TestModel, TestMessage> = withOutMessage

    expect(withoutOutMessage.model).toBe(baseModel)
  })

  it('allows a plain Return to flow into an OutMessage-bearing API', () => {
    const plain: Return<TestModel, TestMessage> = { model: baseModel }
    const withOutMessageChannel: ReturnWithOutMessage<
      TestModel,
      TestMessage,
      TestOutMessage
    > = plain

    expect(withOutMessageChannel.model).toBe(baseModel)
  })

  it('rejects explicitly undefined Commands', () => {
    const commands: Commands<TestMessage> | undefined = undefined

    // @ts-expect-error exactOptionalPropertyTypes requires omitting commands or normalizing it.
    const updateReturn: Return<TestModel, TestMessage> = {
      model: baseModel,
      commands,
    }

    expect(updateReturn.model).toBe(baseModel)
  })

  it('prevents an OutMessage Step from flowing into combine', () => {
    const emitOutMessage: StepWithOutMessage<
      TestModel,
      TestMessage,
      TestOutMessage
    > = model => ({ model, outMessage: { _tag: 'ClosedEditor' } })

    // @ts-expect-error combine must not silently discard the OutMessage channel.
    combine([emitOutMessage])
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
    foldChild({
      // @ts-expect-error a ReturnWithOutMessage child update requires foldOutMessage
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
          IncrementedCount: () => ({
            model: evo(model, { count: Number.increment }),
          }),
          CompletedLoad: () => ({ model }),
        }),
      )

    expectTypeOf(update).returns.toEqualTypeOf<UpdateReturn>()

    const incrementResult = update({ count: 1 }, Message.IncrementedCount())
    expect(incrementResult.model).toEqual({ count: 2 })
    expect(incrementResult.commands ?? []).toEqual([])

    const acknowledgedModel: TestModel = { count: 4 }
    const acknowledgedResult = update(
      acknowledgedModel,
      Message.CompletedLoad(),
    )
    expect(acknowledgedResult.model).toBe(acknowledgedModel)
    expect(acknowledgedResult.commands ?? []).toEqual([])
  })
})
