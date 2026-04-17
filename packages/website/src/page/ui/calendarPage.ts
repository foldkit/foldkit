import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import {
  demoContainer,
  heading,
  inlineCode,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import * as Snippet from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'
import {
  type DataAttributeEntry,
  type KeyboardEntry,
  type PropEntry,
  dataAttributeTable,
  keyboardTable,
  propTable,
} from '../../view/docTable'
import * as Calendar from './calendar'
import type { Message } from './message'
import type { Model } from './model'

// TABLE OF CONTENTS

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const examplesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'examples',
  text: 'Examples',
}

const stylingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'styling',
  text: 'Styling',
}

const keyboardInteractionHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'keyboard-interaction',
  text: 'Keyboard Interaction',
}

const accessibilityHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'accessibility',
  text: 'Accessibility',
}

const apiReferenceHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'api-reference',
  text: 'API Reference',
}

const initConfigHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'init-config',
  text: 'InitConfig',
}

const modelHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'model',
  text: 'Model',
}

const viewConfigHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'view-config',
  text: 'ViewConfig',
}

const calendarAttributesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'calendar-attributes',
  text: 'CalendarAttributes',
}

const outMessagesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'out-messages',
  text: 'OutMessage',
}

const programmaticHelpersHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'programmatic-helpers',
  text: 'Programmatic Helpers',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  examplesHeader,
  stylingHeader,
  keyboardInteractionHeader,
  accessibilityHeader,
  apiReferenceHeader,
  initConfigHeader,
  modelHeader,
  viewConfigHeader,
  calendarAttributesHeader,
  outMessagesHeader,
  programmaticHelpersHeader,
]

// SECTION DATA

const initConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description: 'Unique ID for the calendar instance.',
  },
  {
    name: 'today',
    type: 'CalendarDate',
    description:
      'The current calendar date. Typically fetched at the app boundary via Calendar.today.local and threaded through flags.',
  },
  {
    name: 'initialSelectedDate',
    type: 'CalendarDate',
    description:
      'Pre-selected date. When set, the view starts on the month containing this date.',
  },
  {
    name: 'locale',
    type: 'LocaleConfig',
    default: 'defaultEnglishLocale',
    description:
      'Month and day names plus the first day of the week. Import from foldkit/calendar.',
  },
  {
    name: 'minDate',
    type: 'CalendarDate',
    description:
      'Earliest selectable date. Dates before minDate are marked disabled and skipped by keyboard navigation.',
  },
  {
    name: 'maxDate',
    type: 'CalendarDate',
    description:
      'Latest selectable date. Dates after maxDate are marked disabled and skipped by keyboard navigation.',
  },
  {
    name: 'disabledDaysOfWeek',
    type: 'ReadonlyArray<DayOfWeek>',
    default: '[]',
    description:
      'Days of the week to disable (e.g. ["Saturday", "Sunday"] for weekday-only selection).',
  },
  {
    name: 'disabledDates',
    type: 'ReadonlyArray<CalendarDate>',
    default: '[]',
    description:
      'Explicit list of disabled dates (e.g. holidays). Pre-compute for complex rules.',
  },
]

