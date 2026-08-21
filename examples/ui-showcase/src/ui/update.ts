import { Array, Match as M, Number, Option, pipe } from 'effect'
import { Command, Update } from 'foldkit'
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
  Menu,
  Popover,
  RadioGroup,
  Slider,
  Tabs,
  Tooltip,
  VirtualList,
} from '@foldkit/ui'
import { Message as AnimationMessage } from '@foldkit/ui/animation'

import { UiMessage } from './message'
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

export type UiUpdateReturn = Update.Return<UiModel, UiMessage>

const DemoMenu = Menu.create<string>()

const foldDialogOutMessage = M.type<Dialog.OutMessage>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    Opened: () => model => ({ model }),
    Closed: () => model => ({ model }),
  }),
)

const foldMenuOutMessage = M.type<Menu.OutMessage<string>>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    Selected: () => model => ({ model }),
  }),
)

const foldPopoverOutMessage = M.type<Popover.OutMessage>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    Opened: () => model => ({ model }),
    Closed: () => model => ({ model }),
  }),
)

const foldToastOutMessage = M.type<typeof Toast.OutMessage.Type>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    DismissedToast: () => model => ({ model }),
  }),
)

const foldTooltipOutMessage = M.type<Tooltip.OutMessage>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    Shown: () => model => ({ model }),
    Hidden: () => model => ({ model }),
  }),
)

const foldMobileMenuDialog = Update.foldChild({
  update: Dialog.update,
  read: (model: UiModel) => Option.some(model.mobileMenuDialog),
  write: (model, nextMobileMenuDialog) =>
    evo(model, { mobileMenuDialog: () => nextMobileMenuDialog }),
  toParentMessage: message => UiMessage.GotMobileMenuDialogMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldComboboxDemoOutMessage = M.type<Combobox.OutMessage<City>>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          maybeComboboxDemoSelectedCity: () => Option.some(value),
        }),
      }),
    ClearedSelection: () => model => ({ model }),
  }),
)

const foldComboboxDemo = Update.foldChild({
  update: CityCombobox.update,
  read: (model: UiModel) => Option.some(model.comboboxDemo),
  write: (model, nextComboboxDemo) =>
    evo(model, { comboboxDemo: () => nextComboboxDemo }),
  toParentMessage: message => UiMessage.GotComboboxDemoMessage({ message }),
  foldOutMessage: foldComboboxDemoOutMessage,
})

const foldComboboxNullableDemoOutMessage = M.type<
  Combobox.OutMessage<City>
>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          maybeComboboxNullableDemoSelectedCity: () =>
            Option.contains(model.maybeComboboxNullableDemoSelectedCity, value)
              ? Option.none()
              : Option.some(value),
        }),
      }),
    ClearedSelection: () => model => ({
      model: evo(model, {
        maybeComboboxNullableDemoSelectedCity: () => Option.none(),
      }),
    }),
  }),
)

const foldComboboxNullableDemo = Update.foldChild({
  update: CityCombobox.update,
  read: (model: UiModel) => Option.some(model.comboboxNullableDemo),
  write: (model, nextComboboxNullableDemo) =>
    evo(model, { comboboxNullableDemo: () => nextComboboxNullableDemo }),
  toParentMessage: message =>
    UiMessage.GotComboboxNullableDemoMessage({ message }),
  foldOutMessage: foldComboboxNullableDemoOutMessage,
})

const foldComboboxMultiDemoOutMessage = M.type<
  Combobox.OutMessage<City>
>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          comboboxMultiDemoSelectedCities: () =>
            Array.contains(model.comboboxMultiDemoSelectedCities, value)
              ? Array.filter(
                  model.comboboxMultiDemoSelectedCities,
                  city => city !== value,
                )
              : Array.append(model.comboboxMultiDemoSelectedCities, value),
        }),
      }),
    ClearedSelection: () => model => ({ model }),
  }),
)

const foldComboboxMultiDemo = Update.foldChild({
  update: CityMultiCombobox.update,
  read: (model: UiModel) => Option.some(model.comboboxMultiDemo),
  write: (model, nextComboboxMultiDemo) =>
    evo(model, { comboboxMultiDemo: () => nextComboboxMultiDemo }),
  toParentMessage: message =>
    UiMessage.GotComboboxMultiDemoMessage({ message }),
  foldOutMessage: foldComboboxMultiDemoOutMessage,
})

