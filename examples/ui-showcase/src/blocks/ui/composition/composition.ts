import { Array, Option } from 'effect'
import { type Block, Calendar as FoldkitCalendar } from 'foldkit'
import type * as Html from 'foldkit/html'

import { CalendarBlock } from '@foldkit/ui/calendar'
import { DatePickerBlock } from '@foldkit/ui/datePicker'
import { DialogBlock } from '@foldkit/ui/dialog'
import { FileDropBlock } from '@foldkit/ui/fileDrop'
import { HoverIntentBlock } from '@foldkit/ui/hoverIntent'
import { PopoverBlock } from '@foldkit/ui/popover'
import { SliderBlock } from '@foldkit/ui/slider'
import { TooltipBlock } from '@foldkit/ui/tooltip'

import { CityComboboxBlock, CityMultiComboboxBlock } from '../combobox'
import { UiBlock, makeFieldsStep, makeNoopStep } from '../definition'
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

const foldDialogOutMessage = UiBlock.makeOutMessageFold(DialogBlock, {
  Opened: makeNoopStep,
  Closed: makeNoopStep,
  CompletedClose: makeNoopStep,
})

const foldMenuOutMessage = UiBlock.makeOutMessageFold(DemoMenuBlock, {
  Selected: makeNoopStep,
  Closed: makeNoopStep,
})

const foldPopoverOutMessage = UiBlock.makeOutMessageFold(PopoverBlock, {
  Opened: makeNoopStep,
  Closed: makeNoopStep,
})

const foldTooltipOutMessage = UiBlock.makeOutMessageFold(TooltipBlock, {
  Shown: makeNoopStep,
  Hidden: makeNoopStep,
})

export const MobileMenuDialogBinding = UiBlock.makeBinding(DialogBlock, {
  field: 'mobileMenuDialog',
  init: { contextToArgs: () => [{ id: 'mobile-menu' }] },
}).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const ComboboxDemoBinding = UiBlock.makeBinding(CityComboboxBlock, {
  field: 'comboboxDemo',
  init: { contextToArgs: () => [{ id: 'combobox-demo' }] },
}).withOutMessagePolicy({
  fold: UiBlock.makeOutMessageFold(CityComboboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeComboboxDemoSelectedCity: () => Option.some(value),
      })),
    ClearedSelection: makeNoopStep,
  }),
})

export const ComboboxNullableDemoBinding = UiBlock.makeBinding(
  CityComboboxBlock,
  {
    field: 'comboboxNullableDemo',
    init: {
      contextToArgs: () => [{ id: 'combobox-nullable-demo', nullable: true }],
    },
  },
).withOutMessagePolicy({
  fold: UiBlock.makeOutMessageFold(CityComboboxBlock, {
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

export const ComboboxMultiDemoBinding = UiBlock.makeBinding(
  CityMultiComboboxBlock,
  {
    field: 'comboboxMultiDemo',
    init: { contextToArgs: () => [{ id: 'combobox-multi-demo' }] },
  },
).withOutMessagePolicy({
  fold: UiBlock.makeOutMessageFold(CityMultiComboboxBlock, {
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

export const ComboboxPlacementLockDemoBinding = UiBlock.makeBinding(
  CityComboboxBlock,
  {
    field: 'comboboxPlacementLockDemo',
    init: { contextToArgs: () => [{ id: 'combobox-placement-lock-demo' }] },
  },
).withOutMessagePolicy({
  fold: UiBlock.makeOutMessageFold(CityComboboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeComboboxPlacementLockDemoSelectedCity: () => Option.some(value),
      })),
    ClearedSelection: makeNoopStep,
  }),
})

export const ComboboxSelectOnFocusDemoBinding = UiBlock.makeBinding(
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
  fold: UiBlock.makeOutMessageFold(CityComboboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeComboboxSelectOnFocusDemoSelectedCity: () => Option.some(value),
      })),
    ClearedSelection: makeNoopStep,
  }),
})

export const DialogDemoBinding = UiBlock.makeBinding(DialogBlock, {
  field: 'dialogDemo',
  init: { contextToArgs: () => [{ id: 'dialog-demo' }] },
}).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const DialogAnimatedDemoBinding = UiBlock.makeBinding(DialogBlock, {
  field: 'dialogAnimatedDemo',
  init: {
    contextToArgs: () => [{ id: 'dialog-animated-demo', isAnimated: true }],
  },
}).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const OverlayDialogDemoBinding = UiBlock.makeBinding(DialogBlock, {
  field: 'overlayDialogDemo',
  init: { contextToArgs: () => [{ id: 'overlay-dialog-demo' }] },
}).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const OverlayComboboxDemoBinding = UiBlock.makeBinding(
  CityComboboxBlock,
  {
    field: 'overlayComboboxDemo',
    init: { contextToArgs: () => [{ id: 'overlay-combobox-demo' }] },
  },
).withOutMessagePolicy({
  fold: UiBlock.makeOutMessageFold(CityComboboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeOverlayComboboxDemoSelectedCity: () => Option.some(value),
      })),
    ClearedSelection: makeNoopStep,
  }),
})

