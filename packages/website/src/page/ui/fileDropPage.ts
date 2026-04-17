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
import * as FileDrop from './fileDrop'
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

const fileDropAttributesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'file-drop-attributes',
  text: 'FileDropAttributes',
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
  accessibilityHeader,
  apiReferenceHeader,
  initConfigHeader,
  viewConfigHeader,
  fileDropAttributesHeader,
  outMessageHeader,
]

// SECTION DATA

const initConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description:
      'Unique ID for the file-drop instance. Assigned to the hidden <input type="file"> for label association.',
  },
]

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'model',
    type: 'FileDrop.Model',
    description: 'The file-drop state from your parent Model.',
  },
  {
    name: 'toParentMessage',
    type: '(childMessage: FileDrop.Message) => ParentMessage',
    description:
      'Wraps FileDrop Messages in your parent Message type for Submodel delegation.',
  },
  {
    name: 'toView',
    type: '(attributes: FileDropAttributes) => Html',
    description:
      'Callback that receives attribute groups for the root drop-zone element and the hidden file input.',
  },
  {
    name: 'accept',
    type: 'ReadonlyArray<string>',
    description:
      'List of accepted MIME types or file extensions (e.g. ["application/pdf", ".doc"]). Joined with commas and forwarded to the hidden input\'s accept attribute. Omit or pass an empty array to accept any file type.',
  },
  {
    name: 'multiple',
    type: 'boolean',
    default: 'false',
    description:
      'When true, the hidden input accepts multiple files per selection. Drag-and-drop always accepts multiple files.',
  },
  {
    name: 'isDisabled',
    type: 'boolean',
    default: 'false',
    description:
      'Strips drag handlers from the root and disables the input. Styling can react via data-disabled on the root.',
  },
]

const fileDropAttributesProps: ReadonlyArray<PropEntry> = [
  {
    name: 'root',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto the outer drop-zone element (typically a <label>). Includes drag handlers (dragenter/dragleave/dragover/drop) and data attributes (data-drag-over, data-disabled).',
  },
  {
    name: 'input',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Spread onto a hidden <input type="file"> nested inside the root. Includes the id, type, multiple, accept, sr-only class, and the file-change handler.',
  },
]

const outMessageProps: ReadonlyArray<PropEntry> = [
  {
    name: 'ReceivedFiles',
    type: '{ files: ReadonlyArray<File> }',
    description:
      'Emitted when the user drops files on the zone or selects them via the hidden input. Pattern-match on the OutMessage in your parent update to process the files (validate, upload, store in Model).',
  },
]

const dataAttributes: ReadonlyArray<DataAttributeEntry> = [
  {
    attribute: 'data-drag-over',
    condition: 'Present on the root while a drag is hovering over the zone.',
  },
  {
    attribute: 'data-disabled',
    condition: 'Present on the root when isDisabled is true.',
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
      pageTitle('ui/fileDrop', 'FileDrop'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A file drop zone that accepts files via both drag-and-drop and a hidden ',
        inlineCode('<input type="file">'),
        '. FileDrop is headless — the component owns drag state and file-arrival events; your ',
        inlineCode('toView'),
        ' callback owns the visual.',
      ),
      para(
        'FileDrop uses the Submodel pattern — initialize with ',
        inlineCode('FileDrop.init()'),
        ', delegate in your parent update via ',
        inlineCode('FileDrop.update()'),
        ', and render with ',
        inlineCode('FileDrop.view()'),
        '. The update function returns ',
        inlineCode('[Model, Commands, Option<OutMessage>]'),
        ' — the OutMessage fires when files arrive (drop or change). Pattern-match on it to process the files.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      para(
        'A multi-file drop zone. Drag files on or click to browse — the component exposes ',
        inlineCode('data-drag-over'),
        ' on the root while a drag hovers, so you can style the highlighted state with ',
        inlineCode('data-[drag-over]:*'),
        ' utilities.',
      ),
      demoContainer(...FileDrop.basicDemo(model, toParentMessage)),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiFileDropBasicHighlighted)],
          [],
        ),
        Snippet.uiFileDropBasicRaw,
        'Copy file drop example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'FileDrop is headless. Your ',
        inlineCode('toView'),
        ' callback composes a ',
        inlineCode('<label>'),
        ' with the ',
        inlineCode('root'),
        ' attributes and a ',
        inlineCode('<input>'),
        ' with the ',
        inlineCode('input'),
        ' attributes. Wrap the input inside the label so native click-to-browse works. Use ',
        inlineCode('data-[drag-over]:*'),
        ' and ',
        inlineCode('data-[disabled]:*'),
        ' utilities to style state variants.',
      ),
      dataAttributeTable(dataAttributes),
      heading(
        accessibilityHeader.level,
        accessibilityHeader.id,
        accessibilityHeader.text,
      ),
      para(
        'The hidden ',
        inlineCode('<input type="file">'),
        ' stays in the DOM but visually hidden via the ',
        inlineCode('sr-only'),
        ' class so keyboard users can tab to it and trigger the native file picker. Wrapping the input in a ',
        inlineCode('<label>'),
        ' (via ',
        inlineCode('attributes.root'),
        ') means clicking anywhere on the drop zone opens the picker.',
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
        inlineCode('FileDrop.init()'),
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
        inlineCode('FileDrop.view()'),
        '.',
      ),
      propTable(viewConfigProps),
      heading(
        fileDropAttributesHeader.level,
        fileDropAttributesHeader.id,
        fileDropAttributesHeader.text,
      ),
      para(
        'Attribute groups provided to the ',
        inlineCode('toView'),
        ' callback.',
      ),
      propTable(fileDropAttributesProps),
      heading(
        outMessageHeader.level,
        outMessageHeader.id,
        outMessageHeader.text,
      ),
      para(
        'The third element of the update tuple (',
        inlineCode('[Model, Commands, Option<OutMessage>]'),
        '). Pattern-match in your parent update handler to process arriving files.',
      ),
      propTable(outMessageProps),
    ],
  )
