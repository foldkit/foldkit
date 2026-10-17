import { Array, Match, Number, Option, pipe } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { UiComposition } from './composition'
import {
  AnimationDemoBinding,
  DialogAnimatedDemoBinding,
  DialogDemoBinding,
  HoverIntentMenuDemoBinding,
  NestedDialogChildDemoBinding,
  NestedDialogParentDemoBinding,
  OverlayDialogDemoBinding,
  ToastDemoBinding,
  VirtualListChatDemoBinding,
  VirtualListDemoBinding,
  VirtualListVariableDemoBinding,
} from './composition'
import { Ui } from './definition'
import { ROW_COUNT as VIRTUAL_LIST_ROW_COUNT } from './demo/virtualListData'
import { Message } from './message'
import {
  type VirtualListChatMessage,
  VirtualListChatStartProximity,
} from './model'

const VIRTUAL_LIST_CHAT_START_THRESHOLD_PX = 48
const VIRTUAL_LIST_CHAT_HISTORY_BATCH_SIZE = 8

const updateVirtualListChatMessages = (
  nextMessages: ReadonlyArray<VirtualListChatMessage>,
  nextId?: number,
) =>
  Ui.step(model => {
    const nextVirtualListChatNextId =
      nextId === undefined ? model.virtualListChatNextId : nextId
    const updateMessages = Ui.step(stepModel => ({
      model: modifyFields(stepModel, {
        virtualListChatMessages: () => nextMessages,
        virtualListChatNextId: () => nextVirtualListChatNextId,
      }),
    }))

    return Update.combine([
      updateMessages,
      VirtualListChatDemoBinding.informItemsChanged(
        Array.map(nextMessages, message => globalThis.String(message.id)),
      ),
    ])
  })

const prependVirtualListChatMessages = Ui.step(model => {
  const firstId = pipe(
    model.virtualListChatMessages,
    Array.head,
    Option.match({
      onNone: () => model.virtualListChatNextId,
      onSome: message => message.id,
    }),
  )
  const olderMessages = Array.makeBy(
    VIRTUAL_LIST_CHAT_HISTORY_BATCH_SIZE,
    index => {
      const id = firstId - VIRTUAL_LIST_CHAT_HISTORY_BATCH_SIZE + index
      return {
        id,
        body: `Older message ${id} loaded above the viewport.`,
        isExpanded: id % 3 === 0,
      }
    },
  )
  const nextMessages = [...olderMessages, ...model.virtualListChatMessages]

  return updateVirtualListChatMessages(nextMessages)
})

const prependVirtualListChatMessagesOnStartThresholdEntry = (
  scrollTop: number,
) =>
  Ui.step(model => {
    const isNearStart = scrollTop <= VIRTUAL_LIST_CHAT_START_THRESHOLD_PX
    const nextVirtualListChatStartProximity = isNearStart
      ? VirtualListChatStartProximity.Near()
      : VirtualListChatStartProximity.Away()
    const updateStartProximity = Ui.step(stepModel => ({
      model: modifyFields(stepModel, {
        virtualListChatStartProximity: () => nextVirtualListChatStartProximity,
      }),
    }))

    if (!isNearStart || model.virtualListChatStartProximity._tag === 'Near') {
      return updateStartProximity
    }

    return Update.combine([
      updateStartProximity,
      prependVirtualListChatMessages,
    ])
  })
