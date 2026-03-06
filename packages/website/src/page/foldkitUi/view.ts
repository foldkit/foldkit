import { Ui } from 'foldkit'
import { createLazy } from 'foldkit/html'
import type { Html } from 'foldkit/html'

import { Class, div, p, section, span } from '../../html'
import type { TableOfContentsEntry } from '../../main'
import type { Message as ParentMessage } from '../../main'
import { heading, pageTitle, para } from '../../prose'
import * as Combobox from './combobox'
import * as Dialog from './dialog'
import * as Disclosure from './disclosure'
import * as Listbox from './listbox'
import * as Menu from './menu'
import type { Message } from './message'
import type { Model } from './model'
import * as Popover from './popover'
import * as Switch from './switch'
import * as Tabs from './tabs'

// TABLE OF CONTENTS

const plannedComponents: ReadonlyArray<{
  readonly entry: TableOfContentsEntry
  readonly description: string
}> = [
  {
    entry: { level: 'h2', id: 'button', text: 'Button' },
    description:
      'An accessible button with loading state, disabled styling, and keyboard support.',
  },
  {
    entry: { level: 'h2', id: 'checkbox', text: 'Checkbox' },
    description:
      'A custom checkbox with accessible labeling, indeterminate state, and keyboard support.',
  },
  {
    entry: { level: 'h2', id: 'fieldset', text: 'Fieldset' },
    description:
      'A group of related form controls with a legend, supporting disabled state propagation to all children.',
  },
  {
    entry: { level: 'h2', id: 'input', text: 'Input' },
    description:
      'An accessible text input with description and error message associations via ARIA attributes.',
  },
  {
    entry: { level: 'h2', id: 'radio-group', text: 'Radio Group' },
    description:
      'A set of radio buttons with keyboard navigation and custom styling.',
  },
  {
    entry: { level: 'h2', id: 'select', text: 'Select' },
    description:
      'An accessible native select wrapper with labeling and description support.',
  },
  {
    entry: { level: 'h2', id: 'textarea', text: 'Textarea' },
    description:
      'An accessible textarea with description and error message associations via ARIA attributes.',
  },
  {
    entry: { level: 'h2', id: 'transition', text: 'Transition' },
    description:
      'A component for coordinating enter and leave CSS transitions with mount and unmount lifecycle.',
  },
]

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  Tabs.tabsHeader,
  Tabs.horizontalHeader,
  Tabs.verticalHeader,
  Disclosure.disclosureHeader,
  Dialog.dialogHeader,
  Menu.menuHeader,
  Menu.basicHeader,
  Menu.animatedHeader,
  Popover.popoverHeader,
  Popover.basicHeader,
  Popover.animatedHeader,
  Listbox.listboxHeader,
  Listbox.basicHeader,
  Listbox.multiSelectHeader,
  Listbox.groupedHeader,
  Switch.switchHeader,
  Combobox.comboboxHeader,
  ...plannedComponents.map(({ entry }) => entry),
]

// LAZY

const lazyTabsSection = createLazy()
const lazyDisclosureSection = createLazy()
const lazyDialogSection = createLazy()
const lazyMenuSection = createLazy()
const lazyPopoverSection = createLazy()
const lazyListboxSection = createLazy()
const lazySwitchSection = createLazy()
const lazyComboboxSection = createLazy()

// VIEW

const comingSoonBadge = span(
  [
    Class(
      'inline-block px-2.5 py-0.5 text-xs font-normal rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
    ),
  ],
  ['Coming Soon'],
)

const comingSoonSection = (
  entry: TableOfContentsEntry,
  description: string,
) =>
  section(
    [Class('mt-8')],
    [
      heading('h2', entry.id, entry.text),
      div([Class('-mt-2 mb-3')], [comingSoonBadge]),
      p([Class('text-gray-600 dark:text-gray-400')], [description]),
    ],
  )

const tabsSectionView = (
  horizontalTabsDemo: Ui.Tabs.Model,
  verticalTabsDemo: Ui.Tabs.Model,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      heading('h2', Tabs.tabsHeader.id, Tabs.tabsHeader.text),
      para(
        'A fully accessible tabs component with keyboard navigation. Renders a tablist with tab buttons and a tabpanel. Supports Home/End to jump, with wrapping.',
      ),
      ...Tabs.horizontalDemo(horizontalTabsDemo, toMessage),
      ...Tabs.verticalDemo(verticalTabsDemo, toMessage),
    ],
  )

const disclosureSectionView = (
  disclosureDemo: Ui.Disclosure.Model,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      heading(
        'h2',
        Disclosure.disclosureHeader.id,
        Disclosure.disclosureHeader.text,
      ),
      para(
        'A simple, accessible foundation for building custom UIs that show and hide content, like toggleable FAQ sections.',
      ),
      ...Disclosure.disclosureDemo(disclosureDemo, toMessage),
    ],
  )

