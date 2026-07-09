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

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  examplesHeader,
  stylingHeader,
  keyboardInteractionHeader,
  accessibilityHeader,
  apiReferenceHeader,
  viewConfigHeader,
  disclosureAttributesHeader,
]

// SECTION DATA

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description:
      'Unique ID for the disclosure instance. Used to derive the button and panel ids for ARIA linking.',
  },
  {
    name: 'isOpen',
    type: 'boolean',
    description:
      'The current open state, read from your Model. `aria-expanded`, the `data-open` marker, and `animatePanel` derive from it.',
  },
  {
    name: 'onToggle',
    type: '(isOpen: boolean) => Message',
    description:
      'Maps the new open state to a Message when the user toggles the disclosure. Your update handler just stores the value.',
  },
  {
    name: 'toView',
    type: '(attributes: DisclosureAttributes) => Html',
    description:
      'Callback that receives the `button` and `panel` attribute bundles and returns the composed layout. The consumer reads `isOpen` from their own Model when they need to render conditionally on it.',
  },
  {
    name: 'isDisabled',
    type: 'boolean',
    default: 'false',
    description:
      'When true, the button is not clickable, gets `aria-disabled` and a `data-disabled` attribute.',
  },
  {
    name: 'ariaLabel',
    type: 'string',
    description:
      'Accessible name for the toggle button. Use for an icon-only trigger with no visible label. Applied as aria-label, and takes precedence over ariaLabelledBy.',
  },
  {
    name: 'ariaLabelledBy',
    type: 'string',
    description:
      'Id of an external element that labels the toggle button, applied as aria-labelledby. Pair with a visible label element.',
  },
]

const disclosureAttributesProps: ReadonlyArray<PropEntry> = [
  {
    name: 'button',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the toggle button element. Includes `aria-expanded`, `aria-controls`, `tabindex`, and the click + Enter/Space keyboard handlers.',
  },
  {
    name: 'panel',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the panel element. Includes the panel id (`${id}-panel`) and a `data-open` attribute when open.',
  },
  {
    name: 'animatePanel',
    type: '(content: Html) => Html',
    description:
      'Wraps panel content in a CSS-grid container that animates height as the disclosure opens and closes. Render the panel unconditionally (rather than gating on isOpen) and pass it here; the panel stays mounted while collapsed so the height transition has something to animate. The collapsed content is marked aria-hidden.',
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

type ViewInputs = Readonly<{ copiedSnippets: CopiedSnippets }>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { copiedSnippets }): Html => {
    const h = html<Message>()

    return h.div(
      [],
      [
        pageTitle('ui/disclosure', 'Disclosure'),
        tableOfContentsEntryToHeader(overviewHeader),
        para(
          'A toggle for showing and hiding content inline. Disclosure is a stateless controlled render helper: call it directly with a ViewConfig in your own view; no Model, update, or ',
          inlineCode('h.submodel'),
          ' wrapping. Your Model owns the open value, you pass it in as ',
          inlineCode('isOpen'),
          ', and ',
          inlineCode('onToggle'),
          ' dispatches a Message when the user toggles it. In your update handler, just store the value. Use it for FAQs, accordions, and collapsible sections. For overlaying content in a floating panel, use Dialog or Popover instead.',
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
        demoContainer(...Disclosure.basicDemo(model.isDisclosureDemoOpen)),
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
        para(
          'The example renders the panel unconditionally and passes it through ',
          inlineCode('animatePanel'),
          ', which wraps the content in a CSS-grid container that transitions its height, keeping the panel mounted while collapsed so there is something to animate. To skip the animation, gate the panel on ',
          inlineCode('isOpen'),
          ' with a keyed conditional insert instead.',
        ),
        heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
        para(
          'Use the ',
          inlineCode('data-open'),
          ' attribute to style the button and panel differently when open.',
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
          ' linking to the panel. Toggling is user-driven, so focus stays on the button the user activated; there is no focus Command to handle in update.',
        ),
        para(
          'Give the toggle an accessible name when its content is not self-describing. For a visible label, wire a native ',
          inlineCode('<label for>'),
          ' that targets the toggle id with ',
          inlineCode('Disclosure.buttonId(id)'),
          ' rather than hardcoding the ',
          inlineCode('-button'),
          ' convention. The ',
          inlineCode('for'),
          ' association makes the toggle properly labeled: assistive technology announces it by the visible label text, and clicking the label opens the disclosure. That is why it is the recommended pattern.',
        ),
        para(
          'Two ViewConfig fields cover the cases a ',
          inlineCode('<label for>'),
          ' does not. Pass ',
          inlineCode('ariaLabel'),
          ' for an icon-only toggle with no visible label, or ',
          inlineCode('ariaLabelledBy'),
          ' when the element that names the toggle is not a ',
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
      ],
    )
  },
)
