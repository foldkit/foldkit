import { Array, Option, Schema, pipe } from 'effect'
import { Block, Calendar } from 'foldkit'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import {
  Animation,
  DatePicker,
  Dialog,
  DragAndDrop,
  FileDrop,
  HoverIntent,
  Popover,
  Slider,
  Tooltip,
  Calendar as UiCalendar,
} from '@foldkit/ui'

import {
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
} from './block'
import { CityComboboxBlock, CityMultiComboboxBlock } from './combobox'
import {
  ActivityVirtualListBlock,
  CharacterListboxBlock,
  DemoMenuBlock,
  DemoTabsBlock,
  ItemListboxBlock,
  ItemMultiListboxBlock,
  PlanRadioGroupBlock,
} from './controls'
import { type DemoCard, type DemoColumn } from './domain/domain'
import { ToastBlock } from './toast'
import {
  VirtualListChatDemoBinding,
  VirtualListChatHistoryModeGroupBinding,
} from './virtualListChat'

export {
  VirtualListChatDemoBinding,
  VirtualListChatHistoryModeGroupBinding,
} from './virtualListChat'

const reorderColumns = (
  columns: ReadonlyArray<DemoColumn>,
  itemId: string,
  fromContainerId: string,
  toContainerId: string,
  toIndex: number,
): ReadonlyArray<DemoColumn> => {
  const maybeCard: Option.Option<DemoCard> = pipe(
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
  columns: ReadonlyArray<DemoColumn>,
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
  columns: ReadonlyArray<DemoColumn>,
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

const foldDialogOutMessage = makeOutMessageFold(Dialog.DialogBlock, {
  Opened: makeNoopStep,
  Closed: makeNoopStep,
  CompletedClose: makeNoopStep,
})

const foldMenuOutMessage = makeOutMessageFold(DemoMenuBlock, {
  Selected: makeNoopStep,
  Closed: makeNoopStep,
})

const foldPopoverOutMessage = makeOutMessageFold(Popover.PopoverBlock, {
  Opened: makeNoopStep,
  Closed: makeNoopStep,
})

export const CalendarBasicDemoBinding = makeRequiredFieldBinding(
  UiCalendar.CalendarBlock,
  {
    field: 'calendarBasicDemo',
    init: {
      contextToArgs: today => [
        {
          id: 'calendar-basic-demo',
          today,
          minDate: Calendar.subtractYears(today, 1),
          maxDate: Calendar.addYears(today, 1),
        },
      ],
    },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(UiCalendar.CalendarBlock, {
    SelectedDate: ({ date }) =>
      makeFieldsStep(() => ({
        maybeCalendarBasicDemoSelectedDate: () => Option.some(date),
      })),
    ChangedViewMonth: makeNoopStep,
  }),
})

export const DatePickerBasicDemoBinding = makeRequiredFieldBinding(
  DatePicker.DatePickerBlock,
  {
    field: 'datePickerBasicDemo',
    init: {
      contextToArgs: today => [
        {
          id: 'date-picker-basic-demo',
          today,
          minDate: Calendar.subtractYears(today, 1),
          maxDate: Calendar.addYears(today, 1),
        },
      ],
    },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(DatePicker.DatePickerBlock, {
    SelectedDate: ({ date }) =>
      makeFieldsStep(() => ({
        maybeDatePickerBasicDemoSelectedDate: () => Option.some(date),
      })),
    ClearedDate: () =>
      makeFieldsStep(() => ({
        maybeDatePickerBasicDemoSelectedDate: () => Option.none(),
      })),
    ChangedViewMonth: makeNoopStep,
  }),
})

export const ComboboxDemoBinding = makeRequiredFieldBinding(CityComboboxBlock, {
  field: 'comboboxDemo',
  init: { contextToArgs: () => [{ id: 'combobox-demo' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(CityComboboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeComboboxDemoSelectedCity: () => Option.some(value),
      })),
    ClearedSelection: makeNoopStep,
  }),
})

export const ComboboxPlacementLockDemoBinding = makeRequiredFieldBinding(
  CityComboboxBlock,
  {
    field: 'comboboxPlacementLockDemo',
    init: {
      contextToArgs: () => [{ id: 'combobox-placement-lock-demo' }],
    },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(CityComboboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeComboboxPlacementLockDemoSelectedCity: () => Option.some(value),
      })),
    ClearedSelection: makeNoopStep,
  }),
})

