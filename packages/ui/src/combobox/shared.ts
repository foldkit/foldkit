import {
  Array,
  Effect,
  Function,
  Layer,
  Match,
  Option,
  Predicate,
  Schema,
  pipe,
} from 'effect'
import * as Block from 'foldkit/block'
import * as Dom from 'foldkit/dom'
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { type MessageUnion, defineMessageUnion } from 'foldkit/message'
import * as Mount from 'foldkit/mount'
import { makeModifyFieldsFor } from 'foldkit/struct'
import * as Update from 'foldkit/update'

import { AnchorConfig, anchorSetup, portalBackdrop } from '../anchor/index.js'
import * as Animation from '../animation/index.js'
import { groupContiguous } from '../group.js'
import * as OptionExt from '../internal/optionExtensions.js'
import { idSelector } from '../internal/selectors.js'
import { findFirstEnabledIndex, keyToIndex } from '../keyboard.js'

export { groupContiguous }

/** Shared Combobox namespace for selection-specific definitions and effects. */
export const ComboboxNamespace = Block.makeNamespace('Combobox')

// MODEL

/** Schema for the activation trigger: whether the user interacted via mouse or keyboard. */
export const ActivationTrigger = Schema.Literals(['Pointer', 'Keyboard'])
export type ActivationTrigger = typeof ActivationTrigger.Type

/** Schema fields shared by all combobox variants (single-select and multi-select). Spread into each variant's `Schema.Struct` to avoid duplicating field definitions. */
export const BaseModel = Schema.Struct({
  id: Schema.String,
  isOpen: Schema.Boolean,
  isAnimated: Schema.Boolean,
  isModal: Schema.Boolean,
  nullable: Schema.Boolean,
  immediate: Schema.Boolean,
  selectInputOnFocus: Schema.Boolean,
  animation: Animation.AnimationBlock.Model,
  maybeActiveItemIndex: Schema.Option(Schema.Number),
  activationTrigger: ActivationTrigger,
  inputValue: Schema.String,
  maybeLastPointerPosition: Schema.Option(
    Schema.Struct({ screenX: Schema.Number, screenY: Schema.Number }),
  ),
})
export type BaseModel = typeof BaseModel.Type

/** Configuration fields shared by all combobox variant `init` functions. */
export type BaseInitConfig = Readonly<{
  id: string
  isAnimated?: boolean
  isModal?: boolean
  nullable?: boolean
  /** Emits `Selected` on every keyboard activation while open, so arrow keys
   *  commit as they move instead of waiting for Enter. Combining `immediate`
   *  with `nullable` is discouraged: a nullable toggle fold would deselect as
   *  the arrows pass back over the selected item (see issue #693). Default
   *  `false`. */
  immediate?: boolean
  selectInputOnFocus?: boolean
}>

/** Creates the shared base fields for a combobox model from a config. Each variant spreads this and adds its selection fields. */
export const baseInit = (config: BaseInitConfig): BaseModel => ({
  id: config.id,
  isOpen: false,
  isAnimated: config.isAnimated ?? false,
  isModal: config.isModal ?? false,
  nullable: config.nullable ?? false,
  immediate: config.immediate ?? false,
  selectInputOnFocus: config.selectInputOnFocus ?? false,
  animation: Animation.AnimationBlock.init({ id: `${config.id}-items` }).model,
  maybeActiveItemIndex: Option.none(),
  activationTrigger: 'Keyboard',
  inputValue: '',
  maybeLastPointerPosition: Option.none(),
})

// MESSAGE

/** A synchronous, service-free string Codec whose constructor input preserves
 *  the exact Item type. The encoded type is retained in the completed Block's
 *  Message and OutMessage Codecs. */
export type ItemSchema<Item extends string, ItemEncoded = Item> = Schema.Codec<
  Item,
  ItemEncoded,
  never,
  never
> &
  Readonly<{ '~type.make': Item }>

/** Builds the Combobox Message union with item payloads refined by a Schema. */
export const makeMessage = <Item extends string, ItemEncoded = Item>(
  Item: ItemSchema<Item, ItemEncoded>,
) =>
  defineMessageUnion({
    RequestedOpen: {},
    RequestedClose: {
      restingInputValue: Schema.String,
      isClearable: Schema.Boolean,
    },
    RequestedSelectItem: {
      item: Item,
      displayText: Schema.String,
    },
    Opened: { maybeActiveItemIndex: Schema.Option(Schema.Number) },
    Closed: {
      restingInputValue: Schema.String,
      isClearable: Schema.Boolean,
    },
    BlurredInput: {
      restingInputValue: Schema.String,
      isClearable: Schema.Boolean,
    },
    ActivatedItem: {
      index: Schema.Number,
      activationTrigger: ActivationTrigger,
      maybeImmediateSelection: Schema.Option(Schema.Struct({ item: Item })),
    },
    DeactivatedItem: {},
    SelectedItem: {
      item: Item,
      displayText: Schema.String,
      wasSelected: Schema.Boolean,
    },
    MovedPointerOverItem: {
      index: Schema.Number,
      screenX: Schema.Number,
      screenY: Schema.Number,
    },
    RequestedItemClick: { index: Schema.Number },
    SuppressedItemCommit: {},
    SuppressedEmptyItemNavigation: {},
    CompletedLockScroll: {},
    CompletedUnlockScroll: {},
    CompletedInertOthers: {},
    CompletedRestoreInert: {},
    CompletedFocusInput: {},
    CompletedScrollItemIntoView: {},
    CompletedClickItem: {},
    CompletedAnchor: {},
    CompletedAttachPreventBlur: {},
    CompletedAttachSelectOnFocus: {},
    CompletedPortalBackdrop: {},
    CompletedDetectMovementOrAnimationEnd: { generation: Schema.Number },
    UpdatedInputValue: { value: Schema.String },
    PressedToggleButton: {
      restingInputValue: Schema.String,
      isClearable: Schema.Boolean,
    },
  })

/** Union of all Messages the broad string Combobox component can produce. */
export const Message = makeMessage(Schema.String)

export type Opened = typeof Message.Opened.Type
export type Closed = typeof Message.Closed.Type
export type RequestedOpen = typeof Message.RequestedOpen.Type
export type RequestedClose = typeof Message.RequestedClose.Type
export type RequestedSelectItem = typeof Message.RequestedSelectItem.Type
export type BlurredInput = typeof Message.BlurredInput.Type
export type ActivatedItem = typeof Message.ActivatedItem.Type
export type DeactivatedItem = typeof Message.DeactivatedItem.Type
export type SelectedItem = typeof Message.SelectedItem.Type
export type MovedPointerOverItem = typeof Message.MovedPointerOverItem.Type
export type RequestedItemClick = typeof Message.RequestedItemClick.Type
export type SuppressedItemCommit = typeof Message.SuppressedItemCommit.Type
export type SuppressedEmptyItemNavigation =
  typeof Message.SuppressedEmptyItemNavigation.Type
