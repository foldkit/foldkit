import { Context, Effect, Layer, Schema } from 'effect'
import { describe, expect, it, vi } from 'vitest'

import { renderToString } from '../experimental/server/server.js'
import type { AnyAuthoredView } from '../html/block.js'
import { __htmlBuilder } from '../html/index.js'
import { clearRuntime, setRuntime } from '../html/runtimeSingleton.js'
import { defineMessageUnion } from '../message/index.js'
import * as Scene from '../test/scene.js'
import { makeDefinition } from './define.js'
import { lowerBlock } from './lowering.js'
import * as Block from './public.js'

const Model = Schema.Struct({ count: Schema.Number })
const Message = defineMessageUnion({
  CompletedObserveFirst: {},
  CompletedObserveSecond: {},
})
const MountRegistration = makeDefinition('MountRegistration', {
  Model,
  Message,
})
const constructed = vi.fn()
const ObserveFirst = MountRegistration.makeMount('ObserveFirst', {
  messages: [Message.CompletedObserveFirst],
  handler: function* () {
    yield* Effect.sync(constructed)

    return () => Effect.succeed(Message.CompletedObserveFirst())
  },
})
const ObserveSecond = MountRegistration.makeMount('ObserveSecond', {
  messages: [Message.CompletedObserveSecond],
  handler: function* () {
    yield* Effect.sync(constructed)

    return () => Effect.succeed(Message.CompletedObserveSecond())
  },
})
const first = MountRegistration.makeComposition({ mounts: [ObserveFirst] })
const second = MountRegistration.makeComposition({ mounts: [ObserveSecond] })
const both = MountRegistration.makeComposition({
  mounts: [ObserveFirst, ObserveSecond],
})
const graphless = MountRegistration.makeComposition()
const init = () => ({ model: Model.make({ count: 0 }) })
const update = first.makeUpdate({
  CompletedObserveFirst: model => ({ model }),
  CompletedObserveSecond: model => ({ model }),
})
const bothUpdate = both.makeUpdate({
  CompletedObserveFirst: model => ({ model }),
  CompletedObserveSecond: model => ({ model }),
})
const graphlessUpdate = graphless.makeUpdate({
  CompletedObserveFirst: model => ({ model }),
  CompletedObserveSecond: model => ({ model }),
})
const firstView = first.makeView((_model, h) =>
  h.div([h.OnMount(ObserveFirst())]),
)
const secondView = second.makeView((_model, h) =>
  h.div([h.OnMount(ObserveSecond())]),
)
const prepareFirstBlock = () =>
  first.prepareBlock({
    init,
    update,
    view: firstView,
    EffectsLayer: ObserveFirst.layer,
  })
const firstBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareFirstBlock
> = Block.assemble(prepareFirstBlock)
const render = (view: AnyAuthoredView) => {
  setRuntime(() => {}, Context.empty())
  try {
    return view(init().model, __htmlBuilder())
  } finally {
    clearRuntime()
  }
}

const Entry = Schema.Struct({ id: Schema.String, child: Model })
const ParentModel = Schema.Struct({
  child: Model,
  entries: Schema.Array(Entry),
})
const MountParent = makeDefinition('MountParent', {
  Model: ParentModel,
  Message: Schema.Never,
})
const ChildBinding = MountParent.makeBinding(firstBlock, {
  field: 'child',
})
const EntriesBinding = MountParent.makeBinding(firstBlock, {
  field: 'entries',
  key: 'id',
  childField: 'child',
})
const parent = MountParent.makeComposition({
  bindings: [ChildBinding, EntriesBinding],
})
const parentUpdate = parent.makeUpdate({})
const parentModel = ParentModel.make({
  child: init().model,
  entries: [Entry.make({ id: 'first', child: init().model })],
})

