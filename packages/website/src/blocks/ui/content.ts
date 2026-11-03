import { docPage, slotDocPage } from '../../markdown'
import anchorMarkdown from '../../page/ui/anchorPage.md'
import animationMarkdown from '../../page/ui/animationPage.md'
import buttonMarkdown from '../../page/ui/buttonPage.md'
import calendarMarkdown from '../../page/ui/calendarPage.md'
import checkboxMarkdown from '../../page/ui/checkboxPage.md'
import comboboxMarkdown from '../../page/ui/comboboxPage.md'
import datePickerMarkdown from '../../page/ui/datePickerPage.md'
import dialogMarkdown from '../../page/ui/dialogPage.md'
import disclosureMarkdown from '../../page/ui/disclosurePage.md'
import dragAndDropMarkdown from '../../page/ui/dragAndDropPage.md'
import fieldsetMarkdown from '../../page/ui/fieldsetPage.md'
import fileDropMarkdown from '../../page/ui/fileDropPage.md'
import hoverIntentMarkdown from '../../page/ui/hoverIntentPage.md'
import inputMarkdown from '../../page/ui/inputPage.md'
import listboxMarkdown from '../../page/ui/listboxPage.md'
import menuMarkdown from '../../page/ui/menuPage.md'
import meterMarkdown from '../../page/ui/meterPage.md'
import navMarkdown from '../../page/ui/navPage.md'
import overviewMarkdown from '../../page/ui/overviewPage.md'
import popoverMarkdown from '../../page/ui/popoverPage.md'
import progressMarkdown from '../../page/ui/progressPage.md'
import radioGroupMarkdown from '../../page/ui/radioGroupPage.md'
import selectMarkdown from '../../page/ui/selectPage.md'
import selectionBlocksMarkdown from '../../page/ui/selectionBlocksPage.md'
import sliderMarkdown from '../../page/ui/sliderPage.md'
import switchMarkdown from '../../page/ui/switchPage.md'
import tabsMarkdown from '../../page/ui/tabsPage.md'
import textareaMarkdown from '../../page/ui/textareaPage.md'
import toastMarkdown from '../../page/ui/toastPage.md'
import tooltipMarkdown from '../../page/ui/tooltipPage.md'
import virtualListMarkdown from '../../page/ui/virtualListPage.md'

export const AnchorPageContent = docPage(anchorMarkdown, 'ui/anchor')

export const AnimationPageContent = slotDocPage<'animation'>(
  animationMarkdown,
  'ui/animation',
)

export const ButtonPageContent = slotDocPage<'basic' | 'disabled'>(
  buttonMarkdown,
  'ui/button',
)

export const CalendarPageContent = slotDocPage<'basic'>(
  calendarMarkdown,
  'ui/calendar',
)

export const CheckboxPageContent = slotDocPage<'basic' | 'indeterminate'>(
  checkboxMarkdown,
  'ui/checkbox',
)

export const ComboboxPageContent = slotDocPage<
  | 'single-select'
  | 'nullable'
  | 'select-on-focus'
  | 'locked-placement'
  | 'multi'
>(comboboxMarkdown, 'ui/combobox')

export const DatePickerPageContent = slotDocPage<'basic'>(
  datePickerMarkdown,
  'ui/date-picker',
)

export const DialogPageContent = slotDocPage<
  'dialog' | 'animated' | 'overlay' | 'nested'
>(dialogMarkdown, 'ui/dialog')

export const DisclosurePageContent = slotDocPage<'basic' | 'collapsedPreview'>(
  disclosureMarkdown,
  'ui/disclosure',
)

export const DragAndDropPageContent = slotDocPage<'demo'>(
  dragAndDropMarkdown,
  'ui/drag-and-drop',
)

export const FieldsetPageContent = slotDocPage<'basic' | 'disabled'>(
  fieldsetMarkdown,
  'ui/fieldset',
)

export const FileDropPageContent = slotDocPage<'basic'>(
  fileDropMarkdown,
  'ui/file-drop',
)

export const HoverIntentPageContent = slotDocPage<'hover-card' | 'hover-menu'>(
  hoverIntentMarkdown,
  'ui/hover-intent',
)

export const InputPageContent = slotDocPage<'basic' | 'disabled'>(
  inputMarkdown,
  'ui/input',
)

export const ListboxPageContent = slotDocPage<
  'basic' | 'multi-select' | 'grouped'
>(listboxMarkdown, 'ui/listbox')

export const MenuPageContent = slotDocPage<'basic' | 'animated'>(
  menuMarkdown,
  'ui/menu',
)

export const MeterPageContent = slotDocPage<'basic' | 'thresholds'>(
  meterMarkdown,
  'ui/meter',
)

export const NavPageContent = slotDocPage<'basic'>(navMarkdown, 'ui/nav')

export const OverviewPageContent = docPage(overviewMarkdown, 'ui/overview')

export const PopoverPageContent = slotDocPage<
  'basic' | 'arrow' | 'animated' | 'nested'
>(popoverMarkdown, 'ui/popover')

export const ProgressPageContent = slotDocPage<'basic' | 'indeterminate'>(
  progressMarkdown,
  'ui/progress',
)

export const RadioGroupPageContent = slotDocPage<'vertical' | 'horizontal'>(
  radioGroupMarkdown,
  'ui/radio-group',
)

export const SelectPageContent = slotDocPage<'basic' | 'disabled'>(
  selectMarkdown,
  'ui/select',
)

export const SelectionBlocksPageContent = docPage(
  selectionBlocksMarkdown,
  'ui/selection-blocks',
)

export const SliderPageContent = slotDocPage<'horizontal' | 'vertical'>(
  sliderMarkdown,
  'ui/slider',
)

export const SwitchPageContent = slotDocPage<'basic'>(
  switchMarkdown,
  'ui/switch',
)

export const TabsPageContent = slotDocPage<'horizontal' | 'vertical'>(
  tabsMarkdown,
  'ui/tabs',
)

export const TextareaPageContent = slotDocPage<'basic' | 'disabled'>(
  textareaMarkdown,
  'ui/textarea',
)

export const ToastPageContent = slotDocPage<'demo'>(toastMarkdown, 'ui/toast')

export const TooltipPageContent = slotDocPage<'demo'>(
  tooltipMarkdown,
  'ui/tooltip',
)

export const VirtualListPageContent = slotDocPage<
  'fixed' | 'variable' | 'chat'
>(virtualListMarkdown, 'ui/virtual-list')