export type CompletedLockScroll = typeof Message.CompletedLockScroll.Type
export type CompletedUnlockScroll = typeof Message.CompletedUnlockScroll.Type
export type CompletedInertOthers = typeof Message.CompletedInertOthers.Type
export type CompletedRestoreInert = typeof Message.CompletedRestoreInert.Type
export type CompletedFocusInput = typeof Message.CompletedFocusInput.Type
export type CompletedScrollItemIntoView =
  typeof Message.CompletedScrollItemIntoView.Type
export type CompletedClickItem = typeof Message.CompletedClickItem.Type
export type UpdatedInputValue = typeof Message.UpdatedInputValue.Type
export type PressedToggleButton = typeof Message.PressedToggleButton.Type

/** The Message Schema and callable constructors on a created Combobox,
 * refined to the Item Schema supplied to `create`. */
export type MessageSchema<Item extends string = string, ItemEncoded = Item> =
  typeof Message extends MessageUnion<infer Cases>
    ? MessageUnion<
        Omit<Cases, 'RequestedSelectItem' | 'SelectedItem' | 'ActivatedItem'> &
          Readonly<{
            RequestedSelectItem: Omit<Cases['RequestedSelectItem'], 'item'> &
              Readonly<{
                item: ItemSchema<Item, ItemEncoded>
              }>
            SelectedItem: Omit<Cases['SelectedItem'], 'item'> &
              Readonly<{
                item: ItemSchema<Item, ItemEncoded>
              }>
            ActivatedItem: Omit<
              Cases['ActivatedItem'],
              'maybeImmediateSelection'
            > &
              Readonly<{
                maybeImmediateSelection: Schema.Option<
                  Schema.Struct<
                    Readonly<{
                      item: ItemSchema<Item, ItemEncoded>
                    }>
                  >
                >
              }>
          }>
      >
    : never

/** Every Message a created Combobox can process, refined to its Item Schema. */
export type Message<Item extends string = string> = MessageSchema<Item>['Type']

// OUT MESSAGE

export type Selected<Value extends string = string> = Readonly<{
  readonly _tag: 'Selected'
  readonly value: Value
}>

export type ClearedSelection = typeof OutMessage.ClearedSelection.Type

/** Builds the Combobox OutMessage union with its selected value refined by a Schema. */
export const makeOutMessage = <Item extends string, ItemEncoded = Item>(
  Item: ItemSchema<Item, ItemEncoded>,
) =>
  defineMessageUnion({
    Selected: { value: Item },
    ClearedSelection: {},
  })

/** Union of OutMessages the broad string Combobox component can produce. */
export const OutMessage = makeOutMessage(Schema.String)

/** The OutMessage Schema and callable constructors on a created Combobox,
 * refined to the Item Schema supplied to `create`. */
export type OutMessageSchema<Item extends string = string, ItemEncoded = Item> =
  typeof OutMessage extends MessageUnion<infer Cases>
    ? MessageUnion<
        Omit<Cases, 'Selected'> &
          Readonly<{
            Selected: Omit<Cases['Selected'], 'value'> &
              Readonly<{
                value: ItemSchema<Item, ItemEncoded>
              }>
          }>
      >
    : never

/** Generic over `Value extends string` so consumers who create the combobox
 *  with a refined Item Schema receive `value: Value` in the
 *  `Selected` OutMessage from the factory's `update`, instead of
 *  `value: string`. Defaults to `string`. */
export type OutMessage<Value extends string = string> =
  | Selected<Value>
  | ClearedSelection

// SELECTORS

/** Returns the bare DOM id of the combobox input, derived from the
 *  combobox's base id. Use this to associate an external label with the
 *  input via a native `<label for={Combobox.inputId(id)}>` or an
 *  `aria-labelledby` reference. Mirrors `inputSelector`, which returns the
 *  CSS selector form (`#${id}-input`) rather than the bare id. */
export const inputId = (id: string): string => `${id}-input`

export const inputSelector = (id: string): string => idSelector(`${id}-input`)
export const inputWrapperSelector = (id: string): string =>
  idSelector(`${id}-input-wrapper`)
export const itemsSelector = (id: string): string => idSelector(`${id}-items`)
const backdropSelector = (id: string): string => idSelector(`${id}-backdrop`)
export const itemSelector = (id: string, index: number): string =>
  idSelector(`${id}-item-${index}`)
export const itemId = (id: string, index: number): string =>
  `${id}-item-${index}`

// HELPERS

const modifyBaseFields = makeModifyFieldsFor<BaseModel>()

/** Resets only shared base fields to their closed state. Does not touch inputValue. That is variant-specific. */
export const closedBaseModel = <Model extends BaseModel>(model: Model): Model =>
  modifyBaseFields(model, {
    isOpen: () => false,
    maybeActiveItemIndex: () => Option.none(),
    activationTrigger: () => 'Keyboard' as const,
    maybeLastPointerPosition: () => Option.none(),
  })

// UPDATE FACTORY

type HandlerReturn<Model, EmittedOutMessage> = Readonly<{
  model: Model
  commands?: never
  outMessage?: EmittedOutMessage
}>

