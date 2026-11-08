import { Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

import * as Popover from '@foldkit/ui/popover'

const Model = Schema.Struct({ popover: Popover.PopoverBlock.Model })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  PressedTabFromPopover: {},
})
type Message = typeof Message.Type

const ParentKey = Symbol('PopoverCloseWithoutRestoringFocusFixture')
export const PopoverCloseWithoutRestoringFocusFixtureBlock = Block.make(
  'PopoverCloseWithoutRestoringFocusFixture',
  {
    key: ParentKey,
    InitArgs: Schema.Tuple([]),
    Model,
    Message,
  },
)

export const PopoverBinding =
  PopoverCloseWithoutRestoringFocusFixtureBlock.makeRequiredFieldBinding(
    Popover.PopoverBlock,
    { field: 'popover', init: false },
  ).withOutMessagePolicy({
    fold: PopoverCloseWithoutRestoringFocusFixtureBlock.makeOutMessageFold(
      Popover.PopoverBlock,
      {
        Opened: PopoverCloseWithoutRestoringFocusFixtureBlock.makeNoopStep,
        Closed: PopoverCloseWithoutRestoringFocusFixtureBlock.makeNoopStep,
      },
    ),
  })

const PopoverCloseWithoutRestoringFocusFixtureComposition =
  PopoverCloseWithoutRestoringFocusFixtureBlock.makeComposition({
    bindings: [PopoverBinding],
  })

export const update =
  PopoverCloseWithoutRestoringFocusFixtureComposition.makeUpdate({
    PressedTabFromPopover: PopoverBinding.requestCloseWithoutRestoringFocus(),
  })

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type PopoverCloseAssertions = [
  Expect<
    Equal<
      Parameters<typeof PopoverBinding.requestCloseWithoutRestoringFocus>,
      []
    >
  >,
  Expect<
    Equal<
      typeof Popover.InMessage.RequestedCloseWithoutRestoringFocus.Type,
      Readonly<{ _tag: 'RequestedCloseWithoutRestoringFocus' }>
    >
  >,
]
