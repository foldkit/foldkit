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
import * as Input from './input'
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

const viewConfigHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'view-config',
  text: 'ViewConfig',
}

const inputAttributesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'input-attributes',
  text: 'InputAttributes',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  examplesHeader,
  Input.basicHeader,
  Input.disabledHeader,
  stylingHeader,
  keyboardInteractionHeader,
  accessibilityHeader,
  apiReferenceHeader,
  viewConfigHeader,
  inputAttributesHeader,
]

// SECTION DATA

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description:
      'Unique ID for the input element. Used to link the label and description via ARIA attributes.',
  },
  {
    name: 'toView',
    type: '(attributes: InputAttributes) => Html',
    description:
      'Callback that receives attribute groups for the input, label, and description elements.',
  },
  {
    name: 'onInput',
    type: '(value: string) => Message',
    description:
      'Function that maps the current input value to a Message on each input event.',
  },
  {
    name: 'value',
    type: 'string',
    description: 'The current value of the input.',
  },
  {
    name: 'isDisabled',
    type: 'boolean',
    default: 'false',
    description:
      'Whether the input is disabled. Sets both the native disabled attribute and aria-disabled.',
  },
  {
    name: 'isInvalid',
    type: 'boolean',
    default: 'false',
    description:
      'Whether the input is in an invalid state. Sets aria-invalid and adds a data-invalid attribute for styling.',
  },
  {
    name: 'isAutofocus',
    type: 'boolean',
    default: 'false',
    description: 'Whether the input receives focus when the page loads.',
  },
  {
    name: 'name',
    type: 'string',
    description: 'The form field name for native form submission.',
  },
  {
    name: 'type',
    type: 'string',
    default: "'text'",
    description: 'The HTML input type (text, email, password, number, etc.).',
  },
  {
    name: 'placeholder',
    type: 'string',
    description: 'Placeholder text shown when the input is empty.',
  },
]

const inputAttributesProps: ReadonlyArray<PropEntry> = [
  {
    name: 'input',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the <input> element. Includes id, type, value, ARIA attributes, and event handlers.',
  },
  {
    name: 'label',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the <label> element. Includes a for attribute linking to the input id.',
  },
  {
    name: 'description',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto a description element. Includes an id that the input references via aria-describedby.',
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
    key: 'Tab',
    description: 'Moves focus to or away from the input.',
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
      pageTitle('ui/input', 'Input'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'An accessible text input that links a label and description to the input element via ARIA attributes. Input is a view-only component with no Model or update function. It provides three attribute groups — ',
        inlineCode('input'),
        ', ',
        inlineCode('label'),
        ', and ',
        inlineCode('description'),
        ' — that you spread onto your own elements to get correct accessibility wiring.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      heading(
        Input.basicHeader.level,
        Input.basicHeader.id,
        Input.basicHeader.text,
      ),
      para(
        'Pass an ',
        inlineCode('id'),
        ', an ',
        inlineCode('onInput'),
        ' handler, and a ',
        inlineCode('toView'),
        ' callback. The callback receives attribute groups for three elements: ',
        inlineCode('label'),
        ' (linked via ',
        inlineCode('for'),
        '), ',
        inlineCode('input'),
        ' (with ARIA attributes), and ',
        inlineCode('description'),
        ' (linked via ',
        inlineCode('aria-describedby'),
        ').',
      ),
      ...Input.basicDemo(model, toParentMessage),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippet.uiInputBasicHighlighted)], []),
        Snippet.uiInputBasicRaw,
        'Copy basic input example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(
        Input.disabledHeader.level,
        Input.disabledHeader.id,
        Input.disabledHeader.text,
      ),
      para(
        'Set ',
        inlineCode('isDisabled: true'),
        ' to disable the input. Unlike Button, Input uses the native ',
        inlineCode('disabled'),
        ' attribute in addition to ',
        inlineCode('aria-disabled'),
        ', so the browser prevents interaction entirely.',
      ),
      ...Input.disabledDemo(model, toParentMessage),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiInputDisabledHighlighted)],
          [],
        ),
        Snippet.uiInputDisabledRaw,
        'Copy disabled input example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'Input is headless — your ',
        inlineCode('toView'),
        ' callback controls all markup and styling. Use the data attributes below to style different states. For validation, set ',
        inlineCode('isInvalid: true'),
        ' and style with ',
        inlineCode('data-[invalid]'),
        ' in your CSS.',
      ),
      dataAttributeTable(dataAttributes),
      heading(
        keyboardInteractionHeader.level,
        keyboardInteractionHeader.id,
        keyboardInteractionHeader.text,
      ),
      para(
        'Input uses the native ',
        inlineCode('<input>'),
        ' element, so all keyboard interaction is handled by the browser.',
      ),
      keyboardTable(keyboardEntries),
      heading(
        accessibilityHeader.level,
        accessibilityHeader.id,
        accessibilityHeader.text,
      ),
      para(
        'The three attribute groups wire up ARIA relationships automatically. The ',
        inlineCode('label'),
        ' group includes ',
        inlineCode('for'),
        ' pointing to the input ',
        inlineCode('id'),
        '. The ',
        inlineCode('description'),
        ' group includes an ',
        inlineCode('id'),
        ' that the input references via ',
        inlineCode('aria-describedby'),
        '. You can access this description ID directly with ',
        inlineCode('Input.descriptionId(id)'),
        ' if you need to reference it outside the ',
        inlineCode('toView'),
        ' callback.',
      ),
      para(
        'When ',
        inlineCode('isInvalid'),
        ' is true, ',
        inlineCode('aria-invalid="true"'),
        ' is set on the input element so screen readers announce the error state.',
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
      para('Configuration object passed to ', inlineCode('Input.view()'), '.'),
      propTable(viewConfigProps),
      heading(
        inputAttributesHeader.level,
        inputAttributesHeader.id,
        inputAttributesHeader.text,
      ),
      para(
        'Attribute groups provided to the ',
        inlineCode('toView'),
        ' callback.',
      ),
      propTable(inputAttributesProps),
    ],
  )
