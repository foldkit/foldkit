import {
  Array,
  Effect,
  Equal,
  Function,
  Layer,
  Match,
  Number,
  Option,
  Predicate,
  Schema,
  String,
  pipe,
} from 'effect'
import * as Block from 'foldkit/block'
import * as Dom from 'foldkit/dom'
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { type MessageUnion, defineMessageUnion } from 'foldkit/message'
import type * as Mount from 'foldkit/mount'
import { makeModifyFieldsFor } from 'foldkit/struct'
import * as Update from 'foldkit/update'

import { AnchorConfig, anchorSetup, portalBackdrop } from '../anchor/index.js'
import * as Animation from '../animation/index.js'
import { groupContiguous } from '../group.js'
import * as OptionExt from '../internal/optionExtensions.js'
import { idSelector } from '../internal/selectors.js'
import {
  findFirstEnabledIndex,
  isPrintableKey,
  keyToIndex,
} from '../keyboard.js'
import { resolveTypeaheadMatch } from '../typeahead.js'

export { resolveTypeaheadMatch }

/** Shared Listbox namespace for selection-specific definitions and effects. */
export const ListboxNamespace = Block.makeNamespace('Listbox')

// MODEL

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
  animation: Animation.AnimationBlock.Model,
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
export type BaseInitConfig = Readonly<{
  id: string
  isAnimated?: boolean
  isModal?: boolean
  orientation?: typeof Orientation.Type
}>

/** Creates the shared base fields for a listbox model from a config. Each variant spreads this and adds its selection field. */
export const baseInit = (config: BaseInitConfig): BaseModel => ({
  id: config.id,
  isOpen: false,
  isAnimated: config.isAnimated ?? false,
  isModal: config.isModal ?? false,
  orientation: config.orientation ?? 'Vertical',
  animation: Animation.AnimationBlock.init({ id: `${config.id}-listbox` })
    .model,
  maybeActiveItemIndex: Option.none(),
  activationTrigger: 'Keyboard',
  searchQuery: '',
  searchVersion: 0,
  maybeLastPointerPosition: Option.none(),
  maybeLastButtonPointerType: Option.none(),
})

// MESSAGE

