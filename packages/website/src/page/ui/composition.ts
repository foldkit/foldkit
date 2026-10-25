import { Array, Option, Schema, Tuple, pipe } from 'effect'
import { Block, Calendar } from 'foldkit'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import {
  AnimationBlock,
  CalendarBlock,
  DatePickerBlock,
  DialogBlock,
  DragAndDropBlock,
  FileDropBlock,
  HoverIntentBlock,
  PopoverBlock,
  SliderBlock,
  TooltipBlock,
} from '@foldkit/ui'

import { CityComboboxBlock, CityMultiComboboxBlock } from './combobox'
import { UiDefinition } from './definition'
import {
  ActivityVirtualListBlock,
  CharacterListboxBlock,
  DemoMenuBlock,
  DemoTabsBlock,
  ItemListboxBlock,
  ItemMultiListboxBlock,
  PlanRadioGroupBlock,
} from './demo/components'
import { ToastBlock } from './demo/toastModule'
import { type DemoCard, type DemoColumn } from './domain/domain'
import { VirtualListChatDemoBindingWithOutMessagePolicy } from './virtualListChat'

export { VirtualListChatDemoBinding } from './virtualListChat'

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

const foldDialogOutMessage = UiDefinition.makeOutMessageFold(DialogBlock, {
  Opened: UiDefinition.makeNoopStep,
  Closed: UiDefinition.makeNoopStep,
  CompletedClose: UiDefinition.makeNoopStep,
})

const foldMenuOutMessage = UiDefinition.makeOutMessageFold(DemoMenuBlock, {
  Selected: UiDefinition.makeNoopStep,
  Closed: UiDefinition.makeNoopStep,
})

const foldPopoverOutMessage = UiDefinition.makeOutMessageFold(PopoverBlock, {
  Opened: UiDefinition.makeNoopStep,
  Closed: UiDefinition.makeNoopStep,
})

const foldCalendarBasicDemoOutMessage = UiDefinition.makeOutMessageFold(
  CalendarBlock,
  {
    SelectedDate: ({ date }) =>
      UiDefinition.makeFieldsStep(() => ({
        maybeCalendarBasicDemoSelectedDate: () => Option.some(date),
      })),
    ChangedViewMonth: UiDefinition.makeNoopStep,
  },
)

export const CalendarBasicDemoBinding = UiDefinition.makeBinding(
  CalendarBlock,
  {
    field: 'calendarBasicDemo',
    init: {
      contextToArgs: today =>
        Tuple.make({
          id: 'calendar-basic-demo',
          today,
          minDate: Calendar.subtractYears(today, 1),
          maxDate: Calendar.addYears(today, 1),
        }),
    },
  },
).withOutMessagePolicy({ fold: foldCalendarBasicDemoOutMessage })

const foldDatePickerBasicDemoOutMessage = UiDefinition.makeOutMessageFold(
  DatePickerBlock,
  {
    SelectedDate: ({ date }) =>
      UiDefinition.makeFieldsStep(() => ({
        maybeDatePickerBasicDemoSelectedDate: () => Option.some(date),
      })),
    ClearedDate: () =>
      UiDefinition.makeFieldsStep(() => ({
        maybeDatePickerBasicDemoSelectedDate: () => Option.none(),
      })),
    ChangedViewMonth: UiDefinition.makeNoopStep,
  },
)

export const DatePickerBasicDemoBinding = UiDefinition.makeBinding(
  DatePickerBlock,
  {
    field: 'datePickerBasicDemo',
    init: {
      contextToArgs: today =>
        Tuple.make({
          id: 'date-picker-basic-demo',
          today,
          minDate: Calendar.subtractYears(today, 1),
          maxDate: Calendar.addYears(today, 1),
        }),
    },
  },
).withOutMessagePolicy({ fold: foldDatePickerBasicDemoOutMessage })

const foldComboboxDemoOutMessage = UiDefinition.makeOutMessageFold(
  CityComboboxBlock,
  {
    Selected: ({ value }) =>
      UiDefinition.makeFieldsStep(() => ({
        maybeComboboxDemoSelectedCity: () => Option.some(value),
      })),
    ClearedSelection: UiDefinition.makeNoopStep,
  },
)

