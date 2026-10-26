import { Array, Number, Option } from 'effect'

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
import { makeFieldsStep } from './definition'
import { ROW_COUNT as VIRTUAL_LIST_ROW_COUNT } from './virtualList'

export const update = UiComposition.makeUpdate({
  RequestedOpenMobileMenu: MobileMenuDialogBinding.requestOpen(),

  RequestedCloseMobileMenu: MobileMenuDialogBinding.requestClose(),

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

  ToggledDisclosureBasicDemo: makeFieldsStep.fromMessage(({ isOpen }) => ({
    isDisclosureBasicDemoOpen: () => isOpen,
  })),

  ToggledDisclosureAnimatedDemo: makeFieldsStep.fromMessage(({ isOpen }) => ({
    isDisclosureAnimatedDemoOpen: () => isOpen,
  })),

  ToggledDisclosureCollapsedPreviewDemo: makeFieldsStep.fromMessage(
    ({ isOpen }) => ({
      isDisclosureCollapsedPreviewDemoOpen: () => isOpen,
    }),
  ),

  ClickedRemoveFileDropDemoFile: makeFieldsStep((model, { fileIndex }) => ({
    fileDropBasicDemoFiles: () =>
      Array.remove(model.fileDropBasicDemoFiles, fileIndex),
  })),

  ToggledSwitchDemo: makeFieldsStep.fromMessage(({ isChecked }) => ({
    isSwitchDemoChecked: () => isChecked,
  })),

  ClickedShowInfoToast: ToastDemoBinding.requestShow({
    variant: 'Info',
    payload: {
      title: 'Changes saved',
      maybeDescription: Option.some('Your preferences have been updated.'),
    },
  }),

  ClickedShowSuccessToast: ToastDemoBinding.requestShow({
    variant: 'Success',
    payload: {
      title: 'Uploaded successfully',
      maybeDescription: Option.some('kit-manual.pdf is now available.'),
    },
  }),

  ClickedShowWarningToast: ToastDemoBinding.requestShow({
    variant: 'Warning',
    payload: {
      title: 'Network slow',
      maybeDescription: Option.some(
        'Some assets are loading over a weak connection.',
      ),
    },
  }),

  ClickedShowErrorToast: ToastDemoBinding.requestShow({
    variant: 'Error',
    payload: {
      title: 'Failed to save',
      maybeDescription: Option.some('Check your connection and try again.'),
    },
  }),

  ClickedShowStickyToast: ToastDemoBinding.requestShow({
    variant: 'Info',
    payload: {
      title: 'Review pending',
      maybeDescription: Option.some(
        'Action required. This stays until dismissed.',
      ),
    },
    sticky: true,
  }),

  ClickedDismissAllToasts: ToastDemoBinding.requestDismissAll(),

  ToggledAnimationDemo: model =>
    model.animationDemo.isShowing
      ? AnimationDemoBinding.requestHide()(model)
      : AnimationDemoBinding.requestShow()(model),

  ClickedVirtualListScrollToMiddle: VirtualListDemoBinding.requestScrollToIndex(
    Math.floor(VIRTUAL_LIST_ROW_COUNT / 2),
  ),

  ClickedVirtualListVariableScrollToMiddle:
    VirtualListVariableDemoBinding.requestScrollToIndex(
      Math.floor(VIRTUAL_LIST_ROW_COUNT / 2),
    ),
})
