import { Array, Layer, Match, Number, Option } from 'effect'
import { Calendar as FoldkitCalendar } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import {
  Animation,
  Calendar,
  DatePicker,
  Dialog,
  DragAndDrop,
  FileDrop,
  HoverIntent,
  Popover,
  Slider,
  Tooltip,
  VirtualList,
} from '@foldkit/ui'

import { CityCombobox, CityMultiCombobox } from './combobox'
import { Ui } from './definition'
import {
  ActivityVirtualList,
  CharacterListbox,
  ChatVirtualList,
  DemoMenu,
  DemoTabs,
  HistoryModeRadioGroup,
  ItemListbox,
  ItemMultiListbox,
  PlanRadioGroup,
} from './demo/components'
import { DemoToast } from './demo/toastModule'
import { ROW_COUNT as VIRTUAL_LIST_ROW_COUNT } from './demo/virtualListData'
import {
  type City,
  VirtualListChatHistoryLoad,
  VirtualListChatHistorySource,
} from './domain/domain'
import {
  DragAndDropDemoAnnouncement,
  dragAndDropDemoAnnouncementToText,
  findDragAndDropDemoCardLabel,
  findDragAndDropDemoColumnLabel,
  reorderColumns,
} from './dragAndDrop'
import type { Model } from './model'
import { view } from './view'
import {
  chatListForSource,
  fetchVirtualListChatHistory,
  handleCompletedFetchVirtualListChatHistory,
  initialVirtualListChatMessages,
  markVirtualListChatHistoryAnnouncedStep,
  prependVirtualListChatMessagesStep,
  requestVirtualListChatHistoryOnApproachStep,
  selectVirtualListChatHistoryModeStep,
  updateVirtualListChatMessagesStep,
} from './virtualListChat'

const VIRTUAL_LIST_MIDDLE_INDEX = Math.floor(VIRTUAL_LIST_ROW_COUNT / 2)

