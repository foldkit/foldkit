import { Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import {
  InertPopoverOthers,
  LockPopoverScroll,
  PopoverBlock,
  Message as PopoverMessage,
  RestorePopoverInert,
  UnlockPopoverScroll,
  layer as popoverLayer,
} from './block.js'

const Model = Schema.Struct({
  popover: PopoverBlock.Model,
  closedCount: Schema.Number,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedOpenPopover: {},
  PressedTabFromPopover: {},
})
type Message = typeof Message.Type

const ParentKey = Symbol('PopoverBindingClose')
const PopoverBindingCloseBlock = Block.make('PopoverBindingClose', {
  key: ParentKey,
  InitArgs: Schema.Tuple([]),
  view: false,
  Model,
  Message,
})

const PopoverBinding = PopoverBindingCloseBlock.makeRequiredFieldBinding(
  PopoverBlock,
  {
    field: 'popover',
    init: {
      contextToArgs: () => [{ id: 'owner-picker', isModal: true }],
    },
  },
).withOutMessagePolicy({
  fold: PopoverBindingCloseBlock.makeOutMessageFold(PopoverBlock, {
    Opened: PopoverBindingCloseBlock.makeNoopStep,
    Closed: () =>
      PopoverBindingCloseBlock.makeFieldsStep(() => ({
        closedCount: closedCount => closedCount + 1,
      })),
  }),
})

const PopoverBindingCloseComposition = PopoverBindingCloseBlock.makeComposition(
  {
    bindings: [PopoverBinding],
  },
)

const init = PopoverBindingCloseComposition.makeInit(() => ({
  model: { closedCount: 0 },
}))

const update = PopoverBindingCloseComposition.makeUpdate({
  ClickedOpenPopover: PopoverBinding.requestOpen(),
  PressedTabFromPopover: PopoverBinding.requestCloseWithoutRestoringFocus(),
})

const parent = {
  block: PopoverBindingCloseBlock,
  layer: PopoverBindingCloseBlock.makeLayer({
    init,
    update,
  }).pipe(Layer.provide(popoverLayer)),
}

it.effect(
  'closes a modal Popover through its Binding without restoring trigger focus',
  () =>
    Story.story(
      parent,
      Story.init(),
      Story.message(Message.ClickedOpenPopover()),
      Story.Command.resolveAllExact(
        [LockPopoverScroll, PopoverMessage.CompletedLockPopoverScroll()],
        [InertPopoverOthers, PopoverMessage.CompletedInertPopoverOthers()],
      ),
      Story.message(Message.PressedTabFromPopover()),
      Story.model(model => {
        expect(model.popover.isOpen).toBe(false)
        expect(model.closedCount).toBe(1)
      }),
      Story.Command.expectExact(UnlockPopoverScroll, RestorePopoverInert),
      Story.Command.resolveAllExact(
        [UnlockPopoverScroll, PopoverMessage.CompletedUnlockPopoverScroll()],
        [RestorePopoverInert, PopoverMessage.CompletedRestorePopoverInert()],
      ),
    ),
)
