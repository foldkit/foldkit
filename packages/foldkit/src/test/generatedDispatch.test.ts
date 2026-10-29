import { Effect, Layer, Schema, Stream } from 'effect'
import { expect, it, vi } from 'vitest'

import { makeDefinition } from '../block/define.js'
import * as Block from '../block/public.js'
import { renderToString } from '../experimental/server/server.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Scene from './scene.js'
import * as Story from './story.js'

const constructHandler = vi.fn()
const executeHandler = vi.fn()
const ChildModel = Schema.Struct({ count: Schema.Number })
type ChildModel = typeof ChildModel.Type
const ChildMessage = defineMessageUnion({
  RequestedReadCount: {},
  CompletedReadCount: { count: Schema.Number },
  ObservedCount: { count: Schema.Number },
})
type ChildMessage = typeof ChildMessage.Type
const ChildDefinition = makeDefinition('GeneratedSimulationChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const ReadCount = ChildDefinition.makeCommand('ReadCount', {
  messages: [ChildMessage.CompletedReadCount],
  handler: function* () {
    yield* Effect.sync(constructHandler)

    return () =>
      Effect.sync(() => {
        executeHandler()
        return ChildMessage.CompletedReadCount({ count: 99 })
      })
  },
})
const subscriptions = ChildDefinition.makeSubscriptions(entry => ({
  observations: entry('Observations', {
    messages: [ChildMessage.ObservedCount],
    handler: function* () {
      yield* Effect.sync(constructHandler)

      return () => Stream.never
    },
  }),
}))
const ChildComposition = ChildDefinition.makeComposition()
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit(() => ({ model: { count: 0 } })),
    update: ChildComposition.makeUpdate({
      RequestedReadCount: model => ({ model, commands: [ReadCount()] }),
      CompletedReadCount: (model, { count }) => ({
        model: modifyFields(model, { count: () => count }),
      }),
      ObservedCount: (model, { count }) => ({
        model: modifyFields(model, { count: () => count }),
      }),
    }),
    view: ChildComposition.makeView((model, h) =>
      h.section(
        [],
        [
          h.button(
            [h.OnClick(ChildMessage.RequestedReadCount())],
            ['Read count'],
          ),
          h.output([], [globalThis.String(model.count)]),
        ],
      ),
    ),
    subscriptions,
    operations: { requestReadCount: ChildMessage.RequestedReadCount },
    EffectsLayer: Layer.merge(
      ReadCount.layer,
      subscriptions.observations.layer,
    ),
  })
const ChildBlock: Block.FromAssemblyWithView<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const ParentModel = Schema.Struct({ child: ChildBlock.Model })
type ParentModel = typeof ParentModel.Type
const ParentMessage = defineMessageUnion({ RequestedRefresh: {} })
type ParentMessage = typeof ParentMessage.Type
const ParentDefinition = makeDefinition('GeneratedSimulationParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
const ChildBinding = ParentDefinition.makeBinding(ChildBlock, {
  field: 'child',
})
const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ChildBinding],
})
const prepareParentBlock = () =>
  ParentComposition.prepareBlock({
    init: ParentComposition.makeInit(() => ({ model: {} })),
    update: ParentComposition.makeUpdate({
      RequestedRefresh: model => ChildBinding.requestReadCount()(model),
    }),
    view: ParentComposition.makeView((model, h) =>
      h.block(ChildBinding.embedView({ slotId: 'child', model: model.child })),
    ),
    operations: { requestRefresh: ParentMessage.RequestedRefresh },
  })
const ParentBlock: Block.FromAssemblyWithView<
  typeof ParentModel,
  typeof prepareParentBlock
> = Block.assemble(prepareParentBlock)

const Model = Schema.Struct({ parent: ParentBlock.Model })
type Model = typeof Model.Type
const Message = defineMessageUnion({ RequestedRefresh: {} })
type Message = typeof Message.Type
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
const ParentBinding = ApplicationDefinition.makeBinding(ParentBlock, {
  field: 'parent',
})
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [ParentBinding],
})
const init = ApplicationComposition.makeInit(() => ({ model: {} }))
const update = ApplicationComposition.makeUpdate({
  RequestedRefresh: model => ParentBinding.requestRefresh()(model),
})
const view = ApplicationComposition.makeView((model, h) => ({
  title: 'Generated dispatch',
  body: h.main(
    [],
    [
      h.block(
        ParentBinding.embedView({ slotId: 'parent', model: model.parent }),
      ),
    ],
  ),
}))
const sceneSubscriptions = Scene.subscriptions(ApplicationComposition)
const localSubscriptions = ApplicationDefinition.makeSubscriptions(entry => ({
  refresh: entry('Refresh', { messages: [Message.RequestedRefresh] }),
}))

