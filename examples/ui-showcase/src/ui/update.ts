import { Array, Match as M, Number, Option, pipe } from 'effect'
import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

import {
  Animation,
  Calendar,
  DatePicker,
  Dialog,
  DragAndDrop,
  FileDrop,
  Menu,
  Popover,
  Slider,
  Tooltip,
  VirtualList,
} from '@foldkit/ui'

import {
  GotAnimationDemoMessage,
  GotCalendarBasicDemoMessage,
  GotComboboxDemoMessage,
  GotComboboxMultiDemoMessage,
  GotComboboxNullableDemoMessage,
  GotComboboxSelectOnFocusDemoMessage,
  GotDatePickerBasicDemoMessage,
  GotDialogAnimatedDemoMessage,
  GotDialogDemoMessage,
  GotDragAndDropDemoMessage,
  GotFileDropBasicDemoMessage,
  GotHorizontalTabsDemoMessage,
  GotListboxDemoMessage,
  GotListboxGroupedDemoMessage,
  GotListboxMultiDemoMessage,
  GotMenuAnimatedDemoMessage,
  GotMenuBasicDemoMessage,
  GotMobileMenuDialogMessage,
  GotNestedDialogChildDemoMessage,
  GotNestedDialogParentDemoMessage,
  GotOverlayComboboxDemoMessage,
  GotOverlayDialogDemoMessage,
  GotPopoverAnimatedDemoMessage,
  GotPopoverBasicDemoMessage,
  GotPopoverNestedChildDemoMessage,
  GotPopoverNestedParentDemoMessage,
  GotSliderRatingDemoMessage,
  GotSliderVolumeDemoMessage,
  GotToastDemoMessage,
  GotTooltipBasicDemoMessage,
  GotTooltipNoDelayDemoMessage,
  GotVerticalTabsDemoMessage,
  GotVirtualListDemoMessage,
  GotVirtualListVariableDemoMessage,
  type UiMessage,
} from './message'
import type { DemoColumn, UiModel } from './model'
import { Toast } from './toast'
import { CityCombobox, CityMultiCombobox } from './view/combobox'
import { CharacterListbox, ItemListbox, ItemMultiListbox } from './view/listbox'
import { DemoTabs } from './view/tabs'
import {
  ROW_COUNT as VIRTUAL_LIST_ROW_COUNT,
  variableActivities,
  variableRowHeightPx,
} from './view/virtualList'

const reorderColumns = (
  columns: ReadonlyArray<DemoColumn>,
  itemId: string,
  fromContainerId: string,
  toContainerId: string,
  toIndex: number,
): ReadonlyArray<DemoColumn> => {
  const maybeCard = pipe(
    columns,
    Array.findFirst(({ id }) => id === fromContainerId),
    Option.flatMap(column =>
      Array.findFirst(column.cards, ({ id }) => id === itemId),
    ),
  )

  return Option.match(maybeCard, {
    onNone: () => columns,
    onSome: card =>
      Array.map(columns, column => {
        const withRemoved =
          column.id === fromContainerId
            ? Array.filter(column.cards, ({ id }) => id !== itemId)
            : column.cards

        if (column.id !== toContainerId) {
          return evo(column, { cards: () => withRemoved })
        }

        const inserted = [
          ...Array.take(withRemoved, toIndex),
          card,
          ...Array.drop(withRemoved, toIndex),
        ]

        return evo(column, { cards: () => inserted })
      }),
  })
}

export type UiUpdateReturn = [
  UiModel,
  ReadonlyArray<Command.Command<UiMessage>>,
]
const withUpdateReturn = M.withReturnType<UiUpdateReturn>()

const DemoMenu = Menu.create<string>()

