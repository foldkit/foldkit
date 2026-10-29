import { Option } from 'effect'
import { Calendar } from 'foldkit'

import { UiComposition } from './composition'
import {
  VirtualListChatHistoryLoad,
  VirtualListChatHistorySource,
} from './domain/domain'
import { initialVirtualListChatMessages } from './virtualListChat'

export const init = UiComposition.makeInit((today: Calendar.CalendarDate) => ({
  childInitContext: today,
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
    maybeComboboxPlacementLockDemoSelectedCity: Option.none(),
    maybeComboboxNullableDemoSelectedCity: Option.none(),
    comboboxMultiDemoSelectedCities: [],
    maybeComboboxSelectOnFocusDemoSelectedCity: Option.none(),
    maybeOverlayComboboxDemoSelectedCity: Option.none(),
    isDisclosureDemoOpen: false,
    isDisclosureCollapsedPreviewDemoOpen: false,
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
    dragAndDropDemoAnnouncement: '',
    fileDropBasicDemoFiles: [],
    maybeLastDismissedToastTitle: Option.none(),
    virtualListChatMessages: initialVirtualListChatMessages,
    virtualListChatNextId: initialVirtualListChatMessages.length,
    virtualListChatHistorySource: VirtualListChatHistorySource.Unbounded(),
    virtualListChatHistoryLoad: VirtualListChatHistoryLoad.Idle(),
    virtualListChatHistoryRequestVersion: 0,
    virtualListChatLoadedOlderCount: 0,
    virtualListChatAnnouncedOlderCount: 0,
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
}))
