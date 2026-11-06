import type { Html } from 'foldkit/html'

import { UiComposition } from '../composition'
import type { UiViewBuilder } from '../composition'
import type { Page } from '../domain/domain'
import type { Model } from '../model'
import type { ViewInputs } from '../viewInputs'
import * as AnchorPage from './anchor'
import * as AnimationPage from './animation'
import * as ButtonPage from './button'
import * as CalendarPage from './calendar'
import * as CheckboxPage from './checkbox'
import * as ComboboxPage from './combobox'
import * as DatePickerPage from './datePicker'
import * as DialogPage from './dialog'
import * as DisclosurePage from './disclosure'
import * as DragAndDropPage from './dragAndDrop'
import * as FieldsetPage from './fieldset'
import * as FileDropPage from './fileDrop'
import * as HoverIntentPage from './hoverIntent'
import * as InputPage from './input'
import * as ListboxPage from './listbox'
import * as MenuPage from './menu'
import * as MeterPage from './meter'
import * as NavPage from './nav'
import * as OverviewPage from './overview'
import * as PopoverPage from './popover'
import * as ProgressPage from './progress'
import * as RadioGroupPage from './radioGroup'
import * as SelectPage from './select'
import * as SelectionBlocksPage from './selectionBlocks'
import * as SliderPage from './slider'
import * as SwitchPage from './switch'
import * as TabsPage from './tabs'
import * as TextareaPage from './textarea'
import * as ToastPage from './toast'
import * as TooltipPage from './tooltip'
import * as VirtualListPage from './virtualList'

const pageViews: Readonly<
  globalThis.Record<
    Page,
    (model: Model, viewInputs: ViewInputs, h: UiViewBuilder) => Html
  >
> = {
  Anchor: (_model, { renderCopyButton, renderSnippet, renderHeadingLink }) =>
    AnchorPage.view(renderCopyButton, renderSnippet, renderHeadingLink),
  Animation: AnimationPage.view,
  Button: ButtonPage.view,
  Calendar: CalendarPage.view,
  Checkbox: CheckboxPage.view,
  Combobox: ComboboxPage.view,
  DatePicker: DatePickerPage.view,
  Dialog: DialogPage.view,
  Disclosure: DisclosurePage.view,
  DragAndDrop: DragAndDropPage.view,
  Fieldset: FieldsetPage.view,
  FileDrop: FileDropPage.view,
  HoverIntent: HoverIntentPage.view,
  Input: InputPage.view,
  Listbox: ListboxPage.view,
  Menu: MenuPage.view,
  Meter: MeterPage.view,
  Nav: NavPage.view,
  Overview: (_model, { renderCopyButton, renderSnippet, renderHeadingLink }) =>
    OverviewPage.view(renderCopyButton, renderSnippet, renderHeadingLink),
  Popover: PopoverPage.view,
  Progress: ProgressPage.view,
  RadioGroup: RadioGroupPage.view,
  Select: SelectPage.view,
  SelectionBlocks: (
    _model,
    { renderCopyButton, renderSnippet, renderHeadingLink },
  ) =>
    SelectionBlocksPage.view(
      renderCopyButton,
      renderSnippet,
      renderHeadingLink,
    ),
  Slider: SliderPage.view,
  Switch: SwitchPage.view,
  Tabs: TabsPage.view,
  Textarea: TextareaPage.view,
  Toast: ToastPage.view,
  Tooltip: TooltipPage.view,
  VirtualList: VirtualListPage.view,
}

export const view = UiComposition.makeView.withInputs<ViewInputs>(
  (model, viewInputs, h) => pageViews[viewInputs.page](model, viewInputs, h),
)
