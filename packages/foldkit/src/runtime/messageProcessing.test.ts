import { Effect, Fiber, Match as M, Schema as S } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Command } from '../command/index.js'
import { __requireDispatch, html } from '../html/index.js'
import { m } from '../message/index.js'
import { makeElement } from './runtime.js'

/**
 * Pins the message-processing contract of the plain hot path:
 *
 * - Messages are processed synchronously at dispatch time, in arrival
 *   order. A Command result never jumps ahead of an earlier Message and a
 *   later user Message never jumps ahead of an earlier Command result.
 * - A synchronous burst that exceeds the drain budget defers its remaining
 *   Messages to a later task instead of holding the stack, and every
 *   deferred Message is still processed, in order. The budget accumulates
 *   across drains within one task and resets when the browser demonstrably
 *   got control back between dispatches.
 * - No Message is processed before boot completes: an init Command's
 *   result arrives against a fully initialized runtime, after the init
 *   render painted the init Model, and a Command returned by that result's
 *   update forks and completes correctly.
 * - A crash is terminal: Messages dispatched after update throws are
 *   dropped, and a Command forked by a Message processed just before the
 *   crash does not run its effect, so no update, Command fork, or side
 *   effect runs behind the crash view.
 * - A Message dispatched while a render frame's patch is on the stack (an
 *   OnUnmount destroy hook) is buffered until the frame commits, so a
 *   defect in its update crashes cleanly and dispose still restores the
 *   container.
 */

const AppendedFirst = m('AppendedFirst')
const AppendedSecond = m('AppendedSecond')
const AppendedCommandResult = m('AppendedCommandResult')
const AppendedInitResult = m('AppendedInitResult')
const AppendedChainedResult = m('AppendedChainedResult')
const AppendedAfterCrash = m('AppendedAfterCrash')
const ThrewInUpdate = m('ThrewInUpdate')
const RemovedChild = m('RemovedChild')
const UnmountedChild = m('UnmountedChild')
const BurnedBudget = m('BurnedBudget', { label: S.String })
const Message = S.Union([
  AppendedFirst,
  AppendedSecond,
  AppendedCommandResult,
  AppendedInitResult,
  AppendedChainedResult,
  AppendedAfterCrash,
  ThrewInUpdate,
  RemovedChild,
  UnmountedChild,
  BurnedBudget,
])
type Message = typeof Message.Type

const Model = S.Struct({ log: S.Array(S.String) })
type Model = typeof Model.Type

const h = html<Message>()

const view = (model: Model) => h.div([], [model.log.join(',')])

// NOTE: the runtime's drain budget is 5ms. Each burn advances the mocked
// clock 4ms, so two burns cross the budget and the third dispatch defers.
const BURN_MS = 4
const OVER_BUDGET_GAP_MS = 6

let container: HTMLElement