const foldComboboxPlacementLockDemoOutMessage = M.type<
  Combobox.OutMessage<City>
>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          maybeComboboxPlacementLockDemoSelectedCity: () => Option.some(value),
        }),
      }),
    ClearedSelection: () => model => ({ model }),
  }),
)

const foldComboboxPlacementLockDemo = Update.foldChild({
  update: CityCombobox.update,
  read: (model: UiModel) => Option.some(model.comboboxPlacementLockDemo),
  write: (model, nextComboboxPlacementLockDemo) =>
    evo(model, {
      comboboxPlacementLockDemo: () => nextComboboxPlacementLockDemo,
    }),
  toParentMessage: message =>
    UiMessage.GotComboboxPlacementLockDemoMessage({ message }),
  foldOutMessage: foldComboboxPlacementLockDemoOutMessage,
})

const foldComboboxSelectOnFocusDemoOutMessage = M.type<
  Combobox.OutMessage<City>
>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          maybeComboboxSelectOnFocusDemoSelectedCity: () => Option.some(value),
        }),
      }),
    ClearedSelection: () => model => ({ model }),
  }),
)

const foldComboboxSelectOnFocusDemo = Update.foldChild({
  update: CityCombobox.update,
  read: (model: UiModel) => Option.some(model.comboboxSelectOnFocusDemo),
  write: (model, nextComboboxSelectOnFocusDemo) =>
    evo(model, {
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
    evo(model, { dialogDemo: () => nextDialogDemo }),
  toParentMessage: message => UiMessage.GotDialogDemoMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldDialogAnimatedDemo = Update.foldChild({
  update: Dialog.update,
  read: (model: UiModel) => Option.some(model.dialogAnimatedDemo),
  write: (model, nextDialogAnimatedDemo) =>
    evo(model, { dialogAnimatedDemo: () => nextDialogAnimatedDemo }),
  toParentMessage: message =>
    UiMessage.GotDialogAnimatedDemoMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldOverlayDialogDemo = Update.foldChild({
  update: Dialog.update,
  read: (model: UiModel) => Option.some(model.overlayDialogDemo),
  write: (model, nextOverlayDialogDemo) =>
    evo(model, { overlayDialogDemo: () => nextOverlayDialogDemo }),
  toParentMessage: message =>
    UiMessage.GotOverlayDialogDemoMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldOverlayComboboxDemoOutMessage = M.type<
  Combobox.OutMessage<City>
>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          maybeOverlayComboboxDemoSelectedCity: () => Option.some(value),
        }),
      }),
    ClearedSelection: () => model => ({ model }),
  }),
)

const foldOverlayComboboxDemo = Update.foldChild({
  update: CityCombobox.update,
  read: (model: UiModel) => Option.some(model.overlayComboboxDemo),
  write: (model, nextOverlayComboboxDemo) =>
    evo(model, { overlayComboboxDemo: () => nextOverlayComboboxDemo }),
  toParentMessage: message =>
    UiMessage.GotOverlayComboboxDemoMessage({ message }),
  foldOutMessage: foldOverlayComboboxDemoOutMessage,
})

const foldNestedDialogParentDemo = Update.foldChild({
  update: Dialog.update,
  read: (model: UiModel) => Option.some(model.nestedDialogParentDemo),
  write: (model, nextNestedDialogParentDemo) =>
    evo(model, { nestedDialogParentDemo: () => nextNestedDialogParentDemo }),
  toParentMessage: message =>
    UiMessage.GotNestedDialogParentDemoMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldNestedDialogChildDemo = Update.foldChild({
  update: Dialog.update,
  read: (model: UiModel) => Option.some(model.nestedDialogChildDemo),
  write: (model, nextNestedDialogChildDemo) =>
    evo(model, { nestedDialogChildDemo: () => nextNestedDialogChildDemo }),
  toParentMessage: message =>
    UiMessage.GotNestedDialogChildDemoMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldCalendarBasicDemoOutMessage = M.type<Calendar.OutMessage>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    SelectedDate:
      ({ date }) =>
      model => ({
        model: evo(model, {
          maybeCalendarBasicDemoSelectedDate: () => Option.some(date),
        }),
      }),
    ChangedViewMonth: () => model => ({ model }),
  }),
)

const foldCalendarBasicDemo = Update.foldChild({
  update: Calendar.update,
  read: (model: UiModel) => Option.some(model.calendarBasicDemo),
  write: (model, nextCalendarBasicDemo) =>
    evo(model, { calendarBasicDemo: () => nextCalendarBasicDemo }),
  toParentMessage: message =>
    UiMessage.GotCalendarBasicDemoMessage({ message }),
  foldOutMessage: foldCalendarBasicDemoOutMessage,
})

const foldDatePickerBasicDemoOutMessage = M.type<DatePicker.OutMessage>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    SelectedDate:
      ({ date }) =>
      model => ({
        model: evo(model, {
          maybeDatePickerBasicDemoSelectedDate: () => Option.some(date),
        }),
      }),
    ClearedDate: () => model => ({
      model: evo(model, {
        maybeDatePickerBasicDemoSelectedDate: () => Option.none(),
      }),
    }),
    ChangedViewMonth: () => model => ({ model }),
  }),
)