/** Prevents page scrolling while the combobox popup is open in modal mode. */
export const LockScroll = ComboboxNamespace.makeCommand('LockScroll', {
  messages: [Message.CompletedLockScroll],
  handler: function* () {
    return () => Dom.lockScroll.pipe(Effect.as(Message.CompletedLockScroll()))
  },
})
/** Re-enables page scrolling after the combobox popup closes. */
export const UnlockScroll = ComboboxNamespace.makeCommand('UnlockScroll', {
  messages: [Message.CompletedUnlockScroll],
  handler: function* () {
    return () =>
      Dom.unlockScroll.pipe(Effect.as(Message.CompletedUnlockScroll()))
  },
})
/** Marks all elements outside the combobox as inert for modal behavior. */
export const InertOthers = ComboboxNamespace.makeCommand('InertOthers', {
  args: { id: Schema.String },
  messages: [Message.CompletedInertOthers],
  handler: function* () {
    return ({ id }) =>
      Dom.inertOthers(id, [
        inputWrapperSelector(id),
        itemsSelector(id),
        backdropSelector(id),
      ]).pipe(Effect.as(Message.CompletedInertOthers()))
  },
})
/** Removes the inert attribute from elements outside the combobox. */
export const RestoreInert = ComboboxNamespace.makeCommand('RestoreInert', {
  args: { id: Schema.String },
  messages: [Message.CompletedRestoreInert],
  handler: function* () {
    return ({ id }) =>
      Dom.restoreInert(id).pipe(Effect.as(Message.CompletedRestoreInert()))
  },
})
/** Moves focus to the combobox input after selection or close. */
export const FocusInput = ComboboxNamespace.makeCommand('FocusInput', {
  args: { id: Schema.String },
  messages: [Message.CompletedFocusInput],
  handler: function* () {
    return ({ id }) =>
      Dom.focus(inputSelector(id)).pipe(
        Effect.ignore,
        Effect.as(Message.CompletedFocusInput()),
      )
  },
})
/** Scrolls the active combobox item into view after keyboard navigation. */
export const ScrollItemIntoView = ComboboxNamespace.makeCommand(
  'ScrollItemIntoView',
  {
    args: { id: Schema.String, index: Schema.Number },
    messages: [Message.CompletedScrollItemIntoView],
    handler: function* () {
      return ({ id, index }) =>
        Dom.scrollIntoView(itemSelector(id, index)).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedScrollItemIntoView()),
        )
    },
  },
)
/** Programmatically clicks the active combobox item's DOM element. */
export const ClickItem = ComboboxNamespace.makeCommand('ClickItem', {
  args: { id: Schema.String, index: Schema.Number },
  messages: [Message.CompletedClickItem],
  handler: function* () {
    return ({ id, index }) =>
      Dom.clickElement(itemSelector(id, index)).pipe(
        Effect.ignore,
        Effect.as(Message.CompletedClickItem()),
      )
  },
})
/** Detects whether the combobox input wrapper moved or the leave animation ended. Whichever comes first; both outcomes signal the Animation block that leave is complete. */
export const DetectMovementOrAnimationEnd = ComboboxNamespace.makeCommand(
  'DetectMovementOrAnimationEnd',
  {
    args: { id: Schema.String, generation: Schema.Number },
    messages: [Message.CompletedDetectMovementOrAnimationEnd],
    handler: function* () {
      return ({ id, generation }) =>
        Effect.raceFirst(
          Dom.detectElementMovement(inputWrapperSelector(id)).pipe(
            Effect.as(
              Message.CompletedDetectMovementOrAnimationEnd({ generation }),
            ),
          ),
          Dom.waitForAnimationSettled(itemsSelector(id)).pipe(
            Effect.as(
              Message.CompletedDetectMovementOrAnimationEnd({ generation }),
            ),
          ),
        )
    },
  },
)

/** Creates exact Combobox Message handlers from variant-specific behavior. Shared logic handles opening, closing, activation, and transitions; close, selection, and immediate activation vary by variant. */
export const makeUpdateHandlers = <
  Item extends string,
  ItemEncoded,
  ParentOutMessageSchema extends Schema.Top,
