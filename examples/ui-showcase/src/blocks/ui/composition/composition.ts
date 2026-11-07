import { Array, Option } from 'effect'
import { type Block, Calendar as FoldkitCalendar } from 'foldkit'
import type * as Html from 'foldkit/html'

import {
  Calendar,
  DatePicker,
  Dialog,
  FileDrop,
  HoverIntent,
  Popover,
  Slider,
  Tooltip,
} from '@foldkit/ui'

import {
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
} from '../block'
import { CityComboboxBlock, CityMultiComboboxBlock } from '../combobox'
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
import { AnimationDemoBinding } from './animation'
import { DragAndDropDemoBinding } from './dragAndDrop'

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

const foldTooltipOutMessage = makeOutMessageFold(Tooltip.TooltipBlock, {
  Shown: makeNoopStep,
  Hidden: makeNoopStep,
})

export const MobileMenuDialogBinding = makeRequiredFieldBinding(
  Dialog.DialogBlock,
  {
    field: 'mobileMenuDialog',
    init: { contextToArgs: () => [{ id: 'mobile-menu' }] },
  },
).withOutMessagePolicy({ fold: foldDialogOutMessage })

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

export const ComboboxPlacementLockDemoBinding = makeRequiredFieldBinding(
  CityComboboxBlock,
  {
    field: 'comboboxPlacementLockDemo',
    init: { contextToArgs: () => [{ id: 'combobox-placement-lock-demo' }] },
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

export const ComboboxSelectOnFocusDemoBinding = makeRequiredFieldBinding(
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
    init: { contextToArgs: () => [{ id: 'nested-dialog-parent-demo' }] },
  },
).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const NestedDialogChildDemoBinding = makeRequiredFieldBinding(
  Dialog.DialogBlock,
  {
    field: 'nestedDialogChildDemo',
    init: { contextToArgs: () => [{ id: 'nested-dialog-child-demo' }] },
  },
).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const CalendarBasicDemoBinding = makeRequiredFieldBinding(
  Calendar.CalendarBlock,
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
  fold: makeOutMessageFold(Calendar.CalendarBlock, {
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
          minDate: FoldkitCalendar.subtractYears(today, 1),
          maxDate: FoldkitCalendar.addYears(today, 1),
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
    init: { contextToArgs: () => [{ id: 'popover-nested-child-demo' }] },
  },
).withOutMessagePolicy({ fold: foldPopoverOutMessage })

export const VerticalRadioGroupDemoBinding = makeRequiredFieldBinding(
  PlanRadioGroupBlock,
  {
    field: 'verticalRadioGroupDemo',
    init: { contextToArgs: () => [{ id: 'vertical-radio-group-demo' }] },
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
    init: { contextToArgs: () => [{ id: 'horizontal-radio-group-demo' }] },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(PlanRadioGroupBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        horizontalRadioGroupDemoValue: () => Option.some(value),
      })),
  }),
})

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

export const ToastDemoBinding = makeRequiredFieldBinding(ToastBlock, {
  field: 'toastDemo',
  init: { contextToArgs: () => [{ id: 'toast-demo', swipeToDismiss: {} }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(ToastBlock, {
    DismissedToast: makeNoopStep,
  }),
})

export const TooltipBasicDemoBinding = makeRequiredFieldBinding(
  Tooltip.TooltipBlock,
  {
    field: 'tooltipBasicDemo',
    init: { contextToArgs: () => [{ id: 'tooltip-basic-demo' }] },
  },
).withOutMessagePolicy({ fold: foldTooltipOutMessage })

export const TooltipNoDelayDemoBinding = makeRequiredFieldBinding(
  Tooltip.TooltipBlock,
  {
    field: 'tooltipNoDelayDemo',
    init: {
      contextToArgs: () => [{ id: 'tooltip-no-delay-demo', showDelay: 0 }],
    },
  },
).withOutMessagePolicy({ fold: foldTooltipOutMessage })

export const HoverIntentDemoBinding = makeRequiredFieldBinding(
  HoverIntent.HoverIntentBlock,
  {
    field: 'hoverIntentDemo',
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(HoverIntent.HoverIntentBlock, {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
  }),
})

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

export const UiComposition = makeComposition({
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
    AnimationDemoBinding,
    VirtualListDemoBinding,
    VirtualListVariableDemoBinding,
  ],
})
export type UiViewBuilder = Block.ViewBuilderFor<typeof UiComposition>
export type UiMessage = Html.MessageOf<UiViewBuilder>
