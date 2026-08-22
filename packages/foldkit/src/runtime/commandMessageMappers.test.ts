import { Effect, Fiber, Match as M, Schema as S } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Command from '../command/index.js'
import { __htmlBuilder } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import { makeElement } from './runtime.js'

// CHILD

const ChildMessage = defineMessageUnion({
  CompletedDoChildWork: {},
})
type ChildMessage = typeof ChildMessage.Type

const DoChildWork = Command.define('DoChildWork', {
  messages: [ChildMessage.CompletedDoChildWork],
  execute: Effect.succeed(ChildMessage.CompletedDoChildWork()),
})

// PARENT

const Message = defineMessageUnion({
  GotChildMessage: { message: ChildMessage },
})
type Message = typeof Message.Type

const Model = S.Struct({ label: S.String })
type Model = typeof Model.Type

type UpdateReturn = Readonly<{
  model: Model
  commands?: ReadonlyArray<Command.Command<Message>>
  outMessage?: never
}>

const update = (_model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    GotChildMessage: ({ message: childMessage }) =>
      M.value(childMessage).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
          CompletedDoChildWork: () => ({ model: { label: 'child done' } }),
        }),
      ),
  })

const h = __htmlBuilder<Message>()

const view = (model: Model) => h.div([], [model.label])

const crash = {
  view: (context: Readonly<{ error: Error }>) =>
    h.div([], [`Crash view: ${context.error.message}`]),
}

let container: HTMLElement

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  container = document.createElement('div')
  container.id = 'app'
  document.body.appendChild(container)
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

const awaitBodyText = (text: string): Promise<void> =>
  vi.waitFor(() => {
    expect(document.body.textContent).toContain(text)
  })

describe('command message mappers', () => {
  it('dispatches a mapped Command result in the parent Message space', async () => {
    const element = makeElement({
      Model,
      init: () => ({
        model: { label: 'start' },
        commands: Command.mapMessages([DoChildWork()], childMessage =>
          Message.GotChildMessage({ message: childMessage }),
        ),
      }),
      update,
      view,
      crash,
      container,
    })

    const fiber = Effect.runFork(element.start())

    try {
      // DoChildWork resolves to CompletedDoChildWork (child Message).
      // Command.mapMessages lifts it into the parent's Message space, so update
      // receives GotChildMessage and sets the label. If the lift were lost, the
      // raw child Message would reach update, which does not handle it.
      await awaitBodyText('child done')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})