const ForeignDefinition = makeDefinition('GeneratedSimulationForeign', {
  Model: ChildModel,
  Message: ChildMessage,
})
const foreignSubscriptions = ForeignDefinition.makeSubscriptions(entry => ({
  observations: entry('Observations', {
    messages: [ChildMessage.ObservedCount],
  }),
}))

if (false) {
  Scene.scene(
    { update, view, subscriptions: sceneSubscriptions },
    Scene.given(Model.make({ parent: { child: { count: 0 } } })),
    // @ts-expect-error Matching Message payloads do not grant a foreign Subscription entry access.
    Scene.Subscription.emit(
      foreignSubscriptions.observations,
      ChildMessage.ObservedCount({ count: 1 }),
    ),
  )
}

it('resolves a nested generated child Command in a Story using its raw result', () => {
  Story.story(
    update,
    Story.given(init().model),
    Story.message(Message.RequestedRefresh()),
    Story.Command.expectHas(ReadCount),
    Story.Command.resolve(
      ReadCount,
      ChildMessage.CompletedReadCount({ count: 7 }),
    ),
    Story.model(model => {
      expect(model.parent.child.count).toBe(7)
    }),
  )

  expect(constructHandler).not.toHaveBeenCalled()
  expect(executeHandler).not.toHaveBeenCalled()
})

it('routes rendered child events and resolves generated Command results in a Scene', () => {
  Scene.scene(
    { update, view },
    Scene.given(init().model),
    Scene.click(Scene.role('button', { name: 'Read count' })),
    Scene.Command.resolve(
      ReadCount,
      ChildMessage.CompletedReadCount({ count: 8 }),
    ),
    Scene.expect(Scene.role('status')).toHaveText('8'),
  )

  expect(constructHandler).not.toHaveBeenCalled()
  expect(executeHandler).not.toHaveBeenCalled()
})

it('routes a registered nested Subscription emission without a parent wrapper', () => {
  Scene.scene(
    { update, view, subscriptions: sceneSubscriptions },
    Scene.given(init().model),
    Scene.Subscription.emit(
      subscriptions.observations,
      ChildMessage.ObservedCount({ count: 9 }),
    ),
    Scene.expect(Scene.role('status')).toHaveText('9'),
  )

  expect(constructHandler).not.toHaveBeenCalled()
})

it('collects root and placement-qualified child declarations without starting handlers', () => {
  const merged = Scene.subscriptions(ApplicationComposition, localSubscriptions)

  expect(Object.keys(merged)).toEqual(['refresh', 'parent/child/observations'])
  Scene.scene(
    { update, view, subscriptions: merged },
    Scene.given(init().model),
    Scene.Subscription.emit(merged.refresh, Message.RequestedRefresh()),
    Scene.Command.resolve(
      ReadCount,
      ChildMessage.CompletedReadCount({ count: 11 }),
    ),
    Scene.Subscription.emit(
      merged['parent/child/observations'],
      ChildMessage.ObservedCount({ count: 12 }),
    ),
    Scene.expect(Scene.role('status')).toHaveText('12'),
  )
  expect(constructHandler).not.toHaveBeenCalled()
  expect(executeHandler).not.toHaveBeenCalled()
})

it('rejects a root declaration that collides with a child registration', () => {
  expect(() =>
    Scene.subscriptions(ApplicationComposition, {
      'parent/child/observations': localSubscriptions.refresh,
    }),
  ).toThrow('duplicate key "parent/child/observations"')
})

it('requires a framework-created root Composition for registry assembly', () => {
  expect(() =>
    // @ts-expect-error Erased JavaScript input must receive an actionable configuration error.
    Scene.subscriptions({}),
  ).toThrow('Scene.subscriptions Composition must come from')
})

it('decodes a complete dispatch contract and replays it through pure update', () => {
  const encoded = JSON.stringify({
    _tag: 'GotParentMessage',
    placement: 'parent',
    generation: 3,
    message: {
      _tag: 'GotChildMessage',
      placement: 'child',
      generation: 5,
      message: ChildMessage.ObservedCount({ count: 10 }),
    },
  })
  const message = Schema.decodeUnknownSync(ApplicationComposition.Message)(
    JSON.parse(encoded),
  )
  const result = update(init().model, message)

  expect(result.model.parent.child.count).toBe(10)
  expect(Schema.encodeSync(ApplicationComposition.Message)(message)).toEqual(
    JSON.parse(encoded),
  )
})

it('renders nested generated Blocks on the server without constructing handlers', async () => {
  const prepare = () =>
    ApplicationComposition.prepareBlock({ init, update, view })
  const completedBlock: Block.FromAssemblyWithView<
    typeof Model,
    typeof prepare
  > = Block.assemble(prepare)
  const rendered = await Effect.runPromise(
    renderToString(completedBlock, {}, { isHydratable: false }),
  )

  expect(rendered.html).toContain('<output>0</output>')
  expect(constructHandler).not.toHaveBeenCalled()
  expect(executeHandler).not.toHaveBeenCalled()
})
