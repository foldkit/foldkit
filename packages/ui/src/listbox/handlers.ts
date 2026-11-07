import { Array, Equal, Function, Number, Option } from 'effect'
import type { Schema } from 'effect'
import type * as Block from 'foldkit/block'
import { makeModifyFieldsFor } from 'foldkit/struct'
import * as Update from 'foldkit/update'

import { AnimationBlock } from '../animation/definition.js'
import {
  ClickListboxItem,
  DelayClearListboxSearch,
  DetectListboxMovementOrAnimationEnd,
  FocusListboxButton,
  FocusListboxItems,
  InertListboxOthers,
  LockListboxScroll,
  RestoreListboxInert,
  ScrollListboxItemIntoView,
  UnlockListboxScroll,
} from './command.js'
import { closedModel } from './model.js'
import { LEFT_MOUSE_BUTTON } from './selectors.js'
import {
  BaseModel,
  InitConfig,
  type Message,
  type MessageSchema,
  type OutMessage,
} from './types.js'

const modifyBaseFields = makeModifyFieldsFor<BaseModel>()

type HandlerReturn<Model, Value extends string> = Readonly<{
  model: Model
  commands?: never
  outMessage?: OutMessage<Value>
}>

/** Creates exact Listbox Message handlers and their Animation Binding. */
export const makeUpdateHandlers = <
  Value extends string,
  ValueEncoded,
  ParentOutMessageSchema extends Schema.Top,
  ParentOwner,
>(
  makeRequiredFieldBinding: Block.MakeSingularBinding<
    typeof BaseModel,
    MessageSchema<Value, ValueEncoded>,
    ParentOutMessageSchema,
    typeof InitConfig,
    'Provided',
    ParentOwner,
    'Required'
  >,
  makeOutMessageFold: Block.MakeDescriptorOutMessageFold<
    BaseModel,
    Message<Value>,
    OutMessage<Value>
  >,
  step: Block.DefineStep<BaseModel, Message<Value>, OutMessage<Value>>,
  stepFields: Block.DefineStepFields<BaseModel, Message<Value>>,
  stepNoop: Block.DefineStepNoop<BaseModel>,
  commandsStep: Block.MakeCommandsStep<BaseModel, Message<Value>>,
  selectionBehavior: 'CloseWithFocus' | 'KeepOpen',
  handleSelectedItem: (
    model: BaseModel,
    item: Value,
  ) => HandlerReturn<BaseModel, Value>,
) => {
  type Model = BaseModel

  const detectListboxMovementOrAnimationEnd = (generation: number) =>
    commandsStep(model => [
      DetectListboxMovementOrAnimationEnd({ id: model.id, generation }),
    ])

  const foldAnimationOutMessage = makeOutMessageFold(AnimationBlock, {
    StartedLeaveAnimating: ({ generation }) =>
      detectListboxMovementOrAnimationEnd(generation),
    TransitionedOut: stepNoop,
  })

  const AnimationBinding = makeRequiredFieldBinding(AnimationBlock, {
    field: 'animation',
    init: { contextToArgs: config => [{ id: `${config.id}-listbox` }] },
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

  const selectItem = (model: Model, item: Value) => {
    const selection = handleSelectedItem(model, item)

    if (selectionBehavior === 'CloseWithFocus' && selection.model.isOpen) {
      const closed = closedModel(selection.model)
      const commands = closeWithFocusCommands(model)

      if (selection.model.isAnimated) {
        return step(() =>
          Function.compose(
            Update.combineSteps([
              step(() => ({ model: closed, commands })),
              AnimationBinding.requestHide(),
            ]),
            listboxClose =>
              Update.withOutMessage(listboxClose, selection.outMessage),
          ),
        )
      }

      return step(() =>
        Update.withOutMessage(
          { model: closed, commands },
          selection.outMessage,
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
    [Tag in Message<Value>['_tag']]: (
      model: Model,
      message: Extract<Message<Value>, Readonly<{ _tag: Tag }>>,
    ) => unknown
  }>

  return {
    inMessageUpdateHandlers: {
      RequestedOpen: step(model => openWithActiveItem(model, Option.none())),
      RequestedClose: step(model =>
        closeListbox(model, closeWithFocusCommands(model)),
      ),
    },
    handlers: {
      ...cases,
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