export const NestedDialogParentDemoBinding = UiBlock.makeBinding(DialogBlock, {
  field: 'nestedDialogParentDemo',
  init: { contextToArgs: () => [{ id: 'nested-dialog-parent-demo' }] },
}).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const NestedDialogChildDemoBinding = UiBlock.makeBinding(DialogBlock, {
  field: 'nestedDialogChildDemo',
  init: { contextToArgs: () => [{ id: 'nested-dialog-child-demo' }] },
}).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const CalendarBasicDemoBinding = UiBlock.makeBinding(CalendarBlock, {
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
}).withOutMessagePolicy({
  fold: UiBlock.makeOutMessageFold(CalendarBlock, {
    SelectedDate: ({ date }) =>
      makeFieldsStep(() => ({
        maybeCalendarBasicDemoSelectedDate: () => Option.some(date),
      })),
    ChangedViewMonth: makeNoopStep,
  }),
})

export const DatePickerBasicDemoBinding = UiBlock.makeBinding(DatePickerBlock, {
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
}).withOutMessagePolicy({
  fold: UiBlock.makeOutMessageFold(DatePickerBlock, {
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

export const FileDropBasicDemoBinding = UiBlock.makeBinding(FileDropBlock, {
  field: 'fileDropBasicDemo',
  init: { contextToArgs: () => [{ id: 'file-drop-basic-demo' }] },
}).withOutMessagePolicy({
  fold: UiBlock.makeOutMessageFold(FileDropBlock, {
    ReceivedFiles: ({ files }) =>
      makeFieldsStep(() => ({
        fileDropBasicDemoFiles: Array.appendAll(files),
      })),
    RejectedNonFiles: makeNoopStep,
  }),
})

export const ListboxDemoBinding = UiBlock.makeBinding(ItemListboxBlock, {
  field: 'listboxDemo',
  init: { contextToArgs: () => [{ id: 'listbox-demo' }] },
}).withOutMessagePolicy({
  fold: UiBlock.makeOutMessageFold(ItemListboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeListboxDemoSelectedItem: () => Option.some(value),
      })),
  }),
})

export const ListboxMultiDemoBinding = UiBlock.makeBinding(
  ItemMultiListboxBlock,
  {
    field: 'listboxMultiDemo',
    init: { contextToArgs: () => [{ id: 'listbox-multi-demo' }] },
  },
).withOutMessagePolicy({
  fold: UiBlock.makeOutMessageFold(ItemMultiListboxBlock, {
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

export const ListboxGroupedDemoBinding = UiBlock.makeBinding(
  CharacterListboxBlock,
  {
    field: 'listboxGroupedDemo',
    init: { contextToArgs: () => [{ id: 'listbox-grouped-demo' }] },
  },
).withOutMessagePolicy({
  fold: UiBlock.makeOutMessageFold(CharacterListboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeListboxGroupedDemoSelectedItem: () => Option.some(value),
      })),
  }),
})

export const MenuBasicDemoBinding = UiBlock.makeBinding(DemoMenuBlock, {
  field: 'menuBasicDemo',
  init: { contextToArgs: () => [{ id: 'menu-basic-demo' }] },
}).withOutMessagePolicy({ fold: foldMenuOutMessage })

export const MenuAnimatedDemoBinding = UiBlock.makeBinding(DemoMenuBlock, {
  field: 'menuAnimatedDemo',
  init: {
    contextToArgs: () => [{ id: 'menu-animated-demo', isAnimated: true }],
  },
}).withOutMessagePolicy({ fold: foldMenuOutMessage })

export const PopoverBasicDemoBinding = UiBlock.makeBinding(PopoverBlock, {
  field: 'popoverBasicDemo',
  init: { contextToArgs: () => [{ id: 'popover-basic-demo' }] },
}).withOutMessagePolicy({ fold: foldPopoverOutMessage })

export const PopoverAnimatedDemoBinding = UiBlock.makeBinding(PopoverBlock, {
  field: 'popoverAnimatedDemo',
  init: {
    contextToArgs: () => [{ id: 'popover-animated-demo', isAnimated: true }],
  },
}).withOutMessagePolicy({ fold: foldPopoverOutMessage })

