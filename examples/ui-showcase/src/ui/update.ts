import { Array, Effect, Match as M, Number, Option, pipe } from 'effect'
import { Command, Ui } from 'foldkit'
import { evo } from 'foldkit/struct'

import {
  GotAnimationDemoMessage,
  GotCalendarBasicDemoMessage,
  GotCheckboxBasicDemoMessage,
  GotCheckboxOptionADemoMessage,
  GotCheckboxOptionBDemoMessage,
  GotComboboxDemoMessage,
  GotComboboxMultiDemoMessage,
  GotComboboxNullableDemoMessage,
  GotComboboxSelectOnFocusDemoMessage,
  GotDatePickerBasicDemoMessage,
  GotDialogAnimatedDemoMessage,
  GotDialogDemoMessage,
  GotDisclosureDemoMessage,
  GotDragAndDropDemoMessage,
  GotFieldsetCheckboxDemoMessage,
  GotFileDropBasicDemoMessage,
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
  GotSliderRatingDemoMessage,
  GotSliderVolumeDemoMessage,
  GotSwitchDemoMessage,
  GotToastDemoMessage,
  GotTooltipBasicDemoMessage,
  GotTooltipNoDelayDemoMessage,
  GotVerticalRadioGroupDemoMessage,
  GotVerticalTabsDemoMessage,
  GotVirtualListDemoMessage,
  GotVirtualListVariableDemoMessage,
  type UiMessage,
} from './message'
import type { DemoColumn, UiModel } from './model'
import { Toast } from './toast'
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

