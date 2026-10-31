import { Effect, HashMap, Number, Option } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as AsyncData from '../asyncData/index.js'
import { type Send, SendTypeId } from '../blocks/engine.js'
import { type Command } from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import {
  type Commands,
  type Return,
  type ReturnWithOutMessage,
  type Step,
  type StepWithOutMessage,
  combineSteps,
  refresh,
  withOutMessage,
} from './update.js'

const Message = defineMessageUnion({
  IncrementedCount: {},
  CompletedLoad: {},
  BumpedValue: {},
})
type Message = typeof Message.Type

type TestMessage =
  | typeof Message.IncrementedCount.Type
  | typeof Message.CompletedLoad.Type

type TestModel = Readonly<{ count: number }>

const OutMessage = defineMessageUnion({
  ReachedLimit: {},
  ClosedEditor: {},
})
type OutMessage = typeof OutMessage.Type

const makeLoad = (name: string): Command<TestMessage> => ({
  name,
  effect: Effect.succeed(Message.CompletedLoad()),
})

const loadNotes = makeLoad('LoadNotes')
const loadTags = makeLoad('LoadTags')
const loadFolders = makeLoad('LoadFolders')

const sendTo = (id: string): Send => ({
  [SendTypeId]: true,
  target: [id],
  message: Message.BumpedValue(),
})

const resetHome = sendTo('home')
const resetAway = sendTo('away')

const incrementCountStep: Step<TestModel, TestMessage> = model => ({
  model: modifyFields(model, { count: Number.increment }),
})

const doubleCountStep: Step<TestModel, TestMessage> = model => ({
  model: modifyFields(model, { count: Number.multiply(2) }),
})

const emitLoadNotesStep: Step<TestModel, TestMessage> = model => ({
  model,
  commands: [loadNotes],
})

const emitLoadTagsAndFoldersStep: Step<TestModel, TestMessage> = model => ({
  model,
  commands: [loadTags, loadFolders],
})

const resetHomeStep: Step<TestModel, TestMessage> = model => ({
  model,
  messages: [resetHome],
})

const resetAwayAndLoadNotesStep: Step<TestModel, TestMessage> = model => ({
  model,
  commands: [loadNotes],
  messages: [resetAway],
})

const reachLimitStep: StepWithOutMessage<
  TestModel,
  TestMessage,
  OutMessage
> = model => ({ model, outMessage: OutMessage.ReachedLimit() })

