import { Array, Option, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import * as Story from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import * as Update from 'foldkit/update'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Toast from './index.js'

const FirstPayload = Schema.Struct({ body: Schema.String })
const SecondPayload = Schema.Struct({ count: Schema.Number })

const FirstToast = Toast.make(FirstPayload)
const SecondToast = Toast.make(SecondPayload)

const ParentModel = Schema.Struct({
  left: FirstToast.Model,
  right: FirstToast.Model,
  other: SecondToast.Model,
})
type ParentModel = typeof ParentModel.Type

const ParentMessage = defineMessageUnion({
  RequestedShowAll: {},
})

const ToastFixtureParentDefinition = Block.makeDefinition(
  'ToastFixtureParent',
  {
    Model: ParentModel,
    Message: ParentMessage,
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
  read: model => Option.some(model.left),
  write: (model, left) => ({ ...model, left }),
}).withOutMessagePolicy({ fold: foldFirstToastOutMessage })

const RightToastBinding = ToastFixtureParentDefinition.makeBinding(FirstToast, {
  placement: 'RightToast',
  read: model => Option.some(model.right),
  write: (model, right) => ({ ...model, right }),
}).withOutMessagePolicy({ fold: foldFirstToastOutMessage })

const OtherToastBinding = ToastFixtureParentDefinition.makeBinding(
  SecondToast,
  {
    placement: 'OtherToast',
    read: model => Option.some(model.other),
    write: (model, other) => ({ ...model, other }),
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

const initialModel: ParentModel = {
  left: FirstToast.init({ id: 'toast' }).model,
  right: FirstToast.init({ id: 'toast' }).model,
  other: SecondToast.init({ id: 'toast' }).model,
}

const KeyedToastSlot = Schema.Struct({
  key: Schema.String,
  toast: FirstToast.Model,
})
const KeyedParentModel = Schema.Struct({
  slots: Schema.Array(KeyedToastSlot),
})
type KeyedParentModel = typeof KeyedParentModel.Type
const KeyedParentMessage = defineMessageUnion({ RequestedShow: {} })
const KeyedToastFixtureParentDefinition = Block.makeDefinition(
  'KeyedToastFixtureParent',
  {
    Model: KeyedParentModel,
    Message: KeyedParentMessage,
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
    readAll: model => model.slots,
    key: slot => slot.key,
    keySchema: Schema.String,
    read: slot => slot.toast,
    writeAt: (model, key, toast) =>
      modifyFields(model, {
        slots: Array.map(slot =>
          slot.key === key ? KeyedToastSlot.make({ key, toast }) : slot,
        ),
      }),
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
const keyedInitialModel: KeyedParentModel = {
  slots: [
    KeyedToastSlot.make({
      key: 'selected',
      toast: FirstToast.init({ id: 'toast' }).model,
    }),
  ],
}

describe('Toast.test.drainEntry', () => {
  it('selects an exact completed Toast Binding across repeated placements and factories', () => {
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

  it('does not select a stale timer version', () => {
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

  it('requires and selects a keyed Toast Binding occurrence', () => {
    Story.story(
      keyedUpdate,
      Story.given(keyedInitialModel),
      Story.message(KeyedParentMessage.RequestedShow()),
      FirstToast.test.drainEntry({
        binding: KeyedToastBinding,
        key: 'selected',
        entryId: 'toast-entry-0',
      }),
      Story.model(model => {
        expect(model.slots).toHaveLength(1)
        expect(
          Option.getOrThrow(Array.head(model.slots)).toast.entries,
        ).toHaveLength(0)
      }),
      Story.Command.expectNone(),
    )
  })

  it('rejects a removed entry fixture even when its timer is pending', () => {
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
