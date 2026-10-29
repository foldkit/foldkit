import type { Html } from 'foldkit/html'
import type { Url } from 'foldkit/url'

import type { CodeBlock } from '../../component'
import type { RenderHeadingLink } from '../../prose'
import * as AnchorPage from './anchorPage'
import * as AnimationPage from './animationPage'
import * as ButtonPage from './buttonPage'
import * as CalendarPage from './calendarPage'
import * as CheckboxPage from './checkboxPage'
import * as ComboboxPage from './comboboxPage'
import { UiComposition } from './composition'
import type { UiViewBuilder } from './composition'
import * as DatePickerPage from './datePickerPage'
import * as DialogPage from './dialogPage'
import * as DisclosurePage from './disclosurePage'
import type { Page } from './domain/domain'
import * as DragAndDropPage from './dragAndDropPage'
import * as FieldsetPage from './fieldsetPage'
import * as FileDropPage from './fileDropPage'
import * as HoverIntentPage from './hoverIntentPage'
import * as InputPage from './inputPage'
import * as ListboxPage from './listboxPage'
import * as MenuPage from './menuPage'
import * as MeterPage from './meterPage'
import type { Model } from './model'
import * as NavPage from './navPage'
import * as OverviewPage from './overviewPage'
import * as PopoverPage from './popoverPage'
import * as ProgressPage from './progressPage'
import * as RadioGroupPage from './radioGroupPage'
import * as SelectPage from './selectPage'
import * as SelectionBlocksPage from './selectionBlocksPage'
import * as SliderPage from './sliderPage'
import * as SwitchPage from './switchPage'
import * as TabsPage from './tabsPage'
import * as TextareaPage from './textareaPage'
import * as ToastPage from './toastPage'
import * as TooltipPage from './tooltipPage'
import * as VirtualListPage from './virtualListPage'

type ViewInputs = Readonly<{
  page: Page
  url: Url
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  renderHeadingLink: RenderHeadingLink
}>

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