const foldDatePickerBasicDemo = Update.foldChild({
  update: DatePicker.update,
  read: (model: UiModel) => Option.some(model.datePickerBasicDemo),
  write: (model, nextDatePickerBasicDemo) =>
    evo(model, { datePickerBasicDemo: () => nextDatePickerBasicDemo }),
  toParentMessage: message =>
    UiMessage.GotDatePickerBasicDemoMessage({ message }),
  foldOutMessage: foldDatePickerBasicDemoOutMessage,
})

const foldDragAndDropDemoOutMessage = M.type<DragAndDrop.OutMessage>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    Reordered:
      ({ itemId, fromContainerId, toContainerId, toIndex }) =>
      model => ({
        model: evo(model, {
          dragAndDropDemoColumns: () =>
            reorderColumns(
              model.dragAndDropDemoColumns,
              itemId,
              fromContainerId,
              toContainerId,
              toIndex,
            ),
        }),
      }),
    Cancelled: () => model => ({ model }),
  }),
)

const foldDragAndDropDemo = Update.foldChild({
  update: DragAndDrop.update,
  read: (model: UiModel) => Option.some(model.dragAndDropDemo),
  write: (model, nextDragAndDropDemo) =>
    evo(model, { dragAndDropDemo: () => nextDragAndDropDemo }),
  toParentMessage: message => UiMessage.GotDragAndDropDemoMessage({ message }),
  foldOutMessage: foldDragAndDropDemoOutMessage,
})

const foldFileDropBasicDemoOutMessage = M.type<FileDrop.OutMessage>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    ReceivedFiles:
      ({ files }) =>
      model => ({
        model: evo(model, {
          fileDropBasicDemoFiles: () => [
            ...model.fileDropBasicDemoFiles,
            ...files,
          ],
        }),
      }),
    RejectedNonFiles: () => model => ({ model }),
  }),
)

const foldFileDropBasicDemo = Update.foldChild({
  update: FileDrop.update,
  read: (model: UiModel) => Option.some(model.fileDropBasicDemo),
  write: (model, nextFileDropBasicDemo) =>
    evo(model, { fileDropBasicDemo: () => nextFileDropBasicDemo }),
  toParentMessage: message =>
    UiMessage.GotFileDropBasicDemoMessage({ message }),
  foldOutMessage: foldFileDropBasicDemoOutMessage,
})

const foldListboxDemoOutMessage = M.type<
  Listbox.OutMessage<ListboxItem>
>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          maybeListboxDemoSelectedItem: () => Option.some(value),
        }),
      }),
  }),
)

const foldListboxDemo = Update.foldChild({
  update: ItemListbox.update,
  read: (model: UiModel) => Option.some(model.listboxDemo),
  write: (model, nextListboxDemo) =>
    evo(model, { listboxDemo: () => nextListboxDemo }),
  toParentMessage: message => UiMessage.GotListboxDemoMessage({ message }),
  foldOutMessage: foldListboxDemoOutMessage,
})

const foldListboxMultiDemoOutMessage: (
  outMessage: Listbox.OutMessage<ListboxItem>,
) => Update.Step<UiModel, UiMessage> = M.type<
  Listbox.OutMessage<ListboxItem>
