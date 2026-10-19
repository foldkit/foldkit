import { Effect, Fiber, Schema } from 'effect'
import { describe, expect, it, vi } from 'vitest'

import * as Command from '../command/index.js'
import * as Dom from '../dom/index.js'
import { defineMessageUnion } from '../message/index.js'
import type * as Update from '../update/index.js'
import { makeElement } from './makeElement.js'

const Model = Schema.Struct({})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  SucceededShowDialog: {},
  SucceededShowNestedDialogs: {},
  FailedShowDialog: {},
  FailedShowNestedDialogs: {},
})
type Message = typeof Message.Type

const ShowDialog = Command.define('ShowDialog', {
  messages: [Message.SucceededShowDialog, Message.FailedShowDialog],
  execute: Dom.lockScroll.pipe(
    Effect.andThen(() => Dom.showDialog('#owned-dialog', { isModal: true })),
    Effect.as(Message.SucceededShowDialog()),
    Effect.catch(() =>
      Dom.unlockScroll.pipe(Effect.as(Message.FailedShowDialog())),
    ),
  ),
})

const ShowNestedDialogs = Command.define('ShowNestedDialogs', {
  messages: [
    Message.SucceededShowNestedDialogs,
    Message.FailedShowNestedDialogs,
  ],
  execute: Effect.gen(function* () {
    yield* Dom.lockScroll
    yield* Dom.showDialog('#parent-dialog', { isModal: true }).pipe(
      Effect.onError(() => Dom.unlockScroll),
    )

    yield* Dom.lockScroll
    yield* Dom.showDialog('#child-dialog', { isModal: true }).pipe(
      Effect.onError(() => Dom.unlockScroll),
    )

    return Message.SucceededShowNestedDialogs()
  }).pipe(
    Effect.catch(() =>
      Dom.releaseDialogResources('parent-dialog').pipe(
        Effect.as(Message.FailedShowNestedDialogs()),
      ),
    ),
  ),
})

const makeDialogProgram = (container: HTMLElement) =>
  makeElement({
    Model,
    init: () => ({ model: Model.make({}), commands: [ShowDialog()] }),
    update: (model: Model, message: Message) =>
      Message.match<Update.Return<Model, Message>>(message, {
        SucceededShowDialog: () => ({ model }),
        SucceededShowNestedDialogs: () => ({ model }),
        FailedShowDialog: () => ({ model }),
        FailedShowNestedDialogs: () => ({ model }),
      }),
    view: (_model, h) =>
      h.dialog([h.Id('owned-dialog')], [h.button([], ['Close'])]),
    container,
  })

const makeNestedDialogProgram = (container: HTMLElement) =>
  makeElement({
    Model,
    init: () => ({ model: Model.make({}), commands: [ShowNestedDialogs()] }),
    update: (model: Model, message: Message) =>
      Message.match<Update.Return<Model, Message>>(message, {
        SucceededShowDialog: () => ({ model }),
        SucceededShowNestedDialogs: () => ({ model }),
        FailedShowDialog: () => ({ model }),
        FailedShowNestedDialogs: () => ({ model }),
      }),
    view: (_model, h) =>
      h.div(
        [],
        [
          h.dialog(
            [h.Id('parent-dialog')],
            [h.button([h.Id('parent-button')], ['Parent'])],
          ),
          h.dialog(
            [h.Id('child-dialog')],
            [h.button([h.Id('child-button')], ['Child'])],
          ),
        ],
      ),
    container,
  })

