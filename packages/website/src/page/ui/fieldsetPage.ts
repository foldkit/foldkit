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
  type PropEntry,
  dataAttributeTable,
  propTable,
} from '../../view/docTable'
import * as Fieldset from './fieldset'
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

const fieldsetAttributesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'fieldset-attributes',
  text: 'FieldsetAttributes',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  examplesHeader,
  Fieldset.basicHeader,
  Fieldset.disabledHeader,
  stylingHeader,
  accessibilityHeader,
  apiReferenceHeader,
  viewConfigHeader,
  fieldsetAttributesHeader,
]

// SECTION DATA

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description:
      'Unique ID for the fieldset element. Used to generate linked IDs for legend and description.',
  },
  {
    name: 'toView',
    type: '(attributes: FieldsetAttributes) => Html',
    description:
      'Callback that receives attribute groups for the fieldset, legend, and description elements.',
  },
  {
    name: 'isDisabled',
    type: 'boolean',
    default: 'false',
    description:
      'Whether the fieldset is disabled. The native disabled attribute on <fieldset> propagates to all child form controls.',
  },
]

const fieldsetAttributesProps: ReadonlyArray<PropEntry> = [
  {
    name: 'fieldset',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the <fieldset> element. Includes id, aria-describedby, and the disabled attribute when applicable.',
  },
  {
    name: 'legend',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the <legend> element. Includes an id for programmatic reference.',
  },
  {
    name: 'description',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto a description element. Includes an id that the fieldset references via aria-describedby.',
  },
]

const dataAttributes: ReadonlyArray<DataAttributeEntry> = [
  {
    attribute: 'data-disabled',
    condition: 'Present when isDisabled is true.',
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
      pageTitle('ui/fieldset', 'Fieldset'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A semantic form section that groups related controls with a legend and description. Fieldset is a view-only component that wraps the native ',
        inlineCode('<fieldset>'),
        ' element — when disabled, the browser propagates the disabled state to all child form controls automatically.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      heading(
        Fieldset.basicHeader.level,
        Fieldset.basicHeader.id,
        Fieldset.basicHeader.text,
      ),
      para(
        'The ',
        inlineCode('toView'),
        ' callback receives three attribute groups: ',
        inlineCode('fieldset'),
        ' for the wrapper, ',
        inlineCode('legend'),
        ' for the group title, and ',
        inlineCode('description'),
        ' for help text. Nest other Foldkit UI components inside the fieldset body.',
      ),
      demoContainer(...Fieldset.basicDemo(model, toParentMessage)),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiFieldsetBasicHighlighted)],
          [],
        ),
        Snippet.uiFieldsetBasicRaw,
        'Copy basic fieldset example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(
        Fieldset.disabledHeader.level,
        Fieldset.disabledHeader.id,
        Fieldset.disabledHeader.text,
      ),
      para(
        'Set ',
        inlineCode('isDisabled: true'),
        ' to disable the entire group. The native ',
        inlineCode('<fieldset disabled>'),
        ' attribute propagates to all child inputs, textareas, buttons, and selects — you don\u2019t need to disable each control individually.',
      ),
      demoContainer(...Fieldset.disabledDemo(model, toParentMessage)),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiFieldsetDisabledHighlighted)],
          [],
        ),
        Snippet.uiFieldsetDisabledRaw,
        'Copy disabled fieldset example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'Fieldset is headless — your ',
        inlineCode('toView'),
        ' callback controls all markup and styling.',
      ),
      dataAttributeTable(dataAttributes),
      heading(
        accessibilityHeader.level,
        accessibilityHeader.id,
        accessibilityHeader.text,
      ),
      para(
        'The ',
        inlineCode('legend'),
        ' attribute group includes an id (accessible via ',
        inlineCode('Fieldset.legendId(id)'),
        ') and the ',
        inlineCode('description'),
        ' group includes an id (accessible via ',
        inlineCode('Fieldset.descriptionId(id)'),
        ') that the fieldset references through ',
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
        inlineCode('Fieldset.view()'),
        '.',
      ),
      propTable(viewConfigProps),
      heading(
        fieldsetAttributesHeader.level,
        fieldsetAttributesHeader.id,
        fieldsetAttributesHeader.text,
      ),
      para(
        'Attribute groups provided to the ',
        inlineCode('toView'),
        ' callback.',
      ),
      propTable(fieldsetAttributesProps),
    ],
  )