>(
  bindChild: Block.BindChild<
    typeof BaseModel,
    MessageSchema<Item, ItemEncoded>,
    ParentOutMessageSchema
  >,
  makeOutMessageFold: Block.MakeOutMessageFold<
    BaseModel,
    Message<Item>,
    OutMessage<Item>
  >,
  step: Block.DefineStep<BaseModel, Message<Item>, OutMessage<Item>>,
  stepFields: Block.DefineStepFields<BaseModel, Message<Item>>,
  stepNoop: Block.DefineStepNoop<BaseModel>,
  commandsStep: Block.MakeCommandsStep<BaseModel, Message<Item>>,
  selectionBehavior: 'CloseWithFocus' | 'KeepOpen',
  handlers: Readonly<{
    handleClose: (
      model: BaseModel,
      restingInputValue: string,
      isClearable: boolean,
    ) => HandlerReturn<BaseModel, ClearedSelection>
    handleSelectedItem: (
      model: BaseModel,
      item: Item,
      displayText: string,
      wasSelected: boolean,
    ) => HandlerReturn<BaseModel, Selected<Item>>
    handleImmediateActivation: (
      model: BaseModel,
      item: Item,
    ) => HandlerReturn<BaseModel, Selected<Item>>
  }>,
) => {
  type Model = BaseModel

  const detectMovementOrAnimationEndStep = (generation: number) =>
    commandsStep(model => [
      DetectMovementOrAnimationEnd({ id: model.id, generation }),
    ])

  const foldAnimationOutMessage = makeOutMessageFold(Animation.AnimationBlock, {
    StartedLeaveAnimating: ({ generation }) =>
      detectMovementOrAnimationEndStep(generation),
    TransitionedOut: stepNoop,
  })

  const AnimationBinding = bindChild(Animation.AnimationBlock, {
    field: 'animation',
    init: false,
  }).withOutMessagePolicy({ fold: foldAnimationOutMessage })

  const openCommands = (model: Model) =>
    Array.filter(
      [LockScroll(), InertOthers({ id: model.id })],
      () => model.isModal,
    )

  const closeWithoutFocusCommands = (model: Model) =>
    Array.filter(
      [UnlockScroll(), RestoreInert({ id: model.id })],
      () => model.isModal,
    )

  const focusInput = (model: Model) => FocusInput({ id: model.id })

  const closeWithFocusCommands = (model: Model) => [
    focusInput(model),
    ...closeWithoutFocusCommands(model),
  ]

  const closeSelectedItemWithFocus = (
    model: Model,
    nextModel: Model,
    outMessage?: Selected<Item>,
  ) => {
    const didClose = model.isOpen && !nextModel.isOpen
    const commands = didClose
      ? closeWithFocusCommands(model)
      : [focusInput(model)]

    if (didClose && model.isAnimated) {
      return step(() =>
        Function.compose(
          Update.combineSteps([
            step(() => ({ model: nextModel, commands })),
            AnimationBinding.requestHide(),
          ]),
          Update.withOutMessage(outMessage),
        ),
      )
    }

    if (outMessage === undefined) {
      return step(() => ({ model: nextModel, commands }))
    } else {
      return step(() => ({ model: nextModel, commands, outMessage }))
    }
  }

  const openComboboxStep = (model: Model, baseModel: Model) => {
    if (model.isAnimated) {
      return Update.combineSteps([
        step(() => ({ model: baseModel, commands: openCommands(model) })),
        AnimationBinding.requestShow(),
        stepFields(() => ({ isOpen: () => true })),
      ])
    }

    return step(() => ({
      model: modifyBaseFields(baseModel, { isOpen: () => true }),
      commands: openCommands(model),
    }))
  }

  const closeComboboxStep = (
    model: Model,
    baseModel: Model,
    commands: ReturnType<typeof closeWithFocusCommands>,
    restingInputValue: string,
    isClearable: boolean,
  ) => {
    const comboboxClose = handlers.handleClose(
      baseModel,
      restingInputValue,
      isClearable,
    )

    if (model.isAnimated) {
      return step(() =>
        Function.compose(
          Update.combineSteps([
            step(() => ({ model: comboboxClose.model, commands })),
            AnimationBinding.requestHide(),
          ]),
          Update.withOutMessage(comboboxClose.outMessage),
        ),
      )
    }

    return step(() =>
      Update.withOutMessage(
        { model: comboboxClose.model, commands },
        comboboxClose.outMessage,
      ),
    )
  }

  const openWithActiveItem = (
    model: Model,
    maybeActiveItemIndex: Option.Option<number>,
  ) => {
    if (model.isOpen) {
      return stepNoop()
    }

    return openComboboxStep(
      model,
      modifyBaseFields(model, {
        maybeActiveItemIndex: () => maybeActiveItemIndex,
        activationTrigger: () =>
          Option.match(maybeActiveItemIndex, {
            onNone: () => 'Pointer' as const,
            onSome: () => 'Keyboard' as const,
          }),
        maybeLastPointerPosition: () => Option.none(),
      }),
    )
  }

  const closeIfOpen = (
    model: Model,
    commands: ReturnType<typeof closeWithFocusCommands>,
    restingInputValue: string,
    isClearable: boolean,
  ) =>
    model.isOpen
      ? closeComboboxStep(
          model,
          model,
          commands,
          restingInputValue,
          isClearable,
        )
      : stepNoop()

  const selectItem = (
    model: Model,
    item: Item,
    displayText: string,
    wasSelected: boolean,
  ) => {
    const selection = handlers.handleSelectedItem(
      model,
      item,
      displayText,
      wasSelected,
    )

    if (selectionBehavior === 'CloseWithFocus') {
      return closeSelectedItemWithFocus(
        model,
        selection.model,
        selection.outMessage,
      )
    } else {
      return step(() => selection)
    }
  }

  const cases = {
    CompletedLockScroll: model => ({ model }),
    CompletedUnlockScroll: model => ({ model }),
    CompletedInertOthers: model => ({ model }),
    CompletedRestoreInert: model => ({ model }),
    CompletedFocusInput: model => ({ model }),
    CompletedScrollItemIntoView: model => ({ model }),
    CompletedClickItem: model => ({ model }),
    SuppressedItemCommit: model => ({ model }),
    SuppressedEmptyItemNavigation: model => ({ model }),
    CompletedAnchor: model => ({ model }),
    CompletedAttachPreventBlur: model => ({ model }),
    CompletedAttachSelectOnFocus: model => ({ model }),
    CompletedPortalBackdrop: model => ({ model }),
    RequestedOpen: model => openWithActiveItem(model, Option.none()),

    RequestedClose: (model, { restingInputValue, isClearable }) =>
      closeIfOpen(
        model,
        closeWithFocusCommands(model),
        restingInputValue,
        isClearable,
      ),

    RequestedSelectItem: (model, { item, displayText }) =>
      selectItem(model, item, displayText, false),

    Opened: (model, { maybeActiveItemIndex }) =>
      openWithActiveItem(model, maybeActiveItemIndex),

    // NOTE: A blur Message can arrive after selection has already closed the
    // Combobox. Ignore that stale Message so it cannot restore an old input
    // value or emit ClearedSelection again.
    Closed: (model, { restingInputValue, isClearable }) =>
      closeIfOpen(
        model,
        closeWithFocusCommands(model),
        restingInputValue,
        isClearable,
      ),

    BlurredInput: (model, { restingInputValue, isClearable }) =>
      closeIfOpen(
        model,
        closeWithoutFocusCommands(model),
        restingInputValue,
        isClearable,
      ),

    ActivatedItem: (
      model,
      { index, activationTrigger, maybeImmediateSelection },
    ) => {
      const highlightedModel = modifyBaseFields(model, {
        maybeActiveItemIndex: () => Option.some(index),
        activationTrigger: () => activationTrigger,
      })

      const skippedActivation: HandlerReturn<Model, Selected<Item>> = {
        model: highlightedModel,
      }

      const activation = Option.match(maybeImmediateSelection, {
        onNone: () => skippedActivation,
        onSome: ({ item }) =>
          handlers.handleImmediateActivation(highlightedModel, item),
      })

      if (activationTrigger === 'Keyboard') {
        return Update.withOutMessage(
          {
            model: activation.model,
            commands: [ScrollItemIntoView({ id: model.id, index })],
          },
          activation.outMessage,
        )
      } else {
        return activation
      }
    },

    MovedPointerOverItem: (model, { index, screenX, screenY }) => {
      const isSamePosition = Option.exists(
        model.maybeLastPointerPosition,
        position =>
          position.screenX === screenX && position.screenY === screenY,
      )

      if (isSamePosition) {
        return { model }
      }

      return {
        model: modifyBaseFields(model, {
          maybeActiveItemIndex: () => Option.some(index),
          activationTrigger: () => 'Pointer' as const,
          maybeLastPointerPosition: () => Option.some({ screenX, screenY }),
        }),
      }
    },

    DeactivatedItem: model =>
      model.activationTrigger === 'Pointer'
        ? {
            model: modifyBaseFields(model, {
              maybeActiveItemIndex: () => Option.none(),
            }),
          }
        : { model },

    SelectedItem: (model, { item, displayText, wasSelected }) =>
      selectItem(model, item, displayText, wasSelected),

    RequestedItemClick: (model, { index }) => ({
      model,
      commands: [ClickItem({ id: model.id, index })],
    }),

    UpdatedInputValue: (model, { value }) => {
      if (model.isOpen) {
        return step(() => ({
          model: modifyBaseFields(model, {
            inputValue: () => value,
            maybeActiveItemIndex: () => Option.some(0),
            activationTrigger: () => 'Keyboard' as const,
          }),
        }))
      }

      return openComboboxStep(
        model,
        modifyBaseFields(model, {
          inputValue: () => value,
          maybeActiveItemIndex: () => Option.some(0),
          activationTrigger: () => 'Keyboard' as const,
          maybeLastPointerPosition: () => Option.none(),
        }),
      )
    },

    PressedToggleButton: (model, { restingInputValue, isClearable }) => {
      if (model.isOpen) {
        return closeComboboxStep(
          model,
          model,
          closeWithFocusCommands(model),
          restingInputValue,
          isClearable,
        )
      }

      const toggledModel = modifyBaseFields(model, {
        maybeActiveItemIndex: () => Option.none(),
        activationTrigger: () => 'Pointer' as const,
        maybeLastPointerPosition: () => Option.none(),
      })

      if (model.isAnimated) {
        return Update.combineSteps([
          step(() => ({ model: toggledModel, commands: [focusInput(model)] })),
          commandsStep(() => openCommands(model)),
          AnimationBinding.requestShow(),
          stepFields(() => ({ isOpen: () => true })),
        ])
      }

      return step(() => ({
        model: modifyBaseFields(toggledModel, { isOpen: () => true }),
        commands: [focusInput(model), ...openCommands(model)],
      }))
    },

    CompletedDetectMovementOrAnimationEnd: (_model, { generation }) =>
      AnimationBinding.requestFinish(generation),
  } satisfies Readonly<{
    [Tag in Message<Item>['_tag']]: (
      model: Model,
      message: Extract<Message<Item>, Readonly<{ _tag: Tag }>>,
    ) => unknown
  }>

  return {
    handlers: {
      ...cases,
      RequestedOpen: step(cases.RequestedOpen),
      RequestedClose: step(cases.RequestedClose),
      RequestedSelectItem: step(cases.RequestedSelectItem),
      Opened: step(cases.Opened),
      Closed: step(cases.Closed),
      BlurredInput: step(cases.BlurredInput),
      SelectedItem: step(cases.SelectedItem),
      UpdatedInputValue: step(cases.UpdatedInputValue),
      PressedToggleButton: step(cases.PressedToggleButton),
      CompletedDetectMovementOrAnimationEnd: step(
        cases.CompletedDetectMovementOrAnimationEnd,
      ),
    },
    AnimationBinding,
  }
}