const delegateToAnimationDemo = (
  animationModel: Animation.Model,
  message: Animation.Message,
): readonly [Animation.Model, ReadonlyArray<Command.Command<UiMessage>>] => {
  const [nextAnimation, animationCommands, maybeOutMessage] = Animation.update(
    animationModel,
    message,
  )

  const toMessage = (animationMessage: Animation.Message): UiMessage =>
    GotAnimationDemoMessage({ message: animationMessage })

  const mappedCommands = Command.mapMessages(animationCommands, toMessage)

  const additionalCommands = Option.match(maybeOutMessage, {
    onNone: () => [],
    onSome: M.type<Animation.OutMessage>().pipe(
      M.tagsExhaustive({
        StartedLeaveAnimating: () => [
          Command.mapMessage(
            Animation.defaultLeaveCommand(nextAnimation),
            toMessage,
          ),
        ],
        TransitionedOut: () => [],
      }),
    ),
  })

  return [nextAnimation, [...mappedCommands, ...additionalCommands]]
}

export const uiUpdate = (model: UiModel, message: UiMessage): UiUpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      ClickedOpenMobileMenu: () => {
        const [nextMobileMenuDialog, mobileMenuDialogCommands] = Dialog.open(
          model.mobileMenuDialog,
        )

        return [
          evo(model, {
            mobileMenuDialog: () => nextMobileMenuDialog,
          }),
          Command.mapMessages(mobileMenuDialogCommands, message =>
            GotMobileMenuDialogMessage({ message }),
          ),
        ]
      },

      GotMobileMenuDialogMessage: ({ message }) => {
        const [nextMobileMenuDialog, mobileMenuDialogCommands] = Dialog.update(
          model.mobileMenuDialog,
          message,
        )

        return [
          evo(model, {
            mobileMenuDialog: () => nextMobileMenuDialog,
          }),
          Command.mapMessages(mobileMenuDialogCommands, message =>
            GotMobileMenuDialogMessage({ message }),
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

      ToggledFieldsetCheckbox: ({ isChecked }) => [
        evo(model, {
          fieldsetCheckboxDemo: () => isChecked,
        }),
        [],
      ],

      ClickedButtonDemo: () => [
        evo(model, {
          buttonClickCount: Number.increment,
        }),
        [],
      ],

      ToggledCheckboxBasicDemo: ({ isChecked }) => [
        evo(model, {
          checkboxBasicDemo: () => isChecked,
        }),
        [],
      ],

      ToggledCheckboxAllDemo: ({ isChecked }) => [
        evo(model, {
          checkboxOptionADemo: () => isChecked,
          checkboxOptionBDemo: () => isChecked,
        }),
        [],
      ],

      ToggledCheckboxOptionADemo: ({ isChecked }) => [
        evo(model, {
          checkboxOptionADemo: () => isChecked,
        }),
        [],
      ],

      ToggledCheckboxOptionBDemo: ({ isChecked }) => [
        evo(model, {
          checkboxOptionBDemo: () => isChecked,
        }),
        [],
      ],

      GotComboboxDemoMessage: ({ message }) => {
        const [nextComboboxDemo, comboboxCommands] = CityCombobox.update(
          model.comboboxDemo,
          message,
        )

        return [
          evo(model, {
            comboboxDemo: () => nextComboboxDemo,
          }),
          Command.mapMessages(comboboxCommands, message =>
            GotComboboxDemoMessage({ message }),
          ),
        ]
      },

      GotComboboxNullableDemoMessage: ({ message }) => {
        const [nextComboboxNullableDemo, comboboxNullableCommands] =
          CityCombobox.update(model.comboboxNullableDemo, message)

        return [
          evo(model, {
            comboboxNullableDemo: () => nextComboboxNullableDemo,
          }),
          Command.mapMessages(comboboxNullableCommands, message =>
            GotComboboxNullableDemoMessage({ message }),
          ),
        ]
      },

      GotComboboxMultiDemoMessage: ({ message }) => {
        const [nextComboboxMultiDemo, comboboxMultiCommands] =
          CityMultiCombobox.update(model.comboboxMultiDemo, message)

        return [
          evo(model, {
            comboboxMultiDemo: () => nextComboboxMultiDemo,
          }),
          Command.mapMessages(comboboxMultiCommands, message =>
            GotComboboxMultiDemoMessage({ message }),
          ),
        ]
      },

      GotComboboxSelectOnFocusDemoMessage: ({ message }) => {
        const [nextComboboxSelectOnFocusDemo, comboboxSelectOnFocusCommands] =
          CityCombobox.update(model.comboboxSelectOnFocusDemo, message)

        return [
          evo(model, {
            comboboxSelectOnFocusDemo: () => nextComboboxSelectOnFocusDemo,
          }),
          Command.mapMessages(comboboxSelectOnFocusCommands, message =>
            GotComboboxSelectOnFocusDemoMessage({ message }),
          ),
        ]
      },

      GotDialogDemoMessage: ({ message }) => {
        const [nextDialogDemo, dialogCommands] = Dialog.update(
          model.dialogDemo,
          message,
        )

        return [
          evo(model, {
            dialogDemo: () => nextDialogDemo,
          }),
          Command.mapMessages(dialogCommands, message =>
            GotDialogDemoMessage({ message }),
          ),
        ]
      },

      GotDialogAnimatedDemoMessage: ({ message }) => {
        const [nextDialogAnimatedDemo, dialogAnimatedCommands] = Dialog.update(
          model.dialogAnimatedDemo,
          message,
        )

        return [
          evo(model, {
            dialogAnimatedDemo: () => nextDialogAnimatedDemo,
          }),
          Command.mapMessages(dialogAnimatedCommands, message =>
            GotDialogAnimatedDemoMessage({ message }),
          ),
        ]
      },

      GotOverlayDialogDemoMessage: ({ message }) => {
        const [nextOverlayDialogDemo, overlayDialogCommands] = Dialog.update(
          model.overlayDialogDemo,
          message,
        )

        return [
          evo(model, {
            overlayDialogDemo: () => nextOverlayDialogDemo,
          }),
          Command.mapMessages(overlayDialogCommands, message =>
            GotOverlayDialogDemoMessage({ message }),
          ),
        ]
      },

      GotOverlayComboboxDemoMessage: ({ message }) => {
        const [nextOverlayComboboxDemo, overlayComboboxCommands] =
          CityCombobox.update(model.overlayComboboxDemo, message)

        return [
          evo(model, {
            overlayComboboxDemo: () => nextOverlayComboboxDemo,
          }),
          Command.mapMessages(overlayComboboxCommands, message =>
            GotOverlayComboboxDemoMessage({ message }),
          ),
        ]
      },

      GotNestedDialogParentDemoMessage: ({ message }) => {
        const [nextNestedDialogParentDemo, nestedDialogParentCommands] =
          Dialog.update(model.nestedDialogParentDemo, message)

        return [
          evo(model, {
            nestedDialogParentDemo: () => nextNestedDialogParentDemo,
          }),
          Command.mapMessages(nestedDialogParentCommands, message =>
            GotNestedDialogParentDemoMessage({ message }),
          ),
        ]
      },

      GotNestedDialogChildDemoMessage: ({ message }) => {
        const [nextNestedDialogChildDemo, nestedDialogChildCommands] =
          Dialog.update(model.nestedDialogChildDemo, message)

        return [
          evo(model, {
            nestedDialogChildDemo: () => nextNestedDialogChildDemo,
          }),
          Command.mapMessages(nestedDialogChildCommands, message =>
            GotNestedDialogChildDemoMessage({ message }),
          ),
        ]
      },

      ClickedDeleteProject: () => {
        const [nextNestedDialogChildDemo, nestedDialogChildCommands] =
          Dialog.open(model.nestedDialogChildDemo)

        return [
          evo(model, {
            nestedDialogChildDemo: () => nextNestedDialogChildDemo,
          }),
          Command.mapMessages(nestedDialogChildCommands, message =>
            GotNestedDialogChildDemoMessage({ message }),
          ),
        ]
      },

      ClickedOpenDialog: () => {
        const [nextDialogDemo, dialogCommands] = Dialog.open(model.dialogDemo)

        return [
          evo(model, { dialogDemo: () => nextDialogDemo }),
          Command.mapMessages(dialogCommands, message =>
            GotDialogDemoMessage({ message }),
          ),
        ]
      },

      ClickedOpenAnimatedDialog: () => {
        const [nextDialogAnimatedDemo, dialogAnimatedCommands] = Dialog.open(
          model.dialogAnimatedDemo,
        )

        return [
          evo(model, { dialogAnimatedDemo: () => nextDialogAnimatedDemo }),
          Command.mapMessages(dialogAnimatedCommands, message =>
            GotDialogAnimatedDemoMessage({ message }),
          ),
        ]
      },

      ClickedEditFilters: () => {
        const [nextOverlayDialogDemo, overlayDialogCommands] = Dialog.open(
          model.overlayDialogDemo,
        )

        return [
          evo(model, { overlayDialogDemo: () => nextOverlayDialogDemo }),
          Command.mapMessages(overlayDialogCommands, message =>
            GotOverlayDialogDemoMessage({ message }),
          ),
        ]
      },

      ClickedOpenProjectSettings: () => {
        const [nextNestedDialogParentDemo, nestedDialogParentCommands] =
          Dialog.open(model.nestedDialogParentDemo)

        return [
          evo(model, {
            nestedDialogParentDemo: () => nextNestedDialogParentDemo,
          }),
          Command.mapMessages(nestedDialogParentCommands, message =>
            GotNestedDialogParentDemoMessage({ message }),
          ),
        ]
      },

      ToggledDisclosureBasicDemo: ({ isOpen }) => [
        evo(model, {
          disclosureBasicDemo: () => isOpen,
        }),
        [],
      ],

      ToggledDisclosureAnimatedDemo: ({ isOpen }) => [
        evo(model, {
          disclosureAnimatedDemo: () => isOpen,
        }),
        [],
      ],

      GotCalendarBasicDemoMessage: ({ message }) => {
        const [nextCalendarBasicDemo, calendarBasicCommands] = Calendar.update(
          model.calendarBasicDemo,
          message,
        )

        return [
          evo(model, {
            calendarBasicDemo: () => nextCalendarBasicDemo,
          }),
          Command.mapMessages(calendarBasicCommands, message =>
            GotCalendarBasicDemoMessage({ message }),
          ),
        ]
      },

      GotDatePickerBasicDemoMessage: ({ message }) => {
        const [nextDatePickerBasicDemo, datePickerBasicCommands] =
          DatePicker.update(model.datePickerBasicDemo, message)

        return [
          evo(model, {
            datePickerBasicDemo: () => nextDatePickerBasicDemo,
          }),
          Command.mapMessages(datePickerBasicCommands, message =>
            GotDatePickerBasicDemoMessage({ message }),
          ),
        ]
      },

      GotDragAndDropDemoMessage: ({ message }) => {
        const [nextDragAndDrop, dragAndDropCommands, maybeOutMessage] =
          DragAndDrop.update(model.dragAndDropDemo, message)

        const nextColumns = pipe(
          maybeOutMessage,
          Option.flatMap(outMessage =>
            M.value(outMessage).pipe(
              M.tagsExhaustive({
                Reordered: ({
                  itemId,
                  fromContainerId,
                  toContainerId,
                  toIndex,
                }) =>
                  Option.some(
                    reorderColumns(
                      model.dragAndDropDemoColumns,
                      itemId,
                      fromContainerId,
                      toContainerId,
                      toIndex,
                    ),
                  ),
                Cancelled: () => Option.none(),
              }),
            ),
          ),
          Option.getOrElse(() => model.dragAndDropDemoColumns),
        )

        return [
          evo(model, {
            dragAndDropDemo: () => nextDragAndDrop,
            dragAndDropDemoColumns: () => nextColumns,
          }),
          Command.mapMessages(dragAndDropCommands, message =>
            GotDragAndDropDemoMessage({ message }),
          ),
        ]
      },

      GotFileDropBasicDemoMessage: ({ message }) => {
        const [nextFileDrop, fileDropCommands, maybeOutMessage] =
          FileDrop.update(model.fileDropBasicDemo, message)

        const nextFiles = Option.match(maybeOutMessage, {
          onNone: () => model.fileDropBasicDemoFiles,
          onSome: M.type<FileDrop.OutMessage>().pipe(
            M.tagsExhaustive({
              ReceivedFiles: ({ files }) => [
                ...model.fileDropBasicDemoFiles,
                ...files,
              ],
              RejectedNonFiles: () => model.fileDropBasicDemoFiles,
            }),
          ),
        })

        return [
          evo(model, {
            fileDropBasicDemo: () => nextFileDrop,
            fileDropBasicDemoFiles: () => nextFiles,
          }),
          Command.mapMessages(fileDropCommands, message =>
            GotFileDropBasicDemoMessage({ message }),
          ),
        ]
      },

      ClickedRemoveFileDropDemoFile: ({ fileIndex }) => [
        evo(model, {
          fileDropBasicDemoFiles: () =>
            Array.remove(model.fileDropBasicDemoFiles, fileIndex),
        }),
        [],
      ],

      GotListboxDemoMessage: ({ message }) => {
        const [nextListboxDemo, listboxCommands] = ItemListbox.update(
          model.listboxDemo,
          message,
        )

        return [
          evo(model, {
            listboxDemo: () => nextListboxDemo,
          }),
          Command.mapMessages(listboxCommands, message =>
            GotListboxDemoMessage({ message }),
          ),
        ]
      },

      GotListboxMultiDemoMessage: ({ message }) => {
        const [nextListboxMultiDemo, listboxMultiCommands] =
          ItemMultiListbox.update(model.listboxMultiDemo, message)

        return [
          evo(model, {
            listboxMultiDemo: () => nextListboxMultiDemo,
          }),
          Command.mapMessages(listboxMultiCommands, message =>
            GotListboxMultiDemoMessage({ message }),
          ),
        ]
      },

      GotListboxGroupedDemoMessage: ({ message }) => {
        const [nextListboxGroupedDemo, listboxGroupedCommands] =
          CharacterListbox.update(model.listboxGroupedDemo, message)

        return [
          evo(model, {
            listboxGroupedDemo: () => nextListboxGroupedDemo,
          }),
          Command.mapMessages(listboxGroupedCommands, message =>
            GotListboxGroupedDemoMessage({ message }),
          ),
        ]
      },

      GotMenuBasicDemoMessage: ({ message }) => {
        const [nextMenuBasicDemo, menuBasicCommands] = DemoMenu.update(
          model.menuBasicDemo,
          message,
        )

        return [
          evo(model, {
            menuBasicDemo: () => nextMenuBasicDemo,
          }),
          Command.mapMessages(menuBasicCommands, message =>
            GotMenuBasicDemoMessage({ message }),
          ),
        ]
      },

      GotMenuAnimatedDemoMessage: ({ message }) => {
        const [nextMenuAnimatedDemo, menuAnimatedCommands] = DemoMenu.update(
          model.menuAnimatedDemo,
          message,
        )

        return [
          evo(model, {
            menuAnimatedDemo: () => nextMenuAnimatedDemo,
          }),
          Command.mapMessages(menuAnimatedCommands, message =>
            GotMenuAnimatedDemoMessage({ message }),
          ),
        ]
      },

      GotPopoverBasicDemoMessage: ({ message }) => {
        const [nextPopoverBasicDemo, popoverBasicCommands] = Popover.update(
          model.popoverBasicDemo,
          message,
        )

        return [
          evo(model, {
            popoverBasicDemo: () => nextPopoverBasicDemo,
          }),
          Command.mapMessages(popoverBasicCommands, message =>
            GotPopoverBasicDemoMessage({ message }),
          ),
        ]
      },

      GotPopoverAnimatedDemoMessage: ({ message }) => {
        const [nextPopoverAnimatedDemo, popoverAnimatedCommands] =
          Popover.update(model.popoverAnimatedDemo, message)

        return [
          evo(model, {
            popoverAnimatedDemo: () => nextPopoverAnimatedDemo,
          }),
          Command.mapMessages(popoverAnimatedCommands, message =>
            GotPopoverAnimatedDemoMessage({ message }),
          ),
        ]
      },

      GotPopoverNestedParentDemoMessage: ({ message }) => {
        const [nextPopoverNestedParentDemo, popoverNestedParentCommands] =
          Popover.update(model.popoverNestedParentDemo, message)

        return [
          evo(model, {
            popoverNestedParentDemo: () => nextPopoverNestedParentDemo,
          }),
          Command.mapMessages(popoverNestedParentCommands, message =>
            GotPopoverNestedParentDemoMessage({ message }),
          ),
        ]
      },

      GotPopoverNestedChildDemoMessage: ({ message }) => {
        const [nextPopoverNestedChildDemo, popoverNestedChildCommands] =
          Popover.update(model.popoverNestedChildDemo, message)

        return [
          evo(model, {
            popoverNestedChildDemo: () => nextPopoverNestedChildDemo,
          }),
          Command.mapMessages(popoverNestedChildCommands, message =>
            GotPopoverNestedChildDemoMessage({ message }),
          ),
        ]
      },

      SelectedVerticalPlan: ({ plan }) => [
        evo(model, {
          verticalRadioGroupDemoValue: () => Option.some(plan),
        }),
        [],
      ],

      SelectedHorizontalPlan: ({ plan }) => [
        evo(model, {
          horizontalRadioGroupDemoValue: () => Option.some(plan),
        }),
        [],
      ],

      GotSliderRatingDemoMessage: ({ message }) => {
        const [nextSliderRatingDemo, sliderRatingCommands, maybeOutMessage] =
          Slider.update(model.sliderRatingDemo, message)

        const nextModel = Option.match(maybeOutMessage, {
          onNone: () => model,
          onSome: ({ value }) => evo(model, { sliderRatingValue: () => value }),
        })

        return [
          evo(nextModel, {
            sliderRatingDemo: () => nextSliderRatingDemo,
          }),
          Command.mapMessages(sliderRatingCommands, message =>
            GotSliderRatingDemoMessage({ message }),
          ),
        ]
      },

      GotSliderVolumeDemoMessage: ({ message }) => {
        const [nextSliderVolumeDemo, sliderVolumeCommands, maybeOutMessage] =
          Slider.update(model.sliderVolumeDemo, message)

        const nextModel = Option.match(maybeOutMessage, {
          onNone: () => model,
          onSome: ({ value }) => evo(model, { sliderVolumeValue: () => value }),
        })

        return [
          evo(nextModel, {
            sliderVolumeDemo: () => nextSliderVolumeDemo,
          }),
          Command.mapMessages(sliderVolumeCommands, message =>
            GotSliderVolumeDemoMessage({ message }),
          ),
        ]
      },

      ToggledSwitchDemo: ({ isChecked }) => [
        evo(model, {
          switchDemo: () => isChecked,
        }),
        [],
      ],

      GotHorizontalTabsDemoMessage: ({ message }) => {
        const [
          nextHorizontalTabsDemo,
          horizontalTabsCommands,
          maybeOutMessage,
        ] = DemoTabs.update(model.horizontalTabsDemo, message)

        const nextModel = Option.match(maybeOutMessage, {
          onNone: () => model,
          onSome: ({ value }) =>
            evo(model, { horizontalTabsDemoValue: () => value }),
        })

        return [
          evo(nextModel, {
            horizontalTabsDemo: () => nextHorizontalTabsDemo,
          }),
          Command.mapMessages(horizontalTabsCommands, message =>
            GotHorizontalTabsDemoMessage({ message }),
          ),
        ]
      },

      GotVerticalTabsDemoMessage: ({ message }) => {
        const [nextVerticalTabsDemo, verticalTabsCommands, maybeOutMessage] =
          DemoTabs.update(model.verticalTabsDemo, message)

        const nextModel = Option.match(maybeOutMessage, {
          onNone: () => model,
          onSome: ({ value }) =>
            evo(model, { verticalTabsDemoValue: () => value }),
        })

        return [
          evo(nextModel, {
            verticalTabsDemo: () => nextVerticalTabsDemo,
          }),
          Command.mapMessages(verticalTabsCommands, message =>
            GotVerticalTabsDemoMessage({ message }),
          ),
        ]
      },

      GotToastDemoMessage: ({ message }) => {
        const [nextToastDemo, toastCommands] = Toast.update(
          model.toastDemo,
          message,
        )

        return [
          evo(model, { toastDemo: () => nextToastDemo }),
          Command.mapMessages(toastCommands, message =>
            GotToastDemoMessage({ message }),
          ),
        ]
      },

      ClickedShowInfoToast: () => {
        const [nextToastDemo, toastCommands] = Toast.show(model.toastDemo, {
          variant: 'Info',
          payload: {
            title: 'Changes saved',
            maybeDescription: Option.some(
              'Your preferences have been updated.',
            ),
          },
        })

        return [
          evo(model, { toastDemo: () => nextToastDemo }),
          Command.mapMessages(toastCommands, message =>
            GotToastDemoMessage({ message }),
          ),
        ]
      },

      ClickedShowSuccessToast: () => {
        const [nextToastDemo, toastCommands] = Toast.show(model.toastDemo, {
          variant: 'Success',
          payload: {
            title: 'Uploaded successfully',
            maybeDescription: Option.some('kit-manual.pdf is now available.'),
          },
        })

        return [
          evo(model, { toastDemo: () => nextToastDemo }),
          Command.mapMessages(toastCommands, message =>
            GotToastDemoMessage({ message }),
          ),
        ]
      },

      ClickedShowWarningToast: () => {
        const [nextToastDemo, toastCommands] = Toast.show(model.toastDemo, {
          variant: 'Warning',
          payload: {
            title: 'Network slow',
            maybeDescription: Option.some(
              'Some assets are loading over a weak connection.',
            ),
          },
        })

        return [
          evo(model, { toastDemo: () => nextToastDemo }),
          Command.mapMessages(toastCommands, message =>
            GotToastDemoMessage({ message }),
          ),
        ]
      },

      ClickedShowErrorToast: () => {
        const [nextToastDemo, toastCommands] = Toast.show(model.toastDemo, {
          variant: 'Error',
          payload: {
            title: 'Failed to save',
            maybeDescription: Option.some(
              'Check your connection and try again.',
            ),
          },
        })

        return [
          evo(model, { toastDemo: () => nextToastDemo }),
          Command.mapMessages(toastCommands, message =>
            GotToastDemoMessage({ message }),
          ),
        ]
      },

      ClickedShowStickyToast: () => {
        const [nextToastDemo, toastCommands] = Toast.show(model.toastDemo, {
          variant: 'Info',
          payload: {
            title: 'Review pending',
            maybeDescription: Option.some(
              'Action required. This stays until dismissed.',
            ),
          },
          sticky: true,
        })

        return [
          evo(model, { toastDemo: () => nextToastDemo }),
          Command.mapMessages(toastCommands, message =>
            GotToastDemoMessage({ message }),
          ),
        ]
      },

      ClickedDismissAllToasts: () => {
        const [nextToastDemo, toastCommands] = Toast.dismissAll(model.toastDemo)

        return [
          evo(model, { toastDemo: () => nextToastDemo }),
          Command.mapMessages(toastCommands, message =>
            GotToastDemoMessage({ message }),
          ),
        ]
      },

      GotTooltipBasicDemoMessage: ({ message }) => {
        const [nextTooltipBasicDemo, tooltipBasicCommands] = Tooltip.update(
          model.tooltipBasicDemo,
          message,
        )

        return [
          evo(model, {
            tooltipBasicDemo: () => nextTooltipBasicDemo,
          }),
          Command.mapMessages(tooltipBasicCommands, message =>
            GotTooltipBasicDemoMessage({ message }),
          ),
        ]
      },

      GotTooltipNoDelayDemoMessage: ({ message }) => {
        const [nextTooltipNoDelayDemo, tooltipNoDelayCommands] = Tooltip.update(
          model.tooltipNoDelayDemo,
          message,
        )

        return [
          evo(model, {
            tooltipNoDelayDemo: () => nextTooltipNoDelayDemo,
          }),
          Command.mapMessages(tooltipNoDelayCommands, message =>
            GotTooltipNoDelayDemoMessage({ message }),
          ),
        ]
      },

      GotAnimationDemoMessage: ({ message }) => {
        const [nextAnimationDemo, commands] = delegateToAnimationDemo(
          model.animationDemo,
          message,
        )

        return [
          evo(model, { animationDemo: () => nextAnimationDemo }),
          commands,
        ]
      },

      ToggledAnimationDemo: () => {
        const nextShowing = !model.isAnimationDemoShowing
        const [nextAnimationDemo, commands] = delegateToAnimationDemo(
          model.animationDemo,
          nextShowing ? Animation.Showed() : Animation.Hid(),
        )

        return [
          evo(model, {
            isAnimationDemoShowing: () => nextShowing,
            animationDemo: () => nextAnimationDemo,
          }),
          commands,
        ]
      },

      GotVirtualListDemoMessage: ({ message }) => {
        const [nextVirtualListDemo, virtualListCommands] = VirtualList.update(
          model.virtualListDemo,
          message,
        )

        return [
          evo(model, { virtualListDemo: () => nextVirtualListDemo }),
          Command.mapMessages(virtualListCommands, message =>
            GotVirtualListDemoMessage({ message }),
          ),
        ]
      },

      ClickedVirtualListScrollToMiddle: () => {
        const [nextVirtualListDemo, virtualListCommands] =
          VirtualList.scrollToIndex(
            model.virtualListDemo,
            Math.floor(VIRTUAL_LIST_ROW_COUNT / 2),
          )

        return [
          evo(model, { virtualListDemo: () => nextVirtualListDemo }),
          Command.mapMessages(virtualListCommands, message =>
            GotVirtualListDemoMessage({ message }),
          ),
        ]
      },

      GotVirtualListVariableDemoMessage: ({ message }) => {
        const [nextVirtualListVariableDemo, virtualListCommands] =
          VirtualList.update(model.virtualListVariableDemo, message)

        return [
          evo(model, {
            virtualListVariableDemo: () => nextVirtualListVariableDemo,
          }),
          Command.mapMessages(virtualListCommands, message =>
            GotVirtualListVariableDemoMessage({ message }),
          ),
        ]
      },

      ClickedVirtualListVariableScrollToMiddle: () => {
        const [nextVirtualListVariableDemo, virtualListCommands] =
          VirtualList.scrollToIndexVariable(
            model.virtualListVariableDemo,
            variableActivities,
            variableRowHeightPx,
            Math.floor(VIRTUAL_LIST_ROW_COUNT / 2),
          )

        return [
          evo(model, {
            virtualListVariableDemo: () => nextVirtualListVariableDemo,
          }),
          Command.mapMessages(virtualListCommands, message =>
            GotVirtualListVariableDemoMessage({ message }),
          ),
        ]
      },
    }),
  )
