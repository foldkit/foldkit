import { Array, Match as M, Number, Option, pipe } from 'effect'
import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

import {
  Animation,
  Calendar,
  Combobox,
  DatePicker,
  Dialog,
  DragAndDrop,
  FileDrop,
  Listbox,
  Popover,
  Slider,
  Tabs,
  Tooltip,
  VirtualList,
} from '@foldkit/ui'

import { CityCombobox, CityMultiCombobox } from './combobox'
import { CharacterListbox, ItemListbox, ItemMultiListbox } from './listbox'
import { DemoMenu } from './menu'
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
  GotTooltipDemoMessage,
  GotVerticalTabsDemoMessage,
  GotVirtualListDemoMessage,
  GotVirtualListVariableDemoMessage,
  type Message,
} from './message'
import type { Model } from './model'
import type { City, DemoCard, DemoColumn, DemoTab, ListboxItem } from './model'
import { DemoTabs } from './tabs'
import { Toast } from './toastModule'
import {
  ROW_COUNT as VIRTUAL_LIST_ROW_COUNT,
  variableActivities,
  variableRowHeightPx,
} from './virtualList'

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
  animationModel: Animation.Model,
  message: Animation.Message,
): readonly [Animation.Model, ReadonlyArray<Command.Command<Message>>] => {
  const [nextAnimation, animationCommands, maybeOutMessage] = Animation.update(
    animationModel,
    message,
  )

  const toMessage = (animationMessage: Animation.Message): Message =>
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

      ToggledFieldsetCheckboxDemo: ({ isChecked }) => [
        evo(model, { isFieldsetCheckboxDemoChecked: () => isChecked }),
        [],
      ],

      ClickedButtonDemo: () => [
        evo(model, {
          buttonClickCount: Number.increment,
        }),
        [],
      ],

      GotCalendarBasicDemoMessage: ({ message }) => {
        const [nextCalendarBasicDemo, calendarBasicCommands, maybeOutMessage] =
          Calendar.update(model.calendarBasicDemo, message)

        const nextMaybeCalendarBasicDemoSelectedDate = Option.match(
          maybeOutMessage,
          {
            onNone: () => model.maybeCalendarBasicDemoSelectedDate,
            onSome: M.type<Calendar.OutMessage>().pipe(
              M.tagsExhaustive({
                SelectedDate: ({ date }) => Option.some(date),
                ChangedViewMonth: () =>
                  model.maybeCalendarBasicDemoSelectedDate,
              }),
            ),
          },
        )

        return [
          evo(model, {
            calendarBasicDemo: () => nextCalendarBasicDemo,
            maybeCalendarBasicDemoSelectedDate: () =>
              nextMaybeCalendarBasicDemoSelectedDate,
          }),
          Command.mapMessages(calendarBasicCommands, message =>
            GotCalendarBasicDemoMessage({ message }),
          ),
        ]
      },

      GotDatePickerBasicDemoMessage: ({ message }) => {
        const [
          nextDatePickerBasicDemo,
          datePickerBasicCommands,
          maybeOutMessage,
        ] = DatePicker.update(model.datePickerBasicDemo, message)

        const nextMaybeDatePickerBasicDemoSelectedDate = Option.match(
          maybeOutMessage,
          {
            onNone: () => model.maybeDatePickerBasicDemoSelectedDate,
            onSome: M.type<DatePicker.OutMessage>().pipe(
              M.tagsExhaustive({
                SelectedDate: ({ date }) => Option.some(date),
                ClearedDate: () => Option.none(),
                ChangedViewMonth: () =>
                  model.maybeDatePickerBasicDemoSelectedDate,
              }),
            ),
          },
        )

        return [
          evo(model, {
            datePickerBasicDemo: () => nextDatePickerBasicDemo,
            maybeDatePickerBasicDemoSelectedDate: () =>
              nextMaybeDatePickerBasicDemoSelectedDate,
          }),
          Command.mapMessages(datePickerBasicCommands, message =>
            GotDatePickerBasicDemoMessage({ message }),
          ),
        ]
      },

      ToggledCheckboxBasicDemo: ({ isChecked }) => [
        evo(model, { isCheckboxBasicDemoChecked: () => isChecked }),
        [],
      ],

      ToggledCheckboxAllDemo: ({ isChecked }) => [
        evo(model, {
          isCheckboxOptionADemoChecked: () => isChecked,
          isCheckboxOptionBDemoChecked: () => isChecked,
        }),
        [],
      ],

      ToggledCheckboxOptionADemo: ({ isChecked }) => [
        evo(model, { isCheckboxOptionADemoChecked: () => isChecked }),
        [],
      ],

      ToggledCheckboxOptionBDemo: ({ isChecked }) => [
        evo(model, { isCheckboxOptionBDemoChecked: () => isChecked }),
        [],
      ],

      GotComboboxDemoMessage: ({ message }) => {
        const [nextComboboxDemo, comboboxCommands, maybeOutMessage] =
          CityCombobox.update(model.comboboxDemo, message)

        const nextMaybeComboboxDemoSelectedCity = Option.match(
          maybeOutMessage,
          {
            onNone: () => model.maybeComboboxDemoSelectedCity,
            onSome: M.type<Combobox.OutMessage<City>>().pipe(
              M.tagsExhaustive({
                Selected: ({ value }) => Option.some(value),
                ClearedSelection: () => model.maybeComboboxDemoSelectedCity,
              }),
            ),
          },
        )

        return [
          evo(model, {
            comboboxDemo: () => nextComboboxDemo,
            maybeComboboxDemoSelectedCity: () =>
              nextMaybeComboboxDemoSelectedCity,
          }),
          Command.mapMessages(comboboxCommands, message =>
            GotComboboxDemoMessage({ message }),
          ),
        ]
      },

      GotComboboxNullableDemoMessage: ({ message }) => {
        const [
          nextComboboxNullableDemo,
          comboboxNullableCommands,
          maybeOutMessage,
        ] = CityCombobox.update(model.comboboxNullableDemo, message)

        const nextMaybeComboboxNullableDemoSelectedCity = Option.match(
          maybeOutMessage,
          {
            onNone: () => model.maybeComboboxNullableDemoSelectedCity,
            onSome: M.type<Combobox.OutMessage<City>>().pipe(
              M.tagsExhaustive({
                Selected: ({ value }) =>
                  Option.contains(
                    model.maybeComboboxNullableDemoSelectedCity,
                    value,
                  )
                    ? Option.none()
                    : Option.some(value),
                ClearedSelection: () => Option.none(),
              }),
            ),
          },
        )

        return [
          evo(model, {
            comboboxNullableDemo: () => nextComboboxNullableDemo,
            maybeComboboxNullableDemoSelectedCity: () =>
              nextMaybeComboboxNullableDemoSelectedCity,
          }),
          Command.mapMessages(comboboxNullableCommands, message =>
            GotComboboxNullableDemoMessage({ message }),
          ),
        ]
      },

      GotComboboxMultiDemoMessage: ({ message }) => {
        const [nextComboboxMultiDemo, comboboxMultiCommands, maybeOutMessage] =
          CityMultiCombobox.update(model.comboboxMultiDemo, message)

        const nextComboboxMultiDemoSelectedCities = Option.match(
          maybeOutMessage,
          {
            onNone: () => model.comboboxMultiDemoSelectedCities,
            onSome: M.type<Combobox.OutMessage<City>>().pipe(
              M.tagsExhaustive({
                Selected: ({ value }) =>
                  Array.contains(model.comboboxMultiDemoSelectedCities, value)
                    ? Array.filter(
                        model.comboboxMultiDemoSelectedCities,
                        city => city !== value,
                      )
                    : Array.append(
                        model.comboboxMultiDemoSelectedCities,
                        value,
                      ),
                ClearedSelection: () => model.comboboxMultiDemoSelectedCities,
              }),
            ),
          },
        )

        return [
          evo(model, {
            comboboxMultiDemo: () => nextComboboxMultiDemo,
            comboboxMultiDemoSelectedCities: () =>
              nextComboboxMultiDemoSelectedCities,
          }),
          Command.mapMessages(comboboxMultiCommands, message =>
            GotComboboxMultiDemoMessage({ message }),
          ),
        ]
      },

      GotComboboxSelectOnFocusDemoMessage: ({ message }) => {
        const [
          nextComboboxSelectOnFocusDemo,
          comboboxSelectOnFocusCommands,
          maybeOutMessage,
        ] = CityCombobox.update(model.comboboxSelectOnFocusDemo, message)

        const nextMaybeComboboxSelectOnFocusDemoSelectedCity = Option.match(
          maybeOutMessage,
          {
            onNone: () => model.maybeComboboxSelectOnFocusDemoSelectedCity,
            onSome: M.type<Combobox.OutMessage<City>>().pipe(
              M.tagsExhaustive({
                Selected: ({ value }) => Option.some(value),
                ClearedSelection: () =>
                  model.maybeComboboxSelectOnFocusDemoSelectedCity,
              }),
            ),
          },
        )

        return [
          evo(model, {
            comboboxSelectOnFocusDemo: () => nextComboboxSelectOnFocusDemo,
            maybeComboboxSelectOnFocusDemoSelectedCity: () =>
              nextMaybeComboboxSelectOnFocusDemoSelectedCity,
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
        const [
          nextOverlayComboboxDemo,
          overlayComboboxCommands,
          maybeOutMessage,
        ] = CityCombobox.update(model.overlayComboboxDemo, message)

        const nextMaybeOverlayComboboxDemoSelectedCity = Option.match(
          maybeOutMessage,
          {
            onNone: () => model.maybeOverlayComboboxDemoSelectedCity,
            onSome: M.type<Combobox.OutMessage<City>>().pipe(
              M.tagsExhaustive({
                Selected: ({ value }) => Option.some(value),
                ClearedSelection: () =>
                  model.maybeOverlayComboboxDemoSelectedCity,
              }),
            ),
          },
        )

        return [
          evo(model, {
            overlayComboboxDemo: () => nextOverlayComboboxDemo,
            maybeOverlayComboboxDemoSelectedCity: () =>
              nextMaybeOverlayComboboxDemoSelectedCity,
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

      ToggledDisclosureDemo: ({ isOpen }) => [
        evo(model, { isDisclosureDemoOpen: () => isOpen }),
        [],
      ],

      GotListboxDemoMessage: ({ message }) => {
        const [nextListboxDemo, listboxCommands, maybeOutMessage] =
          ItemListbox.update(model.listboxDemo, message)

        const nextMaybeListboxDemoSelectedItem = Option.match(maybeOutMessage, {
          onNone: () => model.maybeListboxDemoSelectedItem,
          onSome: M.type<Listbox.OutMessage<ListboxItem>>().pipe(
            M.tagsExhaustive({
              Selected: ({ value }) => Option.some(value),
            }),
          ),
        })

        return [
          evo(model, {
            listboxDemo: () => nextListboxDemo,
            maybeListboxDemoSelectedItem: () =>
              nextMaybeListboxDemoSelectedItem,
          }),
          Command.mapMessages(listboxCommands, message =>
            GotListboxDemoMessage({ message }),
          ),
        ]
      },

      GotListboxMultiDemoMessage: ({ message }) => {
        const [nextListboxMultiDemo, listboxMultiCommands, maybeOutMessage] =
          ItemMultiListbox.update(model.listboxMultiDemo, message)

        const nextListboxMultiDemoSelectedItems = Option.match(
          maybeOutMessage,
          {
            onNone: () => model.listboxMultiDemoSelectedItems,
            onSome: M.type<Listbox.OutMessage<ListboxItem>>().pipe(
              M.tagsExhaustive({
                Selected: ({ value }) =>
                  Array.contains(model.listboxMultiDemoSelectedItems, value)
                    ? Array.filter(
                        model.listboxMultiDemoSelectedItems,
                        item => item !== value,
                      )
                    : Array.append(model.listboxMultiDemoSelectedItems, value),
              }),
            ),
          },
        )

        return [
          evo(model, {
            listboxMultiDemo: () => nextListboxMultiDemo,
            listboxMultiDemoSelectedItems: () =>
              nextListboxMultiDemoSelectedItems,
          }),
          Command.mapMessages(listboxMultiCommands, message =>
            GotListboxMultiDemoMessage({ message }),
          ),
        ]
      },

      GotListboxGroupedDemoMessage: ({ message }) => {
        const [
          nextListboxGroupedDemo,
          listboxGroupedCommands,
          maybeOutMessage,
        ] = CharacterListbox.update(model.listboxGroupedDemo, message)

        const nextMaybeListboxGroupedDemoSelectedItem = Option.match(
          maybeOutMessage,
          {
            onNone: () => model.maybeListboxGroupedDemoSelectedItem,
            onSome: M.type<Listbox.OutMessage>().pipe(
              M.tagsExhaustive({
                Selected: ({ value }) => Option.some(value),
              }),
            ),
          },
        )

        return [
          evo(model, {
            listboxGroupedDemo: () => nextListboxGroupedDemo,
            maybeListboxGroupedDemoSelectedItem: () =>
              nextMaybeListboxGroupedDemoSelectedItem,
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

        const nextSliderRatingValue = Option.match(maybeOutMessage, {
          onNone: () => model.sliderRatingValue,
          onSome: M.type<Slider.OutMessage>().pipe(
            M.tagsExhaustive({
              ChangedValue: ({ value }) => value,
            }),
          ),
        })

        return [
          evo(model, {
            sliderRatingDemo: () => nextSliderRatingDemo,
            sliderRatingValue: () => nextSliderRatingValue,
          }),
          Command.mapMessages(sliderRatingCommands, message =>
            GotSliderRatingDemoMessage({ message }),
          ),
        ]
      },

      GotSliderVolumeDemoMessage: ({ message }) => {
        const [nextSliderVolumeDemo, sliderVolumeCommands, maybeOutMessage] =
          Slider.update(model.sliderVolumeDemo, message)

        const nextSliderVolumeValue = Option.match(maybeOutMessage, {
          onNone: () => model.sliderVolumeValue,
          onSome: M.type<Slider.OutMessage>().pipe(
            M.tagsExhaustive({
              ChangedValue: ({ value }) => value,
            }),
          ),
        })

        return [
          evo(model, {
            sliderVolumeDemo: () => nextSliderVolumeDemo,
            sliderVolumeValue: () => nextSliderVolumeValue,
          }),
          Command.mapMessages(sliderVolumeCommands, message =>
            GotSliderVolumeDemoMessage({ message }),
          ),
        ]
      },

      ToggledSwitchDemo: ({ isChecked }) => [
        evo(model, { isSwitchDemoChecked: () => isChecked }),
        [],
      ],

      GotHorizontalTabsDemoMessage: ({ message }) => {
        const [
          nextHorizontalTabsDemo,
          horizontalTabsCommands,
          maybeOutMessage,
        ] = DemoTabs.update(model.horizontalTabsDemo, message)

        const nextHorizontalTabsDemoTab = Option.match(maybeOutMessage, {
          onNone: () => model.horizontalTabsDemoTab,
          onSome: M.type<Tabs.OutMessage<DemoTab>>().pipe(
            M.tagsExhaustive({
              Selected: ({ value }) => value,
            }),
          ),
        })

        return [
          evo(model, {
            horizontalTabsDemo: () => nextHorizontalTabsDemo,
            horizontalTabsDemoTab: () => nextHorizontalTabsDemoTab,
          }),
          Command.mapMessages(horizontalTabsCommands, message =>
            GotHorizontalTabsDemoMessage({ message }),
          ),
        ]
      },

      GotVerticalTabsDemoMessage: ({ message }) => {
        const [nextVerticalTabsDemo, verticalTabsCommands, maybeOutMessage] =
          DemoTabs.update(model.verticalTabsDemo, message)

        const nextVerticalTabsDemoTab = Option.match(maybeOutMessage, {
          onNone: () => model.verticalTabsDemoTab,
          onSome: M.type<Tabs.OutMessage<DemoTab>>().pipe(
            M.tagsExhaustive({
              Selected: ({ value }) => value,
            }),
          ),
        })

        return [
          evo(model, {
            verticalTabsDemo: () => nextVerticalTabsDemo,
            verticalTabsDemoTab: () => nextVerticalTabsDemoTab,
          }),
          Command.mapMessages(verticalTabsCommands, message =>
            GotVerticalTabsDemoMessage({ message }),
          ),
        ]
      },

      GotTooltipDemoMessage: ({ message }) => {
        const [nextTooltipDemo, tooltipCommands] = Tooltip.update(
          model.tooltipDemo,
          message,
        )

        return [
          evo(model, {
            tooltipDemo: () => nextTooltipDemo,
          }),
          Command.mapMessages(tooltipCommands, message =>
            GotTooltipDemoMessage({ message }),
          ),
        ]
      },

      GotToastDemoMessage: ({ message }) => {
        const [nextToastDemo, toastCommands, maybeOutMessage] = Toast.update(
          model.toastDemo,
          message,
        )

        const mappedCommands = Command.mapMessages(toastCommands, message =>
          GotToastDemoMessage({ message }),
        )

        return Option.match(maybeOutMessage, {
          onNone: (): UpdateReturn => [
            evo(model, { toastDemo: () => nextToastDemo }),
            mappedCommands,
          ],
          onSome: M.type<typeof Toast.OutMessage.Type>().pipe(
            M.withReturnType<UpdateReturn>(),
            M.tagsExhaustive({
              DismissedToast: ({ payload }) => [
                evo(model, {
                  toastDemo: () => nextToastDemo,
                  maybeLastDismissedToastTitle: () =>
                    Option.some(payload.title),
                }),
                mappedCommands,
              ],
            }),
          ),
        })
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
          Command.mapMessages(toastCommands, message =>
            GotToastDemoMessage({ message }),
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
          Command.mapMessages(toastCommands, message =>
            GotToastDemoMessage({ message }),
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
          Command.mapMessages(toastCommands, message =>
            GotToastDemoMessage({ message }),
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
        const [nextFileDrop, commands, maybeOutMessage] = FileDrop.update(
          model.fileDropBasicDemo,
          message,
        )
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
          Command.mapMessages(commands, message =>
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

      GotDragAndDropDemoMessage: ({ message }) => {
        const [nextDragAndDrop, dragAndDropCommands, maybeOutMessage] =
          DragAndDrop.update(model.dragAndDropDemo, message)

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
          Command.mapMessages(dragAndDropCommands, message =>
            GotDragAndDropDemoMessage({ message }),
          ),
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