export const ComboboxDemoBinding = UiDefinition.makeBinding(CityComboboxBlock, {
  field: 'comboboxDemo',
  init: { contextToArgs: () => Tuple.make({ id: 'combobox-demo' }) },
}).withOutMessagePolicy({ fold: foldComboboxDemoOutMessage })

const foldComboboxPlacementLockDemoOutMessage = UiDefinition.makeOutMessageFold(
  CityComboboxBlock,
  {
    Selected: ({ value }) =>
      UiDefinition.makeFieldsStep(() => ({
        maybeComboboxPlacementLockDemoSelectedCity: () => Option.some(value),
      })),
    ClearedSelection: UiDefinition.makeNoopStep,
  },
)

export const ComboboxPlacementLockDemoBinding = UiDefinition.makeBinding(
  CityComboboxBlock,
  {
    field: 'comboboxPlacementLockDemo',
    init: {
      contextToArgs: () => Tuple.make({ id: 'combobox-placement-lock-demo' }),
    },
  },
).withOutMessagePolicy({ fold: foldComboboxPlacementLockDemoOutMessage })

const foldComboboxNullableDemoOutMessage = UiDefinition.makeOutMessageFold(
  CityComboboxBlock,
  {
    Selected: ({ value }) =>
      UiDefinition.makeFieldsStep(() => ({
        maybeComboboxNullableDemoSelectedCity:
          maybeComboboxNullableDemoSelectedCity =>
            Option.contains(maybeComboboxNullableDemoSelectedCity, value)
              ? Option.none()
              : Option.some(value),
      })),
    ClearedSelection: () =>
      UiDefinition.makeFieldsStep(() => ({
        maybeComboboxNullableDemoSelectedCity: () => Option.none(),
      })),
  },
)

export const ComboboxNullableDemoBinding = UiDefinition.makeBinding(
  CityComboboxBlock,
  {
    field: 'comboboxNullableDemo',
    init: {
      contextToArgs: () =>
        Tuple.make({ id: 'combobox-nullable-demo', nullable: true }),
    },
  },
).withOutMessagePolicy({ fold: foldComboboxNullableDemoOutMessage })

const foldComboboxMultiDemoOutMessage = UiDefinition.makeOutMessageFold(
  CityMultiComboboxBlock,
  {
    Selected: ({ value }) =>
      UiDefinition.makeFieldsStep(() => ({
        comboboxMultiDemoSelectedCities: comboboxMultiDemoSelectedCities =>
          Array.contains(comboboxMultiDemoSelectedCities, value)
            ? Array.filter(
                comboboxMultiDemoSelectedCities,
                city => city !== value,
              )
            : Array.append(comboboxMultiDemoSelectedCities, value),
      })),
    ClearedSelection: UiDefinition.makeNoopStep,
  },
)

export const ComboboxMultiDemoBinding = UiDefinition.makeBinding(
  CityMultiComboboxBlock,
  {
    field: 'comboboxMultiDemo',
    init: { contextToArgs: () => Tuple.make({ id: 'combobox-multi-demo' }) },
  },
).withOutMessagePolicy({ fold: foldComboboxMultiDemoOutMessage })

const foldComboboxSelectOnFocusDemoOutMessage = UiDefinition.makeOutMessageFold(
  CityComboboxBlock,
  {
    Selected: ({ value }) =>
      UiDefinition.makeFieldsStep(() => ({
        maybeComboboxSelectOnFocusDemoSelectedCity: () => Option.some(value),
      })),
    ClearedSelection: UiDefinition.makeNoopStep,
  },
)

export const ComboboxSelectOnFocusDemoBinding = UiDefinition.makeBinding(
  CityComboboxBlock,
  {
    field: 'comboboxSelectOnFocusDemo',
    init: {
      contextToArgs: () =>
        Tuple.make({
          id: 'combobox-select-on-focus-demo',
          selectInputOnFocus: true,
        }),
    },
  },
).withOutMessagePolicy({ fold: foldComboboxSelectOnFocusDemoOutMessage })

