import {
  Array,
  Context,
  Deferred,
  Effect,
  Function,
  Layer,
  Option,
  Queue,
  Schedule,
  Schema,
  Stream,
  String,
} from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { makeNamespace } from '../block/define.js'
import * as Block from '../block/public.js'
import { createKeyedLazy } from '../html/index.js'
import { requireDispatch } from '../html/runtimeSingleton.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as ModelPreservationBridge from './modelPreservationBridge.js'
import * as Program from './programPublic.js'
import { embed } from './start.js'

type Controls = Readonly<{
  read: (source: string) => Effect.Effect<string>
  streamStarted: (source: string) => void
  streamStopped: (source: string) => void
  acquired: (source: string) => void
  released: (source: string) => void
  waitForRelease: (source: string) => Effect.Effect<void>
  constructed: () => void
  mountStarted: (source: string) => void
  mountStopped: (source: string) => void
}>

class TestControls extends Context.Service<TestControls, Controls>()(
  'KeyedComposition/Controls',
) {}

const dispatches = new Map<string, (message: unknown) => void>()
const subscriptionEmitters = new Map<string, (value: string) => void>()

const ItemNamespace = makeNamespace('CollectionItem')
const ItemModel = Schema.Struct({
  id: Schema.Number,
  source: Schema.String,
  maybeObserved: Schema.Option(Schema.String),
})
type ItemModel = typeof ItemModel.Type
const ItemMessage = defineMessageUnion({
  ClickedReadValue: {},
  CompletedReadValue: { value: Schema.String },
  FailedReadValue: {},
  AcquiredValue: {},
  ReleasedValue: {},
  FailedAcquireValue: {},
  EmittedPulse: { value: Schema.String },
})
type ItemMessage = typeof ItemMessage.Type
const Value = ItemNamespace.makeResource<string>()('Value')
const ReadValue = ItemNamespace.makeCommand('ReadValue', {
  messages: [ItemMessage.CompletedReadValue, ItemMessage.FailedReadValue],
  handler: function* () {
    const controls = yield* TestControls
    controls.constructed()

    return () =>
      Value.get.pipe(
        Effect.flatMap(controls.read),
        Effect.map(value => ItemMessage.CompletedReadValue({ value })),
        Effect.catch(() => Effect.succeed(ItemMessage.FailedReadValue())),
      )
  },
})
const ObserveValue = ItemNamespace.makeMountStream('ObserveValue', {
  messages: [ItemMessage.EmittedPulse],
  handler: function* () {
    const controls = yield* TestControls

    return () =>
      Stream.unwrap(
        Value.get.pipe(
          Effect.retry({ schedule: Schedule.spaced('1 millis') }),
          Effect.orDie,
          Effect.map(source =>
            Stream.callback<never>(() =>
              Effect.acquireRelease(
                Effect.sync(() => controls.mountStarted(source)),
                () => Effect.sync(() => controls.mountStopped(source)),
              ).pipe(Effect.andThen(Effect.never)),
            ),
          ),
        ),
      )
  },
})
const ItemBaseDefinition = ItemNamespace.makeDefinition({
  Model: ItemModel,
  Message: ItemMessage,
})
const item = ItemBaseDefinition.makeComposition({ mounts: [ObserveValue] })
const subscriptions = ItemBaseDefinition.makeSubscriptions(entry => ({
  activePulse: entry(
    'ActivePulse',
    { source: Schema.String },
    {
      messages: [ItemMessage.EmittedPulse],
      modelToDependencies: model => ({ source: model.source }),
      handler: function* () {
        const controls = yield* TestControls

        return ({ source }) =>
          Stream.callback<typeof ItemMessage.EmittedPulse.Type>(queue =>
            Effect.acquireRelease(
              Effect.sync(() => {
                controls.streamStarted(source)
                subscriptionEmitters.set(source, value => {
                  Queue.offerUnsafe(queue, ItemMessage.EmittedPulse({ value }))
                })
              }),
              () => Effect.sync(() => controls.streamStopped(source)),
            ).pipe(Effect.andThen(Effect.never)),
          )
      },
    },
  ),
}))
const managedResources = ItemBaseDefinition.makeManagedResources(entry => ({
  value: entry(
    'Value',
    Schema.Option(Schema.Struct({ source: Schema.String })),
    {
      resource: Value,
      modelToMaybeRequirements: model => Option.some({ source: model.source }),
      onAcquired: () => ItemMessage.AcquiredValue(),
      onReleased: () => ItemMessage.ReleasedValue(),
      onAcquireError: () => ItemMessage.FailedAcquireValue(),
      handler: function* () {
        const controls = yield* TestControls

        return {
          acquire: ({ source }) =>
            Effect.sync(() => {
              controls.acquired(source)
              return source
            }),
          release: source =>
            Effect.sync(() => controls.released(source)).pipe(
              Effect.andThen(controls.waitForRelease(source)),
            ),
        }
      },
    },
  ),
}))
const ItemEffectsLayer = Layer.mergeAll(
  ReadValue.layer,
  ObserveValue.layer,
  subscriptions.activePulse.layer,
  managedResources.value.layer,
)
const itemImplementation = {
  init: (id: number, source: string) => ({
    model: { id, source, maybeObserved: Option.none<string>() },
  }),
  update: item.makeUpdate({
    ClickedReadValue: model => ({ model, commands: [ReadValue()] }),
    CompletedReadValue: (model, { value }) => ({
      model: modifyFields(model, { maybeObserved: () => Option.some(value) }),
    }),
    FailedReadValue: model => ({ model }),
    AcquiredValue: model => ({ model }),
    ReleasedValue: model => ({ model }),
    FailedAcquireValue: model => ({ model }),
    EmittedPulse: (model, { value }) => ({
      model: modifyFields(model, {
        maybeObserved: () => Option.some(value),
      }),
    }),
  }),
  view: item.makeView((model, h) => {
    dispatches.set(model.source, requireDispatch())
    return h.keyed('div')(
      globalThis.String(model.id),
      [h.OnMount(ObserveValue())],
      [
        h.button(
          [h.Id(`read-${model.id}`), h.OnClick(ItemMessage.ClickedReadValue())],
          ['Read'],
        ),
        h.span(
          [h.Id(`observed-${model.id}`)],
          [Option.getOrElse(model.maybeObserved, () => 'pending')],
        ),
      ],
    )
  }),
  subscriptions,
  managedResources,
  EffectsLayer: ItemEffectsLayer,
}
const prepareItemBlock = () => item.prepareBlock(itemImplementation)
const itemBlock: Block.FromAssemblyWithView<
  typeof ItemModel,
  typeof prepareItemBlock
