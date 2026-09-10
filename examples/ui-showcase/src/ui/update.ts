import { Array, Number, Option, pipe } from 'effect'
import { Update } from 'foldkit'
import { evo } from 'foldkit/struct'

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

const DemoMenu = Menu.create<string>()

const foldDialogOutMessage = Dialog.OutMessage.match<
  Update.Step<UiModel, UiMessage>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({ model }),
})

const foldMenuOutMessage = Menu.OutMessage.match<
  Update.Step<UiModel, UiMessage>,
  Menu.OutMessage<string>
>({
  Selected: () => model => ({ model }),
})

const foldPopoverOutMessage = Popover.OutMessage.match<
  Update.Step<UiModel, UiMessage>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({ model }),
})

const foldToastOutMessage = Toast.OutMessage.match<
  Update.Step<UiModel, UiMessage>
>({
  DismissedToast: () => model => ({ model }),
})

const foldTooltipOutMessage = Tooltip.OutMessage.match<
  Update.Step<UiModel, UiMessage>
>({
  Shown: () => model => ({ model }),
  Hidden: () => model => ({ model }),
})

const foldHoverIntentOutMessage = HoverIntent.OutMessage.match<
  Update.Step<UiModel, UiMessage>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({ model }),
})

const foldMobileMenuDialog = Update.foldChild({
  update: Dialog.update,
  read: (model: UiModel) => Option.some(model.mobileMenuDialog),
  write: (model, nextMobileMenuDialog) =>
    evo(model, { mobileMenuDialog: () => nextMobileMenuDialog }),
  toParentMessage: message => UiMessage.GotMobileMenuDialogMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldMobileMenuDialogOpen = Update.foldChildStep({
  update: Dialog.open,
  read: (model: UiModel) => Option.some(model.mobileMenuDialog),
  write: (model, nextMobileMenuDialog) =>
    evo(model, { mobileMenuDialog: () => nextMobileMenuDialog }),
  toParentMessage: message => UiMessage.GotMobileMenuDialogMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldMobileMenuDialogClose = Update.foldChildStep({
  update: Dialog.close,
  read: (model: UiModel) => Option.some(model.mobileMenuDialog),
  write: (model, nextMobileMenuDialog) =>
    evo(model, { mobileMenuDialog: () => nextMobileMenuDialog }),
  toParentMessage: message => UiMessage.GotMobileMenuDialogMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldComboboxDemoOutMessage = Combobox.OutMessage.match<
  Update.Step<UiModel, UiMessage>,
  Combobox.OutMessage<City>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: evo(model, {
        maybeComboboxDemoSelectedCity: () => Option.some(value),
      }),
    }),
  ClearedSelection: () => model => ({ model }),
})

const foldComboboxDemo = Update.foldChild({
  update: CityCombobox.update,
  read: (model: UiModel) => Option.some(model.comboboxDemo),
  write: (model, nextComboboxDemo) =>
    evo(model, { comboboxDemo: () => nextComboboxDemo }),
  toParentMessage: message => UiMessage.GotComboboxDemoMessage({ message }),
  foldOutMessage: foldComboboxDemoOutMessage,
})

const foldComboboxNullableDemoOutMessage = Combobox.OutMessage.match<
  Update.Step<UiModel, UiMessage>,
  Combobox.OutMessage<City>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: evo(model, {
        maybeComboboxNullableDemoSelectedCity:
          maybeComboboxNullableDemoSelectedCity =>
            Option.contains(maybeComboboxNullableDemoSelectedCity, value)
              ? Option.none()
              : Option.some(value),
      }),
    }),
  ClearedSelection: () => model => ({
    model: evo(model, {
      maybeComboboxNullableDemoSelectedCity: () => Option.none(),
    }),
  }),
})

const foldComboboxNullableDemo = Update.foldChild({
  update: CityCombobox.update,
  read: (model: UiModel) => Option.some(model.comboboxNullableDemo),
  write: (model, nextComboboxNullableDemo) =>
    evo(model, { comboboxNullableDemo: () => nextComboboxNullableDemo }),
  toParentMessage: message =>
    UiMessage.GotComboboxNullableDemoMessage({ message }),
  foldOutMessage: foldComboboxNullableDemoOutMessage,
})

