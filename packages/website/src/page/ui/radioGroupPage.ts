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

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  examplesHeader,
  RadioGroup.verticalHeader,
  RadioGroup.horizontalHeader,
  stylingHeader,
  keyboardInteractionHeader,
  accessibilityHeader,
  apiReferenceHeader,
  viewConfigHeader,
  renderInfoHeader,
  optionInfoHeader,
]

// SECTION DATA

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description:
      'Unique ID for the radio group instance. Used to link ARIA attributes and to target focus.',
  },
  {
    name: 'selectedValue',
    type: 'Option<Value>',
    description:
      'The currently-selected value, read from your Model. `Option.none()` renders with nothing selected.',
  },
  {
    name: 'options',
    type: 'ReadonlyArray<Value>',
    description:
      'The list of option values, in display order. `Value` is the first type parameter of `RadioGroup.view<Value, Message>()`, so each `OptionInfo.value` is typed as `Value`.',
  },
  {
    name: 'ariaLabel',
    type: 'string',
    description: 'Accessible label for the radio group.',
  },
  {
    name: 'onSelect',
    type: '(value: Value) => Message',
    description:
      'Maps a committed option to a Message in your parent Message type. Your update handler just stores the value. Moving focus onto the newly-selected option is the radio group’s own concern, handled inside its click and keydown handlers.',
  },
  {
    name: 'orientation',
    type: "'Vertical' | 'Horizontal'",
    default: "'Vertical'",
    description:
      'Layout orientation. Controls arrow key direction and `aria-orientation`.',
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
]

const renderInfoProps: ReadonlyArray<PropEntry> = [
  {
    name: 'group',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the radio group container. Includes `role="radiogroup"`, `aria-orientation`, and `aria-label`.',
  },
  {
    name: 'options',
    type: 'ReadonlyArray<OptionInfo<Value>>',
    description:
      'One entry per option in `options`, in the same order. See OptionInfo below.',
  },
  {
    name: 'selectedValue',
    type: 'Option<Value>',
    description:
      'The currently-selected value, if any. Convenient when rendering selected-state visuals next to the option attributes.',
  },
  {
    name: 'hiddenInput',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'When `name` is supplied, attributes for a hidden form input carrying the selected value. The consumer renders the `<input>` element. Empty array when `name` is undefined.',
  },
]

const optionInfoProps: ReadonlyArray<PropEntry> = [
  {
    name: 'value',
    type: 'Value',
    description:
      'The option value. Typed as the `Value` type parameter of `RadioGroup.view<Value, Message>()`.',
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
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the option element. Includes `role="radio"`, `aria-checked`, `aria-labelledby`, `aria-describedby`, `tabindex`, and click/keyboard handlers.',
  },
  {
    name: 'label',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the label element. Includes an id for `aria-labelledby`.',
  },
  {
    name: 'description',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto a description element. Includes an id for `aria-describedby`.',
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
          'A single-selection component with roving tabindex keyboard navigation. Arrow keys simultaneously move focus and select the option. There is no separate focus-then-select step. RadioGroup is a stateless controlled render helper: call it directly with a ViewConfig in your own view; no Model, update, or ',
          inlineCode('h.submodel'),
          ' wrapping. Your Model owns the selected value, you pass it in as ',
          inlineCode('selectedValue'),
          ', and ',
          inlineCode('onSelect'),
          ' dispatches a parent Message when the user commits an option. Both vertical and horizontal orientation are supported.',
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
          'Call ',
          inlineCode('RadioGroup.view<Value, Message>()'),
          ' directly in your view. Read the current selection from your Model into ',
          inlineCode('selectedValue'),
          ', pass the typed ',
          inlineCode('options'),
          ' array, and provide an ',
          inlineCode('onSelect'),
          ' handler that maps the committed value to a parent Message. The ',
          inlineCode('toView'),
          ' callback receives one ',
          inlineCode('OptionInfo<Value>'),
          ' per option (with attribute bundles for the option, label, and description).',
        ),
        para(
          'In your update handler for that Message, just store the value. Moving focus onto the selected option (the roving-tabindex behavior) is handled inside the radio group’s own click and keydown handlers, so it never becomes your update’s concern.',
        ),
        demoContainer(...RadioGroup.verticalDemo(model)),
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
          ' in the ViewConfig to switch to left/right arrow navigation.',
        ),
        demoContainer(...RadioGroup.horizontalDemo(model)),
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
      ],
    )
  },
)
