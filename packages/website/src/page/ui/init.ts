import { Calendar, Command, Ui } from 'foldkit'

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
    fieldsetCheckboxDemo: Ui.Checkbox.init({
      id: 'fieldset-checkbox-demo',
    }),
    calendarBasicDemo: Ui.Calendar.init({
      id: 'calendar-basic-demo',
      today,
    }),
    datePickerBasicDemo: Ui.DatePicker.init({
      id: 'date-picker-basic-demo',
      today,
      minDate: today,
      maxDate: Calendar.addMonths(today, 3),
    }),
    checkboxBasicDemo: Ui.Checkbox.init({ id: 'checkbox-basic-demo' }),
    checkboxOptionADemo: Ui.Checkbox.init({
      id: 'checkbox-option-a-demo',
    }),
    checkboxOptionBDemo: Ui.Checkbox.init({
      id: 'checkbox-option-b-demo',
    }),
    comboboxDemo: Ui.Combobox.init({ id: 'combobox-demo' }),
    comboboxNullableDemo: Ui.Combobox.init({
      id: 'combobox-nullable-demo',
      nullable: true,
    }),
    comboboxMultiDemo: Ui.Combobox.Multi.init({
      id: 'combobox-multi-demo',
    }),
    comboboxSelectOnFocusDemo: Ui.Combobox.init({
      id: 'combobox-select-on-focus-demo',
      selectInputOnFocus: true,
    }),
    dialogDemo: Ui.Dialog.init({ id: 'dialog-demo' }),
    dialogAnimatedDemo: Ui.Dialog.init({
      id: 'dialog-animated-demo',
      isAnimated: true,
    }),
    disclosureDemo: Ui.Disclosure.init({ id: 'disclosure-demo' }),
    listboxDemo: Ui.Listbox.init({ id: 'listbox-demo' }),
    listboxMultiDemo: Ui.Listbox.Multi.init({
      id: 'listbox-multi-demo',
    }),
    listboxGroupedDemo: Ui.Listbox.init({
      id: 'listbox-grouped-demo',
    }),
    menuBasicDemo: Ui.Menu.init({ id: 'menu-basic-demo' }),
    menuAnimatedDemo: Ui.Menu.init({
      id: 'menu-animated-demo',
      isAnimated: true,
    }),
    popoverBasicDemo: Ui.Popover.init({ id: 'popover-basic-demo' }),
    popoverAnimatedDemo: Ui.Popover.init({
      id: 'popover-animated-demo',
      isAnimated: true,
    }),
    verticalRadioGroupDemo: Ui.RadioGroup.init({
      id: 'vertical-radio-group-demo',
    }),
    horizontalRadioGroupDemo: Ui.RadioGroup.init({
      id: 'horizontal-radio-group-demo',
      orientation: 'Horizontal',
    }),
    selectDemoValue: 'us',
    sliderRatingDemo: Ui.Slider.init({
      id: 'slider-rating-demo',
      min: 0,
      max: 10,
      step: 1,
      initialValue: 3,
    }),
    sliderVolumeDemo: Ui.Slider.init({
      id: 'slider-volume-demo',
      min: 0,
      max: 1,
      step: 0.05,
      initialValue: 0.5,
    }),
    switchDemo: Ui.Switch.init({ id: 'switch-demo' }),
    horizontalTabsDemo: Ui.Tabs.init({ id: 'horizontal-tabs-demo' }),
    verticalTabsDemo: Ui.Tabs.init({
      id: 'vertical-tabs-demo',
    }),
    dragAndDropDemo: Ui.DragAndDrop.init({
      id: 'drag-and-drop-demo',
    }),
    fileDropBasicDemo: Ui.FileDrop.init({ id: 'file-drop-basic-demo' }),
    fileDropBasicDemoFiles: [],
    toastDemo: Toast.init({ id: 'toast-demo' }),
    tooltipDemo: Ui.Tooltip.init({ id: 'tooltip-demo' }),
    animationDemo: Ui.Animation.init({ id: 'animation-demo' }),
    virtualListDemo: Ui.VirtualList.init({
      id: 'virtual-list-demo',
      rowHeightPx: 56,
    }),
    virtualListVariableDemo: Ui.VirtualList.init({
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
