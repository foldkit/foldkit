import { Array, Match as M, Number, Option, pipe } from 'effect'
import { Command, Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import {
  Animation,
  Calendar,
  Combobox,
  DatePicker,
  Dialog,
  DragAndDrop,
  FileDrop,
  Listbox,
  Menu,
  Popover,
  RadioGroup,
  Slider,
  Tabs,
  Tooltip,
  VirtualList,
} from '@foldkit/ui'

import { CityCombobox, CityMultiCombobox } from './combobox'
import { CharacterListbox, ItemListbox, ItemMultiListbox } from './listbox'
import { DemoMenu, type MenuItem } from './menu'
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
import { PlanRadioGroup } from './radioGroup'
import { DemoTabs } from './tabs'
import { Toast } from './toastModule'
import {
  ROW_COUNT as VIRTUAL_LIST_ROW_COUNT,
  variableActivities,
  variableRowHeightPx,
} from './virtualList'

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
          return evo(column, { cards: () => withRemoved })
        }

        const inserted = pipe(withRemoved, cards => [
          ...Array.take(cards, toIndex),
          card,
          ...Array.drop(cards, toIndex),
        ])

        return evo(column, { cards: () => inserted })
      }),
  })
}

export type UpdateReturn = Update.Return<Model, Message>

// CHILD FOLDS

const foldDialogOutMessage = M.type<Dialog.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Opened: () => model => ({ model }),
    Closed: () => model => ({ model }),
  }),
)

const foldMenuOutMessage = M.type<Menu.OutMessage<MenuItem>>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected: () => model => ({ model }),
  }),
)

const foldPopoverOutMessage = M.type<Popover.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Opened: () => model => ({ model }),
    Closed: () => model => ({ model }),
  }),
)

const foldCalendarBasicDemoOutMessage = M.type<Calendar.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    SelectedDate:
      ({ date }) =>
      model => ({
        model: evo(model, {
          maybeCalendarBasicDemoSelectedDate: () => Option.some(date),
        }),
      }),
    ChangedViewMonth: () => model => ({ model }),
  }),
)

const foldCalendarBasicDemo = Update.foldChild({
  update: Calendar.update,
  read: (model: Model) => Option.some(model.calendarBasicDemo),
  write: (model, nextCalendarBasicDemo) =>
    evo(model, { calendarBasicDemo: () => nextCalendarBasicDemo }),
  toParentMessage: message => Message.GotCalendarBasicDemoMessage({ message }),
  foldOutMessage: foldCalendarBasicDemoOutMessage,
})

const foldDatePickerBasicDemoOutMessage = M.type<DatePicker.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
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
  }),
)

const foldDatePickerBasicDemo = Update.foldChild({
  update: DatePicker.update,
  read: (model: Model) => Option.some(model.datePickerBasicDemo),
  write: (model, nextDatePickerBasicDemo) =>
    evo(model, { datePickerBasicDemo: () => nextDatePickerBasicDemo }),
  toParentMessage: message =>
    Message.GotDatePickerBasicDemoMessage({ message }),
  foldOutMessage: foldDatePickerBasicDemoOutMessage,
})

const foldComboboxDemoOutMessage = M.type<Combobox.OutMessage<City>>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          maybeComboboxDemoSelectedCity: () => Option.some(value),
        }),
      }),
    ClearedSelection: () => model => ({ model }),
  }),
)

const foldComboboxDemo = Update.foldChild({
  update: CityCombobox.update,
  read: (model: Model) => Option.some(model.comboboxDemo),
  write: (model, nextComboboxDemo) =>
    evo(model, { comboboxDemo: () => nextComboboxDemo }),
  toParentMessage: message => Message.GotComboboxDemoMessage({ message }),
  foldOutMessage: foldComboboxDemoOutMessage,
})

const foldComboboxPlacementLockDemoOutMessage = M.type<
  Combobox.OutMessage<City>
