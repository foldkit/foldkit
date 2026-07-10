import { Submodel } from 'foldkit'
import { Html, html } from 'foldkit/html'

import { uiShowcaseViewSourceHref } from '../../link'
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
import { uiSelectionSubmodelsRouter } from '../../route'
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

const outMessageHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'out-message',
  text: 'OutMessage',
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
  outMessageHeader,
]

// SECTION DATA

const initConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description: 'Unique ID for the listbox instance.',
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
  {
    name: 'orientation',
    type: "'Vertical' | 'Horizontal'",
    default: "'Vertical'",
    description:
      'Whether items flow vertically or horizontally. Sets aria-orientation and switches keyboard navigation to Arrow Left and Arrow Right when Horizontal.',
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
    name: 'maybeSelectedValue',
    type: 'Option<Value>',
    description:
      'The selection the parent owns. None when nothing is selected yet. Multi-select takes selectedValues: ReadonlyArray<Value> instead. Drives the isSelected context and aria-selected.',
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
    name: 'itemToValue',
    type: '(item: Item) => Value',
    description:
      'Extracts the value from an item. Optional when Item is a string, defaulting to the item itself. Required when items are objects.',
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
    description:
      'Floating positioning config: placement, gap, offset, padding, and portal. The items panel is always anchored to the button; when omitted, the panel uses bottom-start placement. Portaled to the document body by default; pass portal: false to keep the panel inside the wrapper.',
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
  {
    name: 'ariaLabel',
    type: 'string',
    description:
      'Accessible name for the trigger button. Use for an icon-only trigger with no visible label. Applied as aria-label, and takes precedence over ariaLabelledBy.',
  },
  {
    name: 'ariaLabelledBy',
    type: 'string',
    description:
      'Id of an external element that labels the trigger button, applied as aria-labelledby. Pair with a visible label element.',
  },
]

const outMessageProps: ReadonlyArray<PropEntry> = [
  {
    name: 'Selected',
    type: '{ value: Value }',
    description:
      'Emitted when an item is activated. Carries the neutral fact that the item was activated; the parent owns the selection and decides what it means. Single-select stores the value; multi-select toggles the value in and out of its array. Pattern-match the third tuple element of PlanListbox.update in your GotListboxMessage handler to fold the value into the selection you own.',
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
      'Typeahead search: jumps to the first matching item. Accumulates characters for 350ms.',
  },
]

// VIEW

