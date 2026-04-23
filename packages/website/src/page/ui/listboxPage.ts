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
import * as Listbox from './listbox'
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
  Listbox.singleSelectHeader,
  Listbox.multiSelectHeader,
  Listbox.groupedHeader,
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
    description: 'Unique ID for the listbox instance.',
  },
  {
    name: 'selectedItem',
    type: 'string',
    description:
      'Initially selected item value (single-select). For multi-select, use selectedItems.',
  },
  {
    name: 'selectedItems',
    type: 'ReadonlyArray<string>',
    description: 'Initially selected item values (multi-select only).',
  },
  {
    name: 'isAnimated',
    type: 'boolean',
    default: 'false',
    description: 'Enables animation coordination for open/close animations.',
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
    type: 'Listbox.Model',
    description: 'The listbox state from your parent Model.',
  },
  {
    name: 'toParentMessage',
    type: '(childMessage: Listbox.Message) => ParentMessage',
    description:
      'Wraps Listbox Messages in your parent Message type for Submodel delegation.',
  },
  {
    name: 'items',
    type: 'ReadonlyArray<Item>',
    description:
      'The list of items. The generic Item type narrows the value passed to itemToConfig.',
  },
  {
    name: 'itemToConfig',
    type: '(item, context) => ItemConfig',
    description:
      'Maps each item to its className and content. The context provides isActive, isSelected, and isDisabled.',
  },
  {
    name: 'buttonContent',
    type: 'Html',
    description:
      'Content rendered inside the listbox button (typically the selected value).',
  },
  {
    name: 'onSelectedItem',
    type: '(value: string) => Message',
    description:
      'Alternative to Submodel delegation — fires your own Message on selection. Use with Listbox.selectItem() to update the Model while also handling domain logic.',
  },
  {
    name: 'itemToValue',
    type: '(item: Item) => string',
    description:
      'Extracts the string value from an item. Defaults to String(item).',
  },
  {
    name: 'isItemDisabled',
    type: '(item, index) => boolean',
    description: 'Disables individual items.',
  },
  {
    name: 'itemGroupKey',
    type: '(item, index) => string',
    description:
      'Groups contiguous items by key. Use with groupToHeading to render section headers.',
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
    name: 'name',
    type: 'string',
    description:
      'Form field name. Creates hidden input(s) with the selected value(s).',
  },
  {
    name: 'isDisabled',
    type: 'boolean',
    default: 'false',
    description: 'Disables the entire listbox.',
  },
  {
    name: 'isInvalid',
    type: 'boolean',
    default: 'false',
    description: 'Marks the listbox as invalid for validation styling.',
  },
]

const dataAttributes: ReadonlyArray<DataAttributeEntry> = [
  {
    attribute: 'data-open',
    condition: 'Present on button and wrapper when the dropdown is open.',
  },
  {
    attribute: 'data-active',
    condition:
      'Present on the item currently highlighted by keyboard or pointer.',
  },
  {
    attribute: 'data-selected',
    condition: 'Present on selected item(s).',
  },
  {
    attribute: 'data-disabled',
    condition:
      'Present on disabled items and on the button when the listbox is disabled.',
  },
  {
    attribute: 'data-invalid',
    condition: 'Present on the button and wrapper when isInvalid is true.',
  },
  {
    attribute: 'data-closed',
    condition: 'Present during close animation when isAnimated is true.',
  },
]

