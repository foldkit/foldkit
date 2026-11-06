import { Effect, Layer } from 'effect'
import { Scene as RootScene, Story as RootStory } from 'foldkit'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { expect, test } from 'vitest'

import { mappedTransition } from '../src/accepted.js'
import {
  ConstructionFailure,
  ConstructionSource,
  ContextBlock,
  CounterBinding,
  CounterBlock,
  CounterMessage,
  CounterOutMessage,
  ParentBlock,
  rawUpdate,
} from '../src/fixture.js'

const sourceLayer = (events: Array<string>) =>
  Layer.succeed(
    ConstructionSource,
    ConstructionSource.of({
      acquire: Effect.sync(() => {
        events.push('acquire')
      }),
      release: Effect.sync(() => {
        events.push('release')
      }),
    }),
  )

test('maps nested direct delivery through the selected acquired child graph', async () => {
  const events: Array<string> = []
  const transition = await Effect.runPromise(
    mappedTransition.pipe(Effect.provide(sourceLayer(events))),
  )
  expect(transition.model.group.child.count).toBe(5)
  expect(transition.model.group.lastCount).toBe(5)
  expect(events).toEqual(['acquire', 'release'])
})

test('ordinary Story remains synchronous and returns void', () => {
  const observed: Array<number> = []
  const result = Story.story(
    rawUpdate,
    Story.given(0),
    Story.message(CounterMessage.UpdatedCount({ value: 3 })),
    Story.model(model => {
      observed.push(model)
    }),
  )

  expect(result).toBeUndefined()
  expect(observed).toEqual([3])
})

test('ordinary Scene retains synchronous routing and view execution', () => {
  const result = Scene.scene(
    {
      update: rawUpdate,
      view: (model, h) =>
        h.button(
          [h.OnClick(CounterMessage.ClickedIncrement())],
          [`Count: ${model}`],
        ),
      routing: { onUrlChange: () => CounterMessage.UpdatedCount({ value: 5 }) },
    },
    Scene.given(0),
    Scene.click(Scene.role('button', { name: 'Count: 0' })),
    Scene.expect(Scene.text('Count: 1')).toExist(),
    Scene.Navigation.changedUrl('/next'),
    Scene.expect(Scene.text('Count: 5')).toExist(),
  )

  expect(result).toBeUndefined()
})

test('root and subpath test namespaces share Steps and scoped acquisition', () => {
  expect(RootStory.story).toBe(Story.story)
  expect(RootScene.scene).toBe(Scene.scene)
  expect(RootStory.init).toBe(Story.init)
  expect(RootScene.init).toBe(Scene.init)
  expect(RootStory.messageIn).toBe(Story.messageIn)
  expect(Scene.withBlock).toBe(Story.withBlock)
  expect(RootStory.withBlock).toBe(Story.withBlock)
  expect(RootScene.withBlock).toBe(Story.withBlock)
  expect(Story.given).toBe(RootStory.given)
  expect(Story.model).toBe(RootStory.model)
  expect(Story.Command).toBe(RootStory.Command)
  expect(Story.Subscription).toBe(RootStory.Subscription)
  expect(Scene.given).toBe(RootScene.given)
  expect(Scene.Command).toBe(RootScene.Command)
  expect(Scene.Subscription).toBe(RootScene.Subscription)
})

test('Block-aware Story is passive and keeps construction alive through its assertions', async () => {
  const events: Array<string> = []
  const scenario = RootStory.story(
    CounterBlock,
    Story.init('Counter'),
    Story.message(CounterMessage.UpdatedCount({ value: 2 })),
    Story.model(model => {
      expect(model.count).toBe(2)
      expect(events).toEqual(['acquire'])
      events.push('assert')
    }),
    Story.expectOutMessage(CounterOutMessage.ChangedCount({ value: 2 })),
  )

  expect(Effect.isEffect(scenario)).toBe(true)
  expect(events).toEqual([])
  await Effect.runPromise(scenario.pipe(Effect.provide(sourceLayer(events))))
  expect(events).toEqual(['acquire', 'assert', 'release'])

  const inspectionEvents: Array<string> = []
  const inspection = Story.withBlock(CounterBlock, block => {
    expect(inspectionEvents).toEqual(['acquire'])

    return block.init('Inspected')
  })

  expect(inspectionEvents).toEqual([])
  const initialized = await Effect.runPromise(
    inspection.pipe(Effect.provide(sourceLayer(inspectionEvents))),
  )
  expect(initialized.model).toEqual({ label: 'Inspected', count: 0 })
  expect(inspectionEvents).toEqual(['acquire', 'release'])
})

