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
import * as Combobox from './combobox'
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
  Combobox.singleSelectHeader,
  Combobox.nullableHeader,
  Combobox.selectOnFocusHeader,
  Combobox.multiHeader,
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
    description: 'Unique ID for the combobox instance.',
  },
  {
    name: 'selectedItem',
    type: 'string',
    description: 'Initially selected item value (single-select only).',
  },
  {
    name: 'selectedDisplayText',
    type: 'string',
    description: 'Initial display text in the input (single-select only).',
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
  {
    name: 'nullable',
    type: 'boolean',
    default: 'false',
    description:
      'Allows clearing the selection by clicking the selected item again.',
  },
  {
    name: 'selectInputOnFocus',
    type: 'boolean',
    default: 'false',
    description:
      'Highlights the input text when the combobox receives focus, so typing replaces the current value.',
  },
]

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'model',
    type: 'Combobox.Model',
    description: 'The combobox state from your parent Model.',
  },
  {
    name: 'toParentMessage',
    type: '(childMessage: Combobox.Message) => ParentMessage',
    description:
      'Wraps Combobox Messages in your parent Message type for Submodel delegation.',
  },
  {
    name: 'onSelectedItem',
    type: '(value: string) => ParentMessage',
    description:
      'Alternative to Submodel delegation — fires your own Message on selection. Use with Combobox.selectItem() in your update handler to reflect the selection in the combobox state.',
  },
  {
    name: 'items',
    type: 'ReadonlyArray<Item>',
    description:
      'The filtered list of items to display. You control the filtering logic based on model.inputValue.',
  },
  {
    name: 'itemToConfig',
    type: '(item, context) => ItemConfig',
    description:
      'Maps each item to its className and content. The context provides isActive, isSelected, and isDisabled.',
  },
  {
    name: 'itemToValue',
    type: '(item: Item) => string',
    description: 'Extracts the string value from an item.',
  },
  {
    name: 'itemToDisplayText',
    type: '(item: Item) => string',
    description: 'Text shown in the input when an item is selected.',
  },
  {
    name: 'inputAttributes',
    type: 'ReadonlyArray<Attribute<Message>>',
    description: 'Additional attributes for the text input.',
  },
  {
    name: 'itemsAttributes',
    type: 'ReadonlyArray<Attribute<Message>>',
    description: 'Additional attributes for the dropdown items container.',
  },
  {
    name: 'backdropAttributes',
    type: 'ReadonlyArray<Attribute<Message>>',
    description: 'Additional attributes for the backdrop overlay.',
  },
  {
    name: 'buttonContent',
    type: 'Html',
    description:
      'Content for the dropdown toggle button (typically a chevron icon).',
  },
  {
    name: 'buttonAttributes',
    type: 'ReadonlyArray<Attribute<Message>>',
    description: 'Additional attributes for the toggle button.',
  },
  {
    name: 'anchor',
    type: 'AnchorConfig',
    description: 'Floating positioning config: placement, gap, and padding.',
  },
]

const dataAttributes: ReadonlyArray<DataAttributeEntry> = [
  {
    attribute: 'data-active',
    condition:
      'Present on the item currently highlighted by keyboard or pointer.',
  },
  {
    attribute: 'data-selected',
    condition: 'Present on the selected item(s).',
  },
  {
    attribute: 'data-disabled',
    condition: 'Present on disabled items.',
  },
  {
    attribute: 'data-closed',
    condition: 'Present during close animation when isAnimated is true.',
  },
]