> = Block.assemble(prepareItemBlock)

const RootModel = Schema.Struct({ entries: Schema.Array(ItemModel) })
type RootModel = typeof RootModel.Type
const RootMessage = defineMessageUnion({
  ClickedRemoveFirst: {},
  ClickedAddReplacement: {},
  ClickedRestoreFirst: {},
})
type RootMessage = typeof RootMessage.Type
const RootBaseDefinition = Block.makeDefinition('Application', {
  Model: RootModel,
  Message: RootMessage,
})
const EntriesBinding = RootBaseDefinition.makeBinding(itemBlock, {
  field: 'entries',
  key: 'id',
})
const root = RootBaseDefinition.makeComposition({
  bindings: [EntriesBinding],
})
const firstEntry = itemBlock.init(1, 'old').model
const rootInit = () => ({
  model: {
    entries: [firstEntry, itemBlock.init(2, 'other').model],
  },
})
const addReplacementStep = RootBaseDefinition.makeStep(model =>
  EntriesBinding.init({
    key: 1,
    args: [1, 'new'],
    toParentModel: entry =>
      modifyFields(model, {
        entries: Array.append(entry),
      }),
  }),
)
const restoreFirstStep = RootBaseDefinition.makeFieldsStep(() => ({
  entries: current => [...current, firstEntry],
}))
const rootUpdate = root.makeUpdate({
  ClickedRemoveFirst: model =>
    RootBaseDefinition.makeFieldsStep(() => ({
      entries: Array.filter(entry => entry.id !== 1),
    }))(model),
  ClickedAddReplacement: model => addReplacementStep(model),
  ClickedRestoreFirst: model => restoreFirstStep(model),
})
const lazyEntries = createKeyedLazy()
const entryRenderCounts = new Map<number, number>()
const renderEntry = (
  entry: ItemModel,
  h: Block.ViewBuilderFor<typeof root>,
) => {
  entryRenderCounts.set(entry.id, (entryRenderCounts.get(entry.id) ?? 0) + 1)
  return h.block(
    EntriesBinding.embedView({
      key: entry.id,
      slotId: `${entry.id}`,
      model: entry,
    }),
  )
}
const rootView = root.makeView((model, h) =>
  h.div(
    [],
    [
      h.button(
        [h.Id('remove-first'), h.OnClick(RootMessage.ClickedRemoveFirst())],
        ['Remove'],
      ),
      h.button(
        [
          h.Id('add-replacement'),
          h.OnClick(RootMessage.ClickedAddReplacement()),
        ],
        ['Add'],
      ),
      h.button(
        [h.Id('restore-first'), h.OnClick(RootMessage.ClickedRestoreFirst())],
        ['Restore'],
      ),
      ...model.entries.map(entry =>
        lazyEntries(entry.id, renderEntry, [entry, h]),
      ),
    ],
  ),
)

