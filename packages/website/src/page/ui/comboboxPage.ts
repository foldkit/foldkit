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

const outMessageHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'out-message',
  text: 'OutMessage',
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
  outMessageHeader,
]

// SECTION DATA

const initConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description: 'Unique ID for the combobox instance.',
  },
  {
    name: 'isAnimated',
    type: 'boolean',
    default: 'false',
    description: 'Enables animation coordination.',
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
      'Allows clearing the selection by clicking the selected item again, or by emptying the input and closing (which emits ClearedSelection).',
  },
  {
    name: 'immediate',
    type: 'boolean',
    default: 'false',
    description:
      'Emits Selected on every keyboard activation while open, so arrow keys commit as they move instead of waiting for Enter. Combining immediate with nullable is discouraged: a nullable toggle fold would deselect as the arrows pass back over the selected item.',
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
    name: 'items',
    type: 'ReadonlyArray<Item>',
    description:
      'The filtered list of items to display. You control the filtering logic based on model.inputValue.',
  },
  {
    name: 'maybeSelectedValue',
    type: 'Option<Item>',
    description:
      'The selection the parent owns. None when nothing is selected yet. Multi-select takes selectedValues: ReadonlyArray<Item> instead. Drives the isSelected context and aria-selected.',
  },
  {
    name: 'restingInputValue',
    type: 'string',
    description:
      'The text the input returns to when the combobox closes: the selected display text for single-select, an empty string for multi-select.',
  },
  {
    name: 'itemToConfig',
    type: '(item, context) => ItemConfig',
    description:
      'Maps each item to its className and content. The context provides isActive, isSelected, and isDisabled.',
  },
  {
    name: 'itemToValue',
    type: '(item: Item, index: number) => Item',
    description: 'Extracts the value from an item. Required.',
  },
  {
    name: 'itemToDisplayText',
    type: '(item: Item, index: number) => string',
    description: 'Text shown in the input when an item is selected. Required.',
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
    description:
      'Floating positioning config: placement, gap, offset, padding, and portal. The items panel is always anchored to the input wrapper; when omitted, the panel uses bottom-start placement. Portaled to the document body by default; pass portal: false to keep the panel inside the wrapper.',
  },
  {
    name: 'ariaLabel',
    type: 'string',
    description:
      'Accessible name for the input. Use when there is no visible label. Applied as aria-label, and takes precedence over ariaLabelledBy.',
  },
  {
    name: 'ariaLabelledBy',
    type: 'string',
    description:
      'Id of an external element that labels the input, applied as aria-labelledby. Pair with a visible label element.',
  },
]