export const ComboboxNullableDemoBinding = makeRequiredFieldBinding(
  CityComboboxBlock,
  {
    field: 'comboboxNullableDemo',
    init: {
      contextToArgs: () => [{ id: 'combobox-nullable-demo', nullable: true }],
    },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(CityComboboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeComboboxNullableDemoSelectedCity:
          maybeComboboxNullableDemoSelectedCity =>
            Option.contains(maybeComboboxNullableDemoSelectedCity, value)
              ? Option.none()
              : Option.some(value),
      })),
    ClearedSelection: () =>
      makeFieldsStep(() => ({
        maybeComboboxNullableDemoSelectedCity: () => Option.none(),
      })),
  }),
})

export const ComboboxMultiDemoBinding = makeRequiredFieldBinding(
  CityMultiComboboxBlock,
  {
    field: 'comboboxMultiDemo',
    init: { contextToArgs: () => [{ id: 'combobox-multi-demo' }] },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(CityMultiComboboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        comboboxMultiDemoSelectedCities: comboboxMultiDemoSelectedCities =>
          Array.contains(comboboxMultiDemoSelectedCities, value)
            ? Array.filter(
                comboboxMultiDemoSelectedCities,
                city => city !== value,
              )
            : Array.append(comboboxMultiDemoSelectedCities, value),
      })),
    ClearedSelection: makeNoopStep,
  }),
})

export const ComboboxSelectOnFocusDemoBinding = makeRequiredFieldBinding(
  CityComboboxBlock,
  {
    field: 'comboboxSelectOnFocusDemo',
    init: {
      contextToArgs: () => [
        {
          id: 'combobox-select-on-focus-demo',
          selectInputOnFocus: true,
        },
      ],
    },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(CityComboboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeComboboxSelectOnFocusDemoSelectedCity: () => Option.some(value),
      })),
    ClearedSelection: makeNoopStep,
  }),
})

export const DialogDemoBinding = makeRequiredFieldBinding(Dialog.DialogBlock, {
  field: 'dialogDemo',
  init: { contextToArgs: () => [{ id: 'dialog-demo' }] },
}).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const DialogAnimatedDemoBinding = makeRequiredFieldBinding(
  Dialog.DialogBlock,
  {
    field: 'dialogAnimatedDemo',
    init: {
      contextToArgs: () => [{ id: 'dialog-animated-demo', isAnimated: true }],
    },
  },
).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const OverlayDialogDemoBinding = makeRequiredFieldBinding(
  Dialog.DialogBlock,
  {
    field: 'overlayDialogDemo',
    init: { contextToArgs: () => [{ id: 'overlay-dialog-demo' }] },
  },
).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const OverlayComboboxDemoBinding = makeRequiredFieldBinding(
  CityComboboxBlock,
  {
    field: 'overlayComboboxDemo',
    init: { contextToArgs: () => [{ id: 'overlay-combobox-demo' }] },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(CityComboboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeOverlayComboboxDemoSelectedCity: () => Option.some(value),
      })),
    ClearedSelection: makeNoopStep,
  }),
})

export const NestedDialogParentDemoBinding = makeRequiredFieldBinding(
  Dialog.DialogBlock,
  {
    field: 'nestedDialogParentDemo',
    init: {
      contextToArgs: () => [{ id: 'nested-dialog-parent-demo' }],
    },
  },
).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const NestedDialogChildDemoBinding = makeRequiredFieldBinding(
  Dialog.DialogBlock,
  {
    field: 'nestedDialogChildDemo',
    init: {
      contextToArgs: () => [{ id: 'nested-dialog-child-demo' }],
    },
  },
).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const ListboxDemoBinding = makeRequiredFieldBinding(ItemListboxBlock, {
  field: 'listboxDemo',
  init: { contextToArgs: () => [{ id: 'listbox-demo' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(ItemListboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeListboxDemoSelectedItem: () => Option.some(value),
      })),
  }),
})

export const ListboxMultiDemoBinding = makeRequiredFieldBinding(
  ItemMultiListboxBlock,
  {
    field: 'listboxMultiDemo',
    init: { contextToArgs: () => [{ id: 'listbox-multi-demo' }] },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(ItemMultiListboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        listboxMultiDemoSelectedItems: listboxMultiDemoSelectedItems =>
          Array.contains(listboxMultiDemoSelectedItems, value)
            ? Array.filter(
                listboxMultiDemoSelectedItems,
                item => item !== value,
              )
            : Array.append(listboxMultiDemoSelectedItems, value),
      })),
  }),
})