type ViewInputs = Readonly<{ copiedSnippets: CopiedSnippets }>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { copiedSnippets }): Html => {
    const h = html<Message>()

    return h.div(
      [],
      [
        pageTitle('ui/listbox', 'Listbox'),
        tableOfContentsEntryToHeader(overviewHeader),
        para(
          'A custom select dropdown with keyboard navigation, typeahead search, and anchor positioning. Unlike Menu (which is for actions), Listbox is for choosing a value. The parent owns the selection: it passes the chosen value in as ',
          inlineCode('maybeSelectedValue'),
          ' (multi-select passes ',
          inlineCode('selectedValues'),
          ') and folds the ',
          inlineCode('Selected'),
          ' OutMessage into its own state (single-select stores the value, multi-select toggles the value in its array). For a searchable input with filtering, use Combobox instead.',
        ),
        para(
          'Embed Listbox via the ',
          link(uiSelectionSubmodelsRouter(), 'create<Item, Value?>() factory'),
          ' at module scope: ',
          inlineCode('const PlanListbox = Listbox.create<Plan>()'),
          '. The factory binds the view, update, and imperative helpers to the same ',
          inlineCode('Item'),
          ' type so the selected value flows through the OutMessage typed end-to-end.',
        ),
        para(
          'For programmatic control in update functions, use the factory instance helpers ',
          inlineCode('PlanListbox.open(model)'),
          ', ',
          inlineCode('PlanListbox.close(model)'),
          ', and ',
          inlineCode('PlanListbox.selectItem(model, item)'),
          '. Each returns ',
          inlineCode('[Model, Commands, Option<OutMessage>]'),
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
        demoContainer(
          ...Listbox.basicDemo(
            model.listboxDemo,
            model.maybeListboxDemoSelectedItem,
          ),
        ),
        highlightedCodeBlock(
          h.div(
            [
              h.Class('text-sm'),
              h.InnerHTML(Snippet.uiListboxBasicHighlighted),
            ],
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
          ' for multi-selection. The dropdown stays open on selection and items toggle on/off. The parent stores the selected values and folds each ',
          inlineCode('Selected'),
          ' OutMessage by toggling the value in its array.',
        ),
        demoContainer(
          ...Listbox.multiSelectDemo(
            model.listboxMultiDemo,
            model.listboxMultiDemoSelectedItems,
          ),
        ),
        highlightedCodeBlock(
          h.div(
            [
              h.Class('text-sm'),
              h.InnerHTML(Snippet.uiListboxMultiHighlighted),
            ],
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
          ...Listbox.groupedDemo(
            model.listboxGroupedDemo,
            model.maybeListboxGroupedDemoSelectedItem,
          ),
        ),
        highlightedCodeBlock(
          h.div(
            [
              h.Class('text-sm'),
              h.InnerHTML(Snippet.uiListboxGroupedHighlighted),
            ],
            [],
          ),
          Snippet.uiListboxGroupedRaw,
          'Copy grouped listbox example to clipboard',
          copiedSnippets,
          'mb-8',
        ),
        heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
        para(
          'Listbox is headless. The ',
          inlineCode('itemToConfig'),
          ' callback controls all item markup. Use ',
          inlineCode('data-active'),
          ' for the keyboard/pointer highlight and ',
          inlineCode('data-selected'),
          ' for the persistent selection indicator.',
        ),
        para(
          'The items panel is portaled to the document body and positioned relative to the trigger button with Floating UI. Ancestor stacking contexts and overflow clipping no longer apply, so a clipped container or a sibling listbox wrapper cannot hide an open dropdown. The panel still stacks at the document level: give it a z-index above elevated content like sticky headers or toasts, as the demos on this page do with ',
          inlineCode('z-10'),
          '. Pass ',
          inlineCode('anchor: { portal: false }'),
          ' to keep the panel inside the wrapper instead.',
        ),
        para(
          'To make the items panel match the trigger button width, set ',
          inlineCode('width: var(--button-width)'),
          ' (or Tailwind ',
          inlineCode('w-(--button-width)'),
          ') on the items class. The anchor system writes the trigger button’s measured width to this CSS variable on the items element every time it positions the panel, so the panel always matches the button even as content or viewport sizes change. Without it, the items panel sizes to its content.',
        ),
        dataAttributeTable(dataAttributes),
        heading(
          keyboardInteractionHeader.level,
          keyboardInteractionHeader.id,
          keyboardInteractionHeader.text,
        ),
        para(
          'Listbox uses typeahead search: typing printable characters jumps to the first matching item. Characters accumulate for 350ms before the search resets.',
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
        para(
          'The trigger is a form field, so give it an accessible name. For a visible label, wire a native ',
          inlineCode('<label for>'),
          ' that targets the trigger id with ',
          inlineCode('Listbox.buttonId(id)'),
          ' rather than hardcoding the ',
          inlineCode('-button'),
          ' convention. The ',
          inlineCode('for'),
          ' association makes the trigger properly labeled: assistive technology announces it by the visible label text, and clicking the label focuses and opens the listbox. That is why it is the recommended pattern.',
        ),
        para(
          'Two ViewInputs cover the cases a ',
          inlineCode('<label for>'),
          ' does not. Pass ',
          inlineCode('ariaLabel'),
          ' for an icon-only trigger with no visible label, or ',
          inlineCode('ariaLabelledBy'),
          ' when the element that names the trigger is not a ',
          inlineCode('<label>'),
          ' you can point ',
          inlineCode('for'),
          ' at.',
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
          'Configuration object passed to the view returned by ',
          inlineCode('Listbox.create()'),
          '. The same structure is used for the view returned by ',
          inlineCode('Listbox.Multi.create()'),
          '.',
        ),
        propTable(viewConfigProps),
        heading(
          outMessageHeader.level,
          outMessageHeader.id,
          outMessageHeader.text,
        ),
        para(
          'Messages emitted to the parent through the third element of ',
          inlineCode('[Model, Commands, Option<OutMessage>]'),
          '. Pattern-match on the OutMessage in your update handler. The same shape applies to the update returned by ',
          inlineCode('Listbox.Multi.create()'),
          ', as in ',
          inlineCode('PeopleListbox.update'),
          '.',
        ),
        propTable(outMessageProps),
      ],
    )
  },
)
