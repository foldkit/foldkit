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
import type { Message } from './message'
import type { Model } from './model'
import * as Switch from './switch'

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

const switchAttributesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'switch-attributes',
  text: 'SwitchAttributes',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  examplesHeader,
  stylingHeader,
  keyboardInteractionHeader,
  accessibilityHeader,
  apiReferenceHeader,
  viewConfigHeader,
  switchAttributesHeader,
]

// SECTION DATA

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description:
      'Unique ID for the switch instance. Used to link the label and description via ARIA.',
  },
  {
    name: 'isChecked',
    type: 'boolean',
    description:
      'The current on/off state, read from your Model. `aria-checked` and the `data-checked` marker derive from it.',
  },
  {
    name: 'onToggle',
    type: '(isChecked: boolean) => Message',
    description:
      'Maps the new on/off state to a Message when the user toggles the switch. Your update handler just stores the value.',
  },
  {
    name: 'toView',
    type: '(attributes: SwitchAttributes) => Html',
    description:
      'Callback that receives attribute groups for the button, label, description, and hidden input elements.',
  },
  {
    name: 'isDisabled',
    type: 'boolean',
    default: 'false',
    description: 'Whether the switch is disabled.',
  },
  {
    name: 'name',
    type: 'string',
    description:
      'Form field name. When provided, a hidden input is included for native form submission.',
  },
  {
    name: 'value',
    type: 'string',
    default: "'on'",
    description: 'Value sent in the form when checked.',
  },
]

const switchAttributesProps: ReadonlyArray<PropEntry> = [
  {
    name: 'button',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the switch button element. Includes role, aria-checked, tabindex, and click/keyboard handlers.',
  },
  {
    name: 'label',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the label element. Includes an id for aria-labelledby and a click handler that toggles the switch.',
  },
  {
    name: 'description',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto a description element. Includes an id referenced by aria-describedby on the switch.',
  },
  {
    name: 'hiddenInput',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto a hidden <input> for form submission. Only needed when the name prop is set.',
  },
]

const dataAttributes: ReadonlyArray<DataAttributeEntry> = [
  {
    attribute: 'data-checked',
    condition: 'Present when the switch is on.',
  },
  {
    attribute: 'data-disabled',
    condition: 'Present when isDisabled is true.',
  },
]

const keyboardEntries: ReadonlyArray<KeyboardEntry> = [
  {
    key: 'Space',
    description: 'Toggles the switch.',
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
        pageTitle('ui/switch', 'Switch'),
        tableOfContentsEntryToHeader(overviewHeader),
        para(
          'An on/off toggle. Semantically different from Checkbox: Switch represents an immediate action (like a light switch), while Checkbox represents a form value that gets submitted. Switch is a stateless controlled render helper with the same wiring as Checkbox: your Model owns the on/off value, you pass it in as ',
          inlineCode('isChecked'),
          ', and ',
          inlineCode('onToggle'),
          ' dispatches a Message when the user toggles it. In your update handler, just store the value.',
        ),
        infoCallout(
          'See it in an app',
          'Check out how Switch is wired up in a ',
          link(uiShowcaseViewSourceHref('switch'), 'real Foldkit app'),
          '.',
        ),
        heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
        para(
          'The switch renders as a ',
          inlineCode('<button>'),
          ' with ',
          inlineCode('role="switch"'),
          '. The typical visual is a track with a sliding knob, styled with the ',
          inlineCode('data-checked'),
          ' attribute for the on state.',
        ),
        demoContainer(...Switch.basicDemo(model.isSwitchDemoChecked)),
        highlightedCodeBlock(
          h.div(
            [h.Class('text-sm'), h.InnerHTML(Snippet.uiSwitchBasicHighlighted)],
            [],
          ),
          Snippet.uiSwitchBasicRaw,
          'Copy switch example to clipboard',
          copiedSnippets,
          'mb-8',
        ),
        heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
        para(
          'Switch is headless. Your ',
          inlineCode('toView'),
          ' callback controls all markup and styling. Use ',
          inlineCode('data-[checked]'),
          ' to change the track color and translate the knob.',
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
          'The switch button receives ',
          inlineCode('role="switch"'),
          ' and ',
          inlineCode('aria-checked'),
          '. The label is linked via ',
          inlineCode('aria-labelledby'),
          ' and the description via ',
          inlineCode('aria-describedby'),
          '. Clicking the label toggles the switch.',
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
          inlineCode('Switch.view()'),
          '.',
        ),
        propTable(viewConfigProps),
        heading(
          switchAttributesHeader.level,
          switchAttributesHeader.id,
          switchAttributesHeader.text,
        ),
        para(
          'Attribute groups provided to the ',
          inlineCode('toView'),
          ' callback.',
        ),
        propTable(switchAttributesProps),
      ],
    )
  },
)
