import { Array } from 'effect'
import type { Html } from 'foldkit/html'

import {
  Class,
  Href,
  a,
  div,
  table,
  tbody,
  td,
  th,
  thead,
  tr,
} from '../../html'
import type { TableOfContentsEntry } from '../../main'
import { heading, link, pageTitle, para } from '../../prose'
import {
  exampleDetailRouter,
  patternsSubmodelsRouter,
  uiButtonRouter,
  uiCheckboxRouter,
  uiComboboxRouter,
  uiDialogRouter,
  uiDisclosureRouter,
  uiDragAndDropRouter,
  uiFieldsetRouter,
  uiInputRouter,
  uiListboxRouter,
  uiMenuRouter,
  uiPopoverRouter,
  uiRadioGroupRouter,
  uiSelectRouter,
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
  componentsHeader,
  showcaseHeader,
]

// COMPONENT TABLE

type ComponentEntry = Readonly<{
  name: string
  href: string
  category: string
  description: string
}>

const components: ReadonlyArray<ComponentEntry> = [
  {
    name: 'Button',
    href: uiButtonRouter(),
    category: 'Forms',
    description:
      'Accessible button with consistent ARIA attributes and data-attribute hooks for styling.',
  },
  {
    name: 'Input',
    href: uiInputRouter(),
    category: 'Forms',
    description:
      'Text input with ARIA label/description linking and data-attribute hooks.',
  },
  {
    name: 'Textarea',
    href: uiTextareaRouter(),
    category: 'Forms',
    description:
      'Multi-line text input with ARIA label/description linking and data-attribute hooks.',
  },
  {
    name: 'Checkbox',
    href: uiCheckboxRouter(),
    category: 'Forms',
    description:
      'Toggle with accessible labeling, keyboard support, indeterminate state, and optional form integration.',
  },
  {
    name: 'Fieldset',
    href: uiFieldsetRouter(),
    category: 'Forms',
    description:
      'Groups related form controls with a legend and description. Disabled state propagates to all children.',
  },
  {
    name: 'Radio Group',
    href: uiRadioGroupRouter(),
    category: 'Forms',
    description:
      'Radio options with roving tabindex, keyboard navigation, and per-option label/description linking.',
  },
  {
    name: 'Switch',
    href: uiSwitchRouter(),
    category: 'Forms',
    description:
      'On/off toggle with accessible labeling, keyboard support, and optional form integration.',
  },
  {
    name: 'Select',
    href: uiSelectRouter(),
    category: 'Forms',
    description:
      'Native select wrapper with ARIA label/description linking and data-attribute hooks.',
  },
  {
    name: 'Listbox',
    href: uiListboxRouter(),
    category: 'Selection',
    description:
      'Custom select dropdown with persistent selection, keyboard navigation, and typeahead search.',
  },
  {
    name: 'Combobox',
    href: uiComboboxRouter(),
    category: 'Selection',
    description:
      'Autocomplete input with filtering, keyboard navigation, and custom rendering.',
  },
  {
    name: 'Dialog',
    href: uiDialogRouter(),
    category: 'Overlays',
    description:
      'Modal dialog using native <dialog> with focus trapping, backdrop, and scroll locking.',
  },
  {
    name: 'Menu',
    href: uiMenuRouter(),
    category: 'Overlays',
    description:
      'Dropdown menu with keyboard navigation, typeahead search, and aria-activedescendant focus.',
  },
  {
    name: 'Popover',
    href: uiPopoverRouter(),
    category: 'Overlays',
    description:
      'Floating panel with arbitrary content and natural Tab navigation.',
  },
  {
    name: 'Disclosure',
    href: uiDisclosureRouter(),
    category: 'Disclosure',
    description:
      'Show/hide toggle for building collapsible sections like FAQs and accordions.',
  },
  {
    name: 'Tabs',
    href: uiTabsRouter(),
    category: 'Disclosure',
    description:
      'Tabbed interface with keyboard navigation, Home/End support, and wrapping.',
  },
  {
    name: 'Drag and Drop',
    href: uiDragAndDropRouter(),
    category: 'Interaction',
    description:
      'Sortable lists and cross-container movement with pointer tracking, keyboard navigation, auto-scrolling, and screen reader announcements.',
  },
]

const componentNameClassName =
  'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 font-medium'

const componentRow = (entry: ComponentEntry): Html =>
  tr(
    [Class('border-b border-gray-200 dark:border-gray-700/50')],
    [
      td(
        [Class('py-2.5 pr-4 whitespace-nowrap align-top')],
        [a([Href(entry.href), Class(componentNameClassName)], [entry.name])],
      ),
      td(
        [Class('py-2.5 text-gray-600 dark:text-gray-400')],
        [entry.description],
      ),
    ],
  )

const headerCellClassName =
  'py-2 pr-4 text-left font-medium text-gray-900 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700/50'

const componentTable: Html = div(
  [Class('mb-8')],
  [
    table(
      [Class('w-full text-sm')],
      [
        thead(
          [],
          [
            tr(
              [],
              [
                th([Class(headerCellClassName)], ['Component']),
                th([Class(headerCellClassName)], ['Description']),
              ],
            ),
          ],
        ),
        tbody([], Array.map(components, componentRow)),
      ],
    ),
  ],
)

// VIEW

export const view = (): Html =>
  div(
    [],
    [
      pageTitle('ui/overview', 'Foldkit UI'),
      heading(
        whatIsFoldkitUiHeader.level,
        whatIsFoldkitUiHeader.id,
        whatIsFoldkitUiHeader.text,
      ),
      para(
        'Foldkit UI is a set of headless, accessible UI components built for Foldkit. Each component manages its own state through The Elm Architecture (with a Model, Message, update, and view) and integrates into your app via the ',
        link(patternsSubmodelsRouter(), 'Submodels'),
        ' pattern.',
      ),
      para(
        'Components are renderless. You provide the markup and styling through a toView callback, and Foldkit UI provides the accessibility attributes, keyboard navigation, and state management. This means full control over how your UI looks while getting correct ARIA roles, focus management, and keyboard interaction for free.',
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
        ' example demonstrates every component with styled, interactive examples. It\u2019s a good reference for how to wire up component state, handle Messages, and compose views.',
      ),
    ],
  )
