import { Effect, Fiber, Option, Schema } from 'effect'
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

const ParentModel = Schema.Struct({
  dialog: Model,
  isShowingDialog: Schema.Boolean,
})
type ParentModel = typeof ParentModel.Type

const ParentMessage = defineMessageUnion({
  ClickedHideDialog: {},
  ClickedPing: {},
  GotDialogMessage: { message: Message },
})
type ParentMessage = typeof ParentMessage.Type

const foldDialogOutMessage = OutMessage.match<
  Update.Step<ParentModel, ParentMessage>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({ model }),
})

const foldDialog = Update.foldChild({
  update,
  read: (model: ParentModel) => Option.some(model.dialog),
  write: (model, nextDialog) =>
    modifyFields(model, { dialog: () => nextDialog }),
  toParentMessage: message => ParentMessage.GotDialogMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const makeRecordingParentProgram = (
  container: HTMLElement,
  dialogInit: Update.ReturnWithOutMessage<Model, Message, OutMessage>,
  receivedMessages: Array<ParentMessage>,
) =>
  Runtime.makeElement({
    Model: ParentModel,
    init: () =>
      Update.foldChildInit(dialogInit, {
        toParentModel: dialog => ({ dialog, isShowingDialog: true }),
        toParentMessage: message => ParentMessage.GotDialogMessage({ message }),
        foldOutMessage: foldDialogOutMessage,
      }),
    update: (model, message) => {
      receivedMessages.push(message)

      return ParentMessage.match<Update.Return<ParentModel, ParentMessage>>(
        message,
        {
          ClickedHideDialog: () => ({
            model: modifyFields(model, { isShowingDialog: () => false }),
          }),
          ClickedPing: () => ({ model }),
          GotDialogMessage: ({ message: dialogMessage }) =>
            foldDialog(model, dialogMessage),
        },
      )
    },
    view: (model: ParentModel, h: HtmlBuilder<ParentMessage>) =>
      h.div(
        [],
        [
          h.button(
            [h.Id('hide-dialog'), h.OnClick(ParentMessage.ClickedHideDialog())],
            ['Hide'],
          ),
          h.button(
            [h.Id('ping'), h.OnClick(ParentMessage.ClickedPing())],
            ['Ping'],
          ),
          model.isShowingDialog
            ? h.submodel({
                slotId: model.dialog.id,
                model: model.dialog,
                view,
                viewInputs: {
                  toView: ({ dialog }) => h.dialog([...dialog]),
                },
                toParentMessage: message =>
                  ParentMessage.GotDialogMessage({ message }),
              })
            : h.empty,
        ],
      ),
    container,
  })

const unmountedMessage = ParentMessage.GotDialogMessage({
  message: Message.Unmounted(),
})

const clickElementById = (id: string): void => {
  const element = document.getElementById(id)
  if (!(element instanceof HTMLElement)) {
    throw new Error(`expected an element with id ${id}`)
  }
  element.click()
}

const receivedMessagesThroughRemoval = async (
  dialogInit: Update.ReturnWithOutMessage<Model, Message, OutMessage>,
): Promise<ReadonlyArray<ParentMessage>> => {
  const container = document.createElement('div')
  container.id = 'removable-dialog-app'
  document.body.append(container)
  const receivedMessages: Array<ParentMessage> = []
  const runtime = Effect.runFork(
    makeRecordingParentProgram(container, dialogInit, receivedMessages).start(),
  )

  try {
    await vi.waitFor(() => {
      expect(document.getElementById(dialogId)).toBeInstanceOf(
        HTMLDialogElement,
      )
    })

    clickElementById('hide-dialog')
    await vi.waitFor(() => {
      expect(document.getElementById(dialogId)).toBeNull()
    })

    clickElementById('ping')
    await vi.waitFor(() => {
      expect(receivedMessages).toContainEqual(ParentMessage.ClickedPing())
    })

    return receivedMessages
  } finally {
    await Effect.runPromise(Fiber.interrupt(runtime))
  }
}

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

  it('maps the showDialog Escape signal to RequestedClose', async () => {
    const container = document.createElement('div')
    container.id = 'escape-dialog-app'
    document.body.append(container)
    const runtime = Effect.runFork(makeDialogProgram(container).start())

    try {
      await vi.waitFor(() => {
        expect(
          document.getElementById(dialogId)?.getAttribute('aria-modal'),
        ).toBe('true')
      })

      const escapeSignal = new CustomEvent('cancel', { cancelable: true })
      document.getElementById(dialogId)?.dispatchEvent(escapeSignal)

      expect(escapeSignal.defaultPrevented).toBe(true)
      await vi.waitFor(() => {
        const dialog = document.getElementById(dialogId)
        expect(dialog).toBeInstanceOf(HTMLDialogElement)
        expect(dialog?.hasAttribute('aria-modal')).toBe(false)
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(runtime))
    }
  })

  it('prevents a native cancel event without closing the dialog', async () => {
    const container = document.createElement('div')
    container.id = 'native-cancel-dialog-app'
    document.body.append(container)
    const receivedMessages: Array<ParentMessage> = []
    const runtime = Effect.runFork(
      makeRecordingParentProgram(
        container,
        boot({ id: dialogId }),
        receivedMessages,
      ).start(),
    )

    try {
      await vi.waitFor(() => {
        expect(
          document.getElementById(dialogId)?.getAttribute('aria-modal'),
        ).toBe('true')
      })

      const nativeCancel = new Event('cancel', { cancelable: true })
      document.getElementById(dialogId)?.dispatchEvent(nativeCancel)

      expect(nativeCancel.defaultPrevented).toBe(true)

      clickElementById('ping')
      await vi.waitFor(() => {
        expect(receivedMessages).toContainEqual(ParentMessage.ClickedPing())
      })

      expect(receivedMessages).not.toContainEqual(
        ParentMessage.GotDialogMessage({ message: Message.RequestedClose() }),
      )
      expect(
        document.getElementById(dialogId)?.getAttribute('aria-modal'),
      ).toBe('true')
    } finally {
      await Effect.runPromise(Fiber.interrupt(runtime))
    }
  })

  it('dispatches Unmounted when an open dialog is removed', async () => {
    expect(
      await receivedMessagesThroughRemoval(boot({ id: dialogId })),
    ).toContainEqual(unmountedMessage)
  })

  it('does not dispatch Unmounted when a closed dialog is removed', async () => {
    expect(
      await receivedMessagesThroughRemoval({ model: init({ id: dialogId }) }),
    ).not.toContainEqual(unmountedMessage)
  })

  it('does not dispatch Unmounted when a dialog is removed after a failed show', async () => {
    const dialogShowFailed = update(
      boot({ id: dialogId }).model,
      Message.FailedShowDialog(),
    )

    expect(
      await receivedMessagesThroughRemoval({ model: dialogShowFailed.model }),
    ).not.toContainEqual(unmountedMessage)
  })
})
