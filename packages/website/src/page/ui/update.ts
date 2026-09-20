import { Array, Number, Option, Schema, pipe } from 'effect'
import { Update } from 'foldkit'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

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

import { CityCombobox, CityMultiCombobox } from './demo/combobox'
import { CharacterListbox, ItemListbox, ItemMultiListbox } from './demo/listbox'
import { DemoMenu, type MenuItem } from './demo/menu'
import { PlanRadioGroup } from './demo/radioGroup'
import { DemoTabs } from './demo/tabs'
import { Toast } from './demo/toastModule'
import {
  ROW_COUNT as VIRTUAL_LIST_ROW_COUNT,
  variableActivities,
  variableRowHeightPx,
} from './demo/virtualList'
import { Message } from './message'
import type { Model } from './model'
import type {
  City,
  DemoCard,
  DemoColumn,
  DemoTab,
  ListboxItem,
  Plan,
} from './model'

// REORDER

const reorderColumns = (
  columns: ReadonlyArray<typeof DemoColumn.Type>,
  itemId: string,
  fromContainerId: string,
  toContainerId: string,
  toIndex: number,
): ReadonlyArray<typeof DemoColumn.Type> => {
  const maybeCard: Option.Option<typeof DemoCard.Type> = pipe(
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
          return modifyFields(column, { cards: () => withRemoved })
        }

        const inserted = pipe(withRemoved, cards => [
          ...Array.take(cards, toIndex),
          card,
          ...Array.drop(cards, toIndex),
        ])

        return modifyFields(column, { cards: () => inserted })
      }),
  })
}

const findDragAndDropDemoCardLabel = (
  columns: ReadonlyArray<typeof DemoColumn.Type>,
  itemId: string,
): string =>
  pipe(
    columns,
    Array.flatMap(column => column.cards),
    Array.findFirst(card => card.id === itemId),
    Option.match({
      onNone: () => itemId,
      onSome: card => card.label,
    }),
  )

const findDragAndDropDemoColumnLabel = (
  columns: ReadonlyArray<typeof DemoColumn.Type>,
  containerId: string,
): string =>
  pipe(
    columns,
    Array.findFirst(column => column.id === containerId),
    Option.match({
      onNone: () => containerId,
      onSome: column => column.label,
    }),
  )

const DragAndDropDemoAnnouncement = defineTaggedUnion({
  PickedUp: { label: Schema.String },
  MovedToColumn: { columnLabel: Schema.String, position: Schema.Number },
  MovedWithinColumn: { columnLabel: Schema.String, position: Schema.Number },
  Dropped: {
    label: Schema.String,
    columnLabel: Schema.String,
    position: Schema.Number,
  },
  Cancelled: {},
})
type DragAndDropDemoAnnouncement = typeof DragAndDropDemoAnnouncement.Type

const dragAndDropDemoAnnouncementToText = DragAndDropDemoAnnouncement.match({
  PickedUp: ({ label }) =>
    `Picked up ${label}. Use arrow keys to move within a column, Tab to move between columns, Space to drop, Escape to cancel.`,
  MovedToColumn: ({ columnLabel, position }) =>
    `Moved to ${columnLabel}, position ${position}.`,
  MovedWithinColumn: ({ columnLabel, position }) =>
    `Position ${position} in ${columnLabel}.`,
  Dropped: ({ label, columnLabel, position }) =>
    `Dropped ${label} in position ${position} of ${columnLabel}.`,
  Cancelled: () => 'Drag cancelled.',
})

const maybeDragAndDropDemoKeyboardAnnouncement = (
  model: Model,
  nextDragAndDrop: DragAndDrop.Model,
): Option.Option<DragAndDropDemoAnnouncement> =>
  DragAndDrop.DragState.matchOrElse<Option.Option<DragAndDropDemoAnnouncement>>(
    nextDragAndDrop.dragState,
    {
      KeyboardDragging: nextState =>
        DragAndDrop.DragState.matchOrElse<
          Option.Option<DragAndDropDemoAnnouncement>
        >(
          model.dragAndDropDemo.dragState,
          {
            Idle: () =>
              Option.some(
                DragAndDropDemoAnnouncement.PickedUp({
                  label: findDragAndDropDemoCardLabel(
                    model.dragAndDropDemoColumns,
                    nextState.itemId,
                  ),
                }),
              ),
            KeyboardDragging: previousState => {
              const columnLabel = findDragAndDropDemoColumnLabel(
                model.dragAndDropDemoColumns,
                nextState.targetContainerId,
              )
              const position = nextState.targetIndex + 1

              if (
                previousState.targetContainerId !== nextState.targetContainerId
              ) {
                return Option.some(
                  DragAndDropDemoAnnouncement.MovedToColumn({
                    columnLabel,
                    position,
                  }),
                )
              }

              if (previousState.targetIndex !== nextState.targetIndex) {
                return Option.some(
                  DragAndDropDemoAnnouncement.MovedWithinColumn({
                    columnLabel,
                    position,
                  }),
                )
              }

              return Option.none()
            },
          },
          () => Option.none(),
        ),
    },
    () => Option.none(),
  )

export type UpdateReturn = Update.Return<Model, Message>

// CHILD FOLDS

const foldDialogOutMessage = Dialog.OutMessage.match<
  Update.Step<Model, Message>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({ model }),
})

