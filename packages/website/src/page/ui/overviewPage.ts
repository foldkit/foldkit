import { Array } from 'effect'
import { Html, html } from 'foldkit/html'

import type { TableOfContentsEntry } from '../../main'
import { heading, link, pageTitle, para } from '../../prose'
import {
  coreSubmodelRouter,
  exampleDetailRouter,
  uiAnimationRouter,
  uiButtonRouter,
  uiCalendarRouter,
  uiCheckboxRouter,
  uiComboboxRouter,
  uiDatePickerRouter,
  uiDialogRouter,
  uiDisclosureRouter,
  uiDragAndDropRouter,
  uiFieldsetRouter,
  uiFileDropRouter,
  uiInputRouter,
  uiListboxRouter,
  uiMenuRouter,
  uiPopoverRouter,
  uiRadioGroupRouter,
  uiSelectRouter,
  uiSliderRouter,
  uiSwitchRouter,
  uiTabsRouter,
  uiTextareaRouter,
} from '../../route'

// TABLE OF CONTENTS

const whatIsFoldkitUiHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'what-is-foldkit-ui',
  text: 'What is Foldkit UI?',
}

const twoCategoriesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'two-categories',
  text: 'Two categories',
}

const componentsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'components',
  text: 'Components',
}

const showcaseHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'showcase',
  text: 'Showcase',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  whatIsFoldkitUiHeader,
  twoCategoriesHeader,
  componentsHeader,
  showcaseHeader,
]

// COMPONENT TABLE

type ComponentKind = 'Submodel' | 'Helper'

type ComponentEntry = Readonly<{
  name: string
  href: string
  kind: ComponentKind
  category: string
  description: string
}>

const components: ReadonlyArray<ComponentEntry> = [
  {
    name: 'Button',
    href: uiButtonRouter(),
    kind: 'Helper',
    category: 'Forms',
    description:
      'Accessible button with consistent ARIA attributes and data-attribute hooks for styling.',
  },
  {
    name: 'Input',
    href: uiInputRouter(),
    kind: 'Helper',
    category: 'Forms',
    description:
      'Text input with ARIA label/description linking and data-attribute hooks.',
  },
  {
    name: 'Textarea',
    href: uiTextareaRouter(),
    kind: 'Helper',
    category: 'Forms',
    description:
      'Multi-line text input with ARIA label/description linking and data-attribute hooks.',
  },
  {
    name: 'Checkbox',
    href: uiCheckboxRouter(),
    kind: 'Submodel',
    category: 'Forms',
    description:
      'Toggle with accessible labeling, keyboard support, indeterminate state, and optional form integration.',
  },
  {
    name: 'Fieldset',
    href: uiFieldsetRouter(),
    kind: 'Helper',
    category: 'Forms',
    description:
      'Groups related form controls with a legend and description. Disabled state propagates to all children.',
  },
  {
    name: 'Radio Group',
    href: uiRadioGroupRouter(),
    kind: 'Submodel',
    category: 'Forms',
    description:
      'Radio options with roving tabindex, keyboard navigation, and per-option label/description linking.',
  },
  {
    name: 'Switch',
    href: uiSwitchRouter(),
    kind: 'Submodel',
    category: 'Forms',
    description:
      'On/off toggle with accessible labeling, keyboard support, and optional form integration.',
  },
  {
    name: 'Slider',
    href: uiSliderRouter(),
    kind: 'Submodel',
    category: 'Forms',
    description:
      'Numeric range input with pointer drag, keyboard step / page / home / end navigation, and ARIA slider semantics.',
  },
  {
    name: 'Select',
    href: uiSelectRouter(),
    kind: 'Helper',
    category: 'Forms',
    description:
      'Native select wrapper with ARIA label/description linking and data-attribute hooks.',
  },
  {
    name: 'Listbox',
    href: uiListboxRouter(),
    kind: 'Submodel',
    category: 'Selection',
    description:
      'Custom select dropdown with persistent selection, keyboard navigation, and typeahead search.',
  },
  {
    name: 'Combobox',
    href: uiComboboxRouter(),
    kind: 'Submodel',
    category: 'Selection',
    description:
      'Autocomplete input with filtering, keyboard navigation, and custom rendering.',
  },
  {
    name: 'Dialog',
    href: uiDialogRouter(),
    kind: 'Submodel',
    category: 'Overlays',
    description:
      'Modal dialog using native <dialog> with focus trapping, backdrop, and scroll locking.',
  },
  {
    name: 'Menu',
    href: uiMenuRouter(),
    kind: 'Submodel',
    category: 'Overlays',
    description:
      'Dropdown menu with keyboard navigation, typeahead search, and aria-activedescendant focus.',
  },
  {
    name: 'Popover',
    href: uiPopoverRouter(),
    kind: 'Submodel',
    category: 'Overlays',
    description:
      'Floating panel with arbitrary content and natural Tab navigation.',
  },
  {
    name: 'Disclosure',
    href: uiDisclosureRouter(),
    kind: 'Submodel',
    category: 'Disclosure',
    description:
      'Show/hide toggle for building collapsible sections like FAQs and accordions.',
  },
  {
    name: 'Tabs',
    href: uiTabsRouter(),
    kind: 'Submodel',
    category: 'Disclosure',
    description:
      'Tabbed interface with keyboard navigation, Home/End support, and wrapping.',
  },
  {
    name: 'Drag and Drop',
    href: uiDragAndDropRouter(),
    kind: 'Submodel',
    category: 'Interaction',
    description:
      'Sortable lists and cross-container movement with pointer tracking, keyboard navigation, auto-scrolling, and screen reader announcements.',
  },
  {
    name: 'File Drop',
    href: uiFileDropRouter(),
    kind: 'Submodel',
    category: 'Interaction',
    description:
      'File input with drag-and-drop support, configurable accept patterns, and multiple-file mode. Emits typed OutMessages for received files and non-file drops.',
  },
  {
    name: 'Calendar',
    href: uiCalendarRouter(),
    kind: 'Submodel',
    category: 'Date',
    description:
      'Inline calendar grid with 2D keyboard navigation, locale-aware headers, min/max constraints, and disabled-date support. Foundation for date pickers.',
  },
  {
    name: 'Date Picker',
    href: uiDatePickerRouter(),
    kind: 'Submodel',
    category: 'Date',
    description:
      'Input paired with a popover Calendar. Inherits the calendar’s constraint and keyboard-navigation support, with programmatic open/close and setters.',
  },
  {
    name: 'Animation',
    href: uiAnimationRouter(),
    kind: 'Submodel',
    category: 'Animation',
    description:
      'Coordinates CSS enter/leave animations via a state machine and data attributes. Works with both CSS transitions and CSS keyframe animations. Sends an OutMessage when the leave animation completes.',
  },
]

