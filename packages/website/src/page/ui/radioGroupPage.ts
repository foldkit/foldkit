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

const renderInfoHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'render-info',
  text: 'RenderInfo',
}

const optionInfoHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'option-info',
  text: 'OptionInfo',
}

const outMessageHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'out-message',
  text: 'OutMessage',
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
  renderInfoHeader,
  optionInfoHeader,
  outMessageHeader,
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
    type: '(childMessage: RadioGroup.Message) => ParentMessage',
    description:
      'Wraps RadioGroup Messages in your parent Message type for Submodel delegation.',
  },
  {
    name: 'options',
    type: 'ReadonlyArray<Value>',
    description:
      'The list of option values, in display order. When the radio group is declared via `RadioGroup.create<MyUnion>()`, `Value` is your union type and each `OptionInfo.value` is typed as `MyUnion`.',
  },
  {
    name: 'ariaLabel',
    type: 'string',
    description: 'Accessible label for the radio group.',
  },
  {
    name: 'toView',
    type: '(render: RenderInfo<Value>) => Html',
    description:
      'Callback that receives the `group` attribute bundle, one `OptionInfo<Value>` per option, the current `selectedValue`, and the `hiddenInput` attributes. Returns the composed layout.',
  },
  {
    name: 'isOptionDisabled',
    type: '(value: Value, index: number) => boolean',
    description: 'Disables individual options.',
  },
  {
    name: 'isDisabled',
    type: 'boolean',
    default: 'false',
    description: 'Disables all options.',
  },
  {
    name: 'name',
    type: 'string',
    description:
      'Form field name. When provided, `RenderInfo.hiddenInput` carries the attributes for a hidden `<input>` holding the selected value (the consumer renders the element).',
  },
  {
    name: 'orientation',
    type: "'Vertical' | 'Horizontal'",
    description:
      'Overrides the orientation set at init. Controls arrow key direction and `aria-orientation`.',
  },
]

const renderInfoProps: ReadonlyArray<PropEntry> = [
  {
    name: 'group',
    type: 'ReadonlyArray<ChildAttribute>',
    description:
      'Spread onto the radio group container. Includes `role="radiogroup"`, `aria-orientation`, and `aria-label`.',
  },
  {
    name: 'options',
    type: 'ReadonlyArray<OptionInfo<Value>>',
    description:
      'One entry per option in `viewInputs.options`, in the same order. See OptionInfo below.',
  },
  {
    name: 'selectedValue',
    type: 'Option<Value>',
    description:
      'The currently-selected value, if any. Convenient when rendering selected-state visuals next to the option attributes.',
  },
  {
    name: 'hiddenInput',
    type: 'ReadonlyArray<ChildAttribute>',
    description:
      'When `viewInputs.name` is supplied, attributes for a hidden form input carrying the selected value. The consumer renders the `<input>` element. Empty array when `name` is undefined.',
  },
]

const optionInfoProps: ReadonlyArray<PropEntry> = [
  {
    name: 'value',
    type: 'Value',
    description:
      'The option value. Typed as your `Value` union when the radio group is declared via `RadioGroup.create<Value>()`.',
  },
  {
    name: 'index',
    type: 'number',
    description: 'Position in the `options` array.',
  },
  {
    name: 'isSelected',
    type: 'boolean',
    description: 'Whether this option is currently selected.',
  },
  {
    name: 'isActive',
    type: 'boolean',
    description:
      'Whether this option owns the roving tabindex (the one in the tab order).',
  },
  {
    name: 'isDisabled',
    type: 'boolean',
    description:
      'Whether this option is disabled (either individually via `isOptionDisabled` or because `isDisabled` is set on the whole group).',
  },
  {
    name: 'option',
    type: 'ReadonlyArray<ChildAttribute>',
    description:
      'Spread onto the option element. Includes `role="radio"`, `aria-checked`, `aria-labelledby`, `aria-describedby`, `tabindex`, and click/keyboard handlers.',
  },
  {
    name: 'label',
    type: 'ReadonlyArray<ChildAttribute>',
    description:
      'Spread onto the label element. Includes an id for `aria-labelledby`.',
  },
  {
    name: 'description',
    type: 'ReadonlyArray<ChildAttribute>',
    description:
      'Spread onto a description element. Includes an id for `aria-describedby`.',
  },
]