const foldMenuOutMessage = Menu.OutMessage.match<
  Update.Step<Model, Message>,
  Menu.OutMessage<MenuItem>
>({
  Selected: () => model => ({ model }),
})

const foldPopoverOutMessage = Popover.OutMessage.match<
  Update.Step<Model, Message>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({ model }),
})

const foldCalendarBasicDemoOutMessage = Calendar.OutMessage.match<
  Update.Step<Model, Message>
>({
  SelectedDate:
    ({ date }) =>
    model => ({
      model: modifyFields(model, {
        maybeCalendarBasicDemoSelectedDate: () => Option.some(date),
      }),
    }),
  ChangedViewMonth: () => model => ({ model }),
})

const foldCalendarBasicDemo = Update.foldChild({
  update: Calendar.update,
  read: (model: Model) => Option.some(model.calendarBasicDemo),
  write: (model, nextCalendarBasicDemo) =>
    modifyFields(model, { calendarBasicDemo: () => nextCalendarBasicDemo }),
  toParentMessage: message => Message.GotCalendarBasicDemoMessage({ message }),
  foldOutMessage: foldCalendarBasicDemoOutMessage,
})

const foldDatePickerBasicDemoOutMessage = DatePicker.OutMessage.match<
  Update.Step<Model, Message>
>({
  SelectedDate:
    ({ date }) =>
    model => ({
      model: modifyFields(model, {
        maybeDatePickerBasicDemoSelectedDate: () => Option.some(date),
      }),
    }),
  ClearedDate: () => model => ({
    model: modifyFields(model, {
      maybeDatePickerBasicDemoSelectedDate: () => Option.none(),
    }),
  }),
  ChangedViewMonth: () => model => ({ model }),
})

const foldDatePickerBasicDemo = Update.foldChild({
  update: DatePicker.update,
  read: (model: Model) => Option.some(model.datePickerBasicDemo),
  write: (model, nextDatePickerBasicDemo) =>
    modifyFields(model, { datePickerBasicDemo: () => nextDatePickerBasicDemo }),
  toParentMessage: message =>
    Message.GotDatePickerBasicDemoMessage({ message }),
  foldOutMessage: foldDatePickerBasicDemoOutMessage,
})

const foldComboboxDemoOutMessage = Combobox.OutMessage.match<
  Update.Step<Model, Message>,
  Combobox.OutMessage<City>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: modifyFields(model, {
        maybeComboboxDemoSelectedCity: () => Option.some(value),
      }),
    }),
  ClearedSelection: () => model => ({ model }),
})

const foldComboboxDemo = Update.foldChild({
  update: CityCombobox.update,
  read: (model: Model) => Option.some(model.comboboxDemo),
  write: (model, nextComboboxDemo) =>
    modifyFields(model, { comboboxDemo: () => nextComboboxDemo }),
  toParentMessage: message => Message.GotComboboxDemoMessage({ message }),
  foldOutMessage: foldComboboxDemoOutMessage,
})

const foldComboboxPlacementLockDemoOutMessage = Combobox.OutMessage.match<
  Update.Step<Model, Message>,
  Combobox.OutMessage<City>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: modifyFields(model, {
        maybeComboboxPlacementLockDemoSelectedCity: () => Option.some(value),
      }),
    }),
  ClearedSelection: () => model => ({ model }),
})

const foldComboboxPlacementLockDemo = Update.foldChild({
  update: CityCombobox.update,
  read: (model: Model) => Option.some(model.comboboxPlacementLockDemo),
  write: (model, nextComboboxPlacementLockDemo) =>
    modifyFields(model, {
      comboboxPlacementLockDemo: () => nextComboboxPlacementLockDemo,
    }),
  toParentMessage: message =>
    Message.GotComboboxPlacementLockDemoMessage({ message }),
  foldOutMessage: foldComboboxPlacementLockDemoOutMessage,
})

const foldComboboxNullableDemoOutMessage = Combobox.OutMessage.match<
  Update.Step<Model, Message>,
  Combobox.OutMessage<City>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: modifyFields(model, {
        maybeComboboxNullableDemoSelectedCity:
          maybeComboboxNullableDemoSelectedCity =>
            Option.contains(maybeComboboxNullableDemoSelectedCity, value)
              ? Option.none()
              : Option.some(value),
      }),
    }),
  ClearedSelection: () => model => ({
    model: modifyFields(model, {
      maybeComboboxNullableDemoSelectedCity: () => Option.none(),
    }),
  }),
})

const foldComboboxNullableDemo = Update.foldChild({
  update: CityCombobox.update,
  read: (model: Model) => Option.some(model.comboboxNullableDemo),
  write: (model, nextComboboxNullableDemo) =>
    modifyFields(model, {
      comboboxNullableDemo: () => nextComboboxNullableDemo,
    }),
  toParentMessage: message =>
    Message.GotComboboxNullableDemoMessage({ message }),
  foldOutMessage: foldComboboxNullableDemoOutMessage,
})

const foldComboboxMultiDemoOutMessage = Combobox.OutMessage.match<
  Update.Step<Model, Message>,
  Combobox.OutMessage<City>