>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          listboxMultiDemoSelectedItems: () =>
            Array.contains(model.listboxMultiDemoSelectedItems, value)
              ? Array.filter(
                  model.listboxMultiDemoSelectedItems,
                  item => item !== value,
                )
              : Array.append(model.listboxMultiDemoSelectedItems, value),
        }),
      }),
  }),
)

const foldListboxMultiDemo = Update.foldChild({
  update: ItemMultiListbox.update,
  read: (model: UiModel) => Option.some(model.listboxMultiDemo),
  write: (model, nextListboxMultiDemo) =>
    evo(model, { listboxMultiDemo: () => nextListboxMultiDemo }),
  toParentMessage: message => UiMessage.GotListboxMultiDemoMessage({ message }),
  foldOutMessage: foldListboxMultiDemoOutMessage,
})

const foldListboxGroupedDemoOutMessage = M.type<Listbox.OutMessage>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          maybeListboxGroupedDemoSelectedItem: () => Option.some(value),
        }),
      }),
  }),
)

const foldListboxGroupedDemo = Update.foldChild({
  update: CharacterListbox.update,
  read: (model: UiModel) => Option.some(model.listboxGroupedDemo),
  write: (model, nextListboxGroupedDemo) =>
    evo(model, { listboxGroupedDemo: () => nextListboxGroupedDemo }),
  toParentMessage: message =>
    UiMessage.GotListboxGroupedDemoMessage({ message }),
  foldOutMessage: foldListboxGroupedDemoOutMessage,
})

const foldMenuBasicDemo = Update.foldChild({
  update: DemoMenu.update,
  read: (model: UiModel) => Option.some(model.menuBasicDemo),
  write: (model, nextMenuBasicDemo) =>
    evo(model, { menuBasicDemo: () => nextMenuBasicDemo }),
  toParentMessage: message => UiMessage.GotMenuBasicDemoMessage({ message }),
  foldOutMessage: foldMenuOutMessage,
})

const foldMenuAnimatedDemo = Update.foldChild({
  update: DemoMenu.update,
  read: (model: UiModel) => Option.some(model.menuAnimatedDemo),
  write: (model, nextMenuAnimatedDemo) =>
    evo(model, { menuAnimatedDemo: () => nextMenuAnimatedDemo }),
  toParentMessage: message => UiMessage.GotMenuAnimatedDemoMessage({ message }),
  foldOutMessage: foldMenuOutMessage,
})

const foldPopoverBasicDemo = Update.foldChild({
  update: Popover.update,
  read: (model: UiModel) => Option.some(model.popoverBasicDemo),
  write: (model, nextPopoverBasicDemo) =>
    evo(model, { popoverBasicDemo: () => nextPopoverBasicDemo }),
  toParentMessage: message => UiMessage.GotPopoverBasicDemoMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

const foldPopoverAnimatedDemo = Update.foldChild({
  update: Popover.update,
  read: (model: UiModel) => Option.some(model.popoverAnimatedDemo),
  write: (model, nextPopoverAnimatedDemo) =>
    evo(model, { popoverAnimatedDemo: () => nextPopoverAnimatedDemo }),
  toParentMessage: message =>
    UiMessage.GotPopoverAnimatedDemoMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

const foldPopoverNestedParentDemo = Update.foldChild({
  update: Popover.update,
  read: (model: UiModel) => Option.some(model.popoverNestedParentDemo),
  write: (model, nextPopoverNestedParentDemo) =>
    evo(model, { popoverNestedParentDemo: () => nextPopoverNestedParentDemo }),
  toParentMessage: message =>
    UiMessage.GotPopoverNestedParentDemoMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

const foldPopoverNestedChildDemo = Update.foldChild({
  update: Popover.update,
  read: (model: UiModel) => Option.some(model.popoverNestedChildDemo),
  write: (model, nextPopoverNestedChildDemo) =>
    evo(model, { popoverNestedChildDemo: () => nextPopoverNestedChildDemo }),
  toParentMessage: message =>
    UiMessage.GotPopoverNestedChildDemoMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

const foldVerticalRadioGroupDemoOutMessage = M.type<
  RadioGroup.OutMessage<Plan>
>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          verticalRadioGroupDemoValue: () => Option.some(value),
        }),
      }),
  }),
)

const foldVerticalRadioGroupDemo = Update.foldChild({
  update: PlanRadioGroup.update,
  read: (model: UiModel) => Option.some(model.verticalRadioGroupDemo),
  write: (model, nextVerticalRadioGroupDemo) =>
    evo(model, { verticalRadioGroupDemo: () => nextVerticalRadioGroupDemo }),
  toParentMessage: message =>
    UiMessage.GotVerticalRadioGroupDemoMessage({ message }),
  foldOutMessage: foldVerticalRadioGroupDemoOutMessage,
})

const foldHorizontalRadioGroupDemoOutMessage = M.type<
  RadioGroup.OutMessage<Plan>
>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          horizontalRadioGroupDemoValue: () => Option.some(value),
        }),
      }),
  }),
)

