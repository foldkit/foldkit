import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import { uiShowcaseViewSourceHref } from '../../link'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import {
  demoContainer,
  heading,
  infoCallout,
  inlineCode,
  link,
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
import * as DatePicker from './datePicker'
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

const viewConfigHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'view-config',
  text: 'ViewConfig',
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
  viewConfigHeader,
  outMessagesHeader,
  programmaticHelpersHeader,
]

// SECTION DATA

const initConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description: 'Unique ID for the date picker instance.',
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
      'Pre-selected date. When set, the calendar grid starts on the month containing this date.',
  },
  {
    name: 'isAnimated',
    type: 'boolean',
    default: 'false',
    description:
      'Enables animation coordination on the popover panel (enter/leave animations).',
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

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'model',
    type: 'DatePicker.Model',
    description: 'The date picker state from your parent Model.',
  },
  {
    name: 'toParentMessage',
    type: '(message: DatePicker.Message) => ParentMessage',
    description:
      'Wraps DatePicker Messages in your parent Message type for Submodel delegation.',
  },
  {
    name: 'onSelectedDate',
    type: '(date: CalendarDate) => ParentMessage',
    description:
      'Optional. When provided, committing a date dispatches this callback directly (controlled mode). When omitted, DatePicker manages its own selection (uncontrolled mode). In controlled mode, use DatePicker.selectDate(model, date) to write the selection back.',
  },
  {
    name: 'anchor',
    type: 'AnchorConfig',
    description:
      'Popover positioning config (placement, gap, offset, padding). Controls where the calendar panel floats relative to the trigger.',
  },
  {
    name: 'triggerContent',
    type: '(maybeDate: Option<CalendarDate>) => Html',
    description:
      'Renders the trigger button face. Receives the current selection so you can show the formatted date or a placeholder.',
  },
  {
    name: 'toCalendarView',
    type: '(attributes: CalendarAttributes<ParentMessage>) => Html',
    description:
      'Renders the calendar grid layout inside the popover panel. Same callback shape as Calendar.view toView — lay out the attribute groups (grid, header, weeks, cells) however you like.',
  },
  {
    name: 'isDisabled',
    type: 'boolean',
    default: 'false',
    description:
      'Disables the trigger button, preventing the popover from opening.',
  },
  {
    name: 'name',
    type: 'string',
    description:
      'When provided, renders a hidden <input> with this name and the selected date encoded as an ISO string (YYYY-MM-DD) for native form submission.',
  },
  {
    name: 'triggerClassName / triggerAttributes',
    type: 'string / ReadonlyArray<Attribute<Message>>',
    description:
      'Class name and additional attributes spread onto the trigger button.',
  },
  {
    name: 'panelClassName / panelAttributes',
    type: 'string / ReadonlyArray<Attribute<Message>>',
    description:
      'Class name and additional attributes spread onto the popover panel.',
  },
  {
    name: 'backdropClassName / backdropAttributes',
    type: 'string / ReadonlyArray<Attribute<Message>>',
    description:
      'Class name and additional attributes spread onto the click-outside backdrop.',
  },
]

const outMessagesProps: ReadonlyArray<PropEntry> = [
  {
    name: 'ChangedViewMonth',
    type: '{ year: number; month: number }',
    description:
      'Emitted when navigation changes the visible month inside the calendar grid. Date selection goes through the onSelectedDate ViewConfig callback, not OutMessage.',
  },
]

