import { Effect, Fiber, Layer, Schema } from 'effect'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as Command from '../command/index.js'
import { renderToString } from '../experimental/server/server.js'
import { defineMessageUnion } from '../message/index.js'
import { __startProgram } from '../runtime/start.js'
import { Block } from './block.js'
import { make } from './program.js'

const BUILD_ID = 'test-build-id'

const CounterMessage = defineMessageUnion({ ClickedIncrement: {} })

class Counter extends Block<Counter, { readonly start: number }>()('Counter', {
  Model: Schema.Struct({ count: Schema.Number }),
  Message: CounterMessage,
}) {}

const CounterLive = Counter.make(
  Effect.fn(function* (_id, { start }) {
    return {
      model: { count: start },
      update: {
        ClickedIncrement: model => ({ model: { count: model.count + 1 } }),
      },
      view: (model, h) =>
        h.button(
          [h.Id('increment'), h.OnClick(Counter.Message.ClickedIncrement())],
          [`${model.count}`],
        ),
    }
  }),
)

const Flags = Schema.Struct({ start: Schema.Number, owner: Schema.String })
type Flags = typeof Flags.Type

const PageMessage = defineMessageUnion({ CompletedGreet: {} })

const Greet = Command.define('Greet', {
  messages: [PageMessage.CompletedGreet],
})

class Page extends Block<Page, { readonly flags: Flags }>()('Page', {
  Model: Schema.Struct({
    owner: Schema.String,
    isGreeted: Schema.Boolean,
    counter: Counter,
  }),
  Message: PageMessage,
  Command: [Greet],
}) {}

const greetings: Array<string> = []

const PageLive = Page.make(
  Effect.fn(function* (_id, { flags }) {
    const counter = yield* new Counter('counter', { start: flags.start })
    return {
      model: { owner: flags.owner, isGreeted: false, counter },
      start: [Greet()],
      update: {
        CompletedGreet: model => ({ model: { ...model, isGreeted: true } }),
      },
      commands: {
        Greet: () =>
          Effect.sync(() => {
            greetings.push(flags.owner)
            return Page.Message.CompletedGreet()
          }),
      },
      view: (model, h) => ({
        title: `${model.owner}: ${model.counter.model.count}`,
        body: h.div(
          [],
          [
            h.p([h.Id('greeting')], [model.isGreeted ? 'Greeted' : 'Waiting']),
            model.counter.view(),
          ],
        ),
      }),
    }
  }),
).pipe(Layer.provide(CounterLive))

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Block program hydration', () => {
  it('adopts the server-rendered DOM, constructs from the Flags payload, and runs start Commands on the client', async () => {
    greetings.length = 0
    const rendered = await Effect.runPromise(
      renderToString(
        Page,
        { layer: PageLive, Flags },
        { flags: { start: 5, owner: 'server' }, buildId: BUILD_ID },
      ),
    )
    expect(rendered.title).toBe('server: 5')
    expect(greetings).toEqual([])

    document.body.innerHTML = rendered.html
    const serverButton = document.getElementById('increment')
    expect(serverButton?.textContent).toBe('5')
    expect(document.getElementById('greeting')?.textContent).toBe('Waiting')

    const program = make(Page, { layer: PageLive, Flags, container: null })
    const fiber = Effect.runFork(
      __startProgram(program, undefined, 'Hydrate', undefined, BUILD_ID),
    )

    try {
      await vi.waitFor(() =>
        expect(document.getElementById('greeting')?.textContent).toBe(
          'Greeted',
        ),
      )
      expect(greetings).toEqual(['server'])
      expect(document.getElementById('increment')).toBe(serverButton)

      serverButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await vi.waitFor(() => expect(serverButton?.textContent).toBe('6'))
      await vi.waitFor(() => expect(document.title).toBe('server: 6'))
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})