export const ListboxGroupedDemoBinding = makeRequiredFieldBinding(
  CharacterListboxBlock,
  {
    field: 'listboxGroupedDemo',
    init: { contextToArgs: () => [{ id: 'listbox-grouped-demo' }] },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(CharacterListboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeListboxGroupedDemoSelectedItem: () => Option.some(value),
      })),
  }),
})

export const MenuBasicDemoBinding = makeRequiredFieldBinding(DemoMenuBlock, {
  field: 'menuBasicDemo',
  init: { contextToArgs: () => [{ id: 'menu-basic-demo' }] },
}).withOutMessagePolicy({ fold: foldMenuOutMessage })

export const MenuAnimatedDemoBinding = makeRequiredFieldBinding(DemoMenuBlock, {
  field: 'menuAnimatedDemo',
  init: {
    contextToArgs: () => [{ id: 'menu-animated-demo', isAnimated: true }],
  },
}).withOutMessagePolicy({ fold: foldMenuOutMessage })

export const PopoverBasicDemoBinding = makeRequiredFieldBinding(
  Popover.PopoverBlock,
  {
    field: 'popoverBasicDemo',
    init: { contextToArgs: () => [{ id: 'popover-basic-demo' }] },
  },
).withOutMessagePolicy({ fold: foldPopoverOutMessage })

export const PopoverAnimatedDemoBinding = makeRequiredFieldBinding(
  Popover.PopoverBlock,
  {
    field: 'popoverAnimatedDemo',
    init: {
      contextToArgs: () => [{ id: 'popover-animated-demo', isAnimated: true }],
    },
  },
).withOutMessagePolicy({ fold: foldPopoverOutMessage })

export const PopoverArrowDemoBinding = makeRequiredFieldBinding(
  Popover.PopoverBlock,
  {
    field: 'popoverArrowDemo',
    init: { contextToArgs: () => [{ id: 'popover-arrow-demo' }] },
  },
).withOutMessagePolicy({ fold: foldPopoverOutMessage })

export const PopoverNestedParentDemoBinding = makeRequiredFieldBinding(
  Popover.PopoverBlock,
  {
    field: 'popoverNestedParentDemo',
    init: {
      contextToArgs: () => [
        { id: 'popover-nested-parent-demo', contentFocus: true },
      ],
    },
  },
).withOutMessagePolicy({ fold: foldPopoverOutMessage })

export const PopoverNestedChildDemoBinding = makeRequiredFieldBinding(
  Popover.PopoverBlock,
  {
    field: 'popoverNestedChildDemo',
    init: {
      contextToArgs: () => [{ id: 'popover-nested-child-demo' }],
    },
  },
).withOutMessagePolicy({ fold: foldPopoverOutMessage })

export const SliderRatingDemoBinding = makeRequiredFieldBinding(
  Slider.SliderBlock,
  {
    field: 'sliderRatingDemo',
    init: {
      contextToArgs: () => [
        { id: 'slider-rating-demo', min: 0, max: 10, step: 1 },
      ],
    },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(Slider.SliderBlock, {
    ChangedValue: ({ value }) =>
      makeFieldsStep(() => ({ sliderRatingValue: () => value })),
  }),
})

export const SliderVolumeDemoBinding = makeRequiredFieldBinding(
  Slider.SliderBlock,
  {
    field: 'sliderVolumeDemo',
    init: {
      contextToArgs: () => [
        { id: 'slider-volume-demo', min: 0, max: 1, step: 0.05 },
      ],
    },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(Slider.SliderBlock, {
    ChangedValue: ({ value }) =>
      makeFieldsStep(() => ({ sliderVolumeValue: () => value })),
  }),
})

export const HorizontalTabsDemoBinding = makeRequiredFieldBinding(
  DemoTabsBlock,
  {
    field: 'horizontalTabsDemo',
    init: { contextToArgs: () => [{ id: 'horizontal-tabs-demo' }] },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(DemoTabsBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        horizontalTabsDemoTab: () => value,
      })),
  }),
})