const keyboardEntries: ReadonlyArray<KeyboardEntry> = [
  {
    key: 'Arrow Down',
    description: 'Opens the dropdown or moves to the next item.',
  },
  {
    key: 'Arrow Up',
    description: 'Moves to the previous item.',
  },
  {
    key: 'Enter',
    description: 'Selects the active item.',
  },
  {
    key: 'Escape',
    description: 'Closes the dropdown.',
  },
  {
    key: 'Type a character',
    description:
      'Filters the items list. You control filtering in your view by passing filtered items.',
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
      pageTitle('ui/combobox', 'Combobox'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A searchable select with input filtering, keyboard navigation, and anchor positioning. Unlike Listbox (which uses a button trigger), Combobox has a text input for searching. You control the filtering logic — read ',
        inlineCode('model.inputValue'),
        ' and pass the filtered items array.',
      ),
      para(
        'For programmatic control in update functions, use ',
        inlineCode('Combobox.open(model)'),
        ', ',
        inlineCode('Combobox.close(model)'),
        ', and ',
        inlineCode('Combobox.selectItem(model, item, displayText)'),
        '. Each returns ',
        inlineCode('[Model, Commands]'),
        ' directly.',
      ),
      infoCallout(
        'See it in an app',
        'Check out how Combobox is wired up in a ',
        link(uiShowcaseViewSourceHref('combobox'), 'real Foldkit app'),
        '.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      heading(
        Combobox.singleSelectHeader.level,
        Combobox.singleSelectHeader.id,
        Combobox.singleSelectHeader.text,
      ),
      para(
        'Pass ',
        inlineCode('itemToValue'),
        ' and ',
        inlineCode('itemToDisplayText'),
        ' to control how items map to values and what text appears in the input on selection. Filter the ',
        inlineCode('items'),
        ' array yourself based on ',
        inlineCode('model.inputValue'),
        '.',
      ),
      demoContainer(
        ...Combobox.comboboxDemo(model.comboboxDemo, toParentMessage),
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiComboboxBasicHighlighted)],
          [],
        ),
        Snippet.uiComboboxBasicRaw,
        'Copy combobox example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(
        Combobox.nullableHeader.level,
        Combobox.nullableHeader.id,
        Combobox.nullableHeader.text,
      ),
      para(
        'Pass ',
        inlineCode('nullable: true'),
        ' at init to allow clearing the selection by clicking the selected item again.',
      ),
      demoContainer(
        ...Combobox.nullableDemo(model.comboboxNullableDemo, toParentMessage),
      ),
      heading(
        Combobox.selectOnFocusHeader.level,
        Combobox.selectOnFocusHeader.id,
        Combobox.selectOnFocusHeader.text,
      ),
      para(
        'Pass ',
        inlineCode('selectInputOnFocus: true'),
        ' at init to highlight the input text when the combobox receives focus. Typing immediately replaces the current value, making it easy to start a new search.',
      ),
      demoContainer(
        ...Combobox.selectOnFocusDemo(
          model.comboboxSelectOnFocusDemo,
          toParentMessage,
        ),
      ),
      heading(
        Combobox.multiHeader.level,
        Combobox.multiHeader.id,
        Combobox.multiHeader.text,
      ),
      para(
        'Use ',
        inlineCode('Combobox.Multi'),
        ' for multi-selection. The dropdown stays open on selection and items toggle on/off. Selected items are stored in ',
        inlineCode('model.selectedItems'),
        '.',
      ),
      demoContainer(
        ...Combobox.multiDemo(model.comboboxMultiDemo, toParentMessage),
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiComboboxMultiHighlighted)],
          [],
        ),
        Snippet.uiComboboxMultiRaw,
        'Copy multi-select combobox example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'Combobox is headless — the ',
        inlineCode('itemToConfig'),
        ' callback controls all item markup. Style the input, button, items container, and backdrop through their respective attribute props.',
      ),
      dataAttributeTable(dataAttributes),
      heading(
        keyboardInteractionHeader.level,
        keyboardInteractionHeader.id,
        keyboardInteractionHeader.text,
      ),
      para(
        'Focus stays on the input while arrow keys navigate items via ',
        inlineCode('aria-activedescendant'),
        '.',
      ),
      keyboardTable(keyboardEntries),
      heading(
        accessibilityHeader.level,
        accessibilityHeader.id,
        accessibilityHeader.text,
      ),
      para(
        'The input receives ',
        inlineCode('role="combobox"'),
        ' with ',
        inlineCode('aria-expanded'),
        ' and ',
        inlineCode('aria-activedescendant'),
        '. The items container receives ',
        inlineCode('role="listbox"'),
        ' and each item receives ',
        inlineCode('role="option"'),
        ' with ',
        inlineCode('aria-selected'),
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
        inlineCode('Combobox.init()'),
        ' or ',
        inlineCode('Combobox.Multi.init()'),
        '.',
      ),
      propTable(initConfigProps),
      heading(
        viewConfigHeader.level,
        viewConfigHeader.id,
        viewConfigHeader.text,
      ),
      para(
        'Configuration object passed to ',
        inlineCode('Combobox.view()'),
        '.',
      ),
      propTable(viewConfigProps),
    ],
  )
