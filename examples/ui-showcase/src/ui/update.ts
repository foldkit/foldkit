import { Array, Number, Option } from 'effect'
import { modifyFields } from 'foldkit/struct'

import {
  AnimationDemoBinding,
  DialogAnimatedDemoBinding,
  DialogDemoBinding,
  MobileMenuDialogBinding,
  NestedDialogChildDemoBinding,
  NestedDialogParentDemoBinding,
  OverlayDialogDemoBinding,
  ToastDemoBinding,
  UiComposition,
  VirtualListDemoBinding,
  VirtualListVariableDemoBinding,
} from './composition'
import { Ui } from './definition'
import { Message } from './message'
import { ROW_COUNT as VIRTUAL_LIST_ROW_COUNT } from './virtualList'

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

    ToggledDisclosureBasicDemo: ({ isOpen }) => ({
      model: modifyFields(model, {
        isDisclosureBasicDemoOpen: () => isOpen,
      }),
    }),

    ToggledDisclosureAnimatedDemo: ({ isOpen }) => ({
      model: modifyFields(model, {
        isDisclosureAnimatedDemoOpen: () => isOpen,
      }),
    }),

    ToggledDisclosureCollapsedPreviewDemo: ({ isOpen }) => ({
      model: modifyFields(model, {
        isDisclosureCollapsedPreviewDemoOpen: () => isOpen,
      }),
    }),

    ClickedRemoveFileDropDemoFile: ({ fileIndex }) => ({
      model: modifyFields(model, {
        fileDropBasicDemoFiles: () =>
          Array.remove(model.fileDropBasicDemoFiles, fileIndex),
      }),
    }),

    ToggledSwitchDemo: ({ isChecked }) => ({
      model: modifyFields(model, {
        isSwitchDemoChecked: () => isChecked,
      }),
    }),

    ClickedShowInfoToast: () =>
      ToastDemoBinding.show({
        variant: 'Info',
        payload: {
          title: 'Changes saved',
          maybeDescription: Option.some('Your preferences have been updated.'),
        },
      })(model),

    ClickedShowSuccessToast: () =>
      ToastDemoBinding.show({
        variant: 'Success',
        payload: {
          title: 'Uploaded successfully',
          maybeDescription: Option.some('kit-manual.pdf is now available.'),
        },
      })(model),

    ClickedShowWarningToast: () =>
      ToastDemoBinding.show({
        variant: 'Warning',
        payload: {
          title: 'Network slow',
          maybeDescription: Option.some(
            'Some assets are loading over a weak connection.',
          ),
        },
      })(model),

    ClickedShowErrorToast: () =>
      ToastDemoBinding.show({
        variant: 'Error',
        payload: {
          title: 'Failed to save',
          maybeDescription: Option.some('Check your connection and try again.'),
        },
      })(model),

    ClickedShowStickyToast: () =>
      ToastDemoBinding.show({
        variant: 'Info',
        payload: {
          title: 'Review pending',
          maybeDescription: Option.some(
            'Action required. This stays until dismissed.',
          ),
        },
        sticky: true,
      })(model),

    ClickedDismissAllToasts: () => ToastDemoBinding.dismissAll()(model),

    ToggledAnimationDemo: () =>
      model.animationDemo.isShowing
        ? AnimationDemoBinding.hide()(model)
        : AnimationDemoBinding.show()(model),

    ClickedVirtualListScrollToMiddle: () =>
      VirtualListDemoBinding.scrollToIndex(
        Math.floor(VIRTUAL_LIST_ROW_COUNT / 2),
      )(model),

    ClickedVirtualListVariableScrollToMiddle: () =>
      VirtualListVariableDemoBinding.scrollToIndex(
        Math.floor(VIRTUAL_LIST_ROW_COUNT / 2),
      )(model),
  }),
)

export const openMobileMenu = Ui.step(() => MobileMenuDialogBinding.open())

export const closeMobileMenu = Ui.step(() => MobileMenuDialogBinding.close())