const foldComboboxMultiDemoOutMessage = Combobox.OutMessage.match<
  Update.Step<UiModel, UiMessage>,
  Combobox.OutMessage<City>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: evo(model, {
        comboboxMultiDemoSelectedCities: comboboxMultiDemoSelectedCities =>
          Array.contains(comboboxMultiDemoSelectedCities, value)
            ? Array.filter(
                comboboxMultiDemoSelectedCities,
                city => city !== value,
              )
            : Array.append(comboboxMultiDemoSelectedCities, value),
      }),
    }),
  ClearedSelection: () => model => ({ model }),
})

const foldComboboxMultiDemo = Update.foldChild({
  update: CityMultiCombobox.update,
  read: (model: UiModel) => Option.some(model.comboboxMultiDemo),
  write: (model, nextComboboxMultiDemo) =>
    evo(model, { comboboxMultiDemo: () => nextComboboxMultiDemo }),
  toParentMessage: message =>
    UiMessage.GotComboboxMultiDemoMessage({ message }),
  foldOutMessage: foldComboboxMultiDemoOutMessage,
})

const foldComboboxPlacementLockDemoOutMessage = Combobox.OutMessage.match<
  Update.Step<UiModel, UiMessage>,
  Combobox.OutMessage<City>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: evo(model, {
        maybeComboboxPlacementLockDemoSelectedCity: () => Option.some(value),
      }),
    }),
  ClearedSelection: () => model => ({ model }),
})

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

const foldComboboxSelectOnFocusDemoOutMessage = Combobox.OutMessage.match<
  Update.Step<UiModel, UiMessage>,
  Combobox.OutMessage<City>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: evo(model, {
        maybeComboboxSelectOnFocusDemoSelectedCity: () => Option.some(value),
      }),
    }),
  ClearedSelection: () => model => ({ model }),
})

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

