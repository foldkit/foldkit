import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import {
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
import * as Select from './select'

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

const viewConfigHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'view-config',
  text: 'ViewConfig',
}

const selectAttributesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'select-attributes',
  text: 'SelectAttributes',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  examplesHeader,
  Select.basicHeader,
  Select.disabledHeader,
  stylingHeader,
  keyboardInteractionHeader,
  accessibilityHeader,
  apiReferenceHeader,
  viewConfigHeader,
  selectAttributesHeader,
]

// SECTION DATA

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description:
      'Unique ID for the select element. Used to link the label and description via ARIA attributes.',
  },
  {
    name: 'toView',
    type: '(attributes: SelectAttributes) => Html',
    description:
      'Callback that receives attribute groups for the select, label, and description elements.',
  },
  {
    name: 'onChange',
    type: '(value: string) => Message',
    description:
      'Function that maps the selected value to a Message when the selection changes.',
  },
  {
    name: 'value',
    type: 'string',
    description: 'The currently selected value.',
  },
  {
    name: 'isDisabled',
    type: 'boolean',
    default: 'false',
    description:
      'Whether the select is disabled. Sets both the native disabled attribute and aria-disabled.',
  },
  {
    name: 'isInvalid',
    type: 'boolean',
    default: 'false',
    description:
      'Whether the select is in an invalid state. Sets aria-invalid and adds a data-invalid attribute for styling.',
  },
  {
    name: 'isAutofocus',
    type: 'boolean',
    default: 'false',
    description: 'Whether the select receives focus when the page loads.',
  },
  {
    name: 'name',
    type: 'string',
    description: 'The form field name for native form submission.',
  },
]

const selectAttributesProps: ReadonlyArray<PropEntry> = [
  {
    name: 'select',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the <select> element. Includes id, value, ARIA attributes, and event handlers.',
  },
  {
    name: 'label',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the <label> element. Includes a for attribute linking to the select id.',
  },
  {
    name: 'description',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto a description element. Includes an id that the select references via aria-describedby.',
  },
]

const dataAttributes: ReadonlyArray<DataAttributeEntry> = [
  {
    attribute: 'data-disabled',
    condition: 'Present when isDisabled is true.',
  },
  {
    attribute: 'data-invalid',
    condition: 'Present when isInvalid is true.',
  },
]

const keyboardEntries: ReadonlyArray<KeyboardEntry> = [
  {
    key: 'Space',
    description: 'Opens the native dropdown.',
  },
  {
    key: 'Enter',
    description: 'Opens the native dropdown.',
  },
  {
    key: 'Arrow Up/Down',
    description: 'Navigates between options.',
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
      pageTitle('ui/select', 'Select'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A wrapper around the native ',
        inlineCode('<select>'),
        ' element with ARIA label/description linking and data-attribute hooks. Select is a view-only component — for a custom dropdown with keyboard navigation and custom rendering, use Listbox or Combobox instead.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      heading(
        Select.basicHeader.level,
        Select.basicHeader.id,
        Select.basicHeader.text,
      ),
      para(
        'Pass an ',
        inlineCode('onChange'),
        ' handler that receives the selected option\u2019s value as a string. You provide the ',
        inlineCode('<option>'),
        ' elements inside the ',
        inlineCode('<select>'),
        ' in your ',
        inlineCode('toView'),
        ' callback.',
      ),
      ...Select.basicDemo(model, toParentMessage),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiSelectBasicHighlighted)],
          [],
        ),
        Snippet.uiSelectBasicRaw,
        'Copy basic select example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(
        Select.disabledHeader.level,
        Select.disabledHeader.id,
        Select.disabledHeader.text,
      ),
      para('Set ', inlineCode('isDisabled: true'), ' to disable the select.'),
      ...Select.disabledDemo(model, toParentMessage),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiSelectDisabledHighlighted)],
          [],
        ),
        Snippet.uiSelectDisabledRaw,
        'Copy disabled select example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'Select is headless — your ',
        inlineCode('toView'),
        ' callback controls all markup and styling. The native ',
        inlineCode('<select>'),
        ' dropdown appearance varies by browser and OS. Use ',
        inlineCode('appearance-none'),
        ' in CSS and add a custom chevron icon for a consistent look.',
      ),
      dataAttributeTable(dataAttributes),
      heading(
        keyboardInteractionHeader.level,
        keyboardInteractionHeader.id,
        keyboardInteractionHeader.text,
      ),
      para(
        'Select uses the native ',
        inlineCode('<select>'),
        ' element, so keyboard interaction is handled by the browser.',
      ),
      keyboardTable(keyboardEntries),
      heading(
        accessibilityHeader.level,
        accessibilityHeader.id,
        accessibilityHeader.text,
      ),
      para(
        'Select provides the same ARIA wiring as Input. The ',
        inlineCode('label'),
        ' group links via ',
        inlineCode('for'),
        ', and the ',
        inlineCode('description'),
        ' group is referenced by ',
        inlineCode('aria-describedby'),
        '. You can access the description ID directly with ',
        inlineCode('Select.descriptionId(id)'),
        '.',
      ),
      heading(
        apiReferenceHeader.level,
        apiReferenceHeader.id,
        apiReferenceHeader.text,
      ),
      heading(
        viewConfigHeader.level,
        viewConfigHeader.id,
        viewConfigHeader.text,
      ),
      para('Configuration object passed to ', inlineCode('Select.view()'), '.'),
      propTable(viewConfigProps),
      heading(
        selectAttributesHeader.level,
        selectAttributesHeader.id,
        selectAttributesHeader.text,
      ),
      para(
        'Attribute groups provided to the ',
        inlineCode('toView'),
        ' callback.',
      ),
      propTable(selectAttributesProps),
    ],
  )