export const UiLive = Ui.toLayer(() => ({
  init: ({ today }) => ({
    buttonClickCount: 0,
    inputDemoValue: '',
    textareaDemoValue: '',
    fieldsetInputValue: '',
    fieldsetTextareaValue: '',
    isFieldsetCheckboxDemoChecked: false,
    calendarBasicDemo: new Calendar.Calendar('calendarBasicDemo', {
      id: 'calendar-basic-demo',
      today,
      minDate: FoldkitCalendar.subtractYears(today, 1),
      maxDate: FoldkitCalendar.addYears(today, 1),
    }),
    maybeCalendarBasicDemoSelectedDate: Option.none(),
    datePickerBasicDemo: new DatePicker.DatePicker('datePickerBasicDemo', {
      id: 'date-picker-basic-demo',
      today,
      minDate: FoldkitCalendar.subtractYears(today, 1),
      maxDate: FoldkitCalendar.addYears(today, 1),
    }),
    maybeDatePickerBasicDemoSelectedDate: Option.none(),
    isCheckboxBasicDemoChecked: false,
    isCheckboxOptionADemoChecked: false,
    isCheckboxOptionBDemoChecked: false,
    comboboxDemo: new CityCombobox('comboboxDemo', {
      id: 'combobox-demo',
    }),
    maybeComboboxDemoSelectedCity: Option.none(),
    comboboxPlacementLockDemo: new CityCombobox('comboboxPlacementLockDemo', {
      id: 'combobox-placement-lock-demo',
    }),
    maybeComboboxPlacementLockDemoSelectedCity: Option.none(),
    comboboxNullableDemo: new CityCombobox('comboboxNullableDemo', {
      id: 'combobox-nullable-demo',
      nullable: true,
    }),
    maybeComboboxNullableDemoSelectedCity: Option.none(),
    comboboxMultiDemo: new CityMultiCombobox('comboboxMultiDemo', {
      id: 'combobox-multi-demo',
    }),
    comboboxMultiDemoSelectedCities: [],
    comboboxSelectOnFocusDemo: new CityCombobox('comboboxSelectOnFocusDemo', {
      id: 'combobox-select-on-focus-demo',
      selectInputOnFocus: true,
    }),
    maybeComboboxSelectOnFocusDemoSelectedCity: Option.none(),
    dialogDemo: new Dialog.Dialog('dialogDemo', {
      id: 'dialog-demo',
    }),
    dialogAnimatedDemo: new Dialog.Dialog('dialogAnimatedDemo', {
      id: 'dialog-animated-demo',
      isAnimated: true,
    }),
    overlayDialogDemo: new Dialog.Dialog('overlayDialogDemo', {
      id: 'overlay-dialog-demo',
    }),
    overlayComboboxDemo: new CityCombobox('overlayComboboxDemo', {
      id: 'overlay-combobox-demo',
    }),
    maybeOverlayComboboxDemoSelectedCity: Option.none(),
    nestedDialogParentDemo: new Dialog.Dialog('nestedDialogParentDemo', {
      id: 'nested-dialog-parent-demo',
    }),
    nestedDialogChildDemo: new Dialog.Dialog('nestedDialogChildDemo', {
      id: 'nested-dialog-child-demo',
    }),
    isDisclosureDemoOpen: false,
    isDisclosureCollapsedPreviewDemoOpen: false,
    listboxDemo: new ItemListbox('listboxDemo', {
      id: 'listbox-demo',
    }),
    maybeListboxDemoSelectedItem: Option.none(),
    listboxMultiDemo: new ItemMultiListbox('listboxMultiDemo', {
      id: 'listbox-multi-demo',
    }),
    listboxMultiDemoSelectedItems: [],
    listboxGroupedDemo: new CharacterListbox('listboxGroupedDemo', {
      id: 'listbox-grouped-demo',
    }),
    maybeListboxGroupedDemoSelectedItem: Option.none(),
    menuBasicDemo: new DemoMenu('menuBasicDemo', {
      id: 'menu-basic-demo',
    }),
    menuAnimatedDemo: new DemoMenu('menuAnimatedDemo', {
      id: 'menu-animated-demo',
      isAnimated: true,
    }),
    popoverBasicDemo: new Popover.Popover('popoverBasicDemo', {
      id: 'popover-basic-demo',
    }),
    popoverAnimatedDemo: new Popover.Popover('popoverAnimatedDemo', {
      id: 'popover-animated-demo',
      isAnimated: true,
    }),
    popoverArrowDemo: new Popover.Popover('popoverArrowDemo', {
      id: 'popover-arrow-demo',
    }),
    popoverNestedParentDemo: new Popover.Popover('popoverNestedParentDemo', {
      id: 'popover-nested-parent-demo',
      contentFocus: true,
    }),
    popoverNestedChildDemo: new Popover.Popover('popoverNestedChildDemo', {
      id: 'popover-nested-child-demo',
    }),
    verticalRadioGroupDemo: new PlanRadioGroup('verticalRadioGroupDemo', {
      id: 'vertical-radio-group-demo',
    }),
    verticalRadioGroupDemoValue: Option.none(),
    horizontalRadioGroupDemo: new PlanRadioGroup('horizontalRadioGroupDemo', {
      id: 'horizontal-radio-group-demo',
    }),
    horizontalRadioGroupDemoValue: Option.none(),
    selectDemoValue: 'us',
    sliderRatingDemo: new Slider.Slider('sliderRatingDemo', {
      id: 'slider-rating-demo',
      min: 0,
      max: 10,
      step: 1,
    }),
    sliderRatingValue: 3,
    sliderVolumeDemo: new Slider.Slider('sliderVolumeDemo', {
      id: 'slider-volume-demo',
      min: 0,
      max: 1,
      step: 0.05,
    }),
    sliderVolumeValue: 0.5,
    isSwitchDemoChecked: false,
    horizontalTabsDemo: new DemoTabs('horizontalTabsDemo', {
      id: 'horizontal-tabs-demo',
    }),
    horizontalTabsDemoTab: 'Foldkit',
    verticalTabsDemo: new DemoTabs('verticalTabsDemo', {
      id: 'vertical-tabs-demo',
    }),
    verticalTabsDemoTab: 'Foldkit',
    dragAndDropDemo: new DragAndDrop.DragAndDrop('dragAndDropDemo', {
      id: 'drag-and-drop-demo',
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
    dragAndDropDemoAnnouncement: '',
    fileDropBasicDemo: new FileDrop.FileDrop('fileDropBasicDemo', {
      id: 'file-drop-basic-demo',
    }),
    fileDropBasicDemoFiles: [],
    toastDemo: new DemoToast('toastDemo', {
      id: 'toast-demo',
      swipeToDismiss: {},
    }),
    maybeLastDismissedToastTitle: Option.none(),
    tooltipDemo: new Tooltip.Tooltip('tooltipDemo', {
      id: 'tooltip-demo',
    }),
    hoverIntentCardDemo: new HoverIntent.HoverIntent('hoverIntentCardDemo', {}),
    hoverIntentMenuDemo: new HoverIntent.HoverIntent('hoverIntentMenuDemo', {}),
    animationDemo: new Animation.Animation('animationDemo', {
      id: 'animation-demo',
    }),
    virtualListDemo: new ActivityVirtualList('virtualListDemo', {
      id: 'virtual-list-demo',
      rowHeightPx: 56,
    }),
    virtualListVariableDemo: new ActivityVirtualList(
      'virtualListVariableDemo',
      { id: 'virtual-list-variable-demo', rowHeightPx: 56 },
    ),
    virtualListChatDemo: chatListForSource(
      VirtualListChatHistorySource.Unbounded(),
    ),
    virtualListChatMessages: initialVirtualListChatMessages,
    virtualListChatNextId: initialVirtualListChatMessages.length,
    virtualListChatHistorySource: VirtualListChatHistorySource.Unbounded(),
    virtualListChatHistoryModeGroup: new HistoryModeRadioGroup(
      'virtualListChatHistoryModeGroup',
      { id: 'virtual-list-chat-history-mode' },
    ),
    virtualListChatHistoryLoad: VirtualListChatHistoryLoad.Idle(),
    virtualListChatHistoryRequestVersion: 0,
    virtualListChatLoadedOlderCount: 0,
    virtualListChatAnnouncedOlderCount: 0,
  }),

  update: {
    UpdatedInputDemoValue: (model, { value }) => ({
      model: modifyFields(model, { inputDemoValue: () => value }),
    }),

    UpdatedTextareaDemoValue: (model, { value }) => ({
      model: modifyFields(model, { textareaDemoValue: () => value }),
    }),

    UpdatedFieldsetInputValue: (model, { value }) => ({
      model: modifyFields(model, { fieldsetInputValue: () => value }),
    }),

    UpdatedFieldsetTextareaValue: (model, { value }) => ({
      model: modifyFields(model, { fieldsetTextareaValue: () => value }),
    }),

    UpdatedSelectDemoValue: (model, { value }) => ({
      model: modifyFields(model, { selectDemoValue: () => value }),
    }),

    ToggledFieldsetCheckboxDemo: (model, { isChecked }) => ({
      model: modifyFields(model, {
        isFieldsetCheckboxDemoChecked: () => isChecked,
      }),
    }),

    ClickedButtonDemo: model => ({
      model: modifyFields(model, { buttonClickCount: Number.increment }),
    }),

    ToggledCheckboxBasicDemo: (model, { isChecked }) => ({
      model: modifyFields(model, {
        isCheckboxBasicDemoChecked: () => isChecked,
      }),
    }),

    ToggledCheckboxAllDemo: (model, { isChecked }) => ({
      model: modifyFields(model, {
        isCheckboxOptionADemoChecked: () => isChecked,
        isCheckboxOptionBDemoChecked: () => isChecked,
      }),
    }),

    ToggledCheckboxOptionADemo: (model, { isChecked }) => ({
      model: modifyFields(model, {
        isCheckboxOptionADemoChecked: () => isChecked,
      }),
    }),

    ToggledCheckboxOptionBDemo: (model, { isChecked }) => ({
      model: modifyFields(model, {
        isCheckboxOptionBDemoChecked: () => isChecked,
      }),
    }),

    ClickedDeleteProject: model => ({
      model,
      messages: [
        model.nestedDialogChildDemo.send(Dialog.Dialog.Message.RequestedOpen()),
      ],
    }),

    ClickedOpenDialog: model => ({
      model,
      messages: [model.dialogDemo.send(Dialog.Dialog.Message.RequestedOpen())],
    }),

    ClickedOpenAnimatedDialog: model => ({
      model,
      messages: [
        model.dialogAnimatedDemo.send(Dialog.Dialog.Message.RequestedOpen()),
      ],
    }),

    ClickedEditFilters: model => ({
      model,
      messages: [
        model.overlayDialogDemo.send(Dialog.Dialog.Message.RequestedOpen()),
      ],
    }),

    ClickedOpenProjectSettings: model => ({
      model,
      messages: [
        model.nestedDialogParentDemo.send(
          Dialog.Dialog.Message.RequestedOpen(),
        ),
      ],
    }),

    ToggledDisclosureDemo: (model, { isOpen }) => ({
      model: modifyFields(model, { isDisclosureDemoOpen: () => isOpen }),
    }),

    ToggledDisclosureCollapsedPreviewDemo: (model, { isOpen }) => ({
      model: modifyFields(model, {
        isDisclosureCollapsedPreviewDemoOpen: () => isOpen,
      }),
    }),

    ToggledSwitchDemo: (model, { isChecked }) => ({
      model: modifyFields(model, { isSwitchDemoChecked: () => isChecked }),
    }),

    ClickedHoverIntentMenuItem: model => ({
      model,
      messages: [
        model.hoverIntentMenuDemo.send(
          HoverIntent.HoverIntent.Message.RequestedClose(),
        ),
      ],
    }),

    ClickedShowInfoToast: model => ({
      model,
      messages: [
        model.toastDemo.send(
          DemoToast.requestShow({
            variant: 'Info',
            payload: {
              title: 'Preferences updated',
              maybeDescription: Option.some('Your changes are saved.'),
            },
          }),
        ),
      ],
    }),

    ClickedShowSuccessToast: model => ({
      model,
      messages: [
        model.toastDemo.send(
          DemoToast.requestShow({
            variant: 'Success',
            payload: {
              title: 'Uploaded',
              maybeDescription: Option.some('kit-manual.pdf is now available.'),
            },
          }),
        ),
      ],
    }),

    ClickedShowErrorToast: model => ({
      model,
      messages: [
        model.toastDemo.send(
          DemoToast.requestShow({
            variant: 'Error',
            payload: {
              title: 'Save failed',
              maybeDescription: Option.some(
                'Check your connection and try again.',
              ),
            },
          }),
        ),
      ],
    }),

    ClickedShowStickyToast: model => ({
      model,
      messages: [
        model.toastDemo.send(
          DemoToast.requestShow({
            variant: 'Info',
            payload: {
              title: 'Action required',
              maybeDescription: Option.some('Stays visible until dismissed.'),
            },
            sticky: true,
          }),
        ),
      ],
    }),

    ClickedDismissAllToasts: model => ({
      model,
      messages: [model.toastDemo.send(DemoToast.Message.RequestedDismissAll())],
    }),

    ClickedToggleAnimationDemo: model => ({
      model,
      messages: [
        model.animationDemo.send(
          model.animationDemo.model.isShowing
            ? Animation.Animation.Message.RequestedHide()
            : Animation.Animation.Message.RequestedShow(),
        ),
      ],
    }),

    ClickedRemoveFileDropDemoFile: (model, { fileIndex }) => ({
      model: modifyFields(model, {
        fileDropBasicDemoFiles: Array.remove(fileIndex),
      }),
    }),

    ClickedVirtualListScrollToMiddle: model => ({
      model,
      messages: [
        model.virtualListDemo.send(
          VirtualList.requestScrollToIndex(VIRTUAL_LIST_MIDDLE_INDEX),
        ),
      ],
    }),

    ClickedVirtualListVariableScrollToMiddle: model => ({
      model,
      messages: [
        model.virtualListVariableDemo.send(
          VirtualList.requestScrollToIndex(VIRTUAL_LIST_MIDDLE_INDEX),
        ),
      ],
    }),

    ClickedVirtualListChatPrepend: prependVirtualListChatMessagesStep,

    CompletedFetchVirtualListChatHistory:
      handleCompletedFetchVirtualListChatHistory,

    ClickedVirtualListChatScrollToMessage: model => ({
      model,
      messages: [
        model.virtualListChatDemo.send(
          VirtualList.requestScrollToKey('7', { alignment: 'Center' }),
        ),
      ],
    }),

    ClickedVirtualListChatAppend: model => {
      const nextId = model.virtualListChatNextId
      const nextMessages = Array.append(model.virtualListChatMessages, {
        id: nextId,
        body: `New message ${nextId} arrived at the end.`,
        isExpanded: nextId % 3 === 0,
      })

      return updateVirtualListChatMessagesStep(model, nextMessages, nextId + 1)
    },

    ClickedVirtualListChatToggleMessage: (model, { messageId }) => {
      const nextMessages = Array.map(model.virtualListChatMessages, message =>
        message.id === messageId
          ? modifyFields(message, {
              isExpanded: isExpanded => !isExpanded,
            })
          : message,
      )

      return updateVirtualListChatMessagesStep(model, nextMessages)
    },

    ...Calendar.Calendar.on({
      SelectedDate: (model, { date }) => ({
        model: modifyFields(model, {
          maybeCalendarBasicDemoSelectedDate: () => Option.some(date),
        }),
      }),
    }),

    ...DatePicker.DatePicker.on({
      SelectedDate: (model, { date }) => ({
        model: modifyFields(model, {
          maybeDatePickerBasicDemoSelectedDate: () => Option.some(date),
        }),
      }),
      ClearedDate: model => ({
        model: modifyFields(model, {
          maybeDatePickerBasicDemoSelectedDate: () => Option.none(),
        }),
      }),
    }),

    ...CityCombobox.on({
      Selected: (model, { value }, combobox) =>
        selectComboboxDemoCity(model, combobox.id, value),
      ClearedSelection: (model, _, combobox) =>
        combobox.id === 'comboboxNullableDemo'
          ? {
              model: modifyFields(model, {
                maybeComboboxNullableDemoSelectedCity: () => Option.none(),
              }),
            }
          : { model },
    }),

    ...CityMultiCombobox.on({
      Selected: (model, { value }) => ({
        model: modifyFields(model, {
          comboboxMultiDemoSelectedCities: comboboxMultiDemoSelectedCities =>
            Array.contains(comboboxMultiDemoSelectedCities, value)
              ? Array.filter(
                  comboboxMultiDemoSelectedCities,
                  city => city !== value,
                )
              : Array.append(comboboxMultiDemoSelectedCities, value),
        }),
      }),
    }),

    ...ItemListbox.on({
      Selected: (model, { value }) => ({
        model: modifyFields(model, {
          maybeListboxDemoSelectedItem: () => Option.some(value),
        }),
      }),
    }),

    ...ItemMultiListbox.on({
      Selected: (model, { value }) => ({
        model: modifyFields(model, {
          listboxMultiDemoSelectedItems: listboxMultiDemoSelectedItems =>
            Array.contains(listboxMultiDemoSelectedItems, value)
              ? Array.filter(
                  listboxMultiDemoSelectedItems,
                  item => item !== value,
                )
              : Array.append(listboxMultiDemoSelectedItems, value),
        }),
      }),
    }),

    ...CharacterListbox.on({
      Selected: (model, { value }) => ({
        model: modifyFields(model, {
          maybeListboxGroupedDemoSelectedItem: () => Option.some(value),
        }),
      }),
    }),

    ...PlanRadioGroup.on({
      Selected: (model, { value }, radioGroup) => ({
        model:
          radioGroup.id === 'verticalRadioGroupDemo'
            ? modifyFields(model, {
                verticalRadioGroupDemoValue: () => Option.some(value),
              })
            : modifyFields(model, {
                horizontalRadioGroupDemoValue: () => Option.some(value),
              }),
      }),
    }),

    ...Slider.Slider.on({
      ChangedValue: (model, { value }, slider) => ({
        model:
          slider.id === 'sliderRatingDemo'
            ? modifyFields(model, { sliderRatingValue: () => value })
            : modifyFields(model, { sliderVolumeValue: () => value }),
      }),
    }),

    ...DemoTabs.on({
      Selected: (model, { value }, tabs) => ({
        model:
          tabs.id === 'horizontalTabsDemo'
            ? modifyFields(model, { horizontalTabsDemoTab: () => value })
            : modifyFields(model, { verticalTabsDemoTab: () => value }),
      }),
    }),

    ...DemoToast.on({
      DismissedToast: (model, { payload }) => ({
        model: modifyFields(model, {
          maybeLastDismissedToastTitle: () => Option.some(payload.title),
        }),
      }),
    }),

    ...Animation.Animation.on({
      StartedLeaveAnimating: model => ({
        model,
        messages: [
          model.animationDemo.send(
            Animation.Animation.Message.RequestedWaitForLeaveSettlement(),
          ),
        ],
      }),
    }),

    ...FileDrop.FileDrop.on({
      ReceivedFiles: (model, { files }) => ({
        model: modifyFields(model, {
          fileDropBasicDemoFiles: Array.appendAll(files),
        }),
      }),
    }),

    ...DragAndDrop.DragAndDrop.on({
      StartedKeyboardDrag: (model, { itemId }) => ({
        model: modifyFields(model, {
          dragAndDropDemoAnnouncement: () =>
            dragAndDropDemoAnnouncementToText(
              DragAndDropDemoAnnouncement.PickedUp({
                label: findDragAndDropDemoCardLabel(
                  model.dragAndDropDemoColumns,
                  itemId,
                ),
              }),
            ),
        }),
      }),
      ChangedKeyboardTarget: (
        model,
        { fromContainerId, toContainerId, toIndex },
      ) => {
        const announcementArgs = {
          columnLabel: findDragAndDropDemoColumnLabel(
            model.dragAndDropDemoColumns,
            toContainerId,
          ),
          position: toIndex + 1,
        }
        const announcement =
          fromContainerId !== toContainerId
            ? DragAndDropDemoAnnouncement.MovedToColumn(announcementArgs)
            : DragAndDropDemoAnnouncement.MovedWithinColumn(announcementArgs)

        return {
          model: modifyFields(model, {
            dragAndDropDemoAnnouncement: () =>
              dragAndDropDemoAnnouncementToText(announcement),
          }),
        }
      },
      Reordered: (
        model,
        { itemId, fromContainerId, toContainerId, toIndex },
      ) => {
        const label = findDragAndDropDemoCardLabel(
          model.dragAndDropDemoColumns,
          itemId,
        )
        const columnLabel = findDragAndDropDemoColumnLabel(
          model.dragAndDropDemoColumns,
          toContainerId,
        )

        return {
          model: modifyFields(model, {
            dragAndDropDemoColumns: dragAndDropDemoColumns =>
              reorderColumns(
                dragAndDropDemoColumns,
                itemId,
                fromContainerId,
                toContainerId,
                toIndex,
              ),
            dragAndDropDemoAnnouncement: () =>
              dragAndDropDemoAnnouncementToText(
                DragAndDropDemoAnnouncement.Dropped({
                  label,
                  columnLabel,
                  position: toIndex + 1,
                }),
              ),
          }),
        }
      },
      Cancelled: model => ({
        model: modifyFields(model, {
          dragAndDropDemoAnnouncement: () =>
            dragAndDropDemoAnnouncementToText(
              DragAndDropDemoAnnouncement.Cancelled(),
            ),
        }),
      }),
    }),

    ...ChatVirtualList.on({
      ApproachedLoadedStart: requestVirtualListChatHistoryOnApproachStep,
      EndedContainerScroll: markVirtualListChatHistoryAnnouncedStep,
    }),

    ...HistoryModeRadioGroup.on({
      Selected: (model, { value }) =>
        selectVirtualListChatHistoryModeStep(model, value),
    }),
  },

  commands: { FetchVirtualListChatHistory: fetchVirtualListChatHistory },

  view,
})).pipe(
  Layer.provide(
    Layer.mergeAll(
      Calendar.CalendarLive,
      DatePicker.DatePickerLive,
      Dialog.DialogLive,
      DragAndDrop.DragAndDropLive,
      FileDrop.FileDropLive,
      HoverIntent.HoverIntentLive,
      Popover.PopoverLive,
      Slider.SliderLive,
      Tooltip.TooltipLive,
      CityCombobox,
      CityMultiCombobox,
      ItemListbox,
      ItemMultiListbox,
      CharacterListbox,
      DemoMenu,
      PlanRadioGroup,
      DemoTabs,
      DemoToast,
      ActivityVirtualList,
      ChatVirtualList,
      HistoryModeRadioGroup,
    ),
  ),
  Layer.provide(Animation.AnimationLive),
)

const selectComboboxDemoCity = (model: Model, comboboxId: string, city: City) =>
  Match.value(comboboxId).pipe(
    Match.when('comboboxDemo', () => ({
      model: modifyFields(model, {
        maybeComboboxDemoSelectedCity: () => Option.some(city),
      }),
    })),
    Match.when('comboboxPlacementLockDemo', () => ({
      model: modifyFields(model, {
        maybeComboboxPlacementLockDemoSelectedCity: () => Option.some(city),
      }),
    })),
    Match.when('comboboxNullableDemo', () => ({
      model: modifyFields(model, {
        maybeComboboxNullableDemoSelectedCity:
          maybeComboboxNullableDemoSelectedCity =>
            Option.contains(maybeComboboxNullableDemoSelectedCity, city)
              ? Option.none()
              : Option.some(city),
      }),
    })),
    Match.when('comboboxSelectOnFocusDemo', () => ({
      model: modifyFields(model, {
        maybeComboboxSelectOnFocusDemoSelectedCity: () => Option.some(city),
      }),
    })),
    Match.when('overlayComboboxDemo', () => ({
      model: modifyFields(model, {
        maybeOverlayComboboxDemoSelectedCity: () => Option.some(city),
      }),
    })),
    Match.orElse(() => ({ model })),
  )