const foldDialogDemoOpen = Update.foldChildStep({
  update: Dialog.open,
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

const foldDialogAnimatedDemoOpen = Update.foldChildStep({
  update: Dialog.open,
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

const foldOverlayDialogDemoOpen = Update.foldChildStep({
  update: Dialog.open,
  read: (model: UiModel) => Option.some(model.overlayDialogDemo),
  write: (model, nextOverlayDialogDemo) =>
    evo(model, { overlayDialogDemo: () => nextOverlayDialogDemo }),
  toParentMessage: message =>
    UiMessage.GotOverlayDialogDemoMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldOverlayComboboxDemoOutMessage = Combobox.OutMessage.match<
  Update.Step<UiModel, UiMessage>,
  Combobox.OutMessage<City>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: evo(model, {
        maybeOverlayComboboxDemoSelectedCity: () => Option.some(value),
      }),
    }),
  ClearedSelection: () => model => ({ model }),
})

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

const foldNestedDialogParentDemoOpen = Update.foldChildStep({
  update: Dialog.open,
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

const foldNestedDialogChildDemoOpen = Update.foldChildStep({
  update: Dialog.open,
  read: (model: UiModel) => Option.some(model.nestedDialogChildDemo),
  write: (model, nextNestedDialogChildDemo) =>
    evo(model, { nestedDialogChildDemo: () => nextNestedDialogChildDemo }),
  toParentMessage: message =>
    UiMessage.GotNestedDialogChildDemoMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

const foldCalendarBasicDemoOutMessage = Calendar.OutMessage.match<
  Update.Step<UiModel, UiMessage>
>({
  SelectedDate:
    ({ date }) =>
    model => ({
      model: evo(model, {
        maybeCalendarBasicDemoSelectedDate: () => Option.some(date),
      }),
    }),
  ChangedViewMonth: () => model => ({ model }),
})

const foldCalendarBasicDemo = Update.foldChild({
  update: Calendar.update,
  read: (model: UiModel) => Option.some(model.calendarBasicDemo),
  write: (model, nextCalendarBasicDemo) =>
    evo(model, { calendarBasicDemo: () => nextCalendarBasicDemo }),
  toParentMessage: message =>
    UiMessage.GotCalendarBasicDemoMessage({ message }),
  foldOutMessage: foldCalendarBasicDemoOutMessage,
})

const foldDatePickerBasicDemoOutMessage = DatePicker.OutMessage.match<
  Update.Step<UiModel, UiMessage>
>({
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
})

const foldDatePickerBasicDemo = Update.foldChild({
  update: DatePicker.update,
  read: (model: UiModel) => Option.some(model.datePickerBasicDemo),
  write: (model, nextDatePickerBasicDemo) =>
    evo(model, { datePickerBasicDemo: () => nextDatePickerBasicDemo }),
  toParentMessage: message =>
    UiMessage.GotDatePickerBasicDemoMessage({ message }),
  foldOutMessage: foldDatePickerBasicDemoOutMessage,
})

const foldDragAndDropDemoOutMessage = DragAndDrop.OutMessage.match<
  Update.Step<UiModel, UiMessage>
>({
  Reordered:
    ({ itemId, fromContainerId, toContainerId, toIndex }) =>
    model => ({
      model: evo(model, {
        dragAndDropDemoColumns: dragAndDropDemoColumns =>
          reorderColumns(
            dragAndDropDemoColumns,
            itemId,
            fromContainerId,
            toContainerId,
            toIndex,
          ),
      }),
    }),
  Cancelled: () => model => ({ model }),
})

const foldDragAndDropDemo = Update.foldChild({
  update: DragAndDrop.update,
  read: (model: UiModel) => Option.some(model.dragAndDropDemo),
  write: (model, nextDragAndDropDemo) =>
    evo(model, { dragAndDropDemo: () => nextDragAndDropDemo }),
  toParentMessage: message => UiMessage.GotDragAndDropDemoMessage({ message }),
  foldOutMessage: foldDragAndDropDemoOutMessage,
})

const foldFileDropBasicDemoOutMessage = FileDrop.OutMessage.match<
  Update.Step<UiModel, UiMessage>
>({
  ReceivedFiles:
    ({ files }) =>
    model => ({
      model: evo(model, {
        fileDropBasicDemoFiles: Array.appendAll(files),
      }),
    }),
  RejectedNonFiles: () => model => ({ model }),
})

const foldFileDropBasicDemo = Update.foldChild({
  update: FileDrop.update,
  read: (model: UiModel) => Option.some(model.fileDropBasicDemo),
  write: (model, nextFileDropBasicDemo) =>
    evo(model, { fileDropBasicDemo: () => nextFileDropBasicDemo }),
  toParentMessage: message =>
    UiMessage.GotFileDropBasicDemoMessage({ message }),
  foldOutMessage: foldFileDropBasicDemoOutMessage,
})

const foldListboxDemoOutMessage = Listbox.OutMessage.match<
  Update.Step<UiModel, UiMessage>,
  Listbox.OutMessage<ListboxItem>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: evo(model, {
        maybeListboxDemoSelectedItem: () => Option.some(value),
      }),
    }),
})

const foldListboxDemo = Update.foldChild({
  update: ItemListbox.update,
  read: (model: UiModel) => Option.some(model.listboxDemo),
  write: (model, nextListboxDemo) =>
    evo(model, { listboxDemo: () => nextListboxDemo }),
  toParentMessage: message => UiMessage.GotListboxDemoMessage({ message }),
  foldOutMessage: foldListboxDemoOutMessage,
})

const foldListboxMultiDemoOutMessage = Listbox.OutMessage.match<
  Update.Step<UiModel, UiMessage>,
  Listbox.OutMessage<ListboxItem>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: evo(model, {
        listboxMultiDemoSelectedItems: listboxMultiDemoSelectedItems =>
          Array.contains(listboxMultiDemoSelectedItems, value)
            ? Array.filter(
                listboxMultiDemoSelectedItems,
                item => item !== value,
              )
            : Array.append(listboxMultiDemoSelectedItems, value),
      }),
    }),
})