>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          maybeComboboxPlacementLockDemoSelectedCity: () => Option.some(value),
        }),
      }),
    ClearedSelection: () => model => ({ model }),
  }),
)

const foldComboboxPlacementLockDemo = Update.foldChild({
  update: CityCombobox.update,
  read: (model: Model) => Option.some(model.comboboxPlacementLockDemo),
  write: (model, nextComboboxPlacementLockDemo) =>
    evo(model, {
      comboboxPlacementLockDemo: () => nextComboboxPlacementLockDemo,
    }),
  toParentMessage: message =>
    Message.GotComboboxPlacementLockDemoMessage({ message }),
  foldOutMessage: foldComboboxPlacementLockDemoOutMessage,
})

const foldComboboxNullableDemoOutMessage = M.type<
  Combobox.OutMessage<City>
>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          maybeComboboxNullableDemoSelectedCity: () =>
            Option.contains(model.maybeComboboxNullableDemoSelectedCity, value)
              ? Option.none()
              : Option.some(value),
        }),
      }),
    ClearedSelection: () => model => ({
      model: evo(model, {
        maybeComboboxNullableDemoSelectedCity: () => Option.none(),
      }),
    }),
  }),
)

const foldComboboxNullableDemo = Update.foldChild({
  update: CityCombobox.update,
  read: (model: Model) => Option.some(model.comboboxNullableDemo),
  write: (model, nextComboboxNullableDemo) =>
    evo(model, { comboboxNullableDemo: () => nextComboboxNullableDemo }),
  toParentMessage: message =>
    Message.GotComboboxNullableDemoMessage({ message }),
  foldOutMessage: foldComboboxNullableDemoOutMessage,
})

const foldComboboxMultiDemoOutMessage = M.type<
  Combobox.OutMessage<City>
>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          comboboxMultiDemoSelectedCities: () =>
            Array.contains(model.comboboxMultiDemoSelectedCities, value)
              ? Array.filter(
                  model.comboboxMultiDemoSelectedCities,
                  city => city !== value,
                )
              : Array.append(model.comboboxMultiDemoSelectedCities, value),
        }),
      }),
    ClearedSelection: () => model => ({ model }),
  }),
)

const foldComboboxMultiDemo = Update.foldChild({
  update: CityMultiCombobox.update,
  read: (model: Model) => Option.some(model.comboboxMultiDemo),
  write: (model, nextComboboxMultiDemo) =>
    evo(model, { comboboxMultiDemo: () => nextComboboxMultiDemo }),
  toParentMessage: message => Message.GotComboboxMultiDemoMessage({ message }),
  foldOutMessage: foldComboboxMultiDemoOutMessage,
})

const foldComboboxSelectOnFocusDemoOutMessage = M.type<
  Combobox.OutMessage<City>
>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          maybeComboboxSelectOnFocusDemoSelectedCity: () => Option.some(value),
        }),
      }),
    ClearedSelection: () => model => ({ model }),
  }),
)

const foldComboboxSelectOnFocusDemo = Update.foldChild({
  update: CityCombobox.update,
  read: (model: Model) => Option.some(model.comboboxSelectOnFocusDemo),
  write: (model, nextComboboxSelectOnFocusDemo) =>
    evo(model, {
      comboboxSelectOnFocusDemo: () => nextComboboxSelectOnFocusDemo,
    }),
  toParentMessage: message =>
    Message.GotComboboxSelectOnFocusDemoMessage({ message }),
  foldOutMessage: foldComboboxSelectOnFocusDemoOutMessage,
})

const readDialogDemo = (model: Model): Option.Option<Dialog.Model> =>
  Option.some(model.dialogDemo)

const writeDialogDemo = (model: Model, nextDialogDemo: Dialog.Model): Model =>
  evo(model, { dialogDemo: () => nextDialogDemo })

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
): Model => evo(model, { dialogAnimatedDemo: () => nextDialogAnimatedDemo })

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
): Model => evo(model, { overlayDialogDemo: () => nextOverlayDialogDemo })

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