/** Union of all messages the listbox component can produce. */
export const Message = defineMessageUnion({
  RequestedOpen: {},
  RequestedClose: {},
  RequestedSelectItem: { item: Schema.String },
  Opened: { maybeActiveItemIndex: Schema.Option(Schema.Number) },
  Closed: {},
  BlurredItems: {},
  ActivatedItem: {
    index: Schema.Number,
    activationTrigger: ActivationTrigger,
  },
  DeactivatedItem: {},
  SelectedItem: { item: Schema.String },
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

export type Opened = typeof Message.Opened.Type
export type Closed = typeof Message.Closed.Type
export type RequestedOpen = typeof Message.RequestedOpen.Type
export type RequestedClose = typeof Message.RequestedClose.Type
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

export type Message = typeof Message.Type

// OUT MESSAGE

export type Selected<Value extends string = string> = Readonly<{
  readonly _tag: 'Selected'
  readonly value: Value
}>

/** Union of out-messages the listbox component can produce. The parent folds `Selected` into the selection it owns: single-select stores the value, multi-select toggles the value's membership. */
export const OutMessage = defineMessageUnion({
  Selected: { value: Schema.String },
})

/** The OutMessage union interface on a completed Listbox, refined to its
 * selected Value type. */
export type OutMessageSchema<Value extends string = string> =
  typeof OutMessage extends MessageUnion<infer Cases>
    ? MessageUnion<
        Omit<Cases, 'Selected'> &
          Readonly<{
            Selected: Omit<Cases['Selected'], 'value'> &
              Readonly<{ value: Schema.Schema<Value> }>
          }>
      >
    : never

/** Generic over `Value extends string` so consumers who create the listbox
 *  via `Listbox.create<MyUnion>()` receive `value: MyUnion` in the
 *  `Selected` OutMessage from the factory's `update`, instead of
 *  `value: string`. Defaults to `string`. */
export type OutMessage<Value extends string = string> = Selected<Value>

// CONSTANTS

export const SEARCH_DEBOUNCE_MILLISECONDS = 350
export const LEFT_MOUSE_BUTTON = 0

// SELECTORS

export const buttonSelector = (id: string): string => idSelector(`${id}-button`)

/** Returns the bare DOM id of the listbox trigger button, derived from the
 *  listbox's base id. Use this to associate an external label with the
 *  trigger via a native `<label for={Listbox.buttonId(id)}>` or an
 *  `aria-labelledby` reference. Mirrors `buttonSelector`, which returns the
 *  CSS selector form (`#${id}-button`) rather than the bare id. */
export const buttonId = (id: string): string => `${id}-button`

export const itemsSelector = (id: string): string => idSelector(`${id}-items`)
export const itemSelector = (id: string, index: number): string =>
  idSelector(`${id}-item-${index}`)
export const itemId = (id: string, index: number): string =>
  `${id}-item-${index}`

// HELPERS

const modifyBaseFields = makeModifyFieldsFor<BaseModel>()

export const closedModel = <Model extends BaseModel>(model: Model): Model =>
  modifyBaseFields(model, {
    isOpen: () => false,
    maybeActiveItemIndex: () => Option.none(),
    searchQuery: () => '',
    searchVersion: () => 0,
    maybeLastPointerPosition: () => Option.none(),
    maybeLastButtonPointerType: () => Option.none(),
  })

// UPDATE FACTORY

type HandlerReturn<Model, Value extends string> = Readonly<{
  model: Model
  outMessage?: OutMessage<Value>
}>

/** Prevents page scrolling while the listbox is open in modal mode. */
export const LockListboxScroll = ListboxNamespace.makeCommand(
  'LockListboxScroll',
  {
    messages: [Message.CompletedLockListboxScroll],
    handler: function* () {
      return () =>
        Dom.lockScroll.pipe(Effect.as(Message.CompletedLockListboxScroll()))
    },
  },
)
/** Re-enables page scrolling after the listbox closes. */
export const UnlockListboxScroll = ListboxNamespace.makeCommand(
  'UnlockListboxScroll',
  {
    messages: [Message.CompletedUnlockListboxScroll],
    handler: function* () {
      return () =>
        Dom.unlockScroll.pipe(Effect.as(Message.CompletedUnlockListboxScroll()))
    },
  },
)
/** Marks all elements outside the listbox as inert for modal behavior. */
export const InertListboxOthers = ListboxNamespace.makeCommand(
  'InertListboxOthers',
  {
    args: { id: Schema.String },
    messages: [Message.CompletedInertListboxOthers],
    handler: function* () {
      return ({ id }) =>
        Dom.inertOthers(id, [buttonSelector(id), itemsSelector(id)]).pipe(
          Effect.as(Message.CompletedInertListboxOthers()),
        )
    },
  },
)
/** Removes the inert attribute from elements outside the listbox. */
export const RestoreListboxInert = ListboxNamespace.makeCommand(
  'RestoreListboxInert',
  {
    args: { id: Schema.String },
    messages: [Message.CompletedRestoreListboxInert],
    handler: function* () {
      return ({ id }) =>
        Dom.restoreInert(id).pipe(
          Effect.as(Message.CompletedRestoreListboxInert()),
        )
    },
  },
)
/** Moves focus back to the listbox button after closing. */
export const FocusListboxButton = ListboxNamespace.makeCommand(
  'FocusListboxButton',
  {
    args: { id: Schema.String },
    messages: [Message.CompletedFocusListboxButton],
    handler: function* () {
      return ({ id }) =>
        Dom.focus(buttonSelector(id)).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedFocusListboxButton()),
        )
    },
  },
)
/** Moves focus to the listbox items container after opening. */
export const FocusListboxItems = ListboxNamespace.makeCommand(
  'FocusListboxItems',
  {
    args: { id: Schema.String },
    messages: [Message.CompletedFocusListboxItems],
    handler: function* () {
      return ({ id }) =>
        Dom.focus(itemsSelector(id)).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedFocusListboxItems()),
        )
    },
  },
)
/** Scrolls the active listbox item into view after keyboard navigation. */
export const ScrollListboxItemIntoView = ListboxNamespace.makeCommand(
  'ScrollListboxItemIntoView',
  {
    args: { id: Schema.String, index: Schema.Number },
    messages: [Message.CompletedScrollListboxItemIntoView],
    handler: function* () {
      return ({ id, index }) =>
        Dom.scrollIntoView(itemSelector(id, index)).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedScrollListboxItemIntoView()),
        )
    },
  },
)
/** Programmatically clicks the active listbox item's DOM element. */
export const ClickListboxItem = ListboxNamespace.makeCommand(
  'ClickListboxItem',
  {
    args: { id: Schema.String, index: Schema.Number },
    messages: [Message.CompletedClickListboxItem],
    handler: function* () {
      return ({ id, index }) =>
        Dom.clickElement(itemSelector(id, index)).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedClickListboxItem()),
        )
    },
  },
)
/** Waits for the typeahead search debounce period before clearing the query. */
export const DelayClearListboxSearch = ListboxNamespace.makeCommand(
  'DelayClearListboxSearch',
  {
    args: { version: Schema.Number },
    messages: [Message.CompletedDelayClearListboxSearch],
    handler: function* () {
      return ({ version }) =>
        Effect.sleep(SEARCH_DEBOUNCE_MILLISECONDS).pipe(
          Effect.as(Message.CompletedDelayClearListboxSearch({ version })),
        )
    },
  },
)
/** Detects whether the listbox button moved or the leave animation ended. Whichever comes first; both outcomes signal the Animation block that leave is complete. */
export const DetectListboxMovementOrAnimationEnd = ListboxNamespace.makeCommand(
  'DetectListboxMovementOrAnimationEnd',
  {
    args: { id: Schema.String, generation: Schema.Number },
    messages: [Message.CompletedDetectListboxMovementOrAnimationEnd],
    handler: function* () {
      return ({ id, generation }) =>
        Effect.raceFirst(
          Dom.detectElementMovement(buttonSelector(id)).pipe(
            Effect.as(
              Message.CompletedDetectListboxMovementOrAnimationEnd({
                generation,
              }),
            ),
          ),
          Dom.waitForAnimationSettled(itemsSelector(id)).pipe(
            Effect.as(
              Message.CompletedDetectListboxMovementOrAnimationEnd({
                generation,
              }),
            ),
          ),
        )
    },
  },
)

