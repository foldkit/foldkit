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
import * as Button from './button'
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

const buttonAttributesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'button-attributes',
  text: 'ButtonAttributes',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  examplesHeader,
  Button.basicHeader,
  Button.disabledHeader,
  stylingHeader,
  keyboardInteractionHeader,
  accessibilityHeader,
  apiReferenceHeader,
  viewConfigHeader,
  buttonAttributesHeader,
]

// SECTION DATA

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'toView',
    type: '(attributes: ButtonAttributes) => Html',
    description:
      'Callback that receives attribute groups and returns the button markup.',
  },
  {
    name: 'onClick',
    type: 'Message',
    description: 'Message to dispatch when the button is clicked.',
  },
  {
    name: 'isDisabled',
    type: 'boolean',
    default: 'false',
    description:
      'Whether the button is disabled. Uses aria-disabled instead of the disabled attribute to preserve focusability.',
  },
  {
    name: 'type',
    type: "'button' | 'submit' | 'reset'",
    default: "'button'",
    description: 'The HTML button type attribute.',
  },
  {
    name: 'isAutofocus',
    type: 'boolean',
    default: 'false',
    description: 'Whether the button receives focus when the page loads.',
  },
]

const buttonAttributesProps: ReadonlyArray<PropEntry> = [
  {
    name: 'button',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the <button> element. Includes type, tabindex, ARIA attributes, and event handlers.',
  },
]

const dataAttributes: ReadonlyArray<DataAttributeEntry> = [
  {
    attribute: 'data-disabled',
    condition: 'Present when isDisabled is true.',
  },
]

const keyboardEntries: ReadonlyArray<KeyboardEntry> = [
  {
    key: 'Enter',
    description: 'Activates the button.',
  },
  {
    key: 'Space',
    description: 'Activates the button.',
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
      pageTitle('ui/button', 'Button'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A thin wrapper around the native button element that provides consistent accessibility attributes and data-attribute hooks for styling. Button is a view-only component — it has no Model, Messages, or update function.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      heading(
        Button.basicHeader.level,
        Button.basicHeader.id,
        Button.basicHeader.text,
      ),
      para(
        'Pass an ',
        inlineCode('onClick'),
        ' Message and a ',
        inlineCode('toView'),
        ' callback that spreads the provided attributes onto a ',
        inlineCode('<button>'),
        ' element.',
      ),
      demoContainer(...Button.basicDemo(model, toParentMessage)),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiButtonBasicHighlighted)],
          [],
        ),
        Snippet.uiButtonBasicRaw,
        'Copy basic button example to clipboard',
        copiedSnippets,
        'mb-8',
      ),

      heading(
        Button.disabledHeader.level,
        Button.disabledHeader.id,
        Button.disabledHeader.text,
      ),
      para(
        'Set ',
        inlineCode('isDisabled: true'),
        ' to disable the button. Foldkit uses ',
        inlineCode('aria-disabled'),
        ' instead of the native ',
        inlineCode('disabled'),
        ' attribute so the button remains focusable for screen readers.',
      ),
      demoContainer(...Button.disabledDemo(model, toParentMessage)),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiButtonDisabledHighlighted)],
          [],
        ),
        Snippet.uiButtonDisabledRaw,
        'Copy disabled button example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'Button is headless — it provides no default styles. Your ',
        inlineCode('toView'),
        ' callback receives attribute groups to spread onto the element, and you control all markup and styling.',
      ),
      para('Use the following data attributes to style different states:'),
      dataAttributeTable(dataAttributes),
      heading(
        keyboardInteractionHeader.level,
        keyboardInteractionHeader.id,
        keyboardInteractionHeader.text,
      ),
      para(
        'Button uses the native ',
        inlineCode('<button>'),
        ' element, so keyboard interaction is handled by the browser.',
      ),
      keyboardTable(keyboardEntries),
      heading(
        accessibilityHeader.level,
        accessibilityHeader.id,
        accessibilityHeader.text,
      ),
      para(
        'Button sets ',
        inlineCode('aria-disabled="true"'),
        ' when disabled instead of the native ',
        inlineCode('disabled'),
        ' attribute. This ensures the button remains in the tab order and is announced by screen readers, while preventing click handlers from firing.',
      ),
      para(
        inlineCode('tabindex="0"'),
        ' is always set to ensure focusability. The ',
        inlineCode('type'),
        ' attribute defaults to ',
        inlineCode('"button"'),
        ' to prevent accidental form submissions.',
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
      para('Configuration object passed to ', inlineCode('Button.view()'), '.'),
      propTable(viewConfigProps),

      heading(
        buttonAttributesHeader.level,
        buttonAttributesHeader.id,
        buttonAttributesHeader.text,
      ),
      para(
        'Attribute groups provided to the ',
        inlineCode('toView'),
        ' callback.',
      ),
      propTable(buttonAttributesProps),
    ],
  )