const foldListboxMultiDemo = Update.foldChild({
  update: ItemMultiListbox.update,
  read: (model: UiModel) => Option.some(model.listboxMultiDemo),
  write: (model, nextListboxMultiDemo) =>
    evo(model, { listboxMultiDemo: () => nextListboxMultiDemo }),
  toParentMessage: message => UiMessage.GotListboxMultiDemoMessage({ message }),
  foldOutMessage: foldListboxMultiDemoOutMessage,
})

const foldListboxGroupedDemoOutMessage = Listbox.OutMessage.match<
  Update.Step<UiModel, UiMessage>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: evo(model, {
        maybeListboxGroupedDemoSelectedItem: () => Option.some(value),
      }),
    }),
})

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

const foldVerticalRadioGroupDemoOutMessage = RadioGroup.OutMessage.match<
  Update.Step<UiModel, UiMessage>,
  RadioGroup.OutMessage<Plan>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: evo(model, {
        verticalRadioGroupDemoValue: () => Option.some(value),
      }),
    }),
})

const foldVerticalRadioGroupDemo = Update.foldChild({
  update: PlanRadioGroup.update,
  read: (model: UiModel) => Option.some(model.verticalRadioGroupDemo),
  write: (model, nextVerticalRadioGroupDemo) =>
    evo(model, { verticalRadioGroupDemo: () => nextVerticalRadioGroupDemo }),
  toParentMessage: message =>
    UiMessage.GotVerticalRadioGroupDemoMessage({ message }),
  foldOutMessage: foldVerticalRadioGroupDemoOutMessage,
})

const foldHorizontalRadioGroupDemoOutMessage = RadioGroup.OutMessage.match<
  Update.Step<UiModel, UiMessage>,
  RadioGroup.OutMessage<Plan>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: evo(model, {
        horizontalRadioGroupDemoValue: () => Option.some(value),
      }),
    }),
})

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

const foldSliderRatingDemoOutMessage = Slider.OutMessage.match<
  Update.Step<UiModel, UiMessage>
>({
  ChangedValue:
    ({ value }) =>
    model => ({ model: evo(model, { sliderRatingValue: () => value }) }),
})

const foldSliderRatingDemo = Update.foldChild({
  update: Slider.update,
  read: (model: UiModel) => Option.some(model.sliderRatingDemo),
  write: (model, nextSliderRatingDemo) =>
    evo(model, { sliderRatingDemo: () => nextSliderRatingDemo }),
  toParentMessage: message => UiMessage.GotSliderRatingDemoMessage({ message }),
  foldOutMessage: foldSliderRatingDemoOutMessage,
})

const foldSliderVolumeDemoOutMessage = Slider.OutMessage.match<
  Update.Step<UiModel, UiMessage>
>({
  ChangedValue:
    ({ value }) =>
    model => ({ model: evo(model, { sliderVolumeValue: () => value }) }),
})

const foldSliderVolumeDemo = Update.foldChild({
  update: Slider.update,
  read: (model: UiModel) => Option.some(model.sliderVolumeDemo),
  write: (model, nextSliderVolumeDemo) =>
    evo(model, { sliderVolumeDemo: () => nextSliderVolumeDemo }),
  toParentMessage: message => UiMessage.GotSliderVolumeDemoMessage({ message }),
  foldOutMessage: foldSliderVolumeDemoOutMessage,
})

const foldHorizontalTabsDemoOutMessage = Tabs.OutMessage.match<
  Update.Step<UiModel, UiMessage>,
  Tabs.OutMessage<DemoTab>
>({
  Selected:
    ({ value }) =>
    model => ({ model: evo(model, { horizontalTabsDemoTab: () => value }) }),
})

const foldHorizontalTabsDemo = Update.foldChild({
  update: DemoTabs.update,
  read: (model: UiModel) => Option.some(model.horizontalTabsDemo),
  write: (model, nextHorizontalTabsDemo) =>
    evo(model, { horizontalTabsDemo: () => nextHorizontalTabsDemo }),
  toParentMessage: message =>
    UiMessage.GotHorizontalTabsDemoMessage({ message }),
  foldOutMessage: foldHorizontalTabsDemoOutMessage,
})

