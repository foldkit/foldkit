import { Effect, Fiber, Schema as S } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Command } from '../command/index.js'
import { __htmlBuilder, __requireDispatch } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import { makeElement } from './runtime.js'

const Message = defineMessageUnion({
  AppendedFirst: {},
  AppendedSecond: {},
  AppendedCommandResult: {},
  AppendedInitResult: {},
  AppendedChainedResult: {},
  AppendedAfterCrash: {},
  ThrewInUpdate: {},
  RemovedChild: {},
  UnmountedChild: {},
  BurnedBudget: { label: S.String },
})
type Message = typeof Message.Type

const Model = S.Struct({ log: S.Array(S.String) })
type Model = typeof Model.Type

const h = __htmlBuilder<Message>()

const view = (model: Model) => h.div([], [model.log.join(',')])

// NOTE: the runtime's drain budget is 5ms. Each burn advances the mocked
// clock 4ms, so two burns cross the budget and the third dispatch defers.
const BURN_MS = 4
const OVER_BUDGET_GAP_MS = 6

// NOTE: a frozen clock keeps every drain inside the budget, so consecutive
// synchronous dispatches all land in one drain. On a loaded machine a single
// instrumented update can exceed the real 5ms budget, which defers the next
// dispatch to a later task. That is the budget contract working, but it
// dissolves the setup for any test that needs two dispatches on one stack.
const freezeDrainClock = () =>
  vi.spyOn(performance, 'now').mockImplementation(() => 0)

let container: HTMLElement

beforeEach(() => {
  container = document.createElement('div')
  container.id = 'message-processing-app'
  document.body.appendChild(container)
})

afterEach(() => {
  document.body.innerHTML = ''
})

type UpdateReturn = Readonly<{
  model: Model
  commands?: ReadonlyArray<Command<Message>>
  outMessage?: never
}>