export const VerticalTabsDemoBinding = makeRequiredFieldBinding(DemoTabsBlock, {
  field: 'verticalTabsDemo',
  init: { contextToArgs: () => [{ id: 'vertical-tabs-demo' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(DemoTabsBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({ verticalTabsDemoTab: () => value })),
  }),
})

export const TooltipDemoBinding = makeRequiredFieldBinding(
  Tooltip.TooltipBlock,
  {
    field: 'tooltipDemo',
    init: { contextToArgs: () => [{ id: 'tooltip-demo' }] },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(Tooltip.TooltipBlock, {
    Shown: makeNoopStep,
    Hidden: makeNoopStep,
  }),
})

const foldHoverIntentOutMessage = makeOutMessageFold(
  HoverIntent.HoverIntentBlock,
  {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
  },
)

export const HoverIntentCardDemoBinding = makeRequiredFieldBinding(
  HoverIntent.HoverIntentBlock,
  {
    field: 'hoverIntentCardDemo',
  },
).withOutMessagePolicy({ fold: foldHoverIntentOutMessage })

export const HoverIntentMenuDemoBinding = makeRequiredFieldBinding(
  HoverIntent.HoverIntentBlock,
  {
    field: 'hoverIntentMenuDemo',
  },
).withOutMessagePolicy({ fold: foldHoverIntentOutMessage })

export const ToastDemoBinding = makeRequiredFieldBinding(ToastBlock, {
  field: 'toastDemo',
  init: {
    contextToArgs: () => [{ id: 'toast-demo', swipeToDismiss: {} }],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(ToastBlock, {
    DismissedToast: ({ payload }) =>
      makeFieldsStep(() => ({
        maybeLastDismissedToastTitle: () => Option.some(payload.title),
      })),
  }),
})

const BaseAnimationDemoBinding = makeRequiredFieldBinding(
  Animation.AnimationBlock,
  {
    field: 'animationDemo',
    init: { contextToArgs: () => [{ id: 'animation-demo' }] },
  },
)

export const FileDropBasicDemoBinding = makeRequiredFieldBinding(
  FileDrop.FileDropBlock,
  {
    field: 'fileDropBasicDemo',
    init: { contextToArgs: () => [{ id: 'file-drop-basic-demo' }] },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(FileDrop.FileDropBlock, {
    ReceivedFiles: ({ files }) =>
      makeFieldsStep(() => ({
        fileDropBasicDemoFiles: Array.appendAll(files),
      })),
    RejectedNonFiles: makeNoopStep,
  }),
})

const foldDragAndDropDemoOutMessage = makeOutMessageFold(
  DragAndDrop.DragAndDropBlock,
  {
    StartedKeyboardDrag: ({ itemId }) =>
      makeFieldsStep(model => ({
        dragAndDropDemoAnnouncement: () =>
          dragAndDropDemoAnnouncementToText(
            DragAndDropDemoAnnouncement.PickedUp({
              label: findDragAndDropDemoCardLabel(
                model.dragAndDropDemoColumns,
                itemId,
              ),
            }),
          ),
      })),
    ChangedKeyboardTarget: ({ fromContainerId, toContainerId, toIndex }) =>
      makeFieldsStep(model => ({
        dragAndDropDemoAnnouncement: () => {
          const args = {
            columnLabel: findDragAndDropDemoColumnLabel(
              model.dragAndDropDemoColumns,
              toContainerId,
            ),
            position: toIndex + 1,
          }
          return dragAndDropDemoAnnouncementToText(
            fromContainerId !== toContainerId
              ? DragAndDropDemoAnnouncement.MovedToColumn(args)
              : DragAndDropDemoAnnouncement.MovedWithinColumn(args),
          )
        },
      })),
    Reordered: ({ itemId, fromContainerId, toContainerId, toIndex }) =>
      makeFieldsStep(model => {
        const label = findDragAndDropDemoCardLabel(
          model.dragAndDropDemoColumns,
          itemId,
        )
        const columnLabel = findDragAndDropDemoColumnLabel(
          model.dragAndDropDemoColumns,
          toContainerId,
        )

        return {
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
        }
      }),
    Cancelled: () =>
      makeFieldsStep(() => ({
        dragAndDropDemoAnnouncement: () =>
          dragAndDropDemoAnnouncementToText(
            DragAndDropDemoAnnouncement.Cancelled(),
          ),
      })),
  },
)

export const DragAndDropDemoBinding = makeRequiredFieldBinding(
  DragAndDrop.DragAndDropBlock,
  {
    field: 'dragAndDropDemo',
    init: { contextToArgs: () => [{ id: 'drag-and-drop-demo' }] },
  },
).withOutMessagePolicy({ fold: foldDragAndDropDemoOutMessage })

const foldVirtualListOutMessage = makeOutMessageFold(ActivityVirtualListBlock, {
  ObservedContainerScroll: makeNoopStep,
  ApproachedLoadedStart: makeNoopStep,
  EndedContainerScroll: makeNoopStep,
})

export const VirtualListDemoBinding = makeRequiredFieldBinding(
  ActivityVirtualListBlock,
  {
    field: 'virtualListDemo',
    init: {
      contextToArgs: () => [{ id: 'virtual-list-demo', rowHeightPx: 56 }],
    },
  },
).withOutMessagePolicy({ fold: foldVirtualListOutMessage })

export const VirtualListVariableDemoBinding = makeRequiredFieldBinding(
  ActivityVirtualListBlock,
  {
    field: 'virtualListVariableDemo',
    init: {
      contextToArgs: () => [
        { id: 'virtual-list-variable-demo', rowHeightPx: 56 },
      ],
    },
  },
).withOutMessagePolicy({ fold: foldVirtualListOutMessage })

export const VerticalRadioGroupDemoBinding = makeRequiredFieldBinding(
  PlanRadioGroupBlock,
  {
    field: 'verticalRadioGroupDemo',
    init: {
      contextToArgs: () => [{ id: 'vertical-radio-group-demo' }],
    },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(PlanRadioGroupBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        verticalRadioGroupDemoValue: () => Option.some(value),
      })),
  }),
})

