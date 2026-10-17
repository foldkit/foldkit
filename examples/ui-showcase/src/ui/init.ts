import { Option } from 'effect'
import { Calendar } from 'foldkit'

import { UiComposition } from './composition'

export const init = UiComposition.makeInit((today: Calendar.CalendarDate) => ({
  startup: today,
  model: {
    buttonClickCount: 0,
    inputDemoValue: '',
    textareaDemoValue: '',
    fieldsetInputValue: '',
    fieldsetTextareaValue: '',
    isFieldsetCheckboxDemoChecked: false,
    maybeCalendarBasicDemoSelectedDate: Option.none(),
    maybeDatePickerBasicDemoSelectedDate: Option.none(),
    isCheckboxBasicDemoChecked: false,
    isCheckboxOptionADemoChecked: false,
    isCheckboxOptionBDemoChecked: false,
    maybeComboboxDemoSelectedCity: Option.none(),
    maybeComboboxNullableDemoSelectedCity: Option.none(),
    comboboxMultiDemoSelectedCities: [],
    maybeComboboxPlacementLockDemoSelectedCity: Option.none(),
    maybeComboboxSelectOnFocusDemoSelectedCity: Option.none(),
    maybeOverlayComboboxDemoSelectedCity: Option.none(),
    isDisclosureBasicDemoOpen: false,
    isDisclosureAnimatedDemoOpen: false,
    isDisclosureCollapsedPreviewDemoOpen: false,
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
    fileDropBasicDemoFiles: [],
    maybeListboxDemoSelectedItem: Option.none(),
    listboxMultiDemoSelectedItems: [],
    maybeListboxGroupedDemoSelectedItem: Option.none(),
    verticalRadioGroupDemoValue: Option.none(),
    horizontalRadioGroupDemoValue: Option.none(),
    selectDemoValue: 'us',
    sliderRatingValue: 3,
    sliderVolumeValue: 0.5,
    isSwitchDemoChecked: false,
    horizontalTabsDemoTab: 'Foldkit',
    verticalTabsDemoTab: 'Foldkit',
  },
}))