beforeEach(() => {
  vi.spyOn(ModelPreservationBridge, 'resolvePreservedModel').mockReturnValue(
    Effect.succeed(undefined),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  dispatches.clear()
  subscriptionEmitters.clear()
  entryRenderCounts.clear()
})

const click = (id: string): void => {
  const element = document.getElementById(id)
  if (element === null) {
    throw new Error(`Missing test button ${id}`)
  }
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

describe('keyed Block occurrences', () => {
  it('refreshes a memoized child view when the same Model object is reinserted', async () => {
    const reads: Array<string> = []
    const controls: Controls = {
      read: source =>
        Effect.sync(() => {
          reads.push(source)
          return source
        }),
      streamStarted: Function.constVoid,
      streamStopped: Function.constVoid,
      acquired: Function.constVoid,
      released: Function.constVoid,
      waitForRelease: () => Effect.void,
      constructed: Function.constVoid,
      mountStarted: Function.constVoid,
      mountStopped: Function.constVoid,
    }
    const container = document.createElement('div')
    container.id = 'memoized-keyed-composition'
    document.body.append(container)

    const prepare = () =>
      root.prepareBlock({
        init: rootInit,
        update: rootUpdate,
        view: rootView,
        EffectsLayer: Layer.empty,
      })
    const completedBlock: Block.FromAssemblyWithView<
      typeof RootModel,
      typeof prepare
    > = Block.assemble(prepare)
    const element = Program.makeElement({
      block: completedBlock,
      container,
    })
    const provideControls = element.provide
    const application = provideControls(Layer.succeed(TestControls, controls))
    const handle = embed(application)

    try {
      await vi.waitFor(() =>
        expect(document.getElementById('read-1')).not.toBeNull(),
      )
      expect(entryRenderCounts).toEqual(
        new Map([
          [1, 1],
          [2, 1],
        ]),
      )

      click('remove-first')
      await vi.waitFor(() =>
        expect(document.getElementById('read-1')).toBeNull(),
      )
      expect(entryRenderCounts.get(2)).toBe(1)
      click('restore-first')
      await vi.waitFor(() =>
        expect(document.getElementById('read-1')).not.toBeNull(),
      )
      expect(entryRenderCounts).toEqual(
        new Map([
          [1, 2],
          [2, 1],
        ]),
      )
      click('read-1')

      await vi.waitFor(() => expect(reads).toEqual(['old']))
    } finally {
      handle.dispose()
    }
  })

  it('shares constructors while isolating resource slots, cleanup, and reused-key results', async () => {
    const starts: Array<string> = []
    const stops: Array<string> = []
    const acquired: Array<string> = []
    const released: Array<string> = []
    const reads: Array<string> = []
    const interrupted: Array<string> = []
    const mountsStarted: Array<string> = []
    const mountsStopped: Array<string> = []
    const waiting = new Map<string, Deferred.Deferred<void>>()
    let constructions = 0
    const controls: Controls = {
      constructed: () => {
        constructions += 1
      },
      mountStarted: source => {
        mountsStarted.push(source)
      },
      mountStopped: source => {
        mountsStopped.push(source)
      },
      streamStarted: source => {
        starts.push(source)
      },
      streamStopped: source => {
        stops.push(source)
      },
      acquired: source => {
        acquired.push(source)
      },
      released: source => {
        released.push(source)
      },
      waitForRelease: () => Effect.void,
      read: source =>
        Effect.gen(function* () {
          const ready = Deferred.makeUnsafe<void>()
          waiting.set(source, ready)
          reads.push(source)
          yield* Deferred.await(ready)
          return source
        }).pipe(
          Effect.onInterrupt(() =>
            Effect.sync(() => {
              interrupted.push(source)
            }),
          ),
        ),
    }
    const container = document.createElement('div')
    container.id = 'keyed-composition'
    document.body.append(container)

    const prepare = () =>
      root.prepareBlock({
        init: rootInit,
        update: rootUpdate,
        view: rootView,
        EffectsLayer: Layer.empty,
      })
    const completedBlock: Block.FromAssemblyWithView<
      typeof RootModel,
      typeof prepare
    > = Block.assemble(prepare)
    const application = Program.makeElement({
      block: completedBlock,
      container,
    }).provide(Layer.succeed(TestControls, controls))
    const handle = embed(application)

    try {
      await vi.waitFor(() => {
        expect(acquired).toEqual(['old', 'other'])
        expect(starts).toEqual(['old', 'other'])
        expect(mountsStarted).toEqual(['old', 'other'])
      })
      expect(constructions).toBe(1)
      click('read-1')
      click('read-2')
      await vi.waitFor(() => expect(reads).toEqual(['old', 'other']))
      const staleDispatch = dispatches.get('old')!
      click('remove-first')
      click('add-replacement')
      await vi.waitFor(() => {
        expect(acquired).toEqual(['old', 'other', 'new'])
        expect(released).toEqual(['old'])
        expect(stops).toEqual(['old'])
        expect(starts).toEqual(['old', 'other', 'new'])
        expect(mountsStopped).toEqual(['old'])
        expect(mountsStarted).toEqual(['old', 'other', 'new'])
      })
      expect(interrupted).toEqual([])
      staleDispatch(ItemMessage.ClickedReadValue())
      expect(reads).toEqual(['old', 'other'])
      subscriptionEmitters.get('new')!('fresh pulse')
      await vi.waitFor(() => {
        expect(document.getElementById('observed-1')?.textContent).toBe(
          'fresh pulse',
        )
      })
      subscriptionEmitters.get('old')!('stale pulse')
      await Effect.runPromise(Effect.sleep('10 millis'))
      expect(document.getElementById('observed-1')?.textContent).toBe(
        'fresh pulse',
      )
      click('read-1')
      await vi.waitFor(() => expect(reads).toEqual(['old', 'other', 'new']))
      for (const ready of waiting.values()) {
        Effect.runSync(Deferred.succeed(ready, undefined))
      }
      await vi.waitFor(() => {
        expect(document.getElementById('observed-1')?.textContent).toBe('new')
        expect(document.getElementById('observed-2')?.textContent).toBe('other')
      })
      expect(constructions).toBe(1)
    } finally {
      handle.dispose()
    }
    await vi.waitFor(() => {
      expect(Array.sort(released, String.Order)).toEqual([
        'new',
        'old',
        'other',
      ])
      expect(Array.sort(stops, String.Order)).toEqual(['new', 'old', 'other'])
      expect(Array.sort(mountsStopped, String.Order)).toEqual([
        'new',
        'old',
        'other',
      ])
    })
  })

  it('waits for same-key cleanup before starting the latest replacement Mount', async () => {
    const releaseOld = Deferred.makeUnsafe<void>()
    const acquired: Array<string> = []
    const released: Array<string> = []
    const mountsStarted: Array<string> = []
    const mountsStopped: Array<string> = []
    const controls: Controls = {
      read: source => Effect.succeed(source),
      streamStarted: Function.constVoid,
      streamStopped: Function.constVoid,
      acquired: source => {
        acquired.push(source)
      },
      released: source => {
        released.push(source)
      },
      waitForRelease: source =>
        source === 'old' ? Deferred.await(releaseOld) : Effect.void,
      constructed: Function.constVoid,
      mountStarted: source => {
        mountsStarted.push(source)
      },
      mountStopped: source => {
        mountsStopped.push(source)
      },
    }
    const container = document.createElement('div')
    container.id = 'keyed-mount-barrier'
    document.body.append(container)

    const prepare = () =>
      root.prepareBlock({
        init: rootInit,
        update: rootUpdate,
        view: rootView,
        EffectsLayer: Layer.empty,
      })
    const completedBlock: Block.FromAssemblyWithView<
      typeof RootModel,
      typeof prepare
    > = Block.assemble(prepare)
    const application = Program.makeElement({
      block: completedBlock,
      container,
    }).provide(Layer.succeed(TestControls, controls))
    const handle = embed(application)

    try {
      await vi.waitFor(() => {
        expect(acquired).toEqual(['old', 'other'])
        expect(mountsStarted).toEqual(['old', 'other'])
      })

      click('remove-first')
      await vi.waitFor(() => {
        expect(released).toEqual(['old'])
        expect(mountsStopped).toEqual(['old'])
      })

      click('add-replacement')
      await vi.waitFor(() =>
        expect(document.getElementById('observed-1')).not.toBeNull(),
      )
      expect(acquired).toEqual(['old', 'other'])
      expect(mountsStarted).toEqual(['old', 'other'])

      click('remove-first')
      await vi.waitFor(() =>
        expect(document.getElementById('observed-1')).toBeNull(),
      )
      click('add-replacement')
      await vi.waitFor(() =>
        expect(document.getElementById('observed-1')).not.toBeNull(),
      )
      expect(acquired).toEqual(['old', 'other'])
      expect(mountsStarted).toEqual(['old', 'other'])

      Effect.runSync(Deferred.succeed(releaseOld, undefined))
      await vi.waitFor(() => {
        expect(acquired).toEqual(['old', 'other', 'new'])
        expect(mountsStarted).toEqual(['old', 'other', 'new'])
      })
    } finally {
      handle.dispose()
    }
    await vi.waitFor(() => {
      expect(Array.sort(released, String.Order)).toEqual([
        'new',
        'old',
        'other',
      ])
      expect(Array.sort(mountsStopped, String.Order)).toEqual([
        'new',
        'old',
        'other',
      ])
    })
  })
})
