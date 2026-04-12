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
import type { Message } from './message'
import type { Model } from './model'
import * as Tabs from './tabs'

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

const tabConfigHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'tab-config',
  text: 'TabConfig',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  examplesHeader,
  Tabs.horizontalHeader,
  Tabs.verticalHeader,
  stylingHeader,
  keyboardInteractionHeader,
  accessibilityHeader,
  apiReferenceHeader,
  initConfigHeader,
  viewConfigHeader,
  tabConfigHeader,
]

// SECTION DATA

const initConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description: 'Unique ID for the tabs instance.',
  },
  {
    name: 'activeIndex',
    type: 'number',
    default: '0',
    description: 'Initially active tab index.',
  },
  {
    name: 'activationMode',
    type: "'Automatic' | 'Manual'",
    default: "'Automatic'",
    description:
      'In Automatic mode, arrow keys select tabs on focus. In Manual mode, arrow keys focus only — Enter or Space is required to select.',
  },
]

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'model',
    type: 'Tabs.Model',
    description: 'The tabs state from your parent Model.',
  },
  {
    name: 'toParentMessage',
    type: '(message: Message) => Message',
    description: 'Wraps Tabs Messages in your parent Message type.',
  },
  {
    name: 'tabs',
    type: 'ReadonlyArray<Tab>',
    description:
      'The list of tabs. The generic Tab type narrows the value passed to tabToConfig.',
  },
  {
    name: 'tabToConfig',
    type: '(tab, context) => TabConfig',
    description:
      'Maps each tab to its button content and panel content. The context provides isActive.',
  },
  {
    name: 'tabListAriaLabel',
    type: 'string',
    description: 'Accessible label for the tab list.',
  },
  {
    name: 'orientation',
    type: "'Horizontal' | 'Vertical'",
    default: "'Horizontal'",
    description:
      'Controls arrow key direction and aria-orientation. Horizontal uses left/right, vertical uses up/down.',
  },
  {
    name: 'isTabDisabled',
    type: '(tab, index) => boolean',
    description: 'Disables individual tabs.',
  },
  {
    name: 'persistPanels',
    type: 'boolean',
    default: 'false',
    description:
      'When true, renders all panels with the hidden attribute on inactive ones instead of removing them from the DOM.',
  },
  {
    name: 'onTabSelected',
    type: '(index: number) => Message',
    description:
      'Alternative to Submodel delegation — fires your own Message on tab selection. Use with Tabs.selectTab() to update the Model.',
  },
  {
    name: 'tabListAttributes',
    type: 'ReadonlyArray<Attribute<Message>>',
    description: 'Additional attributes for the tab list container.',
  },
  {
    name: 'tabListClassName',
    type: 'string',
    description: 'CSS class for the tab list container.',
  },
  {
    name: 'attributes',
    type: 'ReadonlyArray<Attribute<Message>>',
    description: 'Additional attributes for the outer wrapper.',
  },
  {
    name: 'className',
    type: 'string',
    description: 'CSS class for the outer wrapper.',
  },
]

const tabConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'buttonContent',
    type: 'Html',
    description: 'Content rendered inside the tab button.',
  },
  {
    name: 'panelContent',
    type: 'Html',
    description: 'Content rendered inside the tab panel.',
  },
  {
    name: 'buttonClassName',
    type: 'string',
    description: 'CSS class for the tab button.',
  },
  {
    name: 'buttonAttributes',
    type: 'ReadonlyArray<Attribute<Message>>',
    description: 'Additional attributes for the tab button.',
  },
  {
    name: 'panelClassName',
    type: 'string',
    description: 'CSS class for the tab panel.',
  },
  {
    name: 'panelAttributes',
    type: 'ReadonlyArray<Attribute<Message>>',
    description: 'Additional attributes for the tab panel.',
  },
]

const dataAttributes: ReadonlyArray<DataAttributeEntry> = [
  {
    attribute: 'data-selected',
    condition: 'Present on the active tab button and its panel.',
  },
  {
    attribute: 'data-disabled',
    condition: 'Present on disabled tab buttons.',
  },
]

