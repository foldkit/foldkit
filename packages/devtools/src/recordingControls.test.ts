// @vitest-environment happy-dom
import {
  Array,
  Effect,
  Fiber,
  HashMap,
  Option,
  Schema,
  SubscriptionRef,
} from 'effect'
import * as Command from 'foldkit/command'
import { DEVTOOLS_HOST_ID, __setDevToolsOverlay } from 'foldkit/devtools-host'
import type { DevToolsStore } from 'foldkit/devtools-host'
import { defineMessageUnion } from 'foldkit/message'
import { makeElement } from 'foldkit/runtime'
import { modifyFields } from 'foldkit/struct'
import * as Subscription from 'foldkit/subscription'
import type * as Update from 'foldkit/update'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { createOverlay } from './overlay.js'

const Message = defineMessageUnion({
  Ticked: {},
  ClickedOther: {},
  ClickedCommand: {},
  CompletedWork: {},
})
type Message = typeof Message.Type
const Model = Schema.Struct({
  ticks: Schema.Number,
  others: Schema.Number,
  completed: Schema.Number,
})
type Model = typeof Model.Type
const CompleteWork = Command.define('CompleteWork', {
  messages: [Message.CompletedWork],
  execute: Effect.succeed(Message.CompletedWork()),
})
const EmitTick = Command.define('EmitTick', {
  messages: [Message.Ticked],
  execute: Effect.succeed(Message.Ticked()),
})
const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    Ticked: () => ({
      model: modifyFields(model, { ticks: count => count + 1 }),
      commands: [CompleteWork()],
    }),
    ClickedOther: () => ({
      model: modifyFields(model, { others: count => count + 1 }),
    }),
    ClickedCommand: () => ({ model, commands: [EmitTick()] }),
    CompletedWork: () => ({
      model: modifyFields(model, { completed: count => count + 1 }),
    }),
  })
const shadows = () => {
  const shadow = document.getElementById(DEVTOOLS_HOST_ID)?.shadowRoot
  if (!shadow) {
    throw new Error('Expected DevTools shadow root')
  }
  return shadow
}
const waitFor = async (assertion: () => void) => {
  await vi.waitFor(assertion)
}
const clickControl = async (label: string) => {
  await waitFor(() =>
    expect(shadows().querySelector(`[aria-label="${label}"]`)).not.toBeNull(),
  )
  const button = shadows().querySelector(`[aria-label="${label}"]`)
  if (!(button instanceof HTMLElement)) {
    throw new Error(`Expected control ${label}`)
  }
  button.click()
}
const openOverlay = async () => {
  await waitFor(() =>
    expect(
      document
        .getElementById(DEVTOOLS_HOST_ID)
        ?.shadowRoot?.querySelector('.dt-badge'),
    ).not.toBeNull(),
  )
  const badge = shadows().querySelector('.dt-badge')
  if (!(badge instanceof HTMLElement)) {
    throw new Error('Expected badge')
  }
  badge.click()
}
const openSettings = async () => {
  await openOverlay()
  await clickControl('Settings')
  await waitFor(() =>
    expect(
      shadows().querySelector('[aria-label="Close settings"]'),
    ).not.toBeNull(),
  )
}
const startApp = async (
  options: {
    frameLimit?: number
    excludeFromHistory?: ReadonlyArray<string>
    mode?: 'Inspect' | 'TimeTravel'
  } = {},
) => {
  let maybeStore = Option.none<DevToolsStore>()
  __setDevToolsOverlay((store, position, mode, banner, recordingControls) => {
    maybeStore = Option.some(store)
    return createOverlay(store, position, mode, banner, recordingControls)
  })
  const container = document.createElement('div')
  container.id = 'recording-test-app'
  document.body.appendChild(container)
  const frameLimit = options.frameLimit ?? 0
  const runtime = makeElement({
    Model,
    init: () => ({ model: Model.make({ ticks: 0, others: 0, completed: 0 }) }),
    update,
    view: (model, h) =>
      h.div(
        [],
        [
          h.button([h.Id('tick'), h.OnClick(Message.Ticked())], ['Tick']),
          h.button(
            [h.Id('other'), h.OnClick(Message.ClickedOther())],
            ['Other'],
          ),
          h.button(
            [h.Id('command'), h.OnClick(Message.ClickedCommand())],
            ['Command'],
          ),
          h.span(
            [h.Id('counts')],
            [`${model.ticks}/${model.others}/${model.completed}`],
          ),
        ],
      ),
    subscriptions: Subscription.make<Model, Message>()(() => ({
      frame: Subscription.animationFrame({
        isActive: model => model.ticks < frameLimit,
        toMessage: () => Message.Ticked(),
      }),
    })),
    container,
    devTools: {
      show: 'Always',
      mode: options.mode ?? 'Inspect',
      keyframeInterval: 3,
      ...(options.excludeFromHistory !== undefined && {
        excludeFromHistory: options.excludeFromHistory,
      }),
    },
  })
  const fiber = Effect.runFork(runtime.start())
  await waitFor(() => expect(document.body.innerHTML).toContain('id="counts"'))
  const store = Option.getOrThrow(maybeStore)
  return {
    store,
    container: document.body,
    tags: () =>
      Array.map(
        Effect.runSync(SubscriptionRef.get(store.stateRef)).entries,
        entry => entry.tag,
      ),
    click: (id: string) => {
      const button = document.querySelector(`#${id}`)
      if (!(button instanceof HTMLElement)) {
        throw new Error(`Expected ${id}`)
      }
      button.click()
    },
    stop: () => Effect.runPromise(Fiber.interrupt(fiber)),
  }
}

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  })
  localStorage.clear()
})
afterEach(() => {
  vi.restoreAllMocks()
  __setDevToolsOverlay(undefined)
  document.body.innerHTML = ''
  document.head.innerHTML = ''
  localStorage.clear()
})

