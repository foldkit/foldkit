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
import * as Menu from './menu'
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

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  examplesHeader,
  Menu.basicHeader,
  Menu.animatedHeader,
  stylingHeader,
  keyboardInteractionHeader,
  accessibilityHeader,
  apiReferenceHeader,
  initConfigHeader,
  viewConfigHeader,
]

// SECTION DATA

const initConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description: 'Unique ID for the menu instance.',
  },
  {
    name: 'isAnimated',
    type: 'boolean',
    default: 'false',
    description: 'Enables CSS transition coordination.',
  },
  {
    name: 'isModal',
    type: 'boolean',
    default: 'false',
    description: 'Locks page scroll and marks other elements inert when open.',
  },
]

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'model',
    type: 'Menu.Model',
    description: 'The menu state from your parent Model.',
  },
  {
    name: 'toParentMessage',
    type: '(message: Message) => Message',
    description: 'Wraps Menu Messages in your parent Message type.',
  },
  {
    name: 'items',
    type: 'ReadonlyArray<Item>',
    description: 'The list of menu items.',
  },
  {
    name: 'itemToConfig',
    type: '(item, context) => ItemConfig',
    description:
      'Maps each item to its className and content. The context provides isActive and isDisabled.',
  },
  {
    name: 'onSelectedItem',
    type: '(value: string) => Message',
    description:
      'Fires your Message when an item is selected. Since Menu is fire-and-forget, this is the primary way to handle selection.',
  },
  {
    name: 'buttonContent',
    type: 'Html',
    description: 'Content rendered inside the trigger button.',
  },
  {
    name: 'isItemDisabled',
    type: '(item, index) => boolean',
    description: 'Disables individual menu items.',
  },
  {
    name: 'itemGroupKey',
    type: '(item, index) => string',
    description: 'Groups contiguous items by key.',
  },
  {
    name: 'groupToHeading',
    type: '(groupKey) => GroupHeading | undefined',
    description: 'Renders a heading for each group.',
  },
  {
    name: 'anchor',
    type: 'AnchorConfig',
    description: 'Floating positioning config: placement, gap, and padding.',
  },
  {
    name: 'buttonClassName',
    type: 'string',
    description: 'CSS class for the trigger button.',
  },
  {
    name: 'itemsClassName',
    type: 'string',
    description: 'CSS class for the items container.',
  },
  {
    name: 'backdropClassName',
    type: 'string',
    description: 'CSS class for the backdrop.',
  },
]

const dataAttributes: ReadonlyArray<DataAttributeEntry> = [
  {
    attribute: 'data-open',
    condition: 'Present on the button when the menu is open.',
  },
  {
    attribute: 'data-active',
    condition: 'Present on the highlighted menu item.',
  },
  { attribute: 'data-disabled', condition: 'Present on disabled menu items.' },
  { attribute: 'data-closed', condition: 'Present during close animation.' },
]

const keyboardEntries: ReadonlyArray<KeyboardEntry> = [
  {
    key: 'Enter / Space',
    description: 'Opens the menu (from button) or selects the active item.',
  },
  {
    key: 'Arrow Down',
    description:
      'Opens with first item active (from button) or moves to next item.',
  },
  {
    key: 'Arrow Up',
    description:
      'Opens with last item active (from button) or moves to previous item.',
  },
  { key: 'Home / End', description: 'Moves to the first / last item.' },
  {
    key: 'Escape',
    description: 'Closes the menu and returns focus to the button.',
  },
  {
    key: 'Type a character',
    description: 'Typeahead search — jumps to the matching item.',
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
      pageTitle('ui/menu', 'Menu'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A dropdown menu for actions — like a macOS context menu. Menu is fire-and-forget: it doesn\u2019t track a selected value (use Listbox for persistent selection). It supports typeahead search, drag-to-select, keyboard navigation, grouped items, and anchor positioning.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      heading(
        Menu.basicHeader.level,
        Menu.basicHeader.id,
        Menu.basicHeader.text,
      ),
      para(
        'Use ',
        inlineCode('onSelectedItem'),
        ' to handle menu item selection. Menu closes automatically after selection.',
      ),
      demoContainer(...Menu.basicDemo(model.menuBasicDemo, toParentMessage)),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippet.uiMenuBasicHighlighted)], []),
        Snippet.uiMenuBasicRaw,
        'Copy menu example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(
        Menu.animatedHeader.level,
        Menu.animatedHeader.id,
        Menu.animatedHeader.text,
      ),
      para(
        'Pass ',
        inlineCode('isAnimated: true'),
        ' at init for CSS transition coordination.',
      ),
      demoContainer(
        ...Menu.animatedDemo(model.menuAnimatedDemo, toParentMessage),
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiMenuAnimatedHighlighted)],
          [],
        ),
        Snippet.uiMenuAnimatedRaw,
        'Copy animated menu example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'Menu is headless — the ',
        inlineCode('itemToConfig'),
        ' callback controls all item markup. Group items with ',
        inlineCode('itemGroupKey'),
        ' and ',
        inlineCode('groupToHeading'),
        '.',
      ),
      dataAttributeTable(dataAttributes),
      heading(
        keyboardInteractionHeader.level,
        keyboardInteractionHeader.id,
        keyboardInteractionHeader.text,
      ),
      para(
        'Menu uses ',
        inlineCode('aria-activedescendant'),
        ' — focus stays on the items container while arrow keys update the highlighted item. Typeahead search accumulates characters for 350ms.',
      ),
      keyboardTable(keyboardEntries),
      heading(
        accessibilityHeader.level,
        accessibilityHeader.id,
        accessibilityHeader.text,
      ),
      para(
        'The button receives ',
        inlineCode('aria-haspopup="menu"'),
        ' and ',
        inlineCode('aria-expanded'),
        '. The items container receives ',
        inlineCode('role="menu"'),
        ' with ',
        inlineCode('aria-activedescendant'),
        '. Each item receives ',
        inlineCode('role="menuitem"'),
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
      para('Configuration object passed to ', inlineCode('Menu.init()'), '.'),
      propTable(initConfigProps),
      heading(
        viewConfigHeader.level,
        viewConfigHeader.id,
        viewConfigHeader.text,
      ),
      para('Configuration object passed to ', inlineCode('Menu.view()'), '.'),
      propTable(viewConfigProps),
    ],
  )