const foldOverlayComboboxDemoOutMessage = M.type<
  Combobox.OutMessage<City>
>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          maybeOverlayComboboxDemoSelectedCity: () => Option.some(value),
        }),
      }),
    ClearedSelection: () => model => ({ model }),
  }),
)

const foldOverlayComboboxDemo = Update.foldChild({
  update: CityCombobox.update,
  read: (model: Model) => Option.some(model.overlayComboboxDemo),
  write: (model, nextOverlayComboboxDemo) =>
    evo(model, { overlayComboboxDemo: () => nextOverlayComboboxDemo }),
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
  evo(model, { nestedDialogParentDemo: () => nextNestedDialogParentDemo })

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
  evo(model, { nestedDialogChildDemo: () => nextNestedDialogChildDemo })

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

const foldListboxDemoOutMessage = M.type<
  Listbox.OutMessage<ListboxItem>
>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          maybeListboxDemoSelectedItem: () => Option.some(value),
        }),
      }),
  }),
)

const foldListboxDemo = Update.foldChild({
  update: ItemListbox.update,
  read: (model: Model) => Option.some(model.listboxDemo),
  write: (model, nextListboxDemo) =>
    evo(model, { listboxDemo: () => nextListboxDemo }),
  toParentMessage: message => Message.GotListboxDemoMessage({ message }),
  foldOutMessage: foldListboxDemoOutMessage,
})

const foldListboxMultiDemoOutMessage = M.type<
  Listbox.OutMessage<ListboxItem>
>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => {
        const nextListboxMultiDemoSelectedItems: ReadonlyArray<ListboxItem> =
          Array.contains(model.listboxMultiDemoSelectedItems, value)
            ? Array.filter(
                model.listboxMultiDemoSelectedItems,
                item => item !== value,
              )
            : Array.append(model.listboxMultiDemoSelectedItems, value)

        return {
          model: evo(model, {
            listboxMultiDemoSelectedItems: () =>
              nextListboxMultiDemoSelectedItems,
          }),
        }
      },
  }),
)

const foldListboxMultiDemo = Update.foldChild({
  update: ItemMultiListbox.update,
  read: (model: Model) => Option.some(model.listboxMultiDemo),
  write: (model, nextListboxMultiDemo) =>
    evo(model, { listboxMultiDemo: () => nextListboxMultiDemo }),
  toParentMessage: message => Message.GotListboxMultiDemoMessage({ message }),
  foldOutMessage: foldListboxMultiDemoOutMessage,
})

const foldListboxGroupedDemoOutMessage = M.type<Listbox.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          maybeListboxGroupedDemoSelectedItem: () => Option.some(value),
        }),
      }),
  }),
)

const foldListboxGroupedDemo = Update.foldChild({
  update: CharacterListbox.update,
  read: (model: Model) => Option.some(model.listboxGroupedDemo),
  write: (model, nextListboxGroupedDemo) =>
    evo(model, { listboxGroupedDemo: () => nextListboxGroupedDemo }),
  toParentMessage: message => Message.GotListboxGroupedDemoMessage({ message }),
  foldOutMessage: foldListboxGroupedDemoOutMessage,
})

const foldMenuBasicDemo = Update.foldChild({
  update: DemoMenu.update,
  read: (model: Model) => Option.some(model.menuBasicDemo),
  write: (model, nextMenuBasicDemo) =>
    evo(model, { menuBasicDemo: () => nextMenuBasicDemo }),
  toParentMessage: message => Message.GotMenuBasicDemoMessage({ message }),
  foldOutMessage: foldMenuOutMessage,
})

const foldMenuAnimatedDemo = Update.foldChild({
  update: DemoMenu.update,
  read: (model: Model) => Option.some(model.menuAnimatedDemo),
  write: (model, nextMenuAnimatedDemo) =>
    evo(model, { menuAnimatedDemo: () => nextMenuAnimatedDemo }),
  toParentMessage: message => Message.GotMenuAnimatedDemoMessage({ message }),
  foldOutMessage: foldMenuOutMessage,
})

