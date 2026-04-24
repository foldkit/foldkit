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
  GotPopoverAnimatedDemoMessage,
  GotPopoverBasicDemoMessage,
  GotSliderPainDemoMessage,
  GotSliderVolumeDemoMessage,
  GotSwitchDemoMessage,
  GotToastDemoMessage,
  GotTooltipDemoMessage,
  GotVerticalRadioGroupDemoMessage,
  GotVerticalTabsDemoMessage,
  type Message,
} from './message'
import type { Model } from './model'
import type { DemoCard, DemoColumn } from './model'
import { Toast } from './toastModule'

// REORDER

const reorderColumns = (
  columns: ReadonlyArray<typeof DemoColumn.Type>,
  itemId: string,
  fromContainerId: string,
  toContainerId: string,
  toIndex: number,
): ReadonlyArray<typeof DemoColumn.Type> => {
  const maybeCard: Option.Option<typeof DemoCard.Type> = pipe(
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

        const inserted = pipe(withRemoved, cards => [
          ...Array.take(cards, toIndex),
          card,
          ...Array.drop(cards, toIndex),
        ])

        return evo(column, { cards: () => inserted })
      }),
  })
}

export type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const delegateToAnimationDemo = (
  animationModel: Ui.Animation.Model,
  message: Ui.Animation.Message,
): readonly [Ui.Animation.Model, ReadonlyArray<Command.Command<Message>>] => {
  const [nextAnimation, animationCommands, maybeOutMessage] =
    Ui.Animation.update(animationModel, message)

  const toMessage = (animationMessage: Ui.Animation.Message): Message =>
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

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
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

      GotSliderPainDemoMessage: ({ message }) => {
        const [nextSliderPainDemo, sliderPainCommands] = Ui.Slider.update(
          model.sliderPainDemo,
          message,
        )

        return [
          evo(model, {
            sliderPainDemo: () => nextSliderPainDemo,
          }),
          sliderPainCommands.map(
            Command.mapEffect(
              Effect.map(message => GotSliderPainDemoMessage({ message })),
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

      GotTooltipDemoMessage: ({ message }) => {
        const [nextTooltipDemo, tooltipCommands] = Ui.Tooltip.update(
          model.tooltipDemo,
          message,
        )

        return [
          evo(model, {
            tooltipDemo: () => nextTooltipDemo,
          }),
          tooltipCommands.map(
            Command.mapEffect(
              Effect.map(message => GotTooltipDemoMessage({ message })),
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
            title: 'Preferences updated',
            maybeDescription: Option.some('Your changes are saved.'),
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
            title: 'Uploaded',
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

      ClickedShowErrorToast: () => {
        const [nextToastDemo, toastCommands] = Toast.show(model.toastDemo, {
          variant: 'Error',
          payload: {
            title: 'Save failed',
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
            title: 'Action required',
            maybeDescription: Option.some('Stays visible until dismissed.'),
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

      GotFileDropBasicDemoMessage: ({ message }) => {
        const [nextFileDrop, commands, maybeOutMessage] = Ui.FileDrop.update(
          model.fileDropBasicDemo,
          message,
        )
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
          commands.map(
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
    }),
  )