export const DialogDemoBinding = UiDefinition.makeBinding(DialogBlock, {
  field: 'dialogDemo',
  init: { contextToArgs: () => Tuple.make({ id: 'dialog-demo' }) },
}).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const DialogAnimatedDemoBinding = UiDefinition.makeBinding(DialogBlock, {
  field: 'dialogAnimatedDemo',
  init: {
    contextToArgs: () =>
      Tuple.make({ id: 'dialog-animated-demo', isAnimated: true }),
  },
}).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const OverlayDialogDemoBinding = UiDefinition.makeBinding(DialogBlock, {
  field: 'overlayDialogDemo',
  init: { contextToArgs: () => Tuple.make({ id: 'overlay-dialog-demo' }) },
}).withOutMessagePolicy({ fold: foldDialogOutMessage })

const foldOverlayComboboxDemoOutMessage = UiDefinition.makeOutMessageFold(
  CityComboboxBlock,
  {
    Selected: ({ value }) =>
      UiDefinition.makeFieldsStep(() => ({
        maybeOverlayComboboxDemoSelectedCity: () => Option.some(value),
      })),
    ClearedSelection: UiDefinition.makeNoopStep,
  },
)

export const OverlayComboboxDemoBinding = UiDefinition.makeBinding(
  CityComboboxBlock,
  {
    field: 'overlayComboboxDemo',
    init: { contextToArgs: () => Tuple.make({ id: 'overlay-combobox-demo' }) },
  },
).withOutMessagePolicy({ fold: foldOverlayComboboxDemoOutMessage })

export const NestedDialogParentDemoBinding = UiDefinition.makeBinding(
  DialogBlock,
  {
    field: 'nestedDialogParentDemo',
    init: {
      contextToArgs: () => Tuple.make({ id: 'nested-dialog-parent-demo' }),
    },
  },
).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const NestedDialogChildDemoBinding = UiDefinition.makeBinding(
  DialogBlock,
  {
    field: 'nestedDialogChildDemo',
    init: {
      contextToArgs: () => Tuple.make({ id: 'nested-dialog-child-demo' }),
    },
  },
).withOutMessagePolicy({ fold: foldDialogOutMessage })

const foldListboxDemoOutMessage = UiDefinition.makeOutMessageFold(
  ItemListboxBlock,
  {
    Selected: ({ value }) =>
      UiDefinition.makeFieldsStep(() => ({
        maybeListboxDemoSelectedItem: () => Option.some(value),
      })),
  },
)

export const ListboxDemoBinding = UiDefinition.makeBinding(ItemListboxBlock, {
  field: 'listboxDemo',
  init: { contextToArgs: () => Tuple.make({ id: 'listbox-demo' }) },
}).withOutMessagePolicy({ fold: foldListboxDemoOutMessage })

const foldListboxMultiDemoOutMessage = UiDefinition.makeOutMessageFold(
  ItemMultiListboxBlock,
  {
    Selected: ({ value }) =>
      UiDefinition.makeFieldsStep(() => ({
        listboxMultiDemoSelectedItems: listboxMultiDemoSelectedItems =>
          Array.contains(listboxMultiDemoSelectedItems, value)
            ? Array.filter(
                listboxMultiDemoSelectedItems,
                item => item !== value,
              )
            : Array.append(listboxMultiDemoSelectedItems, value),
      })),
  },
)

export const ListboxMultiDemoBinding = UiDefinition.makeBinding(
  ItemMultiListboxBlock,
  {
    field: 'listboxMultiDemo',
    init: { contextToArgs: () => Tuple.make({ id: 'listbox-multi-demo' }) },
  },
).withOutMessagePolicy({ fold: foldListboxMultiDemoOutMessage })

const foldListboxGroupedDemoOutMessage = UiDefinition.makeOutMessageFold(
  CharacterListboxBlock,
  {
    Selected: ({ value }) =>
      UiDefinition.makeFieldsStep(() => ({
        maybeListboxGroupedDemoSelectedItem: () => Option.some(value),
      })),
  },
)

