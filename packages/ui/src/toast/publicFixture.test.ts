import { Array, Effect, Option, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import * as Story from 'foldkit/story'
import * as Update from 'foldkit/update'
import { it as baseIt, expect } from 'vitest'

import { describe } from '@effect/vitest'

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
const ToastFixtureParentDefinition = Block.makeDefinition(
  'ToastFixtureParent',
  {
    key: ToastFixtureParentKey,
    Model: ParentModel,
    Message: ParentMessage,
    Init: Schema.Tuple([]),
    ChildInitContext: Schema.String,
  },
)

const foldFirstToastOutMessage =
  ToastFixtureParentDefinition.makeOutMessageFold(FirstToast, {
    DismissedToast: () => model => ({ model }),
  })

const foldSecondToastOutMessage =
  ToastFixtureParentDefinition.makeOutMessageFold(SecondToast, {
    DismissedToast: () => model => ({ model }),
  })

const LeftToastBinding = ToastFixtureParentDefinition.makeBinding(FirstToast, {
  placement: 'LeftToast',
  field: 'left',
  init: { contextToArgs: id => [{ id }] },
}).withOutMessagePolicy({ fold: foldFirstToastOutMessage })

const RightToastBinding = ToastFixtureParentDefinition.makeBinding(FirstToast, {
  placement: 'RightToast',
  field: 'right',
  init: { contextToArgs: id => [{ id }] },
}).withOutMessagePolicy({ fold: foldFirstToastOutMessage })

const OtherToastBinding = ToastFixtureParentDefinition.makeBinding(
  SecondToast,
  {
    placement: 'OtherToast',
    field: 'other',
    init: { contextToArgs: id => [{ id }] },
  },
).withOutMessagePolicy({ fold: foldSecondToastOutMessage })

const ToastFixtureParentComposition =
  ToastFixtureParentDefinition.makeComposition({
    bindings: [LeftToastBinding, RightToastBinding, OtherToastBinding],
  })

const requestShowAll = Update.combineSteps([
  LeftToastBinding.requestShow({
    payload: { body: 'Left' },
    duration: 100,
  }),
  RightToastBinding.requestShow({
    payload: { body: 'Right' },
    duration: 200,
  }),
  OtherToastBinding.requestShow({
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
const ParentBlock = ToastFixtureParentDefinition.makeBlock(
  Effect.gen(function* () {
    const left = yield* LeftToastBinding
    const right = yield* RightToastBinding
    const other = yield* OtherToastBinding

    return { children: [left, right, other], init: parentInit, update }
  }),
).provide(Toast.layer)

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
const KeyedToastFixtureParentDefinition = Block.makeDefinition(
  'KeyedToastFixtureParent',
  {
    key: KeyedToastFixtureParentKey,
    Model: KeyedParentModel,
    Message: KeyedParentMessage,
    Init: Schema.Tuple([]),
    ChildInitContext: Schema.String,
  },
)
const foldKeyedToastOutMessage =
  KeyedToastFixtureParentDefinition.makeOutMessageFold(FirstToast, {
    DismissedToast: () => model => ({ model }),
  })
const KeyedToastBinding = KeyedToastFixtureParentDefinition.makeBinding(
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
  fold: (_key, outMessage) => foldKeyedToastOutMessage(outMessage),
})
const KeyedToastFixtureParentComposition =
  KeyedToastFixtureParentDefinition.makeComposition({
    bindings: [KeyedToastBinding],
  })
// @ts-expect-error A keyed Toast Binding requires its occurrence key.
const missingKeyDrain = FirstToast.test.drainEntry({
  binding: KeyedToastBinding,
  entryId: 'toast-entry-0',
})
void missingKeyDrain
FirstToast.test.drainEntry({
  binding: KeyedToastBinding,
  // @ts-expect-error The occurrence key retains the keyed Binding's string type.
  key: 1,
  entryId: 'toast-entry-0',
})
const keyedUpdate = KeyedToastFixtureParentComposition.makeUpdate({
  RequestedShow: model =>
    KeyedToastBinding.requestShow('selected', {
      payload: { body: 'Keyed' },
      duration: 100,
    })(model),
})
const keyedInit = KeyedToastFixtureParentComposition.makeInit(() => ({
  model: {},
  childInitContext: 'toast',
}))
const KeyedParentBlock = KeyedToastFixtureParentDefinition.makeBlock(
  Effect.gen(function* () {
    const toast = yield* KeyedToastBinding

    return { children: [toast], init: keyedInit, update: keyedUpdate }
  }),
).provide(Toast.layer)

const makeParentFixture = (block: Story.TestBlock<typeof ParentBlock>) => ({
  update: block.update,
  initialModel: block.init().model,
})
const makeKeyedFixture = (block: Story.TestBlock<typeof KeyedParentBlock>) => ({
  keyedUpdate: block.update,
  keyedInitialModel: block.init().model,
})
const it = baseIt.extend<{
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
})

describe('Toast.test.drainEntry', () => {
  it('selects an exact completed Toast Binding across repeated placements and factories', ({
    parent: { update, initialModel },
  }) => {
    Story.story(
      update,
      Story.given(initialModel),
      Story.message(ParentMessage.RequestedShowAll()),
      FirstToast.test.drainEntry({
        binding: RightToastBinding,
        entryId: 'toast-entry-0',
      }),
      Story.model(model => {
        expect(model.left.entries).toHaveLength(1)
        expect(model.right.entries).toHaveLength(0)
        expect(model.other.entries).toHaveLength(1)
      }),
      SecondToast.test.drainEntry({
        binding: OtherToastBinding,
        entryId: 'toast-entry-0',
      }),
      Story.model(model => {
        expect(model.left.entries).toHaveLength(1)
        expect(model.other.entries).toHaveLength(0)
      }),
      FirstToast.test.drainEntry({
        binding: LeftToastBinding,
        entryId: 'toast-entry-0',
      }),
      Story.Command.expectNone(),
    )
  })

  it('does not select a stale timer version', ({
    parent: { update, initialModel },
  }) => {
    expect(() =>
      Story.story(
        update,
        Story.given(initialModel),
        Story.message(ParentMessage.RequestedShowAll()),
        FirstToast.test.drainEntry({
          binding: LeftToastBinding,
          entryId: 'toast-entry-0',
          version: 1,
        }),
      ),
    ).toThrow('could not find the fresh auto-dismiss timer')
  })

  it('requires and selects a keyed Toast Binding occurrence', ({
    keyedParent: { keyedUpdate, keyedInitialModel },
  }) => {
    Story.story(
      keyedUpdate,
      Story.given(keyedInitialModel),
      Story.message(KeyedParentMessage.RequestedShow()),
      FirstToast.test.drainEntry({
        binding: KeyedToastBinding,
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
    )
  })

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
          binding: KeyedToastBinding,
          key: 'selected',
          entryId: 'toast-entry-0',
        }),
      ),
    ).toThrow('no matching pending Command')
  })
})