const modelProps: ReadonlyArray<PropEntry> = [
  { name: 'id', type: 'string', description: 'The calendar instance ID.' },
  {
    name: 'today',
    type: 'CalendarDate',
    description:
      'Cached "today" used for the data-today highlight and as the fallback focus target.',
  },
  {
    name: 'viewYear',
    type: 'number',
    description: 'The year currently rendered in the grid.',
  },
  {
    name: 'viewMonth',
    type: 'number',
    description: 'The month (1-12) currently rendered in the grid.',
  },
  {
    name: 'maybeFocusedDate',
    type: 'Option<CalendarDate>',
    description:
      'The keyboard cursor position, referenced by aria-activedescendant on the grid.',
  },
  {
    name: 'maybeSelectedDate',
    type: 'Option<CalendarDate>',
    description:
      'The committed selection. Distinct from maybeFocusedDate — arrow keys never change selection.',
  },
  {
    name: 'isGridFocused',
    type: 'boolean',
    description:
      'Whether the grid container has DOM focus. Used to apply focused styling only when visually appropriate.',
  },
  {
    name: 'locale',
    type: 'LocaleConfig',
    description: 'The locale for month/day names and first day of the week.',
  },
  {
    name: 'maybeMinDate',
    type: 'Option<CalendarDate>',
    description: 'Lower bound for selectable dates.',
  },
  {
    name: 'maybeMaxDate',
    type: 'Option<CalendarDate>',
    description: 'Upper bound for selectable dates.',
  },
  {
    name: 'disabledDaysOfWeek',
    type: 'ReadonlyArray<DayOfWeek>',
    description: 'Days of the week disabled across every month.',
  },
  {
    name: 'disabledDates',
    type: 'ReadonlyArray<CalendarDate>',
    description: 'Explicit dates marked as disabled.',
  },
]

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'model',
    type: 'Calendar.Model',
    description: 'The calendar state from your parent Model.',
  },
  {
    name: 'toParentMessage',
    type: '(childMessage: Calendar.Message) => ParentMessage',
    description:
      'Wraps Calendar Messages in your parent Message type for Submodel delegation (navigation, keyboard, dropdown changes).',
  },
  {
    name: 'onSelectedDate',
    type: '(date: CalendarDate) => ParentMessage',
    description:
      'Optional. When provided, click / Enter / Space on a day dispatches this callback directly (controlled mode — parent owns the event). When omitted, the calendar manages its own maybeSelectedDate automatically (uncontrolled mode). In controlled mode, use Calendar.selectDate(model, date) to write the selection back to internal state. Matches the Listbox / Combobox / Popover callback pattern.',
  },
  {
    name: 'toView',
    type: '(attributes: CalendarAttributes) => Html',
    description:
      'Callback that receives attribute groups plus derived grid data (weeks, column headers, dropdown options) to render the calendar layout.',
  },
  {
    name: 'previousMonthLabel',
    type: 'string',
    default: "'Previous month'",
    description: 'Accessible label for the previous-month navigation button.',
  },
  {
    name: 'nextMonthLabel',
    type: 'string',
    default: "'Next month'",
    description: 'Accessible label for the next-month navigation button.',
  },
  {
    name: 'monthSelectLabel',
    type: 'string',
    default: "'Select month'",
    description: 'Accessible label for the month dropdown.',
  },
  {
    name: 'yearSelectLabel',
    type: 'string',
    default: "'Select year'",
    description: 'Accessible label for the year dropdown.',
  },
]

const calendarAttributesProps: ReadonlyArray<PropEntry> = [
  {
    name: 'root',
    type: 'ReadonlyArray<Attribute<Message>>',
    description: 'Spread onto the outermost wrapper. Includes the root id.',
  },
  {
    name: 'grid',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the grid container. Includes role="grid", tabindex, aria-labelledby, aria-activedescendant, and keyboard/focus handlers.',
  },
  {
    name: 'heading',
    type: '{ id: string; text: string }',
    description:
      'Month/year heading text plus an id for aria-labelledby wiring. Render inside an element with Id(heading.id).',
  },
  {
    name: 'previousMonthButton',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the previous-month button. Includes aria-label and click handler.',
  },
  {
    name: 'nextMonthButton',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the next-month button. Includes aria-label and click handler.',
  },
  {
    name: 'monthSelect / monthOptions',
    type: 'Attribute<Message>[] + { value; label }[]',
    description:
      'Attributes and option data for an optional month dropdown. Pair with a native <select>.',
  },
  {
    name: 'yearSelect / yearOptions',
    type: 'Attribute<Message>[] + number[]',
    description:
      'Attributes and year list for an optional year dropdown. Range derived from min/max or today ±10/100.',
  },
  {
    name: 'headerRow / columnHeaders',
    type: 'Attribute<Message>[] + ColumnHeader<Message>[]',
    description:
      'Row attributes (role="row") and seven column headers (role="columnheader") in locale-aware order.',
  },
  {
    name: 'weeks',
    type: 'ReadonlyArray<Week<Message>>',
    description:
      'Six week rows. Each Week carries its own row attributes (role="row", aria-rowindex) and seven DayCells. DayCells carry cellAttributes (role="gridcell", aria-colindex), buttonAttributes (type="button", aria-label, click), the day label string, and state flags (isToday, isSelected, isFocused, isInViewMonth, isDisabled).',
  },
]