const foldPopoverBasicDemo = Update.foldChild({
  update: Popover.update,
  read: (model: Model) => Option.some(model.popoverBasicDemo),
  write: (model, nextPopoverBasicDemo) =>
    evo(model, { popoverBasicDemo: () => nextPopoverBasicDemo }),
  toParentMessage: message => Message.GotPopoverBasicDemoMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

const foldPopoverAnimatedDemo = Update.foldChild({
  update: Popover.update,
  read: (model: Model) => Option.some(model.popoverAnimatedDemo),
  write: (model, nextPopoverAnimatedDemo) =>
    evo(model, { popoverAnimatedDemo: () => nextPopoverAnimatedDemo }),
  toParentMessage: message =>
    Message.GotPopoverAnimatedDemoMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

const foldPopoverNestedParentDemo = Update.foldChild({
  update: Popover.update,
  read: (model: Model) => Option.some(model.popoverNestedParentDemo),
  write: (model, nextPopoverNestedParentDemo) =>
    evo(model, { popoverNestedParentDemo: () => nextPopoverNestedParentDemo }),
  toParentMessage: message =>
    Message.GotPopoverNestedParentDemoMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

const foldPopoverNestedChildDemo = Update.foldChild({
  update: Popover.update,
  read: (model: Model) => Option.some(model.popoverNestedChildDemo),
  write: (model, nextPopoverNestedChildDemo) =>
    evo(model, { popoverNestedChildDemo: () => nextPopoverNestedChildDemo }),
  toParentMessage: message =>
    Message.GotPopoverNestedChildDemoMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

const foldSliderRatingDemoOutMessage = M.type<Slider.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    ChangedValue:
      ({ value }) =>
      model => ({ model: evo(model, { sliderRatingValue: () => value }) }),
  }),
)

const foldSliderRatingDemo = Update.foldChild({
  update: Slider.update,
  read: (model: Model) => Option.some(model.sliderRatingDemo),
  write: (model, nextSliderRatingDemo) =>
    evo(model, { sliderRatingDemo: () => nextSliderRatingDemo }),
  toParentMessage: message => Message.GotSliderRatingDemoMessage({ message }),
  foldOutMessage: foldSliderRatingDemoOutMessage,
})

const foldSliderVolumeDemoOutMessage = M.type<Slider.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    ChangedValue:
      ({ value }) =>
      model => ({ model: evo(model, { sliderVolumeValue: () => value }) }),
  }),
)

const foldSliderVolumeDemo = Update.foldChild({
  update: Slider.update,
  read: (model: Model) => Option.some(model.sliderVolumeDemo),
  write: (model, nextSliderVolumeDemo) =>
    evo(model, { sliderVolumeDemo: () => nextSliderVolumeDemo }),
  toParentMessage: message => Message.GotSliderVolumeDemoMessage({ message }),
  foldOutMessage: foldSliderVolumeDemoOutMessage,
})

const foldHorizontalTabsDemoOutMessage = M.type<
  Tabs.OutMessage<DemoTab>
>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({ model: evo(model, { horizontalTabsDemoTab: () => value }) }),
  }),
)

const foldHorizontalTabsDemo = Update.foldChild({
  update: DemoTabs.update,
  read: (model: Model) => Option.some(model.horizontalTabsDemo),
  write: (model, nextHorizontalTabsDemo) =>
    evo(model, { horizontalTabsDemo: () => nextHorizontalTabsDemo }),
  toParentMessage: message => Message.GotHorizontalTabsDemoMessage({ message }),
  foldOutMessage: foldHorizontalTabsDemoOutMessage,
})

const foldVerticalTabsDemoOutMessage = M.type<Tabs.OutMessage<DemoTab>>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({ model: evo(model, { verticalTabsDemoTab: () => value }) }),
  }),
)