/** The anchor-positioning Mount this Combobox renders on its items panel.
 *  The panel is always anchored to the input wrapper via Floating UI and
 *  portaled to the document body, or into the enclosing `<dialog>` when
 *  there is one (opt out of portaling with `anchor.portal: false`), so it
 *  escapes ancestor stacking contexts and overflow clipping. The Mount also
 *  installs the `pointerdown`-cancelling capture listener that prevents
 *  input blur on item presses. Exposed so Scene tests can call
 *  `Scene.Mount.resolve(Anchor, CompletedAnchor())`. */
export const Anchor = ComboboxNamespace.makeMount('Anchor', {
  args: { buttonId: Schema.String, anchor: AnchorConfig },
  messages: [Message.CompletedAnchor],
  handler: function* () {
    return ({ element, buttonId, anchor }) =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            const preventBlur = (event: Event) => {
              event.preventDefault()
            }
            element.addEventListener('pointerdown', preventBlur, {
              capture: true,
            })
            const teardownAnchor = anchorSetup(element, {
              buttonId,
              anchor,
              interceptTab: false,
            })
            return () => {
              element.removeEventListener('pointerdown', preventBlur, {
                capture: true,
              })
              teardownAnchor()
            }
          }),
          cleanup => Effect.sync(cleanup),
        )
        return Message.CompletedAnchor()
      })
  },
})

/** The Mount this Combobox renders to install a `pointerdown`-cancelling
 *  capture listener that prevents blur on item presses. Exposed so Scene
 *  tests can call
 *  `Scene.Mount.resolve(AttachPreventBlur, CompletedAttachPreventBlur())`. */
export const AttachPreventBlur = ComboboxNamespace.makeMount(
  'AttachPreventBlur',
  {
    messages: [Message.CompletedAttachPreventBlur],
    handler: function* () {
      return ({ element }) =>
        Effect.gen(function* () {
          yield* Effect.acquireRelease(
            Effect.sync(() => {
              const handler = (event: Event) => {
                event.preventDefault()
              }
              element.addEventListener('pointerdown', handler, {
                capture: true,
              })
              return handler
            }),
            handler =>
              Effect.sync(() =>
                element.removeEventListener('pointerdown', handler, {
                  capture: true,
                }),
              ),
          )
          return Message.CompletedAttachPreventBlur()
        })
    },
  },
)

/** The Mount this Combobox renders to install the input's select-on-focus
 *  behavior. Exposed so Scene tests can call
 *  `Scene.Mount.resolve(AttachSelectOnFocus, CompletedAttachSelectOnFocus())`. */
export const AttachSelectOnFocus = ComboboxNamespace.makeMount(
  'AttachSelectOnFocus',
  {
    messages: [Message.CompletedAttachSelectOnFocus],
    handler: function* () {
      return ({ element }) =>
        Effect.gen(function* () {
          yield* Effect.acquireRelease(
            Effect.sync(() => {
              const handler = () => {
                if (element instanceof HTMLInputElement) {
                  element.select()
                }
              }
              element.addEventListener('focus', handler)
              return handler
            }),
            handler =>
              Effect.sync(() => element.removeEventListener('focus', handler)),
          )
          return Message.CompletedAttachSelectOnFocus()
        })
    },
  },
)

/** The backdrop-portaling Mount this Combobox renders. Exposed so Scene tests can
 *  call `Scene.Mount.resolve(PortalBackdrop, CompletedPortalBackdrop())` to
 *  acknowledge the mount produced by the rendered backdrop. */
export const PortalBackdrop = ComboboxNamespace.makeMount('PortalBackdrop', {
  messages: [Message.CompletedPortalBackdrop],
  handler: function* () {
    return ({ element }) =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() => portalBackdrop(element)),
          cleanup => Effect.sync(cleanup),
        )
        return Message.CompletedPortalBackdrop()
      })
  },
})

/** Mount Definitions rendered by Combobox views. */
export const mounts = [
  Anchor,
  AttachPreventBlur,
  AttachSelectOnFocus,
  PortalBackdrop,
]

type MountRequirements = Mount.RequirementsOf<typeof mounts>

/** Provides Combobox's local Command and Mount handlers. */
export const EffectsLayer = Layer.mergeAll(
  LockScroll.layer,
  UnlockScroll.layer,
  InertOthers.layer,
  RestoreInert.layer,
  FocusInput.layer,
  ScrollItemIntoView.layer,
  ClickItem.layer,
  DetectMovementOrAnimationEnd.layer,
  Anchor.layer,
  AttachPreventBlur.layer,
  AttachSelectOnFocus.layer,
  PortalBackdrop.layer,
)

// VIEW TYPES

/** Configuration for an individual combobox item's appearance. */
export type ItemConfig = Readonly<{
  className?: string
  content: Html
}>

/** Configuration for a group heading rendered above a group of items. */
export type GroupHeading = Readonly<{
  content: Html
  className?: string
}>

/** Per-render view inputs passed to a Combobox connection's `embedView` method.
 *
 *  The Combobox emits a `Selected({ value })` OutMessage on commit.
 *  Fold it through the Combobox connection: single-select
 *  stores the value, while multi-select toggles the value's membership.
 *  `restingInputValue` is the text the input returns to on
 *  close (the selection's display text for single-select, empty for
 *  multi-select). The selection is not part of this shared shape. Each
 *  variant adds its own selection field. */
