import { Array, Effect, HashMap, Match, Number, Option } from 'effect'
import type { KeyValueStore } from 'effect/unstable/persistence/KeyValueStore'
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
  withOutMessage,
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
    const combinedUpdate = combine([incrementCount, doubleCount])({
      count: 1,
    })
    expect(combinedUpdate.model).toEqual({ count: 4 })

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

  it('preserves a single step and returns its computed Commands collection', () => {
    const model: TestModel = { count: 2 }
    const doubledCount = combine([doubleCount])(model)
    expect(doubledCount.model).toEqual({ count: 4 })
    expect(doubledCount.commands).toEqual([])
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

describe('withOutMessage', () => {
  type TestOutMessage = Readonly<{ _tag: 'ClosedEditor' }>
  type TestServices = Readonly<{ baseUrl: string }>

  const model: TestModel = { count: 1 }
  const command: Command<TestMessage, never, TestServices> = {
    name: 'LoadWithServices',
    effect: Effect.succeed(Message.CompletedLoad()),
  }
  const updateReturn: Return<TestModel, TestMessage, TestServices> = {
    model,
    commands: [command],
  }

  it('adds a defined OutMessage while preserving the Model and Commands', () => {
    const outMessage: TestOutMessage = { _tag: 'ClosedEditor' }
    const result = withOutMessage(updateReturn, outMessage)

    expect(result.model).toBe(model)
    expect(result.commands).toBe(updateReturn.commands)
    expect(result.outMessage).toBe(outMessage)
    expect(Object.hasOwn(result, 'outMessage')).toBe(true)
  })

  it('supports the data-last form', () => {
    const outMessage: TestOutMessage = { _tag: 'ClosedEditor' }
    const result = withOutMessage(outMessage)(updateReturn)

    expectTypeOf(result).toEqualTypeOf<
      ReturnWithOutMessage<TestModel, TestMessage, TestOutMessage, TestServices>
    >()
    expect(result.model).toBe(model)
    expect(result.commands).toBe(updateReturn.commands)
    expect(result.outMessage).toBe(outMessage)
  })

  it('omits the outMessage property when the value is undefined', () => {
    const outMessage: TestOutMessage | undefined = undefined
    const result = withOutMessage(updateReturn, outMessage)

    expect(result.model).toBe(model)
    expect(result.commands).toBe(updateReturn.commands)
    expect(result.outMessage).toBeUndefined()
    expect(Object.hasOwn(result, 'outMessage')).toBe(false)
  })

  it('omits the outMessage property in the data-last form', () => {
    const outMessage: TestOutMessage | undefined = undefined
    const result = withOutMessage(outMessage)(updateReturn)

    expect(result.model).toBe(model)
    expect(result.commands).toBe(updateReturn.commands)
    expect(result.outMessage).toBeUndefined()
    expect(Object.hasOwn(result, 'outMessage')).toBe(false)
  })

  it('preserves Command service requirements and Message inference', () => {
    const outMessage: TestOutMessage = { _tag: 'ClosedEditor' }
    const result = withOutMessage(updateReturn, outMessage)

    expectTypeOf(result).toEqualTypeOf<
      ReturnWithOutMessage<TestModel, TestMessage, TestOutMessage, TestServices>
    >()
  })

  it('rejects an OutMessage-bearing input', () => {
    const updateWithOutMessage: ReturnWithOutMessage<
      TestModel,
      TestMessage,
      TestOutMessage,
      TestServices
    > = {
      ...updateReturn,
      outMessage: { _tag: 'ClosedEditor' },
    }

    // @ts-expect-error withOutMessage cannot replace an existing OutMessage.
    withOutMessage(updateWithOutMessage, { _tag: 'ClosedEditor' })
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
  write: (model, nextNotes) => evo(model, { notes: () => nextNotes }),
  load: loadNotes,
})

const refreshOrLoadNotes: Step<CacheModel, TestMessage> = refresh({
  read: (model: CacheModel) => Option.some(model.notes),
  revalidate: AsyncData.revalidateOrLoad,
  write: (model, nextNotes) => evo(model, { notes: () => nextNotes }),
  load: loadNotes,
})

const refreshNoteById = (noteId: string): Step<CacheModel, TestMessage> =>
  refresh({
    read: (model: CacheModel) => HashMap.get(model.notesById, noteId),
    revalidate: AsyncData.revalidate,
    write: (model, nextNote) =>
      evo(model, {
        notesById: () => HashMap.set(model.notesById, noteId, nextNote),
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
      const notesRefresh = refreshNotes(model)
      expect(notesRefresh.model).toBe(model)
      expect(notesRefresh.commands ?? []).toEqual([])
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
    const notesRefreshOrLoad = refreshOrLoadNotes(model)
    expect(notesRefreshOrLoad.model.notes).toEqual(AsyncData.Loading())
    expect(notesRefreshOrLoad.commands ?? []).toEqual([loadNotes])
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
  Match.value(message).pipe(
    Match.withReturnType<Return<CounterModel, CounterMessage>>(),
    Match.tagsExhaustive({
      BumpedValue: () => ({
        model: evo(model, { value: Number.increment }),
        commands: [saveCount],
      }),
      CompletedSaveCount: () => ({ model }),
    }),
  )

const CounterOutMessage = defineMessageUnion({ ChangedValue: {} })
type ChangedValue = typeof CounterOutMessage.ChangedValue.Type

const counterUpdateWithOutMessage = (
  model: CounterModel,
  message: CounterMessage,
): ReturnWithOutMessage<CounterModel, CounterMessage, ChangedValue> =>
  Match.value(message).pipe(
    Match.withReturnType<
      ReturnWithOutMessage<CounterModel, CounterMessage, ChangedValue>
    >(),
    Match.tagsExhaustive({
      BumpedValue: () => ({
        model: evo(model, { value: Number.increment }),
        commands: [saveCount],
        outMessage: CounterOutMessage.ChangedValue(),
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
  write: (model, nextCounter) => evo(model, { counter: () => nextCounter }),
  toParentMessage: GotCounterMessage,
})

const foldReportingCounter = foldChild({
  update: counterUpdateWithOutMessage,
  read: (model: DashboardModel) => Option.some(model.counter),
  write: (model, nextCounter) => evo(model, { counter: () => nextCounter }),
  toParentMessage: GotCounterMessage,
  foldOutMessage: () => model => ({
    model: evo(model, { lastReportedValue: () => model.counter.value }),
    commands: [notifyValueChanged],
  }),
})

type GatedDashboardModel = Readonly<{
  maybeCounter: Option.Option<CounterModel>
}>

const foldGatedCounter = foldChild({
  update: counterUpdate,
  read: (model: GatedDashboardModel) => model.maybeCounter,
  write: (model, nextCounter) =>
    evo(model, { maybeCounter: () => Option.some(nextCounter) }),
  toParentMessage: GotCounterMessage,
})

describe('foldChild', () => {
  it('writes the updated child back into the parent Model', () => {
    const counterFold = foldCounter(dashboardModel, Message.BumpedValue())
    expect(counterFold.model.counter).toEqual({ value: 4 })
    expect(counterFold.model.lastReportedValue).toBe(0)
    expect((counterFold.commands ?? []).map(command => command.name)).toEqual([
      'SaveCount',
    ])
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
    const gatedCounterFold = foldGatedCounter(model, Message.BumpedValue())
    expect(gatedCounterFold.model).toBe(model)
    expect(gatedCounterFold.commands ?? []).toEqual([])
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
    const reportingCounterFold = foldReportingCounter(
      dashboardModel,
      Message.CompletedSaveCount(),
    )
    expect(reportingCounterFold.model.counter).toBe(dashboardModel.counter)
    expect(reportingCounterFold.model.lastReportedValue).toBe(0)
    expect(reportingCounterFold.commands ?? []).toEqual([])
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
      write: (model, nextCounter) => evo(model, { counter: () => nextCounter }),
      toParentMessage: GotCounterMessage,
    })

    expectTypeOf(foldCounterKeyPress).toEqualTypeOf<
      Fold<DashboardModel, GotCounterMessage, string>
    >()

    const counterKeyPressFold = foldCounterKeyPress(dashboardModel, 'ArrowUp')
    expect(counterKeyPressFold.model.counter).toEqual({ value: 4 })

    const ignoredKeyFold = foldCounterKeyPress(dashboardModel, 'Escape')
    expect(ignoredKeyFold.model.counter).toBe(dashboardModel.counter)
  })

  it('lifts the child OutMessage into a Submodel parent through toParentOutMessage', () => {
    type ReportedValue = Readonly<{ _tag: 'ReportedValue' }>
    const ReportedValue = (): ReportedValue => ({ _tag: 'ReportedValue' })

    const foldCounterInSubmodel = foldChild({
      update: counterUpdateWithOutMessage,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => evo(model, { counter: () => nextCounter }),
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

    const counterSubmodelFold = foldCounterInSubmodel(
      dashboardModel,
      Message.BumpedValue(),
    )
    expect(counterSubmodelFold.model.counter).toEqual({ value: 4 })
    expect(
      (counterSubmodelFold.commands ?? []).map(command => command.name),
    ).toEqual(['SaveCount'])
    expect(counterSubmodelFold.outMessage).toEqual(ReportedValue())

    const noOutMessageFold = foldCounterInSubmodel(
      dashboardModel,
      Message.CompletedSaveCount(),
    )
    expect(noOutMessageFold.outMessage).toBeUndefined()
  })

  it('lets a local OutMessage fold flow into an OutMessage-aware parent without an adapter', () => {
    const foldReportingCounterInSubmodel = foldChild({
      update: counterUpdateWithOutMessage,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => evo(model, { counter: () => nextCounter }),
      toParentMessage: GotCounterMessage,
      foldOutMessage: () => model => ({
        model: evo(model, { lastReportedValue: () => model.counter.value }),
        commands: [notifyValueChanged],
      }),
    })

    const reportingCounterSubmodelFold: ReturnWithOutMessage<
      DashboardModel,
      DashboardMessage,
      NotifiedValueChanged
    > = foldReportingCounterInSubmodel(dashboardModel, Message.BumpedValue())
    expect(reportingCounterSubmodelFold.model.lastReportedValue).toBe(4)
    expect(
      (reportingCounterSubmodelFold.commands ?? []).map(
        command => command.name,
      ),
    ).toEqual(['SaveCount', 'NotifyValueChanged'])
    expect(reportingCounterSubmodelFold.outMessage).toBeUndefined()
  })

  it('prefers a derived OutMessage over the toParentOutMessage lift', () => {
    type ReportedValue = Readonly<{ _tag: 'ReportedValue' }>
    const ReportedValue = (): ReportedValue => ({ _tag: 'ReportedValue' })

    type ReachedThreshold = Readonly<{ _tag: 'ReachedThreshold' }>
    const ReachedThreshold = (): ReachedThreshold => ({
      _tag: 'ReachedThreshold',
    })

    type DashboardOutMessage = ReportedValue | ReachedThreshold

    const foldThresholdCounterOutMessage = CounterOutMessage.match<
      StepWithOutMessage<DashboardModel, DashboardMessage, DashboardOutMessage>
    >({
      ChangedValue: () => model => ({
        model: evo(model, {
          lastReportedValue: () => model.counter.value,
        }),
        commands: [notifyValueChanged],
        outMessage: ReachedThreshold(),
      }),
    })

    const foldThresholdCounter = foldChild({
      update: counterUpdateWithOutMessage,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => evo(model, { counter: () => nextCounter }),
      toParentMessage: GotCounterMessage,
      toParentOutMessage: () => ReportedValue(),
      foldOutMessage: foldThresholdCounterOutMessage,
    })

    expectTypeOf(foldThresholdCounter).toEqualTypeOf<
      FoldWithOutMessage<
        DashboardModel,
        DashboardMessage,
        CounterMessage,
        DashboardOutMessage
      >
    >()

    const thresholdCounterFold = foldThresholdCounter(
      dashboardModel,
      Message.BumpedValue(),
    )
    expect(thresholdCounterFold.model.counter).toEqual({ value: 4 })
    expect(thresholdCounterFold.model.lastReportedValue).toBe(4)
    expect(
      (thresholdCounterFold.commands ?? []).map(command => command.name),
    ).toEqual(['SaveCount', 'NotifyValueChanged'])
    expect(thresholdCounterFold.outMessage).toEqual(ReachedThreshold())
  })

  it('falls back to the toParentOutMessage lift when the derived Step emits nothing', () => {
    type ReportedValue = Readonly<{ _tag: 'ReportedValue' }>
    const ReportedValue = (): ReportedValue => ({ _tag: 'ReportedValue' })

    const foldDeferringCounterOutMessage = CounterOutMessage.match<
      StepWithOutMessage<DashboardModel, DashboardMessage, ReportedValue>
    >({
      ChangedValue: () => model => ({
        model: evo(model, {
          lastReportedValue: () => model.counter.value,
        }),
        commands: [notifyValueChanged],
      }),
    })

    const foldDeferringCounter = foldChild({
      update: counterUpdateWithOutMessage,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => evo(model, { counter: () => nextCounter }),
      toParentMessage: GotCounterMessage,
      toParentOutMessage: () => ReportedValue(),
      foldOutMessage: foldDeferringCounterOutMessage,
    })

    const deferringCounterFold = foldDeferringCounter(
      dashboardModel,
      Message.BumpedValue(),
    )
    expect(deferringCounterFold.model.lastReportedValue).toBe(4)
    expect(
      (deferringCounterFold.commands ?? []).map(command => command.name),
    ).toEqual(['SaveCount', 'NotifyValueChanged'])
    expect(deferringCounterFold.outMessage).toEqual(ReportedValue())
  })

  it('emits a derived parent OutMessage without a toParentOutMessage lift', () => {
    type ReachedThreshold = Readonly<{ _tag: 'ReachedThreshold' }>
    const ReachedThreshold = (): ReachedThreshold => ({
      _tag: 'ReachedThreshold',
    })

    const foldDerivingCounterOutMessage = CounterOutMessage.match<
      StepWithOutMessage<DashboardModel, DashboardMessage, ReachedThreshold>
    >({
      ChangedValue: () => model => ({
        model: evo(model, {
          lastReportedValue: () => model.counter.value,
        }),
        commands: [notifyValueChanged],
        outMessage: ReachedThreshold(),
      }),
    })

    const foldDerivingCounter = foldChild({
      update: counterUpdateWithOutMessage,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => evo(model, { counter: () => nextCounter }),
      toParentMessage: GotCounterMessage,
      foldOutMessage: foldDerivingCounterOutMessage,
    })

    expectTypeOf(foldDerivingCounter).toEqualTypeOf<
      FoldWithOutMessage<
        DashboardModel,
        DashboardMessage,
        CounterMessage,
        ReachedThreshold
      >
    >()

    const derivingCounterFold = foldDerivingCounter(
      dashboardModel,
      Message.BumpedValue(),
    )
    expect(derivingCounterFold.model.lastReportedValue).toBe(4)
    expect(
      (derivingCounterFold.commands ?? []).map(command => command.name),
    ).toEqual(['SaveCount', 'NotifyValueChanged'])
    expect(derivingCounterFold.outMessage).toEqual(ReachedThreshold())
  })

  it('runs the same fold data-first and data-last', () => {
    const dataFirstFold = foldReportingCounter(
      dashboardModel,
      Message.BumpedValue(),
    )
    const dataLastFold = foldReportingCounter(Message.BumpedValue())(
      dashboardModel,
    )

    expect(dataFirstFold.model).toEqual(dataLastFold.model)
    expect((dataFirstFold.commands ?? []).map(command => command.name)).toEqual(
      (dataLastFold.commands ?? []).map(command => command.name),
    )
  })

  it('composes data-last with combine as an ordinary Step', () => {
    const reportThenBump = combine([
      foldReportingCounter(Message.BumpedValue()),
      foldCounter(Message.BumpedValue()),
    ])

    const reportedThenBumped = reportThenBump(dashboardModel)
    expect(reportedThenBumped.model.counter).toEqual({ value: 5 })
    expect(reportedThenBumped.model.lastReportedValue).toBe(4)
    expect(
      (reportedThenBumped.commands ?? []).map(command => command.name),
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
  CounterOutMessage.match<Step<DashboardModel, DashboardMessage>>(outMessage, {
    ChangedValue: () => model => ({
      model,
      commands: [liftCommand(settleCounter)],
    }),
  })

const foldSettlingCounter = foldChild({
  update: counterUpdateWithOutMessage,
  read: (model: DashboardModel) => Option.some(model.counter),
  write: (model, nextCounter) => evo(model, { counter: () => nextCounter }),
  toParentMessage: GotCounterMessage,
  foldOutMessage: foldSettlingCounterOutMessage,
})

const dashboardUpdate = (
  model: DashboardModel,
  message: DashboardMessage,
): Return<DashboardModel, DashboardMessage> =>
  Match.value(message).pipe(
    Match.withReturnType<Return<DashboardModel, DashboardMessage>>(),
    Match.tagsExhaustive({
      GotCounterMessage: ({ message: counterMessage }) =>
        foldSettlingCounter(model, counterMessage),
      NotifiedValueChanged: () => ({ model }),
    }),
  )

describe('foldChild fold context', () => {
  it('lifts a Command the OutMessage Step returns through toParentMessage', () => {
    const settlingCounterFold = foldSettlingCounter(
      dashboardModel,
      Message.BumpedValue(),
    )

    expect(
      (settlingCounterFold.commands ?? []).map(command => command.name),
    ).toEqual(['SaveCount', 'SettleCounter'])

    const maybeSettle = Array.last(settlingCounterFold.commands ?? [])
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
      write: (model, nextCounter) => evo(model, { counter: () => nextCounter }),
      toParentMessage: GotCounterMessage,
      foldOutMessage:
        (_outMessage, { liftCommands }) =>
        model => ({
          model,
          commands: liftCommands([settleCounter, trimCounter]),
        }),
    })

    const trimmingCounterFold = foldTrimmingCounter(
      dashboardModel,
      Message.BumpedValue(),
    )

    expect(
      (trimmingCounterFold.commands ?? []).map(command => command.name),
    ).toEqual(['SaveCount', 'SettleCounter', 'TrimCounter'])
    expect(
      (trimmingCounterFold.commands ?? []).map(command =>
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
    ) => Step<DashboardModel, DashboardMessage> = CounterOutMessage.match<
      Step<DashboardModel, DashboardMessage>
    >({
      ChangedValue: () => model => ({
        model: evo(model, {
          lastReportedValue: () => model.counter.value,
        }),
      }),
    })

    const foldReportedValue = foldChild({
      update: counterUpdateWithOutMessage,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => evo(model, { counter: () => nextCounter }),
      toParentMessage: GotCounterMessage,
      foldOutMessage: foldReportedValueOutMessage,
    })

    expectTypeOf(foldReportedValue).toEqualTypeOf<
      Fold<DashboardModel, DashboardMessage, CounterMessage>
    >()

    const reportedValueFold = foldReportedValue(
      dashboardModel,
      Message.BumpedValue(),
    )
    expect(reportedValueFold.model.lastReportedValue).toBe(4)
    expect(
      (reportedValueFold.commands ?? []).map(command => command.name),
    ).toEqual(['SaveCount'])
  })
})

const resetCounter = (
  model: CounterModel,
): Return<CounterModel, CounterMessage> => ({
  model: evo(model, { value: () => 0 }),
  commands: [saveCount],
})

const resetCounterWithOutMessage = (
  model: CounterModel,
): ReturnWithOutMessage<CounterModel, CounterMessage, ChangedValue> => ({
  model: evo(model, { value: () => 0 }),
  commands: [saveCount],
  outMessage: CounterOutMessage.ChangedValue(),
})

describe('foldChildStep', () => {
  const foldCounterReset = foldChildStep({
    update: resetCounter,
    read: (model: DashboardModel) => Option.some(model.counter),
    write: (model, nextCounter) => evo(model, { counter: () => nextCounter }),
    toParentMessage: GotCounterMessage,
  })

  it('folds an entry point that takes nothing but the child Model', () => {
    const counterResetFold = foldCounterReset(dashboardModel)

    expect(counterResetFold.model.counter).toEqual({ value: 0 })
    expect(
      (counterResetFold.commands ?? []).map(command => command.name),
    ).toEqual(['SaveCount'])
  })

  it('lifts the child OutMessage into a Submodel parent through toParentOutMessage', () => {
    type ReportedValue = Readonly<{ _tag: 'ReportedValue' }>
    const ReportedValue = (): ReportedValue => ({ _tag: 'ReportedValue' })

    const foldCounterResetInSubmodel = foldChildStep({
      update: resetCounterWithOutMessage,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => evo(model, { counter: () => nextCounter }),
      toParentMessage: GotCounterMessage,
      toParentOutMessage: () => ReportedValue(),
    })

    expectTypeOf(foldCounterResetInSubmodel).toEqualTypeOf<
      StepWithOutMessage<DashboardModel, GotCounterMessage, ReportedValue>
    >()

    const counterResetSubmodelFold = foldCounterResetInSubmodel(dashboardModel)

    expect(counterResetSubmodelFold.model.counter).toEqual({ value: 0 })
    expect(
      (counterResetSubmodelFold.commands ?? []).map(command => command.name),
    ).toEqual(['SaveCount'])
    expect(counterResetSubmodelFold.outMessage).toEqual(ReportedValue())
  })

  it('infers lifted and derived parent OutMessages independently', () => {
    type ReportedReset = Readonly<{ _tag: 'ReportedReset' }>
    const ReportedReset = (): ReportedReset => ({ _tag: 'ReportedReset' })

    type ResetDashboard = Readonly<{ _tag: 'ResetDashboard' }>
    const ResetDashboard = (): ResetDashboard => ({
      _tag: 'ResetDashboard',
    })

    type DashboardOutMessage = ReportedReset | ResetDashboard

    const foldCounterResetOutMessage = CounterOutMessage.match<
      StepWithOutMessage<DashboardModel, GotCounterMessage, ResetDashboard>
    >({
      ChangedValue: () => model => ({
        model,
        outMessage: ResetDashboard(),
      }),
    })

    const foldCounterReset = foldChildStep({
      update: resetCounterWithOutMessage,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => evo(model, { counter: () => nextCounter }),
      toParentMessage: GotCounterMessage,
      toParentOutMessage: () => ReportedReset(),
      foldOutMessage: foldCounterResetOutMessage,
    })

    expectTypeOf(foldCounterReset).toEqualTypeOf<
      StepWithOutMessage<DashboardModel, GotCounterMessage, DashboardOutMessage>
    >()

    const counterResetFold = foldCounterReset(dashboardModel)
    expect(counterResetFold.outMessage).toEqual(ResetDashboard())
  })

  it('lets a local child Step flow into an OutMessage-aware parent without an adapter', () => {
    const foldReportingCounterResetInSubmodel = foldChildStep({
      update: resetCounterWithOutMessage,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => evo(model, { counter: () => nextCounter }),
      toParentMessage: GotCounterMessage,
      foldOutMessage: () => model => ({
        model: evo(model, { lastReportedValue: () => model.counter.value }),
      }),
    })

    const parentStep: StepWithOutMessage<
      DashboardModel,
      GotCounterMessage,
      NotifiedValueChanged
    > = foldReportingCounterResetInSubmodel

    const reportingCounterResetFold = parentStep(
      evo(dashboardModel, { lastReportedValue: () => 9 }),
    )

    expect(reportingCounterResetFold.model.lastReportedValue).toBe(0)
    expect(reportingCounterResetFold.outMessage).toBeUndefined()
  })

  it('emits a derived parent OutMessage without a toParentOutMessage lift', () => {
    type ResetDashboard = Readonly<{ _tag: 'ResetDashboard' }>
    const ResetDashboard = (): ResetDashboard => ({
      _tag: 'ResetDashboard',
    })

    const foldCounterResetOutMessage = CounterOutMessage.match<
      StepWithOutMessage<DashboardModel, DashboardMessage, ResetDashboard>
    >({
      ChangedValue: () => model => ({
        model: evo(model, {
          lastReportedValue: () => model.counter.value,
        }),
        commands: [notifyValueChanged],
        outMessage: ResetDashboard(),
      }),
    })

    const foldDerivingCounterReset = foldChildStep({
      update: resetCounterWithOutMessage,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => evo(model, { counter: () => nextCounter }),
      toParentMessage: GotCounterMessage,
      foldOutMessage: foldCounterResetOutMessage,
    })

    expectTypeOf(foldDerivingCounterReset).toEqualTypeOf<
      StepWithOutMessage<DashboardModel, DashboardMessage, ResetDashboard>
    >()

    const derivingCounterReset = foldDerivingCounterReset(dashboardModel)
    expect(derivingCounterReset.model.lastReportedValue).toBe(0)
    expect(
      (derivingCounterReset.commands ?? []).map(command => command.name),
    ).toEqual(['SaveCount', 'NotifyValueChanged'])
    expect(derivingCounterReset.outMessage).toEqual(ResetDashboard())
  })

  it('is an ordinary Step that composes with combine', () => {
    expectTypeOf(foldCounterReset).toEqualTypeOf<
      Step<DashboardModel, GotCounterMessage>
    >()

    const combinedReset = combine(dashboardModel, [
      foldCounter(Message.BumpedValue()),
      foldCounterReset,
    ])

    expect(combinedReset.model.counter).toEqual({ value: 0 })
    expect((combinedReset.commands ?? []).map(command => command.name)).toEqual(
      ['SaveCount', 'SaveCount'],
    )
  })

  it('is a no-op when read finds no mounted child', () => {
    const foldGatedCounterReset = foldChildStep({
      update: resetCounter,
      read: (model: GatedDashboardModel) => model.maybeCounter,
      write: (model, nextCounter) =>
        evo(model, { maybeCounter: () => Option.some(nextCounter) }),
      toParentMessage: GotCounterMessage,
    })

    const model: GatedDashboardModel = { maybeCounter: Option.none() }
    const gatedCounterResetFold = foldGatedCounterReset(model)

    expect(gatedCounterResetFold.model).toBe(model)
    expect(gatedCounterResetFold.commands ?? []).toEqual([])
  })

  it('runs foldOutMessage against the Model with the child already written', () => {
    const foldReportingCounterReset = foldChildStep({
      update: (model: CounterModel) => ({
        model: evo(model, { value: () => 0 }),
        commands: [saveCount],
        outMessage: CounterOutMessage.ChangedValue(),
      }),
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => evo(model, { counter: () => nextCounter }),
      toParentMessage: GotCounterMessage,
      foldOutMessage: () => model => ({
        model: evo(model, { lastReportedValue: () => model.counter.value }),
        commands: [notifyValueChanged],
      }),
    })

    const reportingCounterResetFold = foldReportingCounterReset(dashboardModel)

    expect(reportingCounterResetFold.model.counter).toEqual({ value: 0 })
    expect(reportingCounterResetFold.model.lastReportedValue).toBe(0)
    expect(
      (reportingCounterResetFold.commands ?? []).map(command => command.name),
    ).toEqual(['SaveCount', 'NotifyValueChanged'])
  })

  it('lifts a Command the OutMessage Step returns through toParentMessage', () => {
    const foldSettlingCounterReset = foldChildStep({
      update: resetCounterWithOutMessage,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model, nextCounter) => evo(model, { counter: () => nextCounter }),
      toParentMessage: GotCounterMessage,
      foldOutMessage: foldSettlingCounterOutMessage,
    })

    const settlingCounterResetFold = foldSettlingCounterReset(dashboardModel)

    expect(
      (settlingCounterResetFold.commands ?? []).map(command => command.name),
    ).toEqual(['SaveCount', 'SettleCounter'])

    const maybeSettle = Array.last(settlingCounterResetFold.commands ?? [])
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
  type PersistenceServices = KeyValueStore
  type TestOutMessage = Readonly<{ _tag: 'ClosedEditor' }>
  type FoldInferenceModel = Readonly<{
    counter: CounterModel
    status: 'Idle' | 'Saved'
  }>

  const baseModel: TestModel = { count: 0 }
  const testOutMessage: TestOutMessage = { _tag: 'ClosedEditor' }
  const saveWithServices: Command<CounterMessage, never, TestServices> = {
    name: 'SaveWithServices',
    effect: Effect.context<TestServices>().pipe(
      Effect.as(Message.CompletedSaveCount()),
    ),
  }
  const updateCounterWithServices = (
    model: CounterModel,
    _message: CounterMessage,
  ): ReturnWithOutMessage<
    CounterModel,
    CounterMessage,
    ChangedValue,
    TestServices
  > => ({
    model,
    commands: [saveWithServices],
    outMessage: CounterOutMessage.ChangedValue(),
  })
  const resetCounterWithServices = (
    model: CounterModel,
  ): ReturnWithOutMessage<
    CounterModel,
    CounterMessage,
    ChangedValue,
    TestServices
  > => ({
    model,
    commands: [saveWithServices],
    outMessage: CounterOutMessage.ChangedValue(),
  })
  const notifyWithPersistence: Command<
    TestMessage,
    never,
    PersistenceServices
  > = {
    name: 'NotifyWithPersistence',
    effect: Effect.context<PersistenceServices>().pipe(
      Effect.as(Message.CompletedLoad()),
    ),
  }
  const foldChangedValueWithPersistence = CounterOutMessage.match<
    Step<FoldInferenceModel, TestMessage, PersistenceServices>
  >({
    ChangedValue: () => model => ({
      model: evo(model, { status: () => 'Saved' }),
      commands: [notifyWithPersistence],
    }),
  })

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

    // @ts-expect-error A Return-only API would lose this OutMessage.
    const withoutOutMessage: Return<TestModel, TestMessage> = withOutMessage

    expect(withoutOutMessage.model).toBe(baseModel)
  })

  it('allows a plain Return where OutMessages are accepted', () => {
    const plain: Return<TestModel, TestMessage> = { model: baseModel }
    const outMessageAwareReturn: ReturnWithOutMessage<
      TestModel,
      TestMessage,
      TestOutMessage
    > = plain

    expect(outMessageAwareReturn.model).toBe(baseModel)
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

    // @ts-expect-error combine would lose this OutMessage.
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

  it('foldChild combines child and OutMessage Step service requirements', () => {
    const foldWithServices = foldChild({
      update: updateCounterWithServices,
      read: (model: FoldInferenceModel) => Option.some(model.counter),
      write: (model, nextCounter) => evo(model, { counter: () => nextCounter }),
      toParentMessage: GotCounterMessage,
      foldOutMessage: foldChangedValueWithPersistence,
    })

    expectTypeOf(foldWithServices).toEqualTypeOf<
      Fold<
        FoldInferenceModel,
        GotCounterMessage | TestMessage,
        CounterMessage,
        TestServices | PersistenceServices
      >
    >()
  })

  it('foldChild combines service requirements when lifting the OutMessage', () => {
    const foldWithServices = foldChild({
      update: updateCounterWithServices,
      read: (model: FoldInferenceModel) => Option.some(model.counter),
      write: (model, nextCounter) => evo(model, { counter: () => nextCounter }),
      toParentMessage: GotCounterMessage,
      toParentOutMessage: () => testOutMessage,
      foldOutMessage: foldChangedValueWithPersistence,
    })

    expectTypeOf(foldWithServices).toEqualTypeOf<
      FoldWithOutMessage<
        FoldInferenceModel,
        GotCounterMessage | TestMessage,
        CounterMessage,
        TestOutMessage,
        TestServices | PersistenceServices
      >
    >()
  })

  it('foldChildStep combines child and OutMessage Step service requirements', () => {
    const foldStepWithServices = foldChildStep({
      update: resetCounterWithServices,
      read: (model: FoldInferenceModel) => Option.some(model.counter),
      write: (model, nextCounter) => evo(model, { counter: () => nextCounter }),
      toParentMessage: GotCounterMessage,
      foldOutMessage: foldChangedValueWithPersistence,
    })

    expectTypeOf(foldStepWithServices).toEqualTypeOf<
      Step<
        FoldInferenceModel,
        GotCounterMessage | TestMessage,
        TestServices | PersistenceServices
      >
    >()
  })

  it('foldChildStep combines requirements when lifting the OutMessage', () => {
    const foldStepWithServices = foldChildStep({
      update: resetCounterWithServices,
      read: (model: FoldInferenceModel) => Option.some(model.counter),
      write: (model, nextCounter) => evo(model, { counter: () => nextCounter }),
      toParentMessage: GotCounterMessage,
      toParentOutMessage: () => testOutMessage,
      foldOutMessage: foldChangedValueWithPersistence,
    })

    expectTypeOf(foldStepWithServices).toEqualTypeOf<
      StepWithOutMessage<
        FoldInferenceModel,
        GotCounterMessage | TestMessage,
        TestOutMessage,
        TestServices | PersistenceServices
      >
    >()
  })

  it('foldChild rejects an OutMessage child without foldOutMessage', () => {
    foldChild({
      // @ts-expect-error a ReturnWithOutMessage child update requires foldOutMessage
      update: counterUpdateWithOutMessage,
      read: (model: DashboardModel) => Option.some(model.counter),
      write: (model: DashboardModel, nextCounter: CounterModel) =>
        evo(model, { counter: () => nextCounter }),
      toParentMessage: GotCounterMessage,
    })
  })

  it('compiles the Message.match update idiom', () => {
    type UpdateReturn = Return<TestModel, TestMessage>

    const update = (model: TestModel, message: TestMessage) =>
      Message.match<UpdateReturn>(message, {
        IncrementedCount: () => ({
          model: evo(model, { count: Number.increment }),
        }),
        CompletedLoad: () => ({ model }),
        BumpedValue: () => ({ model }),
        CompletedSaveCount: () => ({ model }),
      })

    expectTypeOf(update).returns.toEqualTypeOf<UpdateReturn>()

    const increment = update({ count: 1 }, Message.IncrementedCount())
    expect(increment.model).toEqual({ count: 2 })
    expect(increment.commands ?? []).toEqual([])

    const acknowledgedModel: TestModel = { count: 4 }
    const acknowledgment = update(acknowledgedModel, Message.CompletedLoad())
    expect(acknowledgment.model).toBe(acknowledgedModel)
    expect(acknowledgment.commands ?? []).toEqual([])
  })
})
