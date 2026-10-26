import { Array, Option } from 'effect'
import { type Block, Calendar as FoldkitCalendar } from 'foldkit'

import {
  CalendarBlock,
  DatePickerBlock,
  DialogBlock,
  FileDropBlock,
  HoverIntentBlock,
  PopoverBlock,
  SliderBlock,
  TooltipBlock,
} from '@foldkit/ui'

import { CityComboboxBlock, CityMultiComboboxBlock } from '../combobox'
import { UiDefinition, makeFieldsStep, makeNoopStep } from '../definition'
import {
  CharacterListboxBlock,
  ItemListboxBlock,
  ItemMultiListboxBlock,
} from '../listbox'
import { DemoMenuBlock } from '../menu'
import { PlanRadioGroupBlock } from '../radioGroup'
import { DemoTabsBlock } from '../tabs'
import { ToastBlock } from '../toast'
import { ActivityVirtualListBlock } from '../virtualList'
import { AnimationDemoBindingWithOutMessagePolicy } from './animation'
import { DragAndDropDemoBinding } from './dragAndDrop'

const foldDialogOutMessage = UiDefinition.makeOutMessageFold(DialogBlock, {
  Opened: makeNoopStep,
  Closed: makeNoopStep,
  CompletedClose: makeNoopStep,
})

const foldMenuOutMessage = UiDefinition.makeOutMessageFold(DemoMenuBlock, {
  Selected: makeNoopStep,
  Closed: makeNoopStep,
})

const foldPopoverOutMessage = UiDefinition.makeOutMessageFold(PopoverBlock, {
  Opened: makeNoopStep,
  Closed: makeNoopStep,
})

const foldTooltipOutMessage = UiDefinition.makeOutMessageFold(TooltipBlock, {
  Shown: makeNoopStep,
  Hidden: makeNoopStep,
})

export const MobileMenuDialogBinding = UiDefinition.makeBinding(DialogBlock, {
  field: 'mobileMenuDialog',
  init: { contextToArgs: () => [{ id: 'mobile-menu' }] },
}).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const ComboboxDemoBinding = UiDefinition.makeBinding(CityComboboxBlock, {
  field: 'comboboxDemo',
  init: { contextToArgs: () => [{ id: 'combobox-demo' }] },
}).withOutMessagePolicy({
  fold: UiDefinition.makeOutMessageFold(CityComboboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeComboboxDemoSelectedCity: () => Option.some(value),
      })),
    ClearedSelection: makeNoopStep,
  }),
})

export const ComboboxNullableDemoBinding = UiDefinition.makeBinding(
  CityComboboxBlock,
  {
    field: 'comboboxNullableDemo',
    init: {
      contextToArgs: () => [{ id: 'combobox-nullable-demo', nullable: true }],
    },
  },
).withOutMessagePolicy({
  fold: UiDefinition.makeOutMessageFold(CityComboboxBlock, {
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

export const ComboboxMultiDemoBinding = UiDefinition.makeBinding(
  CityMultiComboboxBlock,
  {
    field: 'comboboxMultiDemo',
    init: { contextToArgs: () => [{ id: 'combobox-multi-demo' }] },
  },
).withOutMessagePolicy({
  fold: UiDefinition.makeOutMessageFold(CityMultiComboboxBlock, {
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

export const ComboboxPlacementLockDemoBinding = UiDefinition.makeBinding(
  CityComboboxBlock,
  {
    field: 'comboboxPlacementLockDemo',
    init: { contextToArgs: () => [{ id: 'combobox-placement-lock-demo' }] },
  },
).withOutMessagePolicy({
  fold: UiDefinition.makeOutMessageFold(CityComboboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeComboboxPlacementLockDemoSelectedCity: () => Option.some(value),
      })),
    ClearedSelection: makeNoopStep,
  }),
})

export const ComboboxSelectOnFocusDemoBinding = UiDefinition.makeBinding(
  CityComboboxBlock,
  {
    field: 'comboboxSelectOnFocusDemo',
    init: {
      contextToArgs: () => [
        { id: 'combobox-select-on-focus-demo', selectInputOnFocus: true },
      ],
    },
  },
).withOutMessagePolicy({
  fold: UiDefinition.makeOutMessageFold(CityComboboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeComboboxSelectOnFocusDemoSelectedCity: () => Option.some(value),
      })),
    ClearedSelection: makeNoopStep,
  }),
})