beforeEach(() => {
  container = document.createElement('div')
  container.id = 'message-processing-app'
  document.body.appendChild(container)
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('message processing', () => {
  it('processes Messages synchronously at dispatch, in arrival order, with Command results following', async () => {
    const processedLog: Array<string> = []
    let capturedDispatch: ((message: Message) => void) | null = null
    // NOTE: a frozen clock keeps every drain inside the budget. On a loaded
    // machine one instrumented update can exceed the real 5ms budget and
    // defer the next dispatch, which is budget behavior, not the ordering
    // contract under test.
    const nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => 0)

    const produceCommandResult: Command<Message> = {
      name: 'ProduceCommandResult',
      effect: Effect.succeed(AppendedCommandResult()),
    }

    const update = (
      model: Model,
      message: Message,
    ): readonly [Model, ReadonlyArray<Command<Message>>] => {
      processedLog.push(message._tag)
      const nextModel = { log: [...model.log, message._tag] }
      return M.value(message).pipe(
        M.withReturnType<readonly [Model, ReadonlyArray<Command<Message>>]>(),
        M.tagsExhaustive({
          AppendedFirst: () => [nextModel, [produceCommandResult]],
          AppendedSecond: () => [nextModel, []],
          AppendedCommandResult: () => [nextModel, []],
          AppendedInitResult: () => [nextModel, []],
          AppendedChainedResult: () => [nextModel, []],
          AppendedAfterCrash: () => [nextModel, []],
          ThrewInUpdate: () => [nextModel, []],
          RemovedChild: () => [nextModel, []],
          UnmountedChild: () => [nextModel, []],
          BurnedBudget: () => [nextModel, []],
        }),
      )
    }

    const element = makeElement({
      Model,
      init: () => [{ log: [] }, []],
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
      dispatch(AppendedFirst())
      // AppendedFirst has already been processed on this stack; its Command
      // has been forked but its result cannot arrive before the next line.
      expect(processedLog).toEqual(['AppendedFirst'])
      dispatch(AppendedSecond())
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
    ): readonly [Model, ReadonlyArray<Command<Message>>] => {
      processedLog.push(
        message._tag === 'BurnedBudget' ? message.label : message._tag,
      )
      if (message._tag === 'BurnedBudget') {
        fakeNow += BURN_MS
      }
      return [{ log: [...model.log, message._tag] }, []]
    }

    const element = makeElement({
      Model,
      init: () => [{ log: [] }, []],
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
        dispatch(BurnedBudget({ label }))
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
    ): readonly [Model, ReadonlyArray<Command<Message>>] => {
      processedLog.push(
        message._tag === 'BurnedBudget' ? message.label : message._tag,
      )
      if (message._tag === 'BurnedBudget') {
        fakeNow += BURN_MS
      }
      return [{ log: [...model.log, message._tag] }, []]
    }

    const element = makeElement({
      Model,
      init: () => [{ log: [] }, []],
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
        dispatch(BurnedBudget({ label }))
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
      effect: Effect.succeed(AppendedChainedResult()),
    }

    const initCommand: Command<Message> = {
      name: 'ProduceInitResult',
      effect: Effect.succeed(AppendedInitResult()),
    }

    const update = (
      model: Model,
      message: Message,
    ): readonly [Model, ReadonlyArray<Command<Message>>] => {
      processedLog.push(message._tag)
      const nextModel = { log: [...model.log, message._tag] }
      if (message._tag === 'AppendedInitResult') {
        return [nextModel, [chainedCommand]]
      }
      return [nextModel, []]
    }

    const element = makeElement({
      Model,
      init: () => [{ log: [] }, [initCommand]],
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

    const spiedCommand: Command<Message> = {
      name: 'ProduceSpiedResult',
      effect: Effect.sync(() => {
        commandEffectSpy()
        return AppendedCommandResult()
      }),
    }

    const update = (
      model: Model,
      message: Message,
    ): readonly [Model, ReadonlyArray<Command<Message>>] => {
      processedLog.push(message._tag)
      if (message._tag === 'ThrewInUpdate') {
        throw new Error('boom in update')
      }
      const nextModel = { log: [...model.log, message._tag] }
      if (message._tag === 'AppendedAfterCrash') {
        return [nextModel, [spiedCommand]]
      }
      return [nextModel, []]
    }

    const element = makeElement({
      Model,
      init: () => [{ log: [] }, []],
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
      dispatch(ThrewInUpdate())
      expect(document.body.textContent).toContain('crash-view-marker')

      dispatch(AppendedAfterCrash())
      expect(processedLog).toEqual(['ThrewInUpdate'])

      // Give any wrongly-forked Command time to run before asserting.
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(processedLog).toEqual(['ThrewInUpdate'])
      expect(commandEffectSpy).not.toHaveBeenCalled()
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('does not run a Command forked by a Message processed just before a crash', async () => {
    let capturedDispatch: ((message: Message) => void) | null = null
    const commandEffectSpy = vi.fn()

    const spiedCommand: Command<Message> = {
      name: 'ProduceSpiedResult',
      effect: Effect.sync(() => {
        commandEffectSpy()
        return AppendedCommandResult()
      }),
    }

    const update = (
      model: Model,
      message: Message,
    ): readonly [Model, ReadonlyArray<Command<Message>>] => {
      if (message._tag === 'ThrewInUpdate') {
        throw new Error('boom in update')
      }
      const nextModel = { log: [...model.log, message._tag] }
      if (message._tag === 'AppendedFirst') {
        return [nextModel, [spiedCommand]]
      }
      return [nextModel, []]
    }

    const element = makeElement({
      Model,
      init: () => [{ log: [] }, []],
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
      dispatch(AppendedFirst())
      dispatch(ThrewInUpdate())
      expect(document.body.textContent).toContain('crash-view-marker')

      // Give the deferred Command fork a chance to run before asserting.
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(commandEffectSpy).not.toHaveBeenCalled()
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('buffers Messages dispatched by patch-time hooks, crashes cleanly on their defects, and restores the container on dispose', async () => {
    const processedLog: Array<string> = []
    let capturedDispatch: ((message: Message) => void) | null = null

    const update = (
      model: Model,
      message: Message,
    ): readonly [Model, ReadonlyArray<Command<Message>>] => {
      processedLog.push(message._tag)
      if (message._tag === 'UnmountedChild') {
        throw new Error('boom from unmount')
      }
      return [{ log: [...model.log, message._tag] }, []]
    }

    const element = makeElement({
      Model,
      init: () => [{ log: [] }, []],
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
                  [h.OnUnmount(UnmountedChild())],
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
      capturedDispatch!(RemovedChild())

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