const delegateToAnimationDemo = (
  animationModel: Ui.Animation.Model,
  message: Ui.Animation.Message,
): readonly [Ui.Animation.Model, ReadonlyArray<Command.Command<UiMessage>>] => {
  const [nextAnimation, animationCommands, maybeOutMessage] =
    Ui.Animation.update(animationModel, message)

  const toMessage = (animationMessage: Ui.Animation.Message): UiMessage =>
    GotAnimationDemoMessage({ message: animationMessage })

  const mappedCommands = animationCommands.map(
    Command.mapEffect(Effect.map(toMessage)),
  )

  const additionalCommands = Option.match(maybeOutMessage, {
    onNone: () => [],
    onSome: M.type<Ui.Animation.OutMessage>().pipe(
      M.tagsExhaustive({
        StartedLeaveAnimating: () => [
          Command.mapEffect(
            Ui.Animation.defaultLeaveCommand(nextAnimation),
            Effect.map(toMessage),
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

      GotCalendarBasicDemoMessage: ({ message }) => {
        const [nextCalendarBasicDemo, calendarBasicCommands] =
          Ui.Calendar.update(model.calendarBasicDemo, message)

        return [
          evo(model, {
            calendarBasicDemo: () => nextCalendarBasicDemo,
          }),
          calendarBasicCommands.map(
            Command.mapEffect(
              Effect.map(message => GotCalendarBasicDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotDatePickerBasicDemoMessage: ({ message }) => {
        const [nextDatePickerBasicDemo, datePickerBasicCommands] =
          Ui.DatePicker.update(model.datePickerBasicDemo, message)

        return [
          evo(model, {
            datePickerBasicDemo: () => nextDatePickerBasicDemo,
          }),
          datePickerBasicCommands.map(
            Command.mapEffect(
              Effect.map(message => GotDatePickerBasicDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotDragAndDropDemoMessage: ({ message }) => {
        const [nextDragAndDrop, dragAndDropCommands, maybeOutMessage] =
          Ui.DragAndDrop.update(model.dragAndDropDemo, message)

        const nextColumns = pipe(
          maybeOutMessage,
          Option.flatMap(outMessage =>
            M.value(outMessage).pipe(
              M.tag(
                'Reordered',
                ({ itemId, fromContainerId, toContainerId, toIndex }) =>
                  Option.some(
                    reorderColumns(
                      model.dragAndDropDemoColumns,
                      itemId,
                      fromContainerId,
                      toContainerId,
                      toIndex,
                    ),
                  ),
              ),
              M.orElse(() => Option.none()),
            ),
          ),
          Option.getOrElse(() => model.dragAndDropDemoColumns),
        )

        return [
          evo(model, {
            dragAndDropDemo: () => nextDragAndDrop,
            dragAndDropDemoColumns: () => nextColumns,
          }),
          dragAndDropCommands.map(
            Command.mapEffect(
              Effect.map(message => GotDragAndDropDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotFileDropBasicDemoMessage: ({ message }) => {
        const [nextFileDrop, fileDropCommands, maybeOutMessage] =
          Ui.FileDrop.update(model.fileDropBasicDemo, message)

        const nextFiles = Option.match(maybeOutMessage, {
          onNone: () => model.fileDropBasicDemoFiles,
          onSome: M.type<Ui.FileDrop.OutMessage>().pipe(
            M.tagsExhaustive({
              ReceivedFiles: ({ files }) => [
                ...model.fileDropBasicDemoFiles,
                ...files,
              ],
              DroppedWithoutFiles: () => model.fileDropBasicDemoFiles,
            }),
          ),
        })

        return [
          evo(model, {
            fileDropBasicDemo: () => nextFileDrop,
            fileDropBasicDemoFiles: () => nextFiles,
          }),
          fileDropCommands.map(
            Command.mapEffect(
              Effect.map(message => GotFileDropBasicDemoMessage({ message })),
            ),
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

      GotSliderRatingDemoMessage: ({ message }) => {
        const [nextSliderRatingDemo, sliderRatingCommands] = Ui.Slider.update(
          model.sliderRatingDemo,
          message,
        )

        return [
          evo(model, {
            sliderRatingDemo: () => nextSliderRatingDemo,
          }),
          sliderRatingCommands.map(
            Command.mapEffect(
              Effect.map(message => GotSliderRatingDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotSliderVolumeDemoMessage: ({ message }) => {
        const [nextSliderVolumeDemo, sliderVolumeCommands] = Ui.Slider.update(
          model.sliderVolumeDemo,
          message,
        )

        return [
          evo(model, {
            sliderVolumeDemo: () => nextSliderVolumeDemo,
          }),
          sliderVolumeCommands.map(
            Command.mapEffect(
              Effect.map(message => GotSliderVolumeDemoMessage({ message })),
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

      GotToastDemoMessage: ({ message }) => {
        const [nextToastDemo, toastCommands] = Toast.update(
          model.toastDemo,
          message,
        )

        return [
          evo(model, { toastDemo: () => nextToastDemo }),
          toastCommands.map(
            Command.mapEffect(
              Effect.map(message => GotToastDemoMessage({ message })),
            ),
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
          toastCommands.map(
            Command.mapEffect(
              Effect.map(message => GotToastDemoMessage({ message })),
            ),
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
          toastCommands.map(
            Command.mapEffect(
              Effect.map(message => GotToastDemoMessage({ message })),
            ),
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
          toastCommands.map(
            Command.mapEffect(
              Effect.map(message => GotToastDemoMessage({ message })),
            ),
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
          toastCommands.map(
            Command.mapEffect(
              Effect.map(message => GotToastDemoMessage({ message })),
            ),
          ),
        ]
      },

      ClickedShowStickyToast: () => {
        const [nextToastDemo, toastCommands] = Toast.show(model.toastDemo, {
          variant: 'Info',
          payload: {
            title: 'Review pending',
            maybeDescription: Option.some(
              'Action required — this stays until dismissed.',
            ),
          },
          sticky: true,
        })

        return [
          evo(model, { toastDemo: () => nextToastDemo }),
          toastCommands.map(
            Command.mapEffect(
              Effect.map(message => GotToastDemoMessage({ message })),
            ),
          ),
        ]
      },

      ClickedDismissAllToasts: () => {
        const [nextToastDemo, toastCommands] = Toast.dismissAll(model.toastDemo)

        return [
          evo(model, { toastDemo: () => nextToastDemo }),
          toastCommands.map(
            Command.mapEffect(
              Effect.map(message => GotToastDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotTooltipBasicDemoMessage: ({ message }) => {
        const [nextTooltipBasicDemo, tooltipBasicCommands] = Ui.Tooltip.update(
          model.tooltipBasicDemo,
          message,
        )

        return [
          evo(model, {
            tooltipBasicDemo: () => nextTooltipBasicDemo,
          }),
          tooltipBasicCommands.map(
            Command.mapEffect(
              Effect.map(message => GotTooltipBasicDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotTooltipNoDelayDemoMessage: ({ message }) => {
        const [nextTooltipNoDelayDemo, tooltipNoDelayCommands] =
          Ui.Tooltip.update(model.tooltipNoDelayDemo, message)

        return [
          evo(model, {
            tooltipNoDelayDemo: () => nextTooltipNoDelayDemo,
          }),
          tooltipNoDelayCommands.map(
            Command.mapEffect(
              Effect.map(message => GotTooltipNoDelayDemoMessage({ message })),
            ),
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
          nextShowing ? Ui.Animation.Showed() : Ui.Animation.Hid(),
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
        const [nextVirtualListDemo, virtualListCommands] =
          Ui.VirtualList.update(model.virtualListDemo, message)

        return [
          evo(model, { virtualListDemo: () => nextVirtualListDemo }),
          virtualListCommands.map(
            Command.mapEffect(
              Effect.map(message => GotVirtualListDemoMessage({ message })),
            ),
          ),
        ]
      },

      ClickedVirtualListScrollToMiddle: () => {
        const [nextVirtualListDemo, virtualListCommands] =
          Ui.VirtualList.scrollToIndex(
            model.virtualListDemo,
            Math.floor(VIRTUAL_LIST_ROW_COUNT / 2),
          )

        return [
          evo(model, { virtualListDemo: () => nextVirtualListDemo }),
          virtualListCommands.map(
            Command.mapEffect(
              Effect.map(message => GotVirtualListDemoMessage({ message })),
            ),
          ),
        ]
      },

      GotVirtualListVariableDemoMessage: ({ message }) => {
        const [nextVirtualListVariableDemo, virtualListCommands] =
          Ui.VirtualList.update(model.virtualListVariableDemo, message)

        return [
          evo(model, {
            virtualListVariableDemo: () => nextVirtualListVariableDemo,
          }),
          virtualListCommands.map(
            Command.mapEffect(
              Effect.map(message =>
                GotVirtualListVariableDemoMessage({ message }),
              ),
            ),
          ),
        ]
      },

      ClickedVirtualListVariableScrollToMiddle: () => {
        const [nextVirtualListVariableDemo, virtualListCommands] =
          Ui.VirtualList.scrollToIndexVariable(
            model.virtualListVariableDemo,
            variableActivities,
            variableRowHeightPx,
            Math.floor(VIRTUAL_LIST_ROW_COUNT / 2),
          )

        return [
          evo(model, {
            virtualListVariableDemo: () => nextVirtualListVariableDemo,
          }),
          virtualListCommands.map(
            Command.mapEffect(
              Effect.map(message =>
                GotVirtualListVariableDemoMessage({ message }),
              ),
            ),
          ),
        ]
      },
    }),
  )