export const HorizontalRadioGroupDemoBinding = makeRequiredFieldBinding(
  PlanRadioGroupBlock,
  {
    field: 'horizontalRadioGroupDemo',
    init: {
      contextToArgs: () => [{ id: 'horizontal-radio-group-demo' }],
    },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(PlanRadioGroupBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        horizontalRadioGroupDemoValue: () => Option.some(value),
      })),
  }),
})

export const AnimationDemoBinding =
  BaseAnimationDemoBinding.withOutMessagePolicy({
    fold: makeOutMessageFold(Animation.AnimationBlock, {
      StartedLeaveAnimating: () =>
        BaseAnimationDemoBinding.requestWaitForLeaveSettlement(),
      TransitionedOut: makeNoopStep,
    }),
  })

export const UiComposition = makeComposition({
  bindings: [
    AnimationDemoBinding,
    CalendarBasicDemoBinding,
    ComboboxDemoBinding,
    ComboboxMultiDemoBinding,
    ComboboxNullableDemoBinding,
    ComboboxPlacementLockDemoBinding,
    ComboboxSelectOnFocusDemoBinding,
    DatePickerBasicDemoBinding,
    DialogAnimatedDemoBinding,
    DialogDemoBinding,
    DragAndDropDemoBinding,
    FileDropBasicDemoBinding,
    HorizontalRadioGroupDemoBinding,
    HorizontalTabsDemoBinding,
    HoverIntentCardDemoBinding,
    HoverIntentMenuDemoBinding,
    ListboxDemoBinding,
    ListboxGroupedDemoBinding,
    ListboxMultiDemoBinding,
    MenuAnimatedDemoBinding,
    MenuBasicDemoBinding,
    NestedDialogChildDemoBinding,
    NestedDialogParentDemoBinding,
    OverlayComboboxDemoBinding,
    OverlayDialogDemoBinding,
    PopoverAnimatedDemoBinding,
    PopoverArrowDemoBinding,
    PopoverBasicDemoBinding,
    PopoverNestedChildDemoBinding,
    PopoverNestedParentDemoBinding,
    SliderRatingDemoBinding,
    SliderVolumeDemoBinding,
    ToastDemoBinding,
    TooltipDemoBinding,
    VerticalRadioGroupDemoBinding,
    VerticalTabsDemoBinding,
    VirtualListChatDemoBinding,
    VirtualListChatHistoryModeGroupBinding,
    VirtualListDemoBinding,
    VirtualListVariableDemoBinding,
  ],
})
export type UiViewBuilder = Block.ViewBuilderFor<typeof UiComposition>
