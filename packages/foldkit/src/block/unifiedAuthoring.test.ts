import { Context, Data, Effect, Layer, Schema, Stream } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import * as Command from '../command/public.js'
import { defineMessageUnion } from '../message/public.js'
import { modifyFields } from '../struct/public.js'
import type * as Update from '../update/public.js'
import * as Block from './public.js'
class Storage extends Context.Service<
  Storage,
  Readonly<{
    isAvailable: boolean
    save: (value: string) => Effect.Effect<void>
  }>
>()('BlockAuthoring/Storage') {}
class TrackingUnavailable extends Data.TaggedError('TrackingUnavailable')<{}> {}
const Model = Schema.Struct({ value: Schema.String })
const Message = defineMessageUnion({
  RequestedSave: { value: Schema.String },
  CompletedSave: {},
})
const ForeignMessage = defineMessageUnion({ ForeignCompleted: {} })
const OutMessage = defineMessageUnion({ Saved: { value: Schema.String } })
const Search = Block.define('Search', { Model, Message, OutMessage })
const Save = Search.command('Save', {
  args: { value: Schema.String },
  messages: [Message.CompletedSave],
  handler: function* () {
    const storage = yield* Storage
    return ({ value }) =>
      storage.save(value).pipe(Effect.as(Message.CompletedSave()))
  },
})
const ForeignInitCommand = Command.define('ForeignInitCommand', {
  messages: [ForeignMessage.ForeignCompleted],
})

type SearchInitReturn = Readonly<{ model: typeof Model.Type }>

function overloadedSearchInit(value: number): SearchInitReturn
function overloadedSearchInit(value: string): SearchInitReturn
function overloadedSearchInit(_value: number | string): SearchInitReturn {
  return { model: Model.make({ value: '' }) }
}

const TrackPointer = Search.mountStream('TrackPointer', {
  messages: [Message.CompletedSave],
  handler: function* () {
    const storage = yield* Storage
    if (!storage.isAvailable) {
      return yield* Effect.fail(new TrackingUnavailable())
    }

    return ({ element }) => {
      const exactElement: Element = element
      // @ts-expect-error A Mount handler receives an Element rather than a number.
      const invalidElement: number = element
      void [exactElement, invalidElement]

      return Stream.fromEffect(
        storage.save('tracked').pipe(Effect.as(Message.CompletedSave())),
      )
    }
  },
})
const search = Search.makeComposition({})
const update = search.makeUpdate((model, message) =>
  Message.match(message, {
    RequestedSave: ({ value }) => ({
      model: modifyFields(model, { value: () => value }),
      commands: [Save({ value })],
    }),
    CompletedSave: () => ({
      model,
      outMessage: OutMessage.Saved({ value: model.value }),
    }),
  }),
)
const clear = Search.step(model => ({
  model: modifyFields(model, { value: () => '' }),
}))
const block = search.makeBlock({
  init: () => ({ model: Model.make({ value: '' }) }),
  update,
  expose: { clear },
  EffectsLayer: Save.layer,
})
expectTypeOf<Update.RequirementsOf<typeof update>>().toEqualTypeOf<
  Command.HandlerOf<typeof Save>
>()
expectTypeOf<
  Layer.Services<typeof block.EffectsLayer>
>().toEqualTypeOf<Storage>()
expectTypeOf<
  Layer.Services<typeof TrackPointer.layer>
>().toEqualTypeOf<Storage>()
expectTypeOf<
  Layer.Error<typeof TrackPointer.layer>
>().toEqualTypeOf<TrackingUnavailable>()
expectTypeOf(clear(Model.make({ value: 'before' })).model).toEqualTypeOf<
  typeof Model.Type