describe('captured local Mount registrations', () => {
  it('renders an exported registered view directly in Scene', () => {
    Scene.scene(
      { update, view: firstView },
      Scene.given(init().model),
      Scene.Mount.resolve(ObserveFirst, Message.CompletedObserveFirst()),
    )

    expect(constructed).not.toHaveBeenCalled()
  })

  it('rejects a view completed against a different local Mount set', () => {
    const prepareBlock = () =>
      // @ts-expect-error The view requires a different local Mount registration.
      first.prepareBlock({
        init,
        update,
        view: secondView,
        EffectsLayer: ObserveFirst.layer,
      })
    const block: Block.FromAssemblyWithView<typeof Model, typeof prepareBlock> =
      Block.assemble(prepareBlock)

    expect(() => render(lowerBlock(block).view)).toThrow(
      'This view uses Mounts that are not registered in its selected Block.',
    )
    expect(() => render(lowerBlock(firstBlock).view)).not.toThrow()
  })

  it('keeps an authored view narrower than its completion Mount set', () => {
    const view = first.makeView((_model, h) =>
      h.div([
        // @ts-expect-error Completion cannot grant this view an undeclared Mount.
        h.OnMount(ObserveSecond()),
      ]),
    )
    const prepareBlock = () =>
      both.prepareBlock({
        init,
        update: bothUpdate,
        view,
        EffectsLayer: Layer.merge(ObserveFirst.layer, ObserveSecond.layer),
      })
    const block: Block.FromAssemblyWithView<typeof Model, typeof prepareBlock> =
      Block.assemble(prepareBlock)

    expect(() => render(lowerBlock(block).view)).toThrow(
      'Mount "MountRegistration/ObserveSecond" is not registered in this view\'s Mounts.',
    )
  })

  it('rejects an undeclared Mount in a graphless exported Scene view', () => {
    const view = graphless.makeView((_model, h) =>
      h.div([
        // @ts-expect-error A graphless view has no Mount capabilities.
        h.OnMount(ObserveFirst()),
      ]),
    )

    expect(() =>
      Scene.scene({ update: graphlessUpdate, view }, Scene.given(init().model)),
    ).toThrow("is not registered in this view's Mounts")
  })

  it('renders a declared Mount through static and keyed view overrides', () => {
    const staticView = parent.makeView((model, h) =>
      h.block(
        ChildBinding.embedView({
          slotId: 'child',
          model: model.child,
          view: firstView,
        }),
      ),
    )
    const keyedView = parent.makeView((model, h) =>
      h.block(
        EntriesBinding.embedView({
          slotId: 'entry',
          key: 'first',
          model: model.child,
          view: firstView,
        }),
      ),
    )

    for (const view of [staticView, keyedView]) {
      Scene.scene(
        { update: parentUpdate, view },
        Scene.given(parentModel),
        Scene.Mount.resolve(ObserveFirst, Message.CompletedObserveFirst()),
      )
    }
  })

  it('checks the selected static child before rendering a view override', () => {
    const view = parent.makeView((model, h) =>
      h.block(
        ChildBinding.embedView({
          slotId: 'child',
          model: model.child,
          // @ts-expect-error The selected child does not register this override's Mount.
          view: secondView,
        }),
      ),
    )

    expect(() =>
      Scene.scene({ update: parentUpdate, view }, Scene.given(parentModel)),
    ).toThrow(
      'This view uses Mounts that are not registered in its selected Block.',
    )
  })

  it('checks the selected keyed child before rendering a view override', () => {
    const view = parent.makeView((model, h) =>
      h.block(
        EntriesBinding.embedView({
          slotId: 'entry',
          key: 'first',
          model: model.child,
          // @ts-expect-error The selected child does not register this override's Mount.
          view: secondView,
        }),
      ),
    )

    expect(() =>
      Scene.scene({ update: parentUpdate, view }, Scene.given(parentModel)),
    ).toThrow(
      'This view uses Mounts that are not registered in its selected Block.',
    )
  })

  it('checks captured Mount sets during server rendering without building Layers', async () => {
    const ApplicationDefinition = Block.makeDefinition('Application', {
      Model,
      Message,
    })
    const FocusFirst = ApplicationDefinition.makeMount('FocusFirst', {
      messages: [Message.CompletedObserveFirst],
      handler: function* () {
        yield* Effect.sync(constructed)

        return () => Effect.succeed(Message.CompletedObserveFirst())
      },
    })
    const FocusSecond = ApplicationDefinition.makeMount('FocusSecond', {
      messages: [Message.CompletedObserveSecond],
      handler: function* () {
        yield* Effect.sync(constructed)

        return () => Effect.succeed(Message.CompletedObserveSecond())
      },
    })
    const firstApplication = ApplicationDefinition.makeComposition({
      mounts: [FocusFirst],
    })
    const secondApplication = ApplicationDefinition.makeComposition({
      mounts: [FocusSecond],
    })
    const applicationUpdate = firstApplication.makeUpdate({
      CompletedObserveFirst: model => ({ model }),
      CompletedObserveSecond: model => ({ model }),
    })
    const view = secondApplication.makeView((_model, h) => ({
      title: 'Second',
      body: h.main([h.OnMount(FocusSecond())]),
    }))
    const prepareFirstBlock = () =>
      // @ts-expect-error A completed Block rejects a view with a different Mount graph.
      firstApplication.prepareBlock({
        init,
        update: applicationUpdate,
        view,
        EffectsLayer: FocusFirst.layer,
      })
    const firstBlock: Block.FromAssemblyWithView<
      typeof Model,
      typeof prepareFirstBlock
    > = Block.assemble(prepareFirstBlock)

    await expect(
      Effect.runPromise(
        renderToString(firstBlock, {}, { isHydratable: false }),
      ),
    ).rejects.toThrow(
      'This view uses Mounts that are not registered in its selected Block.',
    )
    expect(constructed).not.toHaveBeenCalled()
  })
})
