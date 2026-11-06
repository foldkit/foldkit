import { Schema } from 'effect'
import type { ChildAttribute, Html } from 'foldkit/html'
import {
  type MessageUnion,
  defineInMessageUnion,
  defineMessageUnion,
} from 'foldkit/message'

import type { AnchorConfig } from '../anchor/index.js'
import { AnimationBlock } from '../animation/definition.js'

/** Schema for the activation trigger: whether the user interacted via mouse or keyboard. */
export const ActivationTrigger = Schema.Literals(['Pointer', 'Keyboard'])
export type ActivationTrigger = typeof ActivationTrigger.Type

/** Schema for the listbox orientation: whether items flow vertically or horizontally. */
export const Orientation = Schema.Literals(['Vertical', 'Horizontal'])
export type Orientation = typeof Orientation.Type

/** Schema fields shared by all listbox variants (single-select and multi-select). Spread into each variant's `Schema.Struct` to avoid duplicating field definitions. */
export const BaseModel = Schema.Struct({
  id: Schema.String,
  isOpen: Schema.Boolean,
  isAnimated: Schema.Boolean,
  isModal: Schema.Boolean,
  orientation: Orientation,
  animation: AnimationBlock.Model,
  maybeActiveItemIndex: Schema.Option(Schema.Number),
  activationTrigger: ActivationTrigger,
  searchQuery: Schema.String,
  searchVersion: Schema.Number,
  maybeLastPointerPosition: Schema.Option(
    Schema.Struct({ screenX: Schema.Number, screenY: Schema.Number }),
  ),
  maybeLastButtonPointerType: Schema.Option(Schema.String),
})
export type BaseModel = typeof BaseModel.Type

/** Configuration fields shared by all listbox variant `init` functions. */
export const InitConfig = Schema.Struct({
  id: Schema.String,
  isAnimated: Schema.optionalKey(Schema.Boolean),
  isModal: Schema.optionalKey(Schema.Boolean),
  orientation: Schema.optionalKey(Orientation),
})
export type InitConfig = typeof InitConfig.Type
export type BaseInitConfig = InitConfig

/** Self-contained selected-value Codec; serialization must execute synchronously. */
export type ValueSchema<
  Value extends string,
  ValueEncoded = Value,
> = Schema.Codec<Value, ValueEncoded, never, never> &
  Readonly<{ '~type.make': Value }>

/** Builds Listbox Messages with the selected value's runtime contract. */
export const makeMessage = <Value extends string, ValueEncoded>(
  Value: ValueSchema<Value, ValueEncoded>,
) =>
  defineMessageUnion({
    RequestedSelectItem: { item: Value },
    Opened: { maybeActiveItemIndex: Schema.Option(Schema.Number) },
    Closed: {},
    BlurredItems: {},
    ActivatedItem: {
      index: Schema.Number,
      activationTrigger: ActivationTrigger,
    },
    DeactivatedItem: {},
    SelectedItem: { item: Value },
    MovedPointerOverItem: {
      index: Schema.Number,
      screenX: Schema.Number,
      screenY: Schema.Number,
    },
    RequestedItemClick: { index: Schema.Number },
    Searched: {
      key: Schema.String,
      maybeTargetIndex: Schema.Option(Schema.Number),
    },
    CompletedDelayClearListboxSearch: { version: Schema.Number },
    CompletedLockListboxScroll: {},
    CompletedUnlockListboxScroll: {},
    CompletedInertListboxOthers: {},
    CompletedRestoreListboxInert: {},
    CompletedFocusListboxButton: {},
    CompletedFocusListboxItems: {},
    CompletedScrollListboxItemIntoView: {},
    CompletedClickListboxItem: {},
    ClickedButton: {},
    IgnoredMouseClick: {},
    SuppressedSpaceScroll: {},
    SuppressedItemCommit: {},
    CompletedAnchorListbox: {},
    CompletedPortalListboxBackdrop: {},
    CompletedDetectListboxMovementOrAnimationEnd: { generation: Schema.Number },
    PressedPointerOnButton: {
      pointerType: Schema.String,
      button: Schema.Number,
    },
  })
/** Messages for a Listbox with unrestricted string values. */
export const Message = makeMessage(Schema.String)
export type Message<Value extends string = string> =
  MessageSchema<Value>['Type']

/** Exact selection payload Codecs and constructors on a Listbox contract. */
export type MessageSchema<Value extends string = string, ValueEncoded = Value> =
  typeof Message extends MessageUnion<infer Cases>
    ? MessageUnion<
        Omit<Cases, 'RequestedSelectItem' | 'SelectedItem'> &
          Readonly<{
            RequestedSelectItem: Readonly<{
              item: ValueSchema<Value, ValueEncoded>
            }>
            SelectedItem: Readonly<{ item: ValueSchema<Value, ValueEncoded> }>
          }>
      >
    : never

/** Parent open and close requests. Selection adapters retain scalar values. */
export const InMessage = defineInMessageUnion({
  RequestedOpen: {},
  RequestedClose: {},
})
export type InMessage = typeof InMessage.Type

export type Opened = typeof Message.Opened.Type
export type Closed = typeof Message.Closed.Type
export type RequestedOpen = typeof InMessage.RequestedOpen.Type
export type RequestedClose = typeof InMessage.RequestedClose.Type
export type RequestedSelectItem = typeof Message.RequestedSelectItem.Type
export type BlurredItems = typeof Message.BlurredItems.Type
export type ActivatedItem = typeof Message.ActivatedItem.Type
export type DeactivatedItem = typeof Message.DeactivatedItem.Type
export type SelectedItem = typeof Message.SelectedItem.Type
export type MovedPointerOverItem = typeof Message.MovedPointerOverItem.Type
export type RequestedItemClick = typeof Message.RequestedItemClick.Type
export type Searched = typeof Message.Searched.Type
export type CompletedDelayClearListboxSearch =
  typeof Message.CompletedDelayClearListboxSearch.Type