/** Creates exact Listbox Message handlers and their Animation Binding. */
export const makeUpdateHandlers = <
  Value extends string,
  ParentOutMessageSchema extends Schema.Top,
>(
  bindChild: Block.BindChild<
    typeof BaseModel,
    typeof Message,
    ParentOutMessageSchema
  >,
  makeOutMessageFold: Block.MakeOutMessageFold<
    BaseModel,
    Message,
    OutMessage<Value>
  >,
  step: Block.DefineStep<BaseModel, Message, OutMessage<Value>>,
  stepFields: Block.DefineStepFields<BaseModel, Message>,
  stepNoop: Block.DefineStepNoop<BaseModel>,
  commandsStep: Block.MakeCommandsStep<BaseModel, Message>,
  selectionBehavior: 'CloseWithFocus' | 'KeepOpen',
  handleSelectedItem: (
    model: BaseModel,
    item: string,
  ) => HandlerReturn<BaseModel, Value>,
) => {
  type Model = BaseModel

  const detectListboxMovementOrAnimationEnd = (generation: number) =>
    commandsStep(model => [
      DetectListboxMovementOrAnimationEnd({ id: model.id, generation }),
    ])

  const foldAnimationOutMessage = makeOutMessageFold(Animation.AnimationBlock, {
    StartedLeaveAnimating: ({ generation }) =>
      detectListboxMovementOrAnimationEnd(generation),
    TransitionedOut: stepNoop,
  })

  const AnimationBinding = bindChild(Animation.AnimationBlock, {
    field: 'animation',
    init: false,
  }).withOutMessagePolicy({ fold: foldAnimationOutMessage })

  const modalOpenCommands = (model: Model) =>
    Array.filter(
      [LockListboxScroll(), InertListboxOthers({ id: model.id })],
      () => model.isModal,
    )

  const closeWithoutFocusCommands = (model: Model) =>
    Array.filter(
      [UnlockListboxScroll(), RestoreListboxInert({ id: model.id })],
      () => model.isModal,
    )

  const focusButton = (model: Model) => FocusListboxButton({ id: model.id })
  const focusItems = (model: Model) => FocusListboxItems({ id: model.id })

  const openCommands = (model: Model) => [
    ...modalOpenCommands(model),
    focusItems(model),
  ]

  const closeWithFocusCommands = (model: Model) => [
    focusButton(model),
    ...closeWithoutFocusCommands(model),
  ]

  const openListbox = (model: Model, baseModel: Model) => {
    if (baseModel.isAnimated) {
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

  const closeListbox = (
    baseModel: Model,
    commands: ReturnType<typeof closeWithFocusCommands>,
  ) => {
    if (!baseModel.isOpen) {
      return step(() => ({ model: baseModel }))
    }

    const closed = closedModel(baseModel)

    if (baseModel.isAnimated) {
      return Update.combineSteps([
        step(() => ({ model: closed, commands })),
        AnimationBinding.requestHide(),
      ])
    }

    return step(() => ({ model: closed, commands }))
  }

  const openWithActiveItem = (
    model: Model,
    maybeActiveItemIndex: Option.Option<number>,
  ) => {
    if (model.isOpen) {
      return stepNoop()
    }

    return openListbox(
      model,
      modifyBaseFields(model, {
        maybeActiveItemIndex: () => maybeActiveItemIndex,
        activationTrigger: () =>
          Option.match(maybeActiveItemIndex, {
            onNone: () => 'Pointer' as const,
            onSome: () => 'Keyboard' as const,
          }),
        searchQuery: () => '',
        searchVersion: () => 0,
        maybeLastPointerPosition: () => Option.none(),
      }),
    )
  }

  const selectItem = (model: Model, item: string) => {
    const selection = handleSelectedItem(model, item)
    if (selectionBehavior === 'CloseWithFocus') {
      return step(() =>
        Function.compose(
          step(() =>
            closeListbox(selection.model, closeWithFocusCommands(model)),
          ),
          Update.withOutMessage(selection.outMessage),
        ),
      )
    } else {
      return step(() => selection)
    }
  }

  const cases = {
    CompletedLockListboxScroll: model => ({ model }),
    CompletedUnlockListboxScroll: model => ({ model }),
    CompletedInertListboxOthers: model => ({ model }),
    CompletedRestoreListboxInert: model => ({ model }),
    CompletedFocusListboxButton: model => ({ model }),
    CompletedFocusListboxItems: model => ({ model }),
    CompletedScrollListboxItemIntoView: model => ({ model }),
    CompletedClickListboxItem: model => ({ model }),
    SuppressedSpaceScroll: model => ({ model }),
    SuppressedItemCommit: model => ({ model }),
    CompletedAnchorListbox: model => ({ model }),
    CompletedPortalListboxBackdrop: model => ({ model }),
    RequestedOpen: model => openWithActiveItem(model, Option.none()),

    RequestedClose: model => closeListbox(model, closeWithFocusCommands(model)),

    RequestedSelectItem: (model, { item }) => selectItem(model, item),

    Opened: (model, { maybeActiveItemIndex }) =>
      openWithActiveItem(model, maybeActiveItemIndex),

    Closed: model => closeListbox(model, closeWithFocusCommands(model)),

    BlurredItems: model => {
      if (
        Option.exists(model.maybeLastButtonPointerType, Equal.equals('mouse'))
      ) {
        return stepNoop()
      }

      return closeListbox(model, closeWithoutFocusCommands(model))
    },

    ActivatedItem: (model, { index, activationTrigger }) => ({
      model: modifyBaseFields(model, {
        maybeActiveItemIndex: () => Option.some(index),
        activationTrigger: () => activationTrigger,
      }),
      commands: Array.filter(
        [ScrollListboxItemIntoView({ id: model.id, index })],
        () => activationTrigger === 'Keyboard',
      ),
    }),

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

    SelectedItem: (model, { item }) => selectItem(model, item),

    RequestedItemClick: (model, { index }) => ({
      model,
      commands: [ClickListboxItem({ id: model.id, index })],
    }),

    Searched: (model, { key, maybeTargetIndex }) => {
      const nextSearchQuery = model.searchQuery + key
      const nextSearchVersion = Number.increment(model.searchVersion)

      return {
        model: modifyBaseFields(model, {
          searchQuery: () => nextSearchQuery,
          searchVersion: () => nextSearchVersion,
          maybeActiveItemIndex: () =>
            Option.orElse(maybeTargetIndex, () => model.maybeActiveItemIndex),
        }),
        commands: [DelayClearListboxSearch({ version: nextSearchVersion })],
      }
    },

    CompletedDelayClearListboxSearch: (model, { version }) => {
      if (version !== model.searchVersion) {
        return { model }
      }

      return {
        model: modifyBaseFields(model, { searchQuery: () => '' }),
      }
    },

    CompletedDetectListboxMovementOrAnimationEnd: (_model, { generation }) =>
      AnimationBinding.requestFinish(generation),

    PressedPointerOnButton: (model, { pointerType, button }) => {
      const withPointerType = modifyBaseFields(model, {
        maybeLastButtonPointerType: () => Option.some(pointerType),
      })

      if (pointerType !== 'mouse' || button !== LEFT_MOUSE_BUTTON) {
        return step(() => ({ model: withPointerType }))
      }

      if (model.isOpen) {
        const closed = modifyBaseFields(closedModel(withPointerType), {
          maybeLastButtonPointerType: () => Option.some(pointerType),
        })

        if (model.isAnimated) {
          return Update.combineSteps([
            step(() => ({
              model: closed,
              commands: closeWithFocusCommands(model),
            })),
            AnimationBinding.requestHide(),
          ])
        }

        return step(() => ({
          model: closed,
          commands: closeWithFocusCommands(model),
        }))
      }

      return openListbox(
        model,
        modifyBaseFields(withPointerType, {
          maybeActiveItemIndex: () => Option.none(),
          activationTrigger: () => 'Pointer' as const,
          searchQuery: () => '',
          searchVersion: () => 0,
          maybeLastPointerPosition: () => Option.none(),
        }),
      )
    },

    IgnoredMouseClick: model => ({
      model: modifyBaseFields(model, {
        maybeLastButtonPointerType: () => Option.none(),
      }),
    }),
    ClickedButton: model => {
      if (
        Option.exists(model.maybeLastButtonPointerType, Equal.equals('mouse'))
      ) {
        return stepFields(() => ({
          maybeLastButtonPointerType: () => Option.none(),
        }))
      }

      if (model.isOpen) {
        return closeListbox(model, closeWithFocusCommands(model))
      }

      return openWithActiveItem(model, Option.none())
    },
  } satisfies Readonly<{
    [Tag in Message['_tag']]: (
      model: Model,
      message: Extract<Message, Readonly<{ _tag: Tag }>>,
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
      BlurredItems: step(cases.BlurredItems),
      SelectedItem: step(cases.SelectedItem),
      PressedPointerOnButton: step(cases.PressedPointerOnButton),
      ClickedButton: step(cases.ClickedButton),
      CompletedDetectListboxMovementOrAnimationEnd: step(
        cases.CompletedDetectListboxMovementOrAnimationEnd,
      ),
    },
    AnimationBinding,
  }
}

/**
 * The anchor-positioning Mount this Listbox renders on its items panel.
 *  The panel is always anchored to the button via Floating UI and portaled
 *  to the document body, or into the enclosing `<dialog>` when there is one
 *  (opt out of portaling with `anchor.portal: false`), so it escapes ancestor
 *  stacking contexts and overflow clipping.
 *
 *  It also carries the open-focus for the anchored panel. An anchored panel
 *  renders `visibility: hidden` until Floating UI resolves its first position,
 *  and `.focus()` does not land on a hidden element, so `FocusListboxItems` alone
 *  cannot focus it. `focusAfterPosition` focuses the panel as part of that
 *  first reveal. `FocusListboxItems` still focuses the panel when no anchor is
 *  configured, where the panel is visible as soon as the render commits.
 *
 *  Exposed so Scene tests can call
 *  `Scene.Mount.resolve(AnchorListbox, CompletedAnchorListbox())`.
 */
export const AnchorListbox = ListboxNamespace.makeMount('AnchorListbox', {
  args: { buttonId: Schema.String, anchor: AnchorConfig },
  messages: [Message.CompletedAnchorListbox],
  handler: function* () {
    return ({ element, buttonId, anchor }) =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() =>
            anchorSetup(element, {
              buttonId,
              anchor,
              focusAfterPosition: true,
            }),
          ),
          cleanup => Effect.sync(cleanup),
        )
        return Message.CompletedAnchorListbox()
      })
  },
})

