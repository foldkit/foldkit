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

const disclosureAttributesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'disclosure-attributes',
  text: 'DisclosureAttributes',
}

const outMessageHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'out-message',
  text: 'OutMessage',
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
  disclosureAttributesHeader,
  outMessageHeader,
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
    type: '(childMessage: Disclosure.Message) => ParentMessage',
    description:
      'Wraps Disclosure Messages in your parent Message type for Submodel delegation.',
  },
  {
    name: 'toView',
    type: '(attributes: DisclosureAttributes) => Html',
    description:
      'Callback that receives the `button` and `panel` attribute bundles and returns the composed layout. The consumer reads `isOpen` from their parent model when they need to render conditionally on it.',
  },
  {
    name: 'isDisabled',
    type: 'boolean',
    default: 'false',
    description:
      'When true, the button is not clickable, gets `aria-disabled` and a `data-disabled` attribute.',
  },
]

const disclosureAttributesProps: ReadonlyArray<PropEntry> = [
  {
    name: 'button',
    type: 'ReadonlyArray<ChildAttribute>',
    description:
      'Spread onto the toggle button element. Includes `aria-expanded`, `aria-controls`, `tabindex`, and the click + Enter/Space keyboard handlers.',
  },
  {
    name: 'panel',
    type: 'ReadonlyArray<ChildAttribute>',
    description:
      'Spread onto the panel element. Includes the panel id (`${id}-panel`) and a `data-open` attribute when open.',
  },
]

const outMessageProps: ReadonlyArray<PropEntry> = [
  {
    name: 'ToggledOpenState',
    type: '{ isOpen: boolean }',
    description:
      'Emitted on each toggle, carrying the new open state. Pattern-match the third tuple element of Disclosure.update in your GotDisclosureMessage handler to react (e.g. analytics, lazy content loading, persisting open state).',
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

export const view = <ParentMessage>(
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
  copiedSnippets: CopiedSnippets,
): Html => {
  const h = html<ParentMessage>()

  return h.div(
    [],
    [
      pageTitle('ui/disclosure', 'Disclosure'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A toggle for showing and hiding content inline. Disclosure manages its own open/closed state and renders a button + panel pair. Use it for FAQs, accordions, and collapsible sections. For overlaying content in a floating panel, use Dialog or Popover instead.',
      ),
      para(
        'For programmatic control in update functions, use ',
        inlineCode('Disclosure.toggle(model)'),
        ' and ',
        inlineCode('Disclosure.close(model)'),
        ' which return ',
        inlineCode('[Model, Commands, Option<OutMessage>]'),
        ' directly.',
      ),
      infoCallout(
        'See it in an app',
        'Check out how Disclosure is wired up in a ',
        link(uiShowcaseViewSourceHref('disclosure'), 'real Foldkit app'),
        '.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      para(
        'Provide a ',
        inlineCode('toView'),
        ' callback that receives the ',
        inlineCode('button'),
        ' and ',
        inlineCode('panel'),
        ' attribute bundles. Spread them onto your own elements; Disclosure manages the ARIA linking and toggle behavior.',
      ),
      demoContainer(
        ...Disclosure.disclosureDemo(model.disclosureDemo, toParentMessage),
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.uiDisclosureBasicHighlighted),
          ],
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
      heading(
        disclosureAttributesHeader.level,
        disclosureAttributesHeader.id,
        disclosureAttributesHeader.text,
      ),
      para(
        'Attribute bundles delivered to the ',
        inlineCode('toView'),
        ' callback each render.',
      ),
      propTable(disclosureAttributesProps),
      heading(
        outMessageHeader.level,
        outMessageHeader.id,
        outMessageHeader.text,
      ),
      para(
        'Messages emitted to the parent through the third element of ',
        inlineCode('[Model, Commands, Option<OutMessage>]'),
        '. Pattern-match on the OutMessage in your update handler.',
      ),
      propTable(outMessageProps),
    ],
  )
}
