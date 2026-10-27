import { Array, Number, Option } from 'effect'
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
  VirtualListDemoBinding,
  VirtualListVariableDemoBinding,
} from './composition'
import { makeFieldsStep } from './definition'
import { ROW_COUNT as VIRTUAL_LIST_ROW_COUNT } from './demo/virtualListData'
import {
  VirtualListChatDemoBinding,
  handleCompletedFetchVirtualListChatHistory,
  prependVirtualListChatMessagesStep,
  updateVirtualListChatMessagesStep,
} from './virtualListChat'

export const update = UiComposition.makeUpdate({
  UpdatedInputDemoValue: makeFieldsStep.fromMessage(({ value }) => ({
    inputDemoValue: () => value,
  })),

  UpdatedTextareaDemoValue: makeFieldsStep.fromMessage(({ value }) => ({
    textareaDemoValue: () => value,
  })),

  UpdatedFieldsetInputValue: makeFieldsStep.fromMessage(({ value }) => ({
    fieldsetInputValue: () => value,
  })),

  UpdatedFieldsetTextareaValue: makeFieldsStep.fromMessage(({ value }) => ({
    fieldsetTextareaValue: () => value,
  })),

  UpdatedSelectDemoValue: makeFieldsStep.fromMessage(({ value }) => ({
    selectDemoValue: () => value,
  })),

  ToggledFieldsetCheckboxDemo: makeFieldsStep.fromMessage(({ isChecked }) => ({
    isFieldsetCheckboxDemoChecked: () => isChecked,
  })),

  ClickedButtonDemo: makeFieldsStep(() => ({
    buttonClickCount: Number.increment,
  })),

  ToggledCheckboxBasicDemo: makeFieldsStep.fromMessage(({ isChecked }) => ({
    isCheckboxBasicDemoChecked: () => isChecked,
  })),

  ToggledCheckboxAllDemo: makeFieldsStep.fromMessage(({ isChecked }) => ({
    isCheckboxOptionADemoChecked: () => isChecked,
    isCheckboxOptionBDemoChecked: () => isChecked,
  })),

  ToggledCheckboxOptionADemo: makeFieldsStep.fromMessage(({ isChecked }) => ({
    isCheckboxOptionADemoChecked: () => isChecked,
  })),

  ToggledCheckboxOptionBDemo: makeFieldsStep.fromMessage(({ isChecked }) => ({
    isCheckboxOptionBDemoChecked: () => isChecked,
  })),

  ClickedDeleteProject: NestedDialogChildDemoBinding.requestOpen(),

  ClickedOpenDialog: DialogDemoBinding.requestOpen(),

  ClickedOpenAnimatedDialog: DialogAnimatedDemoBinding.requestOpen(),

  ClickedEditFilters: OverlayDialogDemoBinding.requestOpen(),

  ClickedOpenProjectSettings: NestedDialogParentDemoBinding.requestOpen(),

  ToggledDisclosureDemo: makeFieldsStep.fromMessage(({ isOpen }) => ({
    isDisclosureDemoOpen: () => isOpen,
  })),

  ToggledDisclosureCollapsedPreviewDemo: makeFieldsStep.fromMessage(
    ({ isOpen }) => ({
      isDisclosureCollapsedPreviewDemoOpen: () => isOpen,
    }),
  ),

  ToggledSwitchDemo: makeFieldsStep.fromMessage(({ isChecked }) => ({
    isSwitchDemoChecked: () => isChecked,
  })),

  ClickedHoverIntentMenuItem: HoverIntentMenuDemoBinding.requestClose(),

  ClickedShowInfoToast: ToastDemoBinding.requestShow({
    variant: 'Info',
    payload: {
      title: 'Preferences updated',
      maybeDescription: Option.some('Your changes are saved.'),
    },
  }),

  ClickedShowSuccessToast: ToastDemoBinding.requestShow({
    variant: 'Success',
    payload: {
      title: 'Uploaded',
      maybeDescription: Option.some('kit-manual.pdf is now available.'),
    },
  }),

  ClickedShowErrorToast: ToastDemoBinding.requestShow({
    variant: 'Error',
    payload: {
      title: 'Save failed',
      maybeDescription: Option.some('Check your connection and try again.'),
    },
  }),

  ClickedShowStickyToast: ToastDemoBinding.requestShow({
    variant: 'Info',
    payload: {
      title: 'Action required',
      maybeDescription: Option.some('Stays visible until dismissed.'),
    },
    sticky: true,
  }),

  ClickedDismissAllToasts: ToastDemoBinding.requestDismissAll(),

  ClickedToggleAnimationDemo: model =>
    model.animationDemo.isShowing
      ? AnimationDemoBinding.requestHide()(model)
      : AnimationDemoBinding.requestShow()(model),

  ClickedRemoveFileDropDemoFile: makeFieldsStep.fromMessage(
    ({ fileIndex }) => ({
      fileDropBasicDemoFiles: Array.remove(fileIndex),
    }),
  ),

  ClickedVirtualListScrollToMiddle: VirtualListDemoBinding.requestScrollToIndex(
    Math.floor(VIRTUAL_LIST_ROW_COUNT / 2),
  ),

  ClickedVirtualListVariableScrollToMiddle:
    VirtualListVariableDemoBinding.requestScrollToIndex(
      Math.floor(VIRTUAL_LIST_ROW_COUNT / 2),
    ),

  ClickedVirtualListChatPrepend: prependVirtualListChatMessagesStep,

  CompletedFetchVirtualListChatHistory:
    handleCompletedFetchVirtualListChatHistory,

  ClickedVirtualListChatScrollToMessage:
    VirtualListChatDemoBinding.requestScrollToKey('7', {
      alignment: 'Center',
    }),

  ClickedVirtualListChatAppend: model => {
    const nextId = model.virtualListChatNextId
    const nextMessages = Array.append(model.virtualListChatMessages, {
      id: nextId,
      body: `New message ${nextId} arrived at the end.`,
      isExpanded: nextId % 3 === 0,
    })
    return updateVirtualListChatMessagesStep(nextMessages, nextId + 1)(model)
  },

  ClickedVirtualListChatToggleMessage: (model, { messageId }) => {
    const nextMessages = Array.map(model.virtualListChatMessages, message =>
      message.id === messageId
        ? modifyFields(message, {
            isExpanded: isExpanded => !isExpanded,
          })
        : message,
    )
    return updateVirtualListChatMessagesStep(nextMessages)(model)
  },
})
