import { Array, Effect, Layer, Option, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import * as Story from 'foldkit/story'
import * as Update from 'foldkit/update'
import { it as baseIt, expect } from 'vitest'

import { describe, makeMethods } from '@effect/vitest'

import * as Toast from './index.js'

const FirstPayload = Schema.Struct({ body: Schema.String })
type FirstPayload = typeof FirstPayload.Type
const SecondPayload = Schema.Struct({ count: Schema.Number })
type SecondPayload = typeof SecondPayload.Type

const FirstToast = Toast.makeBlock(FirstPayload)
const SecondToast = Toast.makeBlock(SecondPayload)

const ParentModel = Schema.Struct({
  left: FirstToast.Model,
  right: FirstToast.Model,
  other: SecondToast.Model,
})
type ParentModel = typeof ParentModel.Type

const ParentMessage = defineMessageUnion({
  RequestedShowAll: {},
})
type ParentMessage = typeof ParentMessage.Type

const ToastFixtureParentKey = Symbol('ToastFixtureParent')
const ToastFixtureParentBlock = Block.make('ToastFixtureParent', {
  key: ToastFixtureParentKey,
  Model: ParentModel,
  Message: ParentMessage,
  InitArgs: Schema.Tuple([]),
  ChildInitContext: Schema.String,
})

const foldFirstToastOutMessage = ToastFixtureParentBlock.makeOutMessageFold(
  FirstToast,
  {
    DismissedToast: () => model => ({ model }),
  },
)

const foldSecondToastOutMessage = ToastFixtureParentBlock.makeOutMessageFold(
  SecondToast,
  {
    DismissedToast: () => model => ({ model }),
  },
)

const LeftBinding = ToastFixtureParentBlock.makeRequiredFieldBinding(
  FirstToast,
  {
    placement: 'LeftToast',
    field: 'left',
    init: { contextToArgs: id => [{ id }] },
  },
).withOutMessagePolicy({ fold: foldFirstToastOutMessage })

const RightBinding = ToastFixtureParentBlock.makeRequiredFieldBinding(
  FirstToast,
  {
    placement: 'RightToast',
    field: 'right',
    init: { contextToArgs: id => [{ id }] },
  },
).withOutMessagePolicy({ fold: foldFirstToastOutMessage })

const OtherBinding = ToastFixtureParentBlock.makeRequiredFieldBinding(
  SecondToast,
  {
    placement: 'OtherToast',
    field: 'other',
    init: { contextToArgs: id => [{ id }] },
  },
).withOutMessagePolicy({ fold: foldSecondToastOutMessage })

const ToastFixtureParentComposition = ToastFixtureParentBlock.makeComposition({
  bindings: [LeftBinding, RightBinding, OtherBinding],
})

const requestShowAll = Update.combineSteps([
  LeftBinding.requestShow({
    payload: { body: 'Left' },
    duration: 100,
  }),
  RightBinding.requestShow({
    payload: { body: 'Right' },
    duration: 200,
  }),
  OtherBinding.requestShow({
    payload: { count: 3 },
    duration: 300,
  }),
])

const update = ToastFixtureParentComposition.makeUpdate({
  RequestedShowAll: model => requestShowAll(model),
})

const parentInit = ToastFixtureParentComposition.makeInit(() => ({
  model: {},
  childInitContext: 'toast',
}))
const ParentBlock = {
  block: ToastFixtureParentBlock,
  layer: ToastFixtureParentBlock.makeLayer({
    init: parentInit,
    update,
  }).pipe(Layer.provide(Toast.layer)),
}

const KeyedToastSlot = Schema.Struct({
  key: Schema.String,
  toast: FirstToast.Model,
})
type KeyedToastSlot = typeof KeyedToastSlot.Type
const KeyedParentModel = Schema.Struct({
  slots: Schema.Array(KeyedToastSlot),
})
type KeyedParentModel = typeof KeyedParentModel.Type
const KeyedParentMessage = defineMessageUnion({ RequestedShow: {} })
type KeyedParentMessage = typeof KeyedParentMessage.Type
const KeyedToastFixtureParentKey = Symbol('KeyedToastFixtureParent')
const KeyedToastFixtureParentBlock = Block.make('KeyedToastFixtureParent', {
  key: KeyedToastFixtureParentKey,
  Model: KeyedParentModel,
  Message: KeyedParentMessage,
  InitArgs: Schema.Tuple([]),
  ChildInitContext: Schema.String,
})
const foldKeyedToastOutMessage =
  KeyedToastFixtureParentBlock.makeOutMessageFold(FirstToast, {
    DismissedToast: () => model => ({ model }),
  })
const SlotsToastBinding = KeyedToastFixtureParentBlock.makeKeyedArrayBinding(
  FirstToast,
  {
    placement: 'KeyedToast',
    field: 'slots',
    key: 'key',
    childField: 'toast',
    init: {
      instances: id => [{ key: 'selected', args: [{ id }] }],
      toItem: ({ key }, toast) => ({ key, toast }),
    },
  },
).withOutMessagePolicy({
  fold: foldKeyedToastOutMessage,
})
const KeyedToastFixtureParentComposition =
  KeyedToastFixtureParentBlock.makeComposition({
    bindings: [SlotsToastBinding],
  })
// @ts-expect-error A keyed Toast Binding requires its occurrence key.
const missingKeyDrain = FirstToast.test.drainEntry({
  binding: SlotsToastBinding,
  entryId: 'toast-entry-0',
})
void missingKeyDrain
FirstToast.test.drainEntry({
  binding: SlotsToastBinding,
  // @ts-expect-error The occurrence key retains the keyed Binding's string type.
  key: 1,
  entryId: 'toast-entry-0',
})
const keyedUpdate = KeyedToastFixtureParentComposition.makeUpdate({
  RequestedShow: model =>
    SlotsToastBinding.requestShow('selected', {
      payload: { body: 'Keyed' },
      duration: 100,
    })(model),
})
const keyedInit = KeyedToastFixtureParentComposition.makeInit(() => ({
  model: {},
  childInitContext: 'toast',
}))
const KeyedParentBlock = {
  block: KeyedToastFixtureParentBlock,
  layer: KeyedToastFixtureParentBlock.makeLayer({
    init: keyedInit,
    update: keyedUpdate,
  }).pipe(Layer.provide(Toast.layer)),
}

const makeParentFixture = (block: Story.TestBlock<typeof ParentBlock>) => ({
  update: block.update,
  initialModel: block.init().model,
})
const makeKeyedFixture = (block: Story.TestBlock<typeof KeyedParentBlock>) => ({
  keyedUpdate: block.update,
  keyedInitialModel: block.init().model,
})
const it = makeMethods(
  baseIt.extend<{
    parent: ReturnType<typeof makeParentFixture>
    keyedParent: ReturnType<typeof makeKeyedFixture>
  }>({
    parent: async ({}, use) =>
      Effect.runPromise(
        Story.withBlock(ParentBlock, block =>
          Effect.promise(() => use(makeParentFixture(block))),
        ),
      ),
    keyedParent: async ({}, use) =>
      Effect.runPromise(
        Story.withBlock(KeyedParentBlock, block =>
          Effect.promise(() => use(makeKeyedFixture(block))),
        ),
      ),
  }),
)

describe('Toast.test.drainEntry', () => {
  it.effect(
    'selects an exact completed Toast Binding across repeated placements and factories',
    () =>
      Story.story(
        ParentBlock,
        Story.init(),
        Story.message(ParentMessage.RequestedShowAll()),
        FirstToast.test.drainEntry({
          binding: RightBinding,
          entryId: 'toast-entry-0',
        }),
        Story.model(model => {
          expect(model.left.entries).toHaveLength(1)
          expect(model.right.entries).toHaveLength(0)
          expect(model.other.entries).toHaveLength(1)
        }),
        SecondToast.test.drainEntry({
          binding: OtherBinding,
          entryId: 'toast-entry-0',
        }),
        Story.model(model => {
          expect(model.left.entries).toHaveLength(1)
          expect(model.other.entries).toHaveLength(0)
        }),
        FirstToast.test.drainEntry({
          binding: LeftBinding,
          entryId: 'toast-entry-0',
        }),
        Story.Command.expectNone(),
      ),
  )

  it('does not select a stale timer version', ({
    parent: { update, initialModel },
  }) => {
    expect(() =>
      Story.story(
        update,
        Story.given(initialModel),
        Story.message(ParentMessage.RequestedShowAll()),
        FirstToast.test.drainEntry({
          binding: LeftBinding,
          entryId: 'toast-entry-0',
          version: 1,
        }),
      ),
    ).toThrow('could not find the fresh auto-dismiss timer')
  })

  it.effect('requires and selects a keyed Toast Binding occurrence', () =>
    Story.story(
      KeyedParentBlock,
      Story.init(),
      Story.message(KeyedParentMessage.RequestedShow()),
      FirstToast.test.drainEntry({
        binding: SlotsToastBinding,
        key: 'selected',
        entryId: 'toast-entry-0',
      }),
      Story.model((model: KeyedParentModel) => {
        expect(model.slots).toHaveLength(1)
        expect(
          Option.getOrThrow(Array.head(model.slots)).toast.entries,
        ).toHaveLength(0)
      }),
      Story.Command.expectNone(),
    ),
  )

  it('rejects a removed entry fixture even when its timer is pending', ({
    keyedParent: { keyedUpdate, keyedInitialModel },
  }) => {
    expect(() =>
      Story.story(
        keyedUpdate,
        Story.given(keyedInitialModel),
        Story.message(KeyedParentMessage.RequestedShow()),
        Story.given(keyedInitialModel),
        FirstToast.test.drainEntry({
          binding: SlotsToastBinding,
          key: 'selected',
          entryId: 'toast-entry-0',
        }),
      ),
    ).toThrow('no matching pending Command')
  })
})
