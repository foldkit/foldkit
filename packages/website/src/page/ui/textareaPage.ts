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
import * as Textarea from './textarea'

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

const textareaAttributesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'textarea-attributes',
  text: 'TextareaAttributes',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  examplesHeader,
  Textarea.basicHeader,
  Textarea.disabledHeader,
  stylingHeader,
  keyboardInteractionHeader,
  accessibilityHeader,
  apiReferenceHeader,
  viewConfigHeader,
  textareaAttributesHeader,
]

// SECTION DATA

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description:
      'Unique ID for the textarea element. Used to link the label and description via ARIA attributes.',
  },
  {
    name: 'toView',
    type: '(attributes: TextareaAttributes) => Html',
    description:
      'Callback that receives attribute groups for the textarea, label, and description elements.',
  },
  {
    name: 'onInput',
    type: '(value: string) => Message',
    description:
      'Function that maps the current textarea value to a Message on each input event.',
  },
  {
    name: 'value',
    type: 'string',
    description: 'The current value of the textarea.',
  },
  {
    name: 'isDisabled',
    type: 'boolean',
    default: 'false',
    description:
      'Whether the textarea is disabled. Sets both the native disabled attribute and aria-disabled.',
  },
  {
    name: 'isInvalid',
    type: 'boolean',
    default: 'false',
    description:
      'Whether the textarea is in an invalid state. Sets aria-invalid and adds a data-invalid attribute for styling.',
  },
  {
    name: 'isAutofocus',
    type: 'boolean',
    default: 'false',
    description: 'Whether the textarea receives focus when the page loads.',
  },
  {
    name: 'name',
    type: 'string',
    description: 'The form field name for native form submission.',
  },
  {
    name: 'rows',
    type: 'number',
    description: 'The visible number of text lines.',
  },
  {
    name: 'placeholder',
    type: 'string',
    description: 'Placeholder text shown when the textarea is empty.',
  },
]

const textareaAttributesProps: ReadonlyArray<PropEntry> = [
  {
    name: 'textarea',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the <textarea> element. Includes id, rows, value, ARIA attributes, and event handlers.',
  },
  {
    name: 'label',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the <label> element. Includes a for attribute linking to the textarea id.',
  },
  {
    name: 'description',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto a description element. Includes an id that the textarea references via aria-describedby.',
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
    description: 'Moves focus to or away from the textarea.',
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
      pageTitle('ui/textarea', 'Textarea'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'An accessible multi-line text input that links a label and description via ARIA attributes. Textarea is a view-only component with the same three attribute groups as Input — ',
        inlineCode('textarea'),
        ', ',
        inlineCode('label'),
        ', and ',
        inlineCode('description'),
        ' — plus a ',
        inlineCode('rows'),
        ' prop to control the visible height.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      heading(
        Textarea.basicHeader.level,
        Textarea.basicHeader.id,
        Textarea.basicHeader.text,
      ),
      para(
        'The ',
        inlineCode('toView'),
        ' callback receives the same label/description attribute groups as Input. Spread ',
        inlineCode('attributes.textarea'),
        ' onto a ',
        inlineCode('<textarea>'),
        ' element instead of ',
        inlineCode('<input>'),
        '.',
      ),
      demoContainer(...Textarea.basicDemo(model, toParentMessage)),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiTextareaBasicHighlighted)],
          [],
        ),
        Snippet.uiTextareaBasicRaw,
        'Copy basic textarea example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(
        Textarea.disabledHeader.level,
        Textarea.disabledHeader.id,
        Textarea.disabledHeader.text,
      ),
      para(
        'Set ',
        inlineCode('isDisabled: true'),
        ' to disable the textarea. Like Input, this sets both the native ',
        inlineCode('disabled'),
        ' attribute and ',
        inlineCode('aria-disabled'),
        '.',
      ),
      demoContainer(...Textarea.disabledDemo(model, toParentMessage)),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiTextareaDisabledHighlighted)],
          [],
        ),
        Snippet.uiTextareaDisabledRaw,
        'Copy disabled textarea example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'Textarea is headless — your ',
        inlineCode('toView'),
        ' callback controls all markup and styling. Use the data attributes below to style different states.',
      ),
      dataAttributeTable(dataAttributes),
      heading(
        keyboardInteractionHeader.level,
        keyboardInteractionHeader.id,
        keyboardInteractionHeader.text,
      ),
      para(
        'Textarea uses the native ',
        inlineCode('<textarea>'),
        ' element, so all keyboard interaction is handled by the browser.',
      ),
      keyboardTable(keyboardEntries),
      heading(
        accessibilityHeader.level,
        accessibilityHeader.id,
        accessibilityHeader.text,
      ),
      para(
        'Textarea provides the same ARIA wiring as Input. The ',
        inlineCode('label'),
        ' group links via ',
        inlineCode('for'),
        ', and the ',
        inlineCode('description'),
        ' group is referenced by ',
        inlineCode('aria-describedby'),
        ' on the textarea. You can access the description ID directly with ',
        inlineCode('Textarea.descriptionId(id)'),
        '.',
      ),
      para(
        'When ',
        inlineCode('isInvalid'),
        ' is true, ',
        inlineCode('aria-invalid="true"'),
        ' is set on the textarea element.',
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
      para(
        'Configuration object passed to ',
        inlineCode('Textarea.view()'),
        '.',
      ),
      propTable(viewConfigProps),
      heading(
        textareaAttributesHeader.level,
        textareaAttributesHeader.id,
        textareaAttributesHeader.text,
      ),
      para(
        'Attribute groups provided to the ',
        inlineCode('toView'),
        ' callback.',
      ),
      propTable(textareaAttributesProps),
    ],
  )
