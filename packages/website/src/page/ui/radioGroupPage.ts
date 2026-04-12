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
import * as RadioGroup from './radioGroup'

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

const optionAttributesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'option-attributes',
  text: 'OptionAttributes',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  examplesHeader,
  RadioGroup.verticalHeader,
  RadioGroup.horizontalHeader,
  stylingHeader,
  keyboardInteractionHeader,
  accessibilityHeader,
  apiReferenceHeader,
  initConfigHeader,
  viewConfigHeader,
  optionAttributesHeader,
]

// SECTION DATA

const initConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description: 'Unique ID for the radio group instance.',
  },
  {
    name: 'selectedValue',
    type: 'string',
    description: 'Initially selected option value.',
  },
  {
    name: 'orientation',
    type: "'Vertical' | 'Horizontal'",
    default: "'Vertical'",
    description:
      'Layout orientation. Controls which arrow keys navigate between options.',
  },
]

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'model',
    type: 'RadioGroup.Model',
    description: 'The radio group state from your parent Model.',
  },
  {
    name: 'toParentMessage',
    type: '(message: Message) => Message',
    description:
      'Wraps RadioGroup Messages in your parent Message type for Submodel delegation.',
  },
  {
    name: 'options',
    type: 'ReadonlyArray<RadioOption>',
    description:
      'The list of options. The generic RadioOption type narrows the value passed to optionToConfig.',
  },
  {
    name: 'optionToConfig',
    type: '(option, context) => OptionConfig',
    description:
      'Maps each option to its value and content callback. The context provides isSelected, isActive, and isDisabled.',
  },
  {
    name: 'ariaLabel',
    type: 'string',
    description: 'Accessible label for the radio group.',
  },
  {
    name: 'orientation',
    type: "'Vertical' | 'Horizontal'",
    description:
      'Overrides the orientation set at init. Controls arrow key direction and aria-orientation.',
  },
  {
    name: 'isDisabled',
    type: 'boolean',
    default: 'false',
    description: 'Disables all options.',
  },
  {
    name: 'isOptionDisabled',
    type: '(option, index) => boolean',
    description: 'Disables individual options.',
  },
  {
    name: 'onSelected',
    type: '(value, index) => Message',
    description:
      'Alternative to Submodel delegation — fires your own Message on selection instead of the internal SelectedOption. Use with RadioGroup.select() to update the Model.',
  },
  {
    name: 'name',
    type: 'string',
    description:
      'Form field name. When provided, a hidden input is included with the selected value.',
  },
  {
    name: 'attributes',
    type: 'ReadonlyArray<Attribute<Message>>',
    description: 'Additional attributes for the radio group container.',
  },
  {
    name: 'className',
    type: 'string',
    description: 'CSS class for the radio group container.',
  },
]

const optionAttributesProps: ReadonlyArray<PropEntry> = [
  {
    name: 'option',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the radio option element. Includes role, aria-checked, tabindex, and click/keyboard handlers.',
  },
  {
    name: 'label',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the label element. Includes an id for aria-labelledby.',
  },
  {
    name: 'description',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto a description element. Includes an id for aria-describedby.',
  },
]

const dataAttributes: ReadonlyArray<DataAttributeEntry> = [
  {
    attribute: 'data-checked',
    condition: 'Present on the selected option.',
  },
  {
    attribute: 'data-active',
    condition: 'Present on the option that has focus (roving tabindex).',
  },
  {
    attribute: 'data-disabled',
    condition: 'Present on disabled options.',
  },
]

const keyboardEntries: ReadonlyArray<KeyboardEntry> = [
  {
    key: 'Arrow Down / Right',
    description: 'Move focus and select the next option (wraps).',
  },
  {
    key: 'Arrow Up / Left',
    description: 'Move focus and select the previous option (wraps).',
  },
  {
    key: 'Home',
    description: 'Move focus and select the first option.',
  },
  {
    key: 'End',
    description: 'Move focus and select the last option.',
  },
  {
    key: 'Space',
    description: 'Select the focused option.',
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
      pageTitle('ui/radioGroup', 'Radio Group'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A single-selection component with roving tabindex keyboard navigation. Arrow keys simultaneously move focus and select the option — there is no separate focus-then-select step. RadioGroup uses the Submodel pattern and supports both vertical and horizontal orientation.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      heading(
        RadioGroup.verticalHeader.level,
        RadioGroup.verticalHeader.id,
        RadioGroup.verticalHeader.text,
      ),
      para(
        'The ',
        inlineCode('view'),
        ' function is generic over your option type. Pass a typed ',
        inlineCode('options'),
        ' array and an ',
        inlineCode('optionToConfig'),
        ' callback that maps each option to a ',
        inlineCode('value'),
        ' and a ',
        inlineCode('content'),
        ' callback receiving attribute groups.',
      ),
      demoContainer(
        ...RadioGroup.verticalDemo(
          model.verticalRadioGroupDemo,
          toParentMessage,
        ),
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiRadioGroupBasicHighlighted)],
          [],
        ),
        Snippet.uiRadioGroupBasicRaw,
        'Copy radio group example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(
        RadioGroup.horizontalHeader.level,
        RadioGroup.horizontalHeader.id,
        RadioGroup.horizontalHeader.text,
      ),
      para(
        'Pass ',
        inlineCode("orientation: 'Horizontal'"),
        ' to switch to left/right arrow navigation. Set the orientation at init time or override it per render in the view config.',
      ),
      demoContainer(
        ...RadioGroup.horizontalDemo(
          model.horizontalRadioGroupDemo,
          toParentMessage,
        ),
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'RadioGroup is headless — the ',
        inlineCode('optionToConfig'),
        ' callback controls all option markup and styling. Use the data attributes below to style selected, focused, and disabled states.',
      ),
      dataAttributeTable(dataAttributes),
      heading(
        keyboardInteractionHeader.level,
        keyboardInteractionHeader.id,
        keyboardInteractionHeader.text,
      ),
      para(
        'RadioGroup uses roving tabindex — only the active option is in the tab order. Arrow keys move focus and select simultaneously. Disabled options are skipped during keyboard navigation.',
      ),
      keyboardTable(keyboardEntries),
      heading(
        accessibilityHeader.level,
        accessibilityHeader.id,
        accessibilityHeader.text,
      ),
      para(
        'The group element receives ',
        inlineCode('role="radiogroup"'),
        ' and ',
        inlineCode('aria-orientation'),
        '. Each option receives ',
        inlineCode('role="radio"'),
        ' with ',
        inlineCode('aria-checked'),
        ', ',
        inlineCode('aria-labelledby'),
        ', and ',
        inlineCode('aria-describedby'),
        '.',
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
        inlineCode('RadioGroup.init()'),
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
        inlineCode('RadioGroup.view()'),
        '.',
      ),
      propTable(viewConfigProps),
      heading(
        optionAttributesHeader.level,
        optionAttributesHeader.id,
        optionAttributesHeader.text,
      ),
      para(
        'Attribute groups provided to each option\u2019s ',
        inlineCode('content'),
        ' callback.',
      ),
      propTable(optionAttributesProps),
    ],
  )