export type BaseViewInputsCommon<Item extends string> = Readonly<{
  items: ReadonlyArray<Item>
  restingInputValue: string
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
  itemToValue: (item: Item, index: number) => Item
  itemToDisplayText: (item: Item, index: number) => string
  isItemDisabled?: (item: Item, index: number) => boolean
  inputClassName?: string
  inputAttributes?: ReadonlyArray<ChildAttribute>
  inputPlaceholder?: string
  inputWrapperClassName?: string
  inputWrapperAttributes?: ReadonlyArray<ChildAttribute>
  itemsClassName?: string
  itemsAttributes?: ReadonlyArray<ChildAttribute>
  itemsScrollClassName?: string
  itemsScrollAttributes?: ReadonlyArray<ChildAttribute>
  backdropClassName?: string
  backdropAttributes?: ReadonlyArray<ChildAttribute>
  /** CSS class for the outer wrapper. Keep the wrapper positioned when the
   *  Combobox renders a backdrop, so the input paints above it. */
  className?: string
  attributes?: ReadonlyArray<ChildAttribute>
  buttonContent?: Html
  buttonClassName?: string
  buttonAttributes?: ReadonlyArray<ChildAttribute>
  formName?: string
  /** Marks the Combobox unavailable with `aria-disabled="true"` on the input
   *  and the toggle button and `data-disabled` on both plus the wrapper, and
   *  removes their handlers so the dropdown cannot be opened. */
  isDisabled?: boolean
  /** Prevents committing a selection while exposing read-only semantics with
   *  the native `readonly` attribute plus `aria-readonly="true"` on the input,
   *  `aria-readonly="true"` on the items panel, and `data-readonly` on the
   *  wrapper, input, toggle button, items panel, and every item. The Combobox
   *  still opens, navigates, and closes, and the input still takes focus and
   *  allows text selection and copying. Typing is frozen, since the input
   *  value doubles as the display of the selection. Independent of
   *  `isDisabled`: setting both emits both attribute sets, and `isDisabled`
   *  still wins for interaction, since it drops every handler, so a Combobox
   *  that is both read-only and disabled cannot be opened at all. */
  isReadOnly?: boolean
  isInvalid?: boolean
  openOnFocus?: boolean
  itemGroupKey?: (item: Item, index: number) => string
  groupToHeading?: (groupKey: string) => GroupHeading | undefined
  groupClassName?: string
  groupAttributes?: ReadonlyArray<ChildAttribute>
  separatorClassName?: string
  separatorAttributes?: ReadonlyArray<ChildAttribute>
  anchor?: AnchorConfig
  ariaLabel?: string
  ariaLabelledBy?: string
}>

/** Per-render view inputs for the shared array-based Combobox view. The
 *  multi-select variant exposes this shape directly; the single-select
 *  variant swaps `selectedValues` for `maybeSelectedValue` at its public
 *  seam and adapts to this shape internally. */
export type BaseViewInputs<Item extends string> = BaseViewInputsCommon<Item> &
  Readonly<{
    /** The selection the parent owns, passed in fresh on every render.
     *  Marks items as selected and drives the hidden form inputs
     *  submitted under `formName`. */
    selectedValues: ReadonlyArray<Item>
  }>

// VIEW FACTORY

/** Variant-specific view behavior injected into the shared combobox view factory. */
export type ViewBehavior = Readonly<{
  ariaMultiSelectable: boolean
}>

/** Creates a combobox view function from variant-specific behavior. Shared rendering logic (input, items, transitions, keyboard navigation) is handled internally; only listbox multi-select semantics vary by variant. */
export const makeView = <
  Model extends BaseModel,
  Item extends string,
  ParentMessage = never,
  ItemEncoded = Item,