const componentNameClassName =
  'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 font-medium'

const headerCellClassName =
  'py-2 pr-4 text-left font-medium text-gray-900 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700/50'

// VIEW

export const view = (): Html => {
  const h = html()

  const kindBadgeClassName = (kind: ComponentKind): string =>
    kind === 'Submodel'
      ? 'inline-block rounded px-2 py-0.5 text-xs font-medium bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300'
      : 'inline-block rounded px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'

  const componentRow = (entry: ComponentEntry): Html =>
    h.tr(
      [h.Class('border-b border-gray-200 dark:border-gray-700/50')],
      [
        h.td(
          [h.Class('py-2.5 pr-4 whitespace-nowrap align-top')],
          [
            h.a(
              [h.Href(entry.href), h.Class(componentNameClassName)],
              [entry.name],
            ),
          ],
        ),
        h.td(
          [h.Class('py-2.5 pr-4 whitespace-nowrap align-top')],
          [h.span([h.Class(kindBadgeClassName(entry.kind))], [entry.kind])],
        ),
        h.td(
          [h.Class('py-2.5 text-gray-600 dark:text-gray-400')],
          [entry.description],
        ),
      ],
    )

  const componentTable: Html = h.div(
    [h.Class('mb-8')],
    [
      h.table(
        [h.Class('w-full text-sm')],
        [
          h.thead(
            [],
            [
              h.tr(
                [],
                [
                  h.th([h.Class(headerCellClassName)], ['Component']),
                  h.th([h.Class(headerCellClassName)], ['Kind']),
                  h.th([h.Class(headerCellClassName)], ['Description']),
                ],
              ),
            ],
          ),
          h.tbody([], Array.map(components, componentRow)),
        ],
      ),
    ],
  )

  return h.div(
    [],
    [
      pageTitle('ui/overview', 'Foldkit UI'),
      heading(
        whatIsFoldkitUiHeader.level,
        whatIsFoldkitUiHeader.id,
        whatIsFoldkitUiHeader.text,
      ),
      para(
        'Foldkit UI is a set of headless, accessible UI components. Each component is renderless. You provide the markup and styling through a toView callback, and Foldkit UI provides the accessibility attributes, keyboard navigation, and (where applicable) state management.',
      ),
      heading(
        twoCategoriesHeader.level,
        twoCategoriesHeader.id,
        twoCategoriesHeader.text,
      ),
      para(
        'Foldkit UI components fall into two categories, distinguished by whether they carry state.',
      ),
      para(
        'Stateful ',
        link(coreSubmodelRouter(), 'Submodels'),
        ' (Menu, Listbox, Combobox, Calendar, Disclosure, Dialog, Popover, and most others) manage their own Model, Message, update, and OutMessage. You embed them via h.submodel and handle their events by pattern-matching the OutMessage in your update.',
      ),
      para(
        'Stateless render helpers (Button, Input, Textarea, Select, Fieldset) are called directly with a ViewConfig and return Html. They bundle ARIA and data attributes onto consumer-rendered DOM. No Model, no Message, no h.submodel wiring. The “Kind” column in the table below marks which is which.',
      ),
      heading(
        componentsHeader.level,
        componentsHeader.id,
        componentsHeader.text,
      ),
      componentTable,
      heading(showcaseHeader.level, showcaseHeader.id, showcaseHeader.text),
      para(
        'The ',
        link(
          exampleDetailRouter({ exampleSlug: 'ui-showcase' }),
          'UI Showcase',
        ),
        ' example demonstrates every component with styled, interactive examples. It’s a good reference for how to wire up component state, handle Messages, and compose views.',
      ),
    ],
  )
}