>({
  Selected:
    ({ value }) =>
    model => ({
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
  ClearedSelection: () => model => ({ model }),
})

const foldComboboxMultiDemo = Update.foldChild({
  update: CityMultiCombobox.update,
  read: (model: Model) => Option.some(model.comboboxMultiDemo),
  write: (model, nextComboboxMultiDemo) =>
    modifyFields(model, { comboboxMultiDemo: () => nextComboboxMultiDemo }),
  toParentMessage: message => Message.GotComboboxMultiDemoMessage({ message }),
  foldOutMessage: foldComboboxMultiDemoOutMessage,
})

const foldComboboxSelectOnFocusDemoOutMessage = Combobox.OutMessage.match<
  Update.Step<Model, Message>,
  Combobox.OutMessage<City>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: modifyFields(model, {
        maybeComboboxSelectOnFocusDemoSelectedCity: () => Option.some(value),
      }),
    }),
  ClearedSelection: () => model => ({ model }),
})

const foldComboboxSelectOnFocusDemo = Update.foldChild({
  update: CityCombobox.update,
  read: (model: Model) => Option.some(model.comboboxSelectOnFocusDemo),
  write: (model, nextComboboxSelectOnFocusDemo) =>
    modifyFields(model, {
      comboboxSelectOnFocusDemo: () => nextComboboxSelectOnFocusDemo,
    }),
  toParentMessage: message =>
    Message.GotComboboxSelectOnFocusDemoMessage({ message }),
  foldOutMessage: foldComboboxSelectOnFocusDemoOutMessage,
})

const readDialogDemo = (model: Model): Option.Option<Dialog.Model> =>
  Option.some(model.dialogDemo)

const writeDialogDemo = (model: Model, nextDialogDemo: Dialog.Model): Model =>
  modifyFields(model, { dialogDemo: () => nextDialogDemo })

const toGotDialogDemoMessage = (message: Dialog.Message): Message =>
  Message.GotDialogDemoMessage({ message })

const foldDialogDemo = Update.foldChild({
  update: Dialog.update,
  read: readDialogDemo,
  write: writeDialogDemo,
  toParentMessage: toGotDialogDemoMessage,
  foldOutMessage: foldDialogOutMessage,
})

const foldDialogDemoOpen = Update.foldChildStep({
  update: Dialog.open,
  read: readDialogDemo,
  write: writeDialogDemo,
  toParentMessage: toGotDialogDemoMessage,
  foldOutMessage: foldDialogOutMessage,
})

const readDialogAnimatedDemo = (model: Model): Option.Option<Dialog.Model> =>
  Option.some(model.dialogAnimatedDemo)

const writeDialogAnimatedDemo = (
  model: Model,
  nextDialogAnimatedDemo: Dialog.Model,
): Model =>
  modifyFields(model, { dialogAnimatedDemo: () => nextDialogAnimatedDemo })

const toGotDialogAnimatedDemoMessage = (message: Dialog.Message): Message =>
  Message.GotDialogAnimatedDemoMessage({ message })

const foldDialogAnimatedDemo = Update.foldChild({
  update: Dialog.update,
  read: readDialogAnimatedDemo,
  write: writeDialogAnimatedDemo,
  toParentMessage: toGotDialogAnimatedDemoMessage,
  foldOutMessage: foldDialogOutMessage,
})

const foldDialogAnimatedDemoOpen = Update.foldChildStep({
  update: Dialog.open,
  read: readDialogAnimatedDemo,
  write: writeDialogAnimatedDemo,
  toParentMessage: toGotDialogAnimatedDemoMessage,
  foldOutMessage: foldDialogOutMessage,
})

const readOverlayDialogDemo = (model: Model): Option.Option<Dialog.Model> =>
  Option.some(model.overlayDialogDemo)

const writeOverlayDialogDemo = (
  model: Model,
  nextOverlayDialogDemo: Dialog.Model,
): Model =>
  modifyFields(model, { overlayDialogDemo: () => nextOverlayDialogDemo })

const toGotOverlayDialogDemoMessage = (message: Dialog.Message): Message =>
  Message.GotOverlayDialogDemoMessage({ message })

const foldOverlayDialogDemo = Update.foldChild({
  update: Dialog.update,
  read: readOverlayDialogDemo,
  write: writeOverlayDialogDemo,
  toParentMessage: toGotOverlayDialogDemoMessage,
  foldOutMessage: foldDialogOutMessage,
})

const foldOverlayDialogDemoOpen = Update.foldChildStep({
  update: Dialog.open,
  read: readOverlayDialogDemo,
  write: writeOverlayDialogDemo,
  toParentMessage: toGotOverlayDialogDemoMessage,
  foldOutMessage: foldDialogOutMessage,
})

const foldOverlayComboboxDemoOutMessage = Combobox.OutMessage.match<
  Update.Step<Model, Message>,
  Combobox.OutMessage<City>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: modifyFields(model, {
        maybeOverlayComboboxDemoSelectedCity: () => Option.some(value),
      }),
    }),
  ClearedSelection: () => model => ({ model }),
})

const foldOverlayComboboxDemo = Update.foldChild({
  update: CityCombobox.update,
  read: (model: Model) => Option.some(model.overlayComboboxDemo),
  write: (model, nextOverlayComboboxDemo) =>
    modifyFields(model, { overlayComboboxDemo: () => nextOverlayComboboxDemo }),
  toParentMessage: message =>
    Message.GotOverlayComboboxDemoMessage({ message }),
  foldOutMessage: foldOverlayComboboxDemoOutMessage,
})

const readNestedDialogParentDemo = (
  model: Model,
): Option.Option<Dialog.Model> => Option.some(model.nestedDialogParentDemo)