const keyboardEntries: ReadonlyArray<KeyboardEntry> = [
  {
    key: 'Enter / Space',
    description:
      'Opens the dropdown (from button) or selects the active item (from items).',
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
  {
    key: 'Home',
    description: 'Moves to the first enabled item.',
  },
  {
    key: 'End',
    description: 'Moves to the last enabled item.',
  },
  {
    key: 'Escape',
    description: 'Closes the dropdown and returns focus to the button.',
  },
  {
    key: 'Type a character',
    description:
      'Typeahead search — jumps to the first matching item. Accumulates characters for 350ms.',
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
      pageTitle('ui/listbox', 'Listbox'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A custom select dropdown with persistent selection, keyboard navigation, typeahead search, and anchor positioning. Unlike Menu (which is for actions), Listbox tracks the selected value and reflects it in the button. For a searchable input with filtering, use Combobox instead.',
      ),
      para(
        'For programmatic control in update functions, use ',
        inlineCode('Listbox.open(model)'),
        ', ',
        inlineCode('Listbox.close(model)'),
        ', and ',
        inlineCode('Listbox.selectItem(model, item)'),
        '. Each returns ',
        inlineCode('[Model, Commands]'),
        ' directly.',
      ),
      infoCallout(
        'See it in an app',
        'Check out how Listbox is wired up in a ',
        link(uiShowcaseViewSourceHref('listbox'), 'real Foldkit app'),
        '.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      heading(
        Listbox.singleSelectHeader.level,
        Listbox.singleSelectHeader.id,
        Listbox.singleSelectHeader.text,
      ),
      para(
        'Pass an ',
        inlineCode('itemToConfig'),
        ' callback that maps each item to its content. The context provides ',
        inlineCode('isSelected'),
        ' and ',
        inlineCode('isActive'),
        ' for styling the highlighted and selected states.',
      ),
      demoContainer(...Listbox.basicDemo(model.listboxDemo, toParentMessage)),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiListboxBasicHighlighted)],
          [],
        ),
        Snippet.uiListboxBasicRaw,
        'Copy listbox example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(
        Listbox.multiSelectHeader.level,
        Listbox.multiSelectHeader.id,
        Listbox.multiSelectHeader.text,
      ),
      para(
        'Use ',
        inlineCode('Listbox.Multi'),
        ' for multi-selection. The dropdown stays open on selection and items toggle on/off. Selected items are stored in ',
        inlineCode('model.selectedItems'),
        '.',
      ),
      demoContainer(
        ...Listbox.multiSelectDemo(model.listboxMultiDemo, toParentMessage),
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiListboxMultiHighlighted)],
          [],
        ),
        Snippet.uiListboxMultiRaw,
        'Copy multi-select listbox example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(
        Listbox.groupedHeader.level,
        Listbox.groupedHeader.id,
        Listbox.groupedHeader.text,
      ),
      para(
        'Pass ',
        inlineCode('itemGroupKey'),
        ' to group contiguous items by key, and ',
        inlineCode('groupToHeading'),
        ' to render section headers. Groups are separated automatically.',
      ),
      demoContainer(
        ...Listbox.groupedDemo(model.listboxGroupedDemo, toParentMessage),
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiListboxGroupedHighlighted)],
          [],
        ),
        Snippet.uiListboxGroupedRaw,
        'Copy grouped listbox example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'Listbox is headless — the ',
        inlineCode('itemToConfig'),
        ' callback controls all item markup. Use ',
        inlineCode('data-active'),
        ' for the keyboard/pointer highlight and ',
        inlineCode('data-selected'),
        ' for the persistent selection indicator.',
      ),
      para(
        'To make the items panel match the trigger button width, set ',
        inlineCode('width: var(--button-width)'),
        ' (or Tailwind ',
        inlineCode('w-(--button-width)'),
        ') on the items class. The anchor system writes the trigger button\u2019s measured width to this CSS variable on the items element every time it positions the panel, so the panel always matches the button even as content or viewport sizes change. Without it, the items panel sizes to its content.',
      ),
      dataAttributeTable(dataAttributes),
      heading(
        keyboardInteractionHeader.level,
        keyboardInteractionHeader.id,
        keyboardInteractionHeader.text,
      ),
      para(
        'Listbox uses typeahead search — typing printable characters jumps to the first matching item. Characters accumulate for 350ms before the search resets.',
      ),
      keyboardTable(keyboardEntries),
      heading(
        accessibilityHeader.level,
        accessibilityHeader.id,
        accessibilityHeader.text,
      ),
      para(
        'The button receives ',
        inlineCode('aria-haspopup="listbox"'),
        ' and ',
        inlineCode('aria-expanded'),
        '. The items container receives ',
        inlineCode('role="listbox"'),
        ' with ',
        inlineCode('aria-activedescendant'),
        ' tracking the highlighted item. Each item receives ',
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
        inlineCode('Listbox.init()'),
        ' or ',
        inlineCode('Listbox.Multi.init()'),
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
        inlineCode('Listbox.view()'),
        '. The same structure is used for ',
        inlineCode('Listbox.Multi.view()'),
        '.',
      ),
      propTable(viewConfigProps),
    ],
  )