const programmaticHelpersProps: ReadonlyArray<PropEntry> = [
  {
    name: 'selectDate',
    type: '(model: Model, date: CalendarDate) => [Model, Commands]',
    description:
      'Commits the given date and closes the popover. Use in controlled mode — when ViewConfig provides onSelectedDate — to write the selection back to the date picker.',
  },
  {
    name: 'clear',
    type: '(model: Model) => [Model, Commands]',
    description: 'Clears the selected date. Does not close the popover.',
  },
  {
    name: 'open',
    type: '(model: Model) => [Model, Commands]',
    description:
      'Programmatically opens the popover. Use from domain-event handlers when the date picker should open in response to something other than a trigger click.',
  },
  {
    name: 'close',
    type: '(model: Model) => [Model, Commands]',
    description: 'Programmatically closes the popover.',
  },
  {
    name: 'setMinDate',
    type: '(model: Model, maybeMinDate: Option<CalendarDate>) => Model',
    description:
      "Updates the minimum selectable date. Pass Option.none() to remove the minimum. Use for cross-field validation — e.g. an end date picker whose minimum tracks a start date picker's selection. Does not reconcile the current selection if it falls below the new minimum.",
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
  {
    attribute: 'data-open',
    condition:
      'Present on the trigger button and wrapper while the popover is open.',
  },
]

const keyboardEntries: ReadonlyArray<KeyboardEntry> = [
  {
    key: 'Enter / Space / ArrowDown',
    description: 'Open the popover when the trigger button is focused.',
  },
  {
    key: 'Escape',
    description:
      'Close the popover from the trigger button or from inside the calendar grid.',
  },
  {
    key: 'ArrowLeft / ArrowRight',
    description: 'Move focus by one day inside the calendar grid.',
  },
  {
    key: 'ArrowUp / ArrowDown',
    description: 'Move focus by one week inside the calendar grid.',
  },
  {
    key: 'Home / End',
    description:
      'Move focus to the start / end of the current week (based on locale.firstDayOfWeek).',
  },
  {
    key: 'PageUp / PageDown',
    description: 'Move focus by one month inside the calendar grid.',
  },
  {
    key: 'Shift + PageUp / Shift + PageDown',
    description: 'Move focus by one year inside the calendar grid.',
  },
  {
    key: 'Enter / Space',
    description:
      'Commit the focused date as the selection and close the popover.',
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
      pageTitle('ui/date-picker', 'Date Picker'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'An accessible date picker that wraps ',
        inlineCode('Calendar'),
        ' in a ',
        inlineCode('Popover'),
        '. Consumers provide the trigger button face and the calendar grid layout — DatePicker handles focus choreography (opening focuses the grid, closing returns focus to the trigger), open/close state, and an optional hidden form input for native form submission.',
      ),
      para(
        'DatePicker uses the Submodel pattern — initialize with ',
        inlineCode('DatePicker.init()'),
        ', store the Model in your parent, delegate Messages via ',
        inlineCode('DatePicker.update()'),
        ', and render with ',
        inlineCode('DatePicker.view()'),
        '. The update function returns ',
        inlineCode('[Model, Commands, Option<OutMessage>]'),
        ' — the OutMessage fires when the user commits a date or clears the selection. For programmatic control in update functions, use ',
        inlineCode('DatePicker.open(model)'),
        ' and ',
        inlineCode('DatePicker.close(model)'),
        ' which return ',
        inlineCode('[Model, Commands]'),
        ' directly.',
      ),
      infoCallout(
        'See it in an app',
        'Check out how DatePicker is wired up in a ',
        link(uiShowcaseViewSourceHref('datePicker'), 'real Foldkit app'),
        '.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      para(
        'A date picker constrained to the next three months via ',
        inlineCode('maybeMinDate'),
        ' and ',
        inlineCode('maybeMaxDate'),
        '. Click the trigger to open, pick a date or navigate with arrow keys, then press Enter to commit or Escape to dismiss.',
      ),
      demoContainer(...DatePicker.basicDemo(model, toParentMessage)),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiDatePickerBasicHighlighted)],
          [],
        ),
        Snippet.uiDatePickerBasicRaw,
        'Copy date picker example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'DatePicker is headless. You control the trigger button via ',
        inlineCode('triggerContent'),
        ' and ',
        inlineCode('triggerClassName'),
        ', the popover panel via ',
        inlineCode('panelClassName'),
        ', and the calendar grid via the ',
        inlineCode('toCalendarView'),
        ' callback. Data attributes on day cells let you style state variants with CSS selectors like ',
        inlineCode('group-data-[selected]:'),
        ' and ',
        inlineCode('group-data-[disabled]:'),
        '.',
      ),
      dataAttributeTable(dataAttributes),
      heading(
        keyboardInteractionHeader.level,
        keyboardInteractionHeader.id,
        keyboardInteractionHeader.text,
      ),
      para(
        'The trigger button opens the popover on Enter, Space, or ArrowDown. Inside the popover, the calendar grid handles the full WAI-ARIA grid keyboard pattern. Escape closes the popover from both the trigger and the grid.',
      ),
      keyboardTable(keyboardEntries),
      heading(
        accessibilityHeader.level,
        accessibilityHeader.id,
        accessibilityHeader.text,
      ),
      para(
        'The trigger button uses ',
        inlineCode('aria-expanded'),
        ' and ',
        inlineCode('aria-controls'),
        ' to announce the popover relationship. Inside the popover, the calendar grid renders with the full WAI-ARIA grid pattern: ',
        inlineCode('role="grid"'),
        ' with ',
        inlineCode('aria-activedescendant'),
        ' for cursor tracking, ',
        inlineCode('role="row"'),
        ' and ',
        inlineCode('role="gridcell"'),
        ' with ',
        inlineCode('aria-selected'),
        ' on the chosen date. Day buttons carry full accessible names via ',
        inlineCode('aria-label'),
        ' and disabled days get ',
        inlineCode('aria-disabled="true"'),
        '. When a hidden form input is enabled via the ',
        inlineCode('name'),
        ' prop, the selected date is encoded as an ISO string (',
        inlineCode('YYYY-MM-DD'),
        ') for native form submission.',
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
        inlineCode('DatePicker.init()'),
        '. Calendar constraints (min/max, disabled dates) are forwarded to the embedded Calendar submodel.',
      ),
      propTable(initConfigProps),
      heading(
        viewConfigHeader.level,
        viewConfigHeader.id,
        viewConfigHeader.text,
      ),
      para(
        'Configuration object passed to ',
        inlineCode('DatePicker.view()'),
        '.',
      ),
      propTable(viewConfigProps),
      heading(
        outMessagesHeader.level,
        outMessagesHeader.id,
        outMessagesHeader.text,
      ),
      para(
        'Messages emitted to the parent through the third element of ',
        inlineCode('[Model, Commands, Option<OutMessage>]'),
        '. Pattern-match on the OutMessage in your update handler.',
      ),
      propTable(outMessagesProps),
      heading(
        programmaticHelpersHeader.level,
        programmaticHelpersHeader.id,
        programmaticHelpersHeader.text,
      ),
      para(
        'Helpers you call from your own update handlers to drive the date picker imperatively — for writing back the selection in controlled mode, opening/closing on domain events, or updating constraints when they derive from other Model state.',
      ),
      para(
        'The four ',
        inlineCode('set*'),
        ' helpers are how you implement cross-field date validation. Constraints are set at init time and updated via these helpers — they do not live on ViewConfig, because the update function needs them for keyboard-navigation disabled-skipping and commit-time validation. For an end date that must be on or after a start date, call ',
        inlineCode('setMinDate(endDate, startDate.maybeSelectedDate)'),
        ' in the handler that processes the start date change.',
      ),
      propTable(programmaticHelpersProps),
    ],
  )
