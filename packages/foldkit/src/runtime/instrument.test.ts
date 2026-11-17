import { Effect, Fiber, Number, Option, Result, Schema } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { __htmlBuilder } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import {
  type InstrumentConfig,
  type InstrumentFrame,
  __makeFrameRecorder,
  messageTagPath,
} from './instrument.js'
import { makeElement } from './makeElement.js'

const Inner = defineMessageUnion({ Toggled: {} })

const Message = defineMessageUnion({
  ClickedIncrement: {},
  ClickedKeep: {},
  GotPanel: { message: Inner },
})
type Message = typeof Message.Type

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedIncrement: () => ({
      model: modifyFields(model, { count: Number.increment }),
    }),
    ClickedKeep: () => ({ model }),
    GotPanel: () => ({ model }),
  })

const view = (model: Model) => {
  const h = __htmlBuilder<Message>()
  return h.div(
    [],
    [
      h.button(
        [h.Id('increment'), h.OnClick(Message.ClickedIncrement())],
        ['increment'],
      ),
      h.button([h.Id('keep'), h.OnClick(Message.ClickedKeep())], ['keep']),
      h.div([], [`count:${model.count}`]),
    ],
  )
}

let container: HTMLElement

beforeEach(() => {
  container = document.createElement('div')
  container.id = 'app'
  document.body.appendChild(container)
})

afterEach(() => {
  document.body.innerHTML = ''
})

const click = (id: string): void => {
  const button = document.getElementById(id)
  expect(button).not.toBeNull()
  button?.click()
}

const withApp = async (
  instrument: Omit<InstrumentConfig<Message>, 'onFrame'>,
  run: (frames: ReadonlyArray<InstrumentFrame<Message>>) => Promise<void>,
): Promise<void> => {
  const frames: Array<InstrumentFrame<Message>> = []
  const element = makeElement({
    Model,
    init: () => ({ model: { count: 0 } }),
    update,
    view,
    container,
    instrument: {
      ...instrument,
      onFrame: frame => {
        frames.push(frame)
      },
    },
  })
  const fiber = Effect.runFork(element.start())
  try {
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('count:0')
    })
    await run(frames)
  } finally {
    await Effect.runPromise(Fiber.interrupt(fiber))
  }
}

describe('instrument', () => {
  it('reports the initial render as a frame with no Messages', async () => {
    await withApp({}, async frames => {
      await vi.waitFor(() => {
        expect(frames[0]).toMatchObject({ messages: [], isRendered: true })
      })
    })
  })

  it('reports a clicked Message with its event, phase timings and paint', async () => {
    await withApp({}, async frames => {
      click('increment')
      await vi.waitFor(() => {
        expect(frames.some(({ messages }) => messages.length > 0)).toBe(true)
      })

      const frame = frames.find(({ messages }) => messages.length > 0)
      expect(frame?.messages).toEqual([
        expect.objectContaining({
          tag: 'ClickedIncrement',
          eventType: 'click',
        }),
      ])
      expect(frame?.isRendered).toBe(true)
      expect(frame?.paintEnd).toBeGreaterThanOrEqual(frame?.commitEnd ?? 0)
      expect(frame?.commitEnd).toBeGreaterThanOrEqual(frame?.startTime ?? 0)
      expect(frame?.durationMs).toBeGreaterThanOrEqual(
        (frame?.viewMs ?? 0) + (frame?.patchMs ?? 0),
      )
    })
  })

  it('reports a Message that keeps the Model at once, without a render', async () => {
    await withApp({}, async frames => {
      click('keep')
      await vi.waitFor(() => {
        expect(
          frames.find(({ messages }) => messages[0]?.tag === 'ClickedKeep'),
        ).toMatchObject({ isRendered: false, viewMs: 0, paintEnd: undefined })
      })
    })
  })

  it('skips frames faster than minDurationMs', async () => {
    await withApp({ minDurationMs: 60_000 }, async frames => {
      click('increment')
      await vi.waitFor(() => {
        expect(document.body.textContent).toContain('count:1')
      })
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(frames).toEqual([])
    })
  })

  it('builds no recorder for show Development outside development', () => {
    expect(
      Option.isNone(
        __makeFrameRecorder<Message>(
          { show: 'Development', onFrame: () => {} },
          false,
        ),
      ),
    ).toBe(true)
  })
})

describe('messageTagPath', () => {
  it('follows wrapped Submodel Messages', () => {
    expect(messageTagPath(Message.GotPanel({ message: Inner.Toggled() }))).toBe(
      'GotPanel>Toggled',
    )
  })

  it('stops at Option and Result payloads', () => {
    expect(
      messageTagPath({
        _tag: 'ChangedChartFocus',
        maybeKey: Option.some('p95'),
      }),
    ).toBe('ChangedChartFocus')
    expect(
      messageTagPath({ _tag: 'CompletedFetch', result: Result.succeed(1) }),
    ).toBe('CompletedFetch')
  })

  it('names an untagged value unknown', () => {
    expect(messageTagPath(42)).toBe('unknown')
  })
})