const outMessageProps: ReadonlyArray<PropEntry> = [
  {
    name: 'Selected',
    type: '{ value: Value; index: number }',
    description:
      'Emitted when an option is committed via click or keyboard. Pattern-match the third tuple element of RadioGroup.update in your GotRadioGroupMessage handler to lift the value into domain state. Programmatic `RadioGroup.select(model, value, options)` carries the same signal.',
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

type ViewInputs = Readonly<{ copiedSnippets: CopiedSnippets }>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { copiedSnippets }): Html => {
    const h = html<Message>()

    return h.div(
      [],
      [
        pageTitle('ui/radioGroup', 'Radio Group'),
        tableOfContentsEntryToHeader(overviewHeader),
        para(
          'A single-selection component with roving tabindex keyboard navigation. Arrow keys simultaneously move focus and select the option. There is no separate focus-then-select step. RadioGroup uses the Submodel pattern and supports both vertical and horizontal orientation.',
        ),
        infoCallout(
          'See it in an app',
          'Check out how RadioGroup is wired up in a ',
          link(uiShowcaseViewSourceHref('radioGroup'), 'real Foldkit app'),
          '.',
        ),
        heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
        heading(
          RadioGroup.verticalHeader.level,
          RadioGroup.verticalHeader.id,
          RadioGroup.verticalHeader.text,
        ),
        para(
          'Declare the radio group once at module scope with ',
          inlineCode('RadioGroup.create<Value>()'),
          ' to lift the option type through ',
          inlineCode('view'),
          ', ',
          inlineCode('update'),
          ', and ',
          inlineCode('select'),
          ' without casting. Pass the typed ',
          inlineCode('options'),
          ' array and a ',
          inlineCode('toView'),
          ' callback that receives one ',
          inlineCode('OptionInfo<Value>'),
          ' per option (with attribute bundles for the option, label, and description).',
        ),
        demoContainer(...RadioGroup.verticalDemo(model.verticalRadioGroupDemo)),
        highlightedCodeBlock(
          h.div(
            [
              h.Class('text-sm'),
              h.InnerHTML(Snippet.uiRadioGroupBasicHighlighted),
            ],
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
          ...RadioGroup.horizontalDemo(model.horizontalRadioGroupDemo),
        ),
        heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
        para(
          'RadioGroup is headless. The ',
          inlineCode('toView'),
          ' callback owns all option markup and styling, spreading the attribute bundles from each ',
          inlineCode('OptionInfo'),
          " onto the consumer's elements. Use the data attributes below to style selected, focused, and disabled states.",
        ),
        dataAttributeTable(dataAttributes),
        heading(
          keyboardInteractionHeader.level,
          keyboardInteractionHeader.id,
          keyboardInteractionHeader.text,
        ),
        para(
          'RadioGroup uses roving tabindex: only the active option is in the tab order. Arrow keys move focus and select simultaneously. Disabled options are skipped during keyboard navigation.',
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
          renderInfoHeader.level,
          renderInfoHeader.id,
          renderInfoHeader.text,
        ),
        para(
          'Payload delivered to the ',
          inlineCode('toView'),
          ' callback each render.',
        ),
        propTable(renderInfoProps),
        heading(
          optionInfoHeader.level,
          optionInfoHeader.id,
          optionInfoHeader.text,
        ),
        para(
          'Each entry in ',
          inlineCode('RenderInfo.options'),
          '. Carries the value, derived state flags, and attribute bundles for the option element, its label, and its description.',
        ),
        propTable(optionInfoProps),
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
  },
)
