import { Array, Effect, Match as M, Number, Option, pipe } from 'effect'
import { Command, Ui } from 'foldkit'
import { evo } from 'foldkit/struct'

import {
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
  GotHorizontalRadioGroupDemoMessage,
  GotHorizontalTabsDemoMessage,
  GotListboxDemoMessage,
  GotListboxGroupedDemoMessage,
  GotListboxMultiDemoMessage,
  GotMenuAnimatedDemoMessage,
  GotMenuBasicDemoMessage,
  GotPopoverAnimatedDemoMessage,
  GotPopoverBasicDemoMessage,
  GotSwitchDemoMessage,
  GotTransitionDemoMessage,
  GotVerticalRadioGroupDemoMessage,
  GotVerticalTabsDemoMessage,
  type Message,
} from './message'
import type { Model } from './model'
import type { DemoCard, DemoColumn } from './model'

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

const delegateToTransitionDemo = (
  transitionModel: Ui.Transition.Model,
  message: Ui.Transition.Message,
): readonly [Ui.Transition.Model, ReadonlyArray<Command.Command<Message>>] => {
  const [nextTransition, transitionCommands, maybeOutMessage] =
    Ui.Transition.update(transitionModel, message)

  const toMessage = (transitionMessage: Ui.Transition.Message): Message =>
    GotTransitionDemoMessage({ message: transitionMessage })

  const mappedCommands = transitionCommands.map(
    Command.mapEffect(Effect.map(toMessage)),
  )

  const additionalCommands = Option.match(maybeOutMessage, {
    onNone: () => [],
    onSome: M.type<Ui.Transition.OutMessage>().pipe(
      M.tagsExhaustive({
        StartedLeaveAnimating: () => [
          Command.mapEffect(
            Ui.Transition.defaultLeaveCommand(nextTransition),
            Effect.map(toMessage),
          ),
        ],
        TransitionedOut: () => [],
      }),
    ),
  })

  return [nextTransition, [...mappedCommands, ...additionalCommands]]
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
        const [nextTransitionDemo, commands] = delegateToTransitionDemo(
          model.transitionDemo,
          message,
        )

        return [
          evo(model, { transitionDemo: () => nextTransitionDemo }),
          commands,
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
    }),
  )
