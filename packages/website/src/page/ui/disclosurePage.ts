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
import * as Disclosure from './disclosure'
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
    description: 'Unique ID for the disclosure instance.',
  },
  {
    name: 'isOpen',
    type: 'boolean',
    default: 'false',
    description: 'Initial open/closed state.',
  },
]

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'model',
    type: 'Disclosure.Model',
    description: 'The disclosure state from your parent Model.',
  },
  {
    name: 'toParentMessage',
    type: '(message: Message) => Message',
    description: 'Wraps Disclosure Messages in your parent Message type.',
  },
  {
    name: 'buttonContent',
    type: 'Html',
    description: 'Content rendered inside the toggle button.',
  },
  {
    name: 'panelContent',
    type: 'Html',
    description: 'Content rendered inside the disclosure panel.',
  },
  {
    name: 'buttonClassName',
    type: 'string',
    description: 'CSS class for the toggle button.',
  },
  {
    name: 'buttonAttributes',
    type: 'ReadonlyArray<Attribute<Message>>',
    description: 'Additional attributes for the toggle button.',
  },
  {
    name: 'panelClassName',
    type: 'string',
    description: 'CSS class for the panel.',
  },
  {
    name: 'panelAttributes',
    type: 'ReadonlyArray<Attribute<Message>>',
    description: 'Additional attributes for the panel.',
  },
  {
    name: 'isDisabled',
    type: 'boolean',
    default: 'false',
    description: 'Whether the toggle button is disabled.',
  },
  {
    name: 'persistPanel',
    type: 'boolean',
    default: 'false',
    description:
      'When true, keeps the panel in the DOM when closed (with the hidden attribute) instead of removing it.',
  },
  {
    name: 'onToggled',
    type: '() => Message',
    description:
      'Optional domain-event handler fired when toggled, as an alternative to Submodel delegation.',
  },
  {
    name: 'buttonElement',
    type: 'TagName',
    default: "'button'",
    description: 'The HTML element to use for the toggle.',
  },
  {
    name: 'panelElement',
    type: 'TagName',
    default: "'div'",
    description: 'The HTML element to use for the panel.',
  },
  {
    name: 'className',
    type: 'string',
    description: 'CSS class for the wrapper element.',
  },
  {
    name: 'attributes',
    type: 'ReadonlyArray<Attribute<Message>>',
    description: 'Additional attributes for the wrapper element.',
  },
]

const dataAttributes: ReadonlyArray<DataAttributeEntry> = [
  {
    attribute: 'data-open',
    condition: 'Present on both button and panel when the disclosure is open.',
  },
  {
    attribute: 'data-disabled',
    condition: 'Present on the button when isDisabled is true.',
  },
]

const keyboardEntries: ReadonlyArray<KeyboardEntry> = [
  {
    key: 'Enter',
    description: 'Toggles the disclosure.',
  },
  {
    key: 'Space',
    description: 'Toggles the disclosure.',
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
      pageTitle('ui/disclosure', 'Disclosure'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A toggle for showing and hiding content inline. Disclosure manages its own open/closed state and renders a button + panel pair. Use it for FAQs, accordions, and collapsible sections. For overlaying content in a floating panel, use Dialog or Popover instead.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      para(
        'Pass ',
        inlineCode('buttonContent'),
        ' and ',
        inlineCode('panelContent'),
        ' directly — Disclosure handles the wrapper, ARIA linking, and toggle behavior. Style the button and panel with className or attributes props.',
      ),
      demoContainer(
        ...Disclosure.disclosureDemo(model.disclosureDemo, toParentMessage),
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiDisclosureBasicHighlighted)],
          [],
        ),
        Snippet.uiDisclosureBasicRaw,
        'Copy disclosure example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'Use the ',
        inlineCode('data-open'),
        ' attribute to style the button and panel differently when open. A common pattern is rotating a chevron icon and changing border radius: ',
        inlineCode('data-[open]:rounded-b-none'),
        ' on the button, ',
        inlineCode('rounded-b-lg'),
        ' on the panel.',
      ),
      dataAttributeTable(dataAttributes),
      heading(
        keyboardInteractionHeader.level,
        keyboardInteractionHeader.id,
        keyboardInteractionHeader.text,
      ),
      keyboardTable(keyboardEntries),
      heading(
        accessibilityHeader.level,
        accessibilityHeader.id,
        accessibilityHeader.text,
      ),
      para(
        'The toggle button receives ',
        inlineCode('aria-expanded'),
        ' and ',
        inlineCode('aria-controls'),
        ' linking to the panel. When the disclosure closes, focus is returned to the toggle button automatically.',
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
        inlineCode('Disclosure.init()'),
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
        inlineCode('Disclosure.view()'),
        '.',
      ),
      propTable(viewConfigProps),
    ],
  )