const writeNestedDialogParentDemo = (
  model: Model,
  nextNestedDialogParentDemo: Dialog.Model,
): Model =>
  modifyFields(model, {
    nestedDialogParentDemo: () => nextNestedDialogParentDemo,
  })

const toGotNestedDialogParentDemoMessage = (message: Dialog.Message): Message =>
  Message.GotNestedDialogParentDemoMessage({ message })

const foldNestedDialogParentDemo = Update.foldChild({
  update: Dialog.update,
  read: readNestedDialogParentDemo,
  write: writeNestedDialogParentDemo,
  toParentMessage: toGotNestedDialogParentDemoMessage,
  foldOutMessage: foldDialogOutMessage,
})

const foldNestedDialogParentDemoOpen = Update.foldChildStep({
  update: Dialog.open,
  read: readNestedDialogParentDemo,
  write: writeNestedDialogParentDemo,
  toParentMessage: toGotNestedDialogParentDemoMessage,
  foldOutMessage: foldDialogOutMessage,
})

const readNestedDialogChildDemo = (model: Model): Option.Option<Dialog.Model> =>
  Option.some(model.nestedDialogChildDemo)

const writeNestedDialogChildDemo = (
  model: Model,
  nextNestedDialogChildDemo: Dialog.Model,
): Model =>
  modifyFields(model, {
    nestedDialogChildDemo: () => nextNestedDialogChildDemo,
  })

const toGotNestedDialogChildDemoMessage = (message: Dialog.Message): Message =>
  Message.GotNestedDialogChildDemoMessage({ message })

const foldNestedDialogChildDemo = Update.foldChild({
  update: Dialog.update,
  read: readNestedDialogChildDemo,
  write: writeNestedDialogChildDemo,
  toParentMessage: toGotNestedDialogChildDemoMessage,
  foldOutMessage: foldDialogOutMessage,
})

const foldNestedDialogChildDemoOpen = Update.foldChildStep({
  update: Dialog.open,
  read: readNestedDialogChildDemo,
  write: writeNestedDialogChildDemo,
  toParentMessage: toGotNestedDialogChildDemoMessage,
  foldOutMessage: foldDialogOutMessage,
})

const foldListboxDemoOutMessage = Listbox.OutMessage.match<
  Update.Step<Model, Message>,
  Listbox.OutMessage<ListboxItem>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: modifyFields(model, {
        maybeListboxDemoSelectedItem: () => Option.some(value),
      }),
    }),
})

const foldListboxDemo = Update.foldChild({
  update: ItemListbox.update,
  read: (model: Model) => Option.some(model.listboxDemo),
  write: (model, nextListboxDemo) =>
    modifyFields(model, { listboxDemo: () => nextListboxDemo }),
  toParentMessage: message => Message.GotListboxDemoMessage({ message }),
  foldOutMessage: foldListboxDemoOutMessage,
})

const foldListboxMultiDemoOutMessage = Listbox.OutMessage.match<
  Update.Step<Model, Message>,
  Listbox.OutMessage<ListboxItem>
>({
  Selected:
    ({ value }) =>
    model => ({
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
})

const foldListboxMultiDemo = Update.foldChild({
  update: ItemMultiListbox.update,
  read: (model: Model) => Option.some(model.listboxMultiDemo),
  write: (model, nextListboxMultiDemo) =>
    modifyFields(model, { listboxMultiDemo: () => nextListboxMultiDemo }),
  toParentMessage: message => Message.GotListboxMultiDemoMessage({ message }),
  foldOutMessage: foldListboxMultiDemoOutMessage,
})

const foldListboxGroupedDemoOutMessage = Listbox.OutMessage.match<
  Update.Step<Model, Message>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: modifyFields(model, {
        maybeListboxGroupedDemoSelectedItem: () => Option.some(value),
      }),
    }),
})

const foldListboxGroupedDemo = Update.foldChild({
  update: CharacterListbox.update,
  read: (model: Model) => Option.some(model.listboxGroupedDemo),
  write: (model, nextListboxGroupedDemo) =>
    modifyFields(model, { listboxGroupedDemo: () => nextListboxGroupedDemo }),
  toParentMessage: message => Message.GotListboxGroupedDemoMessage({ message }),
  foldOutMessage: foldListboxGroupedDemoOutMessage,
})

const foldMenuBasicDemo = Update.foldChild({
  update: DemoMenu.update,
  read: (model: Model) => Option.some(model.menuBasicDemo),
  write: (model, nextMenuBasicDemo) =>
    modifyFields(model, { menuBasicDemo: () => nextMenuBasicDemo }),
  toParentMessage: message => Message.GotMenuBasicDemoMessage({ message }),
  foldOutMessage: foldMenuOutMessage,
})

const foldMenuAnimatedDemo = Update.foldChild({
  update: DemoMenu.update,
  read: (model: Model) => Option.some(model.menuAnimatedDemo),
  write: (model, nextMenuAnimatedDemo) =>
    modifyFields(model, { menuAnimatedDemo: () => nextMenuAnimatedDemo }),
  toParentMessage: message => Message.GotMenuAnimatedDemoMessage({ message }),
  foldOutMessage: foldMenuOutMessage,
})