>()
const Early = Block.define('Early')
const Shared = Early.command('Shared', {
  messages: [Message.CompletedSave],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedSave())
  },
})
const first = Early.define({ Model, Message })
const second = Early.define({ Model, Message })
const firstComposition = first.makeComposition()
const secondComposition = second.makeComposition()
const firstBlock = firstComposition.makeBlock({
  init: () => ({ model: Model.make({ value: '' }) }),
  update: firstComposition.makeUpdate(model => ({
    model,
    commands: [Shared()],
  })),
  EffectsLayer: Shared.layer,
})
const secondBlock = secondComposition.makeBlock({
  init: () => ({ model: Model.make({ value: '' }) }),
  update: secondComposition.makeUpdate(model => ({
    model,
    commands: [Shared()],
  })),
  EffectsLayer: Shared.layer,
})
it('shares one owner across specialized contracts', () => {
  expect(firstBlock.owner).toBe(secondBlock.owner)
})

it('keeps primitive helpers on the Definition after composition', () => {
  expect(Search.command).toBeTypeOf('function')
  expect(Search.mount).toBeTypeOf('function')
  expect(Search.mountStream).toBeTypeOf('function')
  expect(Search.resource).toBeTypeOf('function')
  expect(search.makeUpdate).toBeTypeOf('function')
  expect(Search.step).toBeTypeOf('function')
  expect(Search.subscriptions).toBeTypeOf('function')
  expect(Search.managedResources).toBeTypeOf('function')
  expect(search).not.toHaveProperty('command')
  expect(search).not.toHaveProperty('step')
  expect(search).toHaveProperty('makeInit')
})
if (false) {
  // @ts-expect-error A Definition does not expose the Composition-owned init helper.
  Search.makeInit

  // @ts-expect-error Block init must return the Block Model.
  search.makeInit(() => ({ model: { value: 1 } }))
  search.makeInit(() => ({
    model: Model.make({ value: '' }),
    // @ts-expect-error Every Block init Command must return the Block Message.
    commands: [ForeignInitCommand()],
  }))
  // @ts-expect-error Initializers require one concrete call signature.
  search.makeInit(overloadedSearchInit)

  Search.command('AcceptedCommand', {
    messages: [Message.CompletedSave],
  })
  Search.mount('AcceptedMount', {
    messages: [Message.CompletedSave],
  })
  Search.mountStream('AcceptedMountStream', {
    messages: [Message.CompletedSave],
  })

  Search.command('ForeignCommand', {
    // @ts-expect-error Typed Block Commands must produce the owner's Message.
    messages: [ForeignMessage.ForeignCompleted],
  })
  Search.mount('ForeignMount', {
    // @ts-expect-error Typed Block Mounts must produce the owner's Message.
    messages: [ForeignMessage.ForeignCompleted],
  })
  Search.mountStream('ForeignMountStream', {
    // @ts-expect-error Typed Block stream Mounts must produce the owner's Message.
    messages: [ForeignMessage.ForeignCompleted],
  })
  // @ts-expect-error Primitive authoring remains on the Definition.
  search.command

  const DeferredCommand = Early.command('DeferredCommand', {
    messages: [ForeignMessage.ForeignCompleted],
  })
  const DeferredMount = Early.mount('DeferredMount', {
    messages: [ForeignMessage.ForeignCompleted],
  })
  const DeferredMountStream = Early.mountStream('DeferredMountStream', {
    messages: [ForeignMessage.ForeignCompleted],
  })
  void [DeferredCommand, DeferredMount, DeferredMountStream]

  // @ts-expect-error Typed helpers retain the declared Message payload.
  update(Model.make({ value: '' }), Message.RequestedSave({ value: 1 }))
  // @ts-expect-error Missing local handler remains rejected.
  firstComposition.makeBlock({
    init: () => ({ model: Model.make({ value: '' }) }),
    update: firstComposition.makeUpdate(model => ({
      model,
      commands: [Shared()],
    })),
  })
  const Foreign = Block.define('Foreign', { Model, Message })
  const ForeignShared = Foreign.command('Shared', {
    messages: [Message.CompletedSave],
  })
  const ForeignComposition = Foreign.makeComposition()
  ForeignComposition.makeBlock({
    init: () => ({ model: Model.make({ value: '' }) }),
    update: ForeignComposition.makeUpdate(model => ({
      model,
      commands: [ForeignShared()],
    })),
    // @ts-expect-error A different owner cannot provide the local handler.
    EffectsLayer: Shared.layer,
  })
}
