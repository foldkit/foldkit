import { Array, Option } from 'effect'
import { Calendar } from 'foldkit'

import { UiComposition } from './composition'
import {
  type VirtualListChatMessage,
  VirtualListChatStartProximity,
} from './model'

const chatBodies = [
  'Can you review the latest build?',
  'Yep — the navigation fix looks good.',
  'I also checked the keyboard flow and the focus order is stable.',
  'Perfect. I’ll queue the release once CI finishes.',
]

const INITIAL_VIRTUAL_LIST_CHAT_MESSAGE_COUNT = 24

const initialVirtualListChatMessages: ReadonlyArray<VirtualListChatMessage> =
  Array.makeBy(INITIAL_VIRTUAL_LIST_CHAT_MESSAGE_COUNT, index => ({
    id: index,
    body: Option.getOrElse(
      Array.get(chatBodies, index % chatBodies.length),
      () => 'Message',
    ),
    isExpanded: index % 7 === 0,
  }))

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
    virtualListChatStartProximity: VirtualListChatStartProximity.Away(),
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
