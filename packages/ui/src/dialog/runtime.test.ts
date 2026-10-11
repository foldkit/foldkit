import { Effect, Fiber, Option, Schema } from 'effect'
import * as Dom from 'foldkit/dom'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Runtime from 'foldkit/runtime'
import { modifyFields } from 'foldkit/struct'
import * as Update from 'foldkit/update'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  Message,
  Model,
  OutMessage,
  boot,
  init,
  update,
  view,
} from './index.js'

const dialogId = 'preserved-dialog'
const pageDialogId = 'page-dialog'

const PageModel = Schema.Struct({ maybeDialog: Schema.Option(Model) })
type PageModel = typeof PageModel.Type

const PageMessage = defineMessageUnion({
  ClickedOpenDialog: {},
  ClickedLeavePage: {},
  GotDialogMessage: { message: Message },
})
type PageMessage = typeof PageMessage.Type

const foldDialogOutMessage = OutMessage.match<
  Update.Step<PageModel, PageMessage>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({ model }),
})

const foldDialog = Update.foldChild({
  update,
  read: (model: PageModel) => model.maybeDialog,
  write: (model: PageModel, nextDialog: Model) =>
    modifyFields(model, { maybeDialog: () => Option.some(nextDialog) }),
  toParentMessage: (message: Message) =>
    PageMessage.GotDialogMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const makePageProgram = (container: HTMLElement) =>
  Runtime.makeElement({
    Model: PageModel,
    init: () => ({
      model: { maybeDialog: Option.some(init({ id: pageDialogId })) },
    }),
    update: (model: PageModel, message: PageMessage) =>
      PageMessage.match<Update.Return<PageModel, PageMessage>>(message, {
        ClickedOpenDialog: () => foldDialog(model, Message.RequestedOpen()),
        ClickedLeavePage: () => ({
          model: modifyFields(model, { maybeDialog: () => Option.none() }),
        }),
        GotDialogMessage: ({ message: dialogMessage }) =>
          foldDialog(model, dialogMessage),
      }),
    view: (model: PageModel, h: HtmlBuilder<PageMessage>) =>
      h.div(
        [],
        [
          h.button(
            [h.Id('open-dialog'), h.OnClick(PageMessage.ClickedOpenDialog())],
            ['Open'],
          ),
          h.button(
            [h.Id('leave-page'), h.OnClick(PageMessage.ClickedLeavePage())],
            ['Leave'],
          ),
          ...Option.match(model.maybeDialog, {
            onNone: () => [h.p([h.Id('next-page')], ['Next page'])],
            onSome: dialog => [
              h.submodel({
                slotId: 'dialog',
                model: dialog,
                view,
                viewInputs: {
                  toView: ({ dialog: dialogAttributes, title, panel }) =>
                    h.dialog(
                      [...dialogAttributes],
                      [
                        h.div(
                          [...panel],
                          [
                            h.h2([...title], ['Page Dialog']),
                            h.button([h.Id('page-dialog-button')], ['Close']),
                          ],
                        ),
                      ],
                    ),
                },
                toParentMessage: message =>
                  PageMessage.GotDialogMessage({ message }),
              }),
            ],
          }),
        ],
      ),
    container,
  })

const makeDialogProgram = (container: HTMLElement) =>
  Runtime.makeElement({
    Model,
    init: () => {
      const dialogBoot = boot({ id: dialogId })

      if (dialogBoot.commands === undefined) {
        return { model: dialogBoot.model }
      }

      return { model: dialogBoot.model, commands: dialogBoot.commands }
    },
    update: (model, message) => {
      const dialogUpdate = update(model, message)

      if (dialogUpdate.commands === undefined) {
        return { model: dialogUpdate.model }
      }

      return { model: dialogUpdate.model, commands: dialogUpdate.commands }
    },
    view: (model: Model, h: HtmlBuilder<Message>) =>
      view(
        model,
        {
          toView: ({ dialog, title, panel }) =>
            h.dialog(
              [...dialog],
              [
                h.div(
                  [...panel],
                  [
                    h.h2([...title], ['Preserved Dialog']),
                    h.button([h.Id('dialog-button')], ['Close']),
                  ],
                ),
              ],
            ),
        },
        h,
      ),
    container,
  })

describe('Dialog runtime lifecycle', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'getAnimations', {
      configurable: true,
      value: () => [],
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(HTMLElement.prototype, 'getAnimations')
    document.body.innerHTML = ''
  })

  it('reacquires modal resources for a preserved open Model', async () => {
    const background = document.createElement('main')
    const trigger = document.createElement('button')
    background.appendChild(trigger)
    const container = document.createElement('div')
    container.id = 'preserved-dialog-app'
    document.body.append(background, container)
    trigger.focus()

    const program = makeDialogProgram(container)
    const encodedOpenModel = Schema.encodeUnknownSync(
      Schema.toCodecJson(Model),
    )(boot({ id: dialogId }).model)
    const freshRuntime = Effect.runFork(program.start())
    let restoredRuntime: Fiber.Fiber<void, never> | undefined

    try {
      await vi.waitFor(() => {
        expect(background.inert).toBe(true)
        expect(document.documentElement.style.overflow).toBe('hidden')
        expect(document.activeElement?.getAttribute('id')).toBe('dialog-button')
      })

      await Effect.runPromise(Fiber.interrupt(freshRuntime))

      expect(background.inert).toBe(false)
      expect(document.documentElement.style.overflow).not.toBe('hidden')
      expect(document.activeElement).toBe(trigger)

      restoredRuntime = Effect.runFork(program.start(encodedOpenModel))

      await vi.waitFor(() => {
        const dialog = document.querySelector(`#${dialogId}`)
        expect(dialog).toBeInstanceOf(HTMLDialogElement)
        expect(dialog?.getAttribute('aria-modal')).toBe('true')
        expect(background.inert).toBe(true)
        expect(document.documentElement.style.overflow).toBe('hidden')
        expect(document.activeElement?.getAttribute('id')).toBe('dialog-button')
      })

      await Effect.runPromise(Fiber.interrupt(restoredRuntime))
      restoredRuntime = undefined

      expect(background.inert).toBe(false)
      expect(document.documentElement.style.overflow).not.toBe('hidden')
      expect(document.activeElement).toBe(trigger)
    } finally {
      await Effect.runPromise(Fiber.interrupt(freshRuntime))
      if (restoredRuntime !== undefined) {
        await Effect.runPromise(Fiber.interrupt(restoredRuntime))
      }
    }
  })

  it('finishes an enter animation restored without its Commands', async () => {
    const background = document.createElement('main')
    const trigger = document.createElement('button')
    background.appendChild(trigger)
    const container = document.createElement('div')
    container.id = 'preserved-animated-dialog-app'
    document.body.append(background, container)
    trigger.focus()

    const program = makeDialogProgram(container)
    const encodedEnteringModel = Schema.encodeUnknownSync(
      Schema.toCodecJson(Model),
    )(boot({ id: dialogId, isAnimated: true }).model)
    const runtime = Effect.runFork(program.start(encodedEnteringModel))

    try {
      await vi.waitFor(() => {
        const dialog = document.querySelector(`#${dialogId}`)
        const panel = document.querySelector(`#${dialogId}-panel`)
        expect(dialog).toBeInstanceOf(HTMLDialogElement)
        expect(dialog?.getAttribute('aria-modal')).toBe('true')
        expect(panel?.hasAttribute('data-transition')).toBe(false)
        expect(panel?.hasAttribute('data-closed')).toBe(false)
        expect(background.inert).toBe(true)
        expect(document.documentElement.style.overflow).toBe('hidden')
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(runtime))
    }

    expect(background.inert).toBe(false)
    expect(document.documentElement.style.overflow).not.toBe('hidden')
    expect(document.activeElement).toBe(trigger)
  })

  it('finishes a leave animation restored without its Commands', async () => {
    const background = document.createElement('main')
    const trigger = document.createElement('button')
    background.appendChild(trigger)
    const container = document.createElement('div')
    container.id = 'preserved-leaving-dialog-app'
    document.body.append(background, container)
    trigger.focus()

    const program = makeDialogProgram(container)
    const dialogClose = update(
      boot({ id: dialogId, isAnimated: true }).model,
      Message.RequestedClose(),
    )
    const leavingModel = modifyFields(dialogClose.model, {
      animation: animation =>
        modifyFields(animation, { transitionState: () => 'LeaveAnimating' }),
    })
    const encodedLeavingModel = Schema.encodeUnknownSync(
      Schema.toCodecJson(Model),
    )(leavingModel)
    const runtime = Effect.runFork(program.start(encodedLeavingModel))

    try {
      await vi.waitFor(() => {
        const dialog = document.querySelector(`#${dialogId}`)
        const panel = document.querySelector(`#${dialogId}-panel`)
        expect(dialog).toBeInstanceOf(HTMLDialogElement)
        expect(dialog?.hasAttribute('open')).toBe(false)
        expect(dialog?.hasAttribute('aria-modal')).toBe(false)
        expect(panel?.hasAttribute('data-transition')).toBe(false)
        expect(background.inert).toBe(false)
        expect(document.documentElement.style.overflow).not.toBe('hidden')
        expect(document.activeElement).toBe(trigger)
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(runtime))
    }
  })

  it('releases modal resources when the page that owns an open Dialog is removed', async () => {
    const container = document.createElement('div')
    container.id = 'page-dialog-app'
    document.body.append(container)

    const runtime = Effect.runFork(makePageProgram(container).start())

    try {
      await vi.waitFor(() => {
        expect(document.getElementById('open-dialog')).not.toBeNull()
      })
      document.getElementById('open-dialog')?.click()

      await vi.waitFor(() => {
        expect(document.documentElement.style.overflow).toBe('hidden')
        expect(document.activeElement?.getAttribute('id')).toBe(
          'page-dialog-button',
        )
      })

      document.getElementById('leave-page')?.click()

      await vi.waitFor(() => {
        expect(document.getElementById('next-page')).not.toBeNull()
        expect(document.documentElement.style.overflow).toBe('')
      })

      const escape = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      })
      document.body.dispatchEvent(escape)

      expect(escape.defaultPrevented).toBe(false)
      expect(
        await Effect.runPromise(Dom.releaseDialogResources(pageDialogId)),
      ).toBe(false)
    } finally {
      await Effect.runPromise(Fiber.interrupt(runtime))
    }
  })
})