export const ListboxGroupedDemoBinding = UiDefinition.makeBinding(
  CharacterListboxBlock,
  {
    field: 'listboxGroupedDemo',
    init: { contextToArgs: () => Tuple.make({ id: 'listbox-grouped-demo' }) },
  },
).withOutMessagePolicy({ fold: foldListboxGroupedDemoOutMessage })

export const MenuBasicDemoBinding = UiDefinition.makeBinding(DemoMenuBlock, {
  field: 'menuBasicDemo',
  init: { contextToArgs: () => Tuple.make({ id: 'menu-basic-demo' }) },
}).withOutMessagePolicy({ fold: foldMenuOutMessage })

export const MenuAnimatedDemoBinding = UiDefinition.makeBinding(DemoMenuBlock, {
  field: 'menuAnimatedDemo',
  init: {
    contextToArgs: () =>
      Tuple.make({ id: 'menu-animated-demo', isAnimated: true }),
  },
}).withOutMessagePolicy({ fold: foldMenuOutMessage })

export const PopoverBasicDemoBinding = UiDefinition.makeBinding(PopoverBlock, {
  field: 'popoverBasicDemo',
  init: { contextToArgs: () => Tuple.make({ id: 'popover-basic-demo' }) },
}).withOutMessagePolicy({ fold: foldPopoverOutMessage })

export const PopoverAnimatedDemoBinding = UiDefinition.makeBinding(
  PopoverBlock,
  {
    field: 'popoverAnimatedDemo',
    init: {
      contextToArgs: () =>
        Tuple.make({ id: 'popover-animated-demo', isAnimated: true }),
    },
  },
).withOutMessagePolicy({ fold: foldPopoverOutMessage })

export const PopoverArrowDemoBinding = UiDefinition.makeBinding(PopoverBlock, {
  field: 'popoverArrowDemo',
  init: { contextToArgs: () => Tuple.make({ id: 'popover-arrow-demo' }) },
}).withOutMessagePolicy({ fold: foldPopoverOutMessage })

export const PopoverNestedParentDemoBinding = UiDefinition.makeBinding(
  PopoverBlock,
  {
    field: 'popoverNestedParentDemo',
    init: {
      contextToArgs: () =>
        Tuple.make({ id: 'popover-nested-parent-demo', contentFocus: true }),
    },
  },
).withOutMessagePolicy({ fold: foldPopoverOutMessage })

export const PopoverNestedChildDemoBinding = UiDefinition.makeBinding(
  PopoverBlock,
  {
    field: 'popoverNestedChildDemo',
    init: {
      contextToArgs: () => Tuple.make({ id: 'popover-nested-child-demo' }),
    },
  },
).withOutMessagePolicy({ fold: foldPopoverOutMessage })

const foldSliderRatingDemoOutMessage = UiDefinition.makeOutMessageFold(
  SliderBlock,
  {
    ChangedValue: ({ value }) =>
      UiDefinition.makeFieldsStep(() => ({ sliderRatingValue: () => value })),
  },
)

export const SliderRatingDemoBinding = UiDefinition.makeBinding(SliderBlock, {
  field: 'sliderRatingDemo',
  init: {
    contextToArgs: () =>
      Tuple.make({ id: 'slider-rating-demo', min: 0, max: 10, step: 1 }),
  },
}).withOutMessagePolicy({ fold: foldSliderRatingDemoOutMessage })

const foldSliderVolumeDemoOutMessage = UiDefinition.makeOutMessageFold(
  SliderBlock,
  {
    ChangedValue: ({ value }) =>
      UiDefinition.makeFieldsStep(() => ({ sliderVolumeValue: () => value })),
  },
)

export const SliderVolumeDemoBinding = UiDefinition.makeBinding(SliderBlock, {
  field: 'sliderVolumeDemo',
  init: {
    contextToArgs: () =>
      Tuple.make({ id: 'slider-volume-demo', min: 0, max: 1, step: 0.05 }),
  },
}).withOutMessagePolicy({ fold: foldSliderVolumeDemoOutMessage })