const foldHorizontalRadioGroupDemo = Update.foldChild({
  update: PlanRadioGroup.update,
  read: (model: UiModel) => Option.some(model.horizontalRadioGroupDemo),
  write: (model, nextHorizontalRadioGroupDemo) =>
    evo(model, {
      horizontalRadioGroupDemo: () => nextHorizontalRadioGroupDemo,
    }),
  toParentMessage: message =>
    UiMessage.GotHorizontalRadioGroupDemoMessage({ message }),
  foldOutMessage: foldHorizontalRadioGroupDemoOutMessage,
})

const foldSliderRatingDemoOutMessage = M.type<Slider.OutMessage>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    ChangedValue:
      ({ value }) =>
      model => ({ model: evo(model, { sliderRatingValue: () => value }) }),
  }),
)

const foldSliderRatingDemo = Update.foldChild({
  update: Slider.update,
  read: (model: UiModel) => Option.some(model.sliderRatingDemo),
  write: (model, nextSliderRatingDemo) =>
    evo(model, { sliderRatingDemo: () => nextSliderRatingDemo }),
  toParentMessage: message => UiMessage.GotSliderRatingDemoMessage({ message }),
  foldOutMessage: foldSliderRatingDemoOutMessage,
})

const foldSliderVolumeDemoOutMessage = M.type<Slider.OutMessage>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    ChangedValue:
      ({ value }) =>
      model => ({ model: evo(model, { sliderVolumeValue: () => value }) }),
  }),
)

const foldSliderVolumeDemo = Update.foldChild({
  update: Slider.update,
  read: (model: UiModel) => Option.some(model.sliderVolumeDemo),
  write: (model, nextSliderVolumeDemo) =>
    evo(model, { sliderVolumeDemo: () => nextSliderVolumeDemo }),
  toParentMessage: message => UiMessage.GotSliderVolumeDemoMessage({ message }),
  foldOutMessage: foldSliderVolumeDemoOutMessage,
})

const foldHorizontalTabsDemoOutMessage = M.type<
  Tabs.OutMessage<DemoTab>
>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({ model: evo(model, { horizontalTabsDemoTab: () => value }) }),
  }),
)

const foldHorizontalTabsDemo = Update.foldChild({
  update: DemoTabs.update,
  read: (model: UiModel) => Option.some(model.horizontalTabsDemo),
  write: (model, nextHorizontalTabsDemo) =>
    evo(model, { horizontalTabsDemo: () => nextHorizontalTabsDemo }),
  toParentMessage: message =>
    UiMessage.GotHorizontalTabsDemoMessage({ message }),
  foldOutMessage: foldHorizontalTabsDemoOutMessage,
})

const foldVerticalTabsDemoOutMessage = M.type<Tabs.OutMessage<DemoTab>>().pipe(
  M.withReturnType<Update.Step<UiModel, UiMessage>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({ model: evo(model, { verticalTabsDemoTab: () => value }) }),
  }),
)

const foldVerticalTabsDemo = Update.foldChild({
  update: DemoTabs.update,
  read: (model: UiModel) => Option.some(model.verticalTabsDemo),
  write: (model, nextVerticalTabsDemo) =>
    evo(model, { verticalTabsDemo: () => nextVerticalTabsDemo }),
  toParentMessage: message => UiMessage.GotVerticalTabsDemoMessage({ message }),
  foldOutMessage: foldVerticalTabsDemoOutMessage,
})

const foldToastDemo = Update.foldChild({
  update: Toast.update,
  read: (model: UiModel) => Option.some(model.toastDemo),
  write: (model, nextToastDemo) =>
    evo(model, { toastDemo: () => nextToastDemo }),
  toParentMessage: message => UiMessage.GotToastDemoMessage({ message }),
  foldOutMessage: foldToastOutMessage,
})