const outMessageProps: ReadonlyArray<PropEntry> = [
  {
    name: 'Selected',
    type: '{ value: Item }',
    description:
      'Emitted when an item is activated. Carries the neutral fact that the item was activated; the parent owns the selection and decides what it means. Single-select stores the value; multi-select toggles the value in and out of its array. Pattern-match the third tuple element of CityCombobox.update in your GotComboboxMessage handler to fold the value into the selection you own.',
  },
  {
    name: 'ClearedSelection',
    type: '{}',
    description:
      'Emitted when a nullable combobox closes with an empty input, meaning the user cleared it. The parent clears the selection it owns.',
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

type ViewInputs = Readonly<{ copiedSnippets: CopiedSnippets }>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { copiedSnippets }): Html => {
    const h = html<Message>()

    return h.div(
      [],
      [
        pageTitle('ui/combobox', 'Combobox'),
        tableOfContentsEntryToHeader(overviewHeader),
        para(
          'A searchable select with input filtering, keyboard navigation, and anchor positioning. Unlike Listbox (which uses a button trigger), Combobox has a text input for searching. You control the filtering logic: read ',
          inlineCode('model.inputValue'),
          ' and pass the filtered items array. The parent owns the selection: it passes the chosen value in as ',
          inlineCode('maybeSelectedValue'),
          ' (multi-select passes ',
          inlineCode('selectedValues'),
          ') along with ',
          inlineCode('restingInputValue'),
          ' (the text the input rests at when closed), and folds the ',
          inlineCode('Selected'),
          ' and ',
          inlineCode('ClearedSelection'),
          ' OutMessages into its own state (single-select stores the value, multi-select toggles the value in its array).',
        ),
        para(
          'Embed Combobox via the ',
          link(uiSelectionSubmodelsRouter(), 'create<Item>() factory'),
          ' at module scope: ',
          inlineCode('const CityCombobox = Combobox.create<City>()'),
          '. The factory binds the view, update, and imperative helpers to the same ',
          inlineCode('Item'),
          ' type so the selected value flows through the OutMessage typed end-to-end. Combobox constrains ',
          inlineCode('Item extends string'),
          '.',
        ),
        para(
          'For programmatic control in update functions, use ',
          inlineCode('CityCombobox.open(model)'),
          ', ',
          inlineCode('CityCombobox.close(model, restingInputValue)'),
          ', and ',
          inlineCode('CityCombobox.selectItem(model, item, displayText)'),
          '. Each returns ',
          inlineCode('[Model, Commands, Option<OutMessage>]'),
          ' directly. Single-select ',
          inlineCode('close'),
          ' takes the resting input text (the selected display text, or empty); ',
          inlineCode('Combobox.Multi'),
          ' closes with ',
          inlineCode('close(model)'),
          ' since the multi-select input always rests empty.',
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
        h.section(
          [h.AriaLabelledBy(Combobox.singleSelectHeader.id)],
          [
            demoContainer(
              ...Combobox.comboboxDemo(
                model.comboboxDemo,
                model.maybeComboboxDemoSelectedCity,
              ),
            ),
          ],
        ),
        highlightedCodeBlock(
          h.div(
            [
              h.Class('text-sm'),
              h.InnerHTML(Snippet.uiComboboxBasicHighlighted),
            ],
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
          ' at init to allow clearing the selection by clicking the selected item again, or by emptying the input and closing. Both paths reach the parent as OutMessages (',
          inlineCode('Selected'),
          ' toggles, ',
          inlineCode('ClearedSelection'),
          ' clears), so the parent decides what an empty selection looks like.',
        ),
        h.section(
          [h.AriaLabelledBy(Combobox.nullableHeader.id)],
          [
            demoContainer(
              ...Combobox.nullableDemo(
                model.comboboxNullableDemo,
                model.maybeComboboxNullableDemoSelectedCity,
              ),
            ),
          ],
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
        h.section(
          [h.AriaLabelledBy(Combobox.selectOnFocusHeader.id)],
          [
            demoContainer(
              ...Combobox.selectOnFocusDemo(
                model.comboboxSelectOnFocusDemo,
                model.maybeComboboxSelectOnFocusDemoSelectedCity,
              ),
            ),
          ],
        ),
        heading(
          Combobox.multiHeader.level,
          Combobox.multiHeader.id,
          Combobox.multiHeader.text,
        ),
        para(
          'Use ',
          inlineCode('Combobox.Multi'),
          ' for multi-selection. The dropdown stays open on selection and items toggle on/off. The parent stores the selected values and folds each ',
          inlineCode('Selected'),
          ' OutMessage by toggling the value in its array.',
        ),
        h.section(
          [h.AriaLabelledBy(Combobox.multiHeader.id)],
          [
            demoContainer(
              ...Combobox.multiDemo(
                model.comboboxMultiDemo,
                model.comboboxMultiDemoSelectedCities,
              ),
            ),
          ],
        ),
        highlightedCodeBlock(
          h.div(
            [
              h.Class('text-sm'),
              h.InnerHTML(Snippet.uiComboboxMultiHighlighted),
            ],
            [],
          ),
          Snippet.uiComboboxMultiRaw,
          'Copy multi-select combobox example to clipboard',
          copiedSnippets,
          'mb-8',
        ),
        heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
        para(
          'Combobox is headless. The ',
          inlineCode('itemToConfig'),
          ' callback controls all item markup. Style the input, button, items container, and backdrop through their respective attribute props.',
        ),
        para(
          'The items panel is portaled to the document body and positioned relative to the input wrapper with Floating UI. Ancestor stacking contexts and overflow clipping no longer apply, so a clipped container or a sibling overlay wrapper cannot hide the open panel. The panel still stacks at the document level: give it a z-index above elevated content like sticky headers or toasts, as the demos on this page do with ',
          inlineCode('z-10'),
          '. Pass ',
          inlineCode('anchor: { portal: false }'),
          ' to keep the panel inside the wrapper instead.',
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
        para(
          'The input is a form field, so give it an accessible name. For a visible label, wire a native ',
          inlineCode('<label for>'),
          ' that targets the input id with ',
          inlineCode('Combobox.inputId(id)'),
          ' rather than hardcoding the ',
          inlineCode('-input'),
          ' convention. The ',
          inlineCode('for'),
          ' association makes the input properly labeled: assistive technology announces it by the visible label text, and clicking the label focuses the input. That is why it is the recommended pattern.',
        ),
        para(
          'Two ViewInputs cover the cases a ',
          inlineCode('<label for>'),
          ' does not. Pass ',
          inlineCode('ariaLabel'),
          ' when there is no visible label, or ',
          inlineCode('ariaLabelledBy'),
          ' when the element that names the input is not a ',
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
          inlineCode('CityCombobox.view'),
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
          inlineCode('Combobox.Multi.create()'),
          ', as in ',
          inlineCode('CitiesCombobox.update'),
          '.',
        ),
        propTable(outMessageProps),
      ],
    )
  },
)
