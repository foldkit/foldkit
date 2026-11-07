import { Context, Effect, Layer, Record, Schema } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { initAndInsert } from '../block/bindingInit.js'
import * as Block from '../block/public.js'
import { requireDispatch } from '../html/runtimeSingleton.js'
import { defineMessageUnion } from '../message/index.js'
import * as Update from '../update/index.js'
import * as ModelPreservationBridge from './modelPreservationBridge.js'
import * as Program from './programPublic.js'
import { embed } from './start.js'

type Controls = Readonly<{ events: Array<string> }>
class TestControls extends Context.Service<TestControls, Controls>()(
  'OccurrenceCancellation/Controls',
) {}

const ItemModel = Schema.Struct({ count: Schema.Number })
type ItemModel = typeof ItemModel.Type
const ItemMessage = defineMessageUnion({
  ClickedRemoveSelf: {},
  ClickedWait: {},
  ClickedCrash: {},
  ClickedWaitWithDefect: {},
  ClickedIncrement: {},
  CompletedWait: {},
})
const ItemOutMessage = defineMessageUnion({ RemovedSelf: {} })
const ItemKey = Symbol('CancelableOccurrenceItem')
const ItemDefinition = Block.makeDefinition('CancelableOccurrenceItem', {
  key: ItemKey,
  Model: ItemModel,
  Message: ItemMessage,
  OutMessage: ItemOutMessage,
  InitArgs: Schema.Tuple([]),
  effects: { services: [TestControls] },
  view: { kind: 'Element' },
})
const WaitForValue = ItemDefinition.makeCommand('WaitForValue', {
  messages: [ItemMessage.CompletedWait],
  handler: function* () {
    const { events } = yield* TestControls

    return () =>
      Effect.gen(function* () {
        events.push('started')
        return yield* Effect.never
      }).pipe(
        Effect.onInterrupt(() => Effect.sync(() => events.push('interrupted'))),
      )
  },
})
const Crash = ItemDefinition.makeCommand('Crash', {
  messages: [ItemMessage.CompletedWait],
  handler: function* () {
    return () => Effect.die(new Error('genuine command defect'))
  },
})
const WaitForBrokenCleanup = ItemDefinition.makeCommand(
  'WaitForBrokenCleanup',
  {
    messages: [ItemMessage.CompletedWait],
    handler: function* () {
      const { events } = yield* TestControls

      return () =>
        Effect.gen(function* () {
          events.push('started')
          return yield* Effect.never
        }).pipe(
          Effect.ensuring(Effect.die(new Error('command cleanup defect'))),
        )
    },
  },
)
const ItemComposition = ItemDefinition.makeComposition()
const ItemBlock = ItemDefinition.contract
const itemDispatches = new Map<string, (message: unknown) => void>()
const ItemImplementation = ItemDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: ItemComposition.makeInit(() => ({ model: { count: 0 } })),
    update: ItemComposition.makeUpdate({
      ClickedRemoveSelf: model => ({
        model,
        commands: [WaitForValue()],
        outMessage: ItemOutMessage.RemovedSelf(),
      }),
      ClickedWait: model => ({ model, commands: [WaitForValue()] }),
      ClickedCrash: model => ({ model, commands: [Crash()] }),
      ClickedWaitWithDefect: model => ({
        model,
        commands: [WaitForBrokenCleanup()],
      }),
      ClickedIncrement: ItemDefinition.makeFieldsStep(() => ({
        count: count => count + 1,
      })),
      CompletedWait: model => ({ model }),
    }),
    view: ItemComposition.makeView((model, h) => {
      itemDispatches.set('item', requireDispatch())

      return h.div(
        [],
        [
          h.button(
            [h.Id('remove-self'), h.OnClick(ItemMessage.ClickedRemoveSelf())],
            ['Remove self'],
          ),
          h.button(
            [h.Id('wait'), h.OnClick(ItemMessage.ClickedWait())],
            ['Wait'],
          ),
          h.button(
            [h.Id('crash'), h.OnClick(ItemMessage.ClickedCrash())],
            ['Crash'],
          ),
          h.button(
            [
              h.Id('broken-wait'),
              h.OnClick(ItemMessage.ClickedWaitWithDefect()),
            ],
            ['Broken wait'],
          ),
          h.span([h.Id('item-count')], [globalThis.String(model.count)]),
        ],
      )
    }),
    EffectsLayer: Layer.mergeAll(
      WaitForValue.layer,
      Crash.layer,
      WaitForBrokenCleanup.layer,
    ),
  }),
)