describe('runtime dialog cleanup', () => {
  it('restores modal isolation and scroll lock directly on disposal', async () => {
    const background = document.createElement('main')
    background.setAttribute('aria-hidden', 'false')

    const container = document.createElement('div')
    container.id = 'dialog-cleanup-app'
    document.body.append(background, container)

    const runtime = Effect.runFork(makeDialogProgram(container).start())
    const disconnectObserver = vi.spyOn(
      MutationObserver.prototype,
      'disconnect',
    )

    try {
      await vi.waitFor(() => {
        expect(background.inert).toBe(true)
        expect(background.getAttribute('aria-hidden')).toBe('true')
        expect(document.documentElement.style.overflow).toBe('hidden')
      })

      const latePortal = document.createElement('button')
      document.body.appendChild(latePortal)
      await vi.waitFor(() => expect(latePortal.inert).toBe(true))
      const disconnectCount = disconnectObserver.mock.calls.length

      await Effect.runPromise(Fiber.interrupt(runtime))

      expect(disconnectObserver.mock.calls.length).toBeGreaterThan(
        disconnectCount,
      )
      expect(background.inert).toBe(false)
      expect(background.getAttribute('aria-hidden')).toBe('false')
      expect(latePortal.inert).toBe(false)
      expect(latePortal.hasAttribute('aria-hidden')).toBe(false)
      expect(document.documentElement.style.overflow).not.toBe('hidden')
    } finally {
      await Effect.runPromise(Fiber.interrupt(runtime))
      disconnectObserver.mockRestore()
      document.body.innerHTML = ''
    }
  })

  it('does not release a later runtime’s dialog when a closed id is reused', async () => {
    const background = document.createElement('main')
    const firstContainer = document.createElement('div')
    firstContainer.id = 'first-dialog-app'
    document.body.append(background, firstContainer)

    const firstRuntime = Effect.runFork(
      makeDialogProgram(firstContainer).start(),
    )
    let secondRuntime: Fiber.Fiber<void, never> | undefined

    try {
      await vi.waitFor(() => expect(background.inert).toBe(true))

      const firstDialog = document.querySelector('#owned-dialog')
      expect(firstDialog).toBeInstanceOf(HTMLDialogElement)

      expect(await Effect.runPromise(Dom.closeDialog('#owned-dialog'))).toBe(
        true,
      )
      await Effect.runPromise(Dom.unlockScroll)
      firstDialog?.remove()

      expect(background.inert).toBe(false)

      const secondContainer = document.createElement('div')
      secondContainer.id = 'second-dialog-app'
      document.body.appendChild(secondContainer)
      secondRuntime = Effect.runFork(makeDialogProgram(secondContainer).start())

      await vi.waitFor(() => {
        expect(background.inert).toBe(true)
        expect(document.documentElement.style.overflow).toBe('hidden')
      })

      const secondDialog = document.querySelector('#owned-dialog')
      expect(secondDialog).toBeInstanceOf(HTMLDialogElement)

      await Effect.runPromise(Fiber.interrupt(firstRuntime))

      expect(background.inert).toBe(true)
      expect(document.documentElement.style.overflow).toBe('hidden')
      expect(secondDialog).toHaveProperty('open', true)

      await Effect.runPromise(Fiber.interrupt(secondRuntime))

      expect(background.inert).toBe(false)
      expect(document.documentElement.style.overflow).not.toBe('hidden')
    } finally {
      await Effect.runPromise(Fiber.interrupt(firstRuntime))
      if (secondRuntime !== undefined) {
        await Effect.runPromise(Fiber.interrupt(secondRuntime))
      }
      document.body.innerHTML = ''
    }
  })

  it('returns focus outside the runtime when disposing stacked dialogs', async () => {
    const trigger = document.createElement('button')
    trigger.id = 'external-trigger'
    const container = document.createElement('div')
    container.id = 'nested-dialog-app'
    document.body.append(trigger, container)
    trigger.focus()

    const runtime = Effect.runFork(makeNestedDialogProgram(container).start())

    try {
      await vi.waitFor(() => {
        expect(document.activeElement?.getAttribute('id')).toBe('child-button')
      })

      await Effect.runPromise(Fiber.interrupt(runtime))

      expect(document.activeElement).toBe(trigger)
      expect(document.documentElement.style.overflow).not.toBe('hidden')
    } finally {
      await Effect.runPromise(Fiber.interrupt(runtime))
      document.body.innerHTML = ''
    }
  })
})