export const DialogDemoBinding = UiDefinition.makeBinding(DialogBlock, {
  field: 'dialogDemo',
  init: { contextToArgs: () => [{ id: 'dialog-demo' }] },
}).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const DialogAnimatedDemoBinding = UiDefinition.makeBinding(DialogBlock, {
  field: 'dialogAnimatedDemo',
  init: {
    contextToArgs: () => [{ id: 'dialog-animated-demo', isAnimated: true }],
  },
}).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const OverlayDialogDemoBinding = UiDefinition.makeBinding(DialogBlock, {
  field: 'overlayDialogDemo',
  init: { contextToArgs: () => [{ id: 'overlay-dialog-demo' }] },
}).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const OverlayComboboxDemoBinding = UiDefinition.makeBinding(
  CityComboboxBlock,
  {
    field: 'overlayComboboxDemo',
    init: { contextToArgs: () => [{ id: 'overlay-combobox-demo' }] },
  },
).withOutMessagePolicy({
  fold: UiDefinition.makeOutMessageFold(CityComboboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeOverlayComboboxDemoSelectedCity: () => Option.some(value),
      })),
    ClearedSelection: makeNoopStep,
  }),
})

export const NestedDialogParentDemoBinding = UiDefinition.makeBinding(
  DialogBlock,
  {
    field: 'nestedDialogParentDemo',
    init: { contextToArgs: () => [{ id: 'nested-dialog-parent-demo' }] },
  },
).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const NestedDialogChildDemoBinding = UiDefinition.makeBinding(
  DialogBlock,
  {
    field: 'nestedDialogChildDemo',
    init: { contextToArgs: () => [{ id: 'nested-dialog-child-demo' }] },
  },
).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const CalendarBasicDemoBinding = UiDefinition.makeBinding(
  CalendarBlock,
  {
    field: 'calendarBasicDemo',
    init: {
      contextToArgs: today => [
        {
          id: 'calendar-basic-demo',
          today,
          minDate: FoldkitCalendar.subtractYears(today, 1),
          maxDate: FoldkitCalendar.addYears(today, 1),
        },
      ],
    },
  },
).withOutMessagePolicy({
  fold: UiDefinition.makeOutMessageFold(CalendarBlock, {
    SelectedDate: ({ date }) =>
      makeFieldsStep(() => ({
        maybeCalendarBasicDemoSelectedDate: () => Option.some(date),
      })),
    ChangedViewMonth: makeNoopStep,
  }),
})

export const DatePickerBasicDemoBinding = UiDefinition.makeBinding(
  DatePickerBlock,
  {
    field: 'datePickerBasicDemo',
    init: {
      contextToArgs: today => [
        {
          id: 'date-picker-basic-demo',
          today,
          minDate: FoldkitCalendar.subtractYears(today, 1),
          maxDate: FoldkitCalendar.addYears(today, 1),
        },
      ],
    },
  },
).withOutMessagePolicy({
  fold: UiDefinition.makeOutMessageFold(DatePickerBlock, {
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

export const FileDropBasicDemoBinding = UiDefinition.makeBinding(
  FileDropBlock,
  {
    field: 'fileDropBasicDemo',
    init: { contextToArgs: () => [{ id: 'file-drop-basic-demo' }] },
  },
).withOutMessagePolicy({
  fold: UiDefinition.makeOutMessageFold(FileDropBlock, {
    ReceivedFiles: ({ files }) =>
      makeFieldsStep(() => ({
        fileDropBasicDemoFiles: Array.appendAll(files),
      })),
    RejectedNonFiles: makeNoopStep,
  }),
})

export const ListboxDemoBinding = UiDefinition.makeBinding(ItemListboxBlock, {
  field: 'listboxDemo',
  init: { contextToArgs: () => [{ id: 'listbox-demo' }] },
}).withOutMessagePolicy({
  fold: UiDefinition.makeOutMessageFold(ItemListboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeListboxDemoSelectedItem: () => Option.some(value),
      })),
  }),
})

export const ListboxMultiDemoBinding = UiDefinition.makeBinding(
  ItemMultiListboxBlock,
  {
    field: 'listboxMultiDemo',
    init: { contextToArgs: () => [{ id: 'listbox-multi-demo' }] },
  },
).withOutMessagePolicy({
  fold: UiDefinition.makeOutMessageFold(ItemMultiListboxBlock, {
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

export const ListboxGroupedDemoBinding = UiDefinition.makeBinding(
  CharacterListboxBlock,
  {
    field: 'listboxGroupedDemo',
    init: { contextToArgs: () => [{ id: 'listbox-grouped-demo' }] },
  },
).withOutMessagePolicy({
  fold: UiDefinition.makeOutMessageFold(CharacterListboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeListboxGroupedDemoSelectedItem: () => Option.some(value),
      })),
  }),
})