const RootModel = Schema.Struct({
  entries: Schema.Record(Schema.String, ItemBlock.Model),
  count: Schema.Number,
  isBufferRequested: Schema.Boolean,
  additions: Schema.Number,
})
const RootMessage = defineMessageUnion({
  ClickedRemove: {},
  ClickedAdd: {},
  ClickedIncrement: {},
  ClickedBuffer: {},
  ClickedWait: {},
  CompletedWait: {},
})
const RootKey = Symbol('CancelableOccurrenceRoot')
const RootDefinition = Block.makeDefinition('CancelableOccurrenceRoot', {
  key: RootKey,
  Model: RootModel,
  Message: RootMessage,
  InitArgs: Schema.Tuple([]),
  effects: { services: [TestControls] },
  view: { kind: 'Element' },
})
const WaitForRootValue = RootDefinition.makeCommand('WaitForRootValue', {
  messages: [RootMessage.CompletedWait],
  handler: function* () {
    const { events } = yield* TestControls

    return () =>
      Effect.gen(function* () {
        events.push('root started')
        return yield* Effect.never
      }).pipe(
        Effect.onInterrupt(() =>
          Effect.sync(() => events.push('root interrupted')),
        ),
      )
  },
})
const foldItemOutMessage = RootDefinition.makeOutMessageFold(ItemBlock, {
  RemovedSelf: () =>
    RootDefinition.makeFieldsStep(() => ({ entries: () => ({}) })),
})
const EntriesBinding = RootDefinition.makeRecordBinding(ItemBlock, {
  field: 'entries',
}).withOutMessagePolicy({
  fold: (_key, outMessage) => foldItemOutMessage(outMessage),
})
const RootComposition = RootDefinition.makeComposition({
  bindings: [EntriesBinding],
})
const addEntry = RootDefinition.makeStep(model =>
  initAndInsert(EntriesBinding, model, { key: 'same', args: [] }),
)
const RootBlock = RootDefinition.makeBlock(
  Effect.gen(function* () {
    const entries = yield* EntriesBinding
    const buffered = { didEmit: false }

    return {
      children: [entries],
      init: RootComposition.makeInit(() => ({
        model: {
          entries: {},
          count: 0,
          isBufferRequested: false,
          additions: 0,
        },
        steps: [addEntry],
      })),
      update: RootComposition.makeUpdate({
        ClickedRemove: RootDefinition.makeFieldsStep(() => ({
          entries: () => ({}),
        })),
        ClickedAdd: Update.combineSteps([
          addEntry,
          RootDefinition.makeFieldsStep(() => ({
            additions: additions => additions + 1,
          })),
        ]),
        ClickedIncrement: RootDefinition.makeFieldsStep(() => ({
          count: count => count + 1,
        })),
        ClickedWait: model => ({ model, commands: [WaitForRootValue()] }),
        CompletedWait: model => ({ model }),
        ClickedBuffer: RootDefinition.makeFieldsStep(() => ({
          isBufferRequested: () => true,
        })),
      }),
      view: RootComposition.makeView((model, h) => {
        const dispatch = requireDispatch()

        if (model.isBufferRequested && !buffered.didEmit) {
          const childDispatch = itemDispatches.get('item')
          if (childDispatch === undefined) {
            throw new Error('Missing child dispatch')
          }

          buffered.didEmit = true
          dispatch(RootMessage.ClickedRemove())
          dispatch(RootMessage.ClickedAdd())
          childDispatch(ItemMessage.ClickedIncrement())
        }

        return h.div(
          [],
          [
            h.button(
              [h.Id('remove'), h.OnClick(RootMessage.ClickedRemove())],
              ['Remove'],
            ),
            h.button(
              [h.Id('add'), h.OnClick(RootMessage.ClickedAdd())],
              ['Add'],
            ),
            h.button(
              [h.Id('increment'), h.OnClick(RootMessage.ClickedIncrement())],
              ['Increment'],
            ),
            h.button(
              [h.Id('buffer'), h.OnClick(RootMessage.ClickedBuffer())],
              ['Buffer'],
            ),
            h.button(
              [h.Id('root-wait'), h.OnClick(RootMessage.ClickedWait())],
              ['Root wait'],
            ),
            h.span([h.Id('root-count')], [globalThis.String(model.count)]),
            h.span([h.Id('additions')], [globalThis.String(model.additions)]),
            ...Record.toEntries(model.entries).map(([key, item]) =>
              h.block(
                EntriesBinding.embedView({ key, slotId: key, model: item }),
              ),
            ),
          ],
        )
      }),
      EffectsLayer: WaitForRootValue.layer,
    }
  }),
).provide(ItemImplementation.layer)

