import { Context, Data, Effect, Layer, Schema, Stream, Tuple } from 'effect'
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
  RequestedClear: {},
  RequestedSave: { value: Schema.String },
  CompletedSave: {},
})
const ForeignMessage = defineMessageUnion({ ForeignCompleted: {} })
const OutMessage = defineMessageUnion({ Saved: { value: Schema.String } })
const Search = Block.makeDefinition('Search', { Model, Message, OutMessage })
const Save = Search.makeCommand('Save', {
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

const TrackPointer = Search.makeMountStream('TrackPointer', {
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
const clear = Search.makeStep(model => ({
  model: modifyFields(model, { value: () => '' }),
}))
const update = search.makeUpdate({
  RequestedClear: model => clear(model),
  RequestedSave: (model, { value }) => ({
    model: modifyFields(model, { value: () => value }),
    commands: [Save({ value })],
  }),
  CompletedSave: model => ({
    model,
    outMessage: OutMessage.Saved({ value: model.value }),
  }),
})
const prepareBlock = () =>
  search.prepareBlock({
    init: () => ({ model: Model.make({ value: '' }) }),
    update,
    operations: { clear: () => Tuple.make(Message.RequestedClear()) },
    EffectsLayer: Save.layer,
  })
const block: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepareBlock
> = Block.assemble(prepareBlock)
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
const EarlyNamespace = Block.makeNamespace('Early')
const Shared = EarlyNamespace.makeCommand('Shared', {
  messages: [Message.CompletedSave],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedSave())
  },
})

const firstComposition = EarlyNamespace.makeDefinition({
  Model,
  Message,
}).makeComposition()
const secondComposition = EarlyNamespace.makeDefinition({
  Model,
  Message,
}).makeComposition()
const prepareFirstBlock = () =>
  firstComposition.prepareBlock({
    init: () => ({ model: Model.make({ value: '' }) }),
    update: firstComposition.makeUpdate({
      RequestedSave: model => ({
        model,
        commands: [Shared()],
      }),
      CompletedSave: model => ({
        model,
        commands: [Shared()],
      }),
      RequestedClear: model => ({
        model,
        commands: [Shared()],
      }),
    }),
    EffectsLayer: Shared.layer,
  })
const firstBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareFirstBlock
> = Block.assemble(prepareFirstBlock)
const prepareSecondBlock = () =>
  secondComposition.prepareBlock({
    init: () => ({ model: Model.make({ value: '' }) }),
    update: secondComposition.makeUpdate({
      RequestedSave: model => ({
        model,
        commands: [Shared()],
      }),
      CompletedSave: model => ({
        model,
        commands: [Shared()],
      }),
      RequestedClear: model => ({
        model,
        commands: [Shared()],
      }),
    }),
    EffectsLayer: Shared.layer,
  })
const secondBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareSecondBlock
> = Block.assemble(prepareSecondBlock)
it('requires Model and Message Schemas for a typed Definition', () => {
  expect(() =>
    Reflect.apply(Block.makeDefinition, undefined, ['MissingContracts']),
  ).toThrow('Block.makeDefinition requires Model and Message Schemas')
})

it('accepts an erased Composition graph with the documented fields and symbol metadata', () => {
  const metadata = Symbol('metadata')
  const composition = Reflect.apply(Search.makeComposition, undefined, [
    { mounts: [], bindings: [], [metadata]: true },
  ])

  expect(composition.mounts).toEqual([])
  expect(composition.bindings).toEqual([])
})

it('rejects malformed erased Composition graph configuration', () => {
  expect(() =>
    Reflect.apply(Search.makeComposition, undefined, [null]),
  ).toThrow('Definition.makeComposition configuration must be an object')
  expect(() => Reflect.apply(Search.makeComposition, undefined, [[]])).toThrow(
    'Definition.makeComposition configuration must be an object',
  )
  expect(() =>
    Reflect.apply(Search.makeComposition, undefined, [{ bindings: {} }]),
  ).toThrow('configuration field "bindings" must be an array when present')
  expect(() =>
    Reflect.apply(Search.makeComposition, undefined, [{ mounts: {} }]),
  ).toThrow('configuration field "mounts" must be an array when present')
})

it('rejects unexpected erased Composition graph fields', () => {
  expect(() =>
    Reflect.apply(Search.makeComposition, undefined, [
      { bindigns: [], Model: Schema.String },
    ]),
  ).toThrow(
    'Definition.makeComposition does not support the configuration field "bindigns"',
  )
  expect(() =>
    Reflect.apply(Search.makeComposition, undefined, [
      { Model: Schema.String },
    ]),
  ).toThrow(
    'Definition.makeComposition does not support the configuration field "Model"',
  )
})

it('replaces the short factory names without retaining aliases', () => {
  const oldFactoryNames = [
    'command',
    'mount',
    'mountStream',
    'resource',
    'subscriptions',
    'managedResources',
    'bindChild',
    'step',
    'stepFields',
    'stepNoop',
  ]

  for (const name of oldFactoryNames) {
    expect(Search).not.toHaveProperty(name)
    expect(EarlyNamespace).not.toHaveProperty(name)
  }
})

it('shares one owner across specialized contracts', () => {
  expect(firstBlock.owner).toBe(secondBlock.owner)
})

it('keeps primitive helpers on the Definition after composition', () => {
  expect(Search.makeCommand).toBeTypeOf('function')
  expect(Search.makeMount).toBeTypeOf('function')
  expect(Search.makeMountStream).toBeTypeOf('function')
  expect(Search.makeResource).toBeTypeOf('function')
  expect(search.makeUpdate).toBeTypeOf('function')
  expect(Search.makeStep).toBeTypeOf('function')
  expect(Search.makeSubscriptions).toBeTypeOf('function')
  expect(Search.makeManagedResources).toBeTypeOf('function')
  expect(search).not.toHaveProperty('makeCommand')
  expect(search).not.toHaveProperty('makeStep')
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

  Search.makeCommand('AcceptedCommand', {
    messages: [Message.CompletedSave],
  })
  Search.makeMount('AcceptedMount', {
    messages: [Message.CompletedSave],
  })
  Search.makeMountStream('AcceptedMountStream', {
    messages: [Message.CompletedSave],
  })

  Search.makeCommand('ForeignCommand', {
    // @ts-expect-error Typed Block Commands must produce the owner's Message.
    messages: [ForeignMessage.ForeignCompleted],
  })
  Search.makeMount('ForeignMount', {
    // @ts-expect-error Typed Block Mounts must produce the owner's Message.
    messages: [ForeignMessage.ForeignCompleted],
  })
  Search.makeMountStream('ForeignMountStream', {
    // @ts-expect-error Typed Block stream Mounts must produce the owner's Message.
    messages: [ForeignMessage.ForeignCompleted],
  })
  // @ts-expect-error Primitive authoring remains on the Definition.
  search.makeCommand

  const DeferredCommand = EarlyNamespace.makeCommand('DeferredCommand', {
    messages: [ForeignMessage.ForeignCompleted],
  })
  const DeferredMount = EarlyNamespace.makeMount('DeferredMount', {
    messages: [ForeignMessage.ForeignCompleted],
  })
  const DeferredMountStream = EarlyNamespace.makeMountStream(
    'DeferredMountStream',
    {
      messages: [ForeignMessage.ForeignCompleted],
    },
  )
  void [DeferredCommand, DeferredMount, DeferredMountStream]

  // @ts-expect-error Typed helpers retain the declared Message payload.
  update(Model.make({ value: '' }), Message.RequestedSave({ value: 1 }))
  // @ts-expect-error Missing local handler remains rejected.
  firstComposition.prepareBlock({
    init: () => ({ model: Model.make({ value: '' }) }),
    update: firstComposition.makeUpdate({
      RequestedSave: model => ({
        model,
        commands: [Shared()],
      }),
      CompletedSave: model => ({
        model,
        commands: [Shared()],
      }),
      RequestedClear: model => ({
        model,
        commands: [Shared()],
      }),
    }),
  })
  const Foreign = Block.makeDefinition('Foreign', { Model, Message })
  const ForeignShared = Foreign.makeCommand('Shared', {
    messages: [Message.CompletedSave],
  })
  const ForeignComposition = Foreign.makeComposition()
  // @ts-expect-error A different owner cannot provide the local handler.
  ForeignComposition.prepareBlock({
    init: () => ({ model: Model.make({ value: '' }) }),
    update: ForeignComposition.makeUpdate({
      RequestedSave: model => ({
        model,
        commands: [ForeignShared()],
      }),
      CompletedSave: model => ({
        model,
        commands: [ForeignShared()],
      }),
      RequestedClear: model => ({
        model,
        commands: [ForeignShared()],
      }),
    }),
    EffectsLayer: Shared.layer,
  })
}
