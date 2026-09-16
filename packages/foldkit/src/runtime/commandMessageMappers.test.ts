import {
  Array,
  Effect,
  Fiber,
  Match,
  Option,
  Schema,
  SubscriptionRef,
  pipe,
} from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Command from '../command/index.js'
import type { DevToolsStore } from '../devTools/store.js'
import { __htmlBuilder } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import type * as Update from '../update/index.js'
import { __setDevToolsOverlay } from './devToolsConfig.js'
import { makeElement } from './makeElement.js'

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

const Model = Schema.Struct({ label: Schema.String })
type Model = typeof Model.Type

type UpdateReturn = Update.Return<Model, Message>

const update = (_model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    GotChildMessage: ({ message: childMessage }) =>
      Match.value(childMessage).pipe(
        Match.withReturnType<UpdateReturn>(),
        Match.tagsExhaustive({
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
  __setDevToolsOverlay(undefined)
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

const awaitBodyText = (text: string): Promise<void> =>
  vi.waitFor(() => {
    expect(document.body.textContent).toContain(text)
  })

const requireDevToolsStore = (
  maybeStore: DevToolsStore | null,
): DevToolsStore => {
  if (maybeStore === null) {
    throw new Error('DevTools store did not start')
  }
  return maybeStore
}

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

  it('attributes a nested dynamic lift only after the real result resolves', async () => {
    const ChildMessage = defineMessageUnion({
      CompletedChooseDestination: {
        target: Schema.Literals(['Editor', 'Viewer']),
      },
    })
    type ChildMessage = typeof ChildMessage.Type

    const MiddleMessage = defineMessageUnion({
      GotEditorMessage: { message: ChildMessage },
      GotViewerMessage: { message: ChildMessage },
    })
    type MiddleMessage = typeof MiddleMessage.Type

    const RootMessage = defineMessageUnion({
      GotPanelMessage: { message: MiddleMessage },
    })
    type RootMessage = typeof RootMessage.Type

    const DynamicModel = Schema.Struct({ label: Schema.String })
    type DynamicModel = typeof DynamicModel.Type
    type DynamicUpdateReturn = Update.Return<DynamicModel, RootMessage>

    const destination = {
      resolve: (_message: ChildMessage): void => {
        throw new Error('Command result resolver is not installed')
      },
    }
    const destinationPromise = new globalThis.Promise<ChildMessage>(resolve => {
      destination.resolve = message => resolve(message)
    })
    const ChooseDestination = Command.define('ChooseDestination', {
      messages: [ChildMessage.CompletedChooseDestination],
      execute: Effect.promise(() => destinationPromise).pipe(Effect.orDie),
    })

    let middleMapperCalls = 0
    let rootMapperCalls = 0
    let maybeStore: DevToolsStore | null = null
    __setDevToolsOverlay(store => {
      maybeStore = store
      return Effect.void
    })

    const dynamicH = __htmlBuilder<RootMessage>()
    const element = makeElement({
      Model: DynamicModel,
      init: () => ({
        model: { label: 'start' },
        commands: Command.mapMessages(
          Command.mapMessages([ChooseDestination()], childMessage => {
            middleMapperCalls++
            return childMessage.target === 'Editor'
              ? MiddleMessage.GotEditorMessage({ message: childMessage })
              : MiddleMessage.GotViewerMessage({ message: childMessage })
          }),
          middleMessage => {
            rootMapperCalls++
            return RootMessage.GotPanelMessage({ message: middleMessage })
          },
        ),
      }),
      update: (_model, message) =>
        RootMessage.match<DynamicUpdateReturn>(message, {
          GotPanelMessage: ({ message: middleMessage }) =>
            MiddleMessage.match<DynamicUpdateReturn>(middleMessage, {
              GotEditorMessage: () => ({ model: { label: 'editor done' } }),
              GotViewerMessage: () => ({ model: { label: 'viewer done' } }),
            }),
        }),
      view: model => dynamicH.div([], [model.label]),
      container,
      devTools: { show: 'Always' },
    })

    const fiber = Effect.runFork(element.start())

    try {
      await vi.waitFor(() => {
        expect(maybeStore).not.toBeNull()
      })
      const store = requireDevToolsStore(maybeStore)

      const pendingState = await Effect.runPromise(
        SubscriptionRef.get(store.stateRef),
      )
      const pendingCommand = pipe(
        pendingState.initCommands,
        Array.head,
        Option.getOrThrow,
      )
      expect(pendingCommand.maybeSubmodelPath).toEqual(Option.none())
      expect(middleMapperCalls).toBe(0)
      expect(rootMapperCalls).toBe(0)

      destination.resolve(
        ChildMessage.CompletedChooseDestination({ target: 'Viewer' }),
      )
      await awaitBodyText('viewer done')
      await vi.waitFor(async () => {
        const state = await Effect.runPromise(
          SubscriptionRef.get(store.stateRef),
        )
        const command = pipe(state.initCommands, Array.head, Option.getOrThrow)
        expect(command.maybeSubmodelPath).toEqual(
          Option.some(['GotPanelMessage', 'GotViewerMessage']),
        )
      })
      expect(middleMapperCalls).toBe(1)
      expect(rootMapperCalls).toBe(1)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('leaves an interrupted Command destination unresolved', async () => {
    const WaitForChild = Command.define('WaitForChild', {
      messages: [ChildMessage.CompletedDoChildWork],
      execute: Effect.never,
    })

    let mapperCalls = 0
    let maybeStore: DevToolsStore | null = null
    __setDevToolsOverlay(store => {
      maybeStore = store
      return Effect.void
    })

    const element = makeElement({
      Model,
      init: () => ({
        model: { label: 'start' },
        commands: Command.mapMessages([WaitForChild()], childMessage => {
          mapperCalls++
          return Message.GotChildMessage({ message: childMessage })
        }),
      }),
      update,
      view,
      container,
      devTools: { show: 'Always' },
    })
    const fiber = Effect.runFork(element.start())

    try {
      await vi.waitFor(async () => {
        const store = requireDevToolsStore(maybeStore)
        const state = await Effect.runPromise(
          SubscriptionRef.get(store.stateRef),
        )
        expect(Array.isReadonlyArrayNonEmpty(state.initCommands)).toBe(true)
      })

      const store = requireDevToolsStore(maybeStore)
      const pendingState = await Effect.runPromise(
        SubscriptionRef.get(store.stateRef),
      )
      const pendingCommand = pipe(
        pendingState.initCommands,
        Array.head,
        Option.getOrThrow,
      )
      expect(pendingCommand.maybeSubmodelPath).toEqual(Option.none())
      expect(mapperCalls).toBe(0)

      await Effect.runPromise(Fiber.interrupt(fiber))

      const interruptedState = await Effect.runPromise(
        SubscriptionRef.get(store.stateRef),
      )
      const interruptedCommand = pipe(
        interruptedState.initCommands,
        Array.head,
        Option.getOrThrow,
      )
      expect(interruptedCommand.maybeSubmodelPath).toEqual(Option.none())
      expect(mapperCalls).toBe(0)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})
