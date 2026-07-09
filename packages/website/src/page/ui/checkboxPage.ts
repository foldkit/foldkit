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
import * as Checkbox from './checkbox'
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

const checkboxAttributesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'checkbox-attributes',
  text: 'CheckboxAttributes',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  examplesHeader,
  Checkbox.basicHeader,
  Checkbox.indeterminateHeader,
  stylingHeader,
  keyboardInteractionHeader,
  accessibilityHeader,
  apiReferenceHeader,
  viewConfigHeader,
  checkboxAttributesHeader,
]

// SECTION DATA

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description:
      'Unique ID for the checkbox instance. Used to link the label and description via ARIA.',
  },
  {
    name: 'isChecked',
    type: 'boolean',
    description:
      'The current checked state, read from your Model. `aria-checked` and the `data-checked` marker derive from it.',
  },
  {
    name: 'onToggle',
    type: '(isChecked: boolean) => Message',
    description:
      'Maps the new checked state to a Message when the user toggles the checkbox. Your update handler just stores the value.',
  },
  {
    name: 'toView',
    type: '(attributes: CheckboxAttributes) => Html',
    description:
      'Callback that receives attribute groups for the checkbox, label, description, and hidden input elements.',
  },
  {
    name: 'isDisabled',
    type: 'boolean',
    default: 'false',
    description: 'Whether the checkbox is disabled.',
  },
  {
    name: 'isIndeterminate',
    type: 'boolean',
    default: 'false',
    description:
      'Whether to show the indeterminate (mixed) state. Useful for "select all" checkboxes where some but not all children are checked.',
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

const checkboxAttributesProps: ReadonlyArray<PropEntry> = [
  {
    name: 'checkbox',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the checkbox element (typically a <button>). Includes role, aria-checked, tabindex, and click/keyboard handlers.',
  },
  {
    name: 'label',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the label element. Includes an id for aria-labelledby and a click handler that toggles the checkbox.',
  },
  {
    name: 'description',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto a description element. Includes an id referenced by aria-describedby on the checkbox.',
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
    condition: 'Present when checked and not indeterminate.',
  },
  {
    attribute: 'data-indeterminate',
    condition: 'Present when isIndeterminate is true.',
  },
  {
    attribute: 'data-disabled',
    condition: 'Present when isDisabled is true.',
  },
]

const keyboardEntries: ReadonlyArray<KeyboardEntry> = [
  {
    key: 'Space',
    description: 'Toggles the checkbox.',
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
        pageTitle('ui/checkbox', 'Checkbox'),
        tableOfContentsEntryToHeader(overviewHeader),
        para(
          'A toggle with checked, unchecked, and indeterminate states. Checkbox is a stateless controlled render helper: call it directly with a ViewConfig in your own view; no Model, update, or ',
          inlineCode('h.submodel'),
          ' wrapping. Your Model owns the checked value, you pass it in as ',
          inlineCode('isChecked'),
          ', and ',
          inlineCode('onToggle'),
          ' dispatches a Message when the user toggles it. In your update handler, just store the value. For an on/off toggle that represents an immediate action (like a light switch), use Switch instead.',
        ),
        infoCallout(
          'See it in an app',
          'Check out how Checkbox is wired up in a ',
          link(uiShowcaseViewSourceHref('checkbox'), 'real Foldkit app'),
          '.',
        ),
        heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
        heading(
          Checkbox.basicHeader.level,
          Checkbox.basicHeader.id,
          Checkbox.basicHeader.text,
        ),
        para(
          'The checkbox element is typically a ',
          inlineCode('<button>'),
          '. Spread ',
          inlineCode('attributes.checkbox'),
          ' onto it for role, ARIA state, and keyboard/click handlers. The label click handler also toggles the checkbox.',
        ),
        demoContainer(...Checkbox.basicDemo(model)),
        highlightedCodeBlock(
          h.div(
            [
              h.Class('text-sm'),
              h.InnerHTML(Snippet.uiCheckboxBasicHighlighted),
            ],
            [],
          ),
          Snippet.uiCheckboxBasicRaw,
          'Copy basic checkbox example to clipboard',
          copiedSnippets,
          'mb-8',
        ),
        heading(
          Checkbox.indeterminateHeader.level,
          Checkbox.indeterminateHeader.id,
          Checkbox.indeterminateHeader.text,
        ),
        para(
          'Pass ',
          inlineCode('isIndeterminate: true'),
          ' to show a mixed state. This is typically computed from child checkbox states: when some but not all children are checked, the parent shows the indeterminate mark. Toggling the parent sets all children to the same state.',
        ),
        demoContainer(...Checkbox.indeterminateDemo(model)),
        highlightedCodeBlock(
          h.div(
            [
              h.Class('text-sm'),
              h.InnerHTML(Snippet.uiCheckboxIndeterminateHighlighted),
            ],
            [],
          ),
          Snippet.uiCheckboxIndeterminateRaw,
          'Copy indeterminate checkbox example to clipboard',
          copiedSnippets,
          'mb-8',
        ),
        heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
        para(
          'Checkbox is headless. Your ',
          inlineCode('toView'),
          ' callback controls all markup and styling. Use the data attributes below to style checked, indeterminate, and disabled states.',
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
          'The checkbox element receives ',
          inlineCode('role="checkbox"'),
          ' and ',
          inlineCode('aria-checked'),
          ' which is set to ',
          inlineCode('"true"'),
          ', ',
          inlineCode('"false"'),
          ', or ',
          inlineCode('"mixed"'),
          ' depending on the checked and indeterminate state. The label is linked via ',
          inlineCode('aria-labelledby'),
          ' and the description via ',
          inlineCode('aria-describedby'),
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
        para(
          'Configuration object passed to ',
          inlineCode('Checkbox.view()'),
          '.',
        ),
        propTable(viewConfigProps),
        heading(
          checkboxAttributesHeader.level,
          checkboxAttributesHeader.id,
          checkboxAttributesHeader.text,
        ),
        para(
          'Attribute groups provided to the ',
          inlineCode('toView'),
          ' callback.',
        ),
        propTable(checkboxAttributesProps),
      ],
    )
  },
)