const foldHorizontalTabsDemoOutMessage = UiDefinition.makeOutMessageFold(
  DemoTabsBlock,
  {
    Selected: ({ value }) =>
      UiDefinition.makeFieldsStep(() => ({
        horizontalTabsDemoTab: () => value,
      })),
  },
)

export const HorizontalTabsDemoBinding = UiDefinition.makeBinding(
  DemoTabsBlock,
  {
    field: 'horizontalTabsDemo',
    init: { contextToArgs: () => Tuple.make({ id: 'horizontal-tabs-demo' }) },
  },
).withOutMessagePolicy({ fold: foldHorizontalTabsDemoOutMessage })

const foldVerticalTabsDemoOutMessage = UiDefinition.makeOutMessageFold(
  DemoTabsBlock,
  {
    Selected: ({ value }) =>
      UiDefinition.makeFieldsStep(() => ({ verticalTabsDemoTab: () => value })),
  },
)

export const VerticalTabsDemoBinding = UiDefinition.makeBinding(DemoTabsBlock, {
  field: 'verticalTabsDemo',
  init: { contextToArgs: () => Tuple.make({ id: 'vertical-tabs-demo' }) },
}).withOutMessagePolicy({ fold: foldVerticalTabsDemoOutMessage })

const foldTooltipOutMessage = UiDefinition.makeOutMessageFold(TooltipBlock, {
  Shown: UiDefinition.makeNoopStep,
  Hidden: UiDefinition.makeNoopStep,
})

export const TooltipDemoBinding = UiDefinition.makeBinding(TooltipBlock, {
  field: 'tooltipDemo',
  init: { contextToArgs: () => Tuple.make({ id: 'tooltip-demo' }) },
}).withOutMessagePolicy({ fold: foldTooltipOutMessage })

const foldHoverIntentOutMessage = UiDefinition.makeOutMessageFold(
  HoverIntentBlock,
  {
    Opened: UiDefinition.makeNoopStep,
    Closed: UiDefinition.makeNoopStep,
  },
)

export const HoverIntentCardDemoBinding = UiDefinition.makeBinding(
  HoverIntentBlock,
  {
    field: 'hoverIntentCardDemo',
  },
).withOutMessagePolicy({ fold: foldHoverIntentOutMessage })

export const HoverIntentMenuDemoBinding = UiDefinition.makeBinding(
  HoverIntentBlock,
  {
    field: 'hoverIntentMenuDemo',
  },
).withOutMessagePolicy({ fold: foldHoverIntentOutMessage })

const foldToastDemoOutMessage = UiDefinition.makeOutMessageFold(ToastBlock, {
  DismissedToast: ({ payload }) =>
    UiDefinition.makeFieldsStep(() => ({
      maybeLastDismissedToastTitle: () => Option.some(payload.title),
    })),
})

export const ToastDemoBinding = UiDefinition.makeBinding(ToastBlock, {
  field: 'toastDemo',
  init: {
    contextToArgs: () => Tuple.make({ id: 'toast-demo', swipeToDismiss: {} }),
  },
}).withOutMessagePolicy({ fold: foldToastDemoOutMessage })

export const AnimationDemoBinding = UiDefinition.makeBinding(AnimationBlock, {
  field: 'animationDemo',
  init: { contextToArgs: () => Tuple.make({ id: 'animation-demo' }) },
})

const foldAnimationDemoOutMessage = UiDefinition.makeOutMessageFold(
  AnimationBlock,
  {
    StartedLeaveAnimating: () =>
      AnimationDemoBinding.requestWaitForLeaveSettlement(),
    TransitionedOut: UiDefinition.makeNoopStep,
  },
)

const foldFileDropBasicDemoOutMessage = UiDefinition.makeOutMessageFold(
  FileDropBlock,
  {
    ReceivedFiles: ({ files }) =>
      UiDefinition.makeFieldsStep(() => ({
        fileDropBasicDemoFiles: Array.appendAll(files),
      })),
    RejectedNonFiles: UiDefinition.makeNoopStep,
  },
)