test('Block-aware Scene renders its acquired child and preserves OutMessages', async () => {
  const events: Array<string> = []
  const scenario = RootScene.scene(
    CounterBlock,
    Scene.init('Counter'),
    Scene.click(Scene.role('button', { name: 'Counter: 0' })),
    Scene.expect(Scene.text('Counter: 1')).toExist(),
    Scene.expectOutMessage(CounterOutMessage.ChangedCount({ value: 1 })),
  )

  expect(events).toEqual([])
  await Effect.runPromise(scenario.pipe(Effect.provide(sourceLayer(events))))
  expect(events).toEqual(['acquire', 'release'])
})

test('messageIn resolves the same passive step within each parent acquisition', async () => {
  const events: Array<string> = []
  const delivery = Story.messageIn(
    CounterBinding,
    CounterMessage.UpdatedCount({ value: 7 }),
  )
  const scenario = Story.story(
    ParentBlock,
    Story.init(),
    delivery,
    Story.model(model => {
      expect(model.child.count).toBe(7)
      expect(model.lastCount).toBe(7)
    }),
  )

  await Effect.runPromise(scenario.pipe(Effect.provide(sourceLayer(events))))
  await Effect.runPromise(scenario.pipe(Effect.provide(sourceLayer(events))))
  expect(events).toEqual(['acquire', 'release', 'acquire', 'release'])
})

test('Block-aware config retains exact update context and routing', async () => {
  await Effect.runPromise(
    Story.story(
      { block: ContextBlock, updateContext: [2] },
      Story.init(),
      Story.message(CounterMessage.UpdatedCount({ value: 4 })),
      Story.model(model => {
        expect(model.count).toBe(8)
      }),
    ),
  )
  await Effect.runPromise(
    Scene.scene(
      {
        block: ContextBlock,
        updateContext: [2],
        routing: {
          onUrlChange: () => CounterMessage.UpdatedCount({ value: 4 }),
        },
      },
      Scene.init(),
      Scene.Navigation.changedUrl('/next'),
      Scene.expect(Scene.text('Count: 8')).toExist(),
    ),
  )
})

test('construction failure retains its typed error without running release', async () => {
  const events: Array<string> = []
  const failure = new ConstructionFailure()
  const layer = Layer.succeed(
    ConstructionSource,
    ConstructionSource.of({
      acquire: Effect.fail(failure),
      release: Effect.sync(() => {
        events.push('release')
      }),
    }),
  )
  const result = await Effect.runPromise(
    Story.story(CounterBlock, Story.init('Counter')).pipe(
      Effect.provide(layer),
      Effect.flip,
    ),
  )

  expect(result).toBe(failure)
  expect(events).toEqual([])
})

test('erased invalid subjects receive useful errors', async () => {
  expect(() => Reflect.apply(Story.story, undefined, [0])).toThrow(
    'story requires',
  )
  expect(() => Reflect.apply(Scene.scene, undefined, [0])).toThrow(
    'scene requires',
  )
  expect(() =>
    Reflect.apply(Scene.scene, undefined, [
      { block: ContextBlock, update: rawUpdate, view: () => undefined },
      Scene.init(),
    ]),
  ).toThrow('selects either block or update and view')
  const invalidStory = Reflect.apply(Story.story, undefined, [{}, Story.init()])
  const invalidScene = Reflect.apply(Scene.scene, undefined, [{}, Scene.init()])

  await expect(Effect.runPromise(invalidStory)).rejects.toThrow(
    'original registered Block',
  )
  await expect(Effect.runPromise(invalidScene)).rejects.toThrow(
    'original registered Block',
  )
})