const foldVerticalTabsDemo = Update.foldChild({
  update: DemoTabs.update,
  read: (model: Model) => Option.some(model.verticalTabsDemo),
  write: (model, nextVerticalTabsDemo) =>
    evo(model, { verticalTabsDemo: () => nextVerticalTabsDemo }),
  toParentMessage: message => Message.GotVerticalTabsDemoMessage({ message }),
  foldOutMessage: foldVerticalTabsDemoOutMessage,
})

const foldTooltipOutMessage = M.type<Tooltip.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Shown: () => model => ({ model }),
    Hidden: () => model => ({ model }),
  }),
)

const foldTooltipDemo = Update.foldChild({
  update: Tooltip.update,
  read: (model: Model) => Option.some(model.tooltipDemo),
  write: (model, nextTooltipDemo) =>
    evo(model, { tooltipDemo: () => nextTooltipDemo }),
  toParentMessage: message => Message.GotTooltipDemoMessage({ message }),
  foldOutMessage: foldTooltipOutMessage,
})

const foldToastDemoOutMessage = M.type<typeof Toast.OutMessage.Type>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    DismissedToast:
      ({ payload }) =>
      model => ({
        model: evo(model, {
          maybeLastDismissedToastTitle: () => Option.some(payload.title),
        }),
      }),
  }),
)

const readToastDemo = (model: Model): Option.Option<typeof Toast.Model.Type> =>
  Option.some(model.toastDemo)

const writeToastDemo = (
  model: Model,
  nextToastDemo: typeof Toast.Model.Type,
): Model => evo(model, { toastDemo: () => nextToastDemo })

const toGotToastDemoMessage = (message: typeof Toast.Message.Type): Message =>
  Message.GotToastDemoMessage({ message })

const foldToastDemo = Update.foldChild({
  update: Toast.update,
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
    evo(model, { animationDemo: () => nextAnimationDemo }),
  toParentMessage: message => Message.GotAnimationDemoMessage({ message }),
  foldOutMessage: foldAnimationDemoOutMessage,
})

const foldFileDropBasicDemoOutMessage = M.type<FileDrop.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    ReceivedFiles:
      ({ files }) =>
      model => ({
        model: evo(model, {
          fileDropBasicDemoFiles: () => [
            ...model.fileDropBasicDemoFiles,
            ...files,
          ],
        }),
      }),
    RejectedNonFiles: () => model => ({ model }),
  }),
)

const foldFileDropBasicDemo = Update.foldChild({
  update: FileDrop.update,
  read: (model: Model) => Option.some(model.fileDropBasicDemo),
  write: (model, nextFileDropBasicDemo) =>
    evo(model, { fileDropBasicDemo: () => nextFileDropBasicDemo }),
  toParentMessage: message => Message.GotFileDropBasicDemoMessage({ message }),
  foldOutMessage: foldFileDropBasicDemoOutMessage,
})

const foldDragAndDropDemoOutMessage = M.type<DragAndDrop.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Reordered:
      ({ itemId, fromContainerId, toContainerId, toIndex }) =>
      model => ({
        model: evo(model, {
          dragAndDropDemoColumns: () =>
            reorderColumns(
              model.dragAndDropDemoColumns,
              itemId,
              fromContainerId,
              toContainerId,
              toIndex,
            ),
        }),
      }),
    Cancelled: () => model => ({ model }),
  }),
)

const foldDragAndDropDemo = Update.foldChild({
  update: DragAndDrop.update,
  read: (model: Model) => Option.some(model.dragAndDropDemo),
  write: (model, nextDragAndDropDemo) =>
    evo(model, { dragAndDropDemo: () => nextDragAndDropDemo }),
  toParentMessage: message => Message.GotDragAndDropDemoMessage({ message }),
  foldOutMessage: foldDragAndDropDemoOutMessage,
})