const outMessagesProps: ReadonlyArray<PropEntry> = [
  {
    name: 'ChangedViewMonth',
    type: '{ year: number; month: number }',
    description:
      'Emitted when navigation changes the visible month (buttons, dropdowns, or arrow keys crossing a month boundary, or a commit that crosses a month). Useful for inline-calendar consumers loading month-scoped data like holidays or availability. Note: date selection does NOT go through OutMessage — consumers subscribe via the onSelectedDate ViewConfig callback (see above).',
  },
]

const programmaticHelpersProps: ReadonlyArray<PropEntry> = [
  {
    name: 'selectDate',
    type: '(model: Model, date: CalendarDate) => [Model, Commands, Option<OutMessage>]',
    description:
      'Commits the given date and moves the cursor onto it. Use in controlled mode — when ViewConfig provides onSelectedDate — to write the selection back to the calendar.',
  },
  {
    name: 'focusGrid',
    type: '(modelId: string) => Command',
    description:
      "Returns a command that focuses the calendar grid container. Parent components like DatePicker use this to hand focus to the grid's keyboard layer after opening.",
  },
  {
    name: 'setMinDate',
    type: '(model: Model, maybeMinDate: Option<CalendarDate>) => Model',
    description:
      'Updates the minimum selectable date. Pass Option.none() to remove the minimum. Use for cross-field validation when the minimum derives from other Model state. Does not reconcile the current selection if it falls below the new minimum.',
  },
  {
    name: 'setMaxDate',
    type: '(model: Model, maybeMaxDate: Option<CalendarDate>) => Model',
    description:
      'Updates the maximum selectable date. Pass Option.none() to remove the maximum. Does not reconcile the current selection.',
  },
  {
    name: 'setDisabledDates',
    type: '(model: Model, disabledDates: ReadonlyArray<CalendarDate>) => Model',
    description:
      'Replaces the list of individually-disabled dates (e.g. holidays). Pass an empty array to clear.',
  },
  {
    name: 'setDisabledDaysOfWeek',
    type: '(model: Model, disabledDaysOfWeek: ReadonlyArray<DayOfWeek>) => Model',
    description:
      'Replaces the list of disabled days of the week (e.g. ["Saturday", "Sunday"]). Pass an empty array to clear.',
  },
]

const dataAttributes: ReadonlyArray<DataAttributeEntry> = [
  {
    attribute: 'data-today',
    condition: 'Present on the cell for today.',
  },
  {
    attribute: 'data-selected',
    condition: 'Present on the cell for the selected date.',
  },
  {
    attribute: 'data-focused',
    condition:
      'Present on the cell for the keyboard cursor position while the grid has DOM focus.',
  },
  {
    attribute: 'data-outside-month',
    condition:
      'Present on cells that fall outside the currently-viewed month (leading/trailing grid rows).',
  },
  {
    attribute: 'data-disabled',
    condition:
      'Present on cells disabled by min/max, disabledDaysOfWeek, or disabledDates.',
  },
]

const keyboardEntries: ReadonlyArray<KeyboardEntry> = [
  {
    key: 'ArrowLeft / ArrowRight',
    description: 'Move focus by one day.',
  },
  {
    key: 'ArrowUp / ArrowDown',
    description: 'Move focus by one week.',
  },
  {
    key: 'Home / End',
    description:
      'Move focus to the start / end of the current week (based on locale.firstDayOfWeek).',
  },
  {
    key: 'PageUp / PageDown',
    description: 'Move focus by one month.',
  },
  {
    key: 'Shift + PageUp / Shift + PageDown',
    description: 'Move focus by one year.',
  },
  {
    key: 'Enter / Space',
    description: 'Commit the focused date as the selection.',
  },
]

// VIEW