export const MenuBasicDemoBinding = UiDefinition.makeBinding(DemoMenuBlock, {
  field: 'menuBasicDemo',
  init: { contextToArgs: () => [{ id: 'menu-basic-demo' }] },
}).withOutMessagePolicy({ fold: foldMenuOutMessage })

export const MenuAnimatedDemoBinding = UiDefinition.makeBinding(DemoMenuBlock, {
  field: 'menuAnimatedDemo',
  init: {
    contextToArgs: () => [{ id: 'menu-animated-demo', isAnimated: true }],
  },
}).withOutMessagePolicy({ fold: foldMenuOutMessage })

export const PopoverBasicDemoBinding = UiDefinition.makeBinding(PopoverBlock, {
  field: 'popoverBasicDemo',
  init: { contextToArgs: () => [{ id: 'popover-basic-demo' }] },
}).withOutMessagePolicy({ fold: foldPopoverOutMessage })

export const PopoverAnimatedDemoBinding = UiDefinition.makeBinding(
  PopoverBlock,
  {
    field: 'popoverAnimatedDemo',
    init: {
      contextToArgs: () => [{ id: 'popover-animated-demo', isAnimated: true }],
    },
  },
).withOutMessagePolicy({ fold: foldPopoverOutMessage })

export const PopoverNestedParentDemoBinding = UiDefinition.makeBinding(
  PopoverBlock,
  {
    field: 'popoverNestedParentDemo',
    init: {
      contextToArgs: () => [
        { id: 'popover-nested-parent-demo', contentFocus: true },
      ],
    },
  },
).withOutMessagePolicy({ fold: foldPopoverOutMessage })

export const PopoverNestedChildDemoBinding = UiDefinition.makeBinding(
  PopoverBlock,
  {
    field: 'popoverNestedChildDemo',
    init: { contextToArgs: () => [{ id: 'popover-nested-child-demo' }] },
  },
).withOutMessagePolicy({ fold: foldPopoverOutMessage })

export const VerticalRadioGroupDemoBinding = UiDefinition.makeBinding(
  PlanRadioGroupBlock,
  {
    field: 'verticalRadioGroupDemo',
    init: { contextToArgs: () => [{ id: 'vertical-radio-group-demo' }] },
  },
).withOutMessagePolicy({
  fold: UiDefinition.makeOutMessageFold(PlanRadioGroupBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        verticalRadioGroupDemoValue: () => Option.some(value),
      })),
  }),
})

export const HorizontalRadioGroupDemoBinding = UiDefinition.makeBinding(
  PlanRadioGroupBlock,
  {
    field: 'horizontalRadioGroupDemo',
    init: { contextToArgs: () => [{ id: 'horizontal-radio-group-demo' }] },
  },
).withOutMessagePolicy({
  fold: UiDefinition.makeOutMessageFold(PlanRadioGroupBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        horizontalRadioGroupDemoValue: () => Option.some(value),
      })),
  }),
})

export const SliderRatingDemoBinding = UiDefinition.makeBinding(SliderBlock, {
  field: 'sliderRatingDemo',
  init: {
    contextToArgs: () => [
      { id: 'slider-rating-demo', min: 0, max: 10, step: 1 },
    ],
  },
}).withOutMessagePolicy({
  fold: UiDefinition.makeOutMessageFold(SliderBlock, {
    ChangedValue: ({ value }) =>
      makeFieldsStep(() => ({ sliderRatingValue: () => value })),
  }),
})

export const SliderVolumeDemoBinding = UiDefinition.makeBinding(SliderBlock, {
  field: 'sliderVolumeDemo',
  init: {
    contextToArgs: () => [
      { id: 'slider-volume-demo', min: 0, max: 1, step: 0.05 },
    ],
  },
}).withOutMessagePolicy({
  fold: UiDefinition.makeOutMessageFold(SliderBlock, {
    ChangedValue: ({ value }) =>
      makeFieldsStep(() => ({ sliderVolumeValue: () => value })),
  }),
})