const foldVirtualListDemo = Update.foldChild({
  update: VirtualList.update,
  read: (model: Model) => Option.some(model.virtualListDemo),
  write: (model, nextVirtualListDemo) =>
    evo(model, { virtualListDemo: () => nextVirtualListDemo }),
  toParentMessage: message => Message.GotVirtualListDemoMessage({ message }),
})

const foldVirtualListVariableDemo = Update.foldChild({
  update: VirtualList.update,
  read: (model: Model) => Option.some(model.virtualListVariableDemo),
  write: (model, nextVirtualListVariableDemo) =>
    evo(model, { virtualListVariableDemo: () => nextVirtualListVariableDemo }),
  toParentMessage: message =>
    Message.GotVirtualListVariableDemoMessage({ message }),
})

// UPDATE

const foldVerticalRadioGroupDemoOutMessage = M.type<
  RadioGroup.OutMessage<Plan>
>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          verticalRadioGroupDemoValue: () => Option.some(value),
        }),
      }),
  }),
)

const foldVerticalRadioGroupDemo = Update.foldChild({
  update: PlanRadioGroup.update,
  read: (model: Model) => Option.some(model.verticalRadioGroupDemo),
  write: (model, nextVerticalRadioGroupDemo) =>
    evo(model, { verticalRadioGroupDemo: () => nextVerticalRadioGroupDemo }),
  toParentMessage: message =>
    Message.GotVerticalRadioGroupDemoMessage({ message }),
  foldOutMessage: foldVerticalRadioGroupDemoOutMessage,
})

const foldHorizontalRadioGroupDemoOutMessage = M.type<
  RadioGroup.OutMessage<Plan>
>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          horizontalRadioGroupDemoValue: () => Option.some(value),
        }),
      }),
  }),
)