const foldPopoverBasicDemo = Update.foldChild({
  update: Popover.update,
  read: (model: Model) => Option.some(model.popoverBasicDemo),
  write: (model, nextPopoverBasicDemo) =>
    modifyFields(model, { popoverBasicDemo: () => nextPopoverBasicDemo }),
  toParentMessage: message => Message.GotPopoverBasicDemoMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

const foldPopoverAnimatedDemo = Update.foldChild({
  update: Popover.update,
  read: (model: Model) => Option.some(model.popoverAnimatedDemo),
  write: (model, nextPopoverAnimatedDemo) =>
    modifyFields(model, { popoverAnimatedDemo: () => nextPopoverAnimatedDemo }),
  toParentMessage: message =>
    Message.GotPopoverAnimatedDemoMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

const foldPopoverArrowDemo = Update.foldChild({
  update: Popover.update,
  read: (model: Model) => Option.some(model.popoverArrowDemo),
  write: (model, nextPopoverArrowDemo) =>
    modifyFields(model, { popoverArrowDemo: () => nextPopoverArrowDemo }),
  toParentMessage: message => Message.GotPopoverArrowDemoMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

const foldPopoverNestedParentDemo = Update.foldChild({
  update: Popover.update,
  read: (model: Model) => Option.some(model.popoverNestedParentDemo),
  write: (model, nextPopoverNestedParentDemo) =>
    modifyFields(model, {
      popoverNestedParentDemo: () => nextPopoverNestedParentDemo,
    }),
  toParentMessage: message =>
    Message.GotPopoverNestedParentDemoMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

const foldPopoverNestedChildDemo = Update.foldChild({
  update: Popover.update,
  read: (model: Model) => Option.some(model.popoverNestedChildDemo),
  write: (model, nextPopoverNestedChildDemo) =>
    modifyFields(model, {
      popoverNestedChildDemo: () => nextPopoverNestedChildDemo,
    }),
  toParentMessage: message =>
    Message.GotPopoverNestedChildDemoMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

const foldSliderRatingDemoOutMessage = Slider.OutMessage.match<
  Update.Step<Model, Message>
>({
  ChangedValue:
    ({ value }) =>
    model => ({
      model: modifyFields(model, { sliderRatingValue: () => value }),
    }),
})

const foldSliderRatingDemo = Update.foldChild({
  update: Slider.update,
  read: (model: Model) => Option.some(model.sliderRatingDemo),
  write: (model, nextSliderRatingDemo) =>
    modifyFields(model, { sliderRatingDemo: () => nextSliderRatingDemo }),
  toParentMessage: message => Message.GotSliderRatingDemoMessage({ message }),
  foldOutMessage: foldSliderRatingDemoOutMessage,
})

const foldSliderVolumeDemoOutMessage = Slider.OutMessage.match<
  Update.Step<Model, Message>
>({
  ChangedValue:
    ({ value }) =>
    model => ({
      model: modifyFields(model, { sliderVolumeValue: () => value }),
    }),
})

const foldSliderVolumeDemo = Update.foldChild({
  update: Slider.update,
  read: (model: Model) => Option.some(model.sliderVolumeDemo),
  write: (model, nextSliderVolumeDemo) =>
    modifyFields(model, { sliderVolumeDemo: () => nextSliderVolumeDemo }),
  toParentMessage: message => Message.GotSliderVolumeDemoMessage({ message }),
  foldOutMessage: foldSliderVolumeDemoOutMessage,
})

const foldHorizontalTabsDemoOutMessage = Tabs.OutMessage.match<
  Update.Step<Model, Message>,
  Tabs.OutMessage<DemoTab>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: modifyFields(model, { horizontalTabsDemoTab: () => value }),
    }),
})

const foldHorizontalTabsDemo = Update.foldChild({
  update: DemoTabs.update,
  read: (model: Model) => Option.some(model.horizontalTabsDemo),
  write: (model, nextHorizontalTabsDemo) =>
    modifyFields(model, { horizontalTabsDemo: () => nextHorizontalTabsDemo }),
  toParentMessage: message => Message.GotHorizontalTabsDemoMessage({ message }),
  foldOutMessage: foldHorizontalTabsDemoOutMessage,
})

const foldVerticalTabsDemoOutMessage = Tabs.OutMessage.match<
  Update.Step<Model, Message>,
  Tabs.OutMessage<DemoTab>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: modifyFields(model, { verticalTabsDemoTab: () => value }),
    }),
})

const foldVerticalTabsDemo = Update.foldChild({
  update: DemoTabs.update,
  read: (model: Model) => Option.some(model.verticalTabsDemo),
  write: (model, nextVerticalTabsDemo) =>
    modifyFields(model, { verticalTabsDemo: () => nextVerticalTabsDemo }),
  toParentMessage: message => Message.GotVerticalTabsDemoMessage({ message }),
  foldOutMessage: foldVerticalTabsDemoOutMessage,
})

const foldTooltipOutMessage = Tooltip.OutMessage.match<
  Update.Step<Model, Message>
>({
  Shown: () => model => ({ model }),
  Hidden: () => model => ({ model }),
})

const foldTooltipDemo = Update.foldChild({
  update: Tooltip.update,
  read: (model: Model) => Option.some(model.tooltipDemo),
  write: (model, nextTooltipDemo) =>
    modifyFields(model, { tooltipDemo: () => nextTooltipDemo }),
  toParentMessage: message => Message.GotTooltipDemoMessage({ message }),
  foldOutMessage: foldTooltipOutMessage,
})

const foldHoverIntentOutMessage = HoverIntent.OutMessage.match<
  Update.Step<Model, Message>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({ model }),
})