export const view = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
  copiedSnippets: CopiedSnippets,
): Html =>
  div(
    [],
    [
      pageTitle('ui/calendar', 'Calendar'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'An accessible inline calendar grid built to the WAI-ARIA grid pattern. Calendar manages the 2D keyboard navigation state machine and renders a 6×7 grid of days with full screen reader support. Use it standalone for scheduling UIs and event calendars, or as the foundation of a date picker.',
      ),
      para(
        'Calendar uses the Submodel pattern — initialize with ',
        inlineCode('Calendar.init()'),
        ', store the Model in your parent, delegate Messages via ',
        inlineCode('Calendar.update()'),
        ', and render with ',
        inlineCode('Calendar.view()'),
        '. The update function returns ',
        inlineCode('[Model, Commands, Option<OutMessage>]'),
        ' — the OutMessage lets parents react to meaningful events like date selection and month changes.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      para(
        'A basic calendar with today highlighted. Click a day to select it, or tab into the grid and use the arrow keys. Navigation follows the full WAI-ARIA pattern including Home/End, PageUp/Down, and Shift+PageUp/Down for year jumps.',
      ),
      demoContainer(...Calendar.basicDemo(model, toParentMessage)),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiCalendarBasicHighlighted)],
          [],
        ),
        Snippet.uiCalendarBasicRaw,
        'Copy basic calendar example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'Calendar is headless — your ',
        inlineCode('toView'),
        ' callback controls all markup and styling. The attribute groups carry ARIA and event wiring; data attributes on day cells let you style state variants with CSS selectors like ',
        inlineCode('data-[today]:'),
        ' and ',
        inlineCode('group-data-[selected]:'),
        '.',
      ),
      dataAttributeTable(dataAttributes),
      heading(
        keyboardInteractionHeader.level,
        keyboardInteractionHeader.id,
        keyboardInteractionHeader.text,
      ),
      para(
        'The grid container receives DOM focus, and navigation happens via ',
        inlineCode('aria-activedescendant'),
        ' — screen readers announce the focused cell without moving browser focus. Disabled dates are skipped during navigation with a bounded cap so fully-disabled ranges terminate cleanly.',
      ),
      keyboardTable(keyboardEntries),
      heading(
        accessibilityHeader.level,
        accessibilityHeader.id,
        accessibilityHeader.text,
      ),
      para(
        'The grid renders with ',
        inlineCode('role="grid"'),
        ' and is labelled by the month/year heading via ',
        inlineCode('aria-labelledby'),
        '. Each row has ',
        inlineCode('role="row"'),
        ', column headers have ',
        inlineCode('role="columnheader"'),
        ', and day cells have ',
        inlineCode('role="gridcell"'),
        ' with ',
        inlineCode('aria-selected'),
        ' set on the chosen date. Day buttons carry a full accessible name via ',
        inlineCode('aria-label'),
        ' — e.g. "Monday, April 13, 2026" — and disabled days get ',
        inlineCode('aria-disabled="true"'),
        '.',
      ),
      heading(
        apiReferenceHeader.level,
        apiReferenceHeader.id,
        apiReferenceHeader.text,
      ),
      heading(
        initConfigHeader.level,
        initConfigHeader.id,
        initConfigHeader.text,
      ),
      para(
        'Configuration object passed to ',
        inlineCode('Calendar.init()'),
        '.',
      ),
      propTable(initConfigProps),
      heading(modelHeader.level, modelHeader.id, modelHeader.text),
      para(
        'The calendar state managed as a Submodel field in your parent Model.',
      ),
      propTable(modelProps),
      heading(
        viewConfigHeader.level,
        viewConfigHeader.id,
        viewConfigHeader.text,
      ),
      para(
        'Configuration object passed to ',
        inlineCode('Calendar.view()'),
        '.',
      ),
      propTable(viewConfigProps),
      heading(
        calendarAttributesHeader.level,
        calendarAttributesHeader.id,
        calendarAttributesHeader.text,
      ),
      para(
        'Attribute groups and derived data provided to the ',
        inlineCode('toView'),
        ' callback.',
      ),
      propTable(calendarAttributesProps),
      heading(
        outMessagesHeader.level,
        outMessagesHeader.id,
        outMessagesHeader.text,
      ),
      para(
        'Messages emitted to the parent through the third element of ',
        inlineCode('[Model, Commands, Option<OutMessage>]'),
        '. Parents pattern-match on the OutMessage in their own update handler.',
      ),
      propTable(outMessagesProps),
      heading(
        programmaticHelpersHeader.level,
        programmaticHelpersHeader.id,
        programmaticHelpersHeader.text,
      ),
      para(
        'Helpers you call from your own update handlers to drive the calendar imperatively — writing back the selection in controlled mode, focusing the grid, or updating constraints when they derive from other Model state.',
      ),
      para(
        'The four ',
        inlineCode('set*'),
        ' helpers are the supported path for cross-field date validation. Constraints are set at init time and updated via these helpers — they do not live on ViewConfig, because the update function needs them for keyboard-navigation disabled-skipping and commit-time validation.',
      ),
      propTable(programmaticHelpersProps),
    ],
  )