describe('message processing', () => {
  it('processes Messages synchronously at dispatch, in arrival order, with Command results following', async () => {
    const processedLog: Array<string> = []
    let capturedDispatch: ((message: Message) => void) | null = null
    const nowSpy = freezeDrainClock()

    const produceCommandResult: Command<Message> = {
      name: 'ProduceCommandResult',
      effect: Effect.succeed(Message.AppendedCommandResult()),
    }

    const update = (model: Model, message: Message) => {
      processedLog.push(message._tag)
      const nextModel = { log: [...model.log, message._tag] }
      return Message.match<UpdateReturn>(message, {
        AppendedFirst: () => ({
          model: nextModel,
          commands: [produceCommandResult],
        }),
        AppendedSecond: () => ({ model: nextModel }),
        AppendedCommandResult: () => ({ model: nextModel }),
        AppendedInitResult: () => ({ model: nextModel }),
        AppendedChainedResult: () => ({ model: nextModel }),
        AppendedAfterCrash: () => ({ model: nextModel }),
        ThrewInUpdate: () => ({ model: nextModel }),
        RemovedChild: () => ({ model: nextModel }),
        UnmountedChild: () => ({ model: nextModel }),
        BurnedBudget: () => ({ model: nextModel }),
      })
    }

    const element = makeElement({
      Model,
      init: () => ({ model: { log: [] } }),
      update,
      view: model => {
        capturedDispatch = __requireDispatch()
        return view(model)
      },
      container,
    })

    const fiber = Effect.runFork(element.start())
    await vi.waitFor(() => {
      expect(capturedDispatch).not.toBeNull()
    })

    try {
      const dispatch = capturedDispatch!
      dispatch(Message.AppendedFirst())
      // AppendedFirst has already been processed on this stack; its Command
      // has been forked but its result cannot arrive before the next line.
      expect(processedLog).toEqual(['AppendedFirst'])
      dispatch(Message.AppendedSecond())
      expect(processedLog).toEqual(['AppendedFirst', 'AppendedSecond'])

      await vi.waitFor(() => {
        expect(processedLog).toEqual([
          'AppendedFirst',
          'AppendedSecond',
          'AppendedCommandResult',
        ])
      })
    } finally {
      nowSpy.mockRestore()
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('defers the remainder of an over-budget synchronous burst to a later task and processes all of it in order', async () => {
    const processedLog: Array<string> = []
    let capturedDispatch: ((message: Message) => void) | null = null
    let fakeNow = 0
    const nowSpy = vi
      .spyOn(performance, 'now')
      .mockImplementation(() => fakeNow)

    const update = (
      model: Model,
      message: Message,
    ): Readonly<{
      model: Model
      commands?: ReadonlyArray<Command<Message>>
      outMessage?: never
    }> => {
      processedLog.push(
        message._tag === 'BurnedBudget' ? message.label : message._tag,
      )
      if (message._tag === 'BurnedBudget') {
        fakeNow += BURN_MS
      }
      return { model: { log: [...model.log, message._tag] } }
    }

    const element = makeElement({
      Model,
      init: () => ({ model: { log: [] } }),
      update,
      view: model => {
        capturedDispatch = __requireDispatch()
        return view(model)
      },
      container,
    })

    const fiber = Effect.runFork(element.start())
    await vi.waitFor(() => {
      expect(capturedDispatch).not.toBeNull()
    })

    try {
      const dispatch = capturedDispatch!
      const labels = ['burn-1', 'burn-2', 'burn-3', 'burn-4']
      for (const label of labels) {
        dispatch(Message.BurnedBudget({ label }))
      }

      // The dispatch loop holds the stack, so the mocked clock never
      // advances between drains and no idle-gap reset can fire: the first
      // two burns fit the budget, the second two must defer to a later
      // task.
      expect(processedLog).toEqual(['burn-1', 'burn-2'])

      await vi.waitFor(() => {
        expect(processedLog).toEqual(labels)
      })
    } finally {
      nowSpy.mockRestore()
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('resets the drain budget when the browser had control between dispatches', async () => {
    const processedLog: Array<string> = []
    let capturedDispatch: ((message: Message) => void) | null = null
    let fakeNow = 0
    const nowSpy = vi
      .spyOn(performance, 'now')
      .mockImplementation(() => fakeNow)

    const update = (
      model: Model,
      message: Message,
    ): Readonly<{
      model: Model
      commands?: ReadonlyArray<Command<Message>>
      outMessage?: never
    }> => {
      processedLog.push(
        message._tag === 'BurnedBudget' ? message.label : message._tag,
      )
      if (message._tag === 'BurnedBudget') {
        fakeNow += BURN_MS
      }
      return { model: { log: [...model.log, message._tag] } }
    }

    const element = makeElement({
      Model,
      init: () => ({ model: { log: [] } }),
      update,
      view: model => {
        capturedDispatch = __requireDispatch()
        return view(model)
      },
      container,
    })

    const fiber = Effect.runFork(element.start())
    await vi.waitFor(() => {
      expect(capturedDispatch).not.toBeNull()
    })

    try {
      const dispatch = capturedDispatch!
      const labels = ['burn-1', 'burn-2', 'burn-3', 'burn-4']
      for (const label of labels) {
        dispatch(Message.BurnedBudget({ label }))
        // An idle gap wider than the budget between dispatches means the
        // browser had the stack back; the accumulated budget resets and no
        // burn ever defers.
        fakeNow += OVER_BUDGET_GAP_MS
      }

      expect(processedLog).toEqual(labels)
    } finally {
      nowSpy.mockRestore()
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('processes init Command results after boot, painting the init Model first, and runs Commands chained from them', async () => {
    const processedLog: Array<string> = []
    const seenViewModels: Array<Model> = []

    const chainedCommand: Command<Message> = {
      name: 'ProduceChainedResult',
      effect: Effect.succeed(Message.AppendedChainedResult()),
    }

    const initCommand: Command<Message> = {
      name: 'ProduceInitResult',
      effect: Effect.succeed(Message.AppendedInitResult()),
    }

    const update = (
      model: Model,
      message: Message,
    ): Readonly<{
      model: Model
      commands?: ReadonlyArray<Command<Message>>
      outMessage?: never
    }> => {
      processedLog.push(message._tag)
      const nextModel = { log: [...model.log, message._tag] }
      if (message._tag === 'AppendedInitResult') {
        return { model: nextModel, commands: [chainedCommand] }
      }
      return { model: nextModel }
    }

    const element = makeElement({
      Model,
      init: () => ({ model: { log: [] }, commands: [initCommand] }),
      update,
      view: model => {
        seenViewModels.push(model)
        return view(model)
      },
      container,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await vi.waitFor(() => {
        expect(processedLog).toEqual([
          'AppendedInitResult',
          'AppendedChainedResult',
        ])
      })

      // The init render happens during boot, before any Command result can
      // be processed, so the first view invocation must see the init Model.
      expect(seenViewModels[0]).toEqual({ log: [] })

      await vi.waitFor(() => {
        expect(document.body.textContent).toContain(
          'AppendedInitResult,AppendedChainedResult',
        )
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('stops processing after a crash: later dispatches are dropped and fork no Commands', async () => {
    const processedLog: Array<string> = []
    let capturedDispatch: ((message: Message) => void) | null = null
    const commandEffectSpy = vi.fn()
    const nowSpy = freezeDrainClock()

    const spiedCommand: Command<Message> = {
      name: 'ProduceSpiedResult',
      effect: Effect.sync(() => {
        commandEffectSpy()
        return Message.AppendedCommandResult()
      }),
    }

    const update = (
      model: Model,
      message: Message,
    ): Readonly<{
      model: Model
      commands?: ReadonlyArray<Command<Message>>
      outMessage?: never
    }> => {
      processedLog.push(message._tag)
      if (message._tag === 'ThrewInUpdate') {
        throw new Error('boom in update')
      }
      const nextModel = { log: [...model.log, message._tag] }
      if (message._tag === 'AppendedAfterCrash') {
        return { model: nextModel, commands: [spiedCommand] }
      }
      return { model: nextModel }
    }

    const element = makeElement({
      Model,
      init: () => ({ model: { log: [] } }),
      update,
      view: model => {
        capturedDispatch = __requireDispatch()
        return view(model)
      },
      crash: {
        view: () => h.div([], ['crash-view-marker']),
      },
      container,
    })

    const fiber = Effect.runFork(element.start())
    await vi.waitFor(() => {
      expect(capturedDispatch).not.toBeNull()
    })

    try {
      const dispatch = capturedDispatch!
      dispatch(Message.ThrewInUpdate())
      expect(document.body.textContent).toContain('crash-view-marker')

      dispatch(Message.AppendedAfterCrash())
      expect(processedLog).toEqual(['ThrewInUpdate'])

      // Give any wrongly-forked Command time to run before asserting.
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(processedLog).toEqual(['ThrewInUpdate'])
      expect(commandEffectSpy).not.toHaveBeenCalled()
    } finally {
      nowSpy.mockRestore()
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('does not run a Command forked by a Message processed just before a crash', async () => {
    let capturedDispatch: ((message: Message) => void) | null = null
    const commandEffectSpy = vi.fn()
    const nowSpy = freezeDrainClock()

    const spiedCommand: Command<Message> = {
      name: 'ProduceSpiedResult',
      effect: Effect.sync(() => {
        commandEffectSpy()
        return Message.AppendedCommandResult()
      }),
    }

    const update = (
      model: Model,
      message: Message,
    ): Readonly<{
      model: Model
      commands?: ReadonlyArray<Command<Message>>
      outMessage?: never
    }> => {
      if (message._tag === 'ThrewInUpdate') {
        throw new Error('boom in update')
      }
      const nextModel = { log: [...model.log, message._tag] }
      if (message._tag === 'AppendedFirst') {
        return { model: nextModel, commands: [spiedCommand] }
      }
      return { model: nextModel }
    }

    const element = makeElement({
      Model,
      init: () => ({ model: { log: [] } }),
      update,
      view: model => {
        capturedDispatch = __requireDispatch()
        return view(model)
      },
      crash: {
        view: () => h.div([], ['crash-view-marker']),
      },
      container,
    })

    const fiber = Effect.runFork(element.start())
    await vi.waitFor(() => {
      expect(capturedDispatch).not.toBeNull()
    })

    try {
      const dispatch = capturedDispatch!
      // AppendedFirst forks a Command whose fork is deferred to a microtask;
      // ThrewInUpdate crashes on the same synchronous stack before that
      // microtask runs. The Command's side effect must not run behind the
      // crash view.
      dispatch(Message.AppendedFirst())
      dispatch(Message.ThrewInUpdate())
      expect(document.body.textContent).toContain('crash-view-marker')

      // Give the deferred Command fork a chance to run before asserting.
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(commandEffectSpy).not.toHaveBeenCalled()
    } finally {
      nowSpy.mockRestore()
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('buffers Messages dispatched by patch-time hooks, crashes cleanly on their defects, and restores the container on dispose', async () => {
    const processedLog: Array<string> = []
    let capturedDispatch: ((message: Message) => void) | null = null

    const update = (
      model: Model,
      message: Message,
    ): Readonly<{
      model: Model
      commands?: ReadonlyArray<Command<Message>>
      outMessage?: never
    }> => {
      processedLog.push(message._tag)
      if (message._tag === 'UnmountedChild') {
        throw new Error('boom from unmount')
      }
      return { model: { log: [...model.log, message._tag] } }
    }

    const element = makeElement({
      Model,
      init: () => ({ model: { log: [] } }),
      update,
      view: model => {
        capturedDispatch = __requireDispatch()
        const isChildRemoved = model.log.includes('RemovedChild')
        return h.div(
          [],
          [
            isChildRemoved
              ? h.empty
              : h.keyed('span')(
                  'unmount-child',
                  [h.OnUnmount(Message.UnmountedChild())],
                  ['child'],
                ),
            h.p([], ['stable']),
          ],
        )
      },
      crash: {
        view: () => h.div([], ['crash-view-marker']),
      },
      container,
    })

    const fiber = Effect.runFork(element.start())
    await vi.waitFor(() => {
      expect(capturedDispatch).not.toBeNull()
    })

    try {
      capturedDispatch!(Message.RemovedChild())

      // The removal patch fires the OnUnmount destroy hook mid-patch; its
      // Message must process after the frame commits, so the crash view
      // patches a consistent tree instead of tearing the in-flight patch.
      await vi.waitFor(() => {
        expect(document.body.textContent).toContain('crash-view-marker')
      })
      expect(processedLog).toEqual(['RemovedChild', 'UnmountedChild'])
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }

    // Dispose tears down the crash view and restores the container, which
    // only works when the vnode bookkeeping stayed consistent through the
    // mid-patch crash.
    expect(document.body.contains(container)).toBe(true)
    expect(document.body.textContent).not.toContain('crash-view-marker')
  })
})
