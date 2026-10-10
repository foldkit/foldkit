import { Array, Number, Option, pipe } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import {
  Animation,
  Calendar,
  Combobox,
  DatePicker,
  Dialog,
  DragAndDrop,
  FileDrop,
  HoverIntent,
  Listbox,
  Menu,
  Popover,
  RadioGroup,
  Slider,
  Tabs,
  Tooltip,
  VirtualList,
} from '@foldkit/ui'

import { Message as UiMessage } from './message'
import type {
  City,
  DemoColumn,
  DemoTab,
  ListboxItem,
  Plan,
  UiModel,
} from './model'
import { Toast } from './toast'
import { CityCombobox, CityMultiCombobox } from './view/combobox'
import { CharacterListbox, ItemListbox, ItemMultiListbox } from './view/listbox'
import { PlanRadioGroup } from './view/radioGroup'
import { DemoTabs } from './view/tabs'
import { ROW_COUNT as VIRTUAL_LIST_ROW_COUNT } from './view/virtualList'

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
          return modifyFields(column, { cards: () => withRemoved })
        }

        const inserted = [
          ...Array.take(withRemoved, toIndex),
          card,
          ...Array.drop(withRemoved, toIndex),
        ]

        return modifyFields(column, { cards: () => inserted })
      }),
  })
}

const DemoMenu = Menu.create<string>()

const foldDialogOutMessage = (outMessage: typeof Dialog.OutMessage.Type) =>
  Dialog.OutMessage.match(outMessage, {
    Opened: () => Update.makeStep((model: UiModel) => ({ model })),
    Closed: () => Update.makeStep((model: UiModel) => ({ model })),
  })

const foldMenuOutMessage = (outMessage: Menu.OutMessage<string>) =>
  Menu.OutMessage.match(outMessage, {
    Selected: () => Update.makeStep((model: UiModel) => ({ model })),
  })

const foldPopoverOutMessage = (outMessage: typeof Popover.OutMessage.Type) =>
  Popover.OutMessage.match(outMessage, {
    Opened: () => Update.makeStep((model: UiModel) => ({ model })),
    Closed: () => Update.makeStep((model: UiModel) => ({ model })),
  })

const foldToastOutMessage = (outMessage: typeof Toast.OutMessage.Type) =>
  Toast.OutMessage.match(outMessage, {
    DismissedToast: () => Update.makeStep((model: UiModel) => ({ model })),
  })

const foldTooltipOutMessage = (outMessage: typeof Tooltip.OutMessage.Type) =>
  Tooltip.OutMessage.match(outMessage, {
    Shown: () => Update.makeStep((model: UiModel) => ({ model })),
    Hidden: () => Update.makeStep((model: UiModel) => ({ model })),
  })

const foldHoverIntentOutMessage = (
  outMessage: typeof HoverIntent.OutMessage.Type,
) =>
  HoverIntent.OutMessage.match(outMessage, {
    Opened: () => Update.makeStep((model: UiModel) => ({ model })),
    Closed: () => Update.makeStep((model: UiModel) => ({ model })),
  })