export const HorizontalTabsDemoBinding = UiDefinition.makeBinding(
  DemoTabsBlock,
  {
    field: 'horizontalTabsDemo',
    init: { contextToArgs: () => [{ id: 'horizontal-tabs-demo' }] },
  },
).withOutMessagePolicy({
  fold: UiDefinition.makeOutMessageFold(DemoTabsBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        horizontalTabsDemoTab: () => value,
      })),
  }),
})

export const VerticalTabsDemoBinding = UiDefinition.makeBinding(DemoTabsBlock, {
  field: 'verticalTabsDemo',
  init: { contextToArgs: () => [{ id: 'vertical-tabs-demo' }] },
}).withOutMessagePolicy({
  fold: UiDefinition.makeOutMessageFold(DemoTabsBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({ verticalTabsDemoTab: () => value })),
  }),
})

export const ToastDemoBinding = UiDefinition.makeBinding(ToastBlock, {
  field: 'toastDemo',
  init: { contextToArgs: () => [{ id: 'toast-demo', swipeToDismiss: {} }] },
}).withOutMessagePolicy({
  fold: UiDefinition.makeOutMessageFold(ToastBlock, {
    DismissedToast: makeNoopStep,
  }),
})

export const TooltipBasicDemoBinding = UiDefinition.makeBinding(TooltipBlock, {
  field: 'tooltipBasicDemo',
  init: { contextToArgs: () => [{ id: 'tooltip-basic-demo' }] },
}).withOutMessagePolicy({ fold: foldTooltipOutMessage })

export const TooltipNoDelayDemoBinding = UiDefinition.makeBinding(
  TooltipBlock,
  {
    field: 'tooltipNoDelayDemo',
    init: {
      contextToArgs: () => [{ id: 'tooltip-no-delay-demo', showDelay: 0 }],
    },
  },
).withOutMessagePolicy({ fold: foldTooltipOutMessage })

export const HoverIntentDemoBinding = UiDefinition.makeBinding(
  HoverIntentBlock,
  {
    field: 'hoverIntentDemo',
  },
).withOutMessagePolicy({
  fold: UiDefinition.makeOutMessageFold(HoverIntentBlock, {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
  }),
})

const foldVirtualListOutMessage = UiDefinition.makeOutMessageFold(
  ActivityVirtualListBlock,
  {
    ObservedContainerScroll: makeNoopStep,
  },
)

export const VirtualListDemoBinding = UiDefinition.makeBinding(
  ActivityVirtualListBlock,
  {
    field: 'virtualListDemo',
    init: {
      contextToArgs: () => [{ id: 'virtual-list-demo', rowHeightPx: 56 }],
    },
  },
).withOutMessagePolicy({ fold: foldVirtualListOutMessage })

export const VirtualListVariableDemoBinding = UiDefinition.makeBinding(
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

export const UiComposition = UiDefinition.makeComposition({
  bindings: [
    MobileMenuDialogBinding,
    ComboboxDemoBinding,
    ComboboxNullableDemoBinding,
    ComboboxMultiDemoBinding,
    ComboboxPlacementLockDemoBinding,
    ComboboxSelectOnFocusDemoBinding,
    DialogDemoBinding,
    DialogAnimatedDemoBinding,
    OverlayDialogDemoBinding,
    OverlayComboboxDemoBinding,
    NestedDialogParentDemoBinding,
    NestedDialogChildDemoBinding,
    CalendarBasicDemoBinding,
    DatePickerBasicDemoBinding,
    DragAndDropDemoBinding,
    FileDropBasicDemoBinding,
    ListboxDemoBinding,
    ListboxMultiDemoBinding,
    ListboxGroupedDemoBinding,
    MenuBasicDemoBinding,
    MenuAnimatedDemoBinding,
    PopoverBasicDemoBinding,
    PopoverAnimatedDemoBinding,
    PopoverNestedParentDemoBinding,
    PopoverNestedChildDemoBinding,
    VerticalRadioGroupDemoBinding,
    HorizontalRadioGroupDemoBinding,
    SliderRatingDemoBinding,
    SliderVolumeDemoBinding,
    HorizontalTabsDemoBinding,
    VerticalTabsDemoBinding,
    ToastDemoBinding,
    TooltipBasicDemoBinding,
    TooltipNoDelayDemoBinding,
    HoverIntentDemoBinding,
    AnimationDemoBindingWithOutMessagePolicy,
    VirtualListDemoBinding,
    VirtualListVariableDemoBinding,
  ],
})
export type UiViewBuilder = Block.ViewBuilderFor<typeof UiComposition>