describe('combineSteps', () => {
  it('threads the Model through the Steps in order', () => {
    expect(
      combineSteps([incrementCountStep, doubleCountStep])({ count: 1 }).model,
    ).toEqual({ count: 4 })
    expect(
      combineSteps([doubleCountStep, incrementCountStep])({ count: 1 }).model,
    ).toEqual({ count: 3 })
  })

  it('concatenates the Commands of every Step in Step order', () => {
    const loadAll = combineSteps({ count: 0 }, [
      emitLoadNotesStep,
      incrementCountStep,
      emitLoadTagsAndFoldersStep,
    ])

    expect(loadAll.model).toEqual({ count: 1 })
    expect(loadAll.commands).toEqual([loadNotes, loadTags, loadFolders])
  })

  it('concatenates the child Messages of every Step in Step order', () => {
    const resetBoth = combineSteps({ count: 0 }, [
      resetHomeStep,
      emitLoadTagsAndFoldersStep,
      resetAwayAndLoadNotesStep,
    ])

    expect(resetBoth.messages).toEqual([resetHome, resetAway])
    expect(resetBoth.commands).toEqual([loadTags, loadFolders, loadNotes])
  })

  it('carries the OutMessage one Step reports', () => {
    const limitReached = combineSteps({ count: 0 }, [
      incrementCountStep,
      reachLimitStep,
      emitLoadNotesStep,
    ])

    expect(limitReached.outMessage).toEqual(OutMessage.ReachedLimit())
    expect(limitReached.commands).toEqual([loadNotes])
  })

  it('omits the OutMessage when no Step reports one', () => {
    const counted = combineSteps({ count: 0 }, [incrementCountStep])

    expect(Object.hasOwn(counted, 'outMessage')).toBe(false)
  })

  it('throws when more than one Step reports an OutMessage', () => {
    expect(() =>
      combineSteps({ count: 0 }, [reachLimitStep, reachLimitStep]),
    ).toThrow('more than one OutMessage')
  })

  it('returns the Model unchanged with no Commands for an empty Step list', () => {
    const model: TestModel = { count: 5 }
    const unchanged = combineSteps(model, [])

    expect(unchanged.model).toBe(model)
    expect(unchanged.commands).toEqual([])
    expect(unchanged.messages).toEqual([])
  })

  it('gives the same result data-first and data-last', () => {
    const model: TestModel = { count: 1 }

    expect(
      combineSteps(model, [
        incrementCountStep,
        resetAwayAndLoadNotesStep,
        doubleCountStep,
      ]),
    ).toEqual(
      combineSteps([
        incrementCountStep,
        resetAwayAndLoadNotesStep,
        doubleCountStep,
      ])(model),
    )
  })

  it('accepts a Step list built at runtime', () => {
    const steps: ReadonlyArray<Step<TestModel, TestMessage>> = [
      emitLoadNotesStep,
      resetHomeStep,
    ]
    const combined = combineSteps({ count: 0 }, steps)

    expect(combined.commands).toEqual([loadNotes])
    expect(combined.messages).toEqual([resetHome])
  })

  it('types inline Steps from the Model', () => {
    const combined = combineSteps({ count: 0 }, [
      stepModel => ({
        model: modifyFields(stepModel, { count: Number.increment }),
      }),
      stepModel => ({ model: stepModel, commands: [loadNotes] }),
    ])

    expect(combined.model).toEqual({ count: 1 })
    expectTypeOf(combined.model).toEqualTypeOf<{ count: number }>()
  })

  it('produces a Return when no Step reports an OutMessage', () => {
    const combined = combineSteps({ count: 0 } satisfies TestModel, [
      emitLoadNotesStep,
      resetHomeStep,
    ])

    expectTypeOf(combined).toExtend<Return<TestModel, TestMessage>>()
    expectTypeOf(combineSteps([emitLoadNotesStep, resetHomeStep])).toExtend<
      Step<TestModel, TestMessage>
    >()
  })

  it('produces a ReturnWithOutMessage when a Step reports an OutMessage', () => {
    const combined = combineSteps([emitLoadNotesStep, reachLimitStep])({
      count: 0,
    })

    expectTypeOf(combined).not.toExtend<Return<TestModel, TestMessage>>()
    expectTypeOf(combined).toExtend<
      ReturnWithOutMessage<TestModel, TestMessage, OutMessage>
    >()
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

    expectTypeOf(result).toExtend<
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

    expectTypeOf(result).toExtend<
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
      model: updateReturn.model,
      commands: updateReturn.commands,
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

const refreshNotesStep: Step<CacheModel, TestMessage> = refresh({
  read: (model: CacheModel) => Option.some(model.notes),
  revalidate: AsyncData.revalidate,
  write: (model, nextNotes) => modifyFields(model, { notes: () => nextNotes }),
  load: loadNotes,
})

const refreshOrLoadNotesStep: Step<CacheModel, TestMessage> = refresh({
  read: (model: CacheModel) => Option.some(model.notes),
  revalidate: AsyncData.revalidateOrLoad,
  write: (model, nextNotes) => modifyFields(model, { notes: () => nextNotes }),
  load: loadNotes,
})

const refreshNoteByIdStep = (noteId: string): Step<CacheModel, TestMessage> =>
  refresh({
    read: (model: CacheModel) => HashMap.get(model.notesById, noteId),
    revalidate: AsyncData.revalidate,
    write: (model, nextNote) =>
      modifyFields(model, {
        notesById: () => HashMap.set(model.notesById, noteId, nextNote),
      }),
    load: loadNotes,
  })

describe('refresh', () => {
  it('is a no-op when read misses the keyed cache', () => {
    const model = makeCacheModel(AsyncData.Success({ data: 1 }))
    const missingRefresh = refreshNoteByIdStep('missing')(model)
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
      const notesRefresh = refreshNotesStep(model)
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
      const loadedRefresh = refreshNotesStep(makeCacheModel(state))
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

    const keyedRefresh = refreshNoteByIdStep('note:1')(model)

    expect(HashMap.get(keyedRefresh.model.notesById, 'note:1')).toEqual(
      Option.some(AsyncData.Refreshing({ data: 1 })),
    )
    expect(keyedRefresh.model.notes).toBe(model.notes)
    expect(keyedRefresh.commands ?? []).toEqual([loadNotes])
  })

  it('loads a cold cache on entry when revalidate is revalidateOrLoad', () => {
    const model = makeCacheModel(AsyncData.Idle())
    const notesRefreshOrLoad = refreshOrLoadNotesStep(model)
    expect(notesRefreshOrLoad.model.notes).toEqual(AsyncData.Loading())
    expect(notesRefreshOrLoad.commands ?? []).toEqual([loadNotes])
  })
})

describe('types', () => {
  type TestServices = Readonly<{ baseUrl: string }>
  const baseModel: TestModel = { count: 0 }

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

  it('prevents an OutMessage return from flowing into a Return-only API', () => {
    const closedEditor: ReturnWithOutMessage<
      TestModel,
      TestMessage,
      OutMessage
    > = {
      model: baseModel,
      outMessage: OutMessage.ClosedEditor(),
    }

    // @ts-expect-error A Return-only API would lose this OutMessage.
    const withoutOutMessage: Return<TestModel, TestMessage> = closedEditor

    expect(withoutOutMessage.model).toBe(baseModel)
  })

  it('allows a plain Return where OutMessages are accepted', () => {
    const plain: Return<TestModel, TestMessage> = { model: baseModel }
    const outMessageAwareReturn: ReturnWithOutMessage<
      TestModel,
      TestMessage,
      OutMessage
    > = plain

    expect(outMessageAwareReturn.model).toBe(baseModel)
  })

  it('accepts directly forwarded optional Commands', () => {
    const forwardCommands = (
      commands: Commands<TestMessage, TestServices> | undefined,
    ): Return<TestModel, TestMessage, TestServices> => ({
      model: baseModel,
      commands,
    })

    expect(forwardCommands(undefined).model).toBe(baseModel)
  })

  it('rejects null and Commands for another Message', () => {
    const wrongMessageCommand: Command<typeof Message.BumpedValue.Type> = {
      name: 'BumpValue',
      effect: Effect.succeed(Message.BumpedValue()),
    }

    const nullCommands: Return<TestModel, TestMessage> = {
      model: baseModel,
      // @ts-expect-error Commands may be absent or undefined, but never null.
      commands: null,
    }
    const wrongMessageCommands: Return<TestModel, TestMessage> = {
      model: baseModel,
      // @ts-expect-error Forwarded Commands must produce the declared Message.
      commands: [wrongMessageCommand],
    }

    expect(nullCommands.model).toBe(baseModel)
    expect(wrongMessageCommands.model).toBe(baseModel)
  })

  it('compiles the Message.match update idiom', () => {
    type UpdateReturn = Return<TestModel, TestMessage>

    const update = (model: TestModel, message: Message) =>
      Message.match<UpdateReturn>(message, {
        IncrementedCount: () => ({
          model: modifyFields(model, { count: Number.increment }),
        }),
        CompletedLoad: () => ({ model }),
        BumpedValue: () => ({ model, messages: [resetHome] }),
      })

    expectTypeOf(update).returns.toEqualTypeOf<UpdateReturn>()
    expect(update({ count: 1 }, Message.IncrementedCount()).model).toEqual({
      count: 2,
    })
    expect(update({ count: 1 }, Message.BumpedValue()).messages).toEqual([
      resetHome,
    ])
  })
})