const foldMobileMenuDialog = Update.foldChild({
  update: Dialog.update,
  read: (model: UiModel) => Option.some(model.mobileMenuDialog),
  write: (model, nextMobileMenuDialog) =>
    modifyFields(model, { mobileMenuDialog: () => nextMobileMenuDialog }),
  toParentMessage: message => UiMessage.GotMobileMenuDialogMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldMobileMenuDialogOpen = Update.foldChildStep({
  update: Dialog.open,
  read: (model: UiModel) => Option.some(model.mobileMenuDialog),
  write: (model, nextMobileMenuDialog) =>
    modifyFields(model, { mobileMenuDialog: () => nextMobileMenuDialog }),
  toParentMessage: message => UiMessage.GotMobileMenuDialogMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldMobileMenuDialogClose = Update.foldChildStep({
  update: Dialog.close,
  read: (model: UiModel) => Option.some(model.mobileMenuDialog),
  write: (model, nextMobileMenuDialog) =>
    modifyFields(model, { mobileMenuDialog: () => nextMobileMenuDialog }),
  toParentMessage: message => UiMessage.GotMobileMenuDialogMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldComboboxDemoOutMessage = (outMessage: Combobox.OutMessage<City>) =>
  Combobox.OutMessage.match(outMessage, {
    Selected: ({ value }) =>
      Update.makeStep((model: UiModel) => ({
        model: modifyFields(model, {
          maybeComboboxDemoSelectedCity: () => Option.some(value),
        }),
      })),
    ClearedSelection: () => Update.makeStep((model: UiModel) => ({ model })),
  })

const foldComboboxDemo = Update.foldChild({
  update: CityCombobox.update,
  read: (model: UiModel) => Option.some(model.comboboxDemo),
  write: (model, nextComboboxDemo) =>
    modifyFields(model, { comboboxDemo: () => nextComboboxDemo }),
  toParentMessage: message => UiMessage.GotComboboxDemoMessage({ message }),
  foldOutMessage: foldComboboxDemoOutMessage,
})

const foldComboboxNullableDemoOutMessage = (
  outMessage: Combobox.OutMessage<City>,
) =>
  Combobox.OutMessage.match(outMessage, {
    Selected: ({ value }) =>
      Update.makeStep((model: UiModel) => ({
        model: modifyFields(model, {
          maybeComboboxNullableDemoSelectedCity:
            maybeComboboxNullableDemoSelectedCity =>
              Option.contains(maybeComboboxNullableDemoSelectedCity, value)
                ? Option.none()
                : Option.some(value),
        }),
      })),
    ClearedSelection: () =>
      Update.makeStep((model: UiModel) => ({
        model: modifyFields(model, {
          maybeComboboxNullableDemoSelectedCity: () => Option.none(),
        }),
      })),
  })

const foldComboboxNullableDemo = Update.foldChild({
  update: CityCombobox.update,
  read: (model: UiModel) => Option.some(model.comboboxNullableDemo),
  write: (model, nextComboboxNullableDemo) =>
    modifyFields(model, {
      comboboxNullableDemo: () => nextComboboxNullableDemo,
    }),
  toParentMessage: message =>
    UiMessage.GotComboboxNullableDemoMessage({ message }),
  foldOutMessage: foldComboboxNullableDemoOutMessage,
})

const foldComboboxMultiDemoOutMessage = (
  outMessage: Combobox.OutMessage<City>,
) =>
  Combobox.OutMessage.match(outMessage, {
    Selected: ({ value }) =>
      Update.makeStep((model: UiModel) => ({
        model: modifyFields(model, {
          comboboxMultiDemoSelectedCities: comboboxMultiDemoSelectedCities =>
            Array.contains(comboboxMultiDemoSelectedCities, value)
              ? Array.filter(
                  comboboxMultiDemoSelectedCities,
                  city => city !== value,
                )
              : Array.append(comboboxMultiDemoSelectedCities, value),
        }),
      })),
    ClearedSelection: () => Update.makeStep((model: UiModel) => ({ model })),
  })

const foldComboboxMultiDemo = Update.foldChild({
  update: CityMultiCombobox.update,
  read: (model: UiModel) => Option.some(model.comboboxMultiDemo),
  write: (model, nextComboboxMultiDemo) =>
    modifyFields(model, { comboboxMultiDemo: () => nextComboboxMultiDemo }),
  toParentMessage: message =>
    UiMessage.GotComboboxMultiDemoMessage({ message }),
  foldOutMessage: foldComboboxMultiDemoOutMessage,
})

const foldComboboxPlacementLockDemoOutMessage = (
  outMessage: Combobox.OutMessage<City>,
) =>
  Combobox.OutMessage.match(outMessage, {
    Selected: ({ value }) =>
      Update.makeStep((model: UiModel) => ({
        model: modifyFields(model, {
          maybeComboboxPlacementLockDemoSelectedCity: () => Option.some(value),
        }),
      })),
    ClearedSelection: () => Update.makeStep((model: UiModel) => ({ model })),
  })

const foldComboboxPlacementLockDemo = Update.foldChild({
  update: CityCombobox.update,
  read: (model: UiModel) => Option.some(model.comboboxPlacementLockDemo),
  write: (model, nextComboboxPlacementLockDemo) =>
    modifyFields(model, {
      comboboxPlacementLockDemo: () => nextComboboxPlacementLockDemo,
    }),
  toParentMessage: message =>
    UiMessage.GotComboboxPlacementLockDemoMessage({ message }),
  foldOutMessage: foldComboboxPlacementLockDemoOutMessage,
})

const foldComboboxSelectOnFocusDemoOutMessage = (
  outMessage: Combobox.OutMessage<City>,
) =>
  Combobox.OutMessage.match(outMessage, {
    Selected: ({ value }) =>
      Update.makeStep((model: UiModel) => ({
        model: modifyFields(model, {
          maybeComboboxSelectOnFocusDemoSelectedCity: () => Option.some(value),
        }),
      })),
    ClearedSelection: () => Update.makeStep((model: UiModel) => ({ model })),
  })

const foldComboboxSelectOnFocusDemo = Update.foldChild({
  update: CityCombobox.update,
  read: (model: UiModel) => Option.some(model.comboboxSelectOnFocusDemo),
  write: (model, nextComboboxSelectOnFocusDemo) =>
    modifyFields(model, {
      comboboxSelectOnFocusDemo: () => nextComboboxSelectOnFocusDemo,
    }),
  toParentMessage: message =>
    UiMessage.GotComboboxSelectOnFocusDemoMessage({ message }),
  foldOutMessage: foldComboboxSelectOnFocusDemoOutMessage,
})

const foldDialogDemo = Update.foldChild({
  update: Dialog.update,
  read: (model: UiModel) => Option.some(model.dialogDemo),
  write: (model, nextDialogDemo) =>
    modifyFields(model, { dialogDemo: () => nextDialogDemo }),
  toParentMessage: message => UiMessage.GotDialogDemoMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldDialogDemoOpen = Update.foldChildStep({
  update: Dialog.open,
  read: (model: UiModel) => Option.some(model.dialogDemo),
  write: (model, nextDialogDemo) =>
    modifyFields(model, { dialogDemo: () => nextDialogDemo }),
  toParentMessage: message => UiMessage.GotDialogDemoMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldDialogAnimatedDemo = Update.foldChild({
  update: Dialog.update,
  read: (model: UiModel) => Option.some(model.dialogAnimatedDemo),
  write: (model, nextDialogAnimatedDemo) =>
    modifyFields(model, { dialogAnimatedDemo: () => nextDialogAnimatedDemo }),
  toParentMessage: message =>
    UiMessage.GotDialogAnimatedDemoMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldDialogAnimatedDemoOpen = Update.foldChildStep({
  update: Dialog.open,
  read: (model: UiModel) => Option.some(model.dialogAnimatedDemo),
  write: (model, nextDialogAnimatedDemo) =>
    modifyFields(model, { dialogAnimatedDemo: () => nextDialogAnimatedDemo }),
  toParentMessage: message =>
    UiMessage.GotDialogAnimatedDemoMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldOverlayDialogDemo = Update.foldChild({
  update: Dialog.update,
  read: (model: UiModel) => Option.some(model.overlayDialogDemo),
  write: (model, nextOverlayDialogDemo) =>
    modifyFields(model, { overlayDialogDemo: () => nextOverlayDialogDemo }),
  toParentMessage: message =>
    UiMessage.GotOverlayDialogDemoMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldOverlayDialogDemoOpen = Update.foldChildStep({
  update: Dialog.open,
  read: (model: UiModel) => Option.some(model.overlayDialogDemo),
  write: (model, nextOverlayDialogDemo) =>
    modifyFields(model, { overlayDialogDemo: () => nextOverlayDialogDemo }),
  toParentMessage: message =>
    UiMessage.GotOverlayDialogDemoMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldOverlayComboboxDemoOutMessage = (
  outMessage: Combobox.OutMessage<City>,
) =>
  Combobox.OutMessage.match(outMessage, {
    Selected: ({ value }) =>
      Update.makeStep((model: UiModel) => ({
        model: modifyFields(model, {
          maybeOverlayComboboxDemoSelectedCity: () => Option.some(value),
        }),
      })),
    ClearedSelection: () => Update.makeStep((model: UiModel) => ({ model })),
  })

const foldOverlayComboboxDemo = Update.foldChild({
  update: CityCombobox.update,
  read: (model: UiModel) => Option.some(model.overlayComboboxDemo),
  write: (model, nextOverlayComboboxDemo) =>
    modifyFields(model, { overlayComboboxDemo: () => nextOverlayComboboxDemo }),
  toParentMessage: message =>
    UiMessage.GotOverlayComboboxDemoMessage({ message }),
  foldOutMessage: foldOverlayComboboxDemoOutMessage,
})

const foldNestedDialogParentDemo = Update.foldChild({
  update: Dialog.update,
  read: (model: UiModel) => Option.some(model.nestedDialogParentDemo),
  write: (model, nextNestedDialogParentDemo) =>
    modifyFields(model, {
      nestedDialogParentDemo: () => nextNestedDialogParentDemo,
    }),
  toParentMessage: message =>
    UiMessage.GotNestedDialogParentDemoMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldNestedDialogParentDemoOpen = Update.foldChildStep({
  update: Dialog.open,
  read: (model: UiModel) => Option.some(model.nestedDialogParentDemo),
  write: (model, nextNestedDialogParentDemo) =>
    modifyFields(model, {
      nestedDialogParentDemo: () => nextNestedDialogParentDemo,
    }),
  toParentMessage: message =>
    UiMessage.GotNestedDialogParentDemoMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldNestedDialogChildDemo = Update.foldChild({
  update: Dialog.update,
  read: (model: UiModel) => Option.some(model.nestedDialogChildDemo),
  write: (model, nextNestedDialogChildDemo) =>
    modifyFields(model, {
      nestedDialogChildDemo: () => nextNestedDialogChildDemo,
    }),
  toParentMessage: message =>
    UiMessage.GotNestedDialogChildDemoMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldNestedDialogChildDemoOpen = Update.foldChildStep({
  update: Dialog.open,
  read: (model: UiModel) => Option.some(model.nestedDialogChildDemo),
  write: (model, nextNestedDialogChildDemo) =>
    modifyFields(model, {
      nestedDialogChildDemo: () => nextNestedDialogChildDemo,
    }),
  toParentMessage: message =>
    UiMessage.GotNestedDialogChildDemoMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldCalendarBasicDemoOutMessage = (
  outMessage: typeof Calendar.OutMessage.Type,
) =>
  Calendar.OutMessage.match(outMessage, {
    SelectedDate: ({ date }) =>
      Update.makeStep((model: UiModel) => ({
        model: modifyFields(model, {
          maybeCalendarBasicDemoSelectedDate: () => Option.some(date),
        }),
      })),
    ChangedViewMonth: () => Update.makeStep((model: UiModel) => ({ model })),
  })

const foldCalendarBasicDemo = Update.foldChild({
  update: Calendar.update,
  read: (model: UiModel) => Option.some(model.calendarBasicDemo),
  write: (model, nextCalendarBasicDemo) =>
    modifyFields(model, { calendarBasicDemo: () => nextCalendarBasicDemo }),
  toParentMessage: message =>
    UiMessage.GotCalendarBasicDemoMessage({ message }),
  foldOutMessage: foldCalendarBasicDemoOutMessage,
})

const foldDatePickerBasicDemoOutMessage = (
  outMessage: typeof DatePicker.OutMessage.Type,
) =>
  DatePicker.OutMessage.match(outMessage, {
    SelectedDate: ({ date }) =>
      Update.makeStep((model: UiModel) => ({
        model: modifyFields(model, {
          maybeDatePickerBasicDemoSelectedDate: () => Option.some(date),
        }),
      })),
    ClearedDate: () =>
      Update.makeStep((model: UiModel) => ({
        model: modifyFields(model, {
          maybeDatePickerBasicDemoSelectedDate: () => Option.none(),
        }),
      })),
    ChangedViewMonth: () => Update.makeStep((model: UiModel) => ({ model })),
  })

const foldDatePickerBasicDemo = Update.foldChild({
  update: DatePicker.update,
  read: (model: UiModel) => Option.some(model.datePickerBasicDemo),
  write: (model, nextDatePickerBasicDemo) =>
    modifyFields(model, { datePickerBasicDemo: () => nextDatePickerBasicDemo }),
  toParentMessage: message =>
    UiMessage.GotDatePickerBasicDemoMessage({ message }),
  foldOutMessage: foldDatePickerBasicDemoOutMessage,
})

const foldDragAndDropDemoOutMessage = (
  outMessage: typeof DragAndDrop.OutMessage.Type,
) =>
  DragAndDrop.OutMessage.match(outMessage, {
    Reordered: ({ itemId, fromContainerId, toContainerId, toIndex }) =>
      Update.makeStep((model: UiModel) => ({
        model: modifyFields(model, {
          dragAndDropDemoColumns: dragAndDropDemoColumns =>
            reorderColumns(
              dragAndDropDemoColumns,
              itemId,
              fromContainerId,
              toContainerId,
              toIndex,
            ),
        }),
      })),
    Cancelled: () => Update.makeStep((model: UiModel) => ({ model })),
  })

const foldDragAndDropDemo = Update.foldChild({
  update: DragAndDrop.update,
  read: (model: UiModel) => Option.some(model.dragAndDropDemo),
  write: (model, nextDragAndDropDemo) =>
    modifyFields(model, { dragAndDropDemo: () => nextDragAndDropDemo }),
  toParentMessage: message => UiMessage.GotDragAndDropDemoMessage({ message }),
  foldOutMessage: foldDragAndDropDemoOutMessage,
})

const foldFileDropBasicDemoOutMessage = (
  outMessage: typeof FileDrop.OutMessage.Type,
) =>
  FileDrop.OutMessage.match(outMessage, {
    ReceivedFiles: ({ files }) =>
      Update.makeStep((model: UiModel) => ({
        model: modifyFields(model, {
          fileDropBasicDemoFiles: Array.appendAll(files),
        }),
      })),
    RejectedNonFiles: () => Update.makeStep((model: UiModel) => ({ model })),
  })

const foldFileDropBasicDemo = Update.foldChild({
  update: FileDrop.update,
  read: (model: UiModel) => Option.some(model.fileDropBasicDemo),
  write: (model, nextFileDropBasicDemo) =>
    modifyFields(model, { fileDropBasicDemo: () => nextFileDropBasicDemo }),
  toParentMessage: message =>
    UiMessage.GotFileDropBasicDemoMessage({ message }),
  foldOutMessage: foldFileDropBasicDemoOutMessage,
})

const foldListboxDemoOutMessage = (
  outMessage: Listbox.OutMessage<ListboxItem>,
) =>
  Listbox.OutMessage.match(outMessage, {
    Selected: ({ value }) =>
      Update.makeStep((model: UiModel) => ({
        model: modifyFields(model, {
          maybeListboxDemoSelectedItem: () => Option.some(value),
        }),
      })),
  })

const foldListboxDemo = Update.foldChild({
  update: ItemListbox.update,
  read: (model: UiModel) => Option.some(model.listboxDemo),
  write: (model, nextListboxDemo) =>
    modifyFields(model, { listboxDemo: () => nextListboxDemo }),
  toParentMessage: message => UiMessage.GotListboxDemoMessage({ message }),
  foldOutMessage: foldListboxDemoOutMessage,
})

const foldListboxMultiDemoOutMessage = (
  outMessage: Listbox.OutMessage<ListboxItem>,
) =>
  Listbox.OutMessage.match(outMessage, {
    Selected: ({ value }) =>
      Update.makeStep((model: UiModel) => ({
        model: modifyFields(model, {
          listboxMultiDemoSelectedItems: listboxMultiDemoSelectedItems =>
            Array.contains(listboxMultiDemoSelectedItems, value)
              ? Array.filter(
                  listboxMultiDemoSelectedItems,
                  item => item !== value,
                )
              : Array.append(listboxMultiDemoSelectedItems, value),
        }),
      })),
  })

const foldListboxMultiDemo = Update.foldChild({
  update: ItemMultiListbox.update,
  read: (model: UiModel) => Option.some(model.listboxMultiDemo),
  write: (model, nextListboxMultiDemo) =>
    modifyFields(model, { listboxMultiDemo: () => nextListboxMultiDemo }),
  toParentMessage: message => UiMessage.GotListboxMultiDemoMessage({ message }),
  foldOutMessage: foldListboxMultiDemoOutMessage,
})

const foldListboxGroupedDemoOutMessage = (
  outMessage: typeof Listbox.OutMessage.Type,
) =>
  Listbox.OutMessage.match(outMessage, {
    Selected: ({ value }) =>
      Update.makeStep((model: UiModel) => ({
        model: modifyFields(model, {
          maybeListboxGroupedDemoSelectedItem: () => Option.some(value),
        }),
      })),
  })

const foldListboxGroupedDemo = Update.foldChild({
  update: CharacterListbox.update,
  read: (model: UiModel) => Option.some(model.listboxGroupedDemo),
  write: (model, nextListboxGroupedDemo) =>
    modifyFields(model, { listboxGroupedDemo: () => nextListboxGroupedDemo }),
  toParentMessage: message =>
    UiMessage.GotListboxGroupedDemoMessage({ message }),
  foldOutMessage: foldListboxGroupedDemoOutMessage,
})

const foldMenuBasicDemo = Update.foldChild({
  update: DemoMenu.update,
  read: (model: UiModel) => Option.some(model.menuBasicDemo),
  write: (model, nextMenuBasicDemo) =>
    modifyFields(model, { menuBasicDemo: () => nextMenuBasicDemo }),
  toParentMessage: message => UiMessage.GotMenuBasicDemoMessage({ message }),
  foldOutMessage: foldMenuOutMessage,
})

const foldMenuAnimatedDemo = Update.foldChild({
  update: DemoMenu.update,
  read: (model: UiModel) => Option.some(model.menuAnimatedDemo),
  write: (model, nextMenuAnimatedDemo) =>
    modifyFields(model, { menuAnimatedDemo: () => nextMenuAnimatedDemo }),
  toParentMessage: message => UiMessage.GotMenuAnimatedDemoMessage({ message }),
  foldOutMessage: foldMenuOutMessage,
})

const foldPopoverBasicDemo = Update.foldChild({
  update: Popover.update,
  read: (model: UiModel) => Option.some(model.popoverBasicDemo),
  write: (model, nextPopoverBasicDemo) =>
    modifyFields(model, { popoverBasicDemo: () => nextPopoverBasicDemo }),
  toParentMessage: message => UiMessage.GotPopoverBasicDemoMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

const foldPopoverAnimatedDemo = Update.foldChild({
  update: Popover.update,
  read: (model: UiModel) => Option.some(model.popoverAnimatedDemo),
  write: (model, nextPopoverAnimatedDemo) =>
    modifyFields(model, { popoverAnimatedDemo: () => nextPopoverAnimatedDemo }),
  toParentMessage: message =>
    UiMessage.GotPopoverAnimatedDemoMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

const foldPopoverNestedParentDemo = Update.foldChild({
  update: Popover.update,
  read: (model: UiModel) => Option.some(model.popoverNestedParentDemo),
  write: (model, nextPopoverNestedParentDemo) =>
    modifyFields(model, {
      popoverNestedParentDemo: () => nextPopoverNestedParentDemo,
    }),
  toParentMessage: message =>
    UiMessage.GotPopoverNestedParentDemoMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

const foldPopoverNestedChildDemo = Update.foldChild({
  update: Popover.update,
  read: (model: UiModel) => Option.some(model.popoverNestedChildDemo),
  write: (model, nextPopoverNestedChildDemo) =>
    modifyFields(model, {
      popoverNestedChildDemo: () => nextPopoverNestedChildDemo,
    }),
  toParentMessage: message =>
    UiMessage.GotPopoverNestedChildDemoMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

const foldVerticalRadioGroupDemoOutMessage = (
  outMessage: RadioGroup.OutMessage<Plan>,
) =>
  RadioGroup.OutMessage.match(outMessage, {
    Selected: ({ value }) =>
      Update.makeStep((model: UiModel) => ({
        model: modifyFields(model, {
          verticalRadioGroupDemoValue: () => Option.some(value),
        }),
      })),
  })

const foldVerticalRadioGroupDemo = Update.foldChild({
  update: PlanRadioGroup.update,
  read: (model: UiModel) => Option.some(model.verticalRadioGroupDemo),
  write: (model, nextVerticalRadioGroupDemo) =>
    modifyFields(model, {
      verticalRadioGroupDemo: () => nextVerticalRadioGroupDemo,
    }),
  toParentMessage: message =>
    UiMessage.GotVerticalRadioGroupDemoMessage({ message }),
  foldOutMessage: foldVerticalRadioGroupDemoOutMessage,
})

const foldHorizontalRadioGroupDemoOutMessage = (
  outMessage: RadioGroup.OutMessage<Plan>,
) =>
  RadioGroup.OutMessage.match(outMessage, {
    Selected: ({ value }) =>
      Update.makeStep((model: UiModel) => ({
        model: modifyFields(model, {
          horizontalRadioGroupDemoValue: () => Option.some(value),
        }),
      })),
  })

const foldHorizontalRadioGroupDemo = Update.foldChild({
  update: PlanRadioGroup.update,
  read: (model: UiModel) => Option.some(model.horizontalRadioGroupDemo),
  write: (model, nextHorizontalRadioGroupDemo) =>
    modifyFields(model, {
      horizontalRadioGroupDemo: () => nextHorizontalRadioGroupDemo,
    }),
  toParentMessage: message =>
    UiMessage.GotHorizontalRadioGroupDemoMessage({ message }),
  foldOutMessage: foldHorizontalRadioGroupDemoOutMessage,
})

const foldSliderRatingDemoOutMessage = (
  outMessage: typeof Slider.OutMessage.Type,
) =>
  Slider.OutMessage.match(outMessage, {
    ChangedValue: ({ value }) =>
      Update.makeStep((model: UiModel) => ({
        model: modifyFields(model, { sliderRatingValue: () => value }),
      })),
  })

const foldSliderRatingDemo = Update.foldChild({
  update: Slider.update,
  read: (model: UiModel) => Option.some(model.sliderRatingDemo),
  write: (model, nextSliderRatingDemo) =>
    modifyFields(model, { sliderRatingDemo: () => nextSliderRatingDemo }),
  toParentMessage: message => UiMessage.GotSliderRatingDemoMessage({ message }),
  foldOutMessage: foldSliderRatingDemoOutMessage,
})

const foldSliderVolumeDemoOutMessage = (
  outMessage: typeof Slider.OutMessage.Type,
) =>
  Slider.OutMessage.match(outMessage, {
    ChangedValue: ({ value }) =>
      Update.makeStep((model: UiModel) => ({
        model: modifyFields(model, { sliderVolumeValue: () => value }),
      })),
  })

const foldSliderVolumeDemo = Update.foldChild({
  update: Slider.update,
  read: (model: UiModel) => Option.some(model.sliderVolumeDemo),
  write: (model, nextSliderVolumeDemo) =>
    modifyFields(model, { sliderVolumeDemo: () => nextSliderVolumeDemo }),
  toParentMessage: message => UiMessage.GotSliderVolumeDemoMessage({ message }),
  foldOutMessage: foldSliderVolumeDemoOutMessage,
})

const foldHorizontalTabsDemoOutMessage = (
  outMessage: Tabs.OutMessage<DemoTab>,
) =>
  Tabs.OutMessage.match(outMessage, {
    Selected: ({ value }) =>
      Update.makeStep((model: UiModel) => ({
        model: modifyFields(model, { horizontalTabsDemoTab: () => value }),
      })),
  })

const foldHorizontalTabsDemo = Update.foldChild({
  update: DemoTabs.update,
  read: (model: UiModel) => Option.some(model.horizontalTabsDemo),
  write: (model, nextHorizontalTabsDemo) =>
    modifyFields(model, { horizontalTabsDemo: () => nextHorizontalTabsDemo }),
  toParentMessage: message =>
    UiMessage.GotHorizontalTabsDemoMessage({ message }),
  foldOutMessage: foldHorizontalTabsDemoOutMessage,
})

const foldVerticalTabsDemoOutMessage = (outMessage: Tabs.OutMessage<DemoTab>) =>
  Tabs.OutMessage.match(outMessage, {
    Selected: ({ value }) =>
      Update.makeStep((model: UiModel) => ({
        model: modifyFields(model, { verticalTabsDemoTab: () => value }),
      })),
  })

const foldVerticalTabsDemo = Update.foldChild({
  update: DemoTabs.update,
  read: (model: UiModel) => Option.some(model.verticalTabsDemo),
  write: (model, nextVerticalTabsDemo) =>
    modifyFields(model, { verticalTabsDemo: () => nextVerticalTabsDemo }),
  toParentMessage: message => UiMessage.GotVerticalTabsDemoMessage({ message }),
  foldOutMessage: foldVerticalTabsDemoOutMessage,
})

const foldToastDemo = Update.foldChild({
  update: Toast.update,
  read: (model: UiModel) => Option.some(model.toastDemo),
  write: (model, nextToastDemo) =>
    modifyFields(model, { toastDemo: () => nextToastDemo }),
  toParentMessage: message => UiMessage.GotToastDemoMessage({ message }),
  foldOutMessage: foldToastOutMessage,
})

const foldToastDemoShow = Update.foldChild({
  update: Toast.show,
  read: (model: UiModel) => Option.some(model.toastDemo),
  write: (model, nextToastDemo) =>
    modifyFields(model, { toastDemo: () => nextToastDemo }),
  toParentMessage: message => UiMessage.GotToastDemoMessage({ message }),
  foldOutMessage: foldToastOutMessage,
})

const foldToastDemoDismissAll = Update.foldChildStep({
  update: Toast.dismissAll,
  read: (model: UiModel) => Option.some(model.toastDemo),
  write: (model, nextToastDemo) =>
    modifyFields(model, { toastDemo: () => nextToastDemo }),
  toParentMessage: message => UiMessage.GotToastDemoMessage({ message }),
  foldOutMessage: foldToastOutMessage,
})

const foldTooltipBasicDemo = Update.foldChild({
  update: Tooltip.update,
  read: (model: UiModel) => Option.some(model.tooltipBasicDemo),
  write: (model, nextTooltipBasicDemo) =>
    modifyFields(model, { tooltipBasicDemo: () => nextTooltipBasicDemo }),
  toParentMessage: message => UiMessage.GotTooltipBasicDemoMessage({ message }),
  foldOutMessage: foldTooltipOutMessage,
})

const foldTooltipNoDelayDemo = Update.foldChild({
  update: Tooltip.update,
  read: (model: UiModel) => Option.some(model.tooltipNoDelayDemo),
  write: (model, nextTooltipNoDelayDemo) =>
    modifyFields(model, { tooltipNoDelayDemo: () => nextTooltipNoDelayDemo }),
  toParentMessage: message =>
    UiMessage.GotTooltipNoDelayDemoMessage({ message }),
  foldOutMessage: foldTooltipOutMessage,
})

const foldHoverIntentDemo = Update.foldChild({
  update: HoverIntent.update,
  read: (model: UiModel) => Option.some(model.hoverIntentDemo),
  write: (model, nextHoverIntentDemo) =>
    modifyFields(model, { hoverIntentDemo: () => nextHoverIntentDemo }),
  toParentMessage: message => UiMessage.GotHoverIntentDemoMessage({ message }),
  foldOutMessage: foldHoverIntentOutMessage,
})

const foldAnimationDemoOutMessage = (
  outMessage: Animation.OutMessage,
  { liftCommand }: Update.FoldContext<Animation.Message, UiMessage>,
) =>
  Animation.OutMessage.match(outMessage, {
    StartedLeaveAnimating: () =>
      Update.makeStep((model: UiModel) => ({
        model,
        commands: [
          liftCommand(Animation.defaultLeaveCommand(model.animationDemo)),
        ],
      })),
    TransitionedOut: () => Update.makeStep((model: UiModel) => ({ model })),
  })

const foldAnimationDemo = Update.foldChild({
  update: Animation.update,
  read: (model: UiModel) => Option.some(model.animationDemo),
  write: (model, nextAnimationDemo) =>
    modifyFields(model, { animationDemo: () => nextAnimationDemo }),
  toParentMessage: message => UiMessage.GotAnimationDemoMessage({ message }),
  foldOutMessage: foldAnimationDemoOutMessage,
})

const foldAnimationDemoShow = Update.foldChildStep({
  update: Animation.show,
  read: (model: UiModel) => Option.some(model.animationDemo),
  write: (model, nextAnimationDemo) =>
    modifyFields(model, { animationDemo: () => nextAnimationDemo }),
  toParentMessage: message => UiMessage.GotAnimationDemoMessage({ message }),
})

const foldAnimationDemoHide = Update.foldChildStep({
  update: Animation.hide,
  read: (model: UiModel) => Option.some(model.animationDemo),
  write: (model, nextAnimationDemo) =>
    modifyFields(model, { animationDemo: () => nextAnimationDemo }),
  toParentMessage: message => UiMessage.GotAnimationDemoMessage({ message }),
})

const foldVirtualListDemo = Update.foldChild({
  update: VirtualList.update,
  read: (model: UiModel) => Option.some(model.virtualListDemo),
  write: (model, nextVirtualListDemo) =>
    modifyFields(model, { virtualListDemo: () => nextVirtualListDemo }),
  toParentMessage: message => UiMessage.GotVirtualListDemoMessage({ message }),
})

const foldVirtualListDemoScrollToIndex = Update.foldChild({
  update: VirtualList.scrollToIndex,
  read: (model: UiModel) => Option.some(model.virtualListDemo),
  write: (model, nextVirtualListDemo) =>
    modifyFields(model, { virtualListDemo: () => nextVirtualListDemo }),
  toParentMessage: message => UiMessage.GotVirtualListDemoMessage({ message }),
})

const foldVirtualListVariableDemo = Update.foldChild({
  update: VirtualList.update,
  read: (model: UiModel) => Option.some(model.virtualListVariableDemo),
  write: (model, nextVirtualListVariableDemo) =>
    modifyFields(model, {
      virtualListVariableDemo: () => nextVirtualListVariableDemo,
    }),
  toParentMessage: message =>
    UiMessage.GotVirtualListVariableDemoMessage({ message }),
})

const foldVirtualListVariableDemoScrollToIndex = Update.foldChild({
  update: VirtualList.scrollToIndex,
  read: (model: UiModel) => Option.some(model.virtualListVariableDemo),
  write: (model, nextVirtualListVariableDemo) =>
    modifyFields(model, {
      virtualListVariableDemo: () => nextVirtualListVariableDemo,
    }),
  toParentMessage: message =>
    UiMessage.GotVirtualListVariableDemoMessage({ message }),
})

export const uiUpdate = Update.make((model: UiModel, message: UiMessage) =>
  UiMessage.match(message, {
    GotMobileMenuDialogMessage: ({ message }) =>
      foldMobileMenuDialog(model, message),

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

    GotComboboxDemoMessage: ({ message }) => foldComboboxDemo(model, message),

    GotComboboxNullableDemoMessage: ({ message }) =>
      foldComboboxNullableDemo(model, message),

    GotComboboxMultiDemoMessage: ({ message }) =>
      foldComboboxMultiDemo(model, message),

    GotComboboxPlacementLockDemoMessage: ({ message }) =>
      foldComboboxPlacementLockDemo(model, message),

    GotComboboxSelectOnFocusDemoMessage: ({ message }) =>
      foldComboboxSelectOnFocusDemo(model, message),

    GotDialogDemoMessage: ({ message }) => foldDialogDemo(model, message),

    GotDialogAnimatedDemoMessage: ({ message }) =>
      foldDialogAnimatedDemo(model, message),

    GotOverlayDialogDemoMessage: ({ message }) =>
      foldOverlayDialogDemo(model, message),

    GotOverlayComboboxDemoMessage: ({ message }) =>
      foldOverlayComboboxDemo(model, message),

    GotNestedDialogParentDemoMessage: ({ message }) =>
      foldNestedDialogParentDemo(model, message),

    GotNestedDialogChildDemoMessage: ({ message }) =>
      foldNestedDialogChildDemo(model, message),

    ClickedDeleteProject: () => foldNestedDialogChildDemoOpen(model),

    ClickedOpenDialog: () => foldDialogDemoOpen(model),

    ClickedOpenAnimatedDialog: () => foldDialogAnimatedDemoOpen(model),

    ClickedEditFilters: () => foldOverlayDialogDemoOpen(model),

    ClickedOpenProjectSettings: () => foldNestedDialogParentDemoOpen(model),

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

    GotCalendarBasicDemoMessage: ({ message }) =>
      foldCalendarBasicDemo(model, message),

    GotDatePickerBasicDemoMessage: ({ message }) =>
      foldDatePickerBasicDemo(model, message),

    GotDragAndDropDemoMessage: ({ message }) =>
      foldDragAndDropDemo(model, message),

    GotFileDropBasicDemoMessage: ({ message }) =>
      foldFileDropBasicDemo(model, message),

    ClickedRemoveFileDropDemoFile: ({ fileIndex }) => ({
      model: modifyFields(model, {
        fileDropBasicDemoFiles: () =>
          Array.remove(model.fileDropBasicDemoFiles, fileIndex),
      }),
    }),

    GotListboxDemoMessage: ({ message }) => foldListboxDemo(model, message),

    GotListboxMultiDemoMessage: ({ message }) =>
      foldListboxMultiDemo(model, message),

    GotListboxGroupedDemoMessage: ({ message }) =>
      foldListboxGroupedDemo(model, message),

    GotMenuBasicDemoMessage: ({ message }) => foldMenuBasicDemo(model, message),

    GotMenuAnimatedDemoMessage: ({ message }) =>
      foldMenuAnimatedDemo(model, message),

    GotPopoverBasicDemoMessage: ({ message }) =>
      foldPopoverBasicDemo(model, message),

    GotPopoverAnimatedDemoMessage: ({ message }) =>
      foldPopoverAnimatedDemo(model, message),

    GotPopoverNestedParentDemoMessage: ({ message }) =>
      foldPopoverNestedParentDemo(model, message),

    GotPopoverNestedChildDemoMessage: ({ message }) =>
      foldPopoverNestedChildDemo(model, message),

    GotVerticalRadioGroupDemoMessage: ({ message }) =>
      foldVerticalRadioGroupDemo(model, message),

    GotHorizontalRadioGroupDemoMessage: ({ message }) =>
      foldHorizontalRadioGroupDemo(model, message),

    GotSliderRatingDemoMessage: ({ message }) =>
      foldSliderRatingDemo(model, message),

    GotSliderVolumeDemoMessage: ({ message }) =>
      foldSliderVolumeDemo(model, message),

    ToggledSwitchDemo: ({ isChecked }) => ({
      model: modifyFields(model, {
        isSwitchDemoChecked: () => isChecked,
      }),
    }),

    GotHorizontalTabsDemoMessage: ({ message }) =>
      foldHorizontalTabsDemo(model, message),

    GotVerticalTabsDemoMessage: ({ message }) =>
      foldVerticalTabsDemo(model, message),

    GotToastDemoMessage: ({ message }) => foldToastDemo(model, message),

    ClickedShowInfoToast: () =>
      foldToastDemoShow(model, {
        variant: 'Info',
        payload: {
          title: 'Changes saved',
          maybeDescription: Option.some('Your preferences have been updated.'),
        },
      }),

    ClickedShowSuccessToast: () =>
      foldToastDemoShow(model, {
        variant: 'Success',
        payload: {
          title: 'Uploaded successfully',
          maybeDescription: Option.some('kit-manual.pdf is now available.'),
        },
      }),

    ClickedShowWarningToast: () =>
      foldToastDemoShow(model, {
        variant: 'Warning',
        payload: {
          title: 'Network slow',
          maybeDescription: Option.some(
            'Some assets are loading over a weak connection.',
          ),
        },
      }),

    ClickedShowErrorToast: () =>
      foldToastDemoShow(model, {
        variant: 'Error',
        payload: {
          title: 'Failed to save',
          maybeDescription: Option.some('Check your connection and try again.'),
        },
      }),

    ClickedShowStickyToast: () =>
      foldToastDemoShow(model, {
        variant: 'Info',
        payload: {
          title: 'Review pending',
          maybeDescription: Option.some(
            'Action required. This stays until dismissed.',
          ),
        },
        sticky: true,
      }),

    ClickedDismissAllToasts: () => foldToastDemoDismissAll(model),

    GotTooltipBasicDemoMessage: ({ message }) =>
      foldTooltipBasicDemo(model, message),

    GotTooltipNoDelayDemoMessage: ({ message }) =>
      foldTooltipNoDelayDemo(model, message),

    GotHoverIntentDemoMessage: ({ message }) =>
      foldHoverIntentDemo(model, message),

    GotAnimationDemoMessage: ({ message }) => foldAnimationDemo(model, message),

    ToggledAnimationDemo: () =>
      model.animationDemo.isShowing
        ? foldAnimationDemoHide(model)
        : foldAnimationDemoShow(model),

    GotVirtualListDemoMessage: ({ message }) =>
      foldVirtualListDemo(model, message),

    ClickedVirtualListScrollToMiddle: () =>
      foldVirtualListDemoScrollToIndex(
        model,
        Math.floor(VIRTUAL_LIST_ROW_COUNT / 2),
      ),

    GotVirtualListVariableDemoMessage: ({ message }) =>
      foldVirtualListVariableDemo(model, message),

    ClickedVirtualListVariableScrollToMiddle: () =>
      foldVirtualListVariableDemoScrollToIndex(
        model,
        Math.floor(VIRTUAL_LIST_ROW_COUNT / 2),
      ),
  }),
)

export const openMobileMenu = (model: UiModel) =>
  foldMobileMenuDialogOpen(model)

export const closeMobileMenu = (model: UiModel) =>
  foldMobileMenuDialogClose(model)
