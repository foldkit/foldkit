import { Option } from 'effect'
import { Calendar, Command } from 'foldkit'

import {
  Animation,
  Combobox,
  DatePicker,
  Dialog,
  DragAndDrop,
  FileDrop,
  Listbox,
  Menu,
  Popover,
  Slider,
  Tabs,
  Tooltip,
  Calendar as UiCalendar,
  VirtualList,
} from '@foldkit/ui'

import type { Message } from './message'
import type { Model } from './model'
import { Toast } from './toastModule'

export type InitReturn = [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (today: Calendar.CalendarDate): InitReturn => [
  {
    buttonClickCount: 0,
    inputDemoValue: '',
    textareaDemoValue: '',
    fieldsetInputValue: '',
    fieldsetTextareaValue: '',
    isFieldsetCheckboxDemoChecked: false,
    calendarBasicDemo: UiCalendar.init({
      id: 'calendar-basic-demo',
      today,
      minDate: Calendar.subtractYears(today, 1),
      maxDate: Calendar.addYears(today, 1),
    }),
    maybeCalendarBasicDemoSelectedDate: Option.none(),
    datePickerBasicDemo: DatePicker.init({
      id: 'date-picker-basic-demo',
      today,
      minDate: Calendar.subtractYears(today, 1),
      maxDate: Calendar.addYears(today, 1),
    }),
    maybeDatePickerBasicDemoSelectedDate: Option.none(),
    isCheckboxBasicDemoChecked: false,
    isCheckboxOptionADemoChecked: false,
    isCheckboxOptionBDemoChecked: false,
    comboboxDemo: Combobox.init({ id: 'combobox-demo' }),
    maybeComboboxDemoSelectedCity: Option.none(),
    comboboxNullableDemo: Combobox.init({
      id: 'combobox-nullable-demo',
      nullable: true,
    }),
    maybeComboboxNullableDemoSelectedCity: Option.none(),
    comboboxMultiDemo: Combobox.Multi.init({
      id: 'combobox-multi-demo',
    }),
    comboboxMultiDemoSelectedCities: [],
    comboboxSelectOnFocusDemo: Combobox.init({
      id: 'combobox-select-on-focus-demo',
      selectInputOnFocus: true,
    }),
    maybeComboboxSelectOnFocusDemoSelectedCity: Option.none(),
    dialogDemo: Dialog.init({ id: 'dialog-demo' }),
    dialogAnimatedDemo: Dialog.init({
      id: 'dialog-animated-demo',
      isAnimated: true,
    }),
    overlayDialogDemo: Dialog.init({ id: 'overlay-dialog-demo' }),
    overlayComboboxDemo: Combobox.init({ id: 'overlay-combobox-demo' }),
    maybeOverlayComboboxDemoSelectedCity: Option.none(),
    nestedDialogParentDemo: Dialog.init({
      id: 'nested-dialog-parent-demo',
    }),
    nestedDialogChildDemo: Dialog.init({ id: 'nested-dialog-child-demo' }),
    isDisclosureDemoOpen: false,
    listboxDemo: Listbox.init({ id: 'listbox-demo' }),
    maybeListboxDemoSelectedItem: Option.none(),
    listboxMultiDemo: Listbox.Multi.init({
      id: 'listbox-multi-demo',
    }),
    listboxMultiDemoSelectedItems: [],
    listboxGroupedDemo: Listbox.init({
      id: 'listbox-grouped-demo',
    }),
    maybeListboxGroupedDemoSelectedItem: Option.none(),
    menuBasicDemo: Menu.init({ id: 'menu-basic-demo' }),
    menuAnimatedDemo: Menu.init({
      id: 'menu-animated-demo',
      isAnimated: true,
    }),
    popoverBasicDemo: Popover.init({ id: 'popover-basic-demo' }),
    popoverAnimatedDemo: Popover.init({
      id: 'popover-animated-demo',
      isAnimated: true,
    }),
    popoverNestedParentDemo: Popover.init({
      id: 'popover-nested-parent-demo',
      contentFocus: true,
    }),
    popoverNestedChildDemo: Popover.init({
      id: 'popover-nested-child-demo',
    }),
    verticalRadioGroupDemoValue: Option.none(),
    horizontalRadioGroupDemoValue: Option.none(),
    selectDemoValue: 'us',
    sliderRatingDemo: Slider.init({
      id: 'slider-rating-demo',
      min: 0,
      max: 10,
      step: 1,
    }),
    sliderRatingValue: 3,
    sliderVolumeDemo: Slider.init({
      id: 'slider-volume-demo',
      min: 0,
      max: 1,
      step: 0.05,
    }),
    sliderVolumeValue: 0.5,
    isSwitchDemoChecked: false,
    horizontalTabsDemo: Tabs.init({ id: 'horizontal-tabs-demo' }),
    horizontalTabsDemoTab: 'Foldkit',
    verticalTabsDemo: Tabs.init({
      id: 'vertical-tabs-demo',
    }),
    verticalTabsDemoTab: 'Foldkit',
    dragAndDropDemo: DragAndDrop.init({
      id: 'drag-and-drop-demo',
    }),
    fileDropBasicDemo: FileDrop.init({ id: 'file-drop-basic-demo' }),
    fileDropBasicDemoFiles: [],
    toastDemo: Toast.init({ id: 'toast-demo' }),
    maybeLastDismissedToastTitle: Option.none(),
    tooltipDemo: Tooltip.init({ id: 'tooltip-demo' }),
    animationDemo: Animation.init({ id: 'animation-demo' }),
    virtualListDemo: VirtualList.init({
      id: 'virtual-list-demo',
      rowHeightPx: 56,
    }),
    virtualListVariableDemo: VirtualList.init({
      id: 'virtual-list-variable-demo',
      rowHeightPx: 56,
    }),
    dragAndDropDemoColumns: [
      {
        id: 'backlog',
        label: 'Backlog',
        cards: [
          { id: 'card-1', label: 'Design API' },
          { id: 'card-2', label: 'Write tests' },
          { id: 'card-3', label: 'Build docs' },
        ],
      },
      {
        id: 'done',
        label: 'Done',
        cards: [
          { id: 'card-4', label: 'Set up repo' },
          { id: 'card-5', label: 'Add CI' },
        ],
      },
    ],
  },
  [],
]