>(
  behavior: ViewBehavior,
  Message: MessageSchema<Item, ItemEncoded>,
) => {
  const impl = (
    model: Model,
    viewInputs: BaseViewInputs<Item>,
    h: HtmlBuilder<Message<Item> | ParentMessage, MountRequirements>,
  ): Html => {
    const {
      id,
      isOpen,
      immediate,
      animation: { transitionState },
      maybeActiveItemIndex,
    } = model

    const {
      items,
      selectedValues,
      restingInputValue,
      itemToConfig,
      itemToValue,
      itemToDisplayText,
      isItemDisabled,
      inputClassName,
      inputAttributes = [],
      inputPlaceholder,
      inputWrapperClassName,
      inputWrapperAttributes = [],
      itemsClassName,
      itemsAttributes = [],
      itemsScrollClassName,
      itemsScrollAttributes = [],
      backdropClassName,
      backdropAttributes = [],
      className,
      attributes = [],
      buttonContent,
      buttonClassName,
      buttonAttributes = [],
      formName,
      isDisabled,
      isReadOnly = false,
      isInvalid,
      openOnFocus,
      itemGroupKey,
      groupToHeading,
      groupClassName,
      groupAttributes = [],
      separatorClassName,
      separatorAttributes = [],
      anchor = {},
      ariaLabel,
      ariaLabelledBy,
    } = viewInputs

    const resolveInputLabel = () => {
      if (Predicate.isNotUndefined(ariaLabel)) {
        return [h.AriaLabel(ariaLabel)]
      } else if (Predicate.isNotUndefined(ariaLabelledBy)) {
        return [h.AriaLabelledBy(ariaLabelledBy)]
      } else {
        return []
      }
    }

    const inputLabelAttributes = resolveInputLabel()

    const isValueSelected = (itemValue: Item): boolean =>
      Array.contains(selectedValues, itemValue)

    const isLeaving =
      transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'
    const isVisible = isOpen || isLeaving
    const isItemsPanelVisible =
      isVisible && Array.isReadonlyArrayNonEmpty(items)
    const isBackdropVisible =
      isItemsPanelVisible || (isVisible && model.isModal)

    const animationAttributes: ReadonlyArray<
      ReturnType<typeof h.DataAttribute>
    > = Match.value(transitionState).pipe(
      Match.when('EnterStart', () => [
        h.DataAttribute('closed', ''),
        h.DataAttribute('enter', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.when('EnterAnimating', () => [
        h.DataAttribute('enter', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.when('LeaveStart', () => [
        h.DataAttribute('leave', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.when('LeaveAnimating', () => [
        h.DataAttribute('closed', ''),
        h.DataAttribute('leave', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.orElse(() => []),
    )

    const isDisabledAtIndex = (index: number): boolean =>
      Predicate.isNotUndefined(isItemDisabled) &&
      pipe(
        items,
        Array.get(index),
        Option.exists(item => isItemDisabled(item, index)),
      )

    const firstEnabledIndex = findFirstEnabledIndex(
      items.length,
      0,
      isDisabledAtIndex,
    )(0, 1)

    const lastEnabledIndex = findFirstEnabledIndex(
      items.length,
      0,
      isDisabledAtIndex,
    )(items.length - 1, -1)

    const resolveActiveIndex = keyToIndex(
      'ArrowDown',
      'ArrowUp',
      items.length,
      Option.getOrElse(maybeActiveItemIndex, () => -1),
      isDisabledAtIndex,
    )

    const resolveImmediateSelection = (
      targetIndex: number,
    ): Option.Option<{ item: Item }> => {
      if (isReadOnly) {
        return Option.none()
      } else {
        return pipe(
          OptionExt.when(immediate, targetIndex),
          Option.flatMap(index => Array.get(items, index)),
          Option.map(targetItem => ({
            item: itemToValue(targetItem, targetIndex),
          })),
        )
      }
    }

    const maybeValidActiveItemIndex = Option.flatMap(
      maybeActiveItemIndex,
      index => Option.as(Array.get(items, index), index),
    )

    const resolveCommitMessage = (): Option.Option<Message<Item>> => {
      if (isReadOnly) {
        return Option.as(
          maybeValidActiveItemIndex,
          Message.SuppressedItemCommit(),
        )
      } else {
        return Option.map(maybeValidActiveItemIndex, index =>
          Message.RequestedItemClick({ index }),
        )
      }
    }

    const handleInputKeyDown = (key: string): Option.Option<Message<Item>> =>
      Match.value(key).pipe(
        Match.when('ArrowDown', () => {
          if (Array.isReadonlyArrayEmpty(items)) {
            return Option.some(Message.SuppressedEmptyItemNavigation())
          }

          if (!isOpen) {
            return Option.some(
              Message.Opened({
                maybeActiveItemIndex: Option.some(firstEnabledIndex),
              }),
            )
          }
          const targetIndex = resolveActiveIndex('ArrowDown')
          return Option.some(
            Message.ActivatedItem({
              index: targetIndex,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: resolveImmediateSelection(targetIndex),
            }),
          )
        }),
        Match.when('ArrowUp', () => {
          if (Array.isReadonlyArrayEmpty(items)) {
            return Option.some(Message.SuppressedEmptyItemNavigation())
          }

          if (!isOpen) {
            return Option.some(
              Message.Opened({
                maybeActiveItemIndex: Option.some(lastEnabledIndex),
              }),
            )
          }
          const targetIndex = resolveActiveIndex('ArrowUp')
          return Option.some(
            Message.ActivatedItem({
              index: targetIndex,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: resolveImmediateSelection(targetIndex),
            }),
          )
        }),
        Match.when('Enter', () => {
          if (!isOpen) {
            return Option.none()
          }
          return resolveCommitMessage()
        }),
        Match.when('Escape', () => {
          if (!isOpen) {
            return Option.none()
          }
          return Option.some(
            Message.Closed({ restingInputValue, isClearable: !isReadOnly }),
          )
        }),
        Match.whenOr('Home', 'End', () => {
          if (!isOpen) {
            return Option.none()
          }

          if (Array.isReadonlyArrayEmpty(items)) {
            return Option.some(Message.SuppressedEmptyItemNavigation())
          }

          const targetIndex = resolveActiveIndex(key)
          return Option.some(
            Message.ActivatedItem({
              index: targetIndex,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: resolveImmediateSelection(targetIndex),
            }),
          )
        }),
        Match.orElse(() => Option.none()),
      )

    const maybeActiveDescendant = Option.match(maybeValidActiveItemIndex, {
      onNone: () => [],
      onSome: index => [h.AriaActiveDescendant(itemId(id, index))],
    })

    const onInputAttributes = isReadOnly
      ? []
      : [h.OnInput(value => Message.UpdatedInputValue({ value }))]

    const resolvedInputAttributes = [
      h.Id(`${id}-input`),
      h.Role('combobox'),
      h.AriaExpanded(isItemsPanelVisible),
      ...(isItemsPanelVisible ? [h.AriaControls(`${id}-items`)] : []),
      h.Attribute('aria-autocomplete', 'list'),
      h.Attribute('aria-haspopup', 'listbox'),
      ...inputLabelAttributes,
      h.Autocomplete('off'),
      h.Value(model.inputValue),
      ...(isItemsPanelVisible ? maybeActiveDescendant : []),
      ...(inputPlaceholder ? [h.Placeholder(inputPlaceholder)] : []),
      ...(isDisabled
        ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
        : [
            ...onInputAttributes,
            h.OnKeyDownPreventDefault(handleInputKeyDown),
            h.OnBlur(
              Message.BlurredInput({
                restingInputValue,
                isClearable: !isReadOnly,
              }),
            ),
            ...(openOnFocus
              ? [
                  h.OnFocus(
                    Message.Opened({ maybeActiveItemIndex: Option.none() }),
                  ),
                ]
              : []),
          ]),
      ...(isReadOnly
        ? [
            h.Readonly(true),
            h.AriaReadonly(true),
            h.DataAttribute('readonly', ''),
          ]
        : []),
      ...(isInvalid
        ? [h.AriaInvalid(true), h.DataAttribute('invalid', '')]
        : []),
      ...(isVisible ? [h.DataAttribute('open', '')] : []),
      ...(model.selectInputOnFocus ? [h.OnMount(AttachSelectOnFocus())] : []),
      ...(inputClassName ? [h.Class(inputClassName)] : []),
      ...inputAttributes,
    ]

    const anchorAttributes = [
      h.Style({
        position: 'absolute',
        margin: '0',
        visibility: 'hidden',
      }),
      h.OnMount(
        Anchor({
          buttonId: `${id}-input-wrapper`,
          anchor,
        }),
      ),
    ]

    const itemsContainerAttributes = [
      h.Id(`${id}-items`),
      h.Role('listbox'),
      ...(behavior.ariaMultiSelectable ? [h.AriaMultiSelectable(true)] : []),
      h.AriaLabelledBy(`${id}-input`),
      h.Tabindex(-1),
      ...(isReadOnly
        ? [h.AriaReadonly(true), h.DataAttribute('readonly', '')]
        : []),
      ...anchorAttributes,
      ...animationAttributes,
      ...(itemsClassName ? [h.Class(itemsClassName)] : []),
      ...itemsAttributes,
    ]

    const comboboxItems = Array.map(items, (item, index) => {
      const isActiveItem = Option.exists(
        maybeActiveItemIndex,
        activeIndex => activeIndex === index,
      )
      const isDisabledItem = isDisabledAtIndex(index)
      const isSelectedItem = isValueSelected(itemToValue(item, index))
      const itemConfig = itemToConfig(item, {
        isActive: isActiveItem,
        isDisabled: isDisabledItem,
        isReadOnly,
        isSelected: isSelectedItem,
      })

      const isHoverable = !isDisabledItem && !isLeaving
      const isClickable = isHoverable && !isReadOnly

      return h.keyed('div')(
        itemId(id, index),
        [
          h.Id(itemId(id, index)),
          h.Role('option'),
          h.AriaSelected(isSelectedItem),
          ...(isActiveItem ? [h.DataAttribute('active', '')] : []),
          ...(isSelectedItem ? [h.DataAttribute('selected', '')] : []),
          ...(isDisabledItem
            ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
            : []),
          ...(isReadOnly ? [h.DataAttribute('readonly', '')] : []),
          ...(isClickable
            ? [
                h.OnClick(
                  Message.SelectedItem({
                    item: itemToValue(item, index),
                    displayText: itemToDisplayText(item, index),
                    wasSelected: isValueSelected(itemToValue(item, index)),
                  }),
                ),
              ]
            : []),
          ...(isHoverable
            ? [
                ...(isActiveItem
                  ? []
                  : [
                      h.OnPointerMove((screenX, screenY, pointerType) =>
                        OptionExt.when(
                          pointerType !== 'touch',
                          Message.MovedPointerOverItem({
                            index,
                            screenX,
                            screenY,
                          }),
                        ),
                      ),
                    ]),
                h.OnPointerLeave(pointerType =>
                  OptionExt.when(
                    pointerType !== 'touch',
                    Message.DeactivatedItem(),
                  ),
                ),
              ]
            : []),
          ...(itemConfig.className ? [h.Class(itemConfig.className)] : []),
        ],
        [itemConfig.content],
      )
    })

    const renderGroupedItems = (): ReadonlyArray<Html> => {
      if (!itemGroupKey) {
        return comboboxItems
      }

      const segments = groupContiguous(comboboxItems, (_, index) =>
        Array.get(items, index).pipe(
          Option.match({
            onNone: () => '',
            onSome: item => itemGroupKey(item, index),
          }),
        ),
      )

      return Array.flatMap(segments, (segment, segmentIndex) => {
        const maybeHeading = Option.fromNullishOr(
          groupToHeading && groupToHeading(segment.key),
        )

        const headingId = `${id}-heading-${segment.key}`

        const headingElement = Option.match(maybeHeading, {
          onNone: () => [],
          onSome: heading => [
            h.keyed('div')(
              headingId,
              [
                h.Id(headingId),
                h.Role('presentation'),
                ...(heading.className ? [h.Class(heading.className)] : []),
              ],
              [heading.content],
            ),
          ],
        })

        const groupContent = [...headingElement, ...segment.items]

        const groupElement = h.keyed('div')(
          `${id}-group-${segment.key}`,
          [
            h.Role('group'),
            ...(Option.isSome(maybeHeading)
              ? [h.AriaLabelledBy(headingId)]
              : []),
            ...(groupClassName ? [h.Class(groupClassName)] : []),
            ...groupAttributes,
          ],
          groupContent,
        )

        const separator =
          segmentIndex > 0 &&
          (separatorClassName ||
            Array.isReadonlyArrayNonEmpty(separatorAttributes))
            ? [
                h.keyed('div')(`${id}-separator-${segmentIndex}`, [
                  h.Role('separator'),
                  ...(separatorClassName ? [h.Class(separatorClassName)] : []),
                  ...separatorAttributes,
                ]),
              ]
            : []

        return [...separator, groupElement]
      })
    }

    const backdrop = h.keyed('div')(`${id}-backdrop`, [
      h.Id(`${id}-backdrop`),
      h.OnMount(PortalBackdrop()),
      ...(isLeaving
        ? []
        : [
            h.OnClick(
              Message.Closed({ restingInputValue, isClearable: !isReadOnly }),
            ),
          ]),
      ...(backdropClassName ? [h.Class(backdropClassName)] : []),
      ...backdropAttributes,
    ])

    const renderedItems = renderGroupedItems()

    const scrollableItems =
      itemsScrollClassName ||
      Array.isReadonlyArrayNonEmpty(itemsScrollAttributes)
        ? [
            h.div(
              [
                ...(itemsScrollClassName
                  ? [h.Class(itemsScrollClassName)]
                  : []),
                ...itemsScrollAttributes,
              ],
              renderedItems,
            ),
          ]
        : renderedItems

    const itemsPanel = h.keyed('div')(
      `${id}-items-container`,
      itemsContainerAttributes,
      scrollableItems,
    )

    const resolvedInputWrapperAttributes = [
      h.Id(`${id}-input-wrapper`),
      ...(inputWrapperClassName ? [h.Class(inputWrapperClassName)] : []),
      ...inputWrapperAttributes,
    ]

    const toggleButton = buttonContent
      ? [
          h.keyed('button')(
            `${id}-button`,
            [
              h.Id(`${id}-button`),
              h.Type('button'),
              h.Tabindex(-1),
              ...(isItemsPanelVisible ? [h.AriaControls(`${id}-items`)] : []),
              h.AriaExpanded(isItemsPanelVisible),
              h.Attribute('aria-haspopup', 'listbox'),
              ...(isDisabled
                ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
                : [
                    h.OnClick(
                      Message.PressedToggleButton({
                        restingInputValue,
                        isClearable: !isReadOnly,
                      }),
                    ),
                  ]),
              ...(isReadOnly ? [h.DataAttribute('readonly', '')] : []),
              h.OnMount(AttachPreventBlur()),
              ...(buttonClassName ? [h.Class(buttonClassName)] : []),
              ...buttonAttributes,
            ],
            [buttonContent],
          ),
        ]
      : []

    const hiddenInputs = formName
      ? Array.match(selectedValues, {
          onEmpty: () => [h.input([h.Type('hidden'), h.Name(formName)])],
          onNonEmpty: Array.map(selectedValue =>
            h.input([
              h.Type('hidden'),
              h.Name(formName),
              h.Value(selectedValue),
            ]),
          ),
        })
      : []

    const wrapperAttributes = [
      ...(className ? [h.Class(className)] : []),
      ...attributes,
      ...(isVisible ? [h.DataAttribute('open', '')] : []),
      ...(isDisabled ? [h.DataAttribute('disabled', '')] : []),
      ...(isReadOnly ? [h.DataAttribute('readonly', '')] : []),
      ...(isInvalid ? [h.DataAttribute('invalid', '')] : []),
    ]

    return h.div(wrapperAttributes, [
      h.div(resolvedInputWrapperAttributes, [
        h.input(resolvedInputAttributes),
        ...toggleButton,
      ]),
      ...(isBackdropVisible ? [backdrop] : []),
      ...(isItemsPanelVisible ? [itemsPanel] : []),
      ...hiddenInputs,
    ])
  }

  return impl
}