/** The backdrop-portaling Mount this Listbox renders. Exposed so Scene tests can
 *  call `Scene.Mount.resolve(PortalListboxBackdrop, CompletedPortalListboxBackdrop())` to
 *  acknowledge the mount produced by the rendered backdrop. */
export const PortalListboxBackdrop = ListboxNamespace.makeMount(
  'PortalListboxBackdrop',
  {
    messages: [Message.CompletedPortalListboxBackdrop],
    handler: function* () {
      return ({ element }) =>
        Effect.gen(function* () {
          yield* Effect.acquireRelease(
            Effect.sync(() => portalBackdrop(element)),
            cleanup => Effect.sync(cleanup),
          )
          return Message.CompletedPortalListboxBackdrop()
        })
    },
  },
)

/** Mount Definitions rendered by Listbox views. */
export const mounts = [AnchorListbox, PortalListboxBackdrop]

type MountRequirements = Mount.RequirementsOf<typeof mounts>

/** Provides Listbox's local Command and Mount handlers. */
export const EffectsLayer = Layer.mergeAll(
  LockListboxScroll.layer,
  UnlockListboxScroll.layer,
  InertListboxOthers.layer,
  RestoreListboxInert.layer,
  FocusListboxButton.layer,
  FocusListboxItems.layer,
  ScrollListboxItemIntoView.layer,
  ClickListboxItem.layer,
  DelayClearListboxSearch.layer,
  DetectListboxMovementOrAnimationEnd.layer,
  AnchorListbox.layer,
  PortalListboxBackdrop.layer,
)