const keyboardEntries: ReadonlyArray<KeyboardEntry> = [
  {
    key: 'Arrow Right / Down',
    description: 'Move to the next tab. In Automatic mode, also selects it.',
  },
  {
    key: 'Arrow Left / Up',
    description:
      'Move to the previous tab. In Automatic mode, also selects it.',
  },
  {
    key: 'Home',
    description: 'Move to the first tab.',
  },
  {
    key: 'End',
    description: 'Move to the last tab.',
  },
  {
    key: 'Enter / Space',
    description:
      'Select the focused tab (Manual mode only — Automatic selects on focus).',
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
      pageTitle('ui/tabs', 'Tabs'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Tab panel navigation with roving tabindex keyboard support, horizontal and vertical orientation, and automatic or manual activation modes. Tabs renders a tab list with buttons and corresponding panels — only the active panel is visible.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      heading(
        Tabs.horizontalHeader.level,
        Tabs.horizontalHeader.id,
        Tabs.horizontalHeader.text,
      ),
      para(
        'The ',
        inlineCode('view'),
        ' function is generic over your tab type. Pass a typed ',
        inlineCode('tabs'),
        ' array and a ',
        inlineCode('tabToConfig'),
        ' callback that maps each tab to its button and panel content.',
      ),
      demoContainer(
        ...Tabs.horizontalDemo(model.horizontalTabsDemo, toParentMessage),
      ),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippet.uiTabsBasicHighlighted)], []),
        Snippet.uiTabsBasicRaw,
        'Copy tabs example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(
        Tabs.verticalHeader.level,
        Tabs.verticalHeader.id,
        Tabs.verticalHeader.text,
      ),
      para(
        'Pass ',
        inlineCode("orientation: 'Vertical'"),
        ' to switch to up/down arrow navigation.',
      ),
      demoContainer(
        ...Tabs.verticalDemo(model.verticalTabsDemo, toParentMessage),
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiTabsVerticalHighlighted)],
          [],
        ),
        Snippet.uiTabsVerticalRaw,
        'Copy vertical tabs example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'Tabs is headless — the ',
        inlineCode('tabToConfig'),
        ' callback controls all tab and panel markup. A common styling trick is to use a negative margin (',
        inlineCode('mb-[-1px]'),
        ' for horizontal, ',
        inlineCode('mr-[-1px]'),
        ' for vertical) on the active tab to overlap the panel border.',
      ),
      dataAttributeTable(dataAttributes),
      heading(
        keyboardInteractionHeader.level,
        keyboardInteractionHeader.id,
        keyboardInteractionHeader.text,
      ),
      para(
        'Tabs uses roving tabindex — only the focused tab is in the tab order. Arrow direction depends on orientation: left/right for horizontal, up/down for vertical. Disabled tabs are skipped during navigation.',
      ),
      keyboardTable(keyboardEntries),
      heading(
        accessibilityHeader.level,
        accessibilityHeader.id,
        accessibilityHeader.text,
      ),
      para(
        'The tab list receives ',
        inlineCode('role="tablist"'),
        ' with ',
        inlineCode('aria-orientation'),
        ' and ',
        inlineCode('aria-label'),
        '. Each tab button gets ',
        inlineCode('role="tab"'),
        ' with ',
        inlineCode('aria-selected'),
        ' and ',
        inlineCode('aria-controls'),
        ' linking to its panel. Panels receive ',
        inlineCode('role="tabpanel"'),
        ' with ',
        inlineCode('aria-labelledby'),
        ' pointing back to the tab.',
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
      para('Configuration object passed to ', inlineCode('Tabs.init()'), '.'),
      propTable(initConfigProps),
      heading(
        viewConfigHeader.level,
        viewConfigHeader.id,
        viewConfigHeader.text,
      ),
      para('Configuration object passed to ', inlineCode('Tabs.view()'), '.'),
      propTable(viewConfigProps),
      heading(tabConfigHeader.level, tabConfigHeader.id, tabConfigHeader.text),
      para(
        'Object returned by the ',
        inlineCode('tabToConfig'),
        ' callback for each tab.',
      ),
      propTable(tabConfigProps),
    ],
  )