const foldHorizontalRadioGroupDemo = Update.foldChild({
  update: PlanRadioGroup.update,
  read: (model: Model) => Option.some(model.horizontalRadioGroupDemo),
  write: (model, nextHorizontalRadioGroupDemo) =>
    evo(model, {
      horizontalRadioGroupDemo: () => nextHorizontalRadioGroupDemo,
    }),
  toParentMessage: message =>
    Message.GotHorizontalRadioGroupDemoMessage({ message }),
  foldOutMessage: foldHorizontalRadioGroupDemoOutMessage,
})

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
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
      model: evo(model, { isFieldsetCheckboxDemoChecked: () => isChecked }),
    }),

    ClickedButtonDemo: () => ({
      model: evo(model, {
        buttonClickCount: Number.increment,
      }),
    }),

    GotCalendarBasicDemoMessage: ({ message }) =>
      foldCalendarBasicDemo(model, message),

    GotDatePickerBasicDemoMessage: ({ message }) =>
      foldDatePickerBasicDemo(model, message),

    ToggledCheckboxBasicDemo: ({ isChecked }) => ({
      model: evo(model, { isCheckboxBasicDemoChecked: () => isChecked }),
    }),

    ToggledCheckboxAllDemo: ({ isChecked }) => ({
      model: evo(model, {
        isCheckboxOptionADemoChecked: () => isChecked,
        isCheckboxOptionBDemoChecked: () => isChecked,
      }),
    }),

    ToggledCheckboxOptionADemo: ({ isChecked }) => ({
      model: evo(model, { isCheckboxOptionADemoChecked: () => isChecked }),
    }),

    ToggledCheckboxOptionBDemo: ({ isChecked }) => ({
      model: evo(model, { isCheckboxOptionBDemoChecked: () => isChecked }),
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
      model: evo(model, { isDisclosureDemoOpen: () => isOpen }),
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
      model: evo(model, { isSwitchDemoChecked: () => isChecked }),
    }),

    GotHorizontalTabsDemoMessage: ({ message }) =>
      foldHorizontalTabsDemo(model, message),

    GotVerticalTabsDemoMessage: ({ message }) =>
      foldVerticalTabsDemo(model, message),

    GotTooltipDemoMessage: ({ message }) => foldTooltipDemo(model, message),

    GotToastDemoMessage: ({ message }) => foldToastDemo(model, message),

    ClickedShowInfoToast: () => {
      const toastShow = Toast.show(model.toastDemo, {
        variant: 'Info',
        payload: {
          title: 'Preferences updated',
          maybeDescription: Option.some('Your changes are saved.'),
        },
      })

      return {
        model: evo(model, { toastDemo: () => toastShow.model }),
        commands: Command.mapMessages(toastShow.commands ?? [], message =>
          Message.GotToastDemoMessage({ message }),
        ),
      }
    },

    ClickedShowSuccessToast: () => {
      const toastShow = Toast.show(model.toastDemo, {
        variant: 'Success',
        payload: {
          title: 'Uploaded',
          maybeDescription: Option.some('kit-manual.pdf is now available.'),
        },
      })

      return {
        model: evo(model, { toastDemo: () => toastShow.model }),
        commands: Command.mapMessages(toastShow.commands ?? [], message =>
          Message.GotToastDemoMessage({ message }),
        ),
      }
    },

    ClickedShowErrorToast: () => {
      const toastShow = Toast.show(model.toastDemo, {
        variant: 'Error',
        payload: {
          title: 'Save failed',
          maybeDescription: Option.some('Check your connection and try again.'),
        },
      })

      return {
        model: evo(model, { toastDemo: () => toastShow.model }),
        commands: Command.mapMessages(toastShow.commands ?? [], message =>
          Message.GotToastDemoMessage({ message }),
        ),
      }
    },

    ClickedShowStickyToast: () => {
      const toastShow = Toast.show(model.toastDemo, {
        variant: 'Info',
        payload: {
          title: 'Action required',
          maybeDescription: Option.some('Stays visible until dismissed.'),
        },
        sticky: true,
      })

      return {
        model: evo(model, { toastDemo: () => toastShow.model }),
        commands: Command.mapMessages(toastShow.commands ?? [], message =>
          Message.GotToastDemoMessage({ message }),
        ),
      }
    },

    ClickedDismissAllToasts: () => foldToastDemoDismissAll(model),

    GotAnimationDemoMessage: ({ message }) => foldAnimationDemo(model, message),

    GotFileDropBasicDemoMessage: ({ message }) =>
      foldFileDropBasicDemo(model, message),

    ClickedRemoveFileDropDemoFile: ({ fileIndex }) => ({
      model: evo(model, {
        fileDropBasicDemoFiles: () =>
          Array.remove(model.fileDropBasicDemoFiles, fileIndex),
      }),
    }),

    GotDragAndDropDemoMessage: ({ message }) =>
      foldDragAndDropDemo(model, message),

    GotVirtualListDemoMessage: ({ message }) =>
      foldVirtualListDemo(model, message),

    ClickedVirtualListScrollToMiddle: () => {
      const virtualListScroll = VirtualList.scrollToIndex(
        model.virtualListDemo,
        Math.floor(VIRTUAL_LIST_ROW_COUNT / 2),
      )

      return {
        model: evo(model, {
          virtualListDemo: () => virtualListScroll.model,
        }),
        commands: Command.mapMessages(
          virtualListScroll.commands ?? [],
          message => Message.GotVirtualListDemoMessage({ message }),
        ),
      }
    },

    GotVirtualListVariableDemoMessage: ({ message }) =>
      foldVirtualListVariableDemo(model, message),

    ClickedVirtualListVariableScrollToMiddle: () => {
      const virtualListVariableScroll = VirtualList.scrollToIndexVariable(
        model.virtualListVariableDemo,
        variableActivities,
        variableRowHeightPx,
        Math.floor(VIRTUAL_LIST_ROW_COUNT / 2),
      )

      return {
        model: evo(model, {
          virtualListVariableDemo: () => virtualListVariableScroll.model,
        }),
        commands: Command.mapMessages(
          virtualListVariableScroll.commands ?? [],
          message => Message.GotVirtualListVariableDemoMessage({ message }),
        ),
      }
    },
  })