const foldHoverIntentCardDemo = Update.foldChild({
  update: HoverIntent.update,
  read: (model: Model) => Option.some(model.hoverIntentCardDemo),
  write: (model, nextHoverIntentCardDemo) =>
    modifyFields(model, { hoverIntentCardDemo: () => nextHoverIntentCardDemo }),
  toParentMessage: message =>
    Message.GotHoverIntentCardDemoMessage({ message }),
  foldOutMessage: foldHoverIntentOutMessage,
})

const readHoverIntentMenuDemo = (
  model: Model,
): Option.Option<HoverIntent.Model> => Option.some(model.hoverIntentMenuDemo)

const writeHoverIntentMenuDemo = (
  model: Model,
  nextHoverIntentMenuDemo: HoverIntent.Model,
): Model =>
  modifyFields(model, { hoverIntentMenuDemo: () => nextHoverIntentMenuDemo })

const toGotHoverIntentMenuDemoMessage = (
  message: HoverIntent.Message,
): Message => Message.GotHoverIntentMenuDemoMessage({ message })

const foldHoverIntentMenuDemo = Update.foldChild({
  update: HoverIntent.update,
  read: readHoverIntentMenuDemo,
  write: writeHoverIntentMenuDemo,
  toParentMessage: toGotHoverIntentMenuDemoMessage,
  foldOutMessage: foldHoverIntentOutMessage,
})

const foldHoverIntentMenuDemoClose = Update.foldChildStep({
  update: HoverIntent.close,
  read: readHoverIntentMenuDemo,
  write: writeHoverIntentMenuDemo,
  toParentMessage: toGotHoverIntentMenuDemoMessage,
  foldOutMessage: foldHoverIntentOutMessage,
})

const foldToastDemoOutMessage = Toast.OutMessage.match<
  Update.Step<Model, Message>
>({
  DismissedToast:
    ({ payload }) =>
    model => ({
      model: modifyFields(model, {
        maybeLastDismissedToastTitle: () => Option.some(payload.title),
      }),
    }),
})

const readToastDemo = (model: Model): Option.Option<typeof Toast.Model.Type> =>
  Option.some(model.toastDemo)

const writeToastDemo = (
  model: Model,
  nextToastDemo: typeof Toast.Model.Type,
): Model => modifyFields(model, { toastDemo: () => nextToastDemo })

const toGotToastDemoMessage = (message: typeof Toast.Message.Type): Message =>
  Message.GotToastDemoMessage({ message })

const foldToastDemo = Update.foldChild({
  update: Toast.update,
  read: readToastDemo,
  write: writeToastDemo,
  toParentMessage: toGotToastDemoMessage,
  foldOutMessage: foldToastDemoOutMessage,
})

const foldToastDemoShow = Update.foldChild({
  update: Toast.show,
  read: readToastDemo,
  write: writeToastDemo,
  toParentMessage: toGotToastDemoMessage,
  foldOutMessage: foldToastDemoOutMessage,
})

const foldToastDemoDismissAll = Update.foldChildStep({
  update: Toast.dismissAll,
  read: readToastDemo,
  write: writeToastDemo,
  toParentMessage: toGotToastDemoMessage,
  foldOutMessage: foldToastDemoOutMessage,
})

const foldAnimationDemoOutMessage = (
  outMessage: Animation.OutMessage,
  { liftCommand }: Update.FoldContext<Animation.Message, Message>,
) =>
  Animation.OutMessage.match<Update.Step<Model, Message>>(outMessage, {
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
  read: (model: Model) => Option.some(model.animationDemo),
  write: (model, nextAnimationDemo) =>
    modifyFields(model, { animationDemo: () => nextAnimationDemo }),
  toParentMessage: message => Message.GotAnimationDemoMessage({ message }),
  foldOutMessage: foldAnimationDemoOutMessage,
})

const foldAnimationDemoShow = Update.foldChildStep({
  update: Animation.show,
  read: (model: Model) => Option.some(model.animationDemo),
  write: (model, nextAnimationDemo) =>
    modifyFields(model, { animationDemo: () => nextAnimationDemo }),
  toParentMessage: message => Message.GotAnimationDemoMessage({ message }),
})

const foldAnimationDemoHide = Update.foldChildStep({
  update: Animation.hide,
  read: (model: Model) => Option.some(model.animationDemo),
  write: (model, nextAnimationDemo) =>
    modifyFields(model, { animationDemo: () => nextAnimationDemo }),
  toParentMessage: message => Message.GotAnimationDemoMessage({ message }),
})

const foldFileDropBasicDemoOutMessage = FileDrop.OutMessage.match<
  Update.Step<Model, Message>
>({
  ReceivedFiles:
    ({ files }) =>
    model => ({
      model: modifyFields(model, {
        fileDropBasicDemoFiles: Array.appendAll(files),
      }),
    }),
  RejectedNonFiles: () => model => ({ model }),
})

const foldFileDropBasicDemo = Update.foldChild({
  update: FileDrop.update,
  read: (model: Model) => Option.some(model.fileDropBasicDemo),
  write: (model, nextFileDropBasicDemo) =>
    modifyFields(model, { fileDropBasicDemo: () => nextFileDropBasicDemo }),
  toParentMessage: message => Message.GotFileDropBasicDemoMessage({ message }),
  foldOutMessage: foldFileDropBasicDemoOutMessage,
})

