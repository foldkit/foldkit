import { Effect, Match as M, Number } from 'effect'
import { Command, Ui } from 'foldkit'
import { evo } from 'foldkit/struct'

import {
  GotCheckboxBasicDemoMessage,
  GotCheckboxOptionADemoMessage,
  GotCheckboxOptionBDemoMessage,
  GotComboboxDemoMessage,
  GotComboboxMultiDemoMessage,
  GotComboboxNullableDemoMessage,
  GotComboboxSelectOnFocusDemoMessage,
  GotDialogAnimatedDemoMessage,
  GotDialogDemoMessage,
  GotDisclosureDemoMessage,
  GotFieldsetCheckboxDemoMessage,
  GotHorizontalRadioGroupDemoMessage,
  GotHorizontalTabsDemoMessage,
  GotListboxDemoMessage,
  GotListboxGroupedDemoMessage,
  GotListboxMultiDemoMessage,
  GotMenuAnimatedDemoMessage,
  GotMenuBasicDemoMessage,
  GotMobileMenuDialogMessage,
  GotPopoverAnimatedDemoMessage,
  GotPopoverBasicDemoMessage,
  GotSwitchDemoMessage,
  GotTransitionDemoMessage,
  GotVerticalRadioGroupDemoMessage,
  GotVerticalTabsDemoMessage,
  ToggledTransitionDemo,
  type UiMessage,
} from './message'
import type { UiModel } from './model'

export type UiUpdateReturn = [
  UiModel,
  ReadonlyArray<Command.Command<UiMessage>>,
]
const withUpdateReturn = M.withReturnType<UiUpdateReturn>()

