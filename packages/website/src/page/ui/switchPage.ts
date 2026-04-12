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
  initConfigHeader,
  viewConfigHeader,
  switchAttributesHeader,
]

// SECTION DATA

const initConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description: 'Unique ID for the switch instance.',
  },
  {
    name: 'isChecked',
    type: 'boolean',
    default: 'false',
    description: 'Initial on/off state.',
  },
]

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'model',
    type: 'Switch.Model',
    description: 'The switch state from your parent Model.',
  },
  {
    name: 'toParentMessage',
    type: '(message: Toggled) => Message',
    description:
      'Wraps the Switch Message in your parent Message type for Submodel delegation.',
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

export const view = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
  copiedSnippets: CopiedSnippets,
): Html =>
  div(
    [],
    [
      pageTitle('ui/switch', 'Switch'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'An on/off toggle. Semantically different from Checkbox — Switch represents an immediate action (like a light switch), while Checkbox represents a form value that gets submitted. Switch uses the Submodel pattern with the same wiring as Checkbox.',
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
      ...Switch.switchDemo(model.switchDemo, toParentMessage),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiSwitchBasicHighlighted)],
          [],
        ),
        Snippet.uiSwitchBasicRaw,
        'Copy switch example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'Switch is headless — your ',
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
        initConfigHeader.level,
        initConfigHeader.id,
        initConfigHeader.text,
      ),
      para('Configuration object passed to ', inlineCode('Switch.init()'), '.'),
      propTable(initConfigProps),
      heading(
        viewConfigHeader.level,
        viewConfigHeader.id,
        viewConfigHeader.text,
      ),
      para('Configuration object passed to ', inlineCode('Switch.view()'), '.'),
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