const foldDragAndDropDemoOutMessage = DragAndDrop.OutMessage.match<
  Update.Step<Model, Message>
>({
  Reordered:
    ({ itemId, fromContainerId, toContainerId, toIndex }) =>
    model => {
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
  Cancelled: () => model => ({
    model: modifyFields(model, {
      dragAndDropDemoAnnouncement: () =>
        dragAndDropDemoAnnouncementToText(
          DragAndDropDemoAnnouncement.Cancelled(),
        ),
    }),
  }),
})

const foldDragAndDropDemo = Update.foldChild({
  update: DragAndDrop.update,
  read: (model: Model) => Option.some(model.dragAndDropDemo),
  write: (model, nextDragAndDropDemo) =>
    modifyFields(model, {
      dragAndDropDemo: () => nextDragAndDropDemo,
      dragAndDropDemoAnnouncement: dragAndDropDemoAnnouncement =>
        Option.match(
          maybeDragAndDropDemoKeyboardAnnouncement(model, nextDragAndDropDemo),
          {
            onNone: () => dragAndDropDemoAnnouncement,
            onSome: dragAndDropDemoAnnouncementToText,
          },
        ),
    }),
  toParentMessage: message => Message.GotDragAndDropDemoMessage({ message }),
  foldOutMessage: foldDragAndDropDemoOutMessage,
})

const foldVirtualListDemo = Update.foldChild({
  update: VirtualList.update,
  read: (model: Model) => Option.some(model.virtualListDemo),
  write: (model, nextVirtualListDemo) =>
    modifyFields(model, { virtualListDemo: () => nextVirtualListDemo }),
  toParentMessage: message => Message.GotVirtualListDemoMessage({ message }),
})

const foldVirtualListDemoScrollToIndex = Update.foldChild({
  update: VirtualList.scrollToIndex,
  read: (model: Model) => Option.some(model.virtualListDemo),
  write: (model, nextVirtualListDemo) =>
    modifyFields(model, { virtualListDemo: () => nextVirtualListDemo }),
  toParentMessage: message => Message.GotVirtualListDemoMessage({ message }),
})

const foldVirtualListVariableDemo = Update.foldChild({
  update: VirtualList.update,
  read: (model: Model) => Option.some(model.virtualListVariableDemo),
  write: (model, nextVirtualListVariableDemo) =>
    modifyFields(model, {
      virtualListVariableDemo: () => nextVirtualListVariableDemo,
    }),
  toParentMessage: message =>
    Message.GotVirtualListVariableDemoMessage({ message }),
})

const foldVirtualListVariableDemoScrollToIndex = Update.foldChild({
  update: (virtualList: VirtualList.Model, index: number) =>
    VirtualList.scrollToIndexVariable(
      virtualList,
      variableActivities,
      variableRowHeightPx,
      index,
    ),
  read: (model: Model) => Option.some(model.virtualListVariableDemo),
  write: (model, nextVirtualListVariableDemo) =>
    modifyFields(model, {
      virtualListVariableDemo: () => nextVirtualListVariableDemo,
    }),
  toParentMessage: message =>
    Message.GotVirtualListVariableDemoMessage({ message }),
})

// UPDATE

const foldVerticalRadioGroupDemoOutMessage = RadioGroup.OutMessage.match<
  Update.Step<Model, Message>,
  RadioGroup.OutMessage<Plan>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: modifyFields(model, {
        verticalRadioGroupDemoValue: () => Option.some(value),
      }),
    }),
})

const foldVerticalRadioGroupDemo = Update.foldChild({
  update: PlanRadioGroup.update,
  read: (model: Model) => Option.some(model.verticalRadioGroupDemo),
  write: (model, nextVerticalRadioGroupDemo) =>
    modifyFields(model, {
      verticalRadioGroupDemo: () => nextVerticalRadioGroupDemo,
    }),
  toParentMessage: message =>
    Message.GotVerticalRadioGroupDemoMessage({ message }),
  foldOutMessage: foldVerticalRadioGroupDemoOutMessage,
})

const foldHorizontalRadioGroupDemoOutMessage = RadioGroup.OutMessage.match<
  Update.Step<Model, Message>,
  RadioGroup.OutMessage<Plan>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: modifyFields(model, {
        horizontalRadioGroupDemoValue: () => Option.some(value),
      }),
    }),
})