export const uiUpdate = (model: UiModel, message: UiMessage): UiUpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      GotMobileMenuDialogMessage: ({ message }) => {
        const [nextMobileMenuDialog, mobileMenuDialogCommands] =
          Ui.Dialog.update(model.mobileMenuDialog, message)

        return [
          evo(model, {
            mobileMenuDialog: () => nextMobileMenuDialog,
          }),
          mobileMenuDialogCommands.map(
            Command.mapEffect(
              Effect.map(message => GotMobileMenuDialogMessage({ message })),
            ),
          ),
        ]
      },

      UpdatedInputDemoValue: ({ value }) => [
        evo(model, { inputDemoValue: () => value }),
        [],
      ],

      UpdatedTextareaDemoValue: ({ value }) => [
        evo(model, { textareaDemoValue: () => value }),
        [],
      ],

      UpdatedFieldsetInputValue: ({ value }) => [
        evo(model, { fieldsetInputValue: () => value }),
        [],
      ],

      UpdatedFieldsetTextareaValue: ({ value }) => [
        evo(model, { fieldsetTextareaValue: () => value }),
        [],
      ],

      UpdatedSelectDemoValue: ({ value }) => [
        evo(model, { selectDemoValue: () => value }),
        [],
      ],

      GotFieldsetCheckboxDemoMessage: ({ message }) => {
        const [nextFieldsetCheckboxDemo, fieldsetCheckboxCommands] =
          Ui.Checkbox.update(model.fieldsetCheckboxDemo, message)

        return [
          evo(model, {
            fieldsetCheckboxDemo: () => nextFieldsetCheckboxDemo,
          }),
          fieldsetCheckboxCommands.map(
            Command.mapEffect(
              Effect.map(message =>
                GotFieldsetCheckboxDemoMessage({ message }),
              ),
            ),
          ),
        ]
      },

      ClickedButtonDemo: () => [
        evo(model, {
          buttonClickCount: Number.increment,
        }),
        [],
      ],

      GotCheckboxBasicDemoMessage: ({ message }) => {
        const [nextCheckboxBasicDemo, checkboxBasicCommands] =
          Ui.Checkbox.update(model.checkboxBasicDemo, message)

        return [
          evo(model, {
            checkboxBasicDemo: () => nextCheckboxBasicDemo,
          }),
          checkboxBasicCommands.map(
            Command.mapEffect(
              Effect.map(message => GotCheckboxBasicDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotCheckboxAllDemoMessage: () => {
        const isAllChecked =
          model.checkboxOptionADemo.isChecked &&
          model.checkboxOptionBDemo.isChecked
        const nextChecked = !isAllChecked

        return [
          evo(model, {
            checkboxOptionADemo: () =>
              evo(model.checkboxOptionADemo, {
                isChecked: () => nextChecked,
              }),
            checkboxOptionBDemo: () =>
              evo(model.checkboxOptionBDemo, {
                isChecked: () => nextChecked,
              }),
          }),
          [],
        ]
      },

      GotCheckboxOptionADemoMessage: ({ message }) => {
        const [nextOptionA, optionACommands] = Ui.Checkbox.update(
          model.checkboxOptionADemo,
          message,
        )

        return [
          evo(model, {
            checkboxOptionADemo: () => nextOptionA,
          }),
          optionACommands.map(
            Command.mapEffect(
              Effect.map(message => GotCheckboxOptionADemoMessage({ message })),
            ),
          ),
        ]
      },

      GotCheckboxOptionBDemoMessage: ({ message }) => {
        const [nextOptionB, optionBCommands] = Ui.Checkbox.update(
          model.checkboxOptionBDemo,
          message,
        )

        return [
          evo(model, {
            checkboxOptionBDemo: () => nextOptionB,
          }),
          optionBCommands.map(
            Command.mapEffect(
              Effect.map(message => GotCheckboxOptionBDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotComboboxDemoMessage: ({ message }) => {
        const [nextComboboxDemo, comboboxCommands] = Ui.Combobox.update(
          model.comboboxDemo,
          message,
        )

        return [
          evo(model, {
            comboboxDemo: () => nextComboboxDemo,
          }),
          comboboxCommands.map(
            Command.mapEffect(
              Effect.map(message => GotComboboxDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotComboboxNullableDemoMessage: ({ message }) => {
        const [nextComboboxNullableDemo, comboboxNullableCommands] =
          Ui.Combobox.update(model.comboboxNullableDemo, message)

        return [
          evo(model, {
            comboboxNullableDemo: () => nextComboboxNullableDemo,
          }),
          comboboxNullableCommands.map(
            Command.mapEffect(
              Effect.map(message =>
                GotComboboxNullableDemoMessage({ message }),
              ),
            ),
          ),
        ]
      },

      GotComboboxMultiDemoMessage: ({ message }) => {
        const [nextComboboxMultiDemo, comboboxMultiCommands] =
          Ui.Combobox.Multi.update(model.comboboxMultiDemo, message)

        return [
          evo(model, {
            comboboxMultiDemo: () => nextComboboxMultiDemo,
          }),
          comboboxMultiCommands.map(
            Command.mapEffect(
              Effect.map(message => GotComboboxMultiDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotComboboxSelectOnFocusDemoMessage: ({ message }) => {
        const [nextComboboxSelectOnFocusDemo, comboboxSelectOnFocusCommands] =
          Ui.Combobox.update(model.comboboxSelectOnFocusDemo, message)

        return [
          evo(model, {
            comboboxSelectOnFocusDemo: () => nextComboboxSelectOnFocusDemo,
          }),
          comboboxSelectOnFocusCommands.map(
            Command.mapEffect(
              Effect.map(message =>
                GotComboboxSelectOnFocusDemoMessage({ message }),
              ),
            ),
          ),
        ]
      },

      GotDialogDemoMessage: ({ message }) => {
        const [nextDialogDemo, dialogCommands] = Ui.Dialog.update(
          model.dialogDemo,
          message,
        )

        return [
          evo(model, {
            dialogDemo: () => nextDialogDemo,
          }),
          dialogCommands.map(
            Command.mapEffect(
              Effect.map(message => GotDialogDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotDialogAnimatedDemoMessage: ({ message }) => {
        const [nextDialogAnimatedDemo, dialogAnimatedCommands] =
          Ui.Dialog.update(model.dialogAnimatedDemo, message)

        return [
          evo(model, {
            dialogAnimatedDemo: () => nextDialogAnimatedDemo,
          }),
          dialogAnimatedCommands.map(
            Command.mapEffect(
              Effect.map(message => GotDialogAnimatedDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotDisclosureDemoMessage: ({ message }) => {
        const [nextDisclosureDemo, disclosureCommands] = Ui.Disclosure.update(
          model.disclosureDemo,
          message,
        )

        return [
          evo(model, {
            disclosureDemo: () => nextDisclosureDemo,
          }),
          disclosureCommands.map(
            Command.mapEffect(
              Effect.map(message => GotDisclosureDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotListboxDemoMessage: ({ message }) => {
        const [nextListboxDemo, listboxCommands] = Ui.Listbox.update(
          model.listboxDemo,
          message,
        )

        return [
          evo(model, {
            listboxDemo: () => nextListboxDemo,
          }),
          listboxCommands.map(
            Command.mapEffect(
              Effect.map(message => GotListboxDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotListboxMultiDemoMessage: ({ message }) => {
        const [nextListboxMultiDemo, listboxMultiCommands] =
          Ui.Listbox.Multi.update(model.listboxMultiDemo, message)

        return [
          evo(model, {
            listboxMultiDemo: () => nextListboxMultiDemo,
          }),
          listboxMultiCommands.map(
            Command.mapEffect(
              Effect.map(message => GotListboxMultiDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotListboxGroupedDemoMessage: ({ message }) => {
        const [nextListboxGroupedDemo, listboxGroupedCommands] =
          Ui.Listbox.update(model.listboxGroupedDemo, message)

        return [
          evo(model, {
            listboxGroupedDemo: () => nextListboxGroupedDemo,
          }),
          listboxGroupedCommands.map(
            Command.mapEffect(
              Effect.map(message => GotListboxGroupedDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotMenuBasicDemoMessage: ({ message }) => {
        const [nextMenuBasicDemo, menuBasicCommands] = Ui.Menu.update(
          model.menuBasicDemo,
          message,
        )

        return [
          evo(model, {
            menuBasicDemo: () => nextMenuBasicDemo,
          }),
          menuBasicCommands.map(
            Command.mapEffect(
              Effect.map(message => GotMenuBasicDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotMenuAnimatedDemoMessage: ({ message }) => {
        const [nextMenuAnimatedDemo, menuAnimatedCommands] = Ui.Menu.update(
          model.menuAnimatedDemo,
          message,
        )

        return [
          evo(model, {
            menuAnimatedDemo: () => nextMenuAnimatedDemo,
          }),
          menuAnimatedCommands.map(
            Command.mapEffect(
              Effect.map(message => GotMenuAnimatedDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotPopoverBasicDemoMessage: ({ message }) => {
        const [nextPopoverBasicDemo, popoverBasicCommands] = Ui.Popover.update(
          model.popoverBasicDemo,
          message,
        )

        return [
          evo(model, {
            popoverBasicDemo: () => nextPopoverBasicDemo,
          }),
          popoverBasicCommands.map(
            Command.mapEffect(
              Effect.map(message => GotPopoverBasicDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotPopoverAnimatedDemoMessage: ({ message }) => {
        const [nextPopoverAnimatedDemo, popoverAnimatedCommands] =
          Ui.Popover.update(model.popoverAnimatedDemo, message)

        return [
          evo(model, {
            popoverAnimatedDemo: () => nextPopoverAnimatedDemo,
          }),
          popoverAnimatedCommands.map(
            Command.mapEffect(
              Effect.map(message => GotPopoverAnimatedDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotVerticalRadioGroupDemoMessage: ({ message }) => {
        const [nextVerticalRadioGroupDemo, verticalRadioGroupCommands] =
          Ui.RadioGroup.update(model.verticalRadioGroupDemo, message)

        return [
          evo(model, {
            verticalRadioGroupDemo: () => nextVerticalRadioGroupDemo,
          }),
          verticalRadioGroupCommands.map(
            Command.mapEffect(
              Effect.map(message =>
                GotVerticalRadioGroupDemoMessage({ message }),
              ),
            ),
          ),
        ]
      },

      GotHorizontalRadioGroupDemoMessage: ({ message }) => {
        const [nextHorizontalRadioGroupDemo, horizontalRadioGroupCommands] =
          Ui.RadioGroup.update(model.horizontalRadioGroupDemo, message)

        return [
          evo(model, {
            horizontalRadioGroupDemo: () => nextHorizontalRadioGroupDemo,
          }),
          horizontalRadioGroupCommands.map(
            Command.mapEffect(
              Effect.map(message =>
                GotHorizontalRadioGroupDemoMessage({ message }),
              ),
            ),
          ),
        ]
      },

      GotSwitchDemoMessage: ({ message }) => {
        const [nextSwitchDemo, switchCommands] = Ui.Switch.update(
          model.switchDemo,
          message,
        )

        return [
          evo(model, {
            switchDemo: () => nextSwitchDemo,
          }),
          switchCommands.map(
            Command.mapEffect(
              Effect.map(message => GotSwitchDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotHorizontalTabsDemoMessage: ({ message }) => {
        const [nextHorizontalTabsDemo, horizontalTabsCommands] = Ui.Tabs.update(
          model.horizontalTabsDemo,
          message,
        )

        return [
          evo(model, {
            horizontalTabsDemo: () => nextHorizontalTabsDemo,
          }),
          horizontalTabsCommands.map(
            Command.mapEffect(
              Effect.map(message => GotHorizontalTabsDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotVerticalTabsDemoMessage: ({ message }) => {
        const [nextVerticalTabsDemo, verticalTabsCommands] = Ui.Tabs.update(
          model.verticalTabsDemo,
          message,
        )

        return [
          evo(model, {
            verticalTabsDemo: () => nextVerticalTabsDemo,
          }),
          verticalTabsCommands.map(
            Command.mapEffect(
              Effect.map(message => GotVerticalTabsDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotTransitionDemoMessage: ({ message }) => {
        const [nextTransitionDemo, transitionCommands] = Ui.Transition.update(
          model.transitionDemo,
          message,
        )

        return [
          evo(model, {
            transitionDemo: () => nextTransitionDemo,
          }),
          transitionCommands.map(
            Command.mapEffect(
              Effect.map(message => GotTransitionDemoMessage({ message })),
            ),
          ),
        ]
      },

      ToggledTransitionDemo: () => {
        const nextShowing = !model.isTransitionDemoShowing
        const transitionMessage = nextShowing
          ? Ui.Transition.Showed()
          : Ui.Transition.Hidden()

        const [nextTransitionDemo, transitionCommands] = Ui.Transition.update(
          model.transitionDemo,
          transitionMessage,
        )

        return [
          evo(model, {
            isTransitionDemoShowing: () => nextShowing,
            transitionDemo: () => nextTransitionDemo,
          }),
          transitionCommands.map(
            Command.mapEffect(
              Effect.map(message => GotTransitionDemoMessage({ message })),
            ),
          ),
        ]
      },
    }),
  )