// VIEW TYPES

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

/** The `itemToValue` extractor piece of a Listbox's view inputs. The
 *  extractor is optional when `Item` is itself a string (the default
 *  returns the item unchanged) and required when items are objects, so the
 *  OutMessage payload type can't drift from what the consumer actually
 *  emits. */
export type ItemToValueInput<Item, Value extends string = string> = [
  Item,
] extends [string]
  ? Readonly<{ itemToValue?: (item: Item) => Value }>
  : Readonly<{ itemToValue: (item: Item) => Value }>

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

// VIEW FACTORY

type ViewBehavior = Readonly<{
  ariaMultiSelectable: boolean
}>

type InternalInputs = BaseViewInputs<unknown, string>

export const makeView = <Model extends BaseModel>(behavior: ViewBehavior) => {
  const impl = (
    model: Model,
    viewInputs: InternalInputs,
    h: HtmlBuilder<Message, MountRequirements>,
  ): Html => {
    const {
      id,
      isOpen,
      orientation,
      animation: { transitionState },
      maybeActiveItemIndex,
      searchQuery,
    } = model

    const {
      items,
      itemToConfig,
      isItemDisabled,
      isButtonDisabled,
      buttonContent,
      buttonClassName,
      buttonAttributes = [],
      itemsClassName,
      itemsAttributes = [],
      itemsScrollClassName,
      itemsScrollAttributes = [],
      backdropClassName,
      backdropAttributes = [],
      className,
      attributes = [],
      itemGroupKey,
      groupToHeading,
      groupClassName,
      groupAttributes = [],
      separatorClassName,
      separatorAttributes = [],
      anchor = {},
      name,
      form,
      isDisabled,
      isReadOnly = false,
      isInvalid,
      ariaLabel,
      ariaLabelledBy,
      selectedValues,
    } = viewInputs

    const itemToValue =
      viewInputs.itemToValue ?? (item => globalThis.String(item))
    const isValueSelected = (itemValue: string): boolean =>
      Array.contains(selectedValues, itemValue)
    const itemToSearchText =
      viewInputs.itemToSearchText ?? ((item: unknown) => itemToValue(item))

    const isLeaving =
      transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'
    const isVisible = isOpen || isLeaving

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

    const isItemDisabledByIndex = (index: number): boolean =>
      Predicate.isNotUndefined(isItemDisabled) &&
      pipe(
        items,
        Array.get(index),
        Option.exists(item => isItemDisabled(item, index)),
      )

    const isButtonEffectivelyDisabled = isDisabled || isButtonDisabled

    const nextKey = orientation === 'Horizontal' ? 'ArrowRight' : 'ArrowDown'
    const previousKey = orientation === 'Horizontal' ? 'ArrowLeft' : 'ArrowUp'

    const navigationKeys = [
      nextKey,
      previousKey,
      'Home',
      'End',
      'PageUp',
      'PageDown',
    ]
    const isNavigationKey = (key: string): boolean =>
      Array.contains(navigationKeys, key)

    const firstEnabledIndex = findFirstEnabledIndex(
      items.length,
      0,
      isItemDisabledByIndex,
    )(0, 1)

    const lastEnabledIndex = findFirstEnabledIndex(
      items.length,
      0,
      isItemDisabledByIndex,
    )(items.length - 1, -1)

    const selectedItemIndex = pipe(
      selectedValues,
      Array.head,
      Option.flatMap(selectedValue =>
        Array.findFirstIndex(
          items,
          item => itemToValue(item) === selectedValue,
        ),
      ),
    )

    const handleButtonKeyDown = (key: string): Option.Option<Message> => {
      if (isOpen) {
        return handleItemsKeyDown(key)
      }

      return Match.value(key).pipe(
        Match.whenOr('Enter', ' ', 'ArrowDown', () =>
          Option.some(
            Message.Opened({
              maybeActiveItemIndex: Option.orElse(selectedItemIndex, () =>
                Option.some(firstEnabledIndex),
              ),
            }),
          ),
        ),
        Match.when('ArrowUp', () =>
          Option.some(
            Message.Opened({
              maybeActiveItemIndex: Option.orElse(selectedItemIndex, () =>
                Option.some(lastEnabledIndex),
              ),
            }),
          ),
        ),
        Match.orElse(() => Option.none()),
      )
    }

    const handleButtonPointerDown = (
      pointerType: string,
      button: number,
    ): Option.Option<Message> =>
      Option.some(Message.PressedPointerOnButton({ pointerType, button }))

    const handleSpaceKeyUp = (key: string): Option.Option<Message> =>
      OptionExt.when(key === ' ', Message.SuppressedSpaceScroll())

    const resolveActiveIndex = (key: string): number =>
      Option.match(maybeActiveItemIndex, {
        onNone: () =>
          Match.value(key).pipe(
            Match.whenOr(
              previousKey,
              'End',
              'PageDown',
              () => lastEnabledIndex,
            ),
            Match.orElse(() => firstEnabledIndex),
          ),
        onSome: activeIndex =>
          keyToIndex(
            nextKey,
            previousKey,
            items.length,
            activeIndex,
            isItemDisabledByIndex,
          )(key),
      })

    const searchForKey = (key: string): Option.Option<Message> => {
      const nextQuery = searchQuery + key
      const maybeTargetIndex = resolveTypeaheadMatch(
        items,
        nextQuery,
        maybeActiveItemIndex,
        isItemDisabledByIndex,
        itemToSearchText,
        String.isNonEmpty(searchQuery),
      )
      return Option.some(Message.Searched({ key, maybeTargetIndex }))
    }

    const resolveCommitMessage = (): Option.Option<Message> => {
      if (isReadOnly) {
        return Option.as(maybeActiveItemIndex, Message.SuppressedItemCommit())
      } else {
        return Option.map(maybeActiveItemIndex, index =>
          Message.RequestedItemClick({ index }),
        )
      }
    }

    const handleItemsKeyDown = (key: string): Option.Option<Message> =>
      Match.value(key).pipe(
        Match.when('Escape', () => Option.some(Message.Closed())),
        Match.when('Enter', resolveCommitMessage),
        Match.when(' ', () =>
          String.isNonEmpty(searchQuery)
            ? searchForKey(' ')
            : resolveCommitMessage(),
        ),
        Match.when(isNavigationKey, () =>
          Option.some(
            Message.ActivatedItem({
              index: resolveActiveIndex(key),
              activationTrigger: 'Keyboard',
            }),
          ),
        ),
        Match.when(isPrintableKey, () => searchForKey(key)),
        Match.orElse(() => Option.none()),
      )

    const resolveButtonLabel = () => {
      if (Predicate.isNotUndefined(ariaLabel)) {
        return [h.AriaLabel(ariaLabel)]
      } else if (Predicate.isNotUndefined(ariaLabelledBy)) {
        return [h.AriaLabelledBy(ariaLabelledBy)]
      } else {
        return []
      }
    }

    const buttonLabelAttributes = resolveButtonLabel()

    const resolvedButtonAttributes = [
      h.Id(`${id}-button`),
      h.Type('button'),
      h.AriaHasPopup('listbox'),
      h.AriaExpanded(isVisible),
      ...(isVisible ? [h.AriaControls(`${id}-items`)] : []),
      ...buttonLabelAttributes,
      ...(isButtonEffectivelyDisabled
        ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
        : [
            h.OnPointerDown(handleButtonPointerDown),
            h.OnKeyDownPreventDefault(handleButtonKeyDown),
            h.OnKeyUpPreventDefault(handleSpaceKeyUp),
            h.OnClick(Message.ClickedButton()),
          ]),
      ...(isVisible
        ? [
            h.DataAttribute('open', ''),
            h.Style({ position: 'relative', zIndex: '1' }),
          ]
        : []),
      ...(isReadOnly ? [h.DataAttribute('readonly', '')] : []),
      ...(isInvalid ? [h.DataAttribute('invalid', '')] : []),
      ...(buttonClassName ? [h.Class(buttonClassName)] : []),
      ...buttonAttributes,
    ]

    const maybeActiveDescendant = Option.match(maybeActiveItemIndex, {
      onNone: () => [],
      onSome: index => [h.AriaActiveDescendant(itemId(id, index))],
    })

    const anchorAttributes = [
      h.Style({
        position: 'absolute',
        margin: '0',
        visibility: 'hidden',
      }),
      h.OnMount(AnchorListbox({ buttonId: `${id}-button`, anchor })),
    ]

    const itemsContainerAttributes = [
      h.Id(`${id}-items`),
      h.Role('listbox'),
      h.AriaOrientation(String.toLowerCase(orientation)),
      ...(behavior.ariaMultiSelectable ? [h.AriaMultiSelectable(true)] : []),
      ...(isReadOnly
        ? [h.AriaReadonly(true), h.DataAttribute('readonly', '')]
        : []),
      h.AriaLabelledBy(`${id}-button`),
      ...maybeActiveDescendant,
      h.Tabindex(-1),
      ...anchorAttributes,
      ...animationAttributes,
      ...(isLeaving
        ? []
        : [
            h.OnKeyDownPreventDefault(handleItemsKeyDown),
            h.OnKeyUpPreventDefault(handleSpaceKeyUp),
            h.OnBlur(Message.BlurredItems()),
          ]),
      ...(itemsClassName ? [h.Class(itemsClassName)] : []),
      ...itemsAttributes,
    ]

    const listboxItems = Array.map(items, (item, index) => {
      const isActiveItem = Option.exists(
        maybeActiveItemIndex,
        activeIndex => activeIndex === index,
      )
      const isDisabledItem = isItemDisabledByIndex(index)
      const isSelectedItem = isValueSelected(itemToValue(item))
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
            ? [h.OnClick(Message.SelectedItem({ item: itemToValue(item) }))]
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
        return listboxItems
      }

      const segments = groupContiguous(listboxItems, (_, index) =>
        Array.get(items, index).pipe(
          Option.match({
            onNone: () => '',
            onSome: item => itemGroupKey(item, index),
          }),
        ),
      )

      return Array.flatMap(segments, (segment, segmentIndex) => {
        const maybeHeading = Option.fromNullishOr(groupToHeading?.(segment.key))

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
      h.OnMount(PortalListboxBackdrop()),
      ...(isLeaving ? [] : [h.OnClick(Message.Closed())]),
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

    const visibleContent = [
      backdrop,
      h.keyed('div')(
        `${id}-items-container`,
        itemsContainerAttributes,
        scrollableItems,
      ),
    ]

    const formAttribute = form ? [h.Attribute('form', form)] : []

    const hiddenInputs = name
      ? Array.match(selectedValues, {
          onEmpty: () => [
            h.input([h.Type('hidden'), h.Name(name), ...formAttribute]),
          ],
          onNonEmpty: Array.map(selectedValue =>
            h.input([
              h.Type('hidden'),
              h.Name(name),
              h.Value(selectedValue),
              ...formAttribute,
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
      h.keyed('button')(`${id}-button`, resolvedButtonAttributes, [
        buttonContent,
      ]),
      ...hiddenInputs,
      ...(isVisible ? visibleContent : []),
    ])
  }

  return <Item, Value extends string = string, ParentMessage = never>() =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    impl as unknown as (
      model: Model,
      viewInputs: BaseViewInputs<Item, Value>,
      h: HtmlBuilder<Message | ParentMessage, MountRequirements>,
    ) => Html
}