export const update = UiComposition.makeUpdate((model, message) =>
  Message.match(message, {
    UpdatedInputDemoValue: ({ value }) => ({
      model: modifyFields(model, { inputDemoValue: () => value }),
    }),

    UpdatedTextareaDemoValue: ({ value }) => ({
      model: modifyFields(model, { textareaDemoValue: () => value }),
    }),

    UpdatedFieldsetInputValue: ({ value }) => ({
      model: modifyFields(model, { fieldsetInputValue: () => value }),
    }),

    UpdatedFieldsetTextareaValue: ({ value }) => ({
      model: modifyFields(model, { fieldsetTextareaValue: () => value }),
    }),

    UpdatedSelectDemoValue: ({ value }) => ({
      model: modifyFields(model, { selectDemoValue: () => value }),
    }),

    ToggledFieldsetCheckboxDemo: ({ isChecked }) => ({
      model: modifyFields(model, {
        isFieldsetCheckboxDemoChecked: () => isChecked,
      }),
    }),

    ClickedButtonDemo: () => ({
      model: modifyFields(model, {
        buttonClickCount: Number.increment,
      }),
    }),

    ToggledCheckboxBasicDemo: ({ isChecked }) => ({
      model: modifyFields(model, {
        isCheckboxBasicDemoChecked: () => isChecked,
      }),
    }),

    ToggledCheckboxAllDemo: ({ isChecked }) => ({
      model: modifyFields(model, {
        isCheckboxOptionADemoChecked: () => isChecked,
        isCheckboxOptionBDemoChecked: () => isChecked,
      }),
    }),

    ToggledCheckboxOptionADemo: ({ isChecked }) => ({
      model: modifyFields(model, {
        isCheckboxOptionADemoChecked: () => isChecked,
      }),
    }),

    ToggledCheckboxOptionBDemo: ({ isChecked }) => ({
      model: modifyFields(model, {
        isCheckboxOptionBDemoChecked: () => isChecked,
      }),
    }),

    ClickedDeleteProject: () => NestedDialogChildDemoBinding.open()(model),

    ClickedOpenDialog: () => DialogDemoBinding.open()(model),

    ClickedOpenAnimatedDialog: () => DialogAnimatedDemoBinding.open()(model),

    ClickedEditFilters: () => OverlayDialogDemoBinding.open()(model),

    ClickedOpenProjectSettings: () =>
      NestedDialogParentDemoBinding.open()(model),

    ToggledDisclosureDemo: ({ isOpen }) => ({
      model: modifyFields(model, { isDisclosureDemoOpen: () => isOpen }),
    }),

    ToggledDisclosureCollapsedPreviewDemo: ({ isOpen }) => ({
      model: modifyFields(model, {
        isDisclosureCollapsedPreviewDemoOpen: () => isOpen,
      }),
    }),

    ToggledSwitchDemo: ({ isChecked }) => ({
      model: modifyFields(model, { isSwitchDemoChecked: () => isChecked }),
    }),

    ClickedHoverIntentMenuItem: () => HoverIntentMenuDemoBinding.close()(model),

    ClickedShowInfoToast: () =>
      ToastDemoBinding.show({
        variant: 'Info',
        payload: {
          title: 'Preferences updated',
          maybeDescription: Option.some('Your changes are saved.'),
        },
      })(model),

    ClickedShowSuccessToast: () =>
      ToastDemoBinding.show({
        variant: 'Success',
        payload: {
          title: 'Uploaded',
          maybeDescription: Option.some('kit-manual.pdf is now available.'),
        },
      })(model),

    ClickedShowErrorToast: () =>
      ToastDemoBinding.show({
        variant: 'Error',
        payload: {
          title: 'Save failed',
          maybeDescription: Option.some('Check your connection and try again.'),
        },
      })(model),

    ClickedShowStickyToast: () =>
      ToastDemoBinding.show({
        variant: 'Info',
        payload: {
          title: 'Action required',
          maybeDescription: Option.some('Stays visible until dismissed.'),
        },
        sticky: true,
      })(model),

    ClickedDismissAllToasts: () => ToastDemoBinding.dismissAll()(model),

    ClickedToggleAnimationDemo: () =>
      model.animationDemo.isShowing
        ? AnimationDemoBinding.hide()(model)
        : AnimationDemoBinding.show()(model),

    ClickedRemoveFileDropDemoFile: ({ fileIndex }) => ({
      model: modifyFields(model, {
        fileDropBasicDemoFiles: () =>
          Array.remove(model.fileDropBasicDemoFiles, fileIndex),
      }),
    }),

    ClickedVirtualListScrollToMiddle: () =>
      VirtualListDemoBinding.scrollToIndex(
        Math.floor(VIRTUAL_LIST_ROW_COUNT / 2),
      )(model),

    ClickedVirtualListVariableScrollToMiddle: () =>
      VirtualListVariableDemoBinding.scrollToIndex(
        Math.floor(VIRTUAL_LIST_ROW_COUNT / 2),
      )(model),

    GotVirtualListChatDemoMessage: ({ message }) =>
      Match.value(message).pipe(
        Match.tag('ObservedContainerScroll', ({ scrollTop }) =>
          Update.combine(model, [
            stepModel => VirtualListChatDemoBinding.fold(stepModel, message),
            prependVirtualListChatMessagesOnStartThresholdEntry(scrollTop),
          ]),
        ),
        Match.orElse(() => VirtualListChatDemoBinding.fold(model, message)),
      ),

    ClickedVirtualListChatPrepend: () => prependVirtualListChatMessages(model),

    ClickedVirtualListChatScrollToMessage: () =>
      VirtualListChatDemoBinding.scrollToKey('7', { alignment: 'Center' })(
        model,
      ),

    ClickedVirtualListChatAppend: () => {
      const nextId = model.virtualListChatNextId
      const nextMessages = Array.append(model.virtualListChatMessages, {
        id: nextId,
        body: `New message ${nextId} arrived at the end.`,
        isExpanded: nextId % 3 === 0,
      })
      return updateVirtualListChatMessages(nextMessages, nextId + 1)(model)
    },

    ClickedVirtualListChatToggleMessage: ({ messageId }) => {
      const nextMessages = Array.map(model.virtualListChatMessages, message =>
        message.id === messageId
          ? modifyFields(message, {
              isExpanded: isExpanded => !isExpanded,
            })
          : message,
      )
      return updateVirtualListChatMessages(nextMessages)(model)
    },
  }),
)