const dialogSectionView = (
  dialogDemo: Ui.Dialog.Model,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      heading('h2', Dialog.dialogHeader.id, Dialog.dialogHeader.text),
      para(
        'A modal dialog backed by the native <dialog> element. Uses showModal() for focus trapping, backdrop rendering, and scroll locking — no JavaScript focus trap needed.',
      ),
      ...Dialog.dialogDemo(dialogDemo, toMessage),
    ],
  )

const menuSectionView = (
  menuBasicDemo: Ui.Menu.Model,
  menuAnimatedDemo: Ui.Menu.Model,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      heading('h2', Menu.menuHeader.id, Menu.menuHeader.text),
      para(
        'A dropdown menu with keyboard navigation, typeahead search, and proper ARIA attributes. Uses aria-activedescendant for focus management — focus stays on the menu container while items are highlighted by reference.',
      ),
      ...Menu.basicDemo(menuBasicDemo, toMessage),
      ...Menu.animatedDemo(menuAnimatedDemo, toMessage),
    ],
  )

const popoverSectionView = (
  popoverBasicDemo: Ui.Popover.Model,
  popoverAnimatedDemo: Ui.Popover.Model,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      heading(
        'h2',
        Popover.popoverHeader.id,
        Popover.popoverHeader.text,
      ),
      para(
        'A floating panel that attaches to a trigger button with proper focus management. Unlike Menu (which has role="menu" and item navigation), Popover uses the disclosure pattern — the panel holds arbitrary content with natural Tab navigation.',
      ),
      ...Popover.basicDemo(popoverBasicDemo, toMessage),
      ...Popover.animatedDemo(popoverAnimatedDemo, toMessage),
    ],
  )

const listboxSectionView = (
  listboxDemo: Ui.Listbox.Model,
  listboxMultiDemo: Ui.Listbox.Multi.Model,
  listboxGroupedDemo: Ui.Listbox.Model,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      heading(
        'h2',
        Listbox.listboxHeader.id,
        Listbox.listboxHeader.text,
      ),
      para(
        'A custom select dropdown with persistent selection, keyboard navigation, and typeahead search. Unlike Menu (which is fire-and-forget), Listbox tracks the selected value and reflects it in the button.',
      ),
      ...Listbox.basicDemo(listboxDemo, toMessage),
      ...Listbox.multiSelectDemo(listboxMultiDemo, toMessage),
      ...Listbox.groupedDemo(listboxGroupedDemo, toMessage),
    ],
  )

const switchSectionView = (
  switchDemo: Ui.Switch.Model,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      heading('h2', Switch.switchHeader.id, Switch.switchHeader.text),
      para(
        'A toggle switch for on/off states with accessible labeling, keyboard support, and optional form integration via a hidden input.',
      ),
      ...Switch.switchDemo(switchDemo, toMessage),
    ],
  )

const comboboxSectionView = (
  comboboxDemo: Ui.Combobox.Model,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      heading(
        'h2',
        Combobox.comboboxHeader.id,
        Combobox.comboboxHeader.text,
      ),
      para(
        'An autocomplete input with filtering, keyboard navigation, and custom rendering. Uses aria-activedescendant for focus management and supports grouped items.',
      ),
      ...Combobox.comboboxDemo(comboboxDemo, toMessage),
    ],
  )

export const view = (
  model: Model,
  toMessage: (message: Message) => ParentMessage,
) =>
  div(
    [],
    [
      pageTitle('foldkit-ui', 'Foldkit UI'),
      para(
        'Accessible, unstyled UI components. Each component provides Model, Message, init, update, and view: composable building blocks with zero extra dependencies.',
      ),
      lazyTabsSection(tabsSectionView, [
        model.horizontalTabsDemo,
        model.verticalTabsDemo,
        toMessage,
      ]),
      lazyDisclosureSection(disclosureSectionView, [
        model.disclosureDemo,
        toMessage,
      ]),
      lazyDialogSection(dialogSectionView, [
        model.dialogDemo,
        toMessage,
      ]),
      lazyMenuSection(menuSectionView, [
        model.menuBasicDemo,
        model.menuAnimatedDemo,
        toMessage,
      ]),
      lazyPopoverSection(popoverSectionView, [
        model.popoverBasicDemo,
        model.popoverAnimatedDemo,
        toMessage,
      ]),
      lazyListboxSection(listboxSectionView, [
        model.listboxDemo,
        model.listboxMultiDemo,
        model.listboxGroupedDemo,
        toMessage,
      ]),
      lazySwitchSection(switchSectionView, [
        model.switchDemo,
        toMessage,
      ]),
      lazyComboboxSection(comboboxSectionView, [
        model.comboboxDemo,
        toMessage,
      ]),
      div(
        [Class('mt-12')],
        plannedComponents.map(({ entry, description }) =>
          comingSoonSection(entry, description),
        ),
      ),
    ],
  )