const foldTooltipBasicDemo = Update.foldChild({
  update: Tooltip.update,
  read: (model: UiModel) => Option.some(model.tooltipBasicDemo),
  write: (model, nextTooltipBasicDemo) =>
    evo(model, { tooltipBasicDemo: () => nextTooltipBasicDemo }),
  toParentMessage: message => UiMessage.GotTooltipBasicDemoMessage({ message }),
  foldOutMessage: foldTooltipOutMessage,
})

const foldTooltipNoDelayDemo = Update.foldChild({
  update: Tooltip.update,
  read: (model: UiModel) => Option.some(model.tooltipNoDelayDemo),
  write: (model, nextTooltipNoDelayDemo) =>
    evo(model, { tooltipNoDelayDemo: () => nextTooltipNoDelayDemo }),
  toParentMessage: message =>
    UiMessage.GotTooltipNoDelayDemoMessage({ message }),
  foldOutMessage: foldTooltipOutMessage,
})

const foldAnimationDemoOutMessage: (
  outMessage: Animation.OutMessage,
  context: Update.FoldContext<Animation.Message, UiMessage>,
) => Update.Step<UiModel, UiMessage> = (outMessage, { liftCommand }) =>
  Animation.OutMessage.match<Update.Step<UiModel, UiMessage>>(outMessage, {
    StartedLeaveAnimating: () => model => ({
      model,
      commands: [
        liftCommand(Animation.defaultLeaveCommand(model.animationDemo)),
      ],
    }),
    TransitionedOut: () => model => ({ model }),
  })

const foldAnimationDemo = Update.foldChild({
  update: Animation.update,
  read: (model: UiModel) => Option.some(model.animationDemo),
  write: (model, nextAnimationDemo) =>
    evo(model, { animationDemo: () => nextAnimationDemo }),
  toParentMessage: message => UiMessage.GotAnimationDemoMessage({ message }),
  foldOutMessage: foldAnimationDemoOutMessage,
})

const foldVirtualListDemo = Update.foldChild({
  update: VirtualList.update,
  read: (model: UiModel) => Option.some(model.virtualListDemo),
  write: (model, nextVirtualListDemo) =>
    evo(model, { virtualListDemo: () => nextVirtualListDemo }),
  toParentMessage: message => UiMessage.GotVirtualListDemoMessage({ message }),
})

const foldVirtualListVariableDemo = Update.foldChild({
  update: VirtualList.update,
  read: (model: UiModel) => Option.some(model.virtualListVariableDemo),
  write: (model, nextVirtualListVariableDemo) =>
    evo(model, { virtualListVariableDemo: () => nextVirtualListVariableDemo }),
  toParentMessage: message =>
    UiMessage.GotVirtualListVariableDemoMessage({ message }),
})