const click = (id: string): void => {
  const element = document.getElementById(id)
  if (element === null) {
    throw new Error(`Missing test button ${id}`)
  }

  element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

const start = async () => {
  const events: Array<string> = []
  const crashes: Array<Error> = []
  const container = document.createElement('div')
  container.id = 'occurrence-cancellation'
  const wrapper = document.createElement('section')
  wrapper.append(container)
  document.body.append(wrapper)
  const handle = embed(
    Program.makeElement({
      block: RootBlock,
      container,
      crash: {
        view: (_context, h) => h.div([], ['crashed']),
        report: ({ error }) => crashes.push(error),
      },
    }).provide({ services: Layer.succeed(TestControls, { events }) }),
  )

  await vi.waitFor(() =>
    expect(document.getElementById('item-count')?.textContent).toBe('0'),
  )

  return { events, crashes, handle, wrapper }
}

beforeEach(() => {
  vi.spyOn(ModelPreservationBridge, 'resolvePreservedModel').mockReturnValue(
    Effect.succeed(undefined),
  )
  vi.spyOn(performance, 'now').mockReturnValue(0)
})

afterEach(() => {
  vi.restoreAllMocks()
  itemDispatches.clear()
  document.body.innerHTML = ''
})

describe('occurrence Command cancellation', () => {
  it('does not start a Command whose own OutMessage retires its occurrence', async () => {
    const { events, crashes, handle } = await start()

    try {
      click('remove-self')
      await vi.waitFor(() =>
        expect(document.getElementById('item-count')).toBeNull(),
      )
      click('increment')
      await vi.waitFor(() =>
        expect(document.getElementById('root-count')?.textContent).toBe('1'),
      )
      expect(events).toEqual([])
      expect(crashes).toEqual([])
    } finally {
      await handle.dispose()
    }
  })

  it('interrupts a pending Command on removal without crashing the parent or replacement', async () => {
    const { events, crashes, handle } = await start()

    try {
      click('wait')
      await vi.waitFor(() => expect(events).toEqual(['started']))
      click('remove')
      await vi.waitFor(() => expect(events).toEqual(['started', 'interrupted']))
      click('add')
      click('increment')
      await vi.waitFor(() =>
        expect(document.getElementById('item-count')?.textContent).toBe('0'),
      )
      await vi.waitFor(() =>
        expect(document.getElementById('root-count')?.textContent).toBe('1'),
      )
      expect(crashes).toEqual([])
    } finally {
      await handle.dispose()
    }
  })

  it('keeps a parent Command alive while a child occurrence is retired', async () => {
    const { events, crashes, handle } = await start()

    try {
      click('root-wait')
      await vi.waitFor(() => expect(events).toEqual(['root started']))
      click('wait')
      await vi.waitFor(() =>
        expect(events).toEqual(['root started', 'started']),
      )
      click('remove')
      await vi.waitFor(() =>
        expect(events).toEqual(['root started', 'started', 'interrupted']),
      )
      click('increment')
      await vi.waitFor(() =>
        expect(document.getElementById('root-count')?.textContent).toBe('1'),
      )
      expect(crashes).toEqual([])
    } finally {
      await handle.dispose()
    }

    expect(events).toEqual([
      'root started',
      'started',
      'interrupted',
      'root interrupted',
    ])
  })

  it('still reports a genuine finalizer defect during occurrence retirement', async () => {
    const { events, crashes, handle, wrapper } = await start()

    try {
      click('broken-wait')
      await vi.waitFor(() => expect(events).toEqual(['started']))
      click('remove')
      await vi.waitFor(() => expect(wrapper.textContent).toBe('crashed'))
      expect(crashes).toHaveLength(1)
      expect(crashes).toEqual([new Error('command cleanup defect')])
    } finally {
      await handle.dispose()
    }
  })

  it('still reports genuine Command defects', async () => {
    const { crashes, handle, wrapper } = await start()

    try {
      click('crash')
      await vi.waitFor(() => expect(wrapper.textContent).toBe('crashed'))
      expect(crashes).toHaveLength(1)
      expect(crashes).toEqual([new Error('genuine command defect')])
    } finally {
      await handle.dispose()
    }
  })
})

describe('buffered occurrence dispatch', () => {
  it('discards a view Message buffered before removal and same-key recreation', async () => {
    const { crashes, handle } = await start()

    try {
      click('buffer')
      await vi.waitFor(() =>
        expect(document.getElementById('additions')?.textContent).toBe('1'),
      )
      await vi.waitFor(() =>
        expect(document.getElementById('item-count')?.textContent).toBe('0'),
      )
      click('increment')
      await vi.waitFor(() =>
        expect(document.getElementById('root-count')?.textContent).toBe('1'),
      )
      expect(document.getElementById('item-count')?.textContent).toBe('0')
      expect(crashes).toEqual([])
    } finally {
      await handle.dispose()
    }
  })
})
