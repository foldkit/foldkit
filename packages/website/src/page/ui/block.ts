import { Array, Effect, Layer, Number, Option } from 'effect'
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
import { view } from './view'
import {
  fetchVirtualListChatHistory,
  handleCompletedFetchVirtualListChatHistory,
  initialVirtualListChatMessages,
  markVirtualListChatHistoryAnnouncedStep,
  prependVirtualListChatMessagesStep,
  requestVirtualListChatHistoryOnApproachStep,
  selectVirtualListChatHistoryModeStep,
  updateVirtualListChatMessagesStep,
  virtualListChatInitConfig,
} from './virtualListChat'

const VIRTUAL_LIST_MIDDLE_INDEX = Math.floor(VIRTUAL_LIST_ROW_COUNT / 2)

export const UiLive = Ui.make(
  Effect.fn(function* (_id, { today }) {
    const calendarBasicDemo = yield* new Calendar.Calendar(
      'calendarBasicDemo',
      {
        id: 'calendar-basic-demo',
        today,
        minDate: FoldkitCalendar.subtractYears(today, 1),
        maxDate: FoldkitCalendar.addYears(today, 1),
      },
    )
    const datePickerBasicDemo = yield* new DatePicker.DatePicker(
      'datePickerBasicDemo',
      {
        id: 'date-picker-basic-demo',
        today,
        minDate: FoldkitCalendar.subtractYears(today, 1),
        maxDate: FoldkitCalendar.addYears(today, 1),
      },
    )
    const comboboxDemo = yield* new CityCombobox('comboboxDemo', {
      id: 'combobox-demo',
    })
    const comboboxPlacementLockDemo = yield* new CityCombobox(
      'comboboxPlacementLockDemo',
      { id: 'combobox-placement-lock-demo' },
    )
    const comboboxNullableDemo = yield* new CityCombobox(
      'comboboxNullableDemo',
      { id: 'combobox-nullable-demo', nullable: true },
    )
    const comboboxMultiDemo = yield* new CityMultiCombobox(
      'comboboxMultiDemo',
      { id: 'combobox-multi-demo' },
    )
    const comboboxSelectOnFocusDemo = yield* new CityCombobox(
      'comboboxSelectOnFocusDemo',
      { id: 'combobox-select-on-focus-demo', selectInputOnFocus: true },
    )
    const dialogDemo = yield* new Dialog.Dialog('dialogDemo', {
      id: 'dialog-demo',
    })
    const dialogAnimatedDemo = yield* new Dialog.Dialog('dialogAnimatedDemo', {
      id: 'dialog-animated-demo',
      isAnimated: true,
    })
    const overlayDialogDemo = yield* new Dialog.Dialog('overlayDialogDemo', {
      id: 'overlay-dialog-demo',
    })
    const overlayComboboxDemo = yield* new CityCombobox('overlayComboboxDemo', {
      id: 'overlay-combobox-demo',
    })
    const nestedDialogParentDemo = yield* new Dialog.Dialog(
      'nestedDialogParentDemo',
      { id: 'nested-dialog-parent-demo' },
    )
    const nestedDialogChildDemo = yield* new Dialog.Dialog(
      'nestedDialogChildDemo',
      { id: 'nested-dialog-child-demo' },
    )
    const listboxDemo = yield* new ItemListbox('listboxDemo', {
      id: 'listbox-demo',
    })
    const listboxMultiDemo = yield* new ItemMultiListbox('listboxMultiDemo', {
      id: 'listbox-multi-demo',
    })
    const listboxGroupedDemo = yield* new CharacterListbox(
      'listboxGroupedDemo',
      { id: 'listbox-grouped-demo' },
    )
    const menuBasicDemo = yield* new DemoMenu('menuBasicDemo', {
      id: 'menu-basic-demo',
    })
    const menuAnimatedDemo = yield* new DemoMenu('menuAnimatedDemo', {
      id: 'menu-animated-demo',
      isAnimated: true,
    })
    const popoverBasicDemo = yield* new Popover.Popover('popoverBasicDemo', {
      id: 'popover-basic-demo',
    })
    const popoverAnimatedDemo = yield* new Popover.Popover(
      'popoverAnimatedDemo',
      { id: 'popover-animated-demo', isAnimated: true },
    )
    const popoverArrowDemo = yield* new Popover.Popover('popoverArrowDemo', {
      id: 'popover-arrow-demo',
    })
    const popoverNestedParentDemo = yield* new Popover.Popover(
      'popoverNestedParentDemo',
      { id: 'popover-nested-parent-demo', contentFocus: true },
    )
    const popoverNestedChildDemo = yield* new Popover.Popover(
      'popoverNestedChildDemo',
      { id: 'popover-nested-child-demo' },
    )
    const verticalRadioGroupDemo = yield* new PlanRadioGroup(
      'verticalRadioGroupDemo',
      { id: 'vertical-radio-group-demo' },
    )
    const horizontalRadioGroupDemo = yield* new PlanRadioGroup(
      'horizontalRadioGroupDemo',
      { id: 'horizontal-radio-group-demo' },
    )
    const sliderRatingDemo = yield* new Slider.Slider('sliderRatingDemo', {
      id: 'slider-rating-demo',
      min: 0,
      max: 10,
      step: 1,
    })
    const sliderVolumeDemo = yield* new Slider.Slider('sliderVolumeDemo', {
      id: 'slider-volume-demo',
      min: 0,
      max: 1,
      step: 0.05,
    })
    const horizontalTabsDemo = yield* new DemoTabs('horizontalTabsDemo', {
      id: 'horizontal-tabs-demo',
    })
    const verticalTabsDemo = yield* new DemoTabs('verticalTabsDemo', {
      id: 'vertical-tabs-demo',
    })
    const dragAndDropDemo = yield* new DragAndDrop.DragAndDrop(
      'dragAndDropDemo',
      { id: 'drag-and-drop-demo' },
    )
    const fileDropBasicDemo = yield* new FileDrop.FileDrop(
      'fileDropBasicDemo',
      { id: 'file-drop-basic-demo' },
    )
    const toastDemo = yield* new DemoToast('toastDemo', {
      id: 'toast-demo',
      swipeToDismiss: {},
    })
    const tooltipDemo = yield* new Tooltip.Tooltip('tooltipDemo', {
      id: 'tooltip-demo',
    })
    const hoverIntentCardDemo = yield* new HoverIntent.HoverIntent(
      'hoverIntentCardDemo',
      {},
    )
    const hoverIntentMenuDemo = yield* new HoverIntent.HoverIntent(
      'hoverIntentMenuDemo',
      {},
    )
    const animationDemo = yield* new Animation.Animation('animationDemo', {
      id: 'animation-demo',
    })
    const virtualListDemo = yield* new ActivityVirtualList('virtualListDemo', {
      id: 'virtual-list-demo',
      rowHeightPx: 56,
    })
    const virtualListVariableDemo = yield* new ActivityVirtualList(
      'virtualListVariableDemo',
      { id: 'virtual-list-variable-demo', rowHeightPx: 56 },
    )
    const virtualListChatUnboundedDemo = yield* new ChatVirtualList(
      'virtualListChatUnboundedDemo',
      virtualListChatInitConfig(VirtualListChatHistorySource.Unbounded()),
    )
    const virtualListChatFiniteDemo = yield* new ChatVirtualList(
      'virtualListChatFiniteDemo',
      virtualListChatInitConfig(
        VirtualListChatHistorySource.Finite({ remainingCount: 0 }),
      ),
    )
    const virtualListChatHistoryModeGroup = yield* new HistoryModeRadioGroup(
      'virtualListChatHistoryModeGroup',
      { id: 'virtual-list-chat-history-mode' },
    )

    const chatListForSource = (source: VirtualListChatHistorySource) =>
      VirtualListChatHistorySource.match(source, {
        Unbounded: () => virtualListChatUnboundedDemo,
        Finite: () => virtualListChatFiniteDemo,
      })

    const chatListOutMessageHandlers = {
      ApproachedLoadedStart: requestVirtualListChatHistoryOnApproachStep,
      EndedContainerScroll: markVirtualListChatHistoryAnnouncedStep,
    }

    return {
      model: {
        buttonClickCount: 0,
        inputDemoValue: '',
        textareaDemoValue: '',
        fieldsetInputValue: '',
        fieldsetTextareaValue: '',
        isFieldsetCheckboxDemoChecked: false,
        calendarBasicDemo,
        maybeCalendarBasicDemoSelectedDate: Option.none(),
        datePickerBasicDemo,
        maybeDatePickerBasicDemoSelectedDate: Option.none(),
        isCheckboxBasicDemoChecked: false,
        isCheckboxOptionADemoChecked: false,
        isCheckboxOptionBDemoChecked: false,
        comboboxDemo,
        maybeComboboxDemoSelectedCity: Option.none(),
        comboboxPlacementLockDemo,
        maybeComboboxPlacementLockDemoSelectedCity: Option.none(),
        comboboxNullableDemo,
        maybeComboboxNullableDemoSelectedCity: Option.none(),
        comboboxMultiDemo,
        comboboxMultiDemoSelectedCities: [],
        comboboxSelectOnFocusDemo,
        maybeComboboxSelectOnFocusDemoSelectedCity: Option.none(),
        dialogDemo,
        dialogAnimatedDemo,
        overlayDialogDemo,
        overlayComboboxDemo,
        maybeOverlayComboboxDemoSelectedCity: Option.none(),
        nestedDialogParentDemo,
        nestedDialogChildDemo,
        isDisclosureDemoOpen: false,
        isDisclosureCollapsedPreviewDemoOpen: false,
        listboxDemo,
        maybeListboxDemoSelectedItem: Option.none(),
        listboxMultiDemo,
        listboxMultiDemoSelectedItems: [],
        listboxGroupedDemo,
        maybeListboxGroupedDemoSelectedItem: Option.none(),
        menuBasicDemo,
        menuAnimatedDemo,
        popoverBasicDemo,
        popoverAnimatedDemo,
        popoverArrowDemo,
        popoverNestedParentDemo,
        popoverNestedChildDemo,
        verticalRadioGroupDemo,
        verticalRadioGroupDemoValue: Option.none(),
        horizontalRadioGroupDemo,
        horizontalRadioGroupDemoValue: Option.none(),
        selectDemoValue: 'us',
        sliderRatingDemo,
        sliderRatingValue: 3,
        sliderVolumeDemo,
        sliderVolumeValue: 0.5,
        isSwitchDemoChecked: false,
        horizontalTabsDemo,
        horizontalTabsDemoTab: 'Foldkit',
        verticalTabsDemo,
        verticalTabsDemoTab: 'Foldkit',
        dragAndDropDemo,
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
        fileDropBasicDemo,
        fileDropBasicDemoFiles: [],
        toastDemo,
        maybeLastDismissedToastTitle: Option.none(),
        tooltipDemo,
        hoverIntentCardDemo,
        hoverIntentMenuDemo,
        animationDemo,
        virtualListDemo,
        virtualListVariableDemo,
        virtualListChatDemo: virtualListChatUnboundedDemo,
        virtualListChatMessages: initialVirtualListChatMessages,
        virtualListChatNextId: initialVirtualListChatMessages.length,
        virtualListChatHistorySource: VirtualListChatHistorySource.Unbounded(),
        virtualListChatHistoryModeGroup,
        virtualListChatHistoryLoad: VirtualListChatHistoryLoad.Idle(),
        virtualListChatHistoryRequestVersion: 0,
        virtualListChatLoadedOlderCount: 0,
        virtualListChatAnnouncedOlderCount: 0,
      },

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
            model.nestedDialogChildDemo.send(
              Dialog.Dialog.Message.RequestedOpen(),
            ),
          ],
        }),

        ClickedOpenDialog: model => ({
          model,
          messages: [
            model.dialogDemo.send(Dialog.Dialog.Message.RequestedOpen()),
          ],
        }),

        ClickedOpenAnimatedDialog: model => ({
          model,
          messages: [
            model.dialogAnimatedDemo.send(
              Dialog.Dialog.Message.RequestedOpen(),
            ),
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
                  maybeDescription: Option.some(
                    'kit-manual.pdf is now available.',
                  ),
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
                  maybeDescription: Option.some(
                    'Stays visible until dismissed.',
                  ),
                },
                sticky: true,
              }),
            ),
          ],
        }),

        ClickedDismissAllToasts: model => ({
          model,
          messages: [
            model.toastDemo.send(DemoToast.Message.RequestedDismissAll()),
          ],
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

          return updateVirtualListChatMessagesStep(
            model,
            nextMessages,
            nextId + 1,
          )
        },

        ClickedVirtualListChatToggleMessage: (model, { messageId }) => {
          const nextMessages = Array.map(
            model.virtualListChatMessages,
            message =>
              message.id === messageId
                ? modifyFields(message, {
                    isExpanded: isExpanded => !isExpanded,
                  })
                : message,
          )

          return updateVirtualListChatMessagesStep(model, nextMessages)
        },

        ...calendarBasicDemo.on({
          SelectedDate: (model, { date }) => ({
            model: modifyFields(model, {
              maybeCalendarBasicDemoSelectedDate: () => Option.some(date),
            }),
          }),
        }),

        ...datePickerBasicDemo.on({
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

        ...comboboxDemo.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              maybeComboboxDemoSelectedCity: () => Option.some(value),
            }),
          }),
        }),

        ...comboboxPlacementLockDemo.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              maybeComboboxPlacementLockDemoSelectedCity: () =>
                Option.some(value),
            }),
          }),
        }),

        ...comboboxNullableDemo.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              maybeComboboxNullableDemoSelectedCity:
                maybeComboboxNullableDemoSelectedCity =>
                  Option.contains(maybeComboboxNullableDemoSelectedCity, value)
                    ? Option.none()
                    : Option.some(value),
            }),
          }),
          ClearedSelection: model => ({
            model: modifyFields(model, {
              maybeComboboxNullableDemoSelectedCity: () => Option.none(),
            }),
          }),
        }),

        ...comboboxMultiDemo.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              comboboxMultiDemoSelectedCities:
                comboboxMultiDemoSelectedCities =>
                  Array.contains(comboboxMultiDemoSelectedCities, value)
                    ? Array.filter(
                        comboboxMultiDemoSelectedCities,
                        city => city !== value,
                      )
                    : Array.append(comboboxMultiDemoSelectedCities, value),
            }),
          }),
        }),

        ...comboboxSelectOnFocusDemo.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              maybeComboboxSelectOnFocusDemoSelectedCity: () =>
                Option.some(value),
            }),
          }),
        }),

        ...overlayComboboxDemo.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              maybeOverlayComboboxDemoSelectedCity: () => Option.some(value),
            }),
          }),
        }),

        ...listboxDemo.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              maybeListboxDemoSelectedItem: () => Option.some(value),
            }),
          }),
        }),

        ...listboxMultiDemo.on({
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

        ...listboxGroupedDemo.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              maybeListboxGroupedDemoSelectedItem: () => Option.some(value),
            }),
          }),
        }),

        ...verticalRadioGroupDemo.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              verticalRadioGroupDemoValue: () => Option.some(value),
            }),
          }),
        }),

        ...horizontalRadioGroupDemo.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              horizontalRadioGroupDemoValue: () => Option.some(value),
            }),
          }),
        }),

        ...sliderRatingDemo.on({
          ChangedValue: (model, { value }) => ({
            model: modifyFields(model, { sliderRatingValue: () => value }),
          }),
        }),

        ...sliderVolumeDemo.on({
          ChangedValue: (model, { value }) => ({
            model: modifyFields(model, { sliderVolumeValue: () => value }),
          }),
        }),

        ...horizontalTabsDemo.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, { horizontalTabsDemoTab: () => value }),
          }),
        }),

        ...verticalTabsDemo.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, { verticalTabsDemoTab: () => value }),
          }),
        }),

        ...toastDemo.on({
          DismissedToast: (model, { payload }) => ({
            model: modifyFields(model, {
              maybeLastDismissedToastTitle: () => Option.some(payload.title),
            }),
          }),
        }),

        ...animationDemo.on({
          StartedLeaveAnimating: model => ({
            model,
            messages: [
              model.animationDemo.send(
                Animation.Animation.Message.RequestedWaitForLeaveSettlement(),
              ),
            ],
          }),
        }),

        ...fileDropBasicDemo.on({
          ReceivedFiles: (model, { files }) => ({
            model: modifyFields(model, {
              fileDropBasicDemoFiles: Array.appendAll(files),
            }),
          }),
        }),

        ...dragAndDropDemo.on({
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
                : DragAndDropDemoAnnouncement.MovedWithinColumn(
                    announcementArgs,
                  )

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

        ...virtualListChatUnboundedDemo.on(chatListOutMessageHandlers),

        ...virtualListChatFiniteDemo.on(chatListOutMessageHandlers),

        ...virtualListChatHistoryModeGroup.on({
          Selected: (model, { value }) =>
            selectVirtualListChatHistoryModeStep(
              model,
              value,
              chatListForSource,
            ),
        }),
      },

      commands: { FetchVirtualListChatHistory: fetchVirtualListChatHistory },

      view,
    }
  }),
).pipe(
  Layer.provide(
    Layer.mergeAll(
      Animation.AnimationLive,
      Calendar.CalendarLive,
      DatePicker.DatePickerLive,
      Dialog.DialogLive,
      DragAndDrop.DragAndDropLive,
      FileDrop.FileDropLive,
      HoverIntent.HoverIntentLive,
      Popover.PopoverLive,
      Slider.SliderLive,
      Tooltip.TooltipLive,
      CityCombobox.Live,
      CityMultiCombobox.Live,
      ItemListbox.Live,
      ItemMultiListbox.Live,
      CharacterListbox.Live,
      DemoMenu.Live,
      PlanRadioGroup.Live,
      DemoTabs.Live,
      DemoToast.Live,
      ActivityVirtualList.Live,
      ChatVirtualList.Live,
      HistoryModeRadioGroup.Live,
    ),
  ),
)