export const FileDropBasicDemoBinding = UiDefinition.makeBinding(
  FileDropBlock,
  {
    field: 'fileDropBasicDemo',
    init: { contextToArgs: () => Tuple.make({ id: 'file-drop-basic-demo' }) },
  },
).withOutMessagePolicy({ fold: foldFileDropBasicDemoOutMessage })

const foldDragAndDropDemoOutMessage = UiDefinition.makeOutMessageFold(
  DragAndDropBlock,
  {
    StartedKeyboardDrag: ({ itemId }) =>
      UiDefinition.makeFieldsStep(model => ({
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
      UiDefinition.makeFieldsStep(model => ({
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
      UiDefinition.makeFieldsStep(model => {
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
      UiDefinition.makeFieldsStep(() => ({
        dragAndDropDemoAnnouncement: () =>
          dragAndDropDemoAnnouncementToText(
            DragAndDropDemoAnnouncement.Cancelled(),
          ),
      })),
  },
)

export const DragAndDropDemoBinding = UiDefinition.makeBinding(
  DragAndDropBlock,
  {
    field: 'dragAndDropDemo',
    init: { contextToArgs: () => [{ id: 'drag-and-drop-demo' }] },
  },
).withOutMessagePolicy({ fold: foldDragAndDropDemoOutMessage })

const foldVirtualListOutMessage = UiDefinition.makeOutMessageFold(
  ActivityVirtualListBlock,
  {
    ObservedContainerScroll: UiDefinition.makeNoopStep,
  },
)

export const VirtualListDemoBinding = UiDefinition.makeBinding(
  ActivityVirtualListBlock,
  {
    field: 'virtualListDemo',
    init: {
      contextToArgs: () =>
        Tuple.make({ id: 'virtual-list-demo', rowHeightPx: 56 }),
    },
  },
).withOutMessagePolicy({ fold: foldVirtualListOutMessage })

export const VirtualListVariableDemoBinding = UiDefinition.makeBinding(
  ActivityVirtualListBlock,
  {
    field: 'virtualListVariableDemo',
    init: {
      contextToArgs: () =>
        Tuple.make({ id: 'virtual-list-variable-demo', rowHeightPx: 56 }),
    },
  },
).withOutMessagePolicy({ fold: foldVirtualListOutMessage })

const foldVerticalRadioGroupDemoOutMessage = UiDefinition.makeOutMessageFold(
  PlanRadioGroupBlock,
  {
    Selected: ({ value }) =>
      UiDefinition.makeFieldsStep(() => ({
        verticalRadioGroupDemoValue: () => Option.some(value),
      })),
  },
)

export const VerticalRadioGroupDemoBinding = UiDefinition.makeBinding(
  PlanRadioGroupBlock,
  {
    field: 'verticalRadioGroupDemo',
    init: {
      contextToArgs: () => Tuple.make({ id: 'vertical-radio-group-demo' }),
    },
  },
).withOutMessagePolicy({ fold: foldVerticalRadioGroupDemoOutMessage })

const foldHorizontalRadioGroupDemoOutMessage = UiDefinition.makeOutMessageFold(
  PlanRadioGroupBlock,
  {
    Selected: ({ value }) =>
      UiDefinition.makeFieldsStep(() => ({
        horizontalRadioGroupDemoValue: () => Option.some(value),
      })),
  },
)

export const HorizontalRadioGroupDemoBinding = UiDefinition.makeBinding(
  PlanRadioGroupBlock,
  {
    field: 'horizontalRadioGroupDemo',
    init: {
      contextToArgs: () => Tuple.make({ id: 'horizontal-radio-group-demo' }),
    },
  },
).withOutMessagePolicy({ fold: foldHorizontalRadioGroupDemoOutMessage })

export const UiComposition = UiDefinition.makeComposition({
  bindings: [
    AnimationDemoBinding.withOutMessagePolicy({
      fold: foldAnimationDemoOutMessage,
    }),
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
    VirtualListChatDemoBindingWithOutMessagePolicy,
    VirtualListDemoBinding,
    VirtualListVariableDemoBinding,
  ],
})
export type UiViewBuilder = Block.ViewBuilderFor<typeof UiComposition>
