import { Calendar, Command } from 'foldkit'

import {
  Animation,
  Checkbox,
  Combobox,
  DatePicker,
  Dialog,
  Disclosure,
  DragAndDrop,
  FileDrop,
  Listbox,
  Menu,
  Popover,
  RadioGroup,
  Slider,
  Switch,
  Tabs,
  Tooltip,
  Calendar as UiCalendar,
  VirtualList,
} from '@foldkit/ui'

import type { UiMessage } from './message'
import type { UiModel } from './model'
import { Toast } from './toast'

export const uiInit = (
  today: Calendar.CalendarDate,
): [UiModel, ReadonlyArray<Command.Command<UiMessage>>] => [
  {
    mobileMenuDialog: Dialog.init({ id: 'mobile-menu' }),
    buttonClickCount: 0,
    inputDemoValue: '',
    textareaDemoValue: '',
    fieldsetInputValue: '',
    fieldsetTextareaValue: '',
    fieldsetCheckboxDemo: Checkbox.init({
      id: 'fieldset-checkbox-demo',
    }),
    calendarBasicDemo: UiCalendar.init({
      id: 'calendar-basic-demo',
      today,
      minDate: Calendar.subtractYears(today, 1),
      maxDate: Calendar.addYears(today, 1),
    }),
    datePickerBasicDemo: DatePicker.init({
      id: 'date-picker-basic-demo',
      today,
      minDate: Calendar.subtractYears(today, 1),
      maxDate: Calendar.addYears(today, 1),
    }),
    checkboxBasicDemo: Checkbox.init({ id: 'checkbox-basic-demo' }),
    checkboxOptionADemo: Checkbox.init({
      id: 'checkbox-option-a-demo',
    }),
    checkboxOptionBDemo: Checkbox.init({
      id: 'checkbox-option-b-demo',
    }),
    comboboxDemo: Combobox.init({ id: 'combobox-demo' }),
    comboboxNullableDemo: Combobox.init({
      id: 'combobox-nullable-demo',
      nullable: true,
    }),
    comboboxMultiDemo: Combobox.Multi.init({
      id: 'combobox-multi-demo',
    }),
    comboboxSelectOnFocusDemo: Combobox.init({
      id: 'combobox-select-on-focus-demo',
      selectInputOnFocus: true,
    }),
    dialogDemo: Dialog.init({ id: 'dialog-demo' }),
    dialogAnimatedDemo: Dialog.init({
      id: 'dialog-animated-demo',
      isAnimated: true,
    }),
    overlayDialogDemo: Dialog.init({ id: 'overlay-dialog-demo' }),
    overlayComboboxDemo: Combobox.init({ id: 'overlay-combobox-demo' }),
    nestedDialogParentDemo: Dialog.init({
      id: 'nested-dialog-parent-demo',
    }),
    nestedDialogChildDemo: Dialog.init({ id: 'nested-dialog-child-demo' }),
    disclosureBasicDemo: Disclosure.init({ id: 'disclosure-basic-demo' }),
    disclosureAnimatedDemo: Disclosure.init({
      id: 'disclosure-animated-demo',
    }),
    dragAndDropDemo: DragAndDrop.init({ id: 'drag-and-drop-demo' }),
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
    fileDropBasicDemo: FileDrop.init({ id: 'file-drop-basic-demo' }),
    fileDropBasicDemoFiles: [],
    listboxDemo: Listbox.init({ id: 'listbox-demo' }),
    listboxMultiDemo: Listbox.Multi.init({
      id: 'listbox-multi-demo',
    }),
    listboxGroupedDemo: Listbox.init({
      id: 'listbox-grouped-demo',
    }),
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
    verticalRadioGroupDemo: RadioGroup.init({
      id: 'vertical-radio-group-demo',
    }),
    horizontalRadioGroupDemo: RadioGroup.init({
      id: 'horizontal-radio-group-demo',
      orientation: 'Horizontal',
    }),
    selectDemoValue: 'us',
    sliderRatingDemo: Slider.init({
      id: 'slider-rating-demo',
      min: 0,
      max: 10,
      step: 1,
      initialValue: 3,
    }),
    sliderVolumeDemo: Slider.init({
      id: 'slider-volume-demo',
      min: 0,
      max: 1,
      step: 0.05,
      initialValue: 0.5,
    }),
    switchDemo: Switch.init({ id: 'switch-demo' }),
    horizontalTabsDemo: Tabs.init({ id: 'horizontal-tabs-demo' }),
    verticalTabsDemo: Tabs.init({
      id: 'vertical-tabs-demo',
    }),
    toastDemo: Toast.init({ id: 'toast-demo' }),
    tooltipBasicDemo: Tooltip.init({ id: 'tooltip-basic-demo' }),
    tooltipNoDelayDemo: Tooltip.init({
      id: 'tooltip-no-delay-demo',
      showDelay: 0,
    }),
    animationDemo: Animation.init({ id: 'animation-demo' }),
    isAnimationDemoShowing: false,
    virtualListDemo: VirtualList.init({
      id: 'virtual-list-demo',
      rowHeightPx: 56,
    }),
    virtualListVariableDemo: VirtualList.init({
      id: 'virtual-list-variable-demo',
      rowHeightPx: 56,
    }),
  },
  [],
]