it('V1/V2 stops and resumes tag recording while updates and Commands continue', async () => {
  const app = await startApp()
  try {
    app.click('tick')
    await waitFor(() => expect(app.container.textContent).toContain('1/0/1'))
    await openSettings()
    await clickControl('Stop recording Ticked')
    await waitFor(() =>
      expect(
        shadows().querySelector('[aria-label="Resume recording Ticked"]'),
      ).not.toBeNull(),
    )
    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem('foldkit-devtools') ?? '{}')
          .excludedTags,
      ).toEqual(['Ticked']),
    )
    app.click('tick')
    app.click('command')
    app.click('other')
    await waitFor(() => expect(app.container.textContent).toContain('3/1/3'))
    expect(app.tags().filter(tag => tag === 'Ticked')).toHaveLength(1)
    expect(app.tags().filter(tag => tag === 'CompletedWork')).toHaveLength(3)
    expect(app.tags()).toContain('ClickedOther')
    await clickControl('Resume recording Ticked')
    await waitFor(() =>
      expect(
        shadows().querySelector('[aria-label="Stop recording Ticked"]'),
      ).not.toBeNull(),
    )
    app.click('tick')
    await waitFor(() =>
      expect(app.tags().filter(tag => tag === 'Ticked')).toHaveLength(2),
    )
  } finally {
    await app.stop()
  }
})

it('V3 installs persisted exclusions before the first frame and preserves settings', async () => {
  localStorage.setItem(
    'foldkit-devtools',
    JSON.stringify({
      isOpen: false,
      isFlattened: true,
      excludedTags: ['Ticked', 'Ticked'],
    }),
  )
  const app = await startApp({ frameLimit: 2 })
  try {
    await waitFor(() => expect(app.container.textContent).toContain('2/0/2'))
    expect(app.tags()).not.toContain('Ticked')
    await openSettings()
    await clickControl('Resume recording Ticked')
    await waitFor(() => {
      const persisted = JSON.parse(
        localStorage.getItem('foldkit-devtools') ?? '{}',
      )
      expect(persisted).toEqual({
        isOpen: true,
        isFlattened: true,
        excludedTags: [],
      })
    })
  } finally {
    await app.stop()
  }
})

it('V4 keeps configured exclusions locked and selected exclusions visible after Clear', async () => {
  const app = await startApp({ excludeFromHistory: ['Ticked'] })
  try {
    app.click('other')
    await openSettings()
    expect(shadows().textContent).toContain('Configured by application')
    const locked = shadows().querySelector(
      '[aria-label="Resume recording Ticked"]',
    )
    expect(locked?.getAttribute('disabled')).not.toBeNull()
    await clickControl('Stop recording ClickedOther')
    await Effect.runPromise(app.store.clear)
    await waitFor(() =>
      expect(
        shadows().querySelector('[aria-label="Resume recording ClickedOther"]'),
      ).not.toBeNull(),
    )
    app.click('tick')
    app.click('other')
    await waitFor(() => expect(app.container.textContent).toContain('1/2/1'))
    expect(app.tags()).not.toContain('Ticked')
    expect(app.tags()).not.toContain('ClickedOther')
  } finally {
    await app.stop()
  }
})