const foldVerticalTabsDemoOutMessage = Tabs.OutMessage.match<
  Update.Step<UiModel, UiMessage>,
  Tabs.OutMessage<DemoTab>
>({
  Selected:
    ({ value }) =>
    model => ({ model: evo(model, { verticalTabsDemoTab: () => value }) }),
})

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

const foldToastDemoShow = Update.foldChild({
  update: Toast.show,
  read: (model: UiModel) => Option.some(model.toastDemo),
  write: (model, nextToastDemo) =>
    evo(model, { toastDemo: () => nextToastDemo }),
  toParentMessage: message => UiMessage.GotToastDemoMessage({ message }),
  foldOutMessage: foldToastOutMessage,
})

const foldToastDemoDismissAll = Update.foldChildStep({
  update: Toast.dismissAll,
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

const foldHoverIntentDemo = Update.foldChild({
  update: HoverIntent.update,
  read: (model: UiModel) => Option.some(model.hoverIntentDemo),
  write: (model, nextHoverIntentDemo) =>
    evo(model, { hoverIntentDemo: () => nextHoverIntentDemo }),
  toParentMessage: message => UiMessage.GotHoverIntentDemoMessage({ message }),
  foldOutMessage: foldHoverIntentOutMessage,
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

const foldAnimationDemoShow = Update.foldChildStep({
  update: Animation.show,
  read: (model: UiModel) => Option.some(model.animationDemo),
  write: (model, nextAnimationDemo) =>
    evo(model, { animationDemo: () => nextAnimationDemo }),
  toParentMessage: message => UiMessage.GotAnimationDemoMessage({ message }),
})

const foldAnimationDemoHide = Update.foldChildStep({
  update: Animation.hide,
  read: (model: UiModel) => Option.some(model.animationDemo),
  write: (model, nextAnimationDemo) =>
    evo(model, { animationDemo: () => nextAnimationDemo }),
  toParentMessage: message => UiMessage.GotAnimationDemoMessage({ message }),
})

const foldVirtualListDemo = Update.foldChild({
  update: VirtualList.update,
  read: (model: UiModel) => Option.some(model.virtualListDemo),
  write: (model, nextVirtualListDemo) =>
    evo(model, { virtualListDemo: () => nextVirtualListDemo }),
  toParentMessage: message => UiMessage.GotVirtualListDemoMessage({ message }),
})

const foldVirtualListDemoScrollToIndex = Update.foldChild({
  update: VirtualList.scrollToIndex,
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

const foldVirtualListVariableDemoScrollToIndex = Update.foldChild({
  update: (virtualList: VirtualList.Model, index: number) =>
    VirtualList.scrollToIndexVariable(
      virtualList,
      variableActivities,
      variableRowHeightPx,
      index,
    ),
  read: (model: UiModel) => Option.some(model.virtualListVariableDemo),
  write: (model, nextVirtualListVariableDemo) =>
    evo(model, { virtualListVariableDemo: () => nextVirtualListVariableDemo }),
  toParentMessage: message =>
    UiMessage.GotVirtualListVariableDemoMessage({ message }),
})

export const uiUpdate = (model: UiModel, message: UiMessage) =>
  UiMessage.match<Update.Return<UiModel, UiMessage>>(message, {
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

    ClickedDeleteProject: () => foldNestedDialogChildDemoOpen(model),

    ClickedOpenDialog: () => foldDialogDemoOpen(model),

    ClickedOpenAnimatedDialog: () => foldDialogAnimatedDemoOpen(model),

    ClickedEditFilters: () => foldOverlayDialogDemoOpen(model),

    ClickedOpenProjectSettings: () => foldNestedDialogParentDemoOpen(model),

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
  })

export const openMobileMenu = (model: UiModel) =>
  foldMobileMenuDialogOpen(model)

export const closeMobileMenu = (model: UiModel) =>
  foldMobileMenuDialogClose(model)