/** A click on the Listbox trigger button. */
export type ClickedButton = typeof Message.ClickedButton.Type
export type IgnoredMouseClick = typeof Message.IgnoredMouseClick.Type
export type SuppressedSpaceScroll = typeof Message.SuppressedSpaceScroll.Type
export type SuppressedItemCommit = typeof Message.SuppressedItemCommit.Type
export type PressedPointerOnButton = typeof Message.PressedPointerOnButton.Type

export type Selected<Value extends string = string> = Readonly<{
  readonly _tag: 'Selected'
  readonly value: Value
}>

/** Builds the selection OutMessage with the selected value's runtime contract. */
export const makeOutMessage = <Value extends string, ValueEncoded>(
  Value: ValueSchema<Value, ValueEncoded>,
) => defineMessageUnion({ Selected: { value: Value } })

/** Selection OutMessages for a Listbox with unrestricted string values. */
export const OutMessage = makeOutMessage(Schema.String)
export type OutMessage<Value extends string = string> = Selected<Value>

/** Exact selected-value Codec and constructor on a Listbox contract. */
export type OutMessageSchema<
  Value extends string = string,
  ValueEncoded = Value,
> =
  typeof OutMessage extends MessageUnion<infer Cases>
    ? MessageUnion<
        Omit<Cases, 'Selected'> &
          Readonly<{
            Selected: Omit<Cases['Selected'], 'value'> &
              Readonly<{ value: ValueSchema<Value, ValueEncoded> }>
          }>
      >
    : never

/** Configuration for an individual listbox item's appearance. */
export type ItemConfig = Readonly<{
  className?: string
  content: Html
}>

/** Configuration for a group heading rendered above a group of items. */
export type GroupHeading = Readonly<{
  content: Html
  className?: string
}>

/** Per-render view inputs passed to a Listbox connection's `embedView` method.
 *
 *  The Listbox emits a `Selected({ value })` OutMessage on commit.
 *  Fold it through the Listbox connection: single-select stores
 *  the value, while multi-select toggles its membership. */
export type BaseViewInputsCommon<Item> = Readonly<{
  items: ReadonlyArray<Item>
  itemToConfig: (
    item: Item,
    context: Readonly<{
      isActive: boolean
      isDisabled: boolean
      /** Mirrors the view input of the same name, so `itemToConfig` can
       *  style items for read-only state without closing over `viewInputs`. */
      isReadOnly: boolean
      isSelected: boolean
    }>,
  ) => ItemConfig
  isItemDisabled?: (item: Item, index: number) => boolean
  itemToSearchText?: (item: Item, index: number) => string
  isButtonDisabled?: boolean
  buttonContent: Html
  buttonClassName?: string
  buttonAttributes?: ReadonlyArray<ChildAttribute>
  itemsClassName?: string
  itemsAttributes?: ReadonlyArray<ChildAttribute>
  itemsScrollClassName?: string
  itemsScrollAttributes?: ReadonlyArray<ChildAttribute>
  backdropClassName?: string
  backdropAttributes?: ReadonlyArray<ChildAttribute>
  className?: string
  attributes?: ReadonlyArray<ChildAttribute>
  itemGroupKey?: (item: Item, index: number) => string
  groupToHeading?: (groupKey: string) => GroupHeading | undefined
  groupClassName?: string
  groupAttributes?: ReadonlyArray<ChildAttribute>
  separatorClassName?: string
  separatorAttributes?: ReadonlyArray<ChildAttribute>
  anchor?: AnchorConfig
  name?: string
  form?: string
  /** Marks the Listbox unavailable with `aria-disabled="true"` on the button
   *  and `data-disabled` on the button and the wrapper, and removes the
   *  button's handlers so the dropdown cannot be opened. */
  isDisabled?: boolean
  /** Prevents committing a selection while exposing read-only semantics
   *  with `aria-readonly="true"` and `data-readonly` on the items panel, and
   *  `data-readonly` on the wrapper, button, and every item. The Listbox
   *  still opens, navigates, and searches. Independent of `isDisabled`:
   *  setting both emits both attribute sets, and `isDisabled` still wins for
   *  interaction, since its button drops every handler, so a Listbox that is
   *  both read-only and disabled cannot be opened at all. */
  isReadOnly?: boolean
  isInvalid?: boolean
  ariaLabel?: string
  ariaLabelledBy?: string
}>

/** Maps rendering items into selected Values. The identity form needs no
 * extractor when every supplied item already satisfies the Value type. */
export type ItemToValueInput<Item, Value extends string = string> =
  | Readonly<{ itemToValue: (item: Item) => Value }>
  | Readonly<{ items: ReadonlyArray<Item & Value>; itemToValue?: never }>

/** Per-render view inputs for the shared array-based Listbox view. The
 *  multi-select variant exposes this shape directly; the single-select
 *  variant swaps `selectedValues` for `maybeSelectedValue` at its public
 *  seam and adapts to this shape internally. */
export type BaseViewInputs<
  Item,
  Value extends string = string,
> = BaseViewInputsCommon<Item> &
  Readonly<{
    /** The selection the parent owns, passed in fresh on every render.
     *  Drives `aria-selected` and `data-selected` on items, which item the
     *  Listbox highlights when it opens onto a selection, and the hidden
     *  form inputs submitted under `name`. */
    selectedValues: ReadonlyArray<Value>
  }> &
  ItemToValueInput<Item, Value>