const foldHorizontalRadioGroupDemo = Update.foldChild({
  update: PlanRadioGroup.update,
  read: (model: Model) => Option.some(model.horizontalRadioGroupDemo),
  write: (model, nextHorizontalRadioGroupDemo) =>
    modifyFields(model, {
      horizontalRadioGroupDemo: () => nextHorizontalRadioGroupDemo,
    }),
  toParentMessage: message =>
    Message.GotHorizontalRadioGroupDemoMessage({ message }),
  foldOutMessage: foldHorizontalRadioGroupDemoOutMessage,
})

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    UpdatedInputDemoValue: ({ value }) => ({
      model: modifyFields(model, { inputDemoValue: () => value }),
    }),

    UpdatedTextareaDemoValue: ({ value }) => ({
      model: modifyFields(model, { textareaDemoValue: () => value }),
    }),

    UpdatedFieldsetInputValue: ({ value }) => ({
      model: modifyFields(model, { fieldsetInputValue: () => value }),
    }),

    UpdatedFieldsetTextareaValue: ({ value }) => ({
      model: modifyFields(model, { fieldsetTextareaValue: () => value }),
    }),

    UpdatedSelectDemoValue: ({ value }) => ({
      model: modifyFields(model, { selectDemoValue: () => value }),
    }),

    ToggledFieldsetCheckboxDemo: ({ isChecked }) => ({
      model: modifyFields(model, {
        isFieldsetCheckboxDemoChecked: () => isChecked,
      }),
    }),

    ClickedButtonDemo: () => ({
      model: modifyFields(model, {
        buttonClickCount: Number.increment,
      }),
    }),

    GotCalendarBasicDemoMessage: ({ message }) =>
      foldCalendarBasicDemo(model, message),

    GotDatePickerBasicDemoMessage: ({ message }) =>
      foldDatePickerBasicDemo(model, message),

    ToggledCheckboxBasicDemo: ({ isChecked }) => ({
      model: modifyFields(model, {
        isCheckboxBasicDemoChecked: () => isChecked,
      }),
    }),

    ToggledCheckboxAllDemo: ({ isChecked }) => ({
      model: modifyFields(model, {
        isCheckboxOptionADemoChecked: () => isChecked,
        isCheckboxOptionBDemoChecked: () => isChecked,
      }),
    }),

    ToggledCheckboxOptionADemo: ({ isChecked }) => ({
      model: modifyFields(model, {
        isCheckboxOptionADemoChecked: () => isChecked,
      }),
    }),

    ToggledCheckboxOptionBDemo: ({ isChecked }) => ({
      model: modifyFields(model, {
        isCheckboxOptionBDemoChecked: () => isChecked,
      }),
    }),

    GotComboboxDemoMessage: ({ message }) => foldComboboxDemo(model, message),

    GotComboboxPlacementLockDemoMessage: ({ message }) =>
      foldComboboxPlacementLockDemo(model, message),

    GotComboboxNullableDemoMessage: ({ message }) =>
      foldComboboxNullableDemo(model, message),

    GotComboboxMultiDemoMessage: ({ message }) =>
      foldComboboxMultiDemo(model, message),

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

    ToggledDisclosureDemo: ({ isOpen }) => ({
      model: modifyFields(model, { isDisclosureDemoOpen: () => isOpen }),
    }),

    ToggledDisclosureCollapsedPreviewDemo: ({ isOpen }) => ({
      model: modifyFields(model, {
        isDisclosureCollapsedPreviewDemoOpen: () => isOpen,
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

    GotPopoverArrowDemoMessage: ({ message }) =>
      foldPopoverArrowDemo(model, message),

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
      model: modifyFields(model, { isSwitchDemoChecked: () => isChecked }),
    }),

    GotHorizontalTabsDemoMessage: ({ message }) =>
      foldHorizontalTabsDemo(model, message),

    GotVerticalTabsDemoMessage: ({ message }) =>
      foldVerticalTabsDemo(model, message),

    GotTooltipDemoMessage: ({ message }) => foldTooltipDemo(model, message),

    GotHoverIntentCardDemoMessage: ({ message }) =>
      foldHoverIntentCardDemo(model, message),

    GotHoverIntentMenuDemoMessage: ({ message }) =>
      foldHoverIntentMenuDemo(model, message),

    ClickedHoverIntentMenuItem: () => foldHoverIntentMenuDemoClose(model),

    GotToastDemoMessage: ({ message }) => foldToastDemo(model, message),

    ClickedShowInfoToast: () =>
      foldToastDemoShow(model, {
        variant: 'Info',
        payload: {
          title: 'Preferences updated',
          maybeDescription: Option.some('Your changes are saved.'),
        },
      }),

    ClickedShowSuccessToast: () =>
      foldToastDemoShow(model, {
        variant: 'Success',
        payload: {
          title: 'Uploaded',
          maybeDescription: Option.some('kit-manual.pdf is now available.'),
        },
      }),

    ClickedShowErrorToast: () =>
      foldToastDemoShow(model, {
        variant: 'Error',
        payload: {
          title: 'Save failed',
          maybeDescription: Option.some('Check your connection and try again.'),
        },
      }),

    ClickedShowStickyToast: () =>
      foldToastDemoShow(model, {
        variant: 'Info',
        payload: {
          title: 'Action required',
          maybeDescription: Option.some('Stays visible until dismissed.'),
        },
        sticky: true,
      }),

    ClickedDismissAllToasts: () => foldToastDemoDismissAll(model),

    GotAnimationDemoMessage: ({ message }) => foldAnimationDemo(model, message),

    ClickedToggleAnimationDemo: () =>
      model.animationDemo.isShowing
        ? foldAnimationDemoHide(model)
        : foldAnimationDemoShow(model),

    GotFileDropBasicDemoMessage: ({ message }) =>
      foldFileDropBasicDemo(model, message),

    ClickedRemoveFileDropDemoFile: ({ fileIndex }) => ({
      model: modifyFields(model, {
        fileDropBasicDemoFiles: () =>
          Array.remove(model.fileDropBasicDemoFiles, fileIndex),
      }),
    }),

    GotDragAndDropDemoMessage: ({ message }) =>
      foldDragAndDropDemo(model, message),

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