export const uiUpdate = (model: UiModel, message: UiMessage) =>
  UiMessage.match<UiUpdateReturn>(message, {
    ClickedOpenMobileMenu: () => {
      const dialogOpen = Dialog.open(model.mobileMenuDialog)

      return {
        model: evo(model, {
          mobileMenuDialog: () => dialogOpen.model,
        }),
        commands: Command.mapMessages(dialogOpen.commands ?? [], message =>
          UiMessage.GotMobileMenuDialogMessage({ message }),
        ),
      }
    },

    GotMobileMenuDialogMessage: ({ message }) =>
      foldMobileMenuDialog(model, message),

    UpdatedInputDemoValue: ({ value }) => ({
      model: evo(model, { inputDemoValue: () => value }),
    }),

    UpdatedTextareaDemoValue: ({ value }) => ({
      model: evo(model, { textareaDemoValue: () => value }),
    }),

    UpdatedFieldsetInputValue: ({ value }) => ({
      model: evo(model, { fieldsetInputValue: () => value }),
    }),

    UpdatedFieldsetTextareaValue: ({ value }) => ({
      model: evo(model, { fieldsetTextareaValue: () => value }),
    }),

    UpdatedSelectDemoValue: ({ value }) => ({
      model: evo(model, { selectDemoValue: () => value }),
    }),

    ToggledFieldsetCheckboxDemo: ({ isChecked }) => ({
      model: evo(model, {
        isFieldsetCheckboxDemoChecked: () => isChecked,
      }),
    }),

    ClickedButtonDemo: () => ({
      model: evo(model, {
        buttonClickCount: Number.increment,
      }),
    }),

    ToggledCheckboxBasicDemo: ({ isChecked }) => ({
      model: evo(model, {
        isCheckboxBasicDemoChecked: () => isChecked,
      }),
    }),

    ToggledCheckboxAllDemo: ({ isChecked }) => ({
      model: evo(model, {
        isCheckboxOptionADemoChecked: () => isChecked,
        isCheckboxOptionBDemoChecked: () => isChecked,
      }),
    }),

    ToggledCheckboxOptionADemo: ({ isChecked }) => ({
      model: evo(model, {
        isCheckboxOptionADemoChecked: () => isChecked,
      }),
    }),

    ToggledCheckboxOptionBDemo: ({ isChecked }) => ({
      model: evo(model, {
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

    ClickedDeleteProject: () => {
      const dialogOpen = Dialog.open(model.nestedDialogChildDemo)

      return {
        model: evo(model, {
          nestedDialogChildDemo: () => dialogOpen.model,
        }),
        commands: Command.mapMessages(dialogOpen.commands ?? [], message =>
          UiMessage.GotNestedDialogChildDemoMessage({ message }),
        ),
      }
    },

    ClickedOpenDialog: () => {
      const dialogOpen = Dialog.open(model.dialogDemo)

      return {
        model: evo(model, { dialogDemo: () => dialogOpen.model }),
        commands: Command.mapMessages(dialogOpen.commands ?? [], message =>
          UiMessage.GotDialogDemoMessage({ message }),
        ),
      }
    },

    ClickedOpenAnimatedDialog: () => {
      const dialogOpen = Dialog.open(model.dialogAnimatedDemo)

      return {
        model: evo(model, { dialogAnimatedDemo: () => dialogOpen.model }),
        commands: Command.mapMessages(dialogOpen.commands ?? [], message =>
          UiMessage.GotDialogAnimatedDemoMessage({ message }),
        ),
      }
    },

    ClickedEditFilters: () => {
      const dialogOpen = Dialog.open(model.overlayDialogDemo)

      return {
        model: evo(model, { overlayDialogDemo: () => dialogOpen.model }),
        commands: Command.mapMessages(dialogOpen.commands ?? [], message =>
          UiMessage.GotOverlayDialogDemoMessage({ message }),
        ),
      }
    },

    ClickedOpenProjectSettings: () => {
      const dialogOpen = Dialog.open(model.nestedDialogParentDemo)

      return {
        model: evo(model, {
          nestedDialogParentDemo: () => dialogOpen.model,
        }),
        commands: Command.mapMessages(dialogOpen.commands ?? [], message =>
          UiMessage.GotNestedDialogParentDemoMessage({ message }),
        ),
      }
    },

    ToggledDisclosureBasicDemo: ({ isOpen }) => ({
      model: evo(model, {
        isDisclosureBasicDemoOpen: () => isOpen,
      }),
    }),

    ToggledDisclosureAnimatedDemo: ({ isOpen }) => ({
      model: evo(model, {
        isDisclosureAnimatedDemoOpen: () => isOpen,
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
      model: evo(model, {
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
      model: evo(model, {
        isSwitchDemoChecked: () => isChecked,
      }),
    }),

    GotHorizontalTabsDemoMessage: ({ message }) =>
      foldHorizontalTabsDemo(model, message),

    GotVerticalTabsDemoMessage: ({ message }) =>
      foldVerticalTabsDemo(model, message),

    GotToastDemoMessage: ({ message }) => foldToastDemo(model, message),

    ClickedShowInfoToast: () => {
      const toastShow = Toast.show(model.toastDemo, {
        variant: 'Info',
        payload: {
          title: 'Changes saved',
          maybeDescription: Option.some('Your preferences have been updated.'),
        },
      })

      return {
        model: evo(model, { toastDemo: () => toastShow.model }),
        commands: Command.mapMessages(toastShow.commands ?? [], message =>
          UiMessage.GotToastDemoMessage({ message }),
        ),
      }
    },

    ClickedShowSuccessToast: () => {
      const toastShow = Toast.show(model.toastDemo, {
        variant: 'Success',
        payload: {
          title: 'Uploaded successfully',
          maybeDescription: Option.some('kit-manual.pdf is now available.'),
        },
      })

      return {
        model: evo(model, { toastDemo: () => toastShow.model }),
        commands: Command.mapMessages(toastShow.commands ?? [], message =>
          UiMessage.GotToastDemoMessage({ message }),
        ),
      }
    },

    ClickedShowWarningToast: () => {
      const toastShow = Toast.show(model.toastDemo, {
        variant: 'Warning',
        payload: {
          title: 'Network slow',
          maybeDescription: Option.some(
            'Some assets are loading over a weak connection.',
          ),
        },
      })

      return {
        model: evo(model, { toastDemo: () => toastShow.model }),
        commands: Command.mapMessages(toastShow.commands ?? [], message =>
          UiMessage.GotToastDemoMessage({ message }),
        ),
      }
    },

    ClickedShowErrorToast: () => {
      const toastShow = Toast.show(model.toastDemo, {
        variant: 'Error',
        payload: {
          title: 'Failed to save',
          maybeDescription: Option.some('Check your connection and try again.'),
        },
      })

      return {
        model: evo(model, { toastDemo: () => toastShow.model }),
        commands: Command.mapMessages(toastShow.commands ?? [], message =>
          UiMessage.GotToastDemoMessage({ message }),
        ),
      }
    },

    ClickedShowStickyToast: () => {
      const toastShow = Toast.show(model.toastDemo, {
        variant: 'Info',
        payload: {
          title: 'Review pending',
          maybeDescription: Option.some(
            'Action required. This stays until dismissed.',
          ),
        },
        sticky: true,
      })

      return {
        model: evo(model, { toastDemo: () => toastShow.model }),
        commands: Command.mapMessages(toastShow.commands ?? [], message =>
          UiMessage.GotToastDemoMessage({ message }),
        ),
      }
    },

    ClickedDismissAllToasts: () => {
      const toastsDismiss = Toast.dismissAll(model.toastDemo)

      return {
        model: evo(model, { toastDemo: () => toastsDismiss.model }),
        commands: Command.mapMessages(toastsDismiss.commands ?? [], message =>
          UiMessage.GotToastDemoMessage({ message }),
        ),
      }
    },

    GotTooltipBasicDemoMessage: ({ message }) =>
      foldTooltipBasicDemo(model, message),

    GotTooltipNoDelayDemoMessage: ({ message }) =>
      foldTooltipNoDelayDemo(model, message),

    GotAnimationDemoMessage: ({ message }) => foldAnimationDemo(model, message),

    ToggledAnimationDemo: () => {
      const nextShowing = !model.isAnimationDemoShowing
      return foldAnimationDemo(
        evo(model, { isAnimationDemoShowing: () => nextShowing }),
        nextShowing ? AnimationMessage.Showed() : AnimationMessage.Hid(),
      )
    },

    GotVirtualListDemoMessage: ({ message }) =>
      foldVirtualListDemo(model, message),

    ClickedVirtualListScrollToMiddle: () => {
      const virtualListScroll = VirtualList.scrollToIndex(
        model.virtualListDemo,
        Math.floor(VIRTUAL_LIST_ROW_COUNT / 2),
      )

      return {
        model: evo(model, {
          virtualListDemo: () => virtualListScroll.model,
        }),
        commands: Command.mapMessages(
          virtualListScroll.commands ?? [],
          message => UiMessage.GotVirtualListDemoMessage({ message }),
        ),
      }
    },

    GotVirtualListVariableDemoMessage: ({ message }) =>
      foldVirtualListVariableDemo(model, message),

    ClickedVirtualListVariableScrollToMiddle: () => {
      const virtualListScroll = VirtualList.scrollToIndexVariable(
        model.virtualListVariableDemo,
        variableActivities,
        variableRowHeightPx,
        Math.floor(VIRTUAL_LIST_ROW_COUNT / 2),
      )

      return {
        model: evo(model, {
          virtualListVariableDemo: () => virtualListScroll.model,
        }),
        commands: Command.mapMessages(
          virtualListScroll.commands ?? [],
          message => UiMessage.GotVirtualListVariableDemoMessage({ message }),
        ),
      }
    },
  })
