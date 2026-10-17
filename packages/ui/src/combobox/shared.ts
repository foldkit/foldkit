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

/** Shared named component handle for both Combobox selection variants. */
export const Combobox = Block.define('Combobox')

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
  animation: Animation.Model,
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
  animation: Animation.init({ id: `${config.id}-items` }),
  maybeActiveItemIndex: Option.none(),
  activationTrigger: 'Keyboard',
  inputValue: '',
  maybeLastPointerPosition: Option.none(),
})

// MESSAGE

/** A string Schema whose constructor input preserves the same exact Item type. */
export type ItemSchema<Item extends string> = Schema.Schema<Item> &
  Readonly<{ '~type.make': Item }>

/** Builds the Combobox Message union with item payloads refined by a Schema. */
export const makeMessage = <Item extends string>(Item: ItemSchema<Item>) =>
  defineMessageUnion({
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
    GotAnimationMessage: { message: Animation.Message },
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
export type MessageSchema<Item extends string = string> =
  typeof Message extends MessageUnion<infer Cases>
    ? MessageUnion<
        Omit<Cases, 'SelectedItem' | 'ActivatedItem'> &
          Readonly<{
            SelectedItem: Omit<Cases['SelectedItem'], 'item'> &
              Readonly<{ item: ItemSchema<Item> }>
            ActivatedItem: Omit<
              Cases['ActivatedItem'],
              'maybeImmediateSelection'
            > &
              Readonly<{
                maybeImmediateSelection: Schema.Option<
                  Schema.Struct<Readonly<{ item: ItemSchema<Item> }>>
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
export const makeOutMessage = <Item extends string>(Item: ItemSchema<Item>) =>
  defineMessageUnion({
    Selected: { value: Item },
    ClearedSelection: {},
  })

/** Union of OutMessages the broad string Combobox component can produce. */
export const OutMessage = makeOutMessage(Schema.String)

/** The OutMessage Schema and callable constructors on a created Combobox,
 * refined to the Item Schema supplied to `create`. */
export type OutMessageSchema<Item extends string = string> =
  typeof OutMessage extends MessageUnion<infer Cases>
    ? MessageUnion<
        Omit<Cases, 'Selected'> &
          Readonly<{
            Selected: Omit<Cases['Selected'], 'value'> &
              Readonly<{ value: ItemSchema<Item> }>
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

type HandlerReturn<Model, Item extends string> = Readonly<{
  model: Model
  commands?: never
  outMessage?: OutMessage<Item>
}>

/** Prevents page scrolling while the combobox popup is open in modal mode. */
export const LockScroll = Combobox.command('LockScroll', {
  messages: [Message.CompletedLockScroll],
  handler: function* () {
    return () => Dom.lockScroll.pipe(Effect.as(Message.CompletedLockScroll()))
  },
})
/** Re-enables page scrolling after the combobox popup closes. */
export const UnlockScroll = Combobox.command('UnlockScroll', {
  messages: [Message.CompletedUnlockScroll],
  handler: function* () {
    return () =>
      Dom.unlockScroll.pipe(Effect.as(Message.CompletedUnlockScroll()))
  },
})
/** Marks all elements outside the combobox as inert for modal behavior. */
export const InertOthers = Combobox.command('InertOthers', {
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
export const RestoreInert = Combobox.command('RestoreInert', {
  args: { id: Schema.String },
  messages: [Message.CompletedRestoreInert],
  handler: function* () {
    return ({ id }) =>
      Dom.restoreInert(id).pipe(Effect.as(Message.CompletedRestoreInert()))
  },
})
/** Moves focus to the combobox input after selection or close. */
export const FocusInput = Combobox.command('FocusInput', {
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
export const ScrollItemIntoView = Combobox.command('ScrollItemIntoView', {
  args: { id: Schema.String, index: Schema.Number },
  messages: [Message.CompletedScrollItemIntoView],
  handler: function* () {
    return ({ id, index }) =>
      Dom.scrollIntoView(itemSelector(id, index)).pipe(
        Effect.ignore,
        Effect.as(Message.CompletedScrollItemIntoView()),
      )
  },
})
/** Programmatically clicks the active combobox item's DOM element. */
export const ClickItem = Combobox.command('ClickItem', {
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
export const DetectMovementOrAnimationEnd = Combobox.command(
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

/** Creates a combobox update function from variant-specific handlers. Shared logic (open, close, activate, transition) is handled internally; only close, selection, and immediate-activation behavior varies by variant. */
export const makeUpdate = <
  Item extends string,
  ParentOutMessageSchema extends Schema.Top,
>(
  bindChild: Block.BindChild<
    typeof BaseModel,
    ReturnType<typeof makeMessage<Item>>,
    ParentOutMessageSchema
  >,
  step: Block.DefineStep<BaseModel, Message<Item>, OutMessage<Item>>,
  Message: ReturnType<typeof makeMessage<Item>>,
  selectionBehavior: 'CloseWithFocus' | 'KeepOpen',
  handlers: Readonly<{
    handleClose: (
      model: BaseModel,
      restingInputValue: string,
      isClearable: boolean,
    ) => HandlerReturn<BaseModel, Item>
    handleSelectedItem: (
      model: BaseModel,
      item: Item,
      displayText: string,
      wasSelected: boolean,
    ) => HandlerReturn<BaseModel, Item>
    handleImmediateActivation: (
      model: BaseModel,
      item: Item,
    ) => HandlerReturn<BaseModel, Item>
  }>,
) => {
  type Model = BaseModel

  const detectMovementOrAnimationEnd = (generation: number) =>
    step(model => ({
      model,
      commands: [DetectMovementOrAnimationEnd({ id: model.id, generation })],
    }))

  type AnimationOutMessageStep = ReturnType<typeof detectMovementOrAnimationEnd>

  const ignoreTransitionedOut = step(model => ({ model }))

  const foldAnimationOutMessage = Animation.OutMessage.match<
    AnimationOutMessageStep | typeof ignoreTransitionedOut
  >({
    StartedLeaveAnimating: ({ generation }) =>
      detectMovementOrAnimationEnd(generation),
    TransitionedOut: () => ignoreTransitionedOut,
  })

  const AnimationBinding = bindChild(Animation.block, {
    field: 'animation',
    parentMessage: Message.GotAnimationMessage,
    init: false,
    outMessage: { fold: foldAnimationOutMessage },
  })

  type AuthoredMessage = Exclude<
    Message<Item>,
    ReturnType<typeof Message.GotAnimationMessage>
  >

  const internalUpdate = (model: Model, message: AuthoredMessage) => {
    const openCommands = Array.filter(
      [LockScroll(), InertOthers({ id: model.id })],
      () => model.isModal,
    )

    const closeWithoutFocusCommands = Array.filter(
      [UnlockScroll(), RestoreInert({ id: model.id })],
      () => model.isModal,
    )

    const focusInput = FocusInput({ id: model.id })

    const closeWithFocusCommands = [focusInput, ...closeWithoutFocusCommands]

    const closeSelectedItemWithFocus = (
      nextModel: Model,
      outMessage?: OutMessage<Item>,
    ) => {
      const didClose = model.isOpen && !nextModel.isOpen
      const commands = didClose ? closeWithFocusCommands : [focusInput]

      if (didClose && model.isAnimated) {
        return step(() =>
          Function.compose(
            Update.combine([
              () => ({ model: nextModel, commands }),
              AnimationBinding.hide(),
            ]),
            Update.withOutMessage(outMessage),
          ),
        )
      }

      if (outMessage === undefined) {
        return { model: nextModel, commands }
      } else {
        return { model: nextModel, commands, outMessage }
      }
    }

    const openCombobox = (baseModel: Model) => {
      if (model.isAnimated) {
        return Update.combine([
          () => ({ model: baseModel, commands: openCommands }),
          AnimationBinding.show(),
          stepModel => ({
            model: modifyBaseFields(stepModel, { isOpen: () => true }),
          }),
        ])
      }

      return {
        model: modifyBaseFields(baseModel, { isOpen: () => true }),
        commands: openCommands,
      }
    }

    const closeCombobox = (
      baseModel: Model,
      commands: typeof closeWithFocusCommands,
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
            Update.combine([
              () => ({ model: comboboxClose.model, commands }),
              AnimationBinding.hide(),
            ]),
            Update.withOutMessage(comboboxClose.outMessage),
          ),
        )
      }

      if (comboboxClose.outMessage === undefined) {
        return { model: comboboxClose.model, commands }
      } else {
        return {
          model: comboboxClose.model,
          commands,
          outMessage: comboboxClose.outMessage,
        }
      }
    }

    return Match.value(message).pipe(
      Match.tagsExhaustive({
        CompletedLockScroll: () => ({ model }),
        CompletedUnlockScroll: () => ({ model }),
        CompletedInertOthers: () => ({ model }),
        CompletedRestoreInert: () => ({ model }),
        CompletedFocusInput: () => ({ model }),
        CompletedScrollItemIntoView: () => ({ model }),
        CompletedClickItem: () => ({ model }),
        SuppressedItemCommit: () => ({ model }),
        SuppressedEmptyItemNavigation: () => ({ model }),
        CompletedAnchor: () => ({ model }),
        CompletedAttachPreventBlur: () => ({ model }),
        CompletedAttachSelectOnFocus: () => ({ model }),
        CompletedPortalBackdrop: () => ({ model }),
        Opened: ({ maybeActiveItemIndex }) =>
          openCombobox(
            modifyBaseFields(model, {
              maybeActiveItemIndex: () => maybeActiveItemIndex,
              activationTrigger: () =>
                Option.match(maybeActiveItemIndex, {
                  onNone: () => 'Pointer' as const,
                  onSome: () => 'Keyboard' as const,
                }),
              maybeLastPointerPosition: () => Option.none(),
            }),
          ),

        // NOTE: A blur Message can arrive after selection has already closed the
        // Combobox. Ignore that stale Message so it cannot restore an old input
        // value or emit ClearedSelection again.
        Closed: ({ restingInputValue, isClearable }) =>
          model.isOpen
            ? closeCombobox(
                model,
                closeWithFocusCommands,
                restingInputValue,
                isClearable,
              )
            : { model },

        BlurredInput: ({ restingInputValue, isClearable }) =>
          model.isOpen
            ? closeCombobox(
                model,
                closeWithoutFocusCommands,
                restingInputValue,
                isClearable,
              )
            : { model },

        ActivatedItem: ({
          index,
          activationTrigger,
          maybeImmediateSelection,
        }) => {
          const highlightedModel = modifyBaseFields(model, {
            maybeActiveItemIndex: () => Option.some(index),
            activationTrigger: () => activationTrigger,
          })

          const skippedActivation: HandlerReturn<Model, Item> = {
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

        MovedPointerOverItem: ({ index, screenX, screenY }) => {
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

        DeactivatedItem: () =>
          model.activationTrigger === 'Pointer'
            ? {
                model: modifyBaseFields(model, {
                  maybeActiveItemIndex: () => Option.none(),
                }),
              }
            : { model },

        SelectedItem: ({ item, displayText, wasSelected }) => {
          const selection = handlers.handleSelectedItem(
            model,
            item,
            displayText,
            wasSelected,
          )

          if (selectionBehavior === 'CloseWithFocus') {
            return closeSelectedItemWithFocus(
              selection.model,
              selection.outMessage,
            )
          } else {
            return selection
          }
        },

        RequestedItemClick: ({ index }) => ({
          model,
          commands: [ClickItem({ id: model.id, index })],
        }),

        UpdatedInputValue: ({ value }) => {
          if (model.isOpen) {
            return {
              model: modifyBaseFields(model, {
                inputValue: () => value,
                maybeActiveItemIndex: () => Option.some(0),
                activationTrigger: () => 'Keyboard' as const,
              }),
            }
          }

          return openCombobox(
            modifyBaseFields(model, {
              inputValue: () => value,
              maybeActiveItemIndex: () => Option.some(0),
              activationTrigger: () => 'Keyboard' as const,
              maybeLastPointerPosition: () => Option.none(),
            }),
          )
        },

        PressedToggleButton: ({ restingInputValue, isClearable }) => {
          if (model.isOpen) {
            return closeCombobox(
              model,
              closeWithFocusCommands,
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
            return Update.combine([
              () => ({ model: toggledModel, commands: [focusInput] }),
              stepModel => ({ model: stepModel, commands: openCommands }),
              AnimationBinding.show(),
              stepModel => ({
                model: modifyBaseFields(stepModel, { isOpen: () => true }),
              }),
            ])
          }

          return {
            model: modifyBaseFields(toggledModel, { isOpen: () => true }),
            commands: [focusInput, ...openCommands],
          }
        },

        CompletedDetectMovementOrAnimationEnd: ({ generation }) =>
          AnimationBinding.finish(generation),
      }),
    )
  }

  return { update: internalUpdate, AnimationBinding }
}

/** The anchor-positioning Mount this Combobox renders on its items panel.
 *  The panel is always anchored to the input wrapper via Floating UI and
 *  portaled to the document body, or into the enclosing `<dialog>` when
 *  there is one (opt out of portaling with `anchor.portal: false`), so it
 *  escapes ancestor stacking contexts and overflow clipping. The Mount also
 *  installs the `pointerdown`-cancelling capture listener that prevents
 *  input blur on item presses. Exposed so Scene tests can call
 *  `Scene.Mount.resolve(Anchor, CompletedAnchor())`. */
export const Anchor = Combobox.mount('Anchor', {
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
export const AttachPreventBlur = Combobox.mount('AttachPreventBlur', {
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
})

/** The Mount this Combobox renders to install the input's select-on-focus
 *  behavior. Exposed so Scene tests can call
 *  `Scene.Mount.resolve(AttachSelectOnFocus, CompletedAttachSelectOnFocus())`. */
export const AttachSelectOnFocus = Combobox.mount('AttachSelectOnFocus', {
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
})

/** The backdrop-portaling Mount this Combobox renders. Exposed so Scene tests can
 *  call `Scene.Mount.resolve(PortalBackdrop, CompletedPortalBackdrop())` to
 *  acknowledge the mount produced by the rendered backdrop. */
export const PortalBackdrop = Combobox.mount('PortalBackdrop', {
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
export const makeView = <Model extends BaseModel, Item extends string>(
  behavior: ViewBehavior,
  Message: ReturnType<typeof makeMessage<Item>>,
) => {
  const impl = (
    model: Model,
    viewInputs: BaseViewInputs<Item>,
    h: HtmlBuilder<Message<Item>, MountRequirements>,
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