export const PopoverNestedParentDemoBinding = UiBlock.makeBinding(
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

export const PopoverNestedChildDemoBinding = UiBlock.makeBinding(PopoverBlock, {
  field: 'popoverNestedChildDemo',
  init: { contextToArgs: () => [{ id: 'popover-nested-child-demo' }] },
}).withOutMessagePolicy({ fold: foldPopoverOutMessage })

export const VerticalRadioGroupDemoBinding = UiBlock.makeBinding(
  PlanRadioGroupBlock,
  {
    field: 'verticalRadioGroupDemo',
    init: { contextToArgs: () => [{ id: 'vertical-radio-group-demo' }] },
  },
).withOutMessagePolicy({
  fold: UiBlock.makeOutMessageFold(PlanRadioGroupBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        verticalRadioGroupDemoValue: () => Option.some(value),
      })),
  }),
})

export const HorizontalRadioGroupDemoBinding = UiBlock.makeBinding(
  PlanRadioGroupBlock,
  {
    field: 'horizontalRadioGroupDemo',
    init: { contextToArgs: () => [{ id: 'horizontal-radio-group-demo' }] },
  },
).withOutMessagePolicy({
  fold: UiBlock.makeOutMessageFold(PlanRadioGroupBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        horizontalRadioGroupDemoValue: () => Option.some(value),
      })),
  }),
})

export const SliderRatingDemoBinding = UiBlock.makeBinding(SliderBlock, {
  field: 'sliderRatingDemo',
  init: {
    contextToArgs: () => [
      { id: 'slider-rating-demo', min: 0, max: 10, step: 1 },
    ],
  },
}).withOutMessagePolicy({
  fold: UiBlock.makeOutMessageFold(SliderBlock, {
    ChangedValue: ({ value }) =>
      makeFieldsStep(() => ({ sliderRatingValue: () => value })),
  }),
})

export const SliderVolumeDemoBinding = UiBlock.makeBinding(SliderBlock, {
  field: 'sliderVolumeDemo',
  init: {
    contextToArgs: () => [
      { id: 'slider-volume-demo', min: 0, max: 1, step: 0.05 },
    ],
  },
}).withOutMessagePolicy({
  fold: UiBlock.makeOutMessageFold(SliderBlock, {
    ChangedValue: ({ value }) =>
      makeFieldsStep(() => ({ sliderVolumeValue: () => value })),
  }),
})

export const HorizontalTabsDemoBinding = UiBlock.makeBinding(DemoTabsBlock, {
  field: 'horizontalTabsDemo',
  init: { contextToArgs: () => [{ id: 'horizontal-tabs-demo' }] },
}).withOutMessagePolicy({
  fold: UiBlock.makeOutMessageFold(DemoTabsBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        horizontalTabsDemoTab: () => value,
      })),
  }),
})

export const VerticalTabsDemoBinding = UiBlock.makeBinding(DemoTabsBlock, {
  field: 'verticalTabsDemo',
  init: { contextToArgs: () => [{ id: 'vertical-tabs-demo' }] },
}).withOutMessagePolicy({
  fold: UiBlock.makeOutMessageFold(DemoTabsBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({ verticalTabsDemoTab: () => value })),
  }),
})

export const ToastDemoBinding = UiBlock.makeBinding(ToastBlock, {
  field: 'toastDemo',
  init: { contextToArgs: () => [{ id: 'toast-demo', swipeToDismiss: {} }] },
}).withOutMessagePolicy({
  fold: UiBlock.makeOutMessageFold(ToastBlock, {
    DismissedToast: makeNoopStep,
  }),
})

export const TooltipBasicDemoBinding = UiBlock.makeBinding(TooltipBlock, {
  field: 'tooltipBasicDemo',
  init: { contextToArgs: () => [{ id: 'tooltip-basic-demo' }] },
}).withOutMessagePolicy({ fold: foldTooltipOutMessage })

export const TooltipNoDelayDemoBinding = UiBlock.makeBinding(TooltipBlock, {
  field: 'tooltipNoDelayDemo',
  init: {
    contextToArgs: () => [{ id: 'tooltip-no-delay-demo', showDelay: 0 }],
  },
}).withOutMessagePolicy({ fold: foldTooltipOutMessage })

export const HoverIntentDemoBinding = UiBlock.makeBinding(HoverIntentBlock, {
  field: 'hoverIntentDemo',
}).withOutMessagePolicy({
  fold: UiBlock.makeOutMessageFold(HoverIntentBlock, {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
  }),
})

const foldVirtualListOutMessage = UiBlock.makeOutMessageFold(
  ActivityVirtualListBlock,
  {
    ObservedContainerScroll: makeNoopStep,
    ApproachedLoadedStart: makeNoopStep,
    EndedContainerScroll: makeNoopStep,
  },
)

export const VirtualListDemoBinding = UiBlock.makeBinding(
  ActivityVirtualListBlock,
  {
    field: 'virtualListDemo',
    init: {
      contextToArgs: () => [{ id: 'virtual-list-demo', rowHeightPx: 56 }],
    },
  },
).withOutMessagePolicy({ fold: foldVirtualListOutMessage })

export const VirtualListVariableDemoBinding = UiBlock.makeBinding(
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

export const UiComposition = UiBlock.makeComposition({
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