it('V9 keeps periodic keyframes with programmatic exclusions', async () => {
  const app = await startApp({ excludeFromHistory: ['Ticked'] })
  try {
    app.click('tick')
    await waitFor(() => expect(app.container.textContent).toContain('1/0/1'))
    app.click('other')
    await waitFor(() => expect(app.tags()).toHaveLength(2))
    const state = Effect.runSync(SubscriptionRef.get(app.store.stateRef))
    expect(HashMap.has(state.keyframes, 1)).toBe(false)
    expect(HashMap.has(state.keyframes, 2)).toBe(false)
    expect(Effect.runSync(app.store.getModelAtIndex(0))).toEqual({
      ticks: 1,
      others: 0,
      completed: 1,
    })
  } finally {
    await app.stop()
  }
})

it.each<'Inspect' | 'TimeTravel'>(['Inspect', 'TimeTravel'])(
  'V10 keeps the latest recorded Model fixed in %s mode',
  async mode => {
    const app = await startApp({
      mode,
      excludeFromHistory: ['Ticked', 'CompletedWork'],
    })
    try {
      app.click('other')
      await waitFor(() => expect(app.tags()).toEqual(['ClickedOther']))
      app.click('tick')
      await waitFor(() => expect(app.container.textContent).toContain('1/1/1'))
      expect(Effect.runSync(app.store.getModelAtIndex(0))).toEqual({
        ticks: 0,
        others: 1,
        completed: 0,
      })
      await openOverlay()
      await waitFor(() =>
        expect(shadows().querySelector('.message-list li')).not.toBeNull(),
      )
      const row = shadows().querySelector('.message-list li')
      if (!(row instanceof HTMLElement)) {
        throw new Error('Expected recorded row')
      }
      row.click()
      await waitFor(() =>
        expect(
          shadows().querySelector('.dt-inspector-pane')?.textContent,
        ).toMatch(/ticks:\s*0/),
      )
      if (mode === 'TimeTravel') {
        await waitFor(() =>
          expect(app.container.textContent).toContain('0/1/0'),
        )
        const resume = Array.findFirst(
          Array.fromIterable(shadows().querySelectorAll('button')),
          button => button.textContent === 'Resume →',
        )
        Option.getOrThrow(resume).click()
        await waitFor(() =>
          expect(app.container.textContent).toContain('1/1/1'),
        )
      } else {
        await waitFor(() =>
          expect(shadows().textContent).toContain('Follow Latest Recorded →'),
        )
        const followLatest = Array.findFirst(
          Array.fromIterable(shadows().querySelectorAll('button')),
          button => button.textContent === 'Follow Latest Recorded →',
        )
        Option.getOrThrow(followLatest).click()
        await waitFor(() =>
          expect(
            shadows().querySelector('.dt-inspector-pane')?.textContent,
          ).toMatch(/ticks:\s*0/),
        )
        expect(app.container.textContent).toContain('1/1/1')
      }
    } finally {
      await app.stop()
    }
  },
)

it('records frame Messages by default and recovers from corrupt persisted settings', async () => {
  localStorage.setItem('foldkit-devtools', '{')
  const app = await startApp({ frameLimit: 2 })
  try {
    await waitFor(() => expect(app.container.textContent).toContain('2/0/2'))
    expect(app.tags().filter(tag => tag === 'Ticked')).toHaveLength(2)
  } finally {
    await app.stop()
  }
})

it('records normally when local storage is unavailable', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Storage unavailable')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage unavailable')
  })
  const app = await startApp({ frameLimit: 1 })
  try {
    await waitFor(() => expect(app.container.textContent).toContain('1/0/1'))
    expect(app.tags()).toContain('Ticked')
    await openSettings()
    await clickControl('Stop recording Ticked')
    await waitFor(() =>
      expect(
        shadows().querySelector('[aria-label="Resume recording Ticked"]'),
      ).not.toBeNull(),
    )
    app.click('tick')
    await waitFor(() => expect(app.container.textContent).toContain('2/0/2'))
    expect(app.tags().filter(tag => tag === 'Ticked')).toHaveLength(1)
  } finally {
    await app.stop()
  }
})
