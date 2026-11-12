import { Effect, Fiber, Schema } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { __htmlBuilder } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import type * as Update from '../update/index.js'
import { makeElement } from './makeElement.js'

const Message = defineMessageUnion({
  ChangedDigits: { value: Schema.String },
})
type Message = typeof Message.Type

const Model = Schema.Struct({ digits: Schema.String })
type Model = typeof Model.Type

const h = __htmlBuilder<Message>()

const DIGITS_ONLY = /^\d*$/

// NOTE: the runtime's drain budget is 5ms. With a 4ms cost on the mocked
// clock, two updates cross the budget and the third Message defers.
const OVER_BUDGET_UPDATE_COST_MS = 4
let fakeNow = 0
let updateCostMs = 0
let isRefusalANewModel = false

// NOTE: a refused edit returns the Model it was given, so the runtime sees
// no change and schedules no render.
const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  fakeNow += updateCostMs
  if (DIGITS_ONLY.test(message.value)) {
    return { model: { digits: message.value } }
  }
  return isRefusalANewModel ? { model: { digits: model.digits } } : { model }
}

const view = (model: Model) =>
  h.div(
    [],
    [
      h.input([
        h.Id('digits'),
        h.Value(model.digits),
        h.OnInput(value => Message.ChangedDigits({ value })),
      ]),
    ],
  )

let container: HTMLElement

beforeEach(() => {
  container = document.createElement('div')
  container.id = 'refused-input-app'
  fakeNow = 0
  updateCostMs = 0
  isRefusalANewModel = false
  document.body.appendChild(container)
})

afterEach(() => {
  document.body.innerHTML = ''
})

const startDigitsElement = async () => {
  const element = makeElement({
    Model,
    init: () => ({ model: { digits: '12' } }),
    update,
    view,
    container,
  })
  const fiber = Effect.runFork(element.start())
  const input = await vi.waitFor(() => {
    const rendered = document.getElementById('digits')
    if (!(rendered instanceof HTMLInputElement)) {
      throw new Error('The digits input has not rendered')
    }
    return rendered
  })

  const type = (value: string): void => {
    input.value = value
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }

  return {
    input,
    type,
    stop: () => Effect.runPromise(Fiber.interrupt(fiber)),
  }
}

describe('an edit the Model refuses', () => {
  it('returns the input to the rendered value without a render', async () => {
    const { input, type, stop } = await startDigitsElement()
    const frameSpy = vi.spyOn(window, 'requestAnimationFrame')

    try {
      type('12x')

      expect(input.value).toBe('12')
      expect(frameSpy).not.toHaveBeenCalled()
    } finally {
      frameSpy.mockRestore()
      await stop()
    }
  })

  it('leaves an accepted edit in the input until its render', async () => {
    const { input, type, stop } = await startDigitsElement()

    try {
      type('123')

      expect(input.value).toBe('123')
    } finally {
      await stop()
    }
  })

  it('leaves text an input method is composing until the composition ends', async () => {
    const { input, type, stop } = await startDigitsElement()

    try {
      input.dispatchEvent(
        new CompositionEvent('compositionstart', { bubbles: true }),
      )
      type('12あ')

      expect(input.value).toBe('12あ')

      input.dispatchEvent(
        new CompositionEvent('compositionend', { bubbles: true }),
      )

      expect(input.value).toBe('12')
    } finally {
      await stop()
    }
  })

  it('leaves an edit in the input while its Message waits in a deferred drain', async () => {
    const { input, type, stop } = await startDigitsElement()
    const nowSpy = vi
      .spyOn(performance, 'now')
      .mockImplementation(() => fakeNow)
    updateCostMs = OVER_BUDGET_UPDATE_COST_MS

    try {
      type('12x')
      type('12y')
      expect(input.value).toBe('12')

      type('12z')

      expect(input.value).toBe('12z')
      await vi.waitFor(() => {
        expect(input.value).toBe('12')
      })
    } finally {
      nowSpy.mockRestore()
      await stop()
    }
  })

  it('returns the input to the rendered value after the frame of a new Model with the same text', async () => {
    const { input, type, stop } = await startDigitsElement()
    isRefusalANewModel = true

    try {
      type('12x')

      expect(input.value).toBe('12x')
      await vi.waitFor(() => {
        expect(input.value).toBe('12')
      })
    } finally {
      await stop()
    }
  })
})
