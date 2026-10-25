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
import { UiDefinition } from './definition'
import { ROW_COUNT as VIRTUAL_LIST_ROW_COUNT } from './demo/virtualListData'
import {
  VirtualListChatDemoBinding,
  prependVirtualListChatMessages,
  updateVirtualListChatMessages,
} from './virtualListChat'

export const update = UiComposition.makeUpdate({
  UpdatedInputDemoValue: UiDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({ inputDemoValue: () => value }),
  ),

  UpdatedTextareaDemoValue: UiDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({ textareaDemoValue: () => value }),
  ),

  UpdatedFieldsetInputValue: UiDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({ fieldsetInputValue: () => value }),
  ),

  UpdatedFieldsetTextareaValue: UiDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({ fieldsetTextareaValue: () => value }),
  ),

  UpdatedSelectDemoValue: UiDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({ selectDemoValue: () => value }),
  ),

  ToggledFieldsetCheckboxDemo: UiDefinition.makeFieldsStep.fromMessage(
    ({ isChecked }) => ({
      isFieldsetCheckboxDemoChecked: () => isChecked,
    }),
  ),

  ClickedButtonDemo: UiDefinition.makeFieldsStep(() => ({
    buttonClickCount: Number.increment,
  })),

  ToggledCheckboxBasicDemo: UiDefinition.makeFieldsStep.fromMessage(
    ({ isChecked }) => ({
      isCheckboxBasicDemoChecked: () => isChecked,
    }),
  ),

  ToggledCheckboxAllDemo: UiDefinition.makeFieldsStep.fromMessage(
    ({ isChecked }) => ({
      isCheckboxOptionADemoChecked: () => isChecked,
      isCheckboxOptionBDemoChecked: () => isChecked,
    }),
  ),

  ToggledCheckboxOptionADemo: UiDefinition.makeFieldsStep.fromMessage(
    ({ isChecked }) => ({
      isCheckboxOptionADemoChecked: () => isChecked,
    }),
  ),

  ToggledCheckboxOptionBDemo: UiDefinition.makeFieldsStep.fromMessage(
    ({ isChecked }) => ({
      isCheckboxOptionBDemoChecked: () => isChecked,
    }),
  ),

  ClickedDeleteProject: NestedDialogChildDemoBinding.requestOpen(),

  ClickedOpenDialog: DialogDemoBinding.requestOpen(),

  ClickedOpenAnimatedDialog: DialogAnimatedDemoBinding.requestOpen(),

  ClickedEditFilters: OverlayDialogDemoBinding.requestOpen(),

  ClickedOpenProjectSettings: NestedDialogParentDemoBinding.requestOpen(),

  ToggledDisclosureDemo: UiDefinition.makeFieldsStep.fromMessage(
    ({ isOpen }) => ({ isDisclosureDemoOpen: () => isOpen }),
  ),

  ToggledDisclosureCollapsedPreviewDemo:
    UiDefinition.makeFieldsStep.fromMessage(({ isOpen }) => ({
      isDisclosureCollapsedPreviewDemoOpen: () => isOpen,
    })),

  ToggledSwitchDemo: UiDefinition.makeFieldsStep.fromMessage(
    ({ isChecked }) => ({ isSwitchDemoChecked: () => isChecked }),
  ),

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

  ClickedRemoveFileDropDemoFile: UiDefinition.makeFieldsStep.fromMessage(
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

  ClickedVirtualListChatPrepend: prependVirtualListChatMessages,

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
    return updateVirtualListChatMessages(nextMessages, nextId + 1)(model)
  },

  ClickedVirtualListChatToggleMessage: (model, { messageId }) => {
    const nextMessages = Array.map(model.virtualListChatMessages, message =>
      message.id === messageId
        ? modifyFields(message, {
            isExpanded: isExpanded => !isExpanded,
          })
        : message,
    )
    return updateVirtualListChatMessages(nextMessages)(model)
  },
})
